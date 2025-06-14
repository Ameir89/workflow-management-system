### app/services/workflow_engine.py
"""
Workflow execution engine with enhanced form support
"""
import json
from datetime import datetime, timedelta
from app.database import Database
from app.services.notification_service import NotificationService
from app.services.audit_logger import AuditLogger
import logging

logger = logging.getLogger(__name__)

class WorkflowEngine:
    """Core workflow execution engine with form integration"""

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

            # Update task with completed_by field
            WorkflowEngine._update_task_status(task_id, 'completed', result_data, completed_by)

            # Get workflow definition
            workflow_instance = WorkflowEngine._get_workflow_instance(task['workflow_instance_id'])
            workflow = WorkflowEngine._get_workflow(workflow_instance['workflow_id'])

            if isinstance(workflow['definition'], str):
                definition = json.loads(workflow['definition'])
            else:
                definition = workflow['definition']

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
            if step.get('isStart', False):
                return step
        return steps[0] if steps else None

    @staticmethod
    def _execute_step(instance_id, step, definition):
        """Execute a workflow step with form support"""
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
        """Create a new task with form support"""
        assigned_to = step.get('properties', {}).get('assignee')
        due_hours = step.get('properties', {}).get('dueHours', 24)
        due_date = datetime.now() + timedelta(hours=due_hours)

        # Get form ID from step properties
        form_id = step.get('properties', {}).get('formId')

        # Resolve form ID if it's a string reference
        if form_id and isinstance(form_id, str) and not form_id.startswith('uuid:'):
            # Look up form by name
            form = Database.execute_one("""
                SELECT id FROM form_definitions 
                WHERE name = %s AND is_active = true
                ORDER BY version DESC
                LIMIT 1
            """, (form_id,))
            form_id = form['id'] if form else None

        query = """
            INSERT INTO tasks 
            (workflow_instance_id, step_id, name, description, type, 
             assigned_to, due_date, form_id)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """
        task_id = Database.execute_insert(query, (
            instance_id, step['id'], step['name'],
            step.get('description', ''), step['type'],
            assigned_to, due_date, form_id
        ))

        # Send notification to assigned user
        if assigned_to:
            NotificationService.send_task_assignment(assigned_to, task_id)

        return task_id

    @staticmethod
    def _create_approval_task(instance_id, step):
        """Create an approval task with form support"""
        properties = step.get('properties', {})
        approvers = properties.get('approvers', [])
        approval_type = properties.get('approvalType', 'any')
        due_hours = properties.get('dueHours', 48)
        due_date = datetime.now() + timedelta(hours=due_hours)

        # Get form ID for approval
        form_id = properties.get('formId')
        if form_id and isinstance(form_id, str) and not form_id.startswith('uuid:'):
            form = Database.execute_one("""
                SELECT id FROM form_definitions 
                WHERE name = %s AND is_active = true
                ORDER BY version DESC
                LIMIT 1
            """, (form_id,))
            form_id = form['id'] if form else None

        # Create approval task for each approver
        for approver in approvers:
            query = """
                INSERT INTO tasks 
                (workflow_instance_id, step_id, name, description, type, 
                 assigned_to, due_date, form_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """
            task_id = Database.execute_insert(query, (
                instance_id, step['id'], f"Approval: {step['name']}",
                step.get('description', ''), 'approval',
                approver, due_date, form_id
            ))

            # Send notification
            NotificationService.send_task_assignment(approver, task_id)

    @staticmethod
    def _send_notification(instance_id, step):
        """Send notification step"""
        properties = step.get('properties', {})
        recipients = properties.get('recipients', [])
        template = properties.get('template', 'default')

        # Get workflow instance data for notification context
        instance = WorkflowEngine._get_workflow_instance(instance_id)

        notification_data = {
            'workflow_instance_id': instance_id,
            'step_name': step['name'],
            'message': properties.get('message', ''),
            'workflow_data': json.loads(instance['data']) if instance['data'] else {}
        }

        for recipient in recipients:
            NotificationService.send_notification(recipient, template, notification_data)

    @staticmethod
    def _execute_automation(instance_id, step):
        """Execute automation step"""
        properties = step.get('properties', {})
        script = properties.get('script')
        timeout = properties.get('timeout', 300)

        # Get workflow instance data
        instance = WorkflowEngine._get_workflow_instance(instance_id)
        workflow_data = json.loads(instance['data']) if instance['data'] else {}

        # Execute automation script (placeholder implementation)
        # In real implementation, this would call external services/APIs
        logger.info(f"Executing automation script: {script} for instance {instance_id}")

        # Update workflow data with automation result
        automation_result = {
            'automation_executed': True,
            'script': script,
            'executed_at': datetime.now().isoformat()
        }

        workflow_data.update(automation_result)

        # Update instance data
        Database.execute_query("""
            UPDATE workflow_instances 
            SET data = %s, updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(workflow_data), instance_id))

    @staticmethod
    def _evaluate_condition(instance_id, step, definition):
        """Evaluate condition step"""
        properties = step.get('properties', {})
        condition = properties.get('condition', {})

        # Get workflow instance data
        instance = WorkflowEngine._get_workflow_instance(instance_id)
        workflow_data = json.loads(instance['data']) if instance['data'] else {}

        # Evaluate condition
        condition_met = WorkflowEngine._evaluate_condition_expression(condition, workflow_data)

        # Execute appropriate next steps
        if condition_met:
            true_steps = properties.get('trueSteps', [])
            for step_id in true_steps:
                next_step = WorkflowEngine._find_step_by_id(definition['steps'], step_id)
                if next_step:
                    WorkflowEngine._execute_step(instance_id, next_step, definition)
        else:
            false_steps = properties.get('falseSteps', [])
            for step_id in false_steps:
                next_step = WorkflowEngine._find_step_by_id(definition['steps'], step_id)
                if next_step:
                    WorkflowEngine._execute_step(instance_id, next_step, definition)

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
        elif operator == 'between':
            return value[0] <= float(field_value) <= value[1]

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
            SELECT id, workflow_id, initiated_by, status, data
            FROM workflow_instances 
            WHERE id = %s
        """
        return Database.execute_one(query, (instance_id,))

    @staticmethod
    def _update_task_status(task_id, status, result_data, completed_by):
        """Update task status and result with completed_by field"""
        query = """
            UPDATE tasks 
            SET status = %s, result = %s, completed_by = %s, 
                completed_at = NOW(), updated_at = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (status, json.dumps(result_data), completed_by, task_id))

    @staticmethod
    def _update_instance_step(instance_id, step_id):
        """Update workflow instance current step"""
        query = """
            UPDATE workflow_instances 
            SET current_step = %s, updated_at = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (step_id, instance_id))