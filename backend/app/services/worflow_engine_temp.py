"""
Enhanced Workflow execution engine with improved error handling, async support, and extensibility
"""
import json
import asyncio
from datetime import datetime, timedelta
import re
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass
from concurrent.futures import ThreadPoolExecutor
import threading
from contextlib import contextmanager

from app.database import Database
from app.services.notification_service import NotificationService
from app.services.audit_logger import AuditLogger
import logging

logger = logging.getLogger(__name__)

# Enums for better type safety
class WorkflowStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"

class TaskStatus(Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"
    CANCELLED = "cancelled"

class StepType(Enum):
    TASK = "task"
    NOTIFICATION = "notification"
    AUTOMATION = "automation"
    APPROVAL = "approval"
    CONDITION = "condition"
    PARALLEL = "parallel"
    LOOP = "loop"
    WEBHOOK = "webhook"
    TIMER = "timer"

# Data classes for better structure
@dataclass
class WorkflowContext:
    """Context passed through workflow execution"""
    instance_id: int
    workflow_id: int
    tenant_id: int
    initiated_by: int
    data: Dict[str, Any]
    metadata: Dict[str, Any]
    
    def get_variable(self, key: str, default=None):
        """Get variable from context data"""
        return self.data.get(key, default)
    
    def set_variable(self, key: str, value: Any):
        """Set variable in context data"""
        self.data[key] = value

@dataclass
class StepResult:
    """Result of step execution"""
    success: bool
    data: Dict[str, Any]
    error: Optional[str] = None
    next_step_id: Optional[str] = None

class WorkflowError(Exception):
    """Base exception for workflow errors"""
    pass

class StepExecutionError(WorkflowError):
    """Exception raised when step execution fails"""
    pass

class WorkflowEngine:
    """Enhanced workflow execution engine"""
    
    # Step executors registry
    _step_executors: Dict[StepType, Callable] = {}
    
    # Thread pool for parallel execution
    _executor = ThreadPoolExecutor(max_workers=10)
    
    # Locks for preventing race conditions
    _instance_locks = {}
    _lock = threading.Lock()
    
    def __init__(self):
        # Register default step executors
        self._register_default_executors()
    
    @classmethod
    def _register_default_executors(cls):
        """Register default step type executors"""
        cls._step_executors[StepType.TASK] = cls._execute_task_step
        cls._step_executors[StepType.NOTIFICATION] = cls._execute_notification_step
        cls._step_executors[StepType.AUTOMATION] = cls._execute_automation_step
        cls._step_executors[StepType.APPROVAL] = cls._execute_approval_step
        cls._step_executors[StepType.CONDITION] = cls._execute_condition_step
        cls._step_executors[StepType.PARALLEL] = cls._execute_parallel_step
        cls._step_executors[StepType.LOOP] = cls._execute_loop_step
        cls._step_executors[StepType.WEBHOOK] = cls._execute_webhook_step
        cls._step_executors[StepType.TIMER] = cls._execute_timer_step
    
    @classmethod
    def register_step_executor(cls, step_type: StepType, executor: Callable):
        """Register custom step executor"""
        cls._step_executors[step_type] = executor
    
    @contextmanager
    def _get_instance_lock(self, instance_id: int):
        """Get or create lock for workflow instance"""
        with self._lock:
            if instance_id not in self._instance_locks:
                self._instance_locks[instance_id] = threading.Lock()
            lock = self._instance_locks[instance_id]
        
        try:
            lock.acquire()
            yield
        finally:
            lock.release()
    
    @classmethod
    def execute_workflow(cls, workflow_id: int, data: Dict[str, Any], 
                        initiated_by: int, tenant_id: int) -> int:
        """Start a new workflow instance with enhanced error handling"""
        try:
            # Validate workflow
            workflow = cls._get_workflow(workflow_id)
            if not workflow:
                raise WorkflowError(f"Workflow {workflow_id} not found")
            
            if not workflow['is_active']:
                raise WorkflowError(f"Workflow {workflow_id} is not active")
            
            # Parse and validate definition
            definition = cls._parse_definition(workflow['definition'])
            cls._validate_definition(definition)
            
            # Create workflow instance with initial context
            context = cls._create_workflow_context(
                workflow_id, workflow['name'], data, initiated_by, tenant_id
            )
            
            # Start workflow execution
            cls._start_workflow_execution(context, definition)
            
            # Log audit
            AuditLogger.log_action(
                user_id=initiated_by,
                action='workflow_started',
                resource_type='workflow_instance',
                resource_id=context.instance_id,
                details={'workflow_name': workflow['name']}
            )
            
            return context.instance_id
            
        except Exception as e:
            logger.error(f"Failed to execute workflow {workflow_id}: {e}", exc_info=True)
            # Create failed instance for tracking
            instance_id = cls._create_failed_instance(workflow_id, str(e), initiated_by, tenant_id)
            raise WorkflowError(f"Workflow execution failed: {str(e)}")
    
    @classmethod
    def complete_task(cls, task_id: int, result_data: Dict[str, Any], 
                     completed_by: int) -> None:
        """Complete a task with enhanced state management"""
        engine = cls()
        
        try:
            # Get and validate task
            task = cls._get_task(task_id)
            if not task:
                raise WorkflowError(f"Task {task_id} not found")
            
            # Use instance lock to prevent race conditions
            with engine._get_instance_lock(task['workflow_instance_id']):
                # Validate task state
                if task['status'] != TaskStatus.PENDING.value:
                    raise WorkflowError(
                        f"Task {task_id} is in {task['status']} status, cannot complete"
                    )
                
                # Update task
                cls._update_task_status(
                    task_id, TaskStatus.COMPLETED, result_data, completed_by
                )
                
                # Get workflow context
                instance = cls._get_workflow_instance(task['workflow_instance_id'])
                workflow = cls._get_workflow(instance['workflow_id'])
                definition = cls._parse_definition(workflow['definition'])
                
                # Reconstruct context
                context = WorkflowContext(
                    instance_id=task['workflow_instance_id'],
                    workflow_id=instance['workflow_id'],
                    tenant_id=instance['tenant_id'],
                    initiated_by=instance['initiated_by'],
                    data=json.loads(instance['data']),
                    metadata=json.loads(instance.get('metadata', '{}'))
                )
                
                # Merge task result into context
                context.data.update(result_data)
                
                # Determine and execute next step
                cls._advance_workflow(context, definition, task['step_id'], result_data)
            
            # Log audit
            AuditLogger.log_action(
                user_id=completed_by,
                action='task_completed',
                resource_type='task',
                resource_id=task_id,
                details={'step_id': task['step_id']}
            )
            
        except Exception as e:
            logger.error(f"Failed to complete task {task_id}: {e}", exc_info=True)
            cls._handle_task_failure(task_id, str(e))
            raise
    
    @classmethod
    def pause_workflow(cls, instance_id: int, paused_by: int) -> None:
        """Pause a running workflow"""
        cls._update_instance_status(instance_id, WorkflowStatus.PAUSED)
        AuditLogger.log_action(
            user_id=paused_by,
            action='workflow_paused',
            resource_type='workflow_instance',
            resource_id=instance_id
        )
    
    @classmethod
    def resume_workflow(cls, instance_id: int, resumed_by: int) -> None:
        """Resume a paused workflow"""
        engine = cls()
        
        with engine._get_instance_lock(instance_id):
            instance = cls._get_workflow_instance(instance_id)
            if instance['status'] != WorkflowStatus.PAUSED.value:
                raise WorkflowError(f"Workflow {instance_id} is not paused")
            
            cls._update_instance_status(instance_id, WorkflowStatus.IN_PROGRESS)
            
            # Re-evaluate current step
            workflow = cls._get_workflow(instance['workflow_id'])
            definition = cls._parse_definition(workflow['definition'])
            context = cls._reconstruct_context(instance)
            
            if instance['current_step']:
                step = cls._find_step_by_id(definition['steps'], instance['current_step'])
                if step:
                    cls._execute_step(context, step, definition)
        
        AuditLogger.log_action(
            user_id=resumed_by,
            action='workflow_resumed',
            resource_type='workflow_instance',
            resource_id=instance_id
        )
    
    @classmethod
    def cancel_workflow(cls, instance_id: int, cancelled_by: int, reason: str = None) -> None:
        """Cancel a workflow instance"""
        cls._update_instance_status(instance_id, WorkflowStatus.CANCELLED)
        
        # Cancel all pending tasks
        cls._cancel_pending_tasks(instance_id)
        
        AuditLogger.log_action(
            user_id=cancelled_by,
            action='workflow_cancelled',
            resource_type='workflow_instance',
            resource_id=instance_id,
            details={'reason': reason}
        )
    
    @classmethod
    def retry_failed_step(cls, instance_id: int, step_id: str, retried_by: int) -> None:
        """Retry a failed step"""
        engine = cls()
        
        with engine._get_instance_lock(instance_id):
            instance = cls._get_workflow_instance(instance_id)
            workflow = cls._get_workflow(instance['workflow_id'])
            definition = cls._parse_definition(workflow['definition'])
            context = cls._reconstruct_context(instance)
            
            step = cls._find_step_by_id(definition['steps'], step_id)
            if not step:
                raise WorkflowError(f"Step {step_id} not found")
            
            cls._execute_step(context, step, definition)
    
    # Enhanced step execution methods
    @classmethod
    def _execute_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                     definition: Dict[str, Any]) -> StepResult:
        """Execute a workflow step with error handling and retry logic"""
        step_type = StepType(step['type'])
        max_retries = step.get('max_retries', 0)
        retry_delay = step.get('retry_delay', 60)  # seconds
        
        # Update instance current step
        cls._update_instance_step(context.instance_id, step['id'])
        
        # Log step execution
        logger.info(f"Executing step {step['id']} of type {step_type.value} "
                   f"for instance {context.instance_id}")
        
        # Execute with retry logic
        for attempt in range(max_retries + 1):
            try:
                # Get executor for step type
                executor = cls._step_executors.get(step_type)
                if not executor:
                    raise StepExecutionError(f"No executor for step type {step_type.value}")
                
                # Execute step
                result = executor(context, step, definition)
                
                # Save step execution history
                cls._save_step_execution(context.instance_id, step['id'], True, result.data)
                
                return result
                
            except Exception as e:
                logger.error(f"Step {step['id']} execution failed (attempt {attempt + 1}): {e}")
                
                if attempt < max_retries:
                    logger.info(f"Retrying step {step['id']} after {retry_delay} seconds")
                    import time
                    time.sleep(retry_delay)
                else:
                    # Save failed execution
                    cls._save_step_execution(context.instance_id, step['id'], False, 
                                           {'error': str(e)})
                    
                    # Handle failure based on step configuration
                    if step.get('continue_on_error', False):
                        return StepResult(success=False, data={}, error=str(e))
                    else:
                        cls._handle_workflow_failure(context.instance_id, step['id'], str(e))
                        raise StepExecutionError(f"Step {step['id']} failed: {str(e)}")
    
    @classmethod
    def _execute_task_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                          definition: Dict[str, Any]) -> StepResult:
        """Execute a task step"""
        # Resolve assignee (support dynamic assignment)
        assigned_to = cls._resolve_assignee(step.get('assigned_to'), context)
        
        # Calculate due date
        due_hours = step.get('due_hours', 24)
        due_date = datetime.now() + timedelta(hours=due_hours)
        
        # Create task with additional metadata
        query = """
            INSERT INTO tasks 
            (workflow_instance_id, step_id, name, description, type, 
             assigned_to, due_date, priority, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """
        
        task_id = Database.execute_insert(query, (
            context.instance_id, step['id'], step['name'], 
            step.get('description', ''), step['type'], 
            assigned_to, due_date, step.get('priority', 'medium'),
            json.dumps(step.get('metadata', {}))
        ))
        
        # Send notification
        if assigned_to:
            NotificationService.send_task_assignment(
                assigned_to, task_id, 
                context={'workflow_name': step['name'], 'due_date': due_date}
            )
        
        return StepResult(success=True, data={'task_id': task_id})
    
    @classmethod
    def _execute_notification_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                                  definition: Dict[str, Any]) -> StepResult:
        """Execute a notification step"""
        recipients = cls._resolve_recipients(step.get('recipients', []), context)
        template = step.get('template', 'default')
        
        # Prepare notification data with context variables
        notification_data = {
            'workflow_instance_id': context.instance_id,
            'step_name': step['name'],
            'message': cls._interpolate_variables(step.get('message', ''), context),
            **context.data
        }
        
        # Send notifications
        for recipient in recipients:
            NotificationService.send_notification(
                recipient, template, notification_data
            )
        
        return StepResult(success=True, data={'recipients': recipients})
    
    @classmethod
    def _execute_automation_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                               definition: Dict[str, Any]) -> StepResult:
        """Execute an automation step"""
        action = step.get('action')
        params = step.get('params', {})
        
        # Interpolate parameters with context variables
        resolved_params = cls._resolve_params(params, context)
        
        # Execute automation (extensible via plugins)
        result = cls._execute_automation_action(action, resolved_params, context)
        
        return StepResult(success=True, data=result)
    
    @classmethod
    def _execute_parallel_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                              definition: Dict[str, Any]) -> StepResult:
        """Execute multiple steps in parallel"""
        parallel_steps = step.get('steps', [])
        futures = []
        
        # Submit parallel steps for execution
        for parallel_step_id in parallel_steps:
            parallel_step = cls._find_step_by_id(definition['steps'], parallel_step_id)
            if parallel_step:
                future = cls._executor.submit(
                    cls._execute_step, context, parallel_step, definition
                )
                futures.append((parallel_step_id, future))
        
        # Wait for all parallel steps to complete
        results = {}
        all_success = True
        
        for step_id, future in futures:
            try:
                result = future.result()
                results[step_id] = result.data
            except Exception as e:
                logger.error(f"Parallel step {step_id} failed: {e}")
                results[step_id] = {'error': str(e)}
                all_success = False
        
        return StepResult(success=all_success, data=results)
    
    @classmethod
    def _execute_loop_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                          definition: Dict[str, Any]) -> StepResult:
        """Execute a loop step"""
        items_key = step.get('items_key')
        items = context.get_variable(items_key, [])
        loop_steps = step.get('steps', [])
        
        results = []
        for index, item in enumerate(items):
            # Set loop context variables
            context.set_variable('loop_index', index)
            context.set_variable('loop_item', item)
            
            # Execute loop body
            for loop_step_id in loop_steps:
                loop_step = cls._find_step_by_id(definition['steps'], loop_step_id)
                if loop_step:
                    result = cls._execute_step(context, loop_step, definition)
                    results.append(result.data)
        
        return StepResult(success=True, data={'results': results})
    
    @classmethod
    def _execute_webhook_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                            definition: Dict[str, Any]) -> StepResult:
        """Execute a webhook step"""
        import requests
        
        url = cls._interpolate_variables(step.get('url'), context)
        method = step.get('method', 'POST')
        headers = cls._resolve_params(step.get('headers', {}), context)
        body = cls._resolve_params(step.get('body', {}), context)
        
        try:
            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=body,
                timeout=step.get('timeout', 30)
            )
            response.raise_for_status()
            
            return StepResult(success=True, data={
                'status_code': response.status_code,
                'response': response.json() if response.content else {}
            })
            
        except Exception as e:
            logger.error(f"Webhook call failed: {e}")
            raise StepExecutionError(f"Webhook call failed: {str(e)}")
    
    @classmethod
    def _execute_timer_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                           definition: Dict[str, Any]) -> StepResult:
        """Execute a timer step"""
        delay = step.get('delay', 60)  # seconds
        
        # Schedule next step execution
        next_execution = datetime.now() + timedelta(seconds=delay)
        
        query = """
            INSERT INTO scheduled_tasks 
            (workflow_instance_id, step_id, scheduled_at, status)
            VALUES (%s, %s, %s, 'pending')
        """
        
        Database.execute_insert(query, (
            context.instance_id, step['id'], next_execution
        ))
        
        return StepResult(success=True, data={'scheduled_at': next_execution.isoformat()})
    
    # Utility methods
    @classmethod
    def _parse_definition(cls, definition: Any) -> Dict[str, Any]:
        """Parse workflow definition"""
        if isinstance(definition, str):
            return json.loads(definition)
        return definition
    
    @classmethod
    def _validate_definition(cls, definition: Dict[str, Any]) -> None:
        """Validate workflow definition structure"""
        required_keys = ['steps', 'transitions']
        for key in required_keys:
            if key not in definition:
                raise WorkflowError(f"Invalid definition: missing '{key}'")
        
        # Validate steps
        step_ids = set()
        for step in definition['steps']:
            if 'id' not in step or 'type' not in step:
                raise WorkflowError("Invalid step: missing 'id' or 'type'")
            
            if step['id'] in step_ids:
                raise WorkflowError(f"Duplicate step ID: {step['id']}")
            
            step_ids.add(step['id'])
        
        # Validate transitions
        for transition in definition['transitions']:
            if 'from' not in transition or 'to' not in transition:
                raise WorkflowError("Invalid transition: missing 'from' or 'to'")
            
            if transition['from'] not in step_ids or transition['to'] not in step_ids:
                raise WorkflowError("Invalid transition: references non-existent step")
    
    @classmethod
    def _create_workflow_context(cls, workflow_id: int, title: str, 
                               data: Dict[str, Any], initiated_by: int, 
                               tenant_id: int) -> WorkflowContext:
        """Create workflow context and instance"""
        query = """
            INSERT INTO workflow_instances 
            (workflow_id, title, data, metadata, initiated_by, tenant_id, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        
        metadata = {
            'created_at': datetime.now().isoformat(),
            'version': '1.0'
        }
        
        instance_id = Database.execute_insert(query, (
            workflow_id, title, json.dumps(data), json.dumps(metadata),
            initiated_by, tenant_id, WorkflowStatus.IN_PROGRESS.value
        ))
        
        return WorkflowContext(
            instance_id=instance_id,
            workflow_id=workflow_id,
            tenant_id=tenant_id,
            initiated_by=initiated_by,
            data=data,
            metadata=metadata
        )
    
    @classmethod
    def _interpolate_variables(cls, text: str, context: WorkflowContext) -> str:
        """Interpolate variables in text"""
        import re
        
        def replace_var(match):
            var_name = match.group(1)
            return str(context.get_variable(var_name, match.group(0)))
        
        return re.sub(r'\{\{(\w+)\}\}', replace_var, text)
    
    @classmethod
    def _resolve_assignee(cls, assignee_config: Any, context: WorkflowContext) -> Optional[int]:
        """Resolve task assignee from configuration"""
        if isinstance(assignee_config, int):
            return assignee_config
        elif isinstance(assignee_config, str):
            # Support dynamic assignment
            if assignee_config.startswith('{{') and assignee_config.endswith('}}'):
                var_name = assignee_config[2:-2]
                return context.get_variable(var_name)
            elif assignee_config == 'initiator':
                return context.initiated_by
            elif assignee_config.startswith('role:'):
                # Get user with specific role
                role = assignee_config[5:]
                return cls._get_user_by_role(role, context.tenant_id)
        
        return None
    
    @classmethod
    def _resolve_recipients(cls, recipients_config: List[Any], 
                           context: WorkflowContext) -> List[int]:
        """Resolve notification recipients"""
        recipients = []
        
        for recipient in recipients_config:
            if isinstance(recipient, int):
                recipients.append(recipient)
            elif isinstance(recipient, str):
                if recipient == 'initiator':
                    recipients.append(context.initiated_by)
                elif recipient.startswith('role:'):
                    role = recipient[5:]
                    role_users = cls._get_users_by_role(role, context.tenant_id)
                    recipients.extend(role_users)
        
        return list(set(recipients))  # Remove duplicates
    
    @classmethod
    def _resolve_params(cls, params: Dict[str, Any], 
                       context: WorkflowContext) -> Dict[str, Any]:
        """Resolve parameters with context variables"""
        resolved = {}
        
        for key, value in params.items():
            if isinstance(value, str):
                resolved[key] = cls._interpolate_variables(value, context)
            elif isinstance(value, dict):
                resolved[key] = cls._resolve_params(value, context)
            else:
                resolved[key] = value
        
        return resolved
    
    @classmethod
    def _handle_workflow_failure(cls, instance_id: int, step_id: str, error: str) -> None:
        """Handle workflow failure"""
        cls._update_instance_status(instance_id, WorkflowStatus.FAILED)
        
        # Save error details
        query = """
            UPDATE workflow_instances 
            SET error_details = %s, failed_at_step = %s, updated_at = NOW()
            WHERE id = %s
        """
        
        error_details = {
            'step_id': step_id,
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        
        Database.execute_query(query, (
            json.dumps(error_details), step_id, instance_id
        ))
        
        # Send failure notification
        instance = cls._get_workflow_instance(instance_id)
        NotificationService.send_workflow_failure(
            instance['initiated_by'], instance_id, error
        )
    
    # Database methods (unchanged but included for completeness)
    @staticmethod
    def _get_workflow(workflow_id):
        query = """
            SELECT id, name, definition, is_active 
            FROM workflows 
            WHERE id = %s
        """
        return Database.execute_one(query, (workflow_id,))
    
    @staticmethod
    def _get_workflow_instance(instance_id):
        query = """
            SELECT id, workflow_id, initiated_by, tenant_id, status, 
                   data, metadata, current_step
            FROM workflow_instances 
            WHERE id = %s
        """
        return Database.execute_one(query, (instance_id,))
    
    @staticmethod
    def _get_task(task_id):
        query = """
            SELECT id, workflow_instance_id, step_id, status, assigned_to
            FROM tasks 
            WHERE id = %s
        """
        return Database.execute_one(query, (task_id,))
    
    @staticmethod
    def _update_instance_status(instance_id, status: WorkflowStatus):
        query = """
            UPDATE workflow_instances 
            SET status = %s, updated_at = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (status.value, instance_id))
    
    @staticmethod
    def _update_instance_step(instance_id, step_id):
        query = """
            UPDATE workflow_instances 
            SET current_step = %s, updated_at = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (step_id, instance_id))
    
    @staticmethod
    def _update_task_status(task_id, status: TaskStatus, result_data, completed_by):
        query = """
            UPDATE tasks 
            SET status = %s, result = %s, completed_by = %s, 
                completed_at = NOW(), updated_at = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (
            status.value, json.dumps(result_data), completed_by, task_id
        ))
    
    @staticmethod
    def _save_step_execution(instance_id, step_id, success, data):
        query = """
            INSERT INTO workflow_step_executions 
            (workflow_instance_id, step_id, success, data, executed_at)
            VALUES (%s, %s, %s, %s, NOW())
        """
        Database.execute_insert(query, (
            instance_id, step_id, success, json.dumps(data)
        ))
    
    @staticmethod
    def _find_step_by_id(steps, step_id):
        for step in steps:
            if step['id'] == step_id:
                return step
        return None
    
    @classmethod
    def _start_workflow_execution(cls, context: WorkflowContext, 
                                 definition: Dict[str, Any]) -> None:
        """Start workflow execution from first step"""
        first_step = cls._get_first_step(definition)
        
        if first_step:
            try:
                cls._execute_step(context, first_step, definition)
            except Exception as e:
                logger.error(f"Failed to execute first step: {e}")
                cls._handle_workflow_failure(context.instance_id, first_step['id'], str(e))
                raise
        else:
            cls._complete_workflow(context.instance_id)
    
    @staticmethod
    def _get_first_step(definition):
        steps = definition.get('steps', [])
        for step in steps:
            if step.get('is_start', False):
                return step
        return steps[0] if steps else None
    
    @classmethod
    def _advance_workflow(cls, context: WorkflowContext, definition: Dict[str, Any],
                         current_step_id: str, result_data: Dict[str, Any]) -> None:
        """Advance workflow to next step"""
        next_step = cls._get_next_step(definition, current_step_id, result_data)
        
        if next_step:
            cls._execute_step(context, next_step, definition)
        else:
            cls._complete_workflow(context.instance_id)
    
    @classmethod
    def _get_next_step(cls, definition: Dict[str, Any], current_step_id: str, 
                      result_data: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Determine next step based on transitions and conditions"""
        steps = definition.get('steps', [])
        transitions = definition.get('transitions', [])
        
        # Find applicable transitions
        for transition in transitions:
            if transition['from'] == current_step_id:
                # Check condition if present
                condition = transition.get('condition')
                
                if condition:
                    if cls._evaluate_condition_expression(condition, result_data):
                        return cls._find_step_by_id(steps, transition['to'])
                else:
                    # No condition, always proceed
                    return cls._find_step_by_id(steps, transition['to'])
        
        return None
    
    @classmethod
    def _evaluate_condition_expression(cls, condition: Dict[str, Any], 
                                     data: Dict[str, Any]) -> bool:
        """Evaluate complex condition expressions"""
        condition_type = condition.get('type', 'simple')
        
        if condition_type == 'simple':
            return cls._evaluate_simple_condition(condition, data)
        elif condition_type == 'complex':
            return cls._evaluate_complex_condition(condition, data)
        elif condition_type == 'script':
            return cls._evaluate_script_condition(condition, data)
        
        return False
    
    @classmethod
    def _evaluate_simple_condition(cls, condition: Dict[str, Any], 
                                 data: Dict[str, Any]) -> bool:
        """Evaluate simple field-based condition"""
        field = condition.get('field')
        operator = condition.get('operator')
        value = condition.get('value')
        
        if field not in data:
            return False
        
        field_value = data[field]
        
        # Extended operators
        operators = {
            'equals': lambda x, y: x == y,
            'not_equals': lambda x, y: x != y,
            'greater_than': lambda x, y: float(x) > float(y),
            'less_than': lambda x, y: float(x) < float(y),
            'greater_or_equal': lambda x, y: float(x) >= float(y),
            'less_or_equal': lambda x, y: float(x) <= float(y),
            'contains': lambda x, y: y in str(x),
            'starts_with': lambda x, y: str(x).startswith(y),
            'ends_with': lambda x, y: str(x).endswith(y),
            'in': lambda x, y: x in y,
            'not_in': lambda x, y: x not in y,
            'is_empty': lambda x, y: not bool(x),
            'is_not_empty': lambda x, y: bool(x),
            'matches_regex': lambda x, y: bool(re.match(y, str(x)))
        }
        
        evaluator = operators.get(operator)
        if evaluator:
            try:
                return evaluator(field_value, value)
            except Exception as e:
                logger.error(f"Condition evaluation failed: {e}")
                return False
        
        return False
    
    @classmethod
    def _evaluate_complex_condition(cls, condition: Dict[str, Any], 
                                  data: Dict[str, Any]) -> bool:
        """Evaluate complex AND/OR conditions"""
        logic = condition.get('logic', 'AND')
        conditions = condition.get('conditions', [])
        
        if logic == 'AND':
            return all(cls._evaluate_condition_expression(c, data) for c in conditions)
        elif logic == 'OR':
            return any(cls._evaluate_condition_expression(c, data) for c in conditions)
        elif logic == 'NOT':
            return not cls._evaluate_condition_expression(conditions[0], data)
        
        return False
    
    @classmethod
    def _evaluate_script_condition(cls, condition: Dict[str, Any], 
                                 data: Dict[str, Any]) -> bool:
        """Evaluate script-based condition (sandboxed)"""
        script = condition.get('script', '')
        
        # Simple sandboxed evaluation (can be extended with proper sandboxing)
        try:
            # Create safe namespace
            safe_namespace = {
                'data': data,
                'len': len,
                'str': str,
                'int': int,
                'float': float,
                'bool': bool,
                'abs': abs,
                'min': min,
                'max': max,
                'sum': sum,
                'any': any,
                'all': all
            }
            
            # Evaluate expression
            return bool(eval(script, {"__builtins__": {}}, safe_namespace))
        except Exception as e:
            logger.error(f"Script condition evaluation failed: {e}")
            return False
    
    @classmethod
    def _complete_workflow(cls, instance_id: int) -> None:
        """Mark workflow as completed"""
        cls._update_instance_status(instance_id, WorkflowStatus.COMPLETED)
        
        # Update completion timestamp
        query = """
            UPDATE workflow_instances 
            SET completed_at = NOW(), updated_at = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (instance_id,))
        
        # Send completion notification
        instance = cls._get_workflow_instance(instance_id)
        NotificationService.send_workflow_completion(
            instance['initiated_by'], instance_id
        )
    
    @classmethod
    def _cancel_pending_tasks(cls, instance_id: int) -> None:
        """Cancel all pending tasks for workflow instance"""
        query = """
            UPDATE tasks 
            SET status = %s, updated_at = NOW()
            WHERE workflow_instance_id = %s AND status = %s
        """
        Database.execute_query(query, (
            TaskStatus.CANCELLED.value, instance_id, TaskStatus.PENDING.value
        ))
    
    @classmethod
    def _handle_task_failure(cls, task_id: int, error: str) -> None:
        """Handle task failure"""
        cls._update_task_status(task_id, TaskStatus.FAILED, {'error': error}, None)
    
    @classmethod
    def _create_failed_instance(cls, workflow_id: int, error: str, 
                              initiated_by: int, tenant_id: int) -> int:
        """Create failed workflow instance for tracking"""
        query = """
            INSERT INTO workflow_instances 
            (workflow_id, title, status, error_details, initiated_by, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """
        
        error_details = {
            'error': error,
            'timestamp': datetime.now().isoformat()
        }
        
        return Database.execute_insert(query, (
            workflow_id, 'Failed Workflow', WorkflowStatus.FAILED.value,
            json.dumps(error_details), initiated_by, tenant_id
        ))
    
    @classmethod
    def _reconstruct_context(cls, instance: Dict[str, Any]) -> WorkflowContext:
        """Reconstruct workflow context from instance"""
        return WorkflowContext(
            instance_id=instance['id'],
            workflow_id=instance['workflow_id'],
            tenant_id=instance['tenant_id'],
            initiated_by=instance['initiated_by'],
            data=json.loads(instance['data']),
            metadata=json.loads(instance.get('metadata', '{}'))
        )
    
    @classmethod
    def _execute_automation_action(cls, action: str, params: Dict[str, Any], 
                                 context: WorkflowContext) -> Dict[str, Any]:
        """Execute automation action (extensible)"""
        # This is a placeholder for automation execution
        # In real implementation, this would call external services/APIs
        
        automation_handlers = {
            'create_record': cls._handle_create_record,
            'update_record': cls._handle_update_record,
            'send_email': cls._handle_send_email,
            'call_api': cls._handle_call_api,
            'transform_data': cls._handle_transform_data
        }
        
        handler = automation_handlers.get(action)
        if handler:
            return handler(params, context)
        else:
            raise StepExecutionError(f"Unknown automation action: {action}")
    
    @staticmethod
    def _handle_create_record(params: Dict[str, Any], 
                            context: WorkflowContext) -> Dict[str, Any]:
        """Handle record creation automation"""
        # Implementation would create record in specified system
        return {'record_id': 'new_record_id'}
    
    @staticmethod
    def _handle_update_record(params: Dict[str, Any], 
                            context: WorkflowContext) -> Dict[str, Any]:
        """Handle record update automation"""
        # Implementation would update record in specified system
        return {'updated': True}
    
    @staticmethod
    def _handle_send_email(params: Dict[str, Any], 
                         context: WorkflowContext) -> Dict[str, Any]:
        """Handle email sending automation"""
        # Implementation would send email via email service
        return {'email_sent': True}
    
    @staticmethod
    def _handle_call_api(params: Dict[str, Any], 
                       context: WorkflowContext) -> Dict[str, Any]:
        """Handle API call automation"""
        # Implementation would make external API call
        return {'api_response': {}}
    
    @staticmethod
    def _handle_transform_data(params: Dict[str, Any], 
                             context: WorkflowContext) -> Dict[str, Any]:
        """Handle data transformation automation"""
        # Implementation would transform data based on rules
        return {'transformed_data': {}}
    
    @staticmethod
    def _get_user_by_role(role: str, tenant_id: int) -> Optional[int]:
        """Get user by role (simplified)"""
        query = """
            SELECT u.id 
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = %s AND u.tenant_id = %s
            LIMIT 1
        """
        result = Database.execute_one(query, (role, tenant_id))
        return result['id'] if result else None
    
    @staticmethod
    def _get_users_by_role(role: str, tenant_id: int) -> List[int]:
        """Get all users with specific role"""
        query = """
            SELECT u.id 
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = %s AND u.tenant_id = %s
        """
        results = Database.execute_many(query, (role, tenant_id))
        return [r['id'] for r in results]
    
    @classmethod
    def _execute_condition_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                              definition: Dict[str, Any]) -> StepResult:
        """Execute a condition step (branching logic)"""
        condition = step.get('condition', {})
        
        if cls._evaluate_condition_expression(condition, context.data):
            # Take true branch
            true_steps = step.get('true_steps', [])
            for step_id in true_steps:
                true_step = cls._find_step_by_id(definition['steps'], step_id)
                if true_step:
                    cls._execute_step(context, true_step, definition)
        else:
            # Take false branch
            false_steps = step.get('false_steps', [])
            for step_id in false_steps:
                false_step = cls._find_step_by_id(definition['steps'], step_id)
                if false_step:
                    cls._execute_step(context, false_step, definition)
        
        return StepResult(success=True, data={'condition_met': True})
    
    @classmethod
    def _execute_approval_step(cls, context: WorkflowContext, step: Dict[str, Any], 
                             definition: Dict[str, Any]) -> StepResult:
        """Execute an approval step"""
        approvers = cls._resolve_recipients(step.get('approvers', []), context)
        approval_type = step.get('approval_type', 'any')  # any, all, threshold
        threshold = step.get('threshold', 1)
        
        # Create approval task
        query = """
            INSERT INTO approval_tasks 
            (workflow_instance_id, step_id, name, description, approval_type, 
             threshold, approvers, status)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'pending')
        """
        
        approval_id = Database.execute_insert(query, (
            context.instance_id, step['id'], step['name'],
            step.get('description', ''), approval_type,
            threshold, json.dumps(approvers)
        ))
        
        # Create individual approval requests
        for approver in approvers:
            query = """
                INSERT INTO approval_requests
                (approval_task_id, approver_id, status)
                VALUES (%s, %s, 'pending')
            """
            Database.execute_insert(query, (approval_id, approver))
            
            # Send notification
            NotificationService.send_approval_request(
                approver, approval_id, context
            )
        
        return StepResult(success=True, data={'approval_task_id': approval_id})


