### app/blueprints/workflows.py

"""
Workflows blueprint - handles workflow management
"""
from flask import Blueprint, request, jsonify, g
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid
from app.utils.validators import validate_required_fields
from app.services.workflow_engine import WorkflowEngine
import json
import logging

logger = logging.getLogger(__name__)

workflows_bp = Blueprint('workflows', __name__)

@workflows_bp.route('', methods=['GET'])
@require_auth
def get_workflows():
    """Get all workflows for the current tenant"""
    try:
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        
        # Get workflows with pagination
        workflows = Database.execute_query("""
            SELECT w.id, w.name, w.description, w.version, w.is_active,
                   w.category, w.tags, w.created_at, w.updated_at,
                   u.first_name || ' ' || u.last_name as created_by_name,
                   COUNT(wi.id) as instance_count
            FROM workflows w
            LEFT JOIN users u ON w.created_by = u.id
            LEFT JOIN workflow_instances wi ON w.id = wi.workflow_id
            WHERE w.tenant_id = %s AND w.is_template = false
            GROUP BY w.id, u.first_name, u.last_name
            ORDER BY w.updated_at DESC
            LIMIT %s OFFSET %s
        """, (tenant_id, limit, offset))
        
        # Get total count
        total = Database.execute_one("""
            SELECT COUNT(*) as count 
            FROM workflows 
            WHERE tenant_id = %s AND is_template = false
        """, (tenant_id,))
        
        return jsonify({
            'workflows': [dict(w) for w in workflows],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting workflows: {e}")
        return jsonify({'error': 'Failed to retrieve workflows'}), 500

@workflows_bp.route('/<workflow_id>', methods=['GET'])
@require_auth
def get_workflow(workflow_id):
    """Get specific workflow"""
    try:
        if not validate_uuid(workflow_id):
            return jsonify({'error': 'Invalid workflow ID'}), 400
        
        tenant_id = g.current_user['tenant_id']
        
        workflow = Database.execute_one("""
            SELECT w.*, u.first_name || ' ' || u.last_name as created_by_name
            FROM workflows w
            LEFT JOIN users u ON w.created_by = u.id
            WHERE w.id = %s AND w.tenant_id = %s
        """, (workflow_id, tenant_id))
        
        if not workflow:
            return jsonify({'error': 'Workflow not found'}), 404
        
        # Parse definition JSON
        workflow_dict = dict(workflow)
        # if workflow_dict['definition']:
        #     workflow_dict['definition'] = json.loads(workflow_dict['definition'])
        if workflow_dict['definition'] and isinstance(workflow_dict['definition'], str):
            workflow_dict['definition'] = json.loads(workflow_dict['definition'])
        
        return jsonify({'workflow': workflow_dict}), 200
        
    except Exception as e:
        logger.error(f"Error getting workflow {workflow_id}: {e}")
        return jsonify({'error': 'Failed to retrieve workflow'}), 500

@workflows_bp.route('', methods=['POST'])
@require_auth
@require_permissions(['create_workflows'])
@audit_log('create', 'workflow')
def create_workflow():
    """Create new workflow"""
    try:
        data = sanitize_input(request.get_json())
        
        required_fields = ['name', 'definition']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']
        
        # Validate definition structure
        definition = data['definition']
        if not isinstance(definition, dict) or 'steps' not in definition:
            return jsonify({'error': 'Invalid workflow definition'}), 400
        
        workflow_id = Database.execute_insert("""
            INSERT INTO workflows 
            (tenant_id, name, description, definition, category, tags, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, data['name'], data.get('description', ''),
            json.dumps(definition), data.get('category', ''),
            data.get('tags', []), user_id
        ))
        
        return jsonify({
            'message': 'Workflow created successfully',
            'workflow_id': workflow_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating workflow: {e}")
        return jsonify({'error': 'Failed to create workflow'}), 500

@workflows_bp.route('/<workflow_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_workflows'])
@audit_log('update', 'workflow')
def update_workflow(workflow_id):
    """Update workflow"""
    try:
        if not validate_uuid(workflow_id):
            return jsonify({'error': 'Invalid workflow ID'}), 400
        
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        
        # Check if workflow exists and belongs to tenant
        existing = Database.execute_one("""
            SELECT id FROM workflows 
            WHERE id = %s AND tenant_id = %s
        """, (workflow_id, tenant_id))
        
        if not existing:
            return jsonify({'error': 'Workflow not found'}), 404
        
        # Update workflow
        update_fields = []
        params = []
        
        if 'name' in data:
            update_fields.append('name = %s')
            params.append(data['name'])
        
        if 'description' in data:
            update_fields.append('description = %s')
            params.append(data['description'])
        
        if 'definition' in data:
            update_fields.append('definition = %s')
            params.append(json.dumps(data['definition']))
        
        if 'category' in data:
            update_fields.append('category = %s')
            params.append(data['category'])
        
        if 'tags' in data:
            update_fields.append('tags = %s')
            params.append(data['tags'])
        
        if 'is_active' in data:
            update_fields.append('is_active = %s')
            params.append(data['is_active'])
        
        if update_fields:
            update_fields.append('updated_at = NOW()')
            params.append(workflow_id)
            
            query = f"""
                UPDATE workflows 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            Database.execute_query(query, params)
        
        return jsonify({'message': 'Workflow updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating workflow {workflow_id}: {e}")
        return jsonify({'error': 'Failed to update workflow'}), 500

@workflows_bp.route('/<workflow_id>/execute', methods=['POST'])
@require_auth
@require_permissions(['execute_workflows'])
@audit_log('execute', 'workflow')
def execute_workflow(workflow_id):
    """Execute workflow instance"""
    try:
        if not validate_uuid(workflow_id):
            return jsonify({'error': 'Invalid workflow ID'}), 400
        
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']
        
        # Check if workflow exists and is active
        workflow = Database.execute_one("""
            SELECT id, name, is_active 
            FROM workflows 
            WHERE id = %s AND tenant_id = %s
        """, (workflow_id, tenant_id))
        
        if not workflow:
            return jsonify({'error': 'Workflow not found'}), 404
        
        if not workflow['is_active']:
            return jsonify({'error': 'Workflow is not active'}), 400
        
        # Execute workflow
        instance_id = WorkflowEngine.execute_workflow(
            workflow_id=workflow_id,
            data=data.get('data', {}),
            initiated_by=user_id,
            tenant_id=tenant_id
        )
        
        return jsonify({
            'message': 'Workflow executed successfully',
            'instance_id': instance_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error executing workflow {workflow_id}: {e}")
        return jsonify({'error': str(e)}), 500

@workflows_bp.route('/<workflow_id>/instances', methods=['GET'])
@require_auth
def get_workflow_instances(workflow_id):
    """Get workflow instances"""
    try:
        if not validate_uuid(workflow_id):
            return jsonify({'error': 'Invalid workflow ID'}), 400
        
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        status_filter = request.args.get('status')
        
        # Build query
        where_clause = "WHERE wi.workflow_id = %s AND wi.tenant_id = %s"
        params = [workflow_id, tenant_id]
        
        if status_filter:
            where_clause += " AND wi.status = %s"
            params.append(status_filter)
        
        instances = Database.execute_query(f"""
            SELECT wi.id, wi.title, wi.status, wi.priority, wi.current_step,
                   wi.created_at, wi.updated_at, wi.completed_at, wi.due_date,
                   u1.first_name || ' ' || u1.last_name as initiated_by_name,
                   u2.first_name || ' ' || u2.last_name as assigned_to_name,
                   COUNT(t.id) as total_tasks,
                   COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks
            FROM workflow_instances wi
            LEFT JOIN users u1 ON wi.initiated_by = u1.id
            LEFT JOIN users u2 ON wi.assigned_to = u2.id
            LEFT JOIN tasks t ON wi.id = t.workflow_instance_id
            {where_clause}
            GROUP BY wi.id, u1.first_name, u1.last_name, u2.first_name, u2.last_name
            ORDER BY wi.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        
        return jsonify({
            'instances': [dict(i) for i in instances]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting workflow instances: {e}")
        return jsonify({'error': 'Failed to retrieve workflow instances'}), 500

@workflows_bp.route('/instances/<instance_id>', methods=['GET'])
@require_auth
def get_workflow_instance(instance_id):
    """Get specific workflow instance with tasks"""
    try:
        if not validate_uuid(instance_id):
            return jsonify({'error': 'Invalid instance ID'}), 400
        
        tenant_id = g.current_user['tenant_id']
        
        # Get instance details
        instance = Database.execute_one("""
            SELECT wi.*, w.name as workflow_name, w.definition,
                   u1.first_name || ' ' || u1.last_name as initiated_by_name,
                   u2.first_name || ' ' || u2.last_name as assigned_to_name
            FROM workflow_instances wi
            JOIN workflows w ON wi.workflow_id = w.id
            LEFT JOIN users u1 ON wi.initiated_by = u1.id
            LEFT JOIN users u2 ON wi.assigned_to = u2.id
            WHERE wi.id = %s AND wi.tenant_id = %s
        """, (instance_id, tenant_id))
        
        if not instance:
            return jsonify({'error': 'Workflow instance not found'}), 404
        
        # Get tasks
        tasks = Database.execute_query("""
            SELECT t.*, u.first_name || ' ' || u.last_name as assigned_to_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE t.workflow_instance_id = %s
            ORDER BY t.created_at
        """, (instance_id,))

        instance_dict = dict(instance)
        if instance_dict.get('data') and isinstance(instance_dict['data'], str):
            instance_dict['data'] = json.loads(instance_dict['data'])

        if instance_dict.get('definition') and isinstance(instance_dict['definition'], str):
            instance_dict['definition'] = json.loads(instance_dict['definition'])
        
        return jsonify({
            'instance': instance_dict,
            'tasks': [dict(t) for t in tasks]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting workflow instance {instance_id}: {e}")
        return jsonify({'error': 'Failed to retrieve workflow instance'}), 500

@workflows_bp.route('/<workflow_id>', methods=['DELETE'])
@require_auth
@require_permissions(['manage_workflows'])
@audit_log('delete', 'workflow')
def delete_workflow(workflow_id):
    """Delete workflow (soft delete by marking inactive)"""
    try:
        if not validate_uuid(workflow_id):
            return jsonify({'error': 'Invalid workflow ID'}), 400
        
        tenant_id = g.current_user['tenant_id']
        
        # Check if workflow has active instances
        active_instances = Database.execute_one("""
            SELECT COUNT(*) as count 
            FROM workflow_instances 
            WHERE workflow_id = %s AND status IN ('pending', 'in_progress')
        """, (workflow_id,))
        
        if active_instances['count'] > 0:
            return jsonify({
                'error': 'Cannot delete workflow with active instances'
            }), 400
        
        # Soft delete by marking inactive
        result = Database.execute_query("""
            UPDATE workflows 
            SET is_active = false, updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
        """, (workflow_id, tenant_id))
        
        return jsonify({'message': 'Workflow deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error deleting workflow {workflow_id}: {e}")
        return jsonify({'error': 'Failed to delete workflow'}), 500

# Add these endpoints to your workflows blueprint for better workflow management

@workflows_bp.route('/instances/<instance_id>/advance', methods=['POST'])
@require_auth
@require_permissions(['manage_workflows'])
@audit_log('advance', 'workflow_instance')
def advance_workflow(instance_id):
    """Manually advance workflow to next step"""
    try:
        if not validate_uuid(instance_id):
            return jsonify({'error': 'Invalid instance ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Get workflow instance
        instance = Database.execute_one("""
            SELECT wi.*, w.definition
            FROM workflow_instances wi
            JOIN workflows w ON wi.workflow_id = w.id
            WHERE wi.id = %s AND wi.tenant_id = %s
        """, (instance_id, tenant_id))

        if not instance:
            return jsonify({'error': 'Workflow instance not found'}), 404

        target_step = data.get('target_step')
        force_advance = data.get('force_advance', False)
        reason = data.get('reason', 'Manual advancement')

        # Parse workflow definition
        definition = json.loads(instance['definition']) if isinstance(instance['definition'], str) else instance['definition']

        # Find target step
        target_step_def = None
        for step in definition.get('steps', []):
            if step['id'] == target_step:
                target_step_def = step
                break

        if not target_step_def:
            return jsonify({'error': f'Target step {target_step} not found'}), 400

        # Create context for step execution
        context = {
            'initiator': instance['initiated_by'],
            'tenant_id': tenant_id,
            'workflow_data': json.loads(instance['data']) if instance['data'] else {},
            'manual_advance': True,
            'advanced_by': user_id,
            'advance_reason': reason
        }

        # Execute target step
        WorkflowEngine._execute_step(instance_id, target_step_def, definition, context)

        # Update instance current step
        Database.execute_query("""
            UPDATE workflow_instances 
            SET current_step = %s, updated_at = NOW()
            WHERE id = %s
        """, (target_step, instance_id))

        return jsonify({
            'message': 'Workflow advanced successfully',
            'instance_id': instance_id,
            'current_step': target_step,
            'advanced_by': user_id,
            'reason': reason
        }), 200

    except Exception as e:
        logger.error(f"Error advancing workflow {instance_id}: {e}")
        return jsonify({'error': 'Failed to advance workflow'}), 500

@workflows_bp.route('/instances/<instance_id>/retry-step', methods=['POST'])
@require_auth
@require_permissions(['manage_workflows'])
@audit_log('retry_step', 'workflow_instance')
def retry_workflow_step(instance_id):
    """Retry a failed workflow step"""
    try:
        if not validate_uuid(instance_id):
            return jsonify({'error': 'Invalid instance ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        step_id = data.get('step_id')
        retry_reason = data.get('retry_reason', 'Manual retry')

        if not step_id:
            return jsonify({'error': 'step_id is required'}), 400

        # Get workflow instance and definition
        instance = Database.execute_one("""
            SELECT wi.*, w.definition
            FROM workflow_instances wi
            JOIN workflows w ON wi.workflow_id = w.id
            WHERE wi.id = %s AND wi.tenant_id = %s
        """, (instance_id, tenant_id))

        if not instance:
            return jsonify({'error': 'Workflow instance not found'}), 404

        # Parse workflow definition
        definition = json.loads(instance['definition']) if isinstance(instance['definition'], str) else instance['definition']

        # Find step to retry
        step_def = None
        for step in definition.get('steps', []):
            if step['id'] == step_id:
                step_def = step
                break

        if not step_def:
            return jsonify({'error': f'Step {step_id} not found'}), 400

        # Create context for retry
        context = {
            'initiator': instance['initiated_by'],
            'tenant_id': tenant_id,
            'workflow_data': json.loads(instance['data']) if instance['data'] else {},
            'retry_attempt': True,
            'retried_by': user_id,
            'retry_reason': retry_reason
        }

        # Retry the step
        WorkflowEngine._execute_step(instance_id, step_def, definition, context)

        return jsonify({
            'message': 'Step retried successfully',
            'instance_id': instance_id,
            'step_id': step_id,
            'retried_by': user_id,
            'reason': retry_reason
        }), 200

    except Exception as e:
        logger.error(f"Error retrying step {step_id} for workflow {instance_id}: {e}")
        return jsonify({'error': 'Failed to retry step'}), 500

@workflows_bp.route('/instances/<instance_id>/timeline', methods=['GET'])
@require_auth
def get_workflow_timeline(instance_id):
    """Get workflow execution timeline"""
    try:
        if not validate_uuid(instance_id):
            return jsonify({'error': 'Invalid instance ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Get workflow instance
        instance = Database.execute_one("""
            SELECT * FROM workflow_instances 
            WHERE id = %s AND tenant_id = %s
        """, (instance_id, tenant_id))

        if not instance:
            return jsonify({'error': 'Workflow instance not found'}), 404

        # Get task history
        tasks = Database.execute_query("""
            SELECT t.*, u1.first_name || ' ' || u1.last_name as assigned_to_name,
                   u2.first_name || ' ' || u2.last_name as completed_by_name
            FROM tasks t
            LEFT JOIN users u1 ON t.assigned_to = u1.id
            LEFT JOIN users u2 ON t.completed_by = u2.id
            WHERE t.workflow_instance_id = %s
            ORDER BY t.created_at
        """, (instance_id,))

        # Get step executions if table exists
        try:
            step_executions = Database.execute_query("""
                SELECT * FROM workflow_step_executions
                WHERE workflow_instance_id = %s
                ORDER BY executed_at
            """, (instance_id,))
        except:
            step_executions = []

        # Build timeline
        timeline = []

        # Add workflow start
        timeline.append({
            'event': 'workflow_started',
            'timestamp': instance['created_at'],
            'step_id': None,
            'description': f"Workflow '{instance['title']}' started",
            'user': instance.get('initiated_by_name', 'System')
        })

        # Add task events
        for task in tasks:
            timeline.append({
                'event': 'task_created',
                'timestamp': task['created_at'],
                'step_id': task['step_id'],
                'task_id': task['id'],
                'description': f"Task '{task['name']}' created",
                'assigned_to': task.get('assigned_to_name'),
                'status': task['status']
            })

            if task['completed_at']:
                timeline.append({
                    'event': 'task_completed',
                    'timestamp': task['completed_at'],
                    'step_id': task['step_id'],
                    'task_id': task['id'],
                    'description': f"Task '{task['name']}' completed",
                    'completed_by': task.get('completed_by_name'),
                    'status': task['status']
                })

        # Add step executions
        for execution in step_executions:
            timeline.append({
                'event': 'step_executed',
                'timestamp': execution['executed_at'],
                'step_id': execution['step_id'],
                'description': f"Step '{execution['step_id']}' executed",
                'success': execution['success'],
                'data': json.loads(execution['data']) if execution.get('data') else {}
            })

        # Add workflow completion if completed
        if instance['completed_at']:
            timeline.append({
                'event': 'workflow_completed',
                'timestamp': instance['completed_at'],
                'step_id': None,
                'description': f"Workflow '{instance['title']}' completed",
                'status': instance['status']
            })

        # Sort timeline by timestamp
        timeline.sort(key=lambda x: x['timestamp'])

        return jsonify({
            'instance_id': instance_id,
            'workflow_name': instance['title'],
            'status': instance['status'],
            'timeline': timeline
        }), 200

    except Exception as e:
        logger.error(f"Error getting workflow timeline {instance_id}: {e}")
        return jsonify({'error': 'Failed to retrieve workflow timeline'}), 500

@workflows_bp.route('/instances/<instance_id>/status', methods=['GET'])
@require_auth
def get_detailed_workflow_status(instance_id):
    """Get detailed workflow status including next possible actions"""
    try:
        if not validate_uuid(instance_id):
            return jsonify({'error': 'Invalid instance ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Get workflow instance with definition
        instance = Database.execute_one("""
            SELECT wi.*, w.name as workflow_name, w.definition
            FROM workflow_instances wi
            JOIN workflows w ON wi.workflow_id = w.id
            WHERE wi.id = %s AND wi.tenant_id = %s
        """, (instance_id, tenant_id))

        if not instance:
            return jsonify({'error': 'Workflow instance not found'}), 404

        # Get current pending tasks
        pending_tasks = Database.execute_query("""
            SELECT t.*, u.first_name || ' ' || u.last_name as assigned_to_name,
                   fd.name as form_name
            FROM tasks t
            LEFT JOIN users u ON t.assigned_to = u.id
            LEFT JOIN form_definitions fd ON t.form_id = fd.id
            WHERE t.workflow_instance_id = %s AND t.status = 'pending'
            ORDER BY t.created_at
        """, (instance_id,))

        # Get completed tasks count
        completed_tasks = Database.execute_one("""
            SELECT COUNT(*) as count FROM tasks 
            WHERE workflow_instance_id = %s AND status = 'completed'
        """, (instance_id,))

        # Parse workflow definition to determine next possible steps
        definition = json.loads(instance['definition']) if isinstance(instance['definition'], str) else instance['definition']

        # Determine next possible actions
        next_actions = []
        current_step = instance.get('current_step')

        if current_step and definition:
            transitions = definition.get('transitions', [])
            for transition in transitions:
                if transition['from'] == current_step:
                    target_step = next((s for s in definition['steps'] if s['id'] == transition['to']), None)
                    if target_step:
                        next_actions.append({
                            'step_id': target_step['id'],
                            'step_name': target_step['name'],
                            'step_type': target_step['type'],
                            'condition': transition.get('condition')
                        })

        return jsonify({
            'instance': {
                'id': instance['id'],
                'workflow_name': instance['workflow_name'],
                'title': instance['title'],
                'status': instance['status'],
                'current_step': instance['current_step'],
                'created_at': instance['created_at'],
                'updated_at': instance['updated_at'],
                'completed_at': instance['completed_at'],
                'data': json.loads(instance['data']) if instance['data'] else {}
            },
            'progress': {
                'pending_tasks': len(pending_tasks),
                'completed_tasks': completed_tasks['count'],
                'is_stuck': len(pending_tasks) == 0 and instance['status'] == 'in_progress'
            },
            'pending_tasks': [dict(t) for t in pending_tasks],
            'next_possible_actions': next_actions,
            'can_advance_manually': len(next_actions) > 0,
            'requires_intervention': len(pending_tasks) == 0 and instance['status'] == 'in_progress'
        }), 200

    except Exception as e:
        logger.error(f"Error getting detailed workflow status {instance_id}: {e}")
        return jsonify({'error': 'Failed to retrieve workflow status'}), 500