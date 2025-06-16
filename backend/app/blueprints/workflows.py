### app/blueprints/workflows.py

"""
Workflows blueprint - handles workflow management
"""
from datetime import datetime, timedelta

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


# Add these endpoints to your app/blueprints/workflows.py file

@workflows_bp.route('/<workflow_id>/execution-templates', methods=['GET'])
@require_auth
def get_execution_templates(workflow_id):
    """Get execution templates for a workflow"""
    try:
        if not validate_uuid(workflow_id):
            return jsonify({'error': 'Invalid workflow ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Get workflow details
        workflow = Database.execute_one("""
            SELECT id, name, definition, category
            FROM workflows 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (workflow_id, tenant_id))

        if not workflow:
            return jsonify({'error': 'Workflow not found'}), 404

        # Parse workflow definition to extract template information
        if isinstance(workflow['definition'], str):
            definition = json.loads(workflow['definition'])
        else:
            definition = workflow['definition']

        # Build execution templates based on workflow steps
        templates = []

        # Default template
        default_template = {
            'id': 'default',
            'name': 'Default Execution',
            'description': 'Standard workflow execution with default settings',
            'priority_options': [
                {'value': 'low', 'label': 'Low - Standard processing'},
                {'value': 'medium', 'label': 'Medium - Normal priority'},
                {'value': 'high', 'label': 'High - Expedited processing'},
                {'value': 'urgent', 'label': 'Urgent - Immediate attention'}
            ],
            'default_values': {
                'priority': 'medium',
                'notify_stakeholders': True,
                'auto_assign': True,
                'parallel_execution': False
            },
            'required_fields': ['title'],
            'optional_fields': ['description', 'due_date', 'tags']
        }
        templates.append(default_template)

        # Category-specific templates
        if workflow['category'] == 'Finance':
            finance_template = {
                'id': 'finance_expedited',
                'name': 'Finance Expedited',
                'description': 'Fast-track for urgent financial approvals',
                'default_values': {
                    'priority': 'high',
                    'notify_stakeholders': True,
                    'auto_assign': True,
                    'parallel_execution': True,
                    'escalation_enabled': True
                },
                'required_fields': ['title', 'amount', 'department'],
                'validation_rules': {
                    'amount': {'type': 'number', 'min': 0},
                    'department': {'type': 'string', 'required': True}
                }
            }
            templates.append(finance_template)

        elif workflow['category'] == 'HR':
            hr_template = {
                'id': 'hr_standard',
                'name': 'HR Standard Process',
                'description': 'Standard HR workflow execution',
                'default_values': {
                    'priority': 'medium',
                    'notify_stakeholders': True,
                    'auto_assign': True,
                    'include_manager': True
                },
                'required_fields': ['title', 'employee_id'],
                'optional_fields': ['start_date', 'manager_override']
            }
            templates.append(hr_template)

        # Extract data fields from workflow steps that have forms
        data_fields = []
        steps = definition.get('steps', [])

        for step in steps:
            properties = step.get('properties', {})
            if 'formId' in properties:
                # This step has a form, we should include its fields in the template
                form_id = properties['formId']
                if form_id:
                    # Get form definition
                    form = Database.execute_one("""
                        SELECT schema FROM form_definitions 
                        WHERE id = %s OR name = %s
                    """, (form_id, form_id))

                    if form and form['schema']:
                        try:
                            form_schema = json.loads(form['schema']) if isinstance(form['schema'], str) else form[
                                'schema']
                            form_fields = form_schema.get('fields', [])

                            for field in form_fields:
                                if field.get('required'):
                                    field_info = {
                                        'name': field['name'],
                                        'label': field['label'],
                                        'type': field['type'],
                                        'required': field.get('required', False),
                                        'step': step['name']
                                    }
                                    if field_info not in data_fields:
                                        data_fields.append(field_info)
                        except:
                            pass

        return jsonify({
            'workflow_id': workflow_id,
            'workflow_name': workflow['name'],
            'templates': templates,
            'data_fields': data_fields,
            'execution_options': {
                'supports_parallel': True,
                'supports_scheduling': True,
                'supports_bulk_execution': False,
                'max_concurrent_instances': 10
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting execution templates for workflow {workflow_id}: {e}")
        return jsonify({'error': 'Failed to retrieve execution templates'}), 500


@workflows_bp.route('/<workflow_id>/validate-execution', methods=['POST'])
@require_auth
def validate_execution(workflow_id):
    """Validate workflow execution parameters"""
    try:
        if not validate_uuid(workflow_id):
            return jsonify({'error': 'Invalid workflow ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Get workflow
        workflow = Database.execute_one("""
            SELECT id, name, definition, is_active
            FROM workflows 
            WHERE id = %s AND tenant_id = %s
        """, (workflow_id, tenant_id))

        if not workflow:
            return jsonify({'error': 'Workflow not found'}), 404

        if not workflow['is_active']:
            return jsonify({'error': 'Workflow is not active'}), 400

        # Parse workflow definition
        if isinstance(workflow['definition'], str):
            definition = json.loads(workflow['definition'])
        else:
            definition = workflow['definition']

        # Validation results
        validation_result = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'suggestions': [],
            'estimated_duration': None,
            'required_approvers': [],
            'resource_requirements': []
        }

        # Validate required fields
        required_fields = ['title']
        for field in required_fields:
            if field not in data or not data[field]:
                validation_result['valid'] = False
                validation_result['errors'].append(f"Required field '{field}' is missing")

        # Validate priority
        valid_priorities = ['low', 'medium', 'high', 'urgent']
        priority = data.get('priority', {})
        if isinstance(priority, dict):
            priority_value = priority.get('value')
        else:
            priority_value = priority

        if priority_value and priority_value not in valid_priorities:
            validation_result['valid'] = False
            validation_result['errors'].append(f"Invalid priority: {priority_value}")

        # Validate workflow-specific data
        workflow_data = data.get('data', {})

        # Check if user has permission to execute this workflow
        user_permissions = g.current_user.get('permissions', [])
        if 'execute_workflows' not in user_permissions and '*' not in user_permissions:
            validation_result['valid'] = False
            validation_result['errors'].append("User does not have permission to execute workflows")

        # Analyze workflow definition for validation
        steps = definition.get('steps', [])

        # Find steps that require approval and identify approvers
        approvers_needed = []
        estimated_hours = 0

        for step in steps:
            step_type = step.get('type')
            properties = step.get('properties', {})

            if step_type == 'approval':
                approvers = properties.get('approvers', [])
                for approver in approvers:
                    if approver not in approvers_needed:
                        approvers_needed.append(approver)

            # Estimate duration based on due hours
            due_hours = properties.get('dueHours', 24)
            estimated_hours += due_hours

        validation_result['required_approvers'] = approvers_needed
        validation_result['estimated_duration'] = f"{estimated_hours} hours"

        # Check for potential issues
        if estimated_hours > 168:  # More than a week
            validation_result['warnings'].append(
                f"This workflow may take up to {estimated_hours} hours to complete"
            )

        # Validate specific fields based on workflow category
        category = workflow.get('category')
        if category == 'Finance':
            # Financial workflows should have amount
            if 'amount' in workflow_data:
                try:
                    amount = float(workflow_data['amount'])
                    if amount < 0:
                        validation_result['errors'].append("Amount cannot be negative")
                    elif amount > 1000000:
                        validation_result['warnings'].append(
                            "Large amount detected - additional approvals may be required"
                        )
                except (ValueError, TypeError):
                    validation_result['errors'].append("Amount must be a valid number")

        # Check for conflicting execution options
        if data.get('parallel_execution') and data.get('sequential_only'):
            validation_result['errors'].append(
                "Cannot enable both parallel execution and sequential-only mode"
            )

        # Validate form data if provided
        if 'form_data' in data:
            form_validation = validate_workflow_form_data(workflow_id, data['form_data'])
            if not form_validation['valid']:
                validation_result['valid'] = False
                validation_result['errors'].extend(form_validation['errors'])

        # Add suggestions
        if not data.get('notify_stakeholders'):
            validation_result['suggestions'].append(
                "Consider enabling stakeholder notifications for better transparency"
            )

        if priority_value == 'urgent' and not data.get('justification'):
            validation_result['suggestions'].append(
                "Urgent priority workflows should include justification"
            )

        # Final validation
        if validation_result['errors']:
            validation_result['valid'] = False

        return jsonify(validation_result), 200

    except Exception as e:
        logger.error(f"Error validating execution for workflow {workflow_id}: {e}")
        return jsonify({'error': 'Failed to validate execution parameters'}), 500


def validate_workflow_form_data(workflow_id, form_data):
    """Helper function to validate form data against workflow requirements"""
    try:
        # This is a simplified validation - you can expand based on your form schemas
        validation_result = {
            'valid': True,
            'errors': []
        }

        # Basic validation
        if not isinstance(form_data, dict):
            validation_result['valid'] = False
            validation_result['errors'].append("Form data must be an object")
            return validation_result

        # Add more specific validation based on your form schemas
        # This would typically involve checking required fields, data types, etc.

        return validation_result

    except Exception as e:
        logger.error(f"Error validating form data: {e}")
        return {
            'valid': False,
            'errors': ['Form data validation error']
        }


# Additional helper endpoint for getting workflow execution history
@workflows_bp.route('/<workflow_id>/execution-history', methods=['GET'])
@require_auth
def get_execution_history(workflow_id):
    """Get execution history for a workflow"""
    try:
        if not validate_uuid(workflow_id):
            return jsonify({'error': 'Invalid workflow ID'}), 400

        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit

        # Get recent executions
        executions = Database.execute_query("""
            SELECT wi.id, wi.title, wi.status, wi.priority, 
                   wi.created_at, wi.completed_at,
                   u.first_name || ' ' || u.last_name as initiated_by_name,
                   EXTRACT(EPOCH FROM (COALESCE(wi.completed_at, NOW()) - wi.created_at))/3600 as duration_hours
            FROM workflow_instances wi
            LEFT JOIN users u ON wi.initiated_by = u.id
            WHERE wi.workflow_id = %s AND wi.tenant_id = %s
            ORDER BY wi.created_at DESC
            LIMIT %s OFFSET %s
        """, (workflow_id, tenant_id, limit, offset))

        # Get execution statistics
        stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_executions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_duration_hours
            FROM workflow_instances
            WHERE workflow_id = %s AND tenant_id = %s
        """, (workflow_id, tenant_id))

        return jsonify({
            'executions': [dict(e) for e in executions],
            'statistics': dict(stats),
            'pagination': {
                'page': page,
                'limit': limit,
                'has_more': len(executions) == limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting execution history: {e}")
        return jsonify({'error': 'Failed to retrieve execution history'}), 500


@workflows_bp.route('/<workflow_id>/execution-recommendations', methods=['GET'])
@require_auth
def get_execution_recommendations(workflow_id):
    """Get intelligent recommendations for workflow execution"""
    try:
        if not validate_uuid(workflow_id):
            return jsonify({'error': 'Invalid workflow ID'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Get workflow details
        workflow = Database.execute_one("""
            SELECT id, name, definition, category, created_at
            FROM workflows 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (workflow_id, tenant_id))

        if not workflow:
            return jsonify({'error': 'Workflow not found'}), 404

        # Parse workflow definition
        if isinstance(workflow['definition'], str):
            definition = json.loads(workflow['definition'])
        else:
            definition = workflow['definition']

        # Initialize recommendations structure
        recommendations = {
            'priority_recommendation': {},
            'timing_recommendation': {},
            'assignment_recommendations': [],
            'performance_insights': {},
            'optimization_suggestions': [],
            'risk_factors': [],
            'best_practices': []
        }

        # Get historical execution data
        historical_data = Database.execute_one("""
            SELECT 
                COUNT(*) as total_executions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_executions,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
                AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_completion_hours,
                MIN(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as min_completion_hours,
                MAX(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as max_completion_hours,
                COUNT(CASE WHEN priority = 'high' OR priority = 'urgent' THEN 1 END) as high_priority_count,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_executions
            FROM workflow_instances
            WHERE workflow_id = %s AND tenant_id = %s
        """, (workflow_id, tenant_id))

        # Get current workload for the user
        current_workload = Database.execute_one("""
            SELECT 
                COUNT(*) as active_tasks,
                COUNT(CASE WHEN t.priority = 'high' OR t.priority = 'urgent' THEN 1 END) as high_priority_tasks,
                COUNT(CASE WHEN t.due_date < NOW() + INTERVAL '24 hours' THEN 1 END) as due_soon_tasks
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE t.assigned_to = %s AND t.status = 'pending' AND wi.tenant_id = %s
        """, (user_id, tenant_id))

        # Get team workload
        team_workload = Database.execute_one("""
            SELECT 
                COUNT(DISTINCT wi.id) as active_workflows,
                COUNT(t.id) as pending_tasks,
                AVG(EXTRACT(EPOCH FROM (t.due_date - NOW()))/3600) as avg_time_to_deadline
            FROM workflow_instances wi
            LEFT JOIN tasks t ON wi.id = t.workflow_instance_id AND t.status = 'pending'
            WHERE wi.tenant_id = %s AND wi.status = 'in_progress'
        """, (tenant_id,))

        # Analyze recent performance trends
        recent_performance = Database.execute_query("""
            SELECT 
                DATE(created_at) as execution_date,
                COUNT(*) as executions,
                AVG(EXTRACT(EPOCH FROM (completed_at - created_at))/3600) as avg_duration
            FROM workflow_instances
            WHERE workflow_id = %s AND tenant_id = %s 
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY execution_date DESC
            LIMIT 10
        """, (workflow_id, tenant_id))

        # Priority Recommendation
        if historical_data['total_executions'] > 0:
            success_rate = (historical_data['completed_executions'] / historical_data['total_executions']) * 100
            high_priority_rate = (historical_data['high_priority_count'] / historical_data['total_executions']) * 100

            if success_rate > 90:
                priority_rec = {
                    'recommended': 'medium',
                    'confidence': 'high',
                    'reason': f'This workflow has a {success_rate:.1f}% success rate with medium priority'
                }
            elif high_priority_rate > 50:
                priority_rec = {
                    'recommended': 'high',
                    'confidence': 'medium',
                    'reason': f'{high_priority_rate:.1f}% of executions use high priority'
                }
            else:
                priority_rec = {
                    'recommended': 'medium',
                    'confidence': 'medium',
                    'reason': 'Standard priority recommended for balanced execution'
                }
        else:
            priority_rec = {
                'recommended': 'medium',
                'confidence': 'low',
                'reason': 'No historical data available - using default priority'
            }

        recommendations['priority_recommendation'] = priority_rec

        # Timing Recommendation
        current_hour = datetime.now().hour
        current_day = datetime.now().weekday()  # 0 = Monday

        timing_factors = []
        timing_score = 100

        # Check current workload
        if current_workload['active_tasks'] > 10:
            timing_factors.append("High current workload detected")
            timing_score -= 20

        if current_workload['due_soon_tasks'] > 3:
            timing_factors.append("Multiple tasks due soon")
            timing_score -= 15

        # Check time of day
        if current_hour < 9 or current_hour > 17:
            timing_factors.append("Outside business hours")
            timing_score -= 10

        # Check day of week
        if current_day >= 5:  # Weekend
            timing_factors.append("Weekend execution")
            timing_score -= 15

        timing_recommendation = {
            'execute_now': timing_score >= 70,
            'score': timing_score,
            'factors': timing_factors,
            'suggested_time': 'immediately' if timing_score >= 70 else 'during business hours'
        }

        if historical_data['avg_completion_hours']:
            estimated_completion = datetime.now() + timedelta(hours=historical_data['avg_completion_hours'])
            timing_recommendation['estimated_completion'] = estimated_completion.isoformat()

        recommendations['timing_recommendation'] = timing_recommendation

        # Assignment Recommendations
        steps = definition.get('steps', [])
        assignment_recs = []

        for step in steps:
            if step.get('type') in ['task', 'approval']:
                properties = step.get('properties', {})
                assignee = properties.get('assignee') or properties.get('assigned_to')

                if assignee and '{{' not in str(assignee):  # Static assignment
                    # Get assignee workload
                    assignee_workload = Database.execute_one("""
                        SELECT 
                            COUNT(*) as pending_tasks,
                            AVG(EXTRACT(EPOCH FROM (due_date - NOW()))/3600) as avg_time_to_deadline
                        FROM tasks t
                        JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                        WHERE t.assigned_to = %s AND t.status = 'pending' AND wi.tenant_id = %s
                    """, (assignee, tenant_id))

                    workload_status = 'low'
                    if assignee_workload['pending_tasks'] > 10:
                        workload_status = 'high'
                    elif assignee_workload['pending_tasks'] > 5:
                        workload_status = 'medium'

                    assignment_recs.append({
                        'step_name': step['name'],
                        'assignee': assignee,
                        'workload_status': workload_status,
                        'pending_tasks': assignee_workload['pending_tasks'],
                        'recommendation': 'proceed' if workload_status != 'high' else 'consider_alternative'
                    })

        recommendations['assignment_recommendations'] = assignment_recs

        # Performance Insights
        insights = {
            'historical_performance': {
                'total_executions': historical_data['total_executions'],
                'success_rate': f"{(historical_data['completed_executions'] / historical_data['total_executions']) * 100:.1f}%" if
                historical_data['total_executions'] > 0 else 'N/A',
                'avg_completion_time': f"{historical_data['avg_completion_hours']:.1f} hours" if historical_data[
                    'avg_completion_hours'] else 'N/A'
            },
            'recent_trends': {
                'executions_last_30_days': historical_data['recent_executions'],
                'trend': 'increasing' if historical_data['recent_executions'] > historical_data[
                    'total_executions'] * 0.5 else 'stable'
            }
        }

        if historical_data['avg_completion_hours']:
            if historical_data['avg_completion_hours'] < 24:
                insights['performance_rating'] = 'excellent'
            elif historical_data['avg_completion_hours'] < 72:
                insights['performance_rating'] = 'good'
            else:
                insights['performance_rating'] = 'needs_improvement'

        recommendations['performance_insights'] = insights

        # Optimization Suggestions
        optimizations = []

        if historical_data['failed_executions'] > 0:
            failure_rate = (historical_data['failed_executions'] / historical_data['total_executions']) * 100
            if failure_rate > 10:
                optimizations.append({
                    'type': 'reliability',
                    'suggestion': 'Consider adding error handling steps',
                    'impact': 'high',
                    'reason': f'{failure_rate:.1f}% failure rate detected'
                })

        if historical_data['avg_completion_hours'] and historical_data['avg_completion_hours'] > 168:
            optimizations.append({
                'type': 'performance',
                'suggestion': 'Review step dependencies for parallel execution opportunities',
                'impact': 'medium',
                'reason': 'Long average completion time detected'
            })

        if team_workload['pending_tasks'] > 100:
            optimizations.append({
                'type': 'resource',
                'suggestion': 'Consider load balancing across team members',
                'impact': 'medium',
                'reason': 'High team workload detected'
            })

        recommendations['optimization_suggestions'] = optimizations

        # Risk Factors
        risks = []

        if current_workload['high_priority_tasks'] > 5:
            risks.append({
                'type': 'workload',
                'level': 'medium',
                'description': 'Multiple high-priority tasks already assigned',
                'mitigation': 'Consider scheduling for later or delegating existing tasks'
            })

        if historical_data['total_executions'] == 0:
            risks.append({
                'type': 'inexperience',
                'level': 'low',
                'description': 'No historical data for this workflow',
                'mitigation': 'Monitor closely and be prepared for longer execution times'
            })

        if workflow['category'] == 'Finance' and current_day >= 5:
            risks.append({
                'type': 'timing',
                'level': 'low',
                'description': 'Financial workflows on weekends may have delayed approvals',
                'mitigation': 'Consider executing on weekdays for faster approvals'
            })

        recommendations['risk_factors'] = risks

        # Best Practices
        practices = [
            {
                'category': 'preparation',
                'practice': 'Gather all required documents before starting',
                'benefit': 'Reduces delays and back-and-forth'
            },
            {
                'category': 'communication',
                'practice': 'Notify stakeholders about workflow initiation',
                'benefit': 'Improves response times and collaboration'
            }
        ]

        if workflow['category'] == 'Finance':
            practices.append({
                'category': 'documentation',
                'practice': 'Include detailed financial justification',
                'benefit': 'Faster approval process'
            })

        recommendations['best_practices'] = practices

        # Overall recommendation score
        overall_score = timing_score
        if success_rate and success_rate > 90:
            overall_score += 10
        if len(risks) == 0:
            overall_score += 5

        recommendations['overall_recommendation'] = {
            'execute': overall_score >= 70,
            'score': min(overall_score, 100),
            'summary': f"{'Recommended' if overall_score >= 70 else 'Proceed with caution'} - Score: {overall_score}/100"
        }

        return jsonify(recommendations), 200

    except Exception as e:
        logger.error(f"Error getting execution recommendations for workflow {workflow_id}: {e}")
        return jsonify({'error': 'Failed to retrieve execution recommendations'}), 500