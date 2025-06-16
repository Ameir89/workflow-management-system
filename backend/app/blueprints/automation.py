# app/blueprints/automation.py
"""
Automation Management API - handles automation templates, scripts, and execution
"""
from flask import Blueprint, request, jsonify, g
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid
from app.utils.validators import validate_required_fields
from app.services.automation_engine import AutomationEngine
from app.services.automation_example import AUTOMATION_EXAMPLES
from app.services.automation_script_manager import AutomationScriptManager
from app.services.automation_template_manger import AutomationTemplateManager
import json
import logging

logger = logging.getLogger(__name__)

automation_bp = Blueprint('automation', __name__)


# ===== AUTOMATION TEMPLATES =====

@automation_bp.route('/templates', methods=['GET'])
@require_auth
@require_permissions(['view_automation'])
def get_automation_templates():
    """Get all automation templates for the current tenant"""
    try:
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        search = request.args.get('search', '')
        automation_type = request.args.get('type')

        # Build query conditions
        where_conditions = ["tenant_id = %s"]
        params = [tenant_id]

        if search:
            where_conditions.append("(name ILIKE %s OR description ILIKE %s)")
            search_pattern = f"%{search}%"
            params.extend([search_pattern, search_pattern])

        if automation_type:
            where_conditions.append("template_data->>'type' = %s")
            params.append(automation_type)

        where_clause = "WHERE " + " AND ".join(where_conditions)

        templates = Database.execute_query(f"""
            SELECT id, name, description, template_data, is_active,
                   created_at, updated_at,
                   u.first_name || ' ' || u.last_name as created_by_name
            FROM automation_templates at
            LEFT JOIN users u ON at.created_by = u.id
            {where_clause}
            ORDER BY at.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Parse template data
        for template in templates:
            if template['template_data']:
                template['template_data'] = json.loads(template['template_data'])

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(*) as count 
            FROM automation_templates
            {where_clause}
        """, params)

        return jsonify({
            'templates': [dict(t) for t in templates],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting automation templates: {e}")
        return jsonify({'error': 'Failed to retrieve automation templates'}), 500


@automation_bp.route('/templates/<template_id>', methods=['GET'])
@require_auth
@require_permissions(['view_automation'])
def get_automation_template(template_id):
    """Get specific automation template"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400

        tenant_id = g.current_user['tenant_id']

        template = Database.execute_one("""
            SELECT at.*, u.first_name || ' ' || u.last_name as created_by_name
            FROM automation_templates at
            LEFT JOIN users u ON at.created_by = u.id
            WHERE at.id = %s AND at.tenant_id = %s
        """, (template_id, tenant_id))

        if not template:
            return jsonify({'error': 'Automation template not found'}), 404

        # Parse template data
        template_dict = dict(template)
        if template_dict['template_data']:
            template_dict['template_data'] = json.loads(template_dict['template_data'])

        return jsonify({'template': template_dict}), 200

    except Exception as e:
        logger.error(f"Error getting automation template {template_id}: {e}")
        return jsonify({'error': 'Failed to retrieve automation template'}), 500


@automation_bp.route('/templates', methods=['POST'])
@require_auth
@require_permissions(['manage_automation'])
@audit_log('create', 'automation_template')
def create_automation_template():
    """Create new automation template"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['name', 'template_data']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Validate template data structure
        template_data = data['template_data']
        if not isinstance(template_data, dict) or 'type' not in template_data:
            return jsonify({'error': 'Invalid template data structure'}), 400

        # Check if template already exists
        existing = Database.execute_one("""
            SELECT id FROM automation_templates 
            WHERE name = %s AND tenant_id = %s
        """, (data['name'], tenant_id))

        if existing:
            return jsonify({'error': 'Template with this name already exists'}), 409

        template_id = AutomationTemplateManager.create_template(
            tenant_id, data['name'], template_data, user_id
        )

        return jsonify({
            'message': 'Automation template created successfully',
            'template_id': template_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating automation template: {e}")
        return jsonify({'error': 'Failed to create automation template'}), 500


@automation_bp.route('/templates/<template_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_automation'])
@audit_log('update', 'automation_template')
def update_automation_template(template_id):
    """Update automation template"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        # Check if template exists
        existing = Database.execute_one("""
            SELECT id FROM automation_templates 
            WHERE id = %s AND tenant_id = %s
        """, (template_id, tenant_id))

        if not existing:
            return jsonify({'error': 'Automation template not found'}), 404

        # Update template
        update_fields = []
        params = []

        if 'name' in data:
            update_fields.append('name = %s')
            params.append(data['name'])

        if 'description' in data:
            update_fields.append('description = %s')
            params.append(data['description'])

        if 'template_data' in data:
            update_fields.append('template_data = %s')
            params.append(json.dumps(data['template_data']))

        if 'is_active' in data:
            update_fields.append('is_active = %s')
            params.append(data['is_active'])

        if update_fields:
            update_fields.append('updated_at = NOW()')
            params.append(template_id)

            query = f"""
                UPDATE automation_templates 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            Database.execute_query(query, params)

        return jsonify({'message': 'Automation template updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating automation template {template_id}: {e}")
        return jsonify({'error': 'Failed to update automation template'}), 500


@automation_bp.route('/templates/<template_id>', methods=['DELETE'])
@require_auth
@require_permissions(['manage_automation'])
@audit_log('delete', 'automation_template')
def delete_automation_template(template_id):
    """Delete automation template"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Soft delete by marking inactive
        Database.execute_query("""
            UPDATE automation_templates 
            SET is_active = false, updated_at = NOW()
            WHERE id = %s AND tenant_id = %s
        """, (template_id, tenant_id))

        return jsonify({'message': 'Automation template deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Error deleting automation template {template_id}: {e}")
        return jsonify({'error': 'Failed to delete automation template'}), 500


# ===== AUTOMATION SCRIPTS =====

@automation_bp.route('/scripts', methods=['GET'])
@require_auth
@require_permissions(['view_automation'])
def get_automation_scripts():
    """Get all automation scripts for the current tenant"""
    try:
        tenant_id = g.current_user['tenant_id']
        script_type = request.args.get('type')

        scripts = AutomationScriptManager.get_scripts(tenant_id, script_type)

        return jsonify({'scripts': scripts}), 200

    except Exception as e:
        logger.error(f"Error getting automation scripts: {e}")
        return jsonify({'error': 'Failed to retrieve automation scripts'}), 500


@automation_bp.route('/scripts/<script_id>', methods=['GET'])
@require_auth
@require_permissions(['view_automation'])
def get_automation_script(script_id):
    """Get specific automation script"""
    try:
        if not validate_uuid(script_id):
            return jsonify({'error': 'Invalid script ID'}), 400

        tenant_id = g.current_user['tenant_id']

        script = Database.execute_one("""
            SELECT *, u.first_name || ' ' || u.last_name as created_by_name
            FROM automation_scripts s
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.id = %s AND s.tenant_id = %s
        """, (script_id, tenant_id))

        if not script:
            return jsonify({'error': 'Automation script not found'}), 404

        return jsonify({'script': dict(script)}), 200

    except Exception as e:
        logger.error(f"Error getting automation script {script_id}: {e}")
        return jsonify({'error': 'Failed to retrieve automation script'}), 500


@automation_bp.route('/scripts', methods=['POST'])
@require_auth
@require_permissions(['manage_automation'])
@audit_log('create', 'automation_script')
def create_automation_script():
    """Create new automation script"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['name', 'script_type', 'script_content']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Validate script type
        valid_types = ['python', 'javascript', 'shell']
        if data['script_type'] not in valid_types:
            return jsonify({'error': f'Invalid script type. Must be one of: {valid_types}'}), 400

        script_id = AutomationScriptManager.save_script(
            tenant_id, data['name'], data['script_type'],
            data['script_content'], user_id
        )

        return jsonify({
            'message': 'Automation script created successfully',
            'script_id': script_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating automation script: {e}")
        return jsonify({'error': 'Failed to create automation script'}), 500


@automation_bp.route('/scripts/<script_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_automation'])
@audit_log('update', 'automation_script')
def update_automation_script(script_id):
    """Update automation script"""
    try:
        if not validate_uuid(script_id):
            return jsonify({'error': 'Invalid script ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        # Check if script exists
        existing = Database.execute_one("""
            SELECT id FROM automation_scripts 
            WHERE id = %s AND tenant_id = %s
        """, (script_id, tenant_id))

        if not existing:
            return jsonify({'error': 'Automation script not found'}), 404

        # Update script
        update_fields = []
        params = []

        if 'name' in data:
            update_fields.append('name = %s')
            params.append(data['name'])

        if 'description' in data:
            update_fields.append('description = %s')
            params.append(data['description'])

        if 'script_content' in data:
            update_fields.append('script_content = %s')
            params.append(data['script_content'])

        if 'parameters' in data:
            update_fields.append('parameters = %s')
            params.append(json.dumps(data['parameters']))

        if 'is_active' in data:
            update_fields.append('is_active = %s')
            params.append(data['is_active'])

        if update_fields:
            update_fields.append('updated_at = NOW()')
            params.append(script_id)

            query = f"""
                UPDATE automation_scripts 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            Database.execute_query(query, params)

        return jsonify({'message': 'Automation script updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating automation script {script_id}: {e}")
        return jsonify({'error': 'Failed to update automation script'}), 500


# ===== AUTOMATION EXECUTION =====

@automation_bp.route('/execute', methods=['POST'])
@require_auth
@require_permissions(['execute_automation'])
@audit_log('execute', 'automation')
def execute_automation():
    """Execute automation manually"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['automation_config']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        automation_config = data['automation_config']
        context = data.get('context', {})

        # Add user context
        context.update({
            'tenant_id': tenant_id,
            'executed_by': user_id,
            'execution_mode': 'manual'
        })

        # Execute automation
        automation_engine = AutomationEngine()
        result = automation_engine.execute_automation(automation_config, context)

        return jsonify(result), 200

    except Exception as e:
        logger.error(f"Error executing automation: {e}")
        return jsonify({'error': 'Failed to execute automation'}), 500


@automation_bp.route('/executions', methods=['GET'])
@require_auth
@require_permissions(['view_automation'])
def get_automation_executions():
    """Get automation execution history"""
    try:
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        status_filter = request.args.get('status')
        automation_type = request.args.get('type')

        # Build query conditions
        where_conditions = []
        params = []

        if status_filter:
            where_conditions.append("status = %s")
            params.append(status_filter)

        if automation_type:
            where_conditions.append("automation_type = %s")
            params.append(automation_type)

        where_clause = "WHERE " + " AND ".join(where_conditions) if where_conditions else ""

        executions = Database.execute_query(f"""
            SELECT execution_id, automation_type, status, error_message,
                   started_at, completed_at,
                   EXTRACT(EPOCH FROM (COALESCE(completed_at, NOW()) - started_at)) as duration_seconds
            FROM automation_executions
            {where_clause}
            ORDER BY started_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(*) as count 
            FROM automation_executions
            {where_clause}
        """, params)

        return jsonify({
            'executions': [dict(e) for e in executions],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting automation executions: {e}")
        return jsonify({'error': 'Failed to retrieve automation executions'}), 500


@automation_bp.route('/executions/<execution_id>', methods=['GET'])
@require_auth
@require_permissions(['view_automation'])
def get_automation_execution(execution_id):
    """Get specific automation execution details"""
    try:
        execution = Database.execute_one("""
            SELECT * FROM automation_executions 
            WHERE execution_id = %s
        """, (execution_id,))

        if not execution:
            return jsonify({'error': 'Automation execution not found'}), 404

        execution_dict = dict(execution)

        # Parse JSON fields
        for field in ['config', 'context', 'result']:
            if execution_dict[field]:
                try:
                    execution_dict[field] = json.loads(execution_dict[field])
                except json.JSONDecodeError:
                    pass

        return jsonify({'execution': execution_dict}), 200

    except Exception as e:
        logger.error(f"Error getting automation execution {execution_id}: {e}")
        return jsonify({'error': 'Failed to retrieve automation execution'}), 500


# ===== AUTOMATION TESTING =====

@automation_bp.route('/test', methods=['POST'])
@require_auth
@require_permissions(['test_automation'])
def test_automation():
    """Test automation configuration without executing"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['automation_config']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        automation_config = data['automation_config']
        test_context = data.get('test_context', {})

        # Validate automation configuration
        automation_engine = AutomationEngine()

        try:
            automation_type, config = automation_engine._validate_and_prepare_automation(automation_config)
            resolved_config = automation_engine._resolve_context_variables(config, test_context)

            return jsonify({
                'valid': True,
                'automation_type': automation_type.value,
                'resolved_config': resolved_config,
                'message': 'Automation configuration is valid'
            }), 200

        except Exception as validation_error:
            return jsonify({
                'valid': False,
                'error': str(validation_error),
                'message': 'Automation configuration is invalid'
            }), 400

    except Exception as e:
        logger.error(f"Error testing automation: {e}")
        return jsonify({'error': 'Failed to test automation'}), 500


# ===== AUTOMATION EXAMPLES AND DOCUMENTATION =====

@automation_bp.route('/examples', methods=['GET'])
@require_auth
def get_automation_examples():
    """Get automation configuration examples"""
    try:
        example_type = request.args.get('type')

        if example_type and example_type in AUTOMATION_EXAMPLES:
            return jsonify({
                'example': AUTOMATION_EXAMPLES[example_type],
                'type': example_type
            }), 200
        else:
            return jsonify({
                'examples': AUTOMATION_EXAMPLES,
                'available_types': list(AUTOMATION_EXAMPLES.keys())
            }), 200

    except Exception as e:
        logger.error(f"Error getting automation examples: {e}")
        return jsonify({'error': 'Failed to retrieve automation examples'}), 500


@automation_bp.route('/types', methods=['GET'])
@require_auth
def get_automation_types():
    """Get available automation types and their descriptions"""
    try:
        automation_types = {
            'api_call': {
                'name': 'API Call',
                'description': 'Make HTTP requests to external APIs',
                'required_fields': ['url'],
                'optional_fields': ['method', 'headers', 'data', 'auth', 'timeout']
            },
            'script_execution': {
                'name': 'Script Execution',
                'description': 'Execute Python, JavaScript, or shell scripts',
                'required_fields': ['script_type', 'script'],
                'optional_fields': ['script_id', 'timeout', 'allow_network']
            },
            'email_notification': {
                'name': 'Email Notification',
                'description': 'Send email notifications',
                'required_fields': ['recipients'],
                'optional_fields': ['subject', 'body', 'template_id', 'attachments']
            },
            'sms_notification': {
                'name': 'SMS Notification',
                'description': 'Send SMS notifications',
                'required_fields': ['phone_numbers', 'message'],
                'optional_fields': ['template_id']
            },
            'database_operation': {
                'name': 'Database Operation',
                'description': 'Perform database operations',
                'required_fields': ['operation', 'table'],
                'optional_fields': ['data', 'conditions']
            },
            'file_operation': {
                'name': 'File Operation',
                'description': 'Perform file system operations',
                'required_fields': ['operation', 'file_path'],
                'optional_fields': ['content', 'encoding']
            },
            'webhook_trigger': {
                'name': 'Webhook Trigger',
                'description': 'Trigger external webhooks',
                'required_fields': ['webhook_url'],
                'optional_fields': ['event_type', 'payload']
            },
            'data_transformation': {
                'name': 'Data Transformation',
                'description': 'Transform and manipulate data',
                'required_fields': ['transformation_type'],
                'optional_fields': ['source_data', 'field_mapping', 'filter_conditions']
            }
        }

        return jsonify({'automation_types': automation_types}), 200

    except Exception as e:
        logger.error(f"Error getting automation types: {e}")
        return jsonify({'error': 'Failed to retrieve automation types'}), 500


# ===== EMAIL AND SMS TEMPLATES =====

@automation_bp.route('/email-templates', methods=['GET'])
@require_auth
@require_permissions(['view_automation'])
def get_email_templates():
    """Get email templates"""
    try:
        tenant_id = g.current_user['tenant_id']

        templates = Database.execute_query("""
            SELECT id, name, subject, is_html, is_active, created_at
            FROM email_templates 
            WHERE tenant_id = %s
            ORDER BY created_at DESC
        """, (tenant_id,))

        return jsonify({'templates': [dict(t) for t in templates]}), 200

    except Exception as e:
        logger.error(f"Error getting email templates: {e}")
        return jsonify({'error': 'Failed to retrieve email templates'}), 500


@automation_bp.route('/email-templates', methods=['POST'])
@require_auth
@require_permissions(['manage_automation'])
@audit_log('create', 'email_template')
def create_email_template():
    """Create email template"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['name', 'subject', 'body']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        template_id = Database.execute_insert("""
            INSERT INTO email_templates 
            (tenant_id, name, subject, body, is_html, created_by)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, data['name'], data['subject'], data['body'],
            data.get('is_html', False), user_id
        ))

        return jsonify({
            'message': 'Email template created successfully',
            'template_id': template_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating email template: {e}")
        return jsonify({'error': 'Failed to create email template'}), 500


@automation_bp.route('/sms-templates', methods=['GET'])
@require_auth
@require_permissions(['view_automation'])
def get_sms_templates():
    """Get SMS templates"""
    try:
        tenant_id = g.current_user['tenant_id']

        templates = Database.execute_query("""
            SELECT id, name, message, is_active, created_at
            FROM sms_templates 
            WHERE tenant_id = %s
            ORDER BY created_at DESC
        """, (tenant_id,))

        return jsonify({'templates': [dict(t) for t in templates]}), 200

    except Exception as e:
        logger.error(f"Error getting SMS templates: {e}")
        return jsonify({'error': 'Failed to retrieve SMS templates'}), 500


@automation_bp.route('/sms-templates', methods=['POST'])
@require_auth
@require_permissions(['manage_automation'])
@audit_log('create', 'sms_template')
def create_sms_template():
    """Create SMS template"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['name', 'message']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        template_id = Database.execute_insert("""
            INSERT INTO sms_templates 
            (tenant_id, name, message, created_by)
            VALUES (%s, %s, %s, %s)
        """, (tenant_id, data['name'], data['message'], user_id))

        return jsonify({
            'message': 'SMS template created successfully',
            'template_id': template_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating SMS template: {e}")
        return jsonify({'error': 'Failed to create SMS template'}), 500


# ===== AUTOMATION STATISTICS =====

@automation_bp.route('/stats', methods=['GET'])
@require_auth
@require_permissions(['view_automation'])
def get_automation_stats():
    """Get automation statistics"""
    try:
        tenant_id = g.current_user['tenant_id']
        days = int(request.args.get('days', 30))

        # Get execution statistics
        stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_executions,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_executions,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
                COUNT(CASE WHEN started_at >= NOW() - INTERVAL '%s days' THEN 1 END) as recent_executions,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) as avg_duration_seconds
            FROM automation_executions
            WHERE started_at >= NOW() - INTERVAL '%s days'
        """, (days, days))

        # Get execution by type
        by_type = Database.execute_query("""
            SELECT 
                automation_type,
                COUNT(*) as count,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed
            FROM automation_executions
            WHERE started_at >= NOW() - INTERVAL '%s days'
            GROUP BY automation_type
            ORDER BY count DESC
        """, (days,))

        # Get template usage
        template_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_templates,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_templates
            FROM automation_templates
            WHERE tenant_id = %s
        """, (tenant_id,))

        # Get script usage
        script_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_scripts,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_scripts,
                COUNT(CASE WHEN script_type = 'python' THEN 1 END) as python_scripts,
                COUNT(CASE WHEN script_type = 'javascript' THEN 1 END) as javascript_scripts,
                COUNT(CASE WHEN script_type = 'shell' THEN 1 END) as shell_scripts
            FROM automation_scripts
            WHERE tenant_id = %s
        """, (tenant_id,))

        return jsonify({
            'execution_stats': dict(stats) if stats else {},
            'by_type': [dict(row) for row in by_type],
            'template_stats': dict(template_stats) if template_stats else {},
            'script_stats': dict(script_stats) if script_stats else {},
            'period_days': days
        }), 200

    except Exception as e:
        logger.error(f"Error getting automation stats: {e}")
        return jsonify({'error': 'Failed to retrieve automation statistics'}), 500