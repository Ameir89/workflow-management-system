# app/blueprints/notification_management.py
"""
Notification Management API - Admin endpoints for notification templates, history, and analytics
Compatible with existing notification schema
"""
from flask import Blueprint, request, jsonify, g
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import validate_uuid, sanitize_input
from app.utils.validators import validate_required_fields, validate_pagination_params
from app.utils.json_utils import JSONUtils
import json
import logging
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)

notification_mgmt_bp = Blueprint('notification_management', __name__)


# ===============================
# NOTIFICATION TEMPLATES
# ===============================

@notification_mgmt_bp.route('/notification-templates', methods=['GET'])
@require_auth
@require_permissions(['manage_notifications', 'view_admin_dashboard'])
def get_notification_templates():
    """Get notification templates with filtering and pagination"""
    try:
        tenant_id = g.current_user['tenant_id']
        page, limit = validate_pagination_params(
            request.args.get('page', 1),
            request.args.get('limit', 20)
        )
        
        # Filters
        is_active = request.args.get('is_active')
        search = request.args.get('search')
        
        # Build query
        where_conditions = ["tenant_id = %s"]
        params = [tenant_id]
            
        if is_active is not None:
            where_conditions.append("is_active = %s")
            params.append(is_active.lower() == 'true')
            
        if search:
            where_conditions.append("(name ILIKE %s OR description ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])
        
        where_clause = " AND ".join(where_conditions)
        offset = (page - 1) * limit
        
        # Get templates with usage stats from the existing view
        query = f"""
            SELECT nt.id, nt.name, nt.description, nt.title_template, nt.message_template,
                   nt.channels, nt.is_active, nt.created_by, nt.created_at, nt.updated_at,
                   COALESCE(tus.usage_count, 0) as usage_count,
                   COALESCE(tus.weekly_usage, 0) as weekly_usage,
                   COALESCE(tus.monthly_usage, 0) as monthly_usage,
                   tus.last_used,
                   u.username as created_by_username
            FROM notification_templates nt
            LEFT JOIN template_usage_stats tus ON nt.name = tus.template_name AND nt.tenant_id = tus.tenant_id
            LEFT JOIN users u ON nt.created_by = u.id
            WHERE {where_clause}
            ORDER BY nt.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        
        templates = Database.execute_query(query, params)
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM notification_templates WHERE {where_clause}"
        total_result = Database.execute_one(count_query, params[:-2])  # Remove limit and offset
        total = total_result['total'] if total_result else 0
        
        # Process templates
        for template in templates:
            if template['channels']:
                template['channels'] = JSONUtils.safe_parse_json(template['channels'], [])
        
        return jsonify({
            'templates': templates,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting notification templates: {e}")
        return jsonify({'error': 'Failed to retrieve notification templates'}), 500


@notification_mgmt_bp.route('/notification-templates/<template_id>', methods=['GET'])
@require_auth
@require_permissions(['manage_notifications', 'view_admin_dashboard'])
def get_notification_template(template_id):
    """Get single notification template"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400
            
        tenant_id = g.current_user['tenant_id']
        
        template = Database.execute_one("""
            SELECT nt.*, 
                   COALESCE(tus.usage_count, 0) as usage_count,
                   COALESCE(tus.weekly_usage, 0) as weekly_usage,
                   COALESCE(tus.monthly_usage, 0) as monthly_usage,
                   tus.last_used,
                   u.username as created_by_username,
                   u.first_name as created_by_first_name,
                   u.last_name as created_by_last_name
            FROM notification_templates nt
            LEFT JOIN template_usage_stats tus ON nt.name = tus.template_name AND nt.tenant_id = tus.tenant_id
            LEFT JOIN users u ON nt.created_by = u.id
            WHERE nt.id = %s AND nt.tenant_id = %s
        """, (template_id, tenant_id))
        
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        
        # Parse JSON fields
        if template['channels']:
            template['channels'] = JSONUtils.safe_parse_json(template['channels'], [])
        
        return jsonify({'template': template}), 200
        
    except Exception as e:
        logger.error(f"Error getting notification template: {e}")
        return jsonify({'error': 'Failed to retrieve template'}), 500


@notification_mgmt_bp.route('/notification-templates', methods=['POST'])
@require_auth
@require_permissions(['manage_notifications'])
@audit_log('create_notification_template', 'notification_template')
def create_notification_template():
    """Create new notification template"""
    try:
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']
        
        # Validate required fields
        required_fields = ['name', 'title_template', 'message_template']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Check for duplicate name
        existing = Database.execute_one("""
            SELECT id FROM notification_templates 
            WHERE tenant_id = %s AND name = %s
        """, (tenant_id, data['name']))
        
        if existing:
            return jsonify({'error': 'Template name already exists'}), 409
        
        # Prepare data
        channels = JSONUtils.safe_json_dumps(data.get('channels', ['in_app']))
        
        # Insert template
        template_id = Database.execute_insert("""
            INSERT INTO notification_templates 
            (tenant_id, name, description, title_template, message_template, 
             channels, is_active, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, data['name'], data.get('description', ''),
            data['title_template'], data['message_template'],
            channels, data.get('is_active', True), user_id
        ))
        
        return jsonify({
            'message': 'Template created successfully',
            'template_id': template_id
        }), 201
        
    except Exception as e:
        logger.error(f"Error creating notification template: {e}")
        return jsonify({'error': 'Failed to create template'}), 500


@notification_mgmt_bp.route('/notification-templates/<template_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_notifications'])
@audit_log('update_notification_template', 'notification_template')
def update_notification_template(template_id):
    """Update notification template"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400
            
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        
        # Check template exists and belongs to tenant
        template = Database.execute_one("""
            SELECT id FROM notification_templates 
            WHERE id = %s AND tenant_id = %s
        """, (template_id, tenant_id))
        
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        
        # Check for duplicate name (excluding current template)
        if 'name' in data:
            existing = Database.execute_one("""
                SELECT id FROM notification_templates 
                WHERE tenant_id = %s AND name = %s AND id != %s
            """, (tenant_id, data['name'], template_id))
            
            if existing:
                return jsonify({'error': 'Template name already exists'}), 409
        
        # Build update query dynamically
        update_fields = []
        params = []
        
        updateable_fields = {
            'name': 'name',
            'description': 'description',
            'title_template': 'title_template',
            'message_template': 'message_template',
            'is_active': 'is_active'
        }
        
        for field, db_field in updateable_fields.items():
            if field in data:
                update_fields.append(f"{db_field} = %s")
                params.append(data[field])
        
        # Handle JSON fields
        if 'channels' in data:
            update_fields.append("channels = %s")
            params.append(JSONUtils.safe_json_dumps(data['channels']))
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        # The updated_at will be automatically updated by trigger
        params.extend([template_id, tenant_id])
        
        # Execute update
        query = f"""
            UPDATE notification_templates 
            SET {', '.join(update_fields)}
            WHERE id = %s AND tenant_id = %s
        """
        
        Database.execute_query(query, params)
        
        return jsonify({'message': 'Template updated successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error updating notification template: {e}")
        return jsonify({'error': 'Failed to update template'}), 500


@notification_mgmt_bp.route('/notification-templates/<template_id>', methods=['DELETE'])
@require_auth
@require_permissions(['manage_notifications'])
@audit_log('delete_notification_template', 'notification_template')
def delete_notification_template(template_id):
    """Delete notification template"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400
            
        tenant_id = g.current_user['tenant_id']
        
        # Check template exists and get usage count using the existing view
        template = Database.execute_one("""
            SELECT nt.id, nt.name, COALESCE(tus.usage_count, 0) as usage_count
            FROM notification_templates nt
            LEFT JOIN template_usage_stats tus ON nt.name = tus.template_name AND nt.tenant_id = tus.tenant_id
            WHERE nt.id = %s AND nt.tenant_id = %s
        """, (template_id, tenant_id))
        
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        
        # Soft delete by deactivating if template has been used
        if template['usage_count'] > 0:
            Database.execute_query("""
                UPDATE notification_templates 
                SET is_active = false
                WHERE id = %s AND tenant_id = %s
            """, (template_id, tenant_id))
            
            return jsonify({'message': 'Template deactivated (has usage history)'}), 200
        else:
            # Hard delete if never used
            Database.execute_query("""
                DELETE FROM notification_templates 
                WHERE id = %s AND tenant_id = %s
            """, (template_id, tenant_id))
            
            return jsonify({'message': 'Template deleted successfully'}), 200
        
    except Exception as e:
        logger.error(f"Error deleting notification template: {e}")
        return jsonify({'error': 'Failed to delete template'}), 500


@notification_mgmt_bp.route('/notification-templates/<template_id>/test', methods=['POST'])
@require_auth
@require_permissions(['manage_notifications'])
@audit_log('test_notification_template', 'notification_template')
def test_notification_template(template_id):
    """Test notification template using database render function"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400
            
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']
        
        # Get template
        template = Database.execute_one("""
            SELECT * FROM notification_templates 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (template_id, tenant_id))
        
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        
        # Get test data
        test_data = data.get('test_data', {})
        test_channels = data.get('channels', ['in_app'])
        
        # Add user context to test data
        test_data.update({
            'user_name': f"{g.current_user.get('first_name', '')} {g.current_user.get('last_name', '')}",
            'user_email': g.current_user.get('email', ''),
            'timestamp': datetime.now().isoformat()
        })
        
        # Use database function to render template
        rendered = Database.execute_one("""
            SELECT title, message, channels 
            FROM render_notification_template(%s, %s, %s::jsonb)
        """, (template['name'], tenant_id, json.dumps(test_data)))
        
        if not rendered:
            return jsonify({'error': 'Failed to render template'}), 500
        
        # Send test notification using the existing notification service
        from app.services.notification_service import NotificationService
        
        # Create test notification directly (bypassing template system for testing)
        test_notification_id = Database.execute_insert("""
            INSERT INTO notifications (user_id, type, title, message, data)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            user_id, 
            f"test_{template['name']}", 
            rendered['title'], 
            rendered['message'],
            JSONUtils.safe_json_dumps(test_data)
        ))
        
        return jsonify({
            'message': 'Test notification sent successfully',
            'rendered_title': rendered['title'],
            'rendered_message': rendered['message'],
            'test_data': test_data,
            'test_notification_id': test_notification_id
        }), 200
        
    except Exception as e:
        logger.error(f"Error testing notification template: {e}")
        return jsonify({'error': 'Failed to test template'}), 500


# ===============================
# NOTIFICATION HISTORY
# ===============================

@notification_mgmt_bp.route('/notifications/history', methods=['GET'])
@require_auth
@require_permissions(['manage_notifications', 'view_admin_dashboard'])
def get_notification_history():
    """Get notification history with filtering"""
    try:
        tenant_id = g.current_user['tenant_id']
        page, limit = validate_pagination_params(
            request.args.get('page', 1),
            request.args.get('limit', 50)
        )
        
        # Filters
        user_id = request.args.get('user_id')
        notification_type = request.args.get('type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        is_read = request.args.get('is_read')
        
        # Build query - join with users to filter by tenant
        where_conditions = ["u.tenant_id = %s"]
        params = [tenant_id]
        
        if user_id:
            where_conditions.append("n.user_id = %s")
            params.append(user_id)
            
        if notification_type:
            where_conditions.append("n.type = %s")
            params.append(notification_type)
            
        if start_date:
            where_conditions.append("n.created_at >= %s")
            params.append(start_date)
            
        if end_date:
            where_conditions.append("n.created_at <= %s")
            params.append(end_date)
            
        if is_read is not None:
            where_conditions.append("n.is_read = %s")
            params.append(is_read.lower() == 'true')
        
        where_clause = " AND ".join(where_conditions)
        offset = (page - 1) * limit
        
        # Get notifications
        query = f"""
            SELECT n.id, n.type, n.title, n.message, n.is_read, n.created_at, n.read_at,
                   u.username, u.email, u.first_name, u.last_name,
                   n.data
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            WHERE {where_clause}
            ORDER BY n.created_at DESC
            LIMIT %s OFFSET %s
        """
        params.extend([limit, offset])
        
        notifications = Database.execute_query(query, params)
        
        # Get total count
        count_query = f"""
            SELECT COUNT(*) as total 
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            WHERE {where_clause}
        """
        total_result = Database.execute_one(count_query, params[:-2])
        total = total_result['total'] if total_result else 0
        
        # Process notifications data
        for notification in notifications:
            if notification['data']:
                notification['data'] = JSONUtils.safe_parse_json(notification['data'], {})
        
        return jsonify({
            'notifications': notifications,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total,
                'pages': (total + limit - 1) // limit
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting notification history: {e}")
        return jsonify({'error': 'Failed to retrieve notification history'}), 500


# ===============================
# NOTIFICATION ANALYTICS
# ===============================

@notification_mgmt_bp.route('/notifications/analytics', methods=['GET'])
@require_auth
@require_permissions(['manage_notifications', 'view_admin_dashboard'])
def get_notification_analytics():
    """Get notification analytics using existing database views"""
    try:
        tenant_id = g.current_user['tenant_id']
        
        # Get date range from query params
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Default to last 30 days if no dates provided
        if not start_date:
            start_date = (datetime.now() - timedelta(days=30)).isoformat()
        if not end_date:
            end_date = datetime.now().isoformat()
        
        # Get overall statistics using tenant filtering
        overall_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) as read_notifications,
                COUNT(CASE WHEN n.is_read = false THEN 1 END) as unread_notifications,
                COUNT(DISTINCT n.user_id) as unique_users,
                COUNT(DISTINCT n.type) as unique_types,
                ROUND(AVG(CASE WHEN n.is_read = true THEN 
                    EXTRACT(EPOCH FROM (n.read_at - n.created_at))/3600 
                END), 2) as avg_read_time_hours
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            WHERE u.tenant_id = %s
            AND n.created_at >= %s AND n.created_at <= %s
        """, (tenant_id, start_date, end_date))
        
        # Get notifications by type (filtered by tenant)
        by_type = Database.execute_query("""
            SELECT 
                n.type,
                COUNT(*) as count,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) as read_count,
                ROUND(COUNT(CASE WHEN n.is_read = true THEN 1 END)::float / COUNT(*) * 100, 2) as read_rate,
                ROUND(AVG(CASE WHEN n.is_read = true THEN 
                    EXTRACT(EPOCH FROM (n.read_at - n.created_at))/3600 
                END), 2) as avg_read_time_hours
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            WHERE u.tenant_id = %s
            AND n.created_at >= %s AND n.created_at <= %s
            GROUP BY n.type
            ORDER BY count DESC
        """, (tenant_id, start_date, end_date))
        
        # Get daily notification counts
        daily_counts = Database.execute_query("""
            SELECT 
                DATE(n.created_at) as date,
                COUNT(*) as total,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) as read
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            WHERE u.tenant_id = %s
            AND n.created_at >= %s AND n.created_at <= %s
            GROUP BY DATE(n.created_at)
            ORDER BY date DESC
        """, (tenant_id, start_date, end_date))
        
        # Get top users by notification count
        top_users = Database.execute_query("""
            SELECT 
                u.username, u.first_name, u.last_name,
                COUNT(*) as notification_count,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) as read_count,
                ROUND(COUNT(CASE WHEN n.is_read = true THEN 1 END)::float / COUNT(*) * 100, 2) as read_rate
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            WHERE u.tenant_id = %s
            AND n.created_at >= %s AND n.created_at <= %s
            GROUP BY u.id, u.username, u.first_name, u.last_name
            ORDER BY notification_count DESC
            LIMIT 10
        """, (tenant_id, start_date, end_date))
        
        # Get read rate by hour of day
        hourly_read_rates = Database.execute_query("""
            SELECT 
                EXTRACT(HOUR FROM n.created_at) as hour,
                COUNT(*) as total,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) as read,
                ROUND(COUNT(CASE WHEN n.is_read = true THEN 1 END)::float / COUNT(*) * 100, 2) as read_rate
            FROM notifications n
            JOIN users u ON n.user_id = u.id
            WHERE u.tenant_id = %s
            AND n.created_at >= %s AND n.created_at <= %s
            GROUP BY EXTRACT(HOUR FROM n.created_at)
            ORDER BY hour
        """, (tenant_id, start_date, end_date))
        
        # Get template usage stats (use existing view filtered by tenant)
        template_stats = Database.execute_query("""
            SELECT template_name, usage_count, weekly_usage, monthly_usage, last_used
            FROM template_usage_stats
            WHERE tenant_id = %s
            ORDER BY usage_count DESC
            LIMIT 20
        """, (tenant_id,))
        
        # Get notification stats from existing view (need to filter by tenant)
        notification_stats = Database.execute_query("""
            SELECT type, total_notifications, read_notifications, unread_notifications, 
                   read_percentage, last_notification
            FROM notification_stats
            ORDER BY total_notifications DESC
        """)
        
        # Calculate read rate
        total = overall_stats['total_notifications'] or 0
        read = overall_stats['read_notifications'] or 0
        read_rate = round((read / total * 100), 2) if total > 0 else 0
        
        return jsonify({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'overall_stats': {
                **overall_stats,
                'read_rate': read_rate
            },
            'by_type': by_type,
            'daily_counts': daily_counts,
            'top_users': top_users,
            'hourly_read_rates': hourly_read_rates,
            'template_stats': template_stats,
            'notification_stats': notification_stats
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting notification analytics: {e}")
        return jsonify({'error': 'Failed to retrieve analytics'}), 500


# ===============================
# BULK OPERATIONS
# ===============================

@notification_mgmt_bp.route('/notification-templates/bulk', methods=['POST'])
@require_auth
@require_permissions(['manage_notifications'])
@audit_log('bulk_template_operation', 'notification_template')
def bulk_template_operations():
    """Perform bulk operations on notification templates"""
    try:
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        
        if not validate_required_fields(data, ['operation', 'template_ids']):
            return jsonify({'error': 'Missing required fields'}), 400
        
        operation = data['operation']
        template_ids = data['template_ids']
        
        if not isinstance(template_ids, list) or not template_ids:
            return jsonify({'error': 'template_ids must be a non-empty array'}), 400
        
        # Validate all template IDs
        for template_id in template_ids:
            if not validate_uuid(template_id):
                return jsonify({'error': f'Invalid template ID: {template_id}'}), 400
        
        # Verify all templates belong to tenant
        placeholders = ','.join(['%s'] * len(template_ids))
        templates = Database.execute_query(f"""
            SELECT nt.id, nt.name, COALESCE(tus.usage_count, 0) as usage_count
            FROM notification_templates nt
            LEFT JOIN template_usage_stats tus ON nt.name = tus.template_name AND nt.tenant_id = tus.tenant_id
            WHERE nt.tenant_id = %s AND nt.id IN ({placeholders})
        """, [tenant_id] + template_ids)
        
        found_ids = [t['id'] for t in templates]
        missing_ids = [tid for tid in template_ids if tid not in found_ids]
        
        if missing_ids:
            return jsonify({
                'error': 'Some templates not found',
                'missing_ids': missing_ids
            }), 404
        
        results = {'success': [], 'failed': []}
        
        if operation == 'activate':
            # Activate templates
            Database.execute_query(f"""
                UPDATE notification_templates 
                SET is_active = true
                WHERE tenant_id = %s AND id IN ({placeholders})
            """, [tenant_id] + template_ids)
            
            results['success'] = template_ids
            message = f"Activated {len(template_ids)} templates"
            
        elif operation == 'deactivate':
            # Deactivate templates
            Database.execute_query(f"""
                UPDATE notification_templates 
                SET is_active = false
                WHERE tenant_id = %s AND id IN ({placeholders})
            """, [tenant_id] + template_ids)
            
            results['success'] = template_ids
            message = f"Deactivated {len(template_ids)} templates"
            
        elif operation == 'delete':
            # Check usage for each template before deletion
            for template in templates:
                if template['usage_count'] > 0:
                    # Soft delete (deactivate)
                    Database.execute_query("""
                        UPDATE notification_templates 
                        SET is_active = false
                        WHERE id = %s
                    """, (template['id'],))
                    results['success'].append(template['id'])
                else:
                    # Hard delete
                    Database.execute_query("""
                        DELETE FROM notification_templates WHERE id = %s
                    """, (template['id'],))
                    results['success'].append(template['id'])
            
            message = f"Deleted {len(results['success'])} templates"
            
        else:
            return jsonify({'error': f'Unknown operation: {operation}'}), 400
        
        return jsonify({
            'message': message,
            'results': results
        }), 200
        
    except Exception as e:
        logger.error(f"Error performing bulk template operation: {e}")
        return jsonify({'error': 'Failed to perform bulk operation'}), 500


# ===============================
# TEMPLATE VARIABLES & VALIDATION
# ===============================

@notification_mgmt_bp.route('/notification-templates/variables', methods=['GET'])
@require_auth
@require_permissions(['manage_notifications'])
def get_available_variables():
    """Get available template variables by analyzing existing templates"""
    try:
        tenant_id = g.current_user['tenant_id']
        context = request.args.get('context', 'general')
        
        # Define common variables by context
        variable_definitions = {
            'general': [
                {'name': 'user_name', 'description': 'Full name of the user', 'example': 'John Doe'},
                {'name': 'user_email', 'description': 'Email address of the user', 'example': 'john@example.com'},
                {'name': 'timestamp', 'description': 'Current timestamp', 'example': '2024-01-15T10:30:00Z'}
            ],
            'task': [
                {'name': 'task_id', 'description': 'Unique task identifier', 'example': 'uuid-string'},
                {'name': 'task_name', 'description': 'Name of the task', 'example': 'Review Document'},
                {'name': 'workflow_title', 'description': 'Title of the workflow', 'example': 'Document Approval'},
                {'name': 'due_date', 'description': 'Task due date', 'example': '2024-01-20T17:00:00Z'},
                {'name': 'assigned_to', 'description': 'User assigned to task', 'example': 'Jane Smith'},
                {'name': 'approved_by_name', 'description': 'Name of approver', 'example': 'Manager Name'},
                {'name': 'rejected_by_name', 'description': 'Name of rejector', 'example': 'Manager Name'},
                {'name': 'returned_by_name', 'description': 'Name who returned task', 'example': 'Manager Name'},
                {'name': 'comments', 'description': 'Approval/rejection comments', 'example': 'Looks good'},
                {'name': 'rejection_reason', 'description': 'Reason for rejection', 'example': 'Missing information'},
                {'name': 'return_reason', 'description': 'Reason for return', 'example': 'Please update section 3'}
            ],
            'workflow': [
                {'name': 'workflow_instance_id', 'description': 'Workflow instance ID', 'example': 'uuid-string'},
                {'name': 'workflow_title', 'description': 'Title of the workflow', 'example': 'Purchase Request'},
                {'name': 'workflow_name', 'description': 'Name of the workflow template', 'example': 'procurement-workflow'},
                {'name': 'status', 'description': 'Current workflow status', 'example': 'In Progress'},
                {'name': 'duration', 'description': 'Workflow duration', 'example': '2 hours 30 minutes'},
                {'name': 'error_message', 'description': 'Error message for failures', 'example': 'Connection timeout'}
            ],
            'approval': [
                {'name': 'approval_id', 'description': 'Approval request ID', 'example': 'uuid-string'},
                {'name': 'amount', 'description': 'Amount requiring approval', 'example': '5000.00'},
                {'name': 'department', 'description': 'Requesting department', 'example': 'Marketing'},
                {'name': 'requestor', 'description': 'Person making the request', 'example': 'John Doe'},
                {'name': 'approval_url', 'description': 'URL to approval page', 'example': 'https://app.com/approvals/123'}
            ],
            'sla': [
                {'name': 'escalation_level', 'description': 'Numeric escalation level', 'example': '2'},
                {'name': 'level_text', 'description': 'Escalation level description', 'example': 'Critical'}
            ],
            'automation': [
                {'name': 'automation_status', 'description': 'Status of automation', 'example': 'success'},
                {'name': 'automation_type', 'description': 'Type of automation', 'example': 'email_send'},
                {'name': 'step_name', 'description': 'Name of automation step', 'example': 'Send Notification'},
                {'name': 'execution_id', 'description': 'Automation execution ID', 'example': 'exec-123'}
            ]
        }
        
        # Get variables for requested context, default to general
        variables = variable_definitions.get(context, variable_definitions['general'])
        
        # Add general variables to all contexts except general itself
        if context != 'general':
            variables.extend(variable_definitions['general'])
        
        # Extract variables from existing templates to show real usage
        template_variables = Database.execute_query("""
            SELECT DISTINCT 
                regexp_split_to_table(
                    regexp_replace(
                        regexp_replace(title_template || ' ' || message_template, '\\{\\{([^}]+)\\}\\}', '\\1', 'g'),
                        '[[:space:]]+', ' ', 'g'
                    ), 
                    ' '
                ) as variable_name
            FROM notification_templates
            WHERE tenant_id = %s AND is_active = true
        """, (tenant_id,))
        
        # Clean and add discovered variables
        discovered_vars = []
        for var in template_variables:
            var_name = var['variable_name'].strip()
            if var_name and '{{' not in var_name and '}}' not in var_name:
                discovered_vars.append({
                    'name': var_name,
                    'description': f'Variable used in existing templates',
                    'example': 'dynamic_value',
                    'discovered': True
                })
        
        return jsonify({
            'context': context,
            'variables': variables,
            'discovered_variables': discovered_vars[:20]  # Limit to prevent clutter
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting template variables: {e}")
        return jsonify({'error': 'Failed to retrieve variables'}), 500


@notification_mgmt_bp.route('/notification-templates/<template_id>/validate', methods=['POST'])
@require_auth
@require_permissions(['manage_notifications'])
def validate_template(template_id):
    """Validate notification template using database render function"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400
            
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        
        # Get template
        template = Database.execute_one("""
            SELECT * FROM notification_templates 
            WHERE id = %s AND tenant_id = %s
        """, (template_id, tenant_id))
        
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        
        # Get validation data
        test_data = data.get('test_data', {})
        
        validation_results = {
            'valid': True,
            'errors': [],
            'warnings': [],
            'parsed_title': '',
            'parsed_message': ''
        }
        
        try:
            # Use database function to render template
            rendered = Database.execute_one("""
                SELECT title, message, channels 
                FROM render_notification_template(%s, %s, %s::jsonb)
            """, (template['name'], tenant_id, json.dumps(test_data)))
            
            if rendered:
                validation_results['parsed_title'] = rendered['title']
                validation_results['parsed_message'] = rendered['message']
                validation_results['rendered_channels'] = JSONUtils.safe_parse_json(rendered['channels'], [])
            else:
                validation_results['valid'] = False
                validation_results['errors'].append("Template rendering failed")
            
            # Check for unresolved variables
            import re
            
            def find_unresolved_vars(text):
                return re.findall(r'\{\{([^}]+)\}\}', text)
            
            unresolved_title = find_unresolved_vars(validation_results['parsed_title'])
            unresolved_message = find_unresolved_vars(validation_results['parsed_message'])
            
            if unresolved_title:
                validation_results['warnings'].append(f"Unresolved variables in title: {', '.join(unresolved_title)}")
            
            if unresolved_message:
                validation_results['warnings'].append(f"Unresolved variables in message: {', '.join(unresolved_message)}")
            
            # Validate channels
            if template['channels']:
                channels = JSONUtils.safe_parse_json(template['channels'], [])
                valid_channels = ['in_app', 'email', 'sms']
                invalid_channels = [ch for ch in channels if ch not in valid_channels]
                
                if invalid_channels:
                    validation_results['errors'].append(f"Invalid channels: {', '.join(invalid_channels)}")
                    validation_results['valid'] = False
            
            # Additional template syntax validation
            if not template['title_template'].strip():
                validation_results['errors'].append("Title template is empty")
                validation_results['valid'] = False
                
            if not template['message_template'].strip():
                validation_results['errors'].append("Message template is empty")
                validation_results['valid'] = False
            
        except Exception as render_error:
            validation_results['valid'] = False
            validation_results['errors'].append(f"Template rendering error: {str(render_error)}")
        
        return jsonify(validation_results), 200
        
    except Exception as e:
        logger.error(f"Error validating template: {e}")
        return jsonify({'error': 'Failed to validate template'}), 500


# ===============================
# ADDITIONAL UTILITY ENDPOINTS
# ===============================

@notification_mgmt_bp.route('/notification-templates/<template_id>/render', methods=['POST'])
@require_auth
@require_permissions(['manage_notifications'])
def render_template_preview(template_id):
    """Render template with provided variables for preview"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400
            
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        
        # Get template
        template = Database.execute_one("""
            SELECT * FROM notification_templates 
            WHERE id = %s AND tenant_id = %s
        """, (template_id, tenant_id))
        
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        
        # Get variables
        variables = data.get('variables', {})
        
        # Use database function to render
        rendered = Database.execute_one("""
            SELECT title, message, channels 
            FROM render_notification_template(%s, %s, %s::jsonb)
        """, (template['name'], tenant_id, json.dumps(variables)))
        
        if not rendered:
            return jsonify({'error': 'Failed to render template'}), 500
        
        return jsonify({
            'rendered_title': rendered['title'],
            'rendered_message': rendered['message'],
            'channels': JSONUtils.safe_parse_json(rendered['channels'], []),
            'variables_used': variables
        }), 200
        
    except Exception as e:
        logger.error(f"Error rendering template preview: {e}")
        return jsonify({'error': 'Failed to render template'}), 500


@notification_mgmt_bp.route('/user-preferences/<user_id>', methods=['GET'])
@require_auth
@require_permissions(['manage_notifications', 'view_users'])
def get_user_notification_preferences(user_id):
    """Get user notification preferences using database function"""
    try:
        if not validate_uuid(user_id):
            return jsonify({'error': 'Invalid user ID'}), 400
            
        tenant_id = g.current_user['tenant_id']
        
        # Verify user belongs to tenant
        user = Database.execute_one("""
            SELECT id, notification_preferences 
            FROM users 
            WHERE id = %s AND tenant_id = %s
        """, (user_id, tenant_id))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get enabled channels using database function
        enabled_channels = Database.execute_one("""
            SELECT get_user_notification_channels(%s) as channels
        """, (user_id,))
        
        preferences = JSONUtils.safe_parse_json(user['notification_preferences'], {
            'email_enabled': True,
            'sms_enabled': False,
            'in_app_enabled': True
        })
        
        return jsonify({
            'user_id': user_id,
            'preferences': preferences,
            'enabled_channels': JSONUtils.safe_parse_json(enabled_channels['channels'] if enabled_channels else [], [])
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user notification preferences: {e}")
        return jsonify({'error': 'Failed to retrieve user preferences'}), 500