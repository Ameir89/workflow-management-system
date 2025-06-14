### app/blueprints/tasks.py
"""
Tasks blueprint - handles task management with form integration
"""
from flask import Blueprint, request, jsonify, g
from datetime import datetime, timedelta
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid
from app.utils.validators import validate_required_fields
from app.services.workflow_engine import WorkflowEngine
from app.services.sla_monitor import SLAMonitor
import json
import logging

logger = logging.getLogger(__name__)

tasks_bp = Blueprint('tasks', __name__)


@tasks_bp.route('', methods=['GET'])
@require_auth
def get_tasks():
    """Get tasks with enhanced filtering including workflow_instance_id"""
    try:
        user_id = g.current_user['user_id']
        tenant_id = g.current_user['tenant_id']

        # Pagination parameters
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit

        # Filter parameters
        status_filter = request.args.get('status')
        workflow_instance_id = request.args.get('workflow_instance_id')
        workflow_id = request.args.get('workflow_id')
        assigned_to_me = request.args.get('assigned_to_me', 'true').lower() == 'true'
        assigned_to = request.args.get('assigned_to')  # Specific user
        task_type = request.args.get('type')
        due_date_from = request.args.get('due_date_from')
        due_date_to = request.args.get('due_date_to')
        search = request.args.get('search', '')

        # Build query conditions
        where_conditions = ["wi.tenant_id = %s"]
        params = [tenant_id]

        # Workflow instance filter (main new feature)
        if workflow_instance_id:
            if not validate_uuid(workflow_instance_id):
                return jsonify({'error': 'Invalid workflow_instance_id format'}), 400
            where_conditions.append("t.workflow_instance_id = %s")
            params.append(workflow_instance_id)

        # Workflow filter
        if workflow_id:
            if not validate_uuid(workflow_id):
                return jsonify({'error': 'Invalid workflow_id format'}), 400
            where_conditions.append("wi.workflow_id = %s")
            params.append(workflow_id)

        # Status filter
        if status_filter:
            where_conditions.append("t.status = %s")
            params.append(status_filter)

        # Assignment filters
        if assigned_to_me and not assigned_to:
            where_conditions.append("t.assigned_to = %s")
            params.append(user_id)
        elif assigned_to:
            if not validate_uuid(assigned_to):
                return jsonify({'error': 'Invalid assigned_to format'}), 400
            where_conditions.append("t.assigned_to = %s")
            params.append(assigned_to)

        # Task type filter
        if task_type:
            where_conditions.append("t.type = %s")
            params.append(task_type)

        # Due date filters
        if due_date_from:
            where_conditions.append("t.due_date >= %s")
            params.append(due_date_from)

        if due_date_to:
            where_conditions.append("t.due_date <= %s")
            params.append(due_date_to)

        # Search filter
        if search:
            where_conditions.append("(t.name ILIKE %s OR t.description ILIKE %s)")
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        where_clause = "WHERE " + " AND ".join(where_conditions)

        # Execute query
        tasks = Database.execute_query(f"""
            SELECT t.id, t.name, t.description, t.type, t.status, t.due_date,
                   t.created_at, t.updated_at, t.started_at, t.completed_at,
                   t.form_id, t.form_data, t.step_id, t.workflow_instance_id,
                   wi.title as workflow_title, wi.id as workflow_instance_id,
                   wi.status as workflow_status, wi.priority as workflow_priority,
                   w.name as workflow_name, w.id as workflow_id,
                   u1.first_name || ' ' || u1.last_name as assigned_to_name,
                   u2.first_name || ' ' || u2.last_name as assigned_by_name,
                   u3.first_name || ' ' || u3.last_name as completed_by_name,
                   fd.name as form_name, fd.schema as form_schema,
                   CASE 
                       WHEN t.due_date < NOW() AND t.status = 'pending' THEN true
                       ELSE false
                   END as is_overdue,
                   CASE 
                       WHEN t.due_date IS NOT NULL THEN 
                           EXTRACT(EPOCH FROM (t.due_date - NOW()))/3600
                       ELSE NULL
                   END as hours_until_due
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            JOIN workflows w ON wi.workflow_id = w.id
            LEFT JOIN users u1 ON t.assigned_to = u1.id
            LEFT JOIN users u2 ON t.assigned_by = u2.id
            LEFT JOIN users u3 ON t.completed_by = u3.id
            LEFT JOIN form_definitions fd ON t.form_id = fd.id
            {where_clause}
            ORDER BY 
                CASE WHEN t.status = 'pending' THEN 1 
                     WHEN t.status = 'in_progress' THEN 2 
                     ELSE 3 END,
                t.due_date ASC NULLS LAST,
                t.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Process results
        processed_tasks = []
        for task in tasks:
            task_dict = dict(task)

            # Parse JSON fields
            if task_dict.get('form_data'):
                try:
                    task_dict['form_data'] = json.loads(task_dict['form_data']) if isinstance(task_dict['form_data'],
                                                                                              str) else task_dict['form_data']
                except (json.JSONDecodeError, TypeError):
                    task_dict['form_data'] = {}

            if task_dict.get('form_schema'):
                try:
                    task_dict['form_schema'] = json.loads(task_dict['form_schema']) if isinstance(task_dict['form_schema'], str) else task_dict['form_schema']
                except (json.JSONDecodeError, TypeError):
                    task_dict['form_schema'] = None

            # Add computed fields
            if task_dict['hours_until_due'] is not None:
                task_dict['urgency'] = 'urgent' if task_dict['hours_until_due'] < 24 else 'normal'
            else:
                task_dict['urgency'] = 'normal'

            processed_tasks.append(task_dict)

        # Get total count
        count_query = f"""
            SELECT COUNT(*) as count 
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            JOIN workflows w ON wi.workflow_id = w.id
            {where_clause}
        """
        total = Database.execute_one(count_query, params)

        # Get summary statistics for the filtered results
        stats_query = f"""
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_count,
                COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_count,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_count,
                COUNT(CASE WHEN t.due_date < NOW() AND t.status = 'pending' THEN 1 END) as overdue_count,
                COUNT(CASE WHEN t.form_id IS NOT NULL THEN 1 END) as tasks_with_forms
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            JOIN workflows w ON wi.workflow_id = w.id
            {where_clause}
        """
        stats = Database.execute_one(stats_query, params)

        # Build response
        response = {
            'tasks': processed_tasks,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit if total['count'] > 0 else 1
            },
            'statistics': dict(stats),
            'filters_applied': {
                'workflow_instance_id': workflow_instance_id,
                'workflow_id': workflow_id,
                'status': status_filter,
                'assigned_to_me': assigned_to_me,
                'assigned_to': assigned_to,
                'type': task_type,
                'search': search,
                'due_date_from': due_date_from,
                'due_date_to': due_date_to
            }
        }

        return jsonify(response), 200

    except Exception as e:
        logger.error(f"Error getting tasks: {e}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve tasks'}), 500

# Additional endpoint specifically for workflow instance tasks
@tasks_bp.route('/workflow/<workflow_instance_id>', methods=['GET'])
@require_auth
def get_workflow_tasks(workflow_instance_id):
    """Get all tasks for a specific workflow instance (dedicated endpoint)"""
    try:
        if not validate_uuid(workflow_instance_id):
            return jsonify({'error': 'Invalid workflow instance ID'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Verify workflow instance exists and user has access
        workflow_instance = Database.execute_one("""
            SELECT wi.id, wi.title, wi.status, wi.workflow_id,
                   w.name as workflow_name
            FROM workflow_instances wi
            JOIN workflows w ON wi.workflow_id = w.id
            WHERE wi.id = %s AND wi.tenant_id = %s
        """, (workflow_instance_id, tenant_id))

        if not workflow_instance:
            return jsonify({'error': 'Workflow instance not found'}), 404

        # Get all tasks for this workflow instance
        tasks = Database.execute_query("""
            SELECT t.*, 
                   u1.first_name || ' ' || u1.last_name as assigned_to_name,
                   u2.first_name || ' ' || u2.last_name as assigned_by_name,
                   u3.first_name || ' ' || u3.last_name as completed_by_name,
                   fd.name as form_name,
                   CASE 
                       WHEN t.due_date < NOW() AND t.status = 'pending' THEN true
                       ELSE false
                   END as is_overdue,
                   CASE 
                       WHEN t.due_date IS NOT NULL THEN 
                           EXTRACT(EPOCH FROM (t.due_date - NOW()))/3600
                       ELSE NULL
                   END as hours_until_due
            FROM tasks t
            LEFT JOIN users u1 ON t.assigned_to = u1.id
            LEFT JOIN users u2 ON t.assigned_by = u2.id
            LEFT JOIN users u3 ON t.completed_by = u3.id
            LEFT JOIN form_definitions fd ON t.form_id = fd.id
            WHERE t.workflow_instance_id = %s
            ORDER BY t.created_at ASC
        """, (workflow_instance_id,))

        # Process tasks
        processed_tasks = []
        for task in tasks:
            task_dict = dict(task)

            # Parse form_data if present
            if task_dict.get('form_data'):
                try:
                    task_dict['form_data'] = json.loads(task_dict['form_data']) if isinstance(task_dict['form_data'], str) else task_dict['form_data']
                except (json.JSONDecodeError, TypeError):
                    task_dict['form_data'] = {}

            # Parse result if present
            if task_dict.get('result'):
                try:
                    task_dict['result'] = json.loads(task_dict['result']) if isinstance(task_dict['result'], str) else task_dict['result']
                except (json.JSONDecodeError, TypeError):
                    task_dict['result'] = {}

            processed_tasks.append(task_dict)

        # Get task statistics
        task_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_tasks,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_tasks,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks,
                COUNT(CASE WHEN due_date < NOW() AND status = 'pending' THEN 1 END) as overdue_tasks
            FROM tasks
            WHERE workflow_instance_id = %s
        """, (workflow_instance_id,))

        return jsonify({
            'workflow_instance': dict(workflow_instance),
            'tasks': processed_tasks,
            'statistics': dict(task_stats)
        }), 200

    except Exception as e:
        logger.error(f"Error getting workflow tasks {workflow_instance_id}: {e}")
        return jsonify({'error': 'Failed to retrieve workflow tasks'}), 500
# @tasks_bp.route('', methods=['GET'])
# @require_auth
# def get_tasks():
#     """Get tasks for current user with form information"""
#     try:
#         user_id = g.current_user['user_id']
#         tenant_id = g.current_user['tenant_id']
#
#         page = int(request.args.get('page', 1))
#         limit = min(int(request.args.get('limit', 20)), 100)
#         offset = (page - 1) * limit
#         status_filter = request.args.get('status')
#         assigned_to_me = request.args.get('assigned_to_me', 'true').lower() == 'true'
#
#         # Build query
#         where_conditions = ["t.workflow_instance_id IN (SELECT id FROM workflow_instances WHERE tenant_id = %s)"]
#         params = [tenant_id]
#
#         if assigned_to_me:
#             where_conditions.append("t.assigned_to = %s")
#             params.append(user_id)
#
#         if status_filter:
#             where_conditions.append("t.status = %s")
#             params.append(status_filter)
#
#         where_clause = "WHERE " + " AND ".join(where_conditions)
#
#         tasks = Database.execute_query(f"""
#             SELECT t.id, t.name, t.description, t.type, t.status, t.due_date,
#                    t.created_at, t.updated_at, t.started_at, t.completed_at,
#                    t.form_id, t.form_data,
#                    wi.title as workflow_title, wi.id as workflow_instance_id,
#                    w.name as workflow_name,
#                    u1.first_name || ' ' || u1.last_name as assigned_to_name,
#                    u2.first_name || ' ' || u2.last_name as assigned_by_name,
#                    fd.name as form_name, fd.schema as form_schema,
#                    CASE
#                        WHEN t.due_date < NOW() AND t.status = 'pending' THEN true
#                        ELSE false
#                    END as is_overdue
#             FROM tasks t
#             JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
#             JOIN workflows w ON wi.workflow_id = w.id
#             LEFT JOIN users u1 ON t.assigned_to = u1.id
#             LEFT JOIN users u2 ON t.assigned_by = u2.id
#             LEFT JOIN form_definitions fd ON t.form_id = fd.id
#             {where_clause}
#             ORDER BY
#                 CASE WHEN t.status = 'pending' THEN 1 ELSE 2 END,
#                 t.due_date ASC NULLS LAST,
#                 t.created_at DESC
#             LIMIT %s OFFSET %s
#         """, params + [limit, offset])
#
#         # Parse JSON fields and prepare response
#         for task in tasks:
#             # Parse form_data if present
#             if task['form_data']:
#                 try:
#                     task['form_data'] = json.loads(task['form_data']) if isinstance(task['form_data'], str) else task['form_data']
#                 except (json.JSONDecodeError, TypeError):
#                     task['form_data'] = {}
#
#             # Parse form_schema if present
#             if task['form_schema']:
#                 try:
#                     task['form_schema'] = json.loads(task['form_schema']) if isinstance(task['form_schema'], str) else task['form_schema']
#                 except (json.JSONDecodeError, TypeError):
#                     task['form_schema'] = None
#
#         # Get total count
#         count_query = f"""
#             SELECT COUNT(*) as count
#             FROM tasks t
#             JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
#             {where_clause}
#         """
#         total = Database.execute_one(count_query, params)
#
#         return jsonify({
#             'tasks': [dict(t) for t in tasks],
#             'pagination': {
#                 'page': page,
#                 'limit': limit,
#                 'total': total['count'],
#                 'pages': (total['count'] + limit - 1) // limit
#             }
#         }), 200
#
#     except Exception as e:
#         logger.error(f"Error getting tasks: {e}")
#         return jsonify({'error': 'Failed to retrieve tasks'}), 500

@tasks_bp.route('/<task_id>', methods=['GET'])
@require_auth
def get_task(task_id):
    """Get specific task details with complete form information"""
    try:
        if not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        tenant_id = g.current_user['tenant_id']

        task = Database.execute_one("""
            SELECT t.*, wi.title as workflow_title, wi.data as workflow_data,
                   w.name as workflow_name, w.definition as workflow_definition,
                   u1.first_name || ' ' || u1.last_name as assigned_to_name,
                   u2.first_name || ' ' || u2.last_name as assigned_by_name,
                   u3.first_name || ' ' || u3.last_name as completed_by_name,
                   fd.name as form_name, fd.description as form_description,
                   fd.schema as form_schema, fd.version as form_version
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            JOIN workflows w ON wi.workflow_id = w.id
            LEFT JOIN users u1 ON t.assigned_to = u1.id
            LEFT JOIN users u2 ON t.assigned_by = u2.id
            LEFT JOIN users u3 ON t.completed_by = u3.id
            LEFT JOIN form_definitions fd ON t.form_id = fd.id
            WHERE t.id = %s AND wi.tenant_id = %s
        """, (task_id, tenant_id))

        if not task:
            return jsonify({'error': 'Task not found'}), 404

        # Parse JSON fields
        task_dict = dict(task)

        # Parse form_data
        if task_dict.get('form_data'):
            try:
                task_dict['form_data'] = json.loads(task_dict['form_data']) if isinstance(task_dict['form_data'], str) else task_dict['form_data']
            except (json.JSONDecodeError, TypeError):
                task_dict['form_data'] = {}

        # Parse result
        if task_dict.get('result'):
            try:
                task_dict['result'] = json.loads(task_dict['result']) if isinstance(task_dict['result'], str) else task_dict['result']
            except (json.JSONDecodeError, TypeError):
                task_dict['result'] = {}

        # Parse workflow_data
        if task_dict.get('workflow_data'):
            try:
                task_dict['workflow_data'] = json.loads(task_dict['workflow_data']) if isinstance(task_dict['workflow_data'], str) else task_dict['workflow_data']
            except (json.JSONDecodeError, TypeError):
                task_dict['workflow_data'] = {}

        # Parse workflow_definition
        if task_dict.get('workflow_definition'):
            try:
                task_dict['workflow_definition'] = json.loads(task_dict['workflow_definition']) if isinstance(task_dict['workflow_definition'], str) else task_dict['workflow_definition']
            except (json.JSONDecodeError, TypeError):
                task_dict['workflow_definition'] = {}

        # Parse form_schema
        if task_dict.get('form_schema'):
            try:
                task_dict['form_schema'] = json.loads(task_dict['form_schema']) if isinstance(task_dict['form_schema'], str) else task_dict['form_schema']
            except (json.JSONDecodeError, TypeError):
                task_dict['form_schema'] = None

        # Get form responses if any
        form_responses = Database.execute_query("""
            SELECT fr.*, u.first_name || ' ' || u.last_name as submitted_by_name
            FROM form_responses fr
            LEFT JOIN users u ON fr.submitted_by = u.id
            WHERE fr.task_id = %s
            ORDER BY fr.submitted_at DESC
        """, (task_id,))

        # Parse form response data
        for response in form_responses:
            if response['data']:
                try:
                    response['data'] = json.loads(response['data']) if isinstance(response['data'], str) else response['data']
                except (json.JSONDecodeError, TypeError):
                    response['data'] = {}

        task_dict['form_responses'] = [dict(fr) for fr in form_responses]

        # Get task comments/notes if any
        task_comments = Database.execute_query("""
            SELECT tc.*, u.first_name || ' ' || u.last_name as author_name
            FROM task_comments tc
            LEFT JOIN users u ON tc.created_by = u.id
            WHERE tc.task_id = %s
            ORDER BY tc.created_at ASC
        """, (task_id,))

        task_dict['comments'] = [dict(tc) for tc in task_comments] if task_comments else []

        return jsonify({'task': task_dict}), 200

    except Exception as e:
        logger.error(f"Error getting task {task_id}: {e}")
        return jsonify({'error': 'Failed to retrieve task'}), 500

# @tasks_bp.route('/<task_id>/complete', methods=['POST'])
# @require_auth
# @audit_log('complete', 'task')
# def complete_task(task_id):
#     """Complete a task with form data validation"""
#     try:
#         if not validate_uuid(task_id):
#             return jsonify({'error': 'Invalid task ID'}), 400
#
#         data = sanitize_input(request.get_json())
#         user_id = g.current_user['user_id']
#         tenant_id = g.current_user['tenant_id']
#
#         # Check if task exists and user can complete it
#         task = Database.execute_one("""
#             SELECT t.id, t.status, t.assigned_to, t.form_id, wi.tenant_id,
#                    fd.schema as form_schema
#             FROM tasks t
#             JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
#             LEFT JOIN form_definitions fd ON t.form_id = fd.id
#             WHERE t.id = %s
#         """, (task_id,))
#
#         if not task:
#             return jsonify({'error': 'Task not found'}), 404
#
#         if task['tenant_id'] != tenant_id:
#             return jsonify({'error': 'Unauthorized'}), 403
#
#         if task['status'] != 'pending':
#             return jsonify({'error': 'Task is not in pending status'}), 400
#
#         # Check if user is assigned to task or has admin permissions
#         user_permissions = g.current_user.get('permissions', [])
#         if (task['assigned_to'] != user_id and
#                 'manage_tasks' not in user_permissions and
#                 '*' not in user_permissions):
#             return jsonify({'error': 'Not authorized to complete this task'}), 403
#
#         # Validate form data if task has a form
#         if task['form_id'] and task['form_schema']:
#             form_data = data.get('form_data', {})
#             if not form_data:
#                 return jsonify({'error': 'Form data is required for this task'}), 400
#
#             # Parse form schema
#             try:
#                 form_schema = json.loads(task['form_schema']) if isinstance(task['form_schema'], str) else task['form_schema']
#             except (json.JSONDecodeError, TypeError):
#                 form_schema = {}
#
#             # Basic form validation
#             validation_errors = validate_form_data(form_data, form_schema)
#             if validation_errors:
#                 return jsonify({
#                     'error': 'Form validation failed',
#                     'validation_errors': validation_errors
#                 }), 400
#
#             # Save form response
#             form_response_id = Database.execute_insert("""
#                 INSERT INTO form_responses
#                 (form_definition_id, task_id, workflow_instance_id, data, submitted_by)
#                 VALUES (%s, %s, %s, %s, %s)
#             """, (
#                 task['form_id'], task_id,
#                 task['workflow_instance_id'], json.dumps(form_data), user_id
#             ))
#
#         # Complete the task
#         result_data = data.get('result', {})
#
#         # If form data was provided, include it in the result
#         if 'form_data' in data:
#             result_data['form_data'] = data['form_data']
#
#         WorkflowEngine.complete_task(task_id, result_data, user_id)
#
#         # Resolve any SLA breaches
#         SLAMonitor.resolve_sla_breach(task_id)
#
#         return jsonify({'message': 'Task completed successfully'}), 200
#
#     except Exception as e:
#         logger.error(f"Error completing task {task_id}: {e}")
#         return jsonify({'error': str(e)}), 500
@tasks_bp.route('/<task_id>/complete', methods=['POST'])
@require_auth
@audit_log('complete', 'task')
def complete_task(task_id):
    """Complete a task with defensive programming and better error handling"""
    try:
        if not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        data = sanitize_input(request.get_json())
        user_id = g.current_user['user_id']
        tenant_id = g.current_user['tenant_id']

        # First, get basic task info
        task_basic = Database.execute_one("""
            SELECT id, status, assigned_to, form_id, workflow_instance_id
            FROM tasks 
            WHERE id = %s
        """, (task_id,))

        if not task_basic:
            return jsonify({'error': 'Task not found'}), 404

        # Check if workflow_instance_id exists
        if not task_basic.get('workflow_instance_id'):
            logger.error(f"Task {task_id} has no workflow_instance_id")
            return jsonify({'error': 'Task is not associated with a workflow instance'}), 400

        # Get workflow instance info
        workflow_instance = Database.execute_one("""
            SELECT id, tenant_id, workflow_id, status
            FROM workflow_instances 
            WHERE id = %s
        """, (task_basic['workflow_instance_id'],))

        if not workflow_instance:
            logger.error(f"Workflow instance {task_basic['workflow_instance_id']} not found for task {task_id}")
            return jsonify({'error': 'Associated workflow instance not found'}), 404

        # Security checks
        if workflow_instance['tenant_id'] != tenant_id:
            return jsonify({'error': 'Unauthorized'}), 403

        if task_basic['status'] != 'pending':
            return jsonify({'error': 'Task is not in pending status'}), 400

        # Check if user is assigned to task or has admin permissions
        user_permissions = g.current_user.get('permissions', [])
        if (task_basic['assigned_to'] != user_id and
                'manage_tasks' not in user_permissions and
                '*' not in user_permissions):
            return jsonify({'error': 'Not authorized to complete this task'}), 403

        # Handle form data if task has a form
        form_response_id = None
        if task_basic.get('form_id'):
            # Get form schema
            form_def = Database.execute_one("""
                SELECT schema FROM form_definitions 
                WHERE id = %s
            """, (task_basic['form_id'],))

            if form_def and 'form_data' in data:
                form_data = data['form_data']

                # Parse form schema safely
                try:
                    if isinstance(form_def['schema'], str):
                        form_schema = json.loads(form_def['schema'])
                    else:
                        form_schema = form_def['schema']

                    # Validate form data
                    validation_errors = validate_form_data(form_data, form_schema)
                    if validation_errors:
                        return jsonify({
                            'error': 'Form validation failed',
                            'validation_errors': validation_errors
                        }), 400

                except (json.JSONDecodeError, TypeError) as e:
                    logger.warning(f"Could not parse form schema for task {task_id}: {e}")

                # Save form response with defensive error handling
                try:
                    form_response_id = Database.execute_insert("""
                        INSERT INTO form_responses 
                        (form_definition_id, task_id, workflow_instance_id, data, submitted_by)
                        VALUES (%s, %s, %s, %s, %s)
                    """, (
                        task_basic['form_id'],
                        task_id,
                        task_basic['workflow_instance_id'],
                        json.dumps(form_data),
                        user_id
                    ))
                    logger.info(f"Created form response {form_response_id} for task {task_id}")

                except Exception as form_error:
                    logger.error(f"Error saving form response for task {task_id}: {form_error}")
                    return jsonify({
                        'error': 'Failed to save form response',
                        'details': str(form_error)
                    }), 500

        # Prepare result data
        result_data = data.get('result', {})
        if 'form_data' in data:
            result_data['form_data'] = data['form_data']

        # Update task status first (before workflow engine)
        try:
            Database.execute_query("""
                UPDATE tasks 
                SET status = %s, completed_by = %s, completed_at = NOW(), 
                    result = %s, updated_at = NOW()
                WHERE id = %s
            """, ('completed', user_id, json.dumps(result_data), task_id))

            logger.info(f"Task {task_id} marked as completed by user {user_id}")

        except Exception as update_error:
            logger.error(f"Error updating task status: {update_error}")
            return jsonify({'error': 'Failed to update task status'}), 500

        # Try to advance workflow
        try:
            WorkflowEngine.complete_task(task_id, result_data, user_id)
            logger.info(f"Workflow advanced successfully for task {task_id}")

        except Exception as workflow_error:
            logger.error(f"Error in workflow engine for task {task_id}: {workflow_error}")
            # Don't fail the request - task is already completed
            # Just log the error and continue
            pass

        # Try to resolve SLA breaches (non-critical)
        try:
            SLAMonitor.resolve_sla_breach(task_id)
        except Exception as sla_error:
            logger.warning(f"Error resolving SLA breach for task {task_id}: {sla_error}")

        # Build response
        response_data = {
            'message': 'Task completed successfully',
            'task_id': task_id,
            'status': 'completed',
            'completed_at': datetime.now().isoformat(),
            'workflow_instance_id': task_basic['workflow_instance_id']
        }

        if form_response_id:
            response_data['form_response_id'] = form_response_id

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Unexpected error completing task {task_id}: {e}", exc_info=True)
        return jsonify({
            'error': 'An unexpected error occurred',
            'message': str(e),
            'task_id': task_id
        }), 500




@tasks_bp.route('/<task_id>/assign', methods=['POST'])
@require_auth
@require_permissions(['manage_tasks'])
@audit_log('assign', 'task')
def assign_task(task_id):
    """Assign task to user"""
    try:
        if not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        data = sanitize_input(request.get_json())
        user_id = g.current_user['user_id']
        tenant_id = g.current_user['tenant_id']

        if not validate_required_fields(data, ['assigned_to']):
            return jsonify({'error': 'assigned_to field required'}), 400

        assigned_to = data['assigned_to']
        if not validate_uuid(assigned_to):
            return jsonify({'error': 'Invalid user ID'}), 400

        # Check if task exists
        task = Database.execute_one("""
            SELECT t.id, wi.tenant_id
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE t.id = %s
        """, (task_id,))

        if not task or task['tenant_id'] != tenant_id:
            return jsonify({'error': 'Task not found'}), 404

        # Check if assigned user exists and belongs to same tenant
        assignee = Database.execute_one("""
            SELECT id FROM users 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (assigned_to, tenant_id))

        if not assignee:
            return jsonify({'error': 'Invalid assignee'}), 400

        # Update task assignment
        Database.execute_query("""
            UPDATE tasks 
            SET assigned_to = %s, assigned_by = %s, updated_at = NOW()
            WHERE id = %s
        """, (assigned_to, user_id, task_id))

        # Send notification to assigned user
        from app.services.notification_service import NotificationService
        NotificationService.send_task_assignment(assigned_to, task_id)

        return jsonify({'message': 'Task assigned successfully'}), 200

    except Exception as e:
        logger.error(f"Error assigning task {task_id}: {e}")
        return jsonify({'error': 'Failed to assign task'}), 500

@tasks_bp.route('/<task_id>/form-response', methods=['POST'])
@require_auth
@audit_log('submit_form', 'task')
def submit_form_response(task_id):
    """Submit form response for task (separate from task completion)"""
    try:
        if not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        data = sanitize_input(request.get_json())
        user_id = g.current_user['user_id']
        tenant_id = g.current_user['tenant_id']

        if not validate_required_fields(data, ['form_data']):
            return jsonify({'error': 'form_data required'}), 400

        # Check if task exists and user can submit
        task = Database.execute_one("""
            SELECT t.id, t.assigned_to, t.workflow_instance_id, 
                   wi.tenant_id, t.form_id, fd.schema as form_schema
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            LEFT JOIN form_definitions fd ON t.form_id = fd.id
            WHERE t.id = %s
        """, (task_id,))

        if not task or task['tenant_id'] != tenant_id:
            return jsonify({'error': 'Task not found'}), 404

        if not task['form_id']:
            return jsonify({'error': 'Task does not have an associated form'}), 400

        # Validate form data
        form_data = data['form_data']
        if task['form_schema']:
            try:
                form_schema = json.loads(task['form_schema']) if isinstance(task['form_schema'], str) else task['form_schema']
                validation_errors = validate_form_data(form_data, form_schema)
                if validation_errors:
                    return jsonify({
                        'error': 'Form validation failed',
                        'validation_errors': validation_errors
                    }), 400
            except (json.JSONDecodeError, TypeError):
                pass  # Skip validation if schema parsing fails

        # Create form response
        response_id = Database.execute_insert("""
            INSERT INTO form_responses 
            (form_definition_id, task_id, workflow_instance_id, data, submitted_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            task['form_id'], task_id,
            task['workflow_instance_id'], json.dumps(form_data), user_id
        ))

        return jsonify({
            'message': 'Form response submitted successfully',
            'response_id': response_id
        }), 201

    except Exception as e:
        logger.error(f"Error submitting form response for task {task_id}: {e}")
        return jsonify({'error': 'Failed to submit form response'}), 500

@tasks_bp.route('/<task_id>/comments', methods=['POST'])
@require_auth
@audit_log('add_comment', 'task')
def add_task_comment(task_id):
    """Add comment to task"""
    try:
        if not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        data = sanitize_input(request.get_json())
        user_id = g.current_user['user_id']
        tenant_id = g.current_user['tenant_id']

        if not validate_required_fields(data, ['comment']):
            return jsonify({'error': 'comment field required'}), 400

        # Check if task exists
        task = Database.execute_one("""
            SELECT t.id, wi.tenant_id
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE t.id = %s
        """, (task_id,))

        if not task or task['tenant_id'] != tenant_id:
            return jsonify({'error': 'Task not found'}), 404

        # Add comment
        comment_id = Database.execute_insert("""
            INSERT INTO task_comments 
            (task_id, comment, is_internal, created_by)
            VALUES (%s, %s, %s, %s)
        """, (
            task_id, data['comment'],
            data.get('is_internal', False), user_id
        ))

        return jsonify({
            'message': 'Comment added successfully',
            'comment_id': comment_id
        }), 201

    except Exception as e:
        logger.error(f"Error adding comment to task {task_id}: {e}")
        return jsonify({'error': 'Failed to add comment'}), 500

@tasks_bp.route('/dashboard-stats', methods=['GET'])
@require_auth
def get_dashboard_stats():
    """Get task statistics for dashboard"""
    try:
        user_id = g.current_user['user_id']
        tenant_id = g.current_user['tenant_id']

        # Get task counts by status
        stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
                COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN t.due_date < NOW() AND t.status = 'pending' THEN 1 END) as overdue_tasks,
                COUNT(CASE WHEN t.form_id IS NOT NULL THEN 1 END) as tasks_with_forms
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE t.assigned_to = %s AND wi.tenant_id = %s
        """, (user_id, tenant_id))

        # Get recent tasks
        recent_tasks = Database.execute_query("""
            SELECT t.id, t.name, t.status, t.due_date, wi.title as workflow_title,
                   fd.name as form_name
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            LEFT JOIN form_definitions fd ON t.form_id = fd.id
            WHERE t.assigned_to = %s AND wi.tenant_id = %s
            ORDER BY t.created_at DESC
            LIMIT 5
        """, (user_id, tenant_id))

        return jsonify({
            'stats': dict(stats),
            'recent_tasks': [dict(t) for t in recent_tasks]
        }), 200

    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        return jsonify({'error': 'Failed to retrieve dashboard stats'}), 500

def validate_form_data(form_data, form_schema):
    """Validate form data against schema with better error handling"""
    errors = []

    try:
        if not form_schema or 'fields' not in form_schema:
            return errors

        for field in form_schema.get('fields', []):
            field_name = field.get('name')
            field_type = field.get('type')
            required = field.get('required', False)

            if required and (field_name not in form_data or not form_data.get(field_name)):
                errors.append(f"Field '{field_name}' is required")
                continue

            if field_name in form_data and form_data[field_name]:
                value = form_data[field_name]

                # Type-specific validation
                if field_type == 'email':
                    import re
                    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                    if not re.match(email_pattern, str(value)):
                        errors.append(f"Field '{field_name}' must be a valid email")

                elif field_type == 'number':
                    try:
                        float(value)
                    except (ValueError, TypeError):
                        errors.append(f"Field '{field_name}' must be a number")

                elif field_type in ['select', 'radio']:
                    options = field.get('options', [])
                    valid_values = [opt.get('value') for opt in options if opt.get('value')]
                    if valid_values and value not in valid_values:
                        errors.append(f"Field '{field_name}' has invalid value")

    except Exception as validation_error:
        logger.error(f"Error during form validation: {validation_error}")
        errors.append("Form validation encountered an error")

    return errors
# def validate_form_data(form_data, form_schema):
#     """Validate form data against schema"""
#     errors = []
#
#     if not form_schema or 'fields' not in form_schema:
#         return errors
#
#     for field in form_schema['fields']:
#         field_name = field.get('name')
#         field_type = field.get('type')
#         required = field.get('required', False)
#
#         if required and (field_name not in form_data or not form_data[field_name]):
#             errors.append(f"Field '{field_name}' is required")
#             continue
#
#         if field_name in form_data and form_data[field_name]:
#             value = form_data[field_name]
#
#             # Type-specific validation
#             if field_type == 'email':
#                 import re
#                 email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
#                 if not re.match(email_pattern, str(value)):
#                     errors.append(f"Field '{field_name}' must be a valid email")
#
#             elif field_type == 'number':
#                 try:
#                     float(value)
#                 except (ValueError, TypeError):
#                     errors.append(f"Field '{field_name}' must be a number")
#
#             elif field_type in ['select', 'radio']:
#                 options = field.get('options', [])
#                 valid_values = [opt.get('value') for opt in options]
#                 if value not in valid_values:
#                     errors.append(f"Field '{field_name}' has invalid value")

    # return errors