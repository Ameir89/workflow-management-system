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
from app.utils.json_utils import JSONUtils
from app.utils.external_api import OrgAPI

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
            # if isinstance(workflow['definition'], str):
            #     definition = json.loads(workflow['definition'])
            # else:
            #     definition = workflow['definition']

            definition = JSONUtils.safe_parse_json(workflow['definition'])

            first_step = WorkflowEngine._get_first_step(definition)

            if first_step:
                logger.info(f"Start first step is : {first_step} for instance {instance_id}")
                # Create workflow context for assignee resolution
                context = {
                    'initiator': initiated_by,
                    'initiated_by': initiated_by,
                    'tenant_id': tenant_id,
                    'workflow_data': data,
                    'workflow_instance_id': instance_id
                }
                WorkflowEngine._execute_step(instance_id, first_step, definition, context)
                logger.info(f"End of executed firs step is : {first_step} for instance {instance_id}")
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

    # Add this enhanced version to your workflow_engine.py

    # @staticmethod
    # def complete_task(task_id, result_data, completed_by):
    #     """Complete a task and advance workflow - Enhanced with debugging"""
    #     try:
    #         logger.info(f"=== STARTING TASK COMPLETION ===")
    #         logger.info(f"Task ID: {task_id}")
    #         logger.info(f"Completed by: {completed_by}")
    #         logger.info(f"Result data: {result_data}")

    #         # Get task and workflow instance
    #         task = WorkflowEngine._get_task(task_id)
    #         if not task:
    #             raise ValueError(f"Task {task_id} not found")

    #         logger.info(f"Task found: {task}")

    #         # if task['status'] != 'pending':
    #         #     raise ValueError(f"Task {task_id} is not in pending status: {task['status']}")

    #         # Update task status first
    #         WorkflowEngine._update_task_status(task_id, 'completed', result_data, completed_by)
    #         logger.info(f"✓ Task {task_id} marked as completed")

    #         # Get workflow instance
    #         workflow_instance = WorkflowEngine._get_workflow_instance(task['workflow_instance_id'])
    #         if not workflow_instance:
    #             raise ValueError(f"Workflow instance {task['workflow_instance_id']} not found")

    #         logger.info(f"Workflow instance: {workflow_instance['id']}, Status: {workflow_instance['status']}")

    #         # Get workflow definition
    #         workflow = WorkflowEngine._get_workflow(workflow_instance['workflow_id'])
    #         if not workflow:
    #             raise ValueError(f"Workflow {workflow_instance['workflow_id']} not found")

    #         logger.info(f"Workflow: {workflow['name']}")

    #         # Parse definition
    #         # if isinstance(workflow['definition'], str):
    #         #     definition = json.loads(workflow['definition'])
    #         # else:
    #         #     definition = workflow['definition']
    #         # Parse workflow definition safely
    #         definition = JSONUtils.safe_parse_json(workflow['definition'])
    #         if not definition or 'steps' not in definition:
    #             raise ValueError("Invalid workflow definition")

    #         logger.info(f"Workflow steps: {[s['id'] for s in definition.get('steps', [])]}")
    #         logger.info(f"Workflow transitions: {definition.get('transitions', [])}")

    #         # Create context for next step resolution
    #         # workflow_data = json.loads(workflow_instance['data']) if workflow_instance['data'] else {}
    #         # workflow_data.update(result_data)  # Merge task result into workflow data
    #         # Parse workflow data safely
    #         workflow_data = JSONUtils.safe_parse_json(workflow_instance['data'], {})
        
    #         # Merge task result into workflow data
    #         workflow_data = JSONUtils.merge_json_data(workflow_data, result_data)

    #         context = {
    #             'initiator': workflow_instance['initiated_by'],
    #             'initiated_by': workflow_instance['initiated_by'],
    #             'tenant_id': workflow_instance['tenant_id'],
    #             'workflow_data': workflow_data,
    #             'completed_by': completed_by,
    #             'workflow_instance_id': task['workflow_instance_id']
    #         }

    #         # Update workflow instance data
    #         # Database.execute_query("""
    #         #     UPDATE workflow_instances 
    #         #     SET data = %s, updated_at = NOW()
    #         #     WHERE id = %s
    #         # """, (json.dumps(workflow_data), task['workflow_instance_id']))
    #         # logger.info(f"✓ Workflow instance data updated")
    #         Database.execute_query("""
    #             UPDATE workflow_instances 
    #             SET data = %s, updated_at = NOW()
    #             WHERE id = %s
    #         """, (JSONUtils.safe_stringify_json(workflow_data), task['workflow_instance_id']))

    #         # Determine next step
    #         logger.info(f"=== FINDING NEXT STEP ===")
    #         logger.info(f"Current step: {task['step_id']}")

    #         next_step = WorkflowEngine._get_next_step_debug(
    #             definition, task['step_id'], result_data
    #         )

    #         if next_step:
    #             logger.info(f"✓ Next step found: {next_step['id']} ({next_step['name']})")
    #             logger.info(f"=== EXECUTING NEXT STEP ===")

    #             WorkflowEngine._execute_step(task['workflow_instance_id'], next_step, definition, context)
    #             logger.info(f"✓ Next step executed successfully")
    #         else:
    #             logger.info(f"No next step found - completing workflow")
    #             WorkflowEngine._complete_workflow(task['workflow_instance_id'])
    #             logger.info(f"✓ Workflow completed")

    #         logger.info(f"=== TASK COMPLETION FINISHED ===")

    #     except Exception as e:
    #         logger.error(f"❌ Failed to complete task {task_id}: {e}", exc_info=True)
    #         raise
    @staticmethod
    def complete_task(task_id, result_data, completed_by):
        """Complete a task and advance workflow - Enhanced with return task handling"""
        try:
            logger.info(f"=== STARTING TASK COMPLETION ===")
            logger.info(f"Task ID: {task_id}")
            logger.info(f"Completed by: {completed_by}")
            logger.info(f"Result data: {result_data}")

            # Get task and workflow instance
            task = WorkflowEngine._get_task_with_metadata(task_id)
            if not task:
                raise ValueError(f"Task {task_id} not found")

            logger.info(f"Task found: {task}")

            # Check if this is a return task
            metadata = JSONUtils.safe_parse_json(task.get('metadata'), {})
            is_return_task = metadata.get('is_return_task', False)

            # Get workflow instance
            workflow_instance = WorkflowEngine._get_workflow_instance(task['workflow_instance_id'])
            if not workflow_instance:
                raise ValueError(f"Workflow instance {task['workflow_instance_id']} not found")

            logger.info(f"Workflow instance: {workflow_instance['id']}, Status: {workflow_instance['status']}")

            # Get workflow definition
            workflow = WorkflowEngine._get_workflow(workflow_instance['workflow_id'])
            if not workflow:
                raise ValueError(f"Workflow {workflow_instance['workflow_id']} not found")

            logger.info(f"Workflow: {workflow['name']}")

            # Parse workflow definition safely
            definition = JSONUtils.safe_parse_json(workflow['definition'])
            if not definition or 'steps' not in definition:
                raise ValueError("Invalid workflow definition")

            logger.info(f"Workflow steps: {[s['id'] for s in definition.get('steps', [])]}")
            logger.info(f"Workflow transitions: {definition.get('transitions', [])}")

            # Create context for next step resolution
            workflow_data = JSONUtils.safe_parse_json(workflow_instance['data'], {})
            
            # Merge task result into workflow data
            workflow_data = JSONUtils.merge_json_data(workflow_data, result_data)

            context = {
                'initiator': workflow_instance['initiated_by'],
                'initiated_by': workflow_instance['initiated_by'],
                'tenant_id': workflow_instance['tenant_id'],
                'workflow_data': workflow_data,
                'completed_by': completed_by,
                'workflow_instance_id': task['workflow_instance_id'],
                'is_return_task': is_return_task
            }

            # Update workflow instance data
            Database.execute_query("""
                UPDATE workflow_instances 
                SET data = %s, updated_at = NOW()
                WHERE id = %s
            """, (JSONUtils.safe_stringify_json(workflow_data), task['workflow_instance_id']))

            # Handle return task completion specially
            if is_return_task:
                logger.info(f"=== HANDLING RETURN TASK COMPLETION ===")
                next_step = WorkflowEngine._handle_return_task_completion(
                    task, definition, context, metadata
                )
            else:
                # Normal task completion - determine next step
                logger.info(f"=== FINDING NEXT STEP ===")
                logger.info(f"Current step: {task['step_id']}")
                
                next_step = WorkflowEngine._get_next_step_debug(
                    definition, task['step_id'], result_data
                )

            if next_step:
                logger.info(f"✓ Next step found: {next_step['id']} ({next_step['name']})")
                logger.info(f"=== EXECUTING NEXT STEP ===")

                WorkflowEngine._execute_step(task['workflow_instance_id'], next_step, definition, context)
                logger.info(f"✓ Next step executed successfully")
            else:
                logger.info(f"No next step found - completing workflow")
                WorkflowEngine._complete_workflow(task['workflow_instance_id'])
                logger.info(f"✓ Workflow completed")

            logger.info(f"=== TASK COMPLETION FINISHED ===")

        except Exception as e:
            logger.error(f"❌ Failed to complete task {task_id}: {e}", exc_info=True)
            raise
    
    @staticmethod
    def _get_next_step_debug(definition, current_step_id, result_data):
        """Enhanced next step detection with comprehensive debugging"""
        logger.info(f"--- Finding next step from '{current_step_id}' ---")

        steps = definition.get('steps', [])
        transitions = definition.get('transitions', [])

        logger.info(f"Available steps: {[s['id'] for s in steps]}")
        logger.info(f"All transitions: {transitions}")
        logger.info(f"Result data for evaluation: {result_data}")

        # Find transitions from current step
        matching_transitions = [t for t in transitions if t['from'] == current_step_id]
        logger.info(f"Transitions from '{current_step_id}': {matching_transitions}")

        if not matching_transitions:
            logger.warning(f"❌ No transitions found from step '{current_step_id}'")
            return None

        for i, transition in enumerate(matching_transitions):
            logger.info(f"Evaluating transition {i + 1}: {transition}")

            condition = transition.get('condition')

            if condition:
                logger.info(f"Transition has condition: {condition}")
                condition_result = WorkflowEngine._evaluate_condition_expression(condition, result_data)
                logger.info(f"Condition evaluation result: {condition_result}")
                
                print(f"Ameir Elshareif : Condition evaluation result: {condition_result}")
                logger.info(f"Ameir Elshareif :Condition evaluation result: {condition_result}")
                if condition_result:
                    target_step = WorkflowEngine._find_step_by_id(steps, transition['to'])
                    logger.info(f"✓ Condition met! Target step: {target_step}")
                    return target_step
                else:
                    logger.info(f"Condition not met, trying next transition...")
            else:
                # No condition - take this transition
                target_step = WorkflowEngine._find_step_by_id(steps, transition['to'])
                logger.info(f"✓ No condition required. Target step: {target_step}")
                return target_step

        logger.warning(f"❌ No valid transitions found from '{current_step_id}'")
        return None
    
    @staticmethod
    def _evaluate_condition_expression(condition, data):
        """Evaluate a condition with optional nested rules."""
        logger.info(f"Evaluating condition: {condition}")
        logger.info(f"Against data: {data}")

        def evaluate_single(cond):
            field = cond.get('field')
            operator = cond.get('operator')
            value = cond.get('value')

            logger.info(f"Evaluating single condition: {cond}")

            if not field or not operator:
                logger.warning(f"Invalid condition: missing field/operator -> {cond}")
                return False

            prefixes = ['task.', 'sys_', 'custom_', 'workflow.']
            original_field = field

            if isinstance(field, str):
                for prefix in prefixes:
                    if field.startswith(prefix):
                        logger.info(f"Detected prefix '{prefix}' in field name '{field}'")
                        field = field[len(prefix):]
                        break

            field_value = data.get(field)
            if field_value is None and isinstance(data.get('form_data'), dict):
                field_value = data['form_data'].get(field)

            if field_value is None:
                logger.info(f"Field '{field}' not found in data or form_data (original: '{original_field}')")
                return False

            logger.info(f"Field value: {field_value} (type: {type(field_value)})")

            try:
                if operator == 'equals':
                    return str(field_value) == str(value)
                elif operator == 'not_equals':
                    return str(field_value) != str(value)
                elif operator == 'greater_than':
                    return float(field_value) > float(value)
                elif operator == 'less_than':
                    return float(field_value) < float(value)
                elif operator == 'contains':
                    return str(value) in str(field_value)
                elif operator == 'between':
                    if isinstance(value, (list, tuple)) and len(value) == 2:
                        return float(value[0]) <= float(field_value) <= float(value[1])
                    else:
                        logger.warning(f"Invalid 'between' value: {value}")
                        return False
                else:
                    logger.warning(f"Unknown operator: {operator}")
                    return False
            except Exception as e:
                logger.warning(f"Condition evaluation error: {e}")
                return False

        # Handle complex rules with 'rules' and optional 'operator'
        if isinstance(condition, dict):
            # Evaluate as single condition if 'rules' has one item and no operator specified
            if 'rules' in condition and isinstance(condition['rules'], list):
                rules = condition['rules']
                op = condition.get('operator', None)

                if not op or op.strip() == '':
                    # Treat as single condition if only one rule
                    if len(rules) == 1:
                        logger.info("Operator is missing or null — evaluating as single condition.")
                        return WorkflowEngine._evaluate_condition_expression(rules[0], data)
                    else:
                        logger.warning("Operator is missing but multiple rules found — treating as ALL.")
                        op = 'all'

                op = op.lower()
                results = [WorkflowEngine._evaluate_condition_expression(rule, data) for rule in rules]
                final = all(results) if op == 'all' else any(results)
                logger.info(f"Compound condition ({op.upper()}): {results} => {final}")
                return final

            elif 'all' in condition:
                results = [WorkflowEngine._evaluate_condition_expression(c, data) for c in condition['all']]
                final = all(results)
                logger.info(f"ALL condition => {results} => {final}")
                return final

            elif 'any' in condition:
                results = [WorkflowEngine._evaluate_condition_expression(c, data) for c in condition['any']]
                final = any(results)
                logger.info(f"ANY condition => {results} => {final}")
                return final

            elif 'field' in condition and 'operator' in condition:
                return evaluate_single(condition)

        logger.warning(f"Invalid condition structure: {condition}")
        return False

    # @staticmethod
    # def _evaluate_condition_expression(condition, data):
    #     """Enhanced condition evaluation with debugging"""
    #     logger.info(f"Evaluating condition: {condition}")
    #     logger.info(f"Against data: {data}")

    #     def evaluate_single(cond):
    #         field = cond.get('field')
    #         operator = cond.get('operator')
    #         value = cond.get('value')

    #         logger.info(f"Single condition: {field} {operator} {value}")
            
    #         # قائمة الـ prefixes المحتملة في أسماء الحقول
    #         prefixes = ['task.', 'sys_', 'custom_']

    #         # إزالة الـ prefix من اسم الحقل نفسه إن وُجد
    #         original_field = field  # للاحتفاظ بالاسم الأصلي للّـ log
    #         if isinstance(field, str):
    #             for prefix in prefixes:
    #                 if field.startswith(prefix):
    #                     logger.info(f"Detected prefix '{prefix}' in field name '{field}'")
    #                     field = field[len(prefix):]  # إزالة الـ prefix
    #                     logger.info(f"Field name after removing prefix: {field}")
    #                     break

    #         # التحقق من وجود الحقل في البيانات بعد إزالة الـ prefix
    #         if field not in data:
    #             logger.info(f"Field '{field}' not found in data (original: '{original_field}')")
    #             return False
    #         # if field not in data:
    #         #     logger.info(f"Field '{field}' not found in data")
    #         #     return False

    #         field_value = data[field]
    #         logger.info(f"Field value: {field_value} (type: {type(field_value)})")

    #         try:

    #             if operator == 'equals':
    #                 result = field_value == value
    #             elif operator == 'not_equals':
    #                 result = field_value != value
    #             elif operator == 'greater_than':
    #                 result = float(field_value) > float(value)
    #             elif operator == 'less_than':
    #                 result = float(field_value) < float(value)
    #             elif operator == 'contains':
    #                 result = value in str(field_value)
    #             elif operator == 'between':
    #                 result = value[0] <= float(field_value) <= value[1]
    #             else:
    #                 logger.warning(f"Unknown operator: {operator}")
    #                 result = False

    #             logger.info(f"Condition result: {result}")
    #             return result

    #         except Exception as e:
    #             logger.warning(f"Condition evaluation error: {e}")
    #             return False

    #     # Compound conditions
    #     if 'all' in condition:
    #         results = []
    #         for c in condition['all']:
    #             result = WorkflowEngine._evaluate_condition_expression(c, data)
    #             results.append(result)
    #         final_result = all(results)
    #         logger.info(f"ALL condition results: {results} -> {final_result}")
    #         return final_result

    #     elif 'any' in condition:
    #         results = []
    #         for c in condition['any']:
    #             result = WorkflowEngine._evaluate_condition_expression(c, data)
    #             results.append(result)
    #         final_result = any(results)
    #         logger.info(f"ANY condition results: {results} -> {final_result}")
    #         return final_result

    #     # Single condition object
    #     return evaluate_single(condition)
    
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
            # script_date = getScript(properties.get('script_id'))
            script_data = WorkflowEngine._get_script(properties.get('script_id'))
            # Support legacy script property for backward compatibility
            # if not automation_config and properties.get('script'):
            if not automation_config and script_data:
                automation_config = {
                    # 'type': 'script_execution',
                    'type': script_data.get('type', 'script_execution'),
                    'script_type': script_data.get('script_type', 'python'),
                    'script': script_data.get('script_content'),
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
                """, (JSONUtils.safe_json_dumps(workflow_data), instance_id))

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
        """Enhanced assignee resolution including dotted variables like {{initiator.branch_manager}}"""
        if not assignee_config:
            return None

        # Direct UUID
        if WorkflowEngine._is_valid_uuid(assignee_config):
            return assignee_config

        # Template string
        if isinstance(assignee_config, str):

            # Direct initiator
            if assignee_config in ['{{initiator}}', '{{initiated_by}}']:
                return context.get('initiator') or context.get('initiated_by')

            # Regex match for templates
            template_match = re.match(r'\{\{([^}]+)\}\}', assignee_config)
            if template_match:
                variable = template_match.group(1).strip()

                # Support dot notation e.g. initiator.branch_manager
                parts = variable.split('.')
                if parts[0] == 'initiator' and len(parts) == 2:
                    role_key = parts[1]  # e.g. branch_manager
                    user_id = context.get('initiator') or context.get('initiated_by')
                    if user_id:
                        # Option 1: try from workflow_data first (cached)
                        workflow_data = context.get("workflow_data", {})
                        if role_key in workflow_data:
                            value = workflow_data[role_key]
                            if WorkflowEngine._is_valid_uuid(value):
                                return value

                        # Option 2: try from external org system
                        manager_id = OrgAPI.get_manager(user_id, role_key)
                        if manager_id:
                            return manager_id
                        else:
                            logger.warning(f"Could not fetch {role_key} for user {user_id}")
                            return None

                # Basic variable resolution from workflow data
                workflow_data = context.get("workflow_data", {})
                if variable in workflow_data:
                    val = workflow_data[variable]
                    if WorkflowEngine._is_valid_uuid(val):
                        return val

                # Role-based assignment
                if variable in ['manager', 'supervisor', 'department_head']:
                    return WorkflowEngine._get_user_by_role(variable, context.get('tenant_id'))

                logger.warning(f"Unresolved template variable: {variable}")
                return None

            # Static role or username
            if assignee_config.startswith("role:"):
                role_name = assignee_config[5:]
                return WorkflowEngine._get_user_by_role(role_name, context.get("tenant_id"))

            if '@' in assignee_config:
                return WorkflowEngine._get_user_by_email(assignee_config, context.get("tenant_id"))

            return WorkflowEngine._get_user_by_username(assignee_config, context.get("tenant_id"))

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

    # @staticmethod
    #  def _create_task(instance_id, step, context):
    #     """Create a new task with enhanced assignee resolution"""
    #     properties = step.get('properties', {})

    #     # Resolve assignee with enhanced logic
    #     assignee_config = properties.get('assignee') or properties.get('assigned_to')
    #     assigned_to = WorkflowEngine._resolve_assignee(assignee_config, context)

    #     # Calculate due date
    #     due_hours = properties.get('dueHours', 24)
    #     due_date = datetime.now() + timedelta(hours=due_hours)

    #     # Get form ID from step properties
    #     form_id = properties.get('formId')

    #     # Resolve form ID if it's a string reference
    #     if form_id and isinstance(form_id, str) and not WorkflowEngine._is_valid_uuid(form_id):
    #         # Look up form by name
    #         form = Database.execute_one("""
    #             SELECT id FROM form_definitions 
    #             WHERE name = %s AND is_active = true
    #             ORDER BY version DESC
    #             LIMIT 1
    #         """, (form_id,))
    #         form_id = form['id'] if form else None

    #     # Create task with enhanced metadata
    #     query = """
    #         INSERT INTO tasks 
    #         (workflow_instance_id, step_id, name, description, type, 
    #          assigned_to, due_date, form_id, priority, metadata)
    #         VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
    #     """

    #     metadata = {
    #         'assignee_config': assignee_config,
    #         'auto_assigned': assignee_config and assignee_config.startswith('auto:'),
    #         'step_properties': properties
    #     }

    #     task_id = Database.execute_insert(query, (
    #         instance_id, step['id'], step['name'],
    #         step.get('description', ''), step['type'],
    #         assigned_to, due_date, form_id,
    #         properties.get('priority', 'medium'),
    #         json.dumps(metadata)
    #     ))

    #     # Send notification to assigned user if assigned
    #     if assigned_to:
    #         try:
    #             NotificationService.send_task_assignment(assigned_to, task_id)
    #         except Exception as e:
    #             logger.error(f"Failed to send task assignment notification: {e}")

    #     logger.info(f"Created task {task_id} assigned to {assigned_to} for step {step['id']}")
    #     return task_id
    # Enhanced task creation for return scenarios
    @staticmethod
    def _create_task(instance_id, step, context):
        """Create a new task with enhanced assignee resolution and return task handling"""
        try:
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
                form = Database.execute_one("""
                    SELECT id FROM form_definitions 
                    WHERE name = %s AND is_active = true
                    ORDER BY version DESC
                    LIMIT 1
                """, (form_id,))
                form_id = form['id'] if form else None

            # Enhanced task name and description for context
            task_name = step['name']
            task_description = step.get('description', '')
            
            # Check if this is related to a return task scenario
            workflow_data = context.get('workflow_data', {})
            if workflow_data.get('return_task_created'):
                task_name = f"Review: {task_name}"
                task_description = f"Review resubmitted content. {task_description}"

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
                'step_properties': properties,
                'is_post_return': bool(workflow_data.get('return_task_created')),
                'context_type': 'return_review' if workflow_data.get('return_task_created') else 'normal'
            }

            task_id = Database.execute_insert(query, (
                instance_id, step['id'], task_name, task_description, step['type'],
                assigned_to, due_date, form_id,
                properties.get('priority', 'medium'),
                JSONUtils.safe_json_dumps(metadata)
            ))

            # Send notification to assigned user if assigned
            if assigned_to:
                try:
                    notification_template = 'task_assignment_post_return' if workflow_data.get('return_task_created') else 'task_assignment'
                    NotificationService.send_notification(assigned_to, notification_template, {
                        'task_id': str(task_id),
                        'task_name': task_name,
                        'workflow_title': workflow_data.get('title', 'Workflow'),
                        'is_post_return': bool(workflow_data.get('return_task_created'))
                    })
                except Exception as e:
                    logger.error(f"Failed to send task assignment notification: {e}")

            logger.info(f"Created task {task_id} assigned to {assigned_to} for step {step['id']}")
            return task_id

        except Exception as e:
            logger.error(f"Error creating task: {e}")
            return None
    

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
    def _get_script(script_id):
        """Get script by ID"""
        query = """
            SELECT * 
            FROM  automation_scripts
            WHERE id = %s
        """
        return Database.execute_one(query, (script_id,))

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
    # @staticmethod
    # def _create_approval_task(instance_id, step, context):
    #     """Create approval task(s) with proper assignee resolution"""
    #     properties = step.get('properties', {})

    #     # Resolve approvers
    #     approvers_config = properties.get('approvers', [])
    #     approvers = WorkflowEngine._resolve_assignee_list(approvers_config, context)

    #     approval_type = properties.get('approvalType', 'any')
    #     due_hours = properties.get('dueHours', 48)
    #     due_date = datetime.now() + timedelta(hours=due_hours)

    #     # Get form ID for approval
    #     form_id = properties.get('formId')
    #     if form_id and isinstance(form_id, str) and not WorkflowEngine._is_valid_uuid(form_id):
    #         form = Database.execute_one("""
    #             SELECT id FROM form_definitions 
    #             WHERE name = %s AND is_active = true
    #             ORDER BY version DESC
    #             LIMIT 1
    #         """, (form_id,))
    #         form_id = form['id'] if form else None

    #     created_tasks = []

    #     # Create approval task for each approver
    #     for approver in approvers:
    #         if approver:  # Only create task if approver is resolved
    #             query = """
    #                 INSERT INTO tasks 
    #                 (workflow_instance_id, step_id, name, description, type, 
    #                  assigned_to, due_date, form_id)
    #                 VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
    #             """
    #             task_id = Database.execute_insert(query, (
    #                 instance_id, step['id'], f"Approval: {step['name']}",
    #                 step.get('description', ''), 'approval',
    #                 approver, due_date, form_id
    #             ))

    #             created_tasks.append(task_id)

    #             # Send notification
    #             try:
    #                 NotificationService.send_task_assignment(approver, task_id)
    #             except Exception as e:
    #                 logger.error(f"Failed to send approval task notification: {e}")

    #     if not created_tasks:
    #         logger.warning(f"No approval tasks created for step {step['id']} - no valid approvers found")

    #     return created_tasks
    @staticmethod
    def _create_approval_task(instance_id, step, context):
        """Create approval task(s) with proper assignee resolution - Enhanced for return tasks"""
        try:
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
                    # Enhanced task name for resubmitted approvals
                    task_name = f"Approval: {step['name']}"
                    if context.get('is_return_task'):
                        task_name = f"Re-approval: {step['name']} (Resubmitted)"

                    query = """
                        INSERT INTO tasks 
                        (workflow_instance_id, step_id, name, description, type, 
                        assigned_to, due_date, form_id, priority, metadata)
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    """
                    
                    # Add metadata for resubmitted approval
                    approval_metadata = {
                        'approval_type': approval_type,
                        'is_resubmitted_approval': context.get('is_return_task', False)
                    }
                    
                    if context.get('is_return_task'):
                        approval_metadata['resubmission_reason'] = 'Return task completed'
                        approval_metadata['previous_return'] = True

                    task_id = Database.execute_insert(query, (
                        instance_id, step['id'], task_name,
                        step.get('description', ''), 'approval',
                        approver, due_date, form_id, 'high',
                        JSONUtils.safe_json_dumps(approval_metadata)
                    ))

                    created_tasks.append(task_id)

                    # Send notification with context about resubmission
                    try:
                        notification_data = {
                            'task_id': str(task_id),
                            'task_name': task_name,
                            'workflow_title': context.get('workflow_data', {}).get('title', 'Workflow'),
                            'is_resubmission': context.get('is_return_task', False)
                        }
                        
                        template = 'task_assignment_resubmission' if context.get('is_return_task') else 'task_assignment'
                        NotificationService.send_notification(approver, template, notification_data)
                    except Exception as e:
                        logger.error(f"Failed to send approval task notification: {e}")

            if not created_tasks:
                logger.warning(f"No approval tasks created for step {step['id']} - no valid approvers found")
                return None

            return created_tasks[0] if len(created_tasks) == 1 else created_tasks

        except Exception as e:
            logger.error(f"Error creating approval task: {e}")
            return None
    
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
        # workflow_data = json.loads(instance['data']) if instance['data'] else {}
        workflow_data = json.loads(instance['data']) if isinstance(instance['data'], str) else (instance['data'] if isinstance(instance['data'], dict) else {})

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
                    
                    
                    
    @staticmethod
    def _get_task_with_metadata(task_id):
        """Get task with metadata information"""
        query = """
            SELECT id, workflow_instance_id, step_id, status, assigned_to, metadata, form_data
            FROM tasks 
            WHERE id = %s
        """
        return Database.execute_one(query, (task_id,))


    @staticmethod
    def _handle_return_task_completion(task, definition, context, metadata):
        """Handle completion of a return task - find the appropriate next step"""
        try:
            logger.info(f"Handling return task completion for task {task['id']}")
            
            # Get the original step that was returned
            original_step_id = metadata.get('original_step_id') or task['step_id']
            
            # Find the original step in the definition
            original_step = WorkflowEngine._find_step_by_id(definition['steps'], original_step_id)
            if not original_step:
                logger.error(f"Original step {original_step_id} not found in workflow definition")
                return None

            # Check if the original step was an approval step
            if original_step.get('type') == 'approval':
                logger.info(f"Return task was for approval step, creating new approval task")
                
                # Create a new approval task for the same step
                new_approval_task_id = WorkflowEngine._create_approval_task(
                    task['workflow_instance_id'], original_step, context
                )
                
                if new_approval_task_id:
                    logger.info(f"Created new approval task {new_approval_task_id}")
                    # Don't return a next_step since we created the approval task directly
                    return None
                else:
                    logger.error("Failed to create new approval task")
                    return None
            else:
                # For non-approval steps, proceed to the next step normally
                logger.info(f"Return task was for regular step, proceeding to next step")
                
                # Use the result data from the return task to determine next step
                return_result = JSONUtils.safe_parse_json(task.get('form_data'), {})
                return WorkflowEngine._get_next_step_debug(
                    definition, original_step_id, return_result
                )
                
        except Exception as e:
            logger.error(f"Error handling return task completion: {e}")
            return None