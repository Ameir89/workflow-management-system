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
from app.utils.json_utils import JSONUtils
from app.services.notification_service import NotificationService
from app.services.audit_logger import AuditLogger
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


@tasks_bp.route('/<task_id>/complete', methods=['POST'])
@require_auth
@audit_log('complete', 'task')
def complete_task(task_id):
    """Complete a task with better error handling and transaction management"""
    try:
        if not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        data = sanitize_input(request.get_json())
        user_id = g.current_user['user_id']
        tenant_id = g.current_user['tenant_id']

        logger.info(f"=== COMPLETING TASK {task_id} ===")
        logger.info(f"User: {user_id}, Data: {data}")

        # Get and validate task
        task_basic = Database.execute_one("""
            SELECT t.id, t.status, t.assigned_to, t.form_id, t.workflow_instance_id, t.step_id
            FROM tasks t 
            WHERE t.id = %s
        """, (task_id,))

        if not task_basic:
            return jsonify({'error': 'Task not found'}), 404

        logger.info(f"Task found: {dict(task_basic)}")

        # Validate workflow instance exists
        workflow_instance = Database.execute_one("""
            SELECT id, tenant_id, workflow_id, status
            FROM workflow_instances 
            WHERE id = %s
        """, (task_basic['workflow_instance_id'],))

        if not workflow_instance:
            logger.error(f"Workflow instance {task_basic['workflow_instance_id']} not found")
            return jsonify({'error': 'Associated workflow instance not found'}), 404

        # Security checks
        if workflow_instance['tenant_id'] != tenant_id:
            return jsonify({'error': 'Unauthorized'}), 403

        if task_basic['status'] != 'pending':
            return jsonify({'error': f'Task is not in pending status: {task_basic["status"]}'}), 400

        # Check permissions
        user_permissions = g.current_user.get('permissions', [])
        if (task_basic['assigned_to'] != user_id and
                'manage_tasks' not in user_permissions and
                '*' not in user_permissions):
            return jsonify({'error': 'Not authorized to complete this task'}), 403

        # Handle form data if present
        form_response_id = None
        if task_basic.get('form_id') and 'form_data' in data:
            try:
                form_response_id = Database.execute_insert("""
                    INSERT INTO form_responses 
                    (form_definition_id, task_id, workflow_instance_id, data, submitted_by)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    task_basic['form_id'],
                    task_id,
                    task_basic['workflow_instance_id'],
                    JSONUtils.safe_json_dumps(data['form_data']),
                    user_id
                ))
                logger.info(f"Created form response {form_response_id}")
            except Exception as form_error:
                logger.error(f"Error saving form response: {form_error}")
                return jsonify({'error': 'Failed to save form response'}), 500

        # Prepare result data
        result_data = data.get('result', {})
        if 'form_data' in data:
            result_data['form_data'] = data['form_data']

        # Update task status FIRST (critical step)
        try:
            Database.execute_query("""
                UPDATE tasks 
                SET status = %s, completed_by = %s, completed_at = NOW(), 
                    result = %s, updated_at = NOW()
                WHERE id = %s
            """, ('completed', user_id, JSONUtils.safe_json_dumps(result_data), task_id))

            logger.info(f"✓ Task {task_id} marked as completed")

        except Exception as update_error:
            logger.error(f"Failed to update task status: {update_error}")
            return jsonify({'error': 'Failed to update task status'}), 500

        # Try to advance workflow (non-critical - don't fail if this breaks)
        try:
            logger.info(f"Attempting to advance workflow...")
            WorkflowEngine.complete_task(task_id, result_data, user_id)
            logger.info(f"✓ Workflow advanced successfully")

        except Exception as workflow_error:
            # Log error but don't fail the request since task is completed
            logger.error(f"Workflow advancement failed: {workflow_error}", exc_info=True)
            # You might want to queue this for retry later

        # Build successful response
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
        logger.error(f"Task completion failed: {e}", exc_info=True)
        return jsonify({
            'error': 'Task completion failed',
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
            task['workflow_instance_id'], JSONUtils.safe_json_dumps(form_data), user_id
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


# Add this endpoint to app/blueprints/tasks.py

@tasks_bp.route('/<task_id>/approval', methods=['POST'])
@require_auth
@audit_log('submit_approval_decision', 'task')
def submit_approval_decision(task_id):
    """Submit approval decision (approve, reject, or return for edit)"""
    try:
        if not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        data = sanitize_input(request.get_json())
        user_id = g.current_user['user_id']
        tenant_id = g.current_user['tenant_id']

        # Validate required fields
        required_fields = ['decision']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        decision = data['decision'].lower()
        valid_decisions = ['approve', 'reject', 'return_for_edit']
        
        if decision not in valid_decisions:
            return jsonify({
                'error': f'Invalid decision. Must be one of: {valid_decisions}'
            }), 400

        # Get task details with security checks
        task = Database.execute_one("""
            SELECT t.id, t.name, t.type, t.status, t.assigned_to, t.workflow_instance_id,
                   t.step_id, t.form_id, wi.tenant_id, wi.title as workflow_title,
                   w.name as workflow_name, fd.name as form_name
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            JOIN workflows w ON wi.workflow_id = w.id
            LEFT JOIN form_definitions fd ON t.form_id = fd.id
            WHERE t.id = %s
        """, (task_id,))

        if not task:
            return jsonify({'error': 'Task not found'}), 404

        if task['tenant_id'] != tenant_id:
            return jsonify({'error': 'Unauthorized'}), 403

        if task['status'] != 'pending':
            return jsonify({'error': f'Task is not in pending status: {task["status"]}'}), 400

        # Check if user has permission to make approval decisions
        user_permissions = g.current_user.get('permissions', [])
        if (task['assigned_to'] != user_id and 
            'manage_tasks' not in user_permissions and 
            '*' not in user_permissions):
            return jsonify({'error': 'Not authorized to make approval decisions for this task'}), 403

        # Prepare approval data
        approval_data = {
            'decision': decision,
            'comments': data.get('comments', ''),
            'reason': data.get('reason', ''),
            'approved_by': user_id,
            'approved_at': datetime.now().isoformat(),
            'form_data': data.get('form_data', {})
        }

        # Handle form data if provided
        form_response_id = None
        if task['form_id'] and approval_data['form_data']:
            try:
                form_response_id = Database.execute_insert("""
                    INSERT INTO form_responses 
                    (form_definition_id, task_id, workflow_instance_id, data, submitted_by)
                    VALUES (%s, %s, %s, %s, %s)
                """, (
                    task['form_id'],
                    task_id,
                    task['workflow_instance_id'],
                    JSONUtils.safe_json_dumps(approval_data['form_data']),
                    user_id
                ))
                logger.info(f"Created form response {form_response_id} for approval task {task_id}")
            except Exception as form_error:
                logger.error(f"Error saving approval form response: {form_error}")
                return jsonify({'error': 'Failed to save form response'}), 500

        # Handle different approval decisions
        if decision == 'approve':
            # Approve the task and continue workflow
            result_data = {
                'approval_status': 'approved',
                'approval_decision': decision,
                'approved_by': user_id,
                'comments': approval_data['comments'],
                'form_data': approval_data['form_data']
            }

            # Update task status
            Database.execute_query("""
                UPDATE tasks 
                SET status = %s, completed_by = %s, completed_at = NOW(), 
                    result = %s, updated_at = NOW()
                WHERE id = %s
            """, ('completed', user_id, JSONUtils.safe_json_dumps(result_data), task_id))

            # Advance workflow
            try:
                WorkflowEngine.complete_task(task_id, result_data, user_id)
                logger.info(f"✓ Task {task_id} approved and workflow advanced")
            except Exception as workflow_error:
                logger.error(f"Workflow advancement failed after approval: {workflow_error}")

            # Send approval notification
            NotificationService.send_notification(
                task.get('assigned_to') or user_id,
                'task_approved',
                {
                    'task_id': str(task_id),
                    'task_name': task['name'],
                    'workflow_title': task['workflow_title'],
                    'approved_by_name': g.current_user.get('username', 'Unknown'),
                    'comments': approval_data['comments']
                }
            )

            message = 'Task approved successfully'

        elif decision == 'reject':
            # Reject the task and handle rejection workflow
            result_data = {
                'approval_status': 'rejected',
                'approval_decision': decision,
                'rejected_by': user_id,
                'rejection_reason': approval_data.get('reason', approval_data.get('comments', '')),
                'form_data': approval_data['form_data']
            }

            # Update task status
            Database.execute_query("""
                UPDATE tasks 
                SET status = %s, completed_by = %s, completed_at = NOW(), 
                    result = %s, updated_at = NOW()
                WHERE id = %s
            """, ('completed', user_id, JSONUtils.safe_json_dumps(result_data), task_id))

            # Handle rejection - could terminate workflow or route to rejection handler
            try:
                # Check if workflow has rejection handling
                workflow_instance = Database.execute_one("""
                    SELECT wi.*, w.definition
                    FROM workflow_instances wi
                    JOIN workflows w ON wi.workflow_id = w.id
                    WHERE wi.id = %s
                """, (task['workflow_instance_id'],))

                definition = JSONUtils.safe_parse_json(workflow_instance['definition'])
                
                # Look for rejection transition
                rejection_handled = False
                transitions = definition.get('transitions', [])
                
                for transition in transitions:
                    if (transition['from'] == task['step_id'] and 
                        transition.get('condition', {}).get('field') == 'approval_status' and
                        transition.get('condition', {}).get('value') == 'rejected'):
                        
                        # Found rejection transition - continue workflow
                        WorkflowEngine.complete_task(task_id, result_data, user_id)
                        rejection_handled = True
                        break

                if not rejection_handled:
                    # No rejection handling - mark workflow as failed/rejected
                    Database.execute_query("""
                        UPDATE workflow_instances 
                        SET status = %s, completed_at = NOW(), updated_at = NOW()
                        WHERE id = %s
                    """, ('rejected', task['workflow_instance_id']))

                logger.info(f"✓ Task {task_id} rejected")
            except Exception as workflow_error:
                logger.error(f"Error handling rejection: {workflow_error}")

            # Send rejection notification to workflow initiator
            if workflow_instance.get('initiated_by'):
                NotificationService.send_notification(
                    workflow_instance['initiated_by'],
                    'task_rejected',
                    {
                        'task_id': str(task_id),
                        'task_name': task['name'],
                        'workflow_title': task['workflow_title'],
                        'rejected_by_name': g.current_user.get('username', 'Unknown'),
                        'rejection_reason': result_data['rejection_reason']
                    }
                )

            message = 'Task rejected successfully'

        elif decision == 'return_for_edit':
            # Return task for editing - create new task or reset current task
            result_data = {
                'approval_status': 'returned_for_edit',
                'approval_decision': decision,
                'returned_by': user_id,
                'return_reason': approval_data.get('reason', approval_data.get('comments', '')),
                'form_data': approval_data['form_data']
            }

            # Mark current task as completed
            Database.execute_query("""
                UPDATE tasks 
                SET status = %s, completed_by = %s, completed_at = NOW(), 
                    result = %s, updated_at = NOW()
                WHERE id = %s
            """, ('completed', user_id, JSONUtils.safe_json_dumps(result_data), task_id))

            # Get workflow instance details for creating return task
            workflow_instance = Database.execute_one("""
                SELECT initiated_by, data FROM workflow_instances 
                WHERE id = %s
            """, (task['workflow_instance_id'],))

            # Create new task for the original submitter to edit
            return_task_id = Database.execute_insert("""
                INSERT INTO tasks 
                (workflow_instance_id, step_id, name, description, type, 
                 assigned_to, due_date, form_id, priority, metadata)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                task['workflow_instance_id'],
                f"{task['step_id']}_return",
                f"Edit and Resubmit: {task['name']}",
                f"Please address the feedback and resubmit. Reason: {result_data['return_reason']}",
                'task',
                workflow_instance['initiated_by'],
                datetime.now() + timedelta(hours=48),  # 48 hours to make edits
                task['form_id'],
                'high',
                JSONUtils.safe_json_dumps({
                    'is_return_task': True,
                    'original_task_id': task_id,
                    'return_reason': result_data['return_reason']
                })
            ))

            # Send return notification
            NotificationService.send_notification(
                workflow_instance['initiated_by'],
                'task_returned_for_edit',
                {
                    'task_id': str(return_task_id),
                    'original_task_id': str(task_id),
                    'task_name': task['name'],
                    'workflow_title': task['workflow_title'],
                    'returned_by_name': g.current_user.get('username', 'Unknown'),
                    'return_reason': result_data['return_reason']
                }
            )

            message = 'Task returned for editing successfully'

        # Record approval decision in audit log
        AuditLogger.log_action(
            user_id=user_id,
            action=f'approval_{decision}',
            resource_type='task',
            resource_id=task_id,
            old_values={'status': 'pending'},
            new_values=approval_data
        )

        # Build response
        response_data = {
            'message': message,
            'task_id': task_id,
            'decision': decision,
            'approved_by': user_id,
            'timestamp': datetime.now().isoformat(),
            'workflow_instance_id': task['workflow_instance_id']
        }

        if form_response_id:
            response_data['form_response_id'] = form_response_id

        if decision == 'return_for_edit':
            response_data['return_task_id'] = return_task_id

        return jsonify(response_data), 200

    except Exception as e:
        logger.error(f"Approval decision failed for task {task_id}: {e}", exc_info=True)
        return jsonify({
            'error': 'Failed to process approval decision',
            'message': str(e),
            'task_id': task_id
        }), 500


@tasks_bp.route('/<task_id>/approval-history', methods=['GET'])
@require_auth
def get_approval_history(task_id):
    """Get approval history for a task"""
    try:
        if not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Verify task exists and user has access
        task = Database.execute_one("""
            SELECT t.id, wi.tenant_id
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE t.id = %s
        """, (task_id,))

        if not task:
            return jsonify({'error': 'Task not found'}), 404

        if task['tenant_id'] != tenant_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Get approval history from audit logs
        approval_history = Database.execute_query("""
            SELECT al.action, al.new_values, al.created_at,
                   u.first_name || ' ' || u.last_name as user_name,
                   u.username
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.resource_type = 'task' 
            AND al.resource_id = %s
            AND al.action LIKE 'approval_%'
            ORDER BY al.created_at DESC
        """, (task_id,))

        # Parse the approval decisions
        history = []
        for record in approval_history:
            try:
                new_values = JSONUtils.safe_parse_json(record['new_values'])
                history.append({
                    'action': record['action'],
                    'decision': new_values.get('decision'),
                    'comments': new_values.get('comments'),
                    'reason': new_values.get('reason'),
                    'user_name': record['user_name'],
                    'username': record['username'],
                    'timestamp': record['created_at'].isoformat() if record['created_at'] else None
                })
            except Exception as parse_error:
                logger.warning(f"Could not parse approval history record: {parse_error}")

        return jsonify({
            'task_id': task_id,
            'approval_history': history
        }), 200

    except Exception as e:
        logger.error(f"Error getting approval history for task {task_id}: {e}")
        return jsonify({'error': 'Failed to retrieve approval history'}), 500


@tasks_bp.route('/<task_id>/approval-status', methods=['GET'])
@require_auth
def get_approval_status(task_id):
    """Get current approval status and available actions for a task"""
    try:
        if not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        user_id = g.current_user['user_id']
        tenant_id = g.current_user['tenant_id']

        # Get task details
        task = Database.execute_one("""
            SELECT t.id, t.name, t.type, t.status, t.assigned_to, t.workflow_instance_id,
                   t.step_id, t.form_id, t.due_date, t.created_at,
                   wi.tenant_id, wi.title as workflow_title, wi.initiated_by,
                   w.name as workflow_name, fd.name as form_name,
                   u1.first_name || ' ' || u1.last_name as assigned_to_name,
                   u2.first_name || ' ' || u2.last_name as initiated_by_name
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            JOIN workflows w ON wi.workflow_id = w.id
            LEFT JOIN form_definitions fd ON t.form_id = fd.id
            LEFT JOIN users u1 ON t.assigned_to = u1.id
            LEFT JOIN users u2 ON wi.initiated_by = u2.id
            WHERE t.id = %s
        """, (task_id,))

        if not task:
            return jsonify({'error': 'Task not found'}), 404

        if task['tenant_id'] != tenant_id:
            return jsonify({'error': 'Unauthorized'}), 403

        # Determine available actions
        available_actions = []
        user_permissions = g.current_user.get('permissions', [])
        
        can_approve = (
            task['assigned_to'] == user_id or 
            'manage_tasks' in user_permissions or 
            '*' in user_permissions
        )

        if task['status'] == 'pending' and can_approve:
            available_actions = ['approve', 'reject', 'return_for_edit']

        # Get latest approval decision if any
        latest_decision = Database.execute_one("""
            SELECT al.action, al.new_values, al.created_at,
                   u.first_name || ' ' || u.last_name as user_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.resource_type = 'task' 
            AND al.resource_id = %s
            AND al.action LIKE 'approval_%'
            ORDER BY al.created_at DESC
            LIMIT 1
        """, (task_id,))

        latest_approval = None
        if latest_decision:
            try:
                new_values = JSONUtils.safe_parse_json(latest_decision['new_values'])
                latest_approval = {
                    'decision': new_values.get('decision'),
                    'comments': new_values.get('comments'),
                    'user_name': latest_decision['user_name'],
                    'timestamp': latest_decision['created_at'].isoformat() if latest_decision['created_at'] else None
                }
            except Exception:
                pass

        return jsonify({
            'task': dict(task),
            'available_actions': available_actions,
            'can_approve': can_approve,
            'latest_approval': latest_approval,
            'requires_form': task['form_id'] is not None
        }), 200

    except Exception as e:
        logger.error(f"Error getting approval status for task {task_id}: {e}")
        return jsonify({'error': 'Failed to retrieve approval status'}), 500