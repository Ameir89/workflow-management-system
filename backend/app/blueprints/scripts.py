# app/blueprints/scripts.py
"""
Scripts management blueprint - handles script CRUD operations, execution, and validation
"""
from flask import Blueprint, request, jsonify, g, current_app
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid
from app.utils.validators import validate_required_fields
from app.services.automation_engine import AutomationEngine
from app.services.automation_script_manager import AutomationScriptManager
import json
import logging
import tempfile
import subprocess
import os
from datetime import datetime

logger = logging.getLogger(__name__)

scripts_bp = Blueprint('scripts', __name__)

@scripts_bp.route('', methods=['GET'])
@require_auth
@require_permissions(['view_scripts'])
def get_scripts():
    """Get all scripts with optional filtering"""
    try:
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        
        # Filter parameters
        category = request.args.get('category')
        script_type = request.args.get('script_type')
        search = request.args.get('search', '').strip()
        is_active = request.args.get('is_active')
        
        # Build query conditions
        where_conditions = ["s.tenant_id = %s"]
        params = [tenant_id]
        
        if category:
            where_conditions.append("s.category = %s")
            params.append(category)
            
        if script_type:
            where_conditions.append("s.script_type = %s")
            params.append(script_type)
            
        if search:
            where_conditions.append("(s.name ILIKE %s OR s.description ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])
            
        if is_active is not None:
            where_conditions.append("s.is_active = %s")
            params.append(is_active.lower() == 'true')
        
        where_clause = "WHERE " + " AND ".join(where_conditions)
        
        # Get scripts with execution statistics
        scripts = Database.execute_query(f"""
            SELECT s.id, s.name, s.description, s.script_type, s.category,
                   s.is_active, s.created_at, s.updated_at,
                   u.first_name || ' ' || u.last_name as created_by_name,
                   COUNT(se.id) as execution_count,
                   COUNT(CASE WHEN se.success = true THEN 1 END) as successful_executions,
                   MAX(se.executed_at) as last_executed
            FROM automation_scripts s
            LEFT JOIN users u ON s.created_by = u.id
            LEFT JOIN script_executions se ON s.id = se.script_id
            {where_clause}
            GROUP BY s.id, u.first_name, u.last_name
            ORDER BY s.updated_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])
        
        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(*) as count 
            FROM automation_scripts s
            {where_clause}
        """, params)
        
        return jsonify({
            'scripts': [dict(script) for script in scripts],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting scripts: {e}")
        return jsonify({'error': 'Failed to retrieve scripts'}), 500

@scripts_bp.route('/<script_id>', methods=['GET'])
@require_auth
@require_permissions(['view_scripts'])
def get_script(script_id):
    """Get a single script by ID"""
    try:
        if not validate_uuid(script_id):
            return jsonify({'error': 'Invalid script ID'}), 400
            
        tenant_id = g.current_user['tenant_id']
        
        script = Database.execute_one("""
            SELECT s.*, u.first_name || ' ' || u.last_name as created_by_name
            FROM automation_scripts s
            LEFT JOIN users u ON s.created_by = u.id
            WHERE s.id = %s AND s.tenant_id = %s
        """, (script_id, tenant_id))
        
        if not script:
            return jsonify({'error': 'Script not found'}), 404
            
        # Get recent execution history
        executions = Database.execute_query("""
            SELECT id, success, executed_at, execution_duration_ms, error_message
            FROM script_executions
            WHERE script_id = %s
            ORDER BY executed_at DESC
            LIMIT 10
        """, (script_id,))
        
        script_dict = dict(script)
        script_dict['recent_executions'] = [dict(exec) for exec in executions]
        
        return jsonify({'script': script_dict}), 200
        
    except Exception as e:
        logger.error(f"Error getting script {script_id}: {e}")
        return jsonify({'error': 'Failed to retrieve script'}), 500

@scripts_bp.route('', methods=['POST'])
@require_auth
@require_permissions(['manage_scripts'])
@audit_log('create', 'script')
def create_script():
    """Create a new script"""
    try:
        data = sanitize_input(request.get_json())
        
        required_fields = ['name', 'script_type', 'script_content']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
            
        # Validate script type
        valid_types = ['python', 'javascript', 'shell']
        if data['script_type'] not in valid_types:
            return jsonify({'error': f'Invalid script type. Must be one of: {valid_types}'}), 400
            
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']
        
        # Check for duplicate names
        existing = Database.execute_one("""
            SELECT id FROM automation_scripts 
            WHERE name = %s AND tenant_id = %s
        """, (data['name'], tenant_id))
        
        if existing:
            return jsonify({'error': 'Script with this name already exists'}), 409
            
        # Validate script syntax if requested
        if data.get('validate_syntax', True):
            validation_result = validate_script_syntax(data['script_content'], data['script_type'])
            if not validation_result['valid']:
                return jsonify({
                    'error': 'Script syntax validation failed',
                    'validation_errors': validation_result['errors']
                }), 400
        
        # Create script
        script_id = Database.execute_insert("""
            INSERT INTO automation_scripts 
            (tenant_id, name, script_type, script_content, description, 
             category, parameters, is_active, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, data['name'], data['script_type'], data['script_content'],
            data.get('description', ''), data.get('category', 'general'),
            json.dumps(data.get('parameters', {})),
            data.get('is_active', True), user_id
        ))
        
        return jsonify({
            'message': 'Script created successfully',
            'script_id': script_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating script: {e}")
        return jsonify({'error': 'Failed to create script'}), 500

@scripts_bp.route('/<script_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_scripts'])
@audit_log('update', 'script')
def update_script(script_id):
    """Update an existing script"""
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
            return jsonify({'error': 'Script not found'}), 404
            
        # Validate script syntax if content is being updated
        if 'script_content' in data and 'script_type' in data:
            if data.get('validate_syntax', True):
                validation_result = validate_script_syntax(data['script_content'], data['script_type'])
                if not validation_result['valid']:
                    return jsonify({
                        'error': 'Script syntax validation failed',
                        'validation_errors': validation_result['errors']
                    }), 400
        
        # Build update query
        update_fields = []
        params = []
        
        for field in ['name', 'description', 'script_content', 'script_type', 'category', 'is_active']:
            if field in data:
                update_fields.append(f'{field} = %s')
                params.append(data[field])
                
        if 'parameters' in data:
            update_fields.append('parameters = %s')
            params.append(json.dumps(data['parameters']))
        
        if update_fields:
            # Add updated_at as SQL function (no param needed)
            update_fields.append('updated_at = NOW()')

            query = f"""
                UPDATE automation_scripts
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            # Append script_id only for WHERE clause
            params.append(script_id)

            Database.execute_query(query, params)
            
        return jsonify({'message': 'Script updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating script {script_id}: {e}")
        return jsonify({'error': 'Failed to update script'}), 500

@scripts_bp.route('/<script_id>', methods=['DELETE'])
@require_auth
@require_permissions(['manage_scripts'])
@audit_log('delete', 'script')
def delete_script(script_id):
    """Delete a script"""
    try:
        if not validate_uuid(script_id):
            return jsonify({'error': 'Invalid script ID'}), 400
            
        tenant_id = g.current_user['tenant_id']
        
        # Check if script exists and can be deleted
        script = Database.execute_one("""
            SELECT id, name, is_system FROM automation_scripts 
            WHERE id = %s AND tenant_id = %s
        """, (script_id, tenant_id))
        
        if not script:
            return jsonify({'error': 'Script not found'}), 404
            
        if script.get('is_system', False):
            return jsonify({'error': 'Cannot delete system scripts'}), 403
            
        # Delete script executions first
        Database.execute_query("""
            DELETE FROM script_executions WHERE script_id = %s
        """, (script_id,))
        
        # Delete the script
        Database.execute_query("""
            DELETE FROM automation_scripts WHERE id = %s
        """, (script_id,))
        
        return jsonify({'message': 'Script deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error deleting script {script_id}: {e}")
        return jsonify({'error': 'Failed to delete script'}), 500

@scripts_bp.route('/<script_id>/test', methods=['POST'])
@require_auth
@require_permissions(['test_scripts'])
def test_script(script_id):
    """Test script execution with sample data"""
    try:
        if not validate_uuid(script_id):
            return jsonify({'error': 'Invalid script ID'}), 400
            
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']
        
        # Get script
        script = Database.execute_one("""
            SELECT id, name, script_type, script_content, parameters
            FROM automation_scripts 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (script_id, tenant_id))
        
        if not script:
            return jsonify({'error': 'Script not found or inactive'}), 404
            
        # Prepare test context
        test_context = {
            'workflow_data': data.get('test_data', {}),
            'workflow_instance_id': 'test-instance',
            'user_id': user_id,
            'tenant_id': tenant_id,
            'is_test': True
        }
        
        # Execute script using automation engine
        automation_engine = AutomationEngine()
        
        automation_config = {
            'type': 'script_execution',
            'script_type': script['script_type'],
            'script_content': script['script_content'],
            'script_timeout': data.get('timeout', 30),
            'allow_network': data.get('allow_network', False)
        }
        
        start_time = datetime.now()
        result = automation_engine.execute_automation(automation_config, test_context)
        execution_time = (datetime.now() - start_time).total_seconds() * 1000
        
        # Log test execution
        Database.execute_insert("""
            INSERT INTO script_executions 
            (script_id, success, execution_duration_ms, result, is_test, executed_by)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            script_id, result['success'], execution_time, 
            json.dumps(result), True, user_id
        ))
        
        return jsonify({
            'success': result['success'],
            'result': result.get('result'),
            'execution_time_ms': execution_time,
            'error': result.get('error') if not result['success'] else None
        }), 200
        
    except Exception as e:
        logger.error(f"Error testing script {script_id}: {e}")
        return jsonify({'error': 'Failed to test script'}), 500

@scripts_bp.route('/validate', methods=['POST'])
@require_auth
@require_permissions(['manage_scripts'])
def validate_script():
    """Validate script syntax"""
    try:
        data = sanitize_input(request.get_json())
        
        required_fields = ['content', 'language']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
            
        result = validate_script_syntax(data['content'], data['language'])
        
        return jsonify(result), 200
        
    except Exception as e:
        logger.error(f"Error validating script: {e}")
        return jsonify({'error': 'Failed to validate script'}), 500

@scripts_bp.route('/categories', methods=['GET'])
@require_auth
@require_permissions(['view_scripts'])
def get_script_categories():
    """Get available script categories"""
    try:
        tenant_id = g.current_user['tenant_id']
        
        categories = Database.execute_query("""
            SELECT DISTINCT category, COUNT(*) as script_count
            FROM automation_scripts 
            WHERE tenant_id = %s AND is_active = true
            GROUP BY category
            ORDER BY category
        """, (tenant_id,))
        
        return jsonify({
            'categories': [dict(cat) for cat in categories]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting script categories: {e}")
        return jsonify({'error': 'Failed to retrieve script categories'}), 500

@scripts_bp.route('/<script_id>/duplicate', methods=['POST'])
@require_auth
@require_permissions(['manage_scripts'])
@audit_log('duplicate', 'script')
def duplicate_script(script_id):
    """Duplicate an existing script"""
    try:
        if not validate_uuid(script_id):
            return jsonify({'error': 'Invalid script ID'}), 400
            
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']
        
        # Get original script
        original = Database.execute_one("""
            SELECT name, script_type, script_content, description, 
                   category, parameters
            FROM automation_scripts 
            WHERE id = %s AND tenant_id = %s
        """, (script_id, tenant_id))
        
        if not original:
            return jsonify({'error': 'Script not found'}), 404
            
        new_name = data.get('name', f"{original['name']} (Copy)")
        
        # Check for duplicate names
        existing = Database.execute_one("""
            SELECT id FROM automation_scripts 
            WHERE name = %s AND tenant_id = %s
        """, (new_name, tenant_id))
        
        if existing:
            return jsonify({'error': 'Script with this name already exists'}), 409
            
        # Create duplicate
        new_script_id = Database.execute_insert("""
            INSERT INTO automation_scripts 
            (tenant_id, name, script_type, script_content, description,
             category, parameters, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, new_name, original['script_type'], 
            original['script_content'], original['description'],
            original['category'], original['parameters'], user_id
        ))
        
        return jsonify({
            'message': 'Script duplicated successfully',
            'script_id': new_script_id,
            'name': new_name
        }), 201
        
    except Exception as e:
        logger.error(f"Error duplicating script {script_id}: {e}")
        return jsonify({'error': 'Failed to duplicate script'}), 500

@scripts_bp.route('/<script_id>/executions', methods=['GET'])
@require_auth
@require_permissions(['view_scripts'])
def get_script_execution_history(script_id):
    """Get script execution history"""
    try:
        if not validate_uuid(script_id):
            return jsonify({'error': 'Invalid script ID'}), 400
            
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = (page - 1) * limit
        
        # Verify script belongs to tenant
        script_exists = Database.execute_one("""
            SELECT id FROM automation_scripts 
            WHERE id = %s AND tenant_id = %s
        """, (script_id, tenant_id))
        
        if not script_exists:
            return jsonify({'error': 'Script not found'}), 404
            
        executions = Database.execute_query("""
            SELECT se.id, se.success, se.executed_at, se.execution_duration_ms,
                   se.error_message, se.is_test,
                   u.first_name || ' ' || u.last_name as executed_by_name
            FROM script_executions se
            LEFT JOIN users u ON se.executed_by = u.id
            WHERE se.script_id = %s
            ORDER BY se.executed_at DESC
            LIMIT %s OFFSET %s
        """, (script_id, limit, offset))
        
        # Get total count
        total = Database.execute_one("""
            SELECT COUNT(*) as count 
            FROM script_executions 
            WHERE script_id = %s
        """, (script_id,))
        
        return jsonify({
            'executions': [dict(exec) for exec in executions],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting script execution history: {e}")
        return jsonify({'error': 'Failed to retrieve execution history'}), 500

@scripts_bp.route('/templates', methods=['GET'])
@require_auth
@require_permissions(['view_scripts'])
def get_script_templates():
    """Get available script templates"""
    try:
        tenant_id = g.current_user['tenant_id']
        script_type = request.args.get('script_type')
        
        where_conditions = ["st.tenant_id = %s", "st.is_template = true", "st.is_active = true"]
        params = [tenant_id]
        
        if script_type:
            where_conditions.append("st.script_type = %s")
            params.append(script_type)
            
        where_clause = "WHERE " + " AND ".join(where_conditions)
        
        templates = Database.execute_query(f"""
            SELECT st.id, st.name, st.description, st.script_type, 
                   st.category, st.parameters, st.script_content,
                   u.first_name || ' ' || u.last_name as created_by_name
            FROM automation_scripts st
            LEFT JOIN users u ON st.created_by = u.id
            {where_clause}
            ORDER BY st.category, st.name
        """, params)
        
        return jsonify({
            'templates': [dict(template) for template in templates]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting script templates: {e}")
        return jsonify({'error': 'Failed to retrieve script templates'}), 500

@scripts_bp.route('/analytics', methods=['GET'])
@require_auth
@require_permissions(['view_reports'])
def get_script_analytics():
    """Get script usage and performance analytics"""
    try:
        tenant_id = g.current_user['tenant_id']
        days = int(request.args.get('days', 30))
        
        analytics = Database.execute_one("""
            SELECT 
                COUNT(DISTINCT s.id) as total_scripts,
                COUNT(DISTINCT CASE WHEN s.is_active THEN s.id END) as active_scripts,
                COUNT(se.id) as total_executions,
                COUNT(CASE WHEN se.success THEN 1 END) as successful_executions,
                COUNT(CASE WHEN NOT se.success THEN 1 END) as failed_executions,
                ROUND(AVG(se.execution_duration_ms), 2) as avg_execution_time_ms,
                COUNT(CASE WHEN se.is_test THEN 1 END) as test_executions
            FROM automation_scripts s
            LEFT JOIN script_executions se ON s.id = se.script_id 
                AND se.executed_at >= NOW() - INTERVAL '%s days'
            WHERE s.tenant_id = %s
        """, (days, tenant_id))
        
        # Get top performing scripts
        top_scripts = Database.execute_query("""
            SELECT s.name, s.script_type, s.category,
                   COUNT(se.id) as execution_count,
                   COUNT(CASE WHEN se.success THEN 1 END) as success_count,
                   ROUND(AVG(se.execution_duration_ms), 2) as avg_duration_ms
            FROM automation_scripts s
            JOIN script_executions se ON s.id = se.script_id
            WHERE s.tenant_id = %s 
            AND se.executed_at >= NOW() - INTERVAL '%s days'
            GROUP BY s.id, s.name, s.script_type, s.category
            ORDER BY execution_count DESC
            LIMIT 10
        """, (tenant_id, days))
        
        # Get execution trends by day
        daily_stats = Database.execute_query("""
            SELECT DATE(se.executed_at) as execution_date,
                   COUNT(*) as total_executions,
                   COUNT(CASE WHEN se.success THEN 1 END) as successful_executions
            FROM script_executions se
            JOIN automation_scripts s ON se.script_id = s.id
            WHERE s.tenant_id = %s
            AND se.executed_at >= NOW() - INTERVAL '%s days'
            GROUP BY DATE(se.executed_at)
            ORDER BY execution_date
        """, (tenant_id, days))
        
        return jsonify({
            'summary': dict(analytics),
            'top_scripts': [dict(script) for script in top_scripts],
            'daily_stats': [dict(stat) for stat in daily_stats],
            'period_days': days
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting script analytics: {e}")
        return jsonify({'error': 'Failed to retrieve script analytics'}), 500

# Helper functions

def validate_script_syntax(script_content, script_type):
    """Validate script syntax based on script type"""
    result = {'valid': True, 'errors': []}
    
    try:
        if script_type == 'python':
            import ast
            try:
                ast.parse(script_content)
            except SyntaxError as e:
                result['valid'] = False
                result['errors'].append(f"Python syntax error at line {e.lineno}: {e.msg}")
                
        elif script_type == 'javascript':
            # For JavaScript, we'd need to run it through Node.js or a JS parser
            # For now, do basic validation
            if 'eval(' in script_content or 'Function(' in script_content:
                result['errors'].append("Warning: Use of eval() or Function() detected")
                
        elif script_type == 'shell':
            # Basic shell script validation
            dangerous_commands = ['rm -rf', 'format', 'del /f', 'shutdown']
            for cmd in dangerous_commands:
                if cmd in script_content.lower():
                    result['valid'] = False
                    result['errors'].append(f"Dangerous command detected: {cmd}")
                    
        # Common validations
        if len(script_content.strip()) == 0:
            result['valid'] = False
            result['errors'].append("Script content cannot be empty")
            
        if len(script_content) > 50000:  # 50KB limit
            result['errors'].append("Warning: Script is very large (>50KB)")
            
    except Exception as e:
        result['valid'] = False
        result['errors'].append(f"Validation error: {str(e)}")
        
    return result