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
        if workflow_dict['definition']:
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
        if instance_dict['data']:
            instance_dict['data'] = json.loads(instance_dict['data'])
        if instance_dict['definition']:
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