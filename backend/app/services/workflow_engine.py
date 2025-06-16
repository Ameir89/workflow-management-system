# app/services/workflow_engine.py
"""
Updated Workflow execution engine with enhanced automation support
"""
import json
import re
from datetime import datetime, timedelta
from app.database import Database
from app.services.notification_service import NotificationService
from app.services.audit_logger import AuditLogger
from app.services.automation_engine import AutomationEngine
import logging

logger = logging.getLogger(__name__)


class WorkflowEngine:
    """Enhanced workflow execution engine with powerful automation support"""

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

            # Execute first step with context
            if isinstance(workflow['definition'], str):
                definition = json.loads(workflow['definition'])
            else:
                definition = workflow['definition']

            first_step = WorkflowEngine._get_first_step(definition)

            if first_step:
                # Create workflow context for assignee resolution
                context = {
                    'initiator': initiated_by,
                    'initiated_by': initiated_by,
                    'tenant_id': tenant_id,
                    'workflow_data': data,
                    'workflow_instance_id': instance_id
                }
                WorkflowEngine._execute_step(instance_id, first_step, definition, context)

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

            # Get workflow definition and context
            workflow_instance = WorkflowEngine._get_workflow_instance(task['workflow_instance_id'])
            workflow = WorkflowEngine._get_workflow(workflow_instance['workflow_id'])

            if isinstance(workflow['definition'], str):
                definition = json.loads(workflow['definition'])
            else:
                definition = workflow['definition']

            # Create context for next step resolution
            workflow_data = json.loads(workflow_instance['data']) if workflow_instance['data'] else {}
            workflow_data.update(result_data)  # Merge task result into workflow data

            context = {
                'initiator': workflow_instance['initiated_by'],
                'initiated_by': workflow_instance['initiated_by'],
                'tenant_id': workflow_instance['tenant_id'],
                'workflow_data': workflow_data,
                'completed_by': completed_by,
                'workflow_instance_id': task['workflow_instance_id']
            }

            # Update workflow instance data
            Database.execute_query("""
                UPDATE workflow_instances 
                SET data = %s, updated_at = NOW()
                WHERE id = %s
            """, (json.dumps(workflow_data), task['workflow_instance_id']))

            # Determine next step
            next_step = WorkflowEngine._get_next_step(
                definition, task['step_id'], result_data
            )

            if next_step:
                WorkflowEngine._execute_step(task['workflow_instance_id'], next_step, definition, context)
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
    def _execute_step(instance_id, step, definition, context):
        """Execute a workflow step with enhanced automation support"""
        step_id = step['id']
        step_type = step['type']

        # Update workflow instance current step
        WorkflowEngine._update_instance_step(instance_id, step_id)

        logger.info(f"Executing step {step_id} of type {step_type} for instance {instance_id}")

        try:
            if step_type == 'task':
                WorkflowEngine._create_task(instance_id, step, context)
            elif step_type == 'notification':
                WorkflowEngine._send_notification(instance_id, step, context)
            elif step_type == 'automation':
                WorkflowEngine._execute_automation(instance_id, step, context)
            elif step_type == 'approval':
                WorkflowEngine._create_approval_task(instance_id, step, context)
            elif step_type == 'condition':
                WorkflowEngine._evaluate_condition(instance_id, step, definition, context)
            else:
                logger.warning(f"Unknown step type: {step_type}")

            # Log successful step execution
            Database.execute_insert("""
                INSERT INTO workflow_step_executions 
                (workflow_instance_id, step_id, success, executed_at)
                VALUES (%s, %s, true, NOW())
            """, (instance_id, step_id))

        except Exception as e:
            logger.error(f"Step {step_id} execution failed: {e}")

            # Log failed step execution
            Database.execute_insert("""
                INSERT INTO workflow_step_executions 
                (workflow_instance_id, step_id, success, error_message, executed_at)
                VALUES (%s, %s, false, %s, NOW())
            """, (instance_id, step_id, str(e)))

            # Handle failure based on step configuration
            if not step.get('continue_on_error', False):
                WorkflowEngine._handle_workflow_failure(instance_id, step_id, str(e))
                raise

    @staticmethod
    def _execute_automation(instance_id, step, context):
        """Enhanced automation step execution with full automation engine support"""
        try:
            properties = step.get('properties', {})

            # Get automation configuration from step properties
            automation_config = properties.get('automation', {})

            # Support legacy script property for backward compatibility
            if not automation_config and properties.get('script'):
                automation_config = {
                    'type': 'script_execution',
                    'script_type': 'python',
                    'script': properties.get('script'),
                    'timeout': properties.get('timeout', 300)
                }

            if not automation_config:
                logger.warning(f"No automation configuration for step {step['id']}")
                return

            # Initialize automation engine
            automation_engine = AutomationEngine()

            # Prepare enhanced context for automation
            automation_context = {
                'workflow_instance_id': instance_id,
                'step_id': step['id'],
                'step_name': step['name'],
                'workflow_data': context.get('workflow_data', {}),
                'initiator': context.get('initiator'),
                'initiated_by': context.get('initiated_by'),
                'tenant_id': context.get('tenant_id'),
                'completed_by': context.get('completed_by'),
                'execution_mode': 'workflow_step'
            }

            # Execute automation with comprehensive error handling
            logger.info(f"Executing automation for step {step['id']}: {automation_config.get('type')}")
            result = automation_engine.execute_automation(automation_config, automation_context)

            # Handle automation results
            if result['success']:
                # Merge automation result into workflow data
                workflow_data = automation_context['workflow_data']

                # Create automation results section if it doesn't exist
                if 'automation_results' not in workflow_data:
                    workflow_data['automation_results'] = {}

                # Store the automation result
                workflow_data['automation_results'][step['id']] = {
                    'execution_id': result['execution_id'],
                    'result': result['result'],
                    'timestamp': result['timestamp'],
                    'automation_type': automation_config.get('type')
                }

                # Store specific result data based on automation type
                automation_result = result['result']
                if isinstance(automation_result, dict):
                    # Handle different automation types
                    automation_type = automation_config.get('type')

                    if automation_type == 'api_call':
                        # Store API response data
                        if 'response' in automation_result:
                            workflow_data[f'api_response_{step["id"]}'] = automation_result['response']

                    elif automation_type == 'script_execution':
                        # Store script result
                        if 'result' in automation_result:
                            workflow_data[f'script_result_{step["id"]}'] = automation_result['result']

                    elif automation_type == 'database_operation':
                        # Store database operation result
                        if automation_result.get('operation') == 'select' and 'results' in automation_result:
                            workflow_data[f'db_results_{step["id"]}'] = automation_result['results']
                        elif 'inserted_id' in automation_result:
                            workflow_data[f'inserted_id_{step["id"]}'] = automation_result['inserted_id']

                    elif automation_type == 'data_transformation':
                        # Store transformed data
                        if 'transformed_data' in automation_result:
                            workflow_data.update(automation_result['transformed_data'])

                # Update workflow instance with new data
                Database.execute_query("""
                    UPDATE workflow_instances 
                    SET data = %s, updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps(workflow_data), instance_id))

                logger.info(f"Automation step {step['id']} completed successfully")

                # Send success notification if configured
                if properties.get('notify_on_success'):
                    WorkflowEngine._send_automation_notification(
                        instance_id, step, 'success', result, context
                    )

            else:
                error_msg = f"Automation step {step['id']} failed: {result.get('error')}"
                logger.error(error_msg)

                # Send failure notification if configured
                if properties.get('notify_on_failure'):
                    WorkflowEngine._send_automation_notification(
                        instance_id, step, 'failure', result, context
                    )

                # Handle automation failure based on step configuration
                if not step.get('continue_on_error', False):
                    raise Exception(error_msg)
                else:
                    # Log the error but continue workflow
                    logger.info(f"Continuing workflow despite automation failure in step {step['id']}")

        except Exception as e:
            logger.error(f"Automation step execution failed: {e}")
            raise

    @staticmethod
    def _send_automation_notification(instance_id, step, status, result, context):
        """Send notification about automation step completion"""
        try:
            # Get workflow instance details
            instance = WorkflowEngine._get_workflow_instance(instance_id)

            notification_data = {
                'workflow_instance_id': instance_id,
                'workflow_title': instance.get('title', 'Unknown'),
                'step_name': step['name'],
                'step_id': step['id'],
                'automation_status': status,
                'automation_type': step.get('properties', {}).get('automation', {}).get('type', 'unknown'),
                'execution_id': result.get('execution_id'),
                'timestamp': result.get('timestamp')
            }

            # Send to workflow initiator
            if instance.get('initiated_by'):
                NotificationService.send_notification(
                    instance['initiated_by'],
                    'automation_notification',
                    notification_data
                )

            # Send to configured recipients if any
            properties = step.get('properties', {})
            notification_recipients = properties.get('notification_recipients', [])

            for recipient in notification_recipients:
                resolved_recipient = WorkflowEngine._resolve_assignee(recipient, context)
                if resolved_recipient:
                    NotificationService.send_notification(
                        resolved_recipient,
                        'automation_notification',
                        notification_data
                    )

        except Exception as e:
            logger.error(f"Failed to send automation notification: {e}")

    @staticmethod
    def _handle_workflow_failure(instance_id, step_id, error):
        """Handle workflow failure with enhanced error tracking"""
        try:
            # Update workflow status
            Database.execute_query("""
                UPDATE workflow_instances 
                SET status = 'failed', failed_at_step = %s, 
                    error_details = %s, updated_at = NOW()
                WHERE id = %s
            """, (step_id, json.dumps({'error': error, 'step_id': step_id}), instance_id))

            # Get workflow instance for notification
            instance = WorkflowEngine._get_workflow_instance(instance_id)

            # Send failure notification
            if instance and instance.get('initiated_by'):
                NotificationService.send_workflow_failure(
                    instance['initiated_by'], instance_id, error
                )

            logger.error(f"Workflow {instance_id} failed at step {step_id}: {error}")

        except Exception as e:
            logger.error(f"Error handling workflow failure: {e}")

    # Keep all existing methods with enhancements...

    @staticmethod
    def _resolve_assignee(assignee_config, context):
        """Enhanced assignee resolution with automation result support"""
        if not assignee_config:
            return None

        # If it's already a valid UUID, return it
        if WorkflowEngine._is_valid_uuid(assignee_config):
            return assignee_config

        # Handle template variables
        if isinstance(assignee_config, str):
            # Handle {{initiator}} template
            if assignee_config == '{{initiator}}' or assignee_config == '{{initiated_by}}':
                return context.get('initiator') or context.get('initiated_by')

            # Handle automation result variables like {{automation_results.api_step.response.user_id}}
            if assignee_config.startswith('{{automation_results.'):
                try:
                    # Extract the path from the template
                    path = assignee_config[2:-2]  # Remove {{ and }}
                    parts = path.split('.')

                    # Navigate through the workflow data
                    workflow_data = context.get('workflow_data', {})
                    value = workflow_data

                    for part in parts:
                        value = value[part]

                    if WorkflowEngine._is_valid_uuid(value):
                        return value

                except (KeyError, TypeError):
                    logger.warning(f"Could not resolve automation result assignee: {assignee_config}")
                    return None

            # Handle other template variables like {{manager}}, {{supervisor}}
            template_match = re.match(r'\{\{([^}]+)\}\}', assignee_config)
            if template_match:
                var_name = template_match.group(1)

                # Check if variable exists in workflow data
                workflow_data = context.get('workflow_data', {})
                if var_name in workflow_data:
                    assignee_value = workflow_data[var_name]
                    if WorkflowEngine._is_valid_uuid(assignee_value):
                        return assignee_value

                # Check if it's a role-based assignment
                if var_name in ['manager', 'supervisor', 'department_head']:
                    return WorkflowEngine._get_user_by_role(var_name, context.get('tenant_id'))

                # If not found, log warning and return None
                logger.warning(f"Could not resolve assignee variable: {var_name}")
                return None

            # Handle role-based assignment like "role:manager"
            if assignee_config.startswith('role:'):
                role_name = assignee_config[5:]
                return WorkflowEngine._get_user_by_role(role_name, context.get('tenant_id'))

            # Handle dynamic assignment based on automation results
            if assignee_config.startswith('auto:'):
                auto_type = assignee_config[5:]
                return WorkflowEngine._resolve_auto_assignee(auto_type, context)

            # Handle user lookup by username or email
            if '@' in assignee_config:
                # Assume it's an email
                return WorkflowEngine._get_user_by_email(assignee_config, context.get('tenant_id'))
            else:
                # Assume it's a username
                return WorkflowEngine._get_user_by_username(assignee_config, context.get('tenant_id'))

        # If we can't resolve it, return None (unassigned task)
        logger.warning(f"Could not resolve assignee: {assignee_config}")
        return None

    @staticmethod
    def _resolve_auto_assignee(auto_type, context):
        """Resolve automatic assignee based on automation results or business logic"""
        try:
            workflow_data = context.get('workflow_data', {})
            automation_results = workflow_data.get('automation_results', {})

            if auto_type == 'approval_chain':
                # Determine approver based on amount and department
                amount = float(workflow_data.get('amount', 0))
                department = workflow_data.get('department', '')

                if amount > 10000:
                    return WorkflowEngine._get_user_by_role('cto', context.get('tenant_id'))
                elif amount > 5000:
                    return WorkflowEngine._get_user_by_role('manager', context.get('tenant_id'))
                else:
                    return context.get('initiator')

            elif auto_type == 'department_manager':
                # Get manager for the department
                department = workflow_data.get('department', '')
                if department:
                    return WorkflowEngine._get_department_manager(department, context.get('tenant_id'))

            elif auto_type == 'least_busy':
                # Assign to user with least pending tasks
                role = workflow_data.get('assignee_role', 'reviewer')
                return WorkflowEngine._get_least_busy_user(role, context.get('tenant_id'))

            elif auto_type == 'round_robin':
                # Round-robin assignment
                role = workflow_data.get('assignee_role', 'reviewer')
                return WorkflowEngine._get_round_robin_assignee(role, context.get('tenant_id'))

            return None

        except Exception as e:
            logger.error(f"Error resolving auto assignee {auto_type}: {e}")
            return None

    @staticmethod
    def _get_department_manager(department, tenant_id):
        """Get manager for a specific department"""
        try:
            manager = Database.execute_one("""
                SELECT u.id 
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = 'manager' 
                AND u.tenant_id = %s 
                AND u.department = %s
                AND u.is_active = true
                LIMIT 1
            """, (tenant_id, department))

            return manager['id'] if manager else None
        except Exception as e:
            logger.error(f"Error getting department manager: {e}")
            return None

    @staticmethod
    def _get_least_busy_user(role, tenant_id):
        """Get user with the least pending tasks"""
        try:
            user = Database.execute_one("""
                SELECT u.id, COUNT(t.id) as task_count
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                LEFT JOIN tasks t ON u.id = t.assigned_to AND t.status = 'pending'
                WHERE r.name = %s 
                AND u.tenant_id = %s 
                AND u.is_active = true
                GROUP BY u.id
                ORDER BY task_count ASC
                LIMIT 1
            """, (role, tenant_id))

            return user['id'] if user else None
        except Exception as e:
            logger.error(f"Error getting least busy user: {e}")
            return None

    @staticmethod
    def _get_round_robin_assignee(role, tenant_id):
        """Get next user in round-robin assignment"""
        try:
            # Get the last assigned user for this role
            last_assigned = Database.execute_one("""
                SELECT assigned_to 
                FROM tasks t
                JOIN users u ON t.assigned_to = u.id
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = %s AND u.tenant_id = %s
                ORDER BY t.created_at DESC
                LIMIT 1
            """, (role, tenant_id))

            # Get all users with this role
            users = Database.execute_query("""
                SELECT u.id 
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE r.name = %s 
                AND u.tenant_id = %s 
                AND u.is_active = true
                ORDER BY u.created_at
            """, (role, tenant_id))

            if not users:
                return None

            user_ids = [u['id'] for u in users]

            if not last_assigned:
                return user_ids[0]

            # Find next user in rotation
            try:
                current_index = user_ids.index(last_assigned['assigned_to'])
                next_index = (current_index + 1) % len(user_ids)
                return user_ids[next_index]
            except ValueError:
                return user_ids[0]

        except Exception as e:
            logger.error(f"Error getting round-robin assignee: {e}")
            return None

    # Keep all existing utility methods...
    @staticmethod
    def _is_valid_uuid(value):
        """Check if a string is a valid UUID"""
        import uuid
        try:
            uuid.UUID(str(value))
            return True
        except (ValueError, TypeError):
            return False

    @staticmethod
    def _get_user_by_role(role_name, tenant_id):
        """Get a user by role name"""
        if not tenant_id:
            return None

        query = """
            SELECT u.id 
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name = %s AND u.tenant_id = %s AND u.is_active = true
            ORDER BY u.created_at
            LIMIT 1
        """
        result = Database.execute_one(query, (role_name, tenant_id))
        return result['id'] if result else None

    @staticmethod
    def _get_user_by_email(email, tenant_id):
        """Get user by email"""
        if not tenant_id:
            return None

        query = """
            SELECT id FROM users 
            WHERE email = %s AND tenant_id = %s AND is_active = true
        """
        result = Database.execute_one(query, (email, tenant_id))
        return result['id'] if result else None

    @staticmethod
    def _get_user_by_username(username, tenant_id):
        """Get user by username"""
        if not tenant_id:
            return None

        query = """
            SELECT id FROM users 
            WHERE username = %s AND tenant_id = %s AND is_active = true
        """
        result = Database.execute_one(query, (username, tenant_id))
        return result['id'] if result else None

    @staticmethod
    def _create_task(instance_id, step, context):
        """Create a new task with enhanced assignee resolution"""
        properties = step.get('properties', {})

        # Resolve assignee with enhanced logic
        assignee_config = properties.get('assignee') or properties.get('assigned_to')
        assigned_to = WorkflowEngine._resolve_assignee(assignee_config, context)

        # Calculate due date
        due_hours = properties.get('dueHours', 24)
        due_date = datetime.now() + timedelta(hours=due_hours)

        # Get form ID from step properties
        form_id = properties.get('formId')

        # Resolve form ID if it's a string reference
        if form_id and isinstance(form_id, str) and not WorkflowEngine._is_valid_uuid(form_id):
            # Look up form by name
            form = Database.execute_one("""
                SELECT id FROM form_definitions 
                WHERE name = %s AND is_active = true
                ORDER BY version DESC
                LIMIT 1
            """, (form_id,))
            form_id = form['id'] if form else None

        # Create task with enhanced metadata
        query = """
            INSERT INTO tasks 
            (workflow_instance_id, step_id, name, description, type, 
             assigned_to, due_date, form_id, priority, metadata)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """

        metadata = {
            'assignee_config': assignee_config,
            'auto_assigned': assignee_config and assignee_config.startswith('auto:'),
            'step_properties': properties
        }

        task_id = Database.execute_insert(query, (
            instance_id, step['id'], step['name'],
            step.get('description', ''), step['type'],
            assigned_to, due_date, form_id,
            properties.get('priority', 'medium'),
            json.dumps(metadata)
        ))

        # Send notification to assigned user if assigned
        if assigned_to:
            try:
                NotificationService.send_task_assignment(assigned_to, task_id)
            except Exception as e:
                logger.error(f"Failed to send task assignment notification: {e}")

        logger.info(f"Created task {task_id} assigned to {assigned_to} for step {step['id']}")
        return task_id

    # Keep all other existing methods...
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
        """Evaluate a condition expression (supports 'all', 'any', and simple condition objects)"""

        def evaluate_single(cond):
            field = cond.get('field')
            operator = cond.get('operator')
            value = cond.get('value')

            if field not in data:
                return False

            field_value = data[field]

            try:
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
            except Exception as e:
                logger.warning(f"Condition evaluation error: {e}")
            return False

        # Compound conditions
        if 'all' in condition:
            return all(WorkflowEngine._evaluate_condition_expression(c, data) for c in condition['all'])
        elif 'any' in condition:
            return any(WorkflowEngine._evaluate_condition_expression(c, data) for c in condition['any'])

        # Single condition object
        return evaluate_single(condition)

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
        if instance:
            try:
                NotificationService.send_workflow_completion(instance['initiated_by'], instance_id)
            except Exception as e:
                logger.error(f"Failed to send workflow completion notification: {e}")

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
            SELECT id, workflow_id, initiated_by, status, data, tenant_id
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

    # Additional methods for other step types...
    @staticmethod
    def _create_approval_task(instance_id, step, context):
        """Create approval task(s) with proper assignee resolution"""
        properties = step.get('properties', {})

        # Resolve approvers
        approvers_config = properties.get('approvers', [])
        approvers = WorkflowEngine._resolve_assignee_list(approvers_config, context)

        approval_type = properties.get('approvalType', 'any')
        due_hours = properties.get('dueHours', 48)
        due_date = datetime.now() + timedelta(hours=due_hours)

        # Get form ID for approval
        form_id = properties.get('formId')
        if form_id and isinstance(form_id, str) and not WorkflowEngine._is_valid_uuid(form_id):
            form = Database.execute_one("""
                SELECT id FROM form_definitions 
                WHERE name = %s AND is_active = true
                ORDER BY version DESC
                LIMIT 1
            """, (form_id,))
            form_id = form['id'] if form else None

        created_tasks = []

        # Create approval task for each approver
        for approver in approvers:
            if approver:  # Only create task if approver is resolved
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

                created_tasks.append(task_id)

                # Send notification
                try:
                    NotificationService.send_task_assignment(approver, task_id)
                except Exception as e:
                    logger.error(f"Failed to send approval task notification: {e}")

        if not created_tasks:
            logger.warning(f"No approval tasks created for step {step['id']} - no valid approvers found")

        return created_tasks

    @staticmethod
    def _resolve_assignee_list(assignee_list, context):
        """Resolve a list of assignees"""
        if not assignee_list:
            return []

        if not isinstance(assignee_list, list):
            assignee_list = [assignee_list]

        resolved_assignees = []
        for assignee in assignee_list:
            resolved = WorkflowEngine._resolve_assignee(assignee, context)
            if resolved:
                resolved_assignees.append(resolved)

        return resolved_assignees

    @staticmethod
    def _send_notification(instance_id, step, context):
        """Send notification step"""
        properties = step.get('properties', {})
        recipients_config = properties.get('recipients', [])
        recipients = WorkflowEngine._resolve_assignee_list(recipients_config, context)
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
            if recipient:
                try:
                    NotificationService.send_notification(recipient, template, notification_data)
                except Exception as e:
                    logger.error(f"Failed to send notification: {e}")

    @staticmethod
    def _evaluate_condition(instance_id, step, definition, context):
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
                    WorkflowEngine._execute_step(instance_id, next_step, definition, context)
        else:
            false_steps = properties.get('falseSteps', [])
            for step_id in false_steps:
                next_step = WorkflowEngine._find_step_by_id(definition['steps'], step_id)
                if next_step:
                    WorkflowEngine._execute_step(instance_id, next_step, definition, context)