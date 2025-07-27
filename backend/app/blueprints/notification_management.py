# app/blueprints/notification_management.py - FIXED VERSION
"""
Notification Management API - Fixed version with error handling and compatibility
"""
from flask import Blueprint, current_app, request, jsonify, g
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
    """Get notification templates with filtering and pagination - FIXED"""
    try:
        tenant_id = g.current_user['tenant_id']
        page, limit = validate_pagination_params(
            request.args.get('page', 1),
            request.args.get('limit', 20)
        )
        
        # Filters
        is_active = request.args.get('is_active')
        search = request.args.get('search')
        
        # Build query - FIXED: Simplified to avoid view dependencies
        where_conditions = ["nt.tenant_id = %s"]
        params = [tenant_id]
            
        if is_active is not None:
            where_conditions.append("nt.is_active = %s")
            params.append(is_active.lower() == 'true')
            
        if search:
            where_conditions.append("(nt.name ILIKE %s OR nt.description ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])
        
        where_clause = " AND ".join(where_conditions)
        offset = (page - 1) * limit
        
        # FIXED: Simplified query without view dependencies
        query = f"""
            SELECT nt.id, nt.name, nt.description, nt.title_template, nt.message_template,
                   nt.channels, nt.is_active, nt.created_by, nt.created_at, nt.updated_at,
                   u.username as created_by_username,
                   -- Calculate usage stats inline
                   COALESCE(usage_stats.usage_count, 0) as usage_count,
                   COALESCE(usage_stats.weekly_usage, 0) as weekly_usage,
                   COALESCE(usage_stats.monthly_usage, 0) as monthly_usage,
                   usage_stats.last_used
            FROM notification_templates nt
            LEFT JOIN users u ON nt.created_by = u.id
            LEFT JOIN (
                SELECT 
                    type as template_name,
                    COUNT(*) as usage_count,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_usage,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_usage,
                    MAX(created_at) as last_used
                FROM notifications 
                WHERE tenant_id = %s
                GROUP BY type
            ) usage_stats ON nt.name = usage_stats.template_name
            WHERE {where_clause}
            ORDER BY nt.created_at DESC
            LIMIT %s OFFSET %s
        """
        params = [tenant_id] + params + [limit, offset]
        
        templates = Database.execute_query(query, params)
        
        # Get total count
        count_query = f"SELECT COUNT(*) as total FROM notification_templates nt WHERE {where_clause}"
        total_result = Database.execute_one(count_query, params[1:-2])  # Remove tenant_id, limit and offset
        total = total_result['total'] if total_result else 0
        
        # Process templates - FIXED: Better error handling
        for template in templates:
            if template['channels']:
                try:
                    template['channels'] = JSONUtils.safe_parse_json(template['channels'], [])
                except Exception as e:
                    logger.warning(f"Error parsing channels for template {template['id']}: {e}")
                    template['channels'] = ['in_app']  # Default fallback
        
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
    """Get single notification template - FIXED"""
    try:
        if not validate_uuid(template_id):
            return jsonify({'error': 'Invalid template ID'}), 400
            
        tenant_id = g.current_user['tenant_id']
        
        # FIXED: Simplified query without view dependencies
        template = Database.execute_one("""
            SELECT nt.*, 
                   u.username as created_by_username,
                   u.first_name as created_by_first_name,
                   u.last_name as created_by_last_name,
                   -- Calculate usage stats inline
                   COALESCE(usage_stats.usage_count, 0) as usage_count,
                   COALESCE(usage_stats.weekly_usage, 0) as weekly_usage,
                   COALESCE(usage_stats.monthly_usage, 0) as monthly_usage,
                   usage_stats.last_used
            FROM notification_templates nt
            LEFT JOIN users u ON nt.created_by = u.id
            LEFT JOIN (
                SELECT 
                    type as template_name,
                    COUNT(*) as usage_count,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_usage,
                    COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_usage,
                    MAX(created_at) as last_used
                FROM notifications 
                WHERE tenant_id = %s
                GROUP BY type
            ) usage_stats ON nt.name = usage_stats.template_name
            WHERE nt.id = %s AND nt.tenant_id = %s
        """, (tenant_id, template_id, tenant_id))
        
        if not template:
            return jsonify({'error': 'Template not found'}), 404
        
        # Parse JSON fields - FIXED: Better error handling
        if template['channels']:
            try:
                template['channels'] = JSONUtils.safe_parse_json(template['channels'], [])
            except Exception as e:
                logger.warning(f"Error parsing channels for template {template_id}: {e}")
                template['channels'] = ['in_app']
        
        return jsonify({'template': template}), 200
        
    except Exception as e:
        logger.error(f"Error getting notification template: {e}")
        return jsonify({'error': 'Failed to retrieve template'}), 500


@notification_mgmt_bp.route('/notification-templates', methods=['POST'])
@require_auth
@require_permissions(['manage_notifications'])
@audit_log('create_notification_template', 'notification_template')
def create_notification_template():
    """Create new notification template - FIXED"""
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
        
        # Prepare data - FIXED: Better JSON handling
        channels_data = data.get('channels', ['in_app'])
        try:
            channels = JSONUtils.safe_json_dumps(channels_data)
        except Exception as e:
            logger.warning(f"Error serializing channels: {e}")
            channels = JSONUtils.safe_json_dumps(['in_app'])
        
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
    """Update notification template - FIXED"""
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
        
        # Handle JSON fields - FIXED: Better error handling
        if 'channels' in data:
            try:
                channels_json = JSONUtils.safe_json_dumps(data['channels'])
                update_fields.append("channels = %s")
                params.append(channels_json)
            except Exception as e:
                logger.warning(f"Error serializing channels during update: {e}")
                # Skip channels update if serialization fails
        
        if not update_fields:
            return jsonify({'error': 'No fields to update'}), 400
        
        # Add updated_at field
        update_fields.append("updated_at = NOW()")
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


@notification_mgmt_bp.route('/notification-templates/<template_id>/test', methods=['POST'])
@require_auth
@require_permissions(['manage_notifications'])
@audit_log('test_notification_template', 'notification_template')
def test_notification_template(template_id):
    """Test notification template - FIXED"""
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
        
        # Add user context to test data
        test_data.update({
            'user_name': f"{g.current_user.get('first_name', '')} {g.current_user.get('last_name', '')}",
            'user_email': g.current_user.get('email', ''),
            'timestamp': datetime.now().isoformat()
        })
        
        # FIXED: Simple template rendering (fallback if DB function doesn't exist)
        try:
            # Try using database function first
            rendered = Database.execute_one("""
                SELECT title, message, channels 
                FROM render_notification_template(%s, %s, %s::jsonb)
            """, (template['name'], tenant_id, json.dumps(test_data)))
        except Exception as db_error:
            logger.warning(f"Database render function failed, using Python fallback: {db_error}")
            # Fallback to Python template rendering
            rendered = {
                'title': simple_template_render(template['title_template'], test_data),
                'message': simple_template_render(template['message_template'], test_data),
                'channels': template['channels']
            }
        
        if not rendered:
            return jsonify({'error': 'Failed to render template'}), 500
        
        # Send test notification using the existing notification service
        from app.services.notification_service import NotificationService
        
        # Create test notification directly
        test_notification_id = Database.execute_insert("""
            INSERT INTO notifications (user_id, type, title, message, data, tenant_id)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            user_id, 
            f"test_{template['name']}", 
            rendered['title'], 
            rendered['message'],
            JSONUtils.safe_json_dumps(test_data),
            tenant_id
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


def simple_template_render(template, data):
    """Simple template rendering as fallback"""
    import re
    
    def replace_var(match):
        var_name = match.group(1)
        return str(data.get(var_name, f"{{{{{var_name}}}}}"))  # Keep unresolved variables
    
    return re.sub(r'\{\{([^}]+)\}\}', replace_var, template)


# ===============================
# NOTIFICATION HISTORY
# ===============================

@notification_mgmt_bp.route('/notifications/history', methods=['GET'])
@require_auth
@require_permissions(['manage_notifications', 'view_admin_dashboard'])
def get_notification_history():
    """Get notification history with filtering"""
    try:
        page, limit = validate_pagination_params(
            request.args.get('page', 1),
            request.args.get('limit', 50)
        )
        offset = (page - 1) * limit

        # Filters
        user_id = request.args.get('user_id')
        notification_type = request.args.get('type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        is_read = request.args.get('is_read')

        def build_where_clause(base_field):
            where_conditions = []
            params = []

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

            if is_read != '' and is_read is not None:
                where_conditions.append("n.is_read = %s")
                params.append(is_read.lower() == 'true')

            if where_conditions:
                return " AND ".join(where_conditions), params
            else:
                return "TRUE", []  # No filter; return all rows

        try:
            where_clause, params = build_where_clause("n")

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
            query_params = params + [limit, offset]
            notifications = Database.execute_query(query, query_params)

            count_query = f"""
                SELECT COUNT(*) as total
                FROM notifications n
                JOIN users u ON n.user_id = u.id
                WHERE {where_clause}
            """
            total_result = Database.execute_one(count_query, params)

        except Exception as e:
            logger.warning(f"Primary query failed, retrying fallback: {e}")

            # Fallback to user table still allowed
            where_clause, params = build_where_clause("u")

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
            query_params = params + [limit, offset]
            notifications = Database.execute_query(query, query_params)

            count_query = f"""
                SELECT COUNT(*) as total
                FROM notifications n
                JOIN users u ON n.user_id = u.id
                WHERE {where_clause}
            """
            total_result = Database.execute_one(count_query, params)

        total = total_result['total'] if total_result else 0

        for n in notifications:
            if n.get('data'):
                try:
                    n['data'] = JSONUtils.safe_parse_json(n['data'], {})
                except Exception as e:
                    logger.warning(f"Error parsing notification data: {e}")
                    n['data'] = {}

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
        logger.error(f"Error getting notification history: {e}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve notification history'}), 500


# @notification_mgmt_bp.route('/notifications/history', methods=['GET'])
# @require_auth
# @require_permissions(['manage_notifications', 'view_admin_dashboard'])
# def get_notification_history():
#     """Get notification history with filtering"""
#     try:
#         tenant_id = g.current_user['tenant_id']
#         page, limit = validate_pagination_params(
#             request.args.get('page', 1),
#             request.args.get('limit', 50)
#         )
#         offset = (page - 1) * limit

#         # Filters
#         user_id = request.args.get('user_id')
#         notification_type = request.args.get('type')
#         start_date = request.args.get('start_date')
#         end_date = request.args.get('end_date')
#         is_read = request.args.get('is_read')

#         def build_where_clause(base_field):
#             where_conditions = [f"{base_field}.tenant_id = %s"]
#             params = [tenant_id]
            
#             if user_id:
#                 where_conditions.append("n.user_id = %s")
#                 params.append(user_id)

#             if notification_type:
#                 where_conditions.append("n.type = %s")
#                 params.append(notification_type)

#             if start_date:
#                 where_conditions.append("n.created_at >= %s")
#                 params.append(start_date)

#             if end_date:
#                 where_conditions.append("n.created_at <= %s")
#                 params.append(end_date)

#             if is_read != '' and is_read is not None:
#                 where_conditions.append("n.is_read = %s")
#                 params.append(is_read.lower() == 'true')

#             return " AND ".join(where_conditions), params

#         # Try first query (assuming notifications.tenant_id exists)
#         try:
#             where_clause, params = build_where_clause("n")

#             query = f"""
#                 SELECT n.id, n.type, n.title, n.message, n.is_read, n.created_at, n.read_at,
#                        u.username, u.email, u.first_name, u.last_name,
#                        n.data
#                 FROM notifications n
#                 JOIN users u ON n.user_id = u.id
#                 WHERE {where_clause}
#                 ORDER BY n.created_at DESC
#                 LIMIT %s OFFSET %s
#             """
#             query_params = params + [limit, offset]
#             notifications = Database.execute_query(query, query_params)

#             count_query = f"""
#                 SELECT COUNT(*) as total
#                 FROM notifications n
#                 JOIN users u ON n.user_id = u.id
#                 WHERE {where_clause}
#             """
#             total_result = Database.execute_one(count_query, params)

#         except Exception as e:
#             logger.warning(f"Primary query failed, retrying with user.tenant_id: {e}")

#             # Fallback to users.tenant_id
#             where_clause, params = build_where_clause("u")

#             query = f"""
#                 SELECT n.id, n.type, n.title, n.message, n.is_read, n.created_at, n.read_at,
#                        u.username, u.email, u.first_name, u.last_name,
#                        n.data
#                 FROM notifications n
#                 JOIN users u ON n.user_id = u.id
#                 WHERE {where_clause}
#                 ORDER BY n.created_at DESC
#                 LIMIT %s OFFSET %s
#             """
#             query_params = params + [limit, offset]
#             notifications = Database.execute_query(query, query_params)

#             count_query = f"""
#                 SELECT COUNT(*) as total
#                 FROM notifications n
#                 JOIN users u ON n.user_id = u.id
#                 WHERE {where_clause}
#             """
#             total_result = Database.execute_one(count_query, params)

#         total = total_result['total'] if total_result else 0

#         # Parse JSON field if exists
#         for n in notifications:
#             if n.get('data'):
#                 try:
#                     n['data'] = JSONUtils.safe_parse_json(n['data'], {})
#                 except Exception as e:
#                     logger.warning(f"Error parsing notification data: {e}")
#                     n['data'] = {}

#         return jsonify({
#             'notifications': notifications,
#             'pagination': {
#                 'page': page,
#                 'limit': limit,
#                 'total': total,
#                 'pages': (total + limit - 1) // limit
#             }
#         }), 200

#     except Exception as e:
#         logger.error(f"Error getting notification history: {e}", exc_info=True)
#         return jsonify({'error': 'Failed to retrieve notification history'}), 500


# ===============================
# NOTIFICATION ANALYTICS
# ===============================

@notification_mgmt_bp.route('/notifications/analytics', methods=['GET'])
@require_auth
@require_permissions(['manage_notifications', 'view_admin_dashboard'])
def get_notification_analytics():
    """Get notification analytics - PROPERLY FIXED"""
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
        
        # FIXED: Properly detect if notifications table has tenant_id column
        has_tenant_id_column = False
        try:
            # Test if tenant_id column exists by running a simple query
            Database.execute_one("""
                SELECT tenant_id FROM notifications LIMIT 1
            """)
            has_tenant_id_column = True
            logger.debug("notifications table has tenant_id column")
        except Exception as e:
            logger.debug(f"notifications table does not have tenant_id column: {e}")
            has_tenant_id_column = False
        
        # Choose the appropriate filtering strategy
        if has_tenant_id_column:
            # Use direct tenant filtering on notifications table
            base_where = "n.tenant_id = %s AND n.created_at >= %s AND n.created_at <= %s"
            base_params = [tenant_id, start_date, end_date]
            join_clause = "LEFT JOIN users u ON n.user_id = u.id"
        else:
            # Filter through users table (tenant isolation)
            base_where = "u.tenant_id = %s AND n.created_at >= %s AND n.created_at <= %s"
            base_params = [tenant_id, start_date, end_date]
            join_clause = "JOIN users u ON n.user_id = u.id"
        
        # Get overall statistics
        overall_stats_query = f"""
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) as read_notifications,
                COUNT(CASE WHEN n.is_read = false THEN 1 END) as unread_notifications,
                COUNT(DISTINCT n.user_id) as unique_users,
                COUNT(DISTINCT n.type) as unique_types,
                ROUND(
                    COALESCE(AVG(EXTRACT(EPOCH FROM (n.read_at - n.created_at)) / 3600), 0)::numeric,
                    2
                ) AS avg_read_time_hours

            FROM notifications n
            {join_clause}
            WHERE {base_where}
        """
        
        overall_stats = Database.execute_one(overall_stats_query, base_params)
        
        # Get notifications by type
        by_type_query = f"""
            SELECT 
                n.type,
                COUNT(*) AS count,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) AS read_count,
                ROUND(
                    COALESCE(COUNT(CASE WHEN n.is_read = true THEN 1 END)::decimal 
                    / NULLIF(COUNT(*), 0) * 100, 0),
                    2
                ) AS read_rate,
                ROUND(
                    COALESCE(AVG(
                        CASE 
                            WHEN n.is_read = true AND n.read_at IS NOT NULL 
                            THEN EXTRACT(EPOCH FROM (n.read_at - n.created_at)) / 3600
                        END
                    ), 0)::numeric,
                    2
                ) AS avg_read_time_hours
            FROM notifications n
            {join_clause}
            WHERE {base_where}
            GROUP BY n.type
            ORDER BY count DESC
        """

        
        by_type = Database.execute_query(by_type_query, base_params)
        
        # Get daily notification counts
        daily_counts_query = f"""
            SELECT 
                DATE(n.created_at) as date,
                COUNT(*) as total,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) as read
            FROM notifications n
            {join_clause}
            WHERE {base_where}
            GROUP BY DATE(n.created_at)
            ORDER BY date DESC
            LIMIT 30
        """
        
        daily_counts = Database.execute_query(daily_counts_query, base_params)
        
        # Get top users by notification count
        top_users_query = f"""
            SELECT 
                u.username, 
                u.first_name, 
                u.last_name,
                COUNT(*) as notification_count,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) as read_count,
                ROUND(
                    COALESCE(COUNT(CASE WHEN n.is_read = true THEN 1 END)::decimal 
                    / NULLIF(COUNT(*), 0) * 100, 0),
                    2
                ) as read_rate
            FROM notifications n
            {join_clause}
            WHERE {base_where}
            GROUP BY u.id, u.username, u.first_name, u.last_name
            ORDER BY notification_count DESC
            LIMIT 10
        """
        
        top_users = Database.execute_query(top_users_query, base_params)
        
        # Get template usage stats (simplified without view dependency)
        if has_tenant_id_column:
            template_stats_query = """
                SELECT 
                    n.type as template_name,
                    COUNT(*) as usage_count,
                    COUNT(CASE WHEN n.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_usage,
                    COUNT(CASE WHEN n.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_usage,
                    MAX(n.created_at) as last_used
                FROM notifications n
                WHERE n.tenant_id = %s
                GROUP BY n.type
                ORDER BY usage_count DESC
                LIMIT 20
            """
            template_params = [tenant_id]
        else:
            template_stats_query = """
                SELECT 
                    n.type as template_name,
                    COUNT(*) as usage_count,
                    COUNT(CASE WHEN n.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_usage,
                    COUNT(CASE WHEN n.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_usage,
                    MAX(n.created_at) as last_used
                FROM notifications n
                JOIN users u ON n.user_id = u.id
                WHERE u.tenant_id = %s
                GROUP BY n.type
                ORDER BY usage_count DESC
                LIMIT 20
            """
            template_params = [tenant_id]
        
        template_stats = Database.execute_query(template_stats_query, template_params)
        
        # Get hourly read rates for better insights
        hourly_read_rates_query = f"""
            SELECT 
                EXTRACT(HOUR FROM n.created_at) as hour,
                COUNT(*) as total,
                COUNT(CASE WHEN n.is_read = true THEN 1 END) as read,
                ROUND(
                    COALESCE(COUNT(CASE WHEN n.is_read = true THEN 1 END)::decimal 
                    / NULLIF(COUNT(*), 0) * 100, 0),
                    2
                ) as read_rate

            FROM notifications n
            {join_clause}
            WHERE {base_where}
            GROUP BY EXTRACT(HOUR FROM n.created_at)
            ORDER BY hour
        """
        
        hourly_read_rates = Database.execute_query(hourly_read_rates_query, base_params)
        
        # Calculate overall read rate safely
        total = overall_stats['total_notifications'] or 0
        read = overall_stats['read_notifications'] or 0
        read_rate = round((read / total * 100), 2) if total > 0 else 0
        
        # Format daily counts dates for better frontend consumption
        for day_data in daily_counts:
            if day_data['date']:
                day_data['date'] = day_data['date'].isoformat() if hasattr(day_data['date'], 'isoformat') else str(day_data['date'])
        
        # Format template stats last_used dates
        for template in template_stats:
            if template['last_used']:
                template['last_used'] = template['last_used'].isoformat() if hasattr(template['last_used'], 'isoformat') else str(template['last_used'])
        
        return jsonify({
            'period': {
                'start_date': start_date,
                'end_date': end_date
            },
            'overall_stats': {
                'total_notifications': overall_stats['total_notifications'] or 0,
                'read_notifications': overall_stats['read_notifications'] or 0,
                'unread_notifications': overall_stats['unread_notifications'] or 0,
                'unique_users': overall_stats['unique_users'] or 0,
                'unique_types': overall_stats['unique_types'] or 0,
                'avg_read_time_hours': overall_stats['avg_read_time_hours'] or 0,
                'read_rate': read_rate
            },
            'by_type': by_type or [],
            'daily_counts': daily_counts or [],
            'top_users': top_users or [],
            'template_stats': template_stats or [],
            'hourly_read_rates': hourly_read_rates or [],
            'metadata': {
                'has_tenant_id_column': has_tenant_id_column,
                'filtering_method': 'direct' if has_tenant_id_column else 'through_users',
                'total_queries_executed': 6
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting notification analytics: {e}", exc_info=True)
        
        # Return a more detailed error response for debugging
        error_details = {
            'error': 'Failed to retrieve analytics',
            'details': str(e),
            'tenant_id': g.current_user.get('tenant_id') if hasattr(g, 'current_user') else None,
            'parameters': {
                'start_date': start_date if 'start_date' in locals() else None,
                'end_date': end_date if 'end_date' in locals() else None
            }
        }
        
        # In development, include more debugging info
        if current_app.config.get('ENV') == 'development':
            import traceback
            error_details['traceback'] = traceback.format_exc()
        
        return jsonify(error_details), 500

# ===============================
# UTILITY ENDPOINTS
# ===============================

@notification_mgmt_bp.route('/notification-templates/variables', methods=['GET'])
@require_auth
@require_permissions(['manage_notifications'])
def get_available_variables():
    """Get available template variables"""
    try:
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
            ],
            'workflow': [
                {'name': 'workflow_instance_id', 'description': 'Workflow instance ID', 'example': 'uuid-string'},
                {'name': 'workflow_title', 'description': 'Title of the workflow', 'example': 'Purchase Request'},
                {'name': 'status', 'description': 'Current workflow status', 'example': 'In Progress'},
            ],
            'approval': [
                {'name': 'approval_id', 'description': 'Approval request ID', 'example': 'uuid-string'},
                {'name': 'amount', 'description': 'Amount requiring approval', 'example': '5000.00'},
                {'name': 'department', 'description': 'Requesting department', 'example': 'Marketing'},
            ]
        }
        
        # Get variables for requested context
        variables = variable_definitions.get(context, variable_definitions['general'])
        
        # Add general variables to all contexts except general itself
        if context != 'general':
            variables.extend(variable_definitions['general'])
        
        return jsonify({
            'context': context,
            'variables': variables
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting template variables: {e}")
        return jsonify({'error': 'Failed to retrieve variables'}), 500


# ===============================
# ERROR HANDLERS
# ===============================

@notification_mgmt_bp.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request', 'message': str(error)}), 400

@notification_mgmt_bp.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Not found', 'message': str(error)}), 404

@notification_mgmt_bp.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error in notification management: {error}")
    return jsonify({'error': 'Internal server error'}), 500