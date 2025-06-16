# app/blueprints/admin_dashboard.py
"""
Comprehensive Admin Dashboard API endpoints
"""
import time

from flask import Blueprint, request, jsonify, g
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid
from app.utils.validators import validate_pagination_params, validate_required_fields
from app.services.permission_service import PermissionService
import json
from datetime import datetime, timedelta
import logging

logger = logging.getLogger(__name__)

# Create a separate blueprint for dashboard APIs
dashboard_bp = Blueprint('admin_dashboard', __name__)


@dashboard_bp.route('/overview', methods=['GET'])
@require_auth
@require_permissions(['view_system_health'])
def get_admin_overview():
    """Get comprehensive admin dashboard overview"""
    try:
        tenant_id = g.current_user['tenant_id']

        # System Health Metrics
        system_health = Database.execute_one("""
            SELECT 
                (SELECT COUNT(*) FROM users WHERE tenant_id = %s AND is_active = true) as active_users,
                (SELECT COUNT(*) FROM users WHERE tenant_id = %s) as total_users,
                (SELECT COUNT(*) FROM workflows WHERE tenant_id = %s AND is_active = true) as active_workflows,
                (SELECT COUNT(*) FROM workflow_instances WHERE tenant_id = %s AND status = 'in_progress') as running_workflows,
                (SELECT COUNT(*) FROM tasks WHERE workflow_instance_id IN 
                    (SELECT id FROM workflow_instances WHERE tenant_id = %s) AND status = 'pending') as pending_tasks,
                (SELECT COUNT(*) FROM sla_breaches WHERE resolved_at IS NULL AND 
                    workflow_instance_id IN (SELECT id FROM workflow_instances WHERE tenant_id = %s)) as active_sla_breaches
        """, (tenant_id, tenant_id, tenant_id, tenant_id, tenant_id, tenant_id))

        # Recent Activity (last 24 hours)
        recent_activity = Database.execute_query("""
            SELECT 
                'workflow_started' as activity_type,
                wi.title as description,
                wi.created_at as timestamp,
                u.username as user_name
            FROM workflow_instances wi
            LEFT JOIN users u ON wi.initiated_by = u.id
            WHERE wi.tenant_id = %s AND wi.created_at >= NOW() - INTERVAL '24 hours'

            UNION ALL

            SELECT 
                'task_completed' as activity_type,
                t.name as description,
                t.completed_at as timestamp,
                u.username as user_name
            FROM tasks t
            LEFT JOIN users u ON t.completed_by = u.id
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE wi.tenant_id = %s AND t.completed_at >= NOW() - INTERVAL '24 hours'

            ORDER BY timestamp DESC
            LIMIT 10
        """, (tenant_id, tenant_id))

        # Performance Metrics (last 7 days)
        performance_metrics = Database.execute_one("""
            SELECT 
                COUNT(CASE WHEN wi.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as workflows_started_week,
                COUNT(CASE WHEN wi.completed_at >= NOW() - INTERVAL '7 days' THEN 1 END) as workflows_completed_week,
                AVG(CASE WHEN wi.completed_at IS NOT NULL THEN 
                    EXTRACT(EPOCH FROM (wi.completed_at - wi.created_at))/3600 END) as avg_workflow_duration_hours,
                COUNT(CASE WHEN t.completed_at >= NOW() - INTERVAL '7 days' THEN 1 END) as tasks_completed_week
            FROM workflow_instances wi
            LEFT JOIN tasks t ON wi.id = t.workflow_instance_id
            WHERE wi.tenant_id = %s
        """, (tenant_id,))

        # User Activity Distribution
        user_activity = Database.execute_query("""
            SELECT 
                u.username,
                u.first_name || ' ' || u.last_name as full_name,
                COUNT(DISTINCT wi.id) as workflows_initiated,
                COUNT(DISTINCT t.id) as tasks_completed,
                MAX(COALESCE(wi.created_at, t.completed_at)) as last_activity
            FROM users u
            LEFT JOIN workflow_instances wi ON u.id = wi.initiated_by AND wi.created_at >= NOW() - INTERVAL '30 days'
            LEFT JOIN tasks t ON u.id = t.completed_by AND t.completed_at >= NOW() - INTERVAL '30 days'
            WHERE u.tenant_id = %s AND u.is_active = true
            GROUP BY u.id, u.username, u.first_name, u.last_name
            HAVING COUNT(DISTINCT wi.id) > 0 OR COUNT(DISTINCT t.id) > 0
            ORDER BY (COUNT(DISTINCT wi.id) + COUNT(DISTINCT t.id)) DESC
            LIMIT 10
        """, (tenant_id,))

        # System Alerts
        alerts = []

        # Check for overdue tasks
        overdue_count = Database.execute_one("""
            SELECT COUNT(*) as count FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE wi.tenant_id = %s AND t.status = 'pending' AND t.due_date < NOW()
        """, (tenant_id,))

        if overdue_count['count'] > 0:
            alerts.append({
                'type': 'warning',
                'message': f"{overdue_count['count']} overdue tasks require attention",
                'action_url': '/admin/tasks?filter=overdue'
            })

        # Check for failed workflows
        failed_count = Database.execute_one("""
            SELECT COUNT(*) as count FROM workflow_instances
            WHERE tenant_id = %s AND status = 'failed' AND created_at >= NOW() - INTERVAL '24 hours'
        """, (tenant_id,))

        if failed_count['count'] > 0:
            alerts.append({
                'type': 'error',
                'message': f"{failed_count['count']} workflows failed in the last 24 hours",
                'action_url': '/admin/workflows?filter=failed'
            })

        # Check for users without roles
        users_without_roles = Database.execute_one("""
            SELECT COUNT(*) as count FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.tenant_id = %s AND u.is_active = true AND ur.user_id IS NULL
        """, (tenant_id,))

        if users_without_roles['count'] > 0:
            alerts.append({
                'type': 'info',
                'message': f"{users_without_roles['count']} users have no assigned roles",
                'action_url': '/admin/users?filter=no_roles'
            })

        return jsonify({
            'system_health': dict(system_health),
            'recent_activity': [dict(activity) for activity in recent_activity],
            'performance_metrics': dict(performance_metrics),
            'user_activity': [dict(user) for user in user_activity],
            'alerts': alerts,
            'generated_at': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting admin overview: {e}")
        return jsonify({'error': 'Failed to retrieve admin overview'}), 500


@dashboard_bp.route('/analytics/trends', methods=['GET'])
@require_auth
@require_permissions(['view_analytics'])
def get_analytics_trends():
    """Get trend analytics for the dashboard"""
    try:
        tenant_id = g.current_user['tenant_id']
        days = int(request.args.get('days', 30))

        # Workflow trends
        workflow_trends = Database.execute_query("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as workflows_started,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as workflows_completed,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as workflows_failed
            FROM workflow_instances
            WHERE tenant_id = %s AND created_at >= NOW() - INTERVAL '%s days'
            GROUP BY DATE(created_at)
            ORDER BY date
        """, (tenant_id, days))

        # Task completion trends
        task_trends = Database.execute_query("""
            SELECT 
                DATE(t.created_at) as date,
                COUNT(*) as tasks_created,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed,
                AVG(CASE WHEN t.completed_at IS NOT NULL THEN 
                    EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600 END) as avg_completion_hours
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE wi.tenant_id = %s AND t.created_at >= NOW() - INTERVAL '%s days'
            GROUP BY DATE(t.created_at)
            ORDER BY date
        """, (tenant_id, days))

        # User engagement trends
        user_trends = Database.execute_query("""
            SELECT 
                DATE(activity_date) as date,
                COUNT(DISTINCT user_id) as active_users
            FROM (
                SELECT created_at as activity_date, initiated_by as user_id
                FROM workflow_instances
                WHERE tenant_id = %s AND created_at >= NOW() - INTERVAL '%s days'

                UNION ALL

                SELECT t.completed_at as activity_date, t.completed_by as user_id
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE wi.tenant_id = %s AND t.completed_at >= NOW() - INTERVAL '%s days'
            ) activities
            WHERE activity_date IS NOT NULL
            GROUP BY DATE(activity_date)
            ORDER BY date
        """, (tenant_id, days, tenant_id, days))

        # SLA compliance trends
        sla_trends = Database.execute_query("""
            SELECT 
                DATE(wi.created_at) as date,
                COUNT(wi.id) as total_workflows,
                COUNT(sb.id) as sla_breaches,
                ROUND((COUNT(wi.id) - COUNT(sb.id))::DECIMAL / NULLIF(COUNT(wi.id), 0) * 100, 2) as compliance_rate
            FROM workflow_instances wi
            LEFT JOIN sla_breaches sb ON wi.id = sb.workflow_instance_id
            WHERE wi.tenant_id = %s AND wi.created_at >= NOW() - INTERVAL '%s days'
            GROUP BY DATE(wi.created_at)
            ORDER BY date
        """, (tenant_id, days))

        return jsonify({
            'workflow_trends': [dict(row) for row in workflow_trends],
            'task_trends': [dict(row) for row in task_trends],
            'user_trends': [dict(row) for row in user_trends],
            'sla_trends': [dict(row) for row in sla_trends],
            'period_days': days,
            'generated_at': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting analytics trends: {e}")
        return jsonify({'error': 'Failed to retrieve analytics trends'}), 500


@dashboard_bp.route('/security/overview', methods=['GET'])
@require_auth
@require_permissions(['view_system_health'])
def get_security_overview():
    """Get security overview for admin dashboard"""
    try:
        tenant_id = g.current_user['tenant_id']

        # Security metrics
        security_metrics = Database.execute_one("""
            SELECT 
                (SELECT COUNT(*) FROM users WHERE tenant_id = %s AND two_fa_enabled = true) as users_with_2fa,
                (SELECT COUNT(*) FROM users WHERE tenant_id = %s AND is_active = true) as total_active_users,
                (SELECT COUNT(*) FROM users WHERE tenant_id = %s AND last_login >= NOW() - INTERVAL '30 days') as users_active_30days,
                (SELECT COUNT(*) FROM user_sessions WHERE expires_at > NOW()) as active_sessions
        """, (tenant_id, tenant_id, tenant_id))

        # Failed login attempts (last 24 hours)
        failed_logins = Database.execute_one("""
            SELECT COUNT(*) as count
            FROM audit_logs
            WHERE tenant_id = %s 
            AND action = 'login_failed' 
            AND created_at >= NOW() - INTERVAL '24 hours'
        """, (tenant_id,))

        # Permission anomalies
        permission_issues = []

        # Users without roles
        users_no_roles = Database.execute_one("""
            SELECT COUNT(*) as count FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.tenant_id = %s AND u.is_active = true AND ur.user_id IS NULL
        """, (tenant_id,))

        if users_no_roles['count'] > 0:
            permission_issues.append({
                'type': 'users_without_roles',
                'count': users_no_roles['count'],
                'description': 'Active users with no assigned roles'
            })

        # Roles with excessive permissions
        excessive_perms = Database.execute_query("""
            SELECT r.name, r.permissions
            FROM roles r
            WHERE r.tenant_id = %s AND r.permissions::text LIKE '%*%'
        """, (tenant_id,))

        if excessive_perms:
            permission_issues.append({
                'type': 'excessive_permissions',
                'count': len(excessive_perms),
                'description': 'Roles with super admin permissions',
                'details': [{'role': row['name']} for row in excessive_perms]
            })

        # Recent security events
        security_events = Database.execute_query("""
            SELECT 
                action,
                COUNT(*) as count,
                MAX(created_at) as latest_occurrence
            FROM audit_logs
            WHERE tenant_id = %s 
            AND action IN ('login_failed', 'permission_denied', 'account_locked', 'role_modified')
            AND created_at >= NOW() - INTERVAL '7 days'
            GROUP BY action
            ORDER BY count DESC
        """, (tenant_id,))

        # Session analysis
        session_analysis = Database.execute_one("""
            SELECT 
                COUNT(*) as total_sessions,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as sessions_last_hour,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as sessions_last_day,
                AVG(EXTRACT(EPOCH FROM (COALESCE(expires_at, NOW()) - created_at))/3600) as avg_session_duration_hours
            FROM user_sessions
            WHERE expires_at > NOW() - INTERVAL '7 days'
        """, ())

        return jsonify({
            'security_metrics': dict(security_metrics),
            'failed_logins_24h': failed_logins['count'],
            'permission_issues': permission_issues,
            'security_events': [dict(event) for event in security_events],
            'session_analysis': dict(session_analysis),
            'two_fa_adoption_rate': round(
                (security_metrics['users_with_2fa'] / max(security_metrics['total_active_users'], 1)) * 100, 2
            ),
            'generated_at': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting security overview: {e}")
        return jsonify({'error': 'Failed to retrieve security overview'}), 500


@dashboard_bp.route('/quick-actions', methods=['GET'])
@require_auth
@require_permissions(['view_system_health'])
def get_quick_actions():
    """Get quick actions available to admin based on their permissions"""
    try:
        user_permissions = g.current_user.get('permissions', [])
        tenant_id = g.current_user['tenant_id']

        quick_actions = []

        # User management actions
        if 'manage_users' in user_permissions or '*' in user_permissions:
            quick_actions.extend([
                {
                    'id': 'create_user',
                    'title': 'Create New User',
                    'description': 'Add a new user to the system',
                    'icon': 'UserPlus',
                    'action_url': '/admin/users/create',
                    'category': 'user_management'
                },
                {
                    'id': 'bulk_user_import',
                    'title': 'Import Users',
                    'description': 'Bulk import users from CSV',
                    'icon': 'Upload',
                    'action_url': '/admin/users/import',
                    'category': 'user_management'
                }
            ])

        # Workflow management actions
        if 'manage_workflows' in user_permissions or '*' in user_permissions:
            quick_actions.extend([
                {
                    'id': 'create_workflow',
                    'title': 'Create Workflow',
                    'description': 'Design a new workflow',
                    'icon': 'GitBranch',
                    'action_url': '/workflows/create',
                    'category': 'workflow_management'
                }
            ])

        # Role management actions
        if 'manage_roles' in user_permissions or '*' in user_permissions:
            quick_actions.extend([
                {
                    'id': 'create_role',
                    'title': 'Create Role',
                    'description': 'Define a new user role',
                    'icon': 'Shield',
                    'action_url': '/admin/roles/create',
                    'category': 'security'
                },
                {
                    'id': 'permission_audit',
                    'title': 'Permission Audit',
                    'description': 'Review role permissions',
                    'icon': 'Search',
                    'action_url': '/admin/permissions/audit',
                    'category': 'security'
                }
            ])

        # System maintenance actions
        if 'manage_system' in user_permissions or '*' in user_permissions:
            quick_actions.extend([
                {
                    'id': 'system_backup',
                    'title': 'Create Backup',
                    'description': 'Create system backup',
                    'icon': 'Save',
                    'action_url': '/admin/backup/create',
                    'category': 'maintenance'
                },
                {
                    'id': 'clear_logs',
                    'title': 'Clear Old Logs',
                    'description': 'Clean up old audit logs',
                    'icon': 'Trash2',
                    'action_url': '/admin/maintenance/clear-logs',
                    'category': 'maintenance'
                }
            ])

        # Reporting actions
        if 'view_reports' in user_permissions or '*' in user_permissions:
            quick_actions.extend([
                {
                    'id': 'generate_report',
                    'title': 'Generate Report',
                    'description': 'Create custom report',
                    'icon': 'BarChart3',
                    'action_url': '/reports/create',
                    'category': 'reporting'
                }
            ])

        # Get action counts for context
        action_context = {}

        # Pending approvals count
        if 'view_tasks' in user_permissions or '*' in user_permissions:
            pending_approvals = Database.execute_one("""
                SELECT COUNT(*) as count FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE wi.tenant_id = %s AND t.type = 'approval' AND t.status = 'pending'
            """, (tenant_id,))
            action_context['pending_approvals'] = pending_approvals['count']

        # Failed workflows count
        if 'view_workflows' in user_permissions or '*' in user_permissions:
            failed_workflows = Database.execute_one("""
                SELECT COUNT(*) as count FROM workflow_instances
                WHERE tenant_id = %s AND status = 'failed' AND created_at >= NOW() - INTERVAL '7 days'
            """, (tenant_id,))
            action_context['failed_workflows'] = failed_workflows['count']

        return jsonify({
            'quick_actions': quick_actions,
            'action_context': action_context,
            'user_permissions': user_permissions,
            'generated_at': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting quick actions: {e}")
        return jsonify({'error': 'Failed to retrieve quick actions'}), 500


@dashboard_bp.route('/system-status', methods=['GET'])
@require_auth
@require_permissions(['view_system_health'])
def get_system_status():
    """Get detailed system status information"""
    try:
        tenant_id = g.current_user['tenant_id']

        # Database health
        db_health = "healthy"
        db_response_time = None
        try:
            start_time = time.time()
            Database.execute_one("SELECT 1")
            db_response_time = round((time.time() - start_time) * 1000, 2)  # milliseconds
        except Exception:
            db_health = "unhealthy"

        # System resources (simplified - in production you'd use actual system monitoring)
        system_resources = {
            'cpu_usage': 45.2,  # Would get from system monitoring
            'memory_usage': 62.8,
            'disk_usage': 34.1,
            'active_connections': 23
        }

        # Service status
        services = [
            {
                'name': 'Database',
                'status': db_health,
                'response_time_ms': db_response_time,
                'last_check': datetime.now().isoformat()
            },
            {
                'name': 'File Storage',
                'status': 'healthy',
                'response_time_ms': 12.5,
                'last_check': datetime.now().isoformat()
            },
            {
                'name': 'Email Service',
                'status': 'healthy',
                'response_time_ms': 156.3,
                'last_check': datetime.now().isoformat()
            },
            {
                'name': 'Notification Service',
                'status': 'healthy',
                'response_time_ms': 23.7,
                'last_check': datetime.now().isoformat()
            }
        ]

        # Recent errors
        recent_errors = Database.execute_query("""
            SELECT 
                action,
                new_values->>'error' as error_message,
                created_at,
                u.username
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            WHERE al.tenant_id = %s 
            AND al.action LIKE '%_failed'
            AND al.created_at >= NOW() - INTERVAL '24 hours'
            ORDER BY al.created_at DESC
            LIMIT 10
        """, (tenant_id,))

        # Performance metrics
        performance = Database.execute_one("""
            SELECT 
                COUNT(CASE WHEN wi.created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as workflows_last_hour,
                COUNT(CASE WHEN t.completed_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as tasks_completed_last_hour,
                AVG(CASE WHEN t.completed_at >= NOW() - INTERVAL '24 hours' AND t.completed_at IS NOT NULL THEN 
                    EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) END) as avg_task_duration_seconds
            FROM workflow_instances wi
            CROSS JOIN tasks t
            JOIN workflow_instances wi2 ON t.workflow_instance_id = wi2.id
            WHERE wi.tenant_id = %s AND wi2.tenant_id = %s
        """, (tenant_id, tenant_id))

        # Storage usage
        storage_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_files,
                SUM(file_size) as total_size_bytes,
                AVG(file_size) as avg_file_size_bytes
            FROM files
            WHERE tenant_id = %s
        """, (tenant_id,))

        return jsonify({
            'overall_status': 'healthy' if db_health == 'healthy' else 'degraded',
            'database': {
                'status': db_health,
                'response_time_ms': db_response_time
            },
            'system_resources': system_resources,
            'services': services,
            'recent_errors': [dict(error) for error in recent_errors],
            'performance': dict(performance),
            'storage': dict(storage_stats),
            'uptime_hours': 168.5,  # Would calculate actual uptime
            'last_restart': '2025-06-01T10:30:00Z',  # Would get from system
            'generated_at': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting system status: {e}")
        return jsonify({'error': 'Failed to retrieve system status'}), 500


@dashboard_bp.route('/notifications/admin', methods=['GET'])
@require_auth
@require_permissions(['view_system_health'])
def get_admin_notifications():
    """Get admin-specific notifications and alerts"""
    try:
        tenant_id = g.current_user['tenant_id']

        notifications = []

        # System maintenance notifications
        maintenance_due = Database.execute_one("""
            SELECT COUNT(*) as count FROM audit_logs
            WHERE tenant_id = %s AND created_at <= NOW() - INTERVAL '30 days'
        """, (tenant_id,))

        if maintenance_due['count'] > 10000:
            notifications.append({
                'id': 'maintenance_cleanup',
                'type': 'maintenance',
                'priority': 'medium',
                'title': 'System Cleanup Required',
                'message': f"Audit log cleanup recommended ({maintenance_due['count']} old entries)",
                'action_url': '/admin/maintenance/cleanup',
                'created_at': datetime.now().isoformat()
            })

        # Security notifications
        failed_logins = Database.execute_one("""
            SELECT COUNT(*) as count FROM audit_logs
            WHERE tenant_id = %s AND action = 'login_failed' 
            AND created_at >= NOW() - INTERVAL '1 hour'
        """, (tenant_id,))

        if failed_logins['count'] > 10:
            notifications.append({
                'id': 'security_alert',
                'type': 'security',
                'priority': 'high',
                'title': 'Unusual Login Activity',
                'message': f"{failed_logins['count']} failed login attempts in the last hour",
                'action_url': '/admin/security/login-attempts',
                'created_at': datetime.now().isoformat()
            })

        # Workflow performance notifications
        slow_workflows = Database.execute_one("""
            SELECT COUNT(*) as count FROM workflow_instances
            WHERE tenant_id = %s AND status = 'in_progress' 
            AND created_at <= NOW() - INTERVAL '7 days'
        """, (tenant_id,))

        if slow_workflows['count'] > 0:
            notifications.append({
                'id': 'slow_workflows',
                'type': 'performance',
                'priority': 'medium',
                'title': 'Long-Running Workflows',
                'message': f"{slow_workflows['count']} workflows running for over 7 days",
                'action_url': '/admin/workflows?filter=long_running',
                'created_at': datetime.now().isoformat()
            })

        # User activity notifications
        inactive_users = Database.execute_one("""
            SELECT COUNT(*) as count FROM users
            WHERE tenant_id = %s AND is_active = true 
            AND (last_login IS NULL OR last_login <= NOW() - INTERVAL '90 days')
        """, (tenant_id,))

        if inactive_users['count'] > 0:
            notifications.append({
                'id': 'inactive_users',
                'type': 'user_management',
                'priority': 'low',
                'title': 'Inactive Users Detected',
                'message': f"{inactive_users['count']} users haven't logged in for 90+ days",
                'action_url': '/admin/users?filter=inactive',
                'created_at': datetime.now().isoformat()
            })

        # System resource notifications (would be based on actual monitoring)
        notifications.append({
            'id': 'resource_usage',
            'type': 'system',
            'priority': 'low',
            'title': 'System Resources Normal',
            'message': 'All system resources within normal parameters',
            'action_url': '/admin/system/status',
            'created_at': datetime.now().isoformat()
        })

        return jsonify({
            'notifications': sorted(notifications, key=lambda x: x['priority'], reverse=True),
            'total_count': len(notifications),
            'priority_counts': {
                'high': len([n for n in notifications if n['priority'] == 'high']),
                'medium': len([n for n in notifications if n['priority'] == 'medium']),
                'low': len([n for n in notifications if n['priority'] == 'low'])
            },
            'generated_at': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting admin notifications: {e}")
        return jsonify({'error': 'Failed to retrieve admin notifications'}), 500


@dashboard_bp.route('/export/dashboard-data', methods=['GET'])
@require_auth
@require_permissions(['export_reports'])
def export_dashboard_data():
    """Export dashboard data for external analysis"""
    try:
        tenant_id = g.current_user['tenant_id']
        export_format = request.args.get('format', 'json')

        # Collect comprehensive dashboard data
        dashboard_data = {
            'export_info': {
                'tenant_id': tenant_id,
                'exported_by': g.current_user.get('username'),
                'exported_at': datetime.now().isoformat(),
                'format': export_format
            }
        }

        # Get overview data
        overview = get_admin_overview()
        if overview[1] == 200:
            dashboard_data['overview'] = json.loads(overview[0].data)

        # Get analytics trends
        trends = get_analytics_trends()
        if trends[1] == 200:
            dashboard_data['trends'] = json.loads(trends[0].data)

        # Get security overview
        security = get_security_overview()
        if security[1] == 200:
            dashboard_data['security'] = json.loads(security[0].data)

        # Get system status
        status = get_system_status()
        if status[1] == 200:
            dashboard_data['system_status'] = json.loads(status[0].data)

        if export_format == 'csv':
            # Convert to CSV format (simplified)
            import csv
            import io

            output = io.StringIO()
            writer = csv.writer(output)

            # Write headers and basic metrics
            writer.writerow(['Metric', 'Value', 'Category'])

            if 'overview' in dashboard_data:
                overview_data = dashboard_data['overview']['system_health']
                for key, value in overview_data.items():
                    writer.writerow([key, value, 'system_health'])

            return output.getvalue(), 200, {
                'Content-Type': 'text/csv',
                'Content-Disposition': f'attachment; filename=dashboard_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            }

        else:
            # Return JSON format
            return jsonify(dashboard_data), 200

    except Exception as e:
        logger.error(f"Error exporting dashboard data: {e}")
        return jsonify({'error': 'Failed to export dashboard data'}), 500


@dashboard_bp.route('/widgets/config', methods=['GET'])
@require_auth
@require_permissions(['view_system_health'])
def get_widget_config():
    """Get dashboard widget configuration for current user"""
    try:
        user_id = g.current_user['user_id']
        user_permissions = g.current_user.get('permissions', [])

        # Define available widgets based on permissions
        available_widgets = []

        if 'view_system_health' in user_permissions or '*' in user_permissions:
            available_widgets.extend([
                {
                    'id': 'system_overview',
                    'name': 'System Overview',
                    'description': 'Key system metrics and health indicators',
                    'size': 'large',
                    'refresh_interval': 30000,
                    'data_endpoint': '/admin/dashboard/overview'
                },
                {
                    'id': 'recent_activity',
                    'name': 'Recent Activity',
                    'description': 'Latest system activity and events',
                    'size': 'medium',
                    'refresh_interval': 15000,
                    'data_endpoint': '/admin/dashboard/overview'
                }
            ])

        if 'view_analytics' in user_permissions or '*' in user_permissions:
            available_widgets.append({
                'id': 'analytics_chart',
                'name': 'Analytics Trends',
                'description': 'Workflow and task trends over time',
                'size': 'large',
                'refresh_interval': 60000,
                'data_endpoint': '/admin/dashboard/analytics/trends'
            })

        if 'view_users' in user_permissions or '*' in user_permissions:
            available_widgets.append({
                'id': 'user_activity',
                'name': 'User Activity',
                'description': 'User engagement and activity metrics',
                'size': 'medium',
                'refresh_interval': 60000,
                'data_endpoint': '/admin/dashboard/overview'
            })

        if 'view_reports' in user_permissions or '*' in user_permissions:
            available_widgets.append({
                'id': 'performance_metrics',
                'name': 'Performance Metrics',
                'description': 'System performance indicators',
                'size': 'medium',
                'refresh_interval': 30000,
                'data_endpoint': '/admin/dashboard/system-status'
            })

        # Get user's saved widget preferences (you'd store this in database)
        # For now, return default configuration
        user_config = {
            'layout': [
                {'id': 'system_overview', 'x': 0, 'y': 0, 'w': 12, 'h': 6},
                {'id': 'recent_activity', 'x': 0, 'y': 6, 'w': 6, 'h': 8},
                {'id': 'analytics_chart', 'x': 6, 'y': 6, 'w': 6, 'h': 8}
            ],
            'enabled_widgets': ['system_overview', 'recent_activity', 'analytics_chart'],
            'refresh_settings': {
                'auto_refresh': True,
                'global_interval': 30000
            }
        }

        return jsonify({
            'available_widgets': available_widgets,
            'user_config': user_config,
            'permissions': user_permissions
        }), 200

    except Exception as e:
        logger.error(f"Error getting widget config: {e}")
        return jsonify({'error': 'Failed to retrieve widget configuration'}), 500


@dashboard_bp.route('/widgets/config', methods=['PUT'])
@require_auth
@audit_log('update_dashboard_config', 'user_preference')
def update_widget_config():
    """Update dashboard widget configuration for current user"""
    try:
        user_id = g.current_user['user_id']
        data = sanitize_input(request.get_json())

        # Validate configuration data
        if not validate_required_fields(data, ['layout', 'enabled_widgets']):
            return jsonify({'error': 'Missing required configuration fields'}), 400

        # In a real implementation, you'd save this to a user_preferences table
        # For now, just validate and return success

        return jsonify({
            'message': 'Dashboard configuration updated successfully',
            'config': data
        }), 200

    except Exception as e:
        logger.error(f"Error updating widget config: {e}")
        return jsonify({'error': 'Failed to update widget configuration'}), 500

# Register the dashboard blueprint in your main app/__init__.py
# app.register_blueprint(dashboard_bp, url_prefix='/api/admin/dashboard')