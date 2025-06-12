### app/services/workflow_engine.py

"""
Workflow execution engine with state machine logic
"""
import json
from datetime import datetime, timedelta
from app.database import Database
from app.services.notification_service import NotificationService
from app.services.audit_logger import AuditLogger
import logging

logger = logging.getLogger(__name__)

class WorkflowEngine:
    """Core workflow execution engine"""
    
    @staticmethod
    def execute_workflow(workflow_id, data, initiated_by, tenant_id):
        """Start a new workflow instance"""
        try:
            # Get workflow definition
            workflow = WorkflowEngine._get_workflow(workflow_id)
            if not workflow:
                raise ValueError(f"Workflow {workflow_id} not found")
            
            if not workflow['is_active']:
                raise ValueError(f"Workflow {workflow_id} is not active")
            
            # Create workflow instance
            instance_id = WorkflowEngine._create_instance(
                workflow_id, workflow['name'], data, initiated_by, tenant_id
            )
            
            # Execute first step
            # definition = json.loads(workflow['definition'])
            if isinstance(workflow['definition'], str):
                definition = json.loads(workflow['definition'])
            else:
                definition = workflow['definition']
            first_step = WorkflowEngine._get_first_step(definition)
            
            if first_step:
                WorkflowEngine._execute_step(instance_id, first_step, definition)
            
            # Log audit
            AuditLogger.log_action(
                user_id=initiated_by,
                action='workflow_started',
                resource_type='workflow_instance',
                resource_id=instance_id
            )
            
            return instance_id
            
        except Exception as e:
            logger.error(f"Failed to execute workflow {workflow_id}: {e}")
            raise
    
    @staticmethod
    def complete_task(task_id, result_data, completed_by):
        """Complete a task and advance workflow"""
        try:
            # Get task and workflow instance
            task = WorkflowEngine._get_task(task_id)
            if not task:
                raise ValueError(f"Task {task_id} not found")
            
            if task['status'] != 'pending':
                raise ValueError(f"Task {task_id} is not in pending status")
            
            # Update task
            WorkflowEngine._update_task_status(task_id, 'completed', result_data, completed_by)
            
            # Get workflow definition
            workflow_instance = WorkflowEngine._get_workflow_instance(task['workflow_instance_id'])
            workflow = WorkflowEngine._get_workflow(workflow_instance['workflow_id'])
            definition = json.loads(workflow['definition'])
            
            # Determine next step
            next_step = WorkflowEngine._get_next_step(
                definition, task['step_id'], result_data
            )
            
            if next_step:
                WorkflowEngine._execute_step(task['workflow_instance_id'], next_step, definition)
            else:
                # Workflow complete
                WorkflowEngine._complete_workflow(task['workflow_instance_id'])
            
            # Log audit
            AuditLogger.log_action(
                user_id=completed_by,
                action='task_completed',
                resource_type='task',
                resource_id=task_id
            )
            
        except Exception as e:
            logger.error(f"Failed to complete task {task_id}: {e}")
            raise
    
    @staticmethod
    def _get_workflow(workflow_id):
        """Get workflow by ID"""
        query = """
            SELECT id, name, definition, is_active 
            FROM workflows 
            WHERE id = %s
        """
        return Database.execute_one(query, (workflow_id,))
    
    @staticmethod
    def _create_instance(workflow_id, title, data, initiated_by, tenant_id):
        """Create new workflow instance"""
        query = """
            INSERT INTO workflow_instances 
            (workflow_id, title, data, initiated_by, tenant_id, status)
            VALUES (%s, %s, %s, %s, %s, 'in_progress')
        """
        return Database.execute_insert(query, (
            workflow_id, title, json.dumps(data), initiated_by, tenant_id
        ))
    
    @staticmethod
    def _get_first_step(definition):
        """Get first step from workflow definition"""
        steps = definition.get('steps', [])
        for step in steps:
            if step.get('is_start', False):
                return step
        return steps[0] if steps else None
    
    @staticmethod
    def _execute_step(instance_id, step, definition):
        """Execute a workflow step"""
        step_id = step['id']
        step_type = step['type']
        
        # Update workflow instance current step
        WorkflowEngine._update_instance_step(instance_id, step_id)
        
        if step_type == 'task':
            WorkflowEngine._create_task(instance_id, step)
        elif step_type == 'notification':
            WorkflowEngine._send_notification(instance_id, step)
        elif step_type == 'automation':
            WorkflowEngine._execute_automation(instance_id, step)
        elif step_type == 'approval':
            WorkflowEngine._create_approval_task(instance_id, step)
        elif step_type == 'condition':
            WorkflowEngine._evaluate_condition(instance_id, step, definition)
    
    @staticmethod
    def _create_task(instance_id, step):
        """Create a new task"""
        assigned_to = step.get('assigned_to')
        due_hours = step.get('due_hours', 24)
        due_date = datetime.now() + timedelta(hours=due_hours)
        
        query = """
            INSERT INTO tasks 
            (workflow_instance_id, step_id, name, description, type, assigned_to, due_date)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """
        task_id = Database.execute_insert(query, (
            instance_id, step['id'], step['name'], 
            step.get('description', ''), step['type'], assigned_to, due_date
        ))
        
        # Send notification to assigned user
        if assigned_to:
            NotificationService.send_task_assignment(assigned_to, task_id)
        
        return task_id
    
    @staticmethod
    def _get_next_step(definition, current_step_id, result_data):
        """Determine next step based on current step and result"""
        steps = definition.get('steps', [])
        transitions = definition.get('transitions', [])
        
        # Find transitions from current step
        for transition in transitions:
            if transition['from'] == current_step_id:
                condition = transition.get('condition')
                
                # Evaluate condition if present
                if condition:
                    if WorkflowEngine._evaluate_condition_expression(condition, result_data):
                        return WorkflowEngine._find_step_by_id(steps, transition['to'])
                else:
                    return WorkflowEngine._find_step_by_id(steps, transition['to'])
        
        return None
    
    @staticmethod
    def _evaluate_condition_expression(condition, data):
        """Evaluate a condition expression"""
        # Simple condition evaluation (can be extended)
        field = condition.get('field')
        operator = condition.get('operator')
        value = condition.get('value')
        
        if field not in data:
            return False
        
        field_value = data[field]
        
        if operator == 'equals':
            return field_value == value
        elif operator == 'not_equals':
            return field_value != value
        elif operator == 'greater_than':
            return float(field_value) > float(value)
        elif operator == 'less_than':
            return float(field_value) < float(value)
        elif operator == 'contains':
            return value in str(field_value)
        
        return False
    
    @staticmethod
    def _find_step_by_id(steps, step_id):
        """Find step by ID in steps list"""
        for step in steps:
            if step['id'] == step_id:
                return step
        return None
    
    @staticmethod
    def _complete_workflow(instance_id):
        """Mark workflow instance as completed"""
        query = """
            UPDATE workflow_instances 
            SET status = 'completed', completed_at = NOW(), updated_at = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (instance_id,))
        
        # Send completion notification
        instance = WorkflowEngine._get_workflow_instance(instance_id)
        NotificationService.send_workflow_completion(instance['initiated_by'], instance_id)
    
    @staticmethod
    def _get_task(task_id):
        """Get task by ID"""
        query = """
            SELECT id, workflow_instance_id, step_id, status, assigned_to
            FROM tasks 
            WHERE id = %s
        """
        return Database.execute_one(query, (task_id,))
    
    @staticmethod
    def _get_workflow_instance(instance_id):
        """Get workflow instance by ID"""
        query = """
            SELECT id, workflow_id, initiated_by, status
            FROM workflow_instances 
            WHERE id = %s
        """
        return Database.execute_one(query, (instance_id,))
    
    @staticmethod
    def _update_task_status(task_id, status, result_data, completed_by):
        """Update task status and result"""
        query = """
            UPDATE tasks 
            SET status = %s, result = %s, completed_at = NOW(), updated_at = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (status, json.dumps(result_data), task_id))
    
    @staticmethod
    def _update_instance_step(instance_id, step_id):
        """Update workflow instance current step"""
        query = """
            UPDATE workflow_instances 
            SET current_step = %s, updated_at = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (step_id, instance_id))