# app/blueprints/forms.py
"""
Forms blueprint - handles dynamic form management
"""
from flask import Blueprint, request, jsonify, g
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid
from app.utils.validators import validate_required_fields, validate_form_schema
import json
from app.utils.json_utils import JSONUtils
import logging

logger = logging.getLogger(__name__)

forms_bp = Blueprint('forms', __name__)


@forms_bp.route('', methods=['GET'])
@require_auth
def get_form_definitions():
    """Get all form definitions for the current tenant"""
    try:
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        search = request.args.get('search', '')

        # Build query
        where_conditions = ["fd.tenant_id = %s"]
        params = [tenant_id]

        if search:
            where_conditions.append("(name ILIKE %s OR description ILIKE %s)")
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        where_clause = "WHERE " + " AND ".join(where_conditions)

        forms = Database.execute_query(f"""
            SELECT fd.id, fd.name, fd.description, fd.version, fd.is_active,
                   fd.created_at, fd.updated_at,
                   u.first_name || ' ' || u.last_name as created_by_name,
                   COUNT(fr.id) as response_count
            FROM form_definitions fd
            LEFT JOIN users u ON fd.created_by = u.id
            LEFT JOIN form_responses fr ON fd.id = fr.form_definition_id
            {where_clause}
            GROUP BY fd.id, u.first_name, u.last_name
            ORDER BY fd.updated_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(*) as count 
            FROM form_definitions fd
            {where_clause}
        """, params)

        return jsonify({
            'forms': [dict(f) for f in forms],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting form definitions: {e}")
        return jsonify({'error': 'Failed to retrieve form definitions'}), 500


@forms_bp.route('/<form_id>', methods=['GET'])
@require_auth
def get_form_definition(form_id):
    """Get specific form definition"""
    try:
        if not validate_uuid(form_id):
            return jsonify({'error': 'Invalid form ID'}), 400

        tenant_id = g.current_user['tenant_id']

        form = Database.execute_one("""
            SELECT fd.*, u.first_name || ' ' || u.last_name as created_by_name
            FROM form_definitions fd
            LEFT JOIN users u ON fd.created_by = u.id
            WHERE fd.id = %s AND fd.tenant_id = %s
        """, (form_id, tenant_id))

        if not form:
            return jsonify({'error': 'Form definition not found'}), 404

        # Parse schema JSON
        form_dict = dict(form)
        # if form_dict['schema']:
        #     form_dict['schema'] = json.loads(form_dict['schema'])
        try:
            if form_dict.get('schema') and isinstance(form_dict['schema'], str):
                form_dict['schema'] = JSONUtils.safe_parse_json(form_dict['schema'])
        except Exception as json_err:
            logger.warning(f"Failed to parse form schema JSON: {json_err}")

        return jsonify({'form': form_dict}), 200

    except Exception as e:
        logger.error(f"Error getting form definition {form_id}: {e}")
        return jsonify({'error': 'Failed to retrieve form definition'}), 500


@forms_bp.route('', methods=['POST'])
@require_auth
@require_permissions(['create_forms'])
@audit_log('create', 'form_definition')
def create_form_definition():
    """Create new form definition"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['name', 'schema']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Validate form schema
        is_valid, error_message = validate_form_schema(data['schema'])
        if not is_valid:
            return jsonify({'error': f'Invalid form schema: {error_message}'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        form_id = Database.execute_insert("""
            INSERT INTO form_definitions 
            (tenant_id, name, description, schema, created_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            tenant_id, data['name'], data.get('description', ''),
            JSONUtils.safe_json_dumps(data['schema']), user_id
        ))

        return jsonify({
            'message': 'Form definition created successfully',
            'form_id': form_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating form definition: {e}")
        return jsonify({'error': 'Failed to create form definition'}), 500


@forms_bp.route('/<form_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_forms'])
@audit_log('update', 'form_definition')
def update_form_definition(form_id):
    """Update form definition"""
    try:
        if not validate_uuid(form_id):
            return jsonify({'error': 'Invalid form ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        # Check if form exists
        existing = Database.execute_one("""
            SELECT id FROM form_definitions 
            WHERE id = %s AND tenant_id = %s
        """, (form_id, tenant_id))

        if not existing:
            return jsonify({'error': 'Form definition not found'}), 404

        # Validate schema if provided
        if 'schema' in data:
            is_valid, error_message = validate_form_schema(data['schema'])
            if not is_valid:
                return jsonify({'error': f'Invalid form schema: {error_message}'}), 400

        # Update form
        update_fields = []
        params = []

        if 'name' in data:
            update_fields.append('name = %s')
            params.append(data['name'])

        if 'description' in data:
            update_fields.append('description = %s')
            params.append(data['description'])

        if 'schema' in data:
            update_fields.append('schema = %s, version = version + 1')
            params.append(JSONUtils.safe_json_dumps(data['schema']))

        if 'is_active' in data:
            update_fields.append('is_active = %s')
            params.append(data['is_active'])

        if update_fields:
            update_fields.append('updated_at = NOW()')
            params.append(form_id)

            query = f"""
                UPDATE form_definitions 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            Database.execute_query(query, params)

        return jsonify({'message': 'Form definition updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating form definition {form_id}: {e}")
        return jsonify({'error': 'Failed to update form definition'}), 500


@forms_bp.route('/<form_id>/responses', methods=['GET'])
@require_auth
@require_permissions(['view_form_responses'])
def get_form_responses(form_id):
    """Get responses for a form definition"""
    try:
        if not validate_uuid(form_id):
            return jsonify({'error': 'Invalid form ID'}), 400

        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit

        # Check if form exists
        form_exists = Database.execute_one("""
            SELECT id FROM form_definitions 
            WHERE id = %s AND tenant_id = %s
        """, (form_id, tenant_id))

        if not form_exists:
            return jsonify({'error': 'Form definition not found'}), 404

        responses = Database.execute_query("""
            SELECT fr.id, fr.data, fr.submitted_at,
                   u.first_name || ' ' || u.last_name as submitted_by_name,
                   wi.title as workflow_title,
                   t.name as task_name
            FROM form_responses fr
            LEFT JOIN users u ON fr.submitted_by = u.id
            LEFT JOIN workflow_instances wi ON fr.workflow_instance_id = wi.id
            LEFT JOIN tasks t ON fr.task_id = t.id
            WHERE fr.form_definition_id = %s
            ORDER BY fr.submitted_at DESC
            LIMIT %s OFFSET %s
        """, (form_id, limit, offset))

        # Parse JSON data
        for response in responses:
            if response['data']:
                response['data'] = JSONUtils.safe_parse_json(response['data'])

        # Get total count
        total = Database.execute_one("""
            SELECT COUNT(*) as count 
            FROM form_responses 
            WHERE form_definition_id = %s
        """, (form_id,))

        return jsonify({
            'responses': [dict(r) for r in responses],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting form responses: {e}")
        return jsonify({'error': 'Failed to retrieve form responses'}), 500


@forms_bp.route('/<form_id>', methods=['DELETE'])
@require_auth
@require_permissions(['manage_forms'])
@audit_log('delete', 'form_definition')
def delete_form_definition(form_id):
    """Delete form definition (soft delete)"""
    try:
        if not validate_uuid(form_id):
            return jsonify({'error': 'Invalid form ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Check if form has responses
        has_responses = Database.execute_one("""
            SELECT COUNT(*) as count 
            FROM form_responses 
            WHERE form_definition_id = %s
        """, (form_id,))

        if has_responses['count'] > 0:
            # Soft delete by marking inactive
            Database.execute_query("""
                UPDATE form_definitions 
                SET is_active = false, updated_at = NOW()
                WHERE id = %s AND tenant_id = %s
            """, (form_id, tenant_id))
        else:
            # Hard delete if no responses
            Database.execute_query("""
                DELETE FROM form_definitions 
                WHERE id = %s AND tenant_id = %s
            """, (form_id, tenant_id))

        return jsonify({'message': 'Form definition deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Error deleting form definition {form_id}: {e}")
        return jsonify({'error': 'Failed to delete form definition'}), 500