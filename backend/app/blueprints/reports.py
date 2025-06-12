### app/blueprints/reports.py

"""
Reports blueprint - handles reporting and analytics
"""
from flask import Blueprint, request, jsonify, g, send_file
from app.middleware import require_auth, require_permissions
from app.database import Database
from app.utils.security import sanitize_input
from app.utils.validators import validate_date_range, validate_pagination_params
from datetime import datetime, timedelta
import json
import csv
import io
import logging

logger = logging.getLogger(__name__)

reports_bp = Blueprint('reports', __name__)

@reports_bp.route('/dashboard-stats', methods=['GET'])
@require_auth
def get_dashboard_stats():
    """Get dashboard statistics"""
    try:
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']
        
        # Get workflow statistics
        workflow_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_workflows,
                COUNT(CASE WHEN is_active = true THEN 1 END) as active_workflows,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_workflows
            FROM workflows 
            WHERE tenant_id = %s
        """, (tenant_id,))
        
        # Get workflow instance statistics
        instance_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_instances,
                COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_instances,
                COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as in_progress_instances,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_instances,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_instances
            FROM workflow_instances 
            WHERE tenant_id = %s
        """, (tenant_id,))
        
        # Get task statistics for current user
        task_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_tasks,
                COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_tasks,
                COUNT(CASE WHEN t.status = 'in_progress' THEN 1 END) as in_progress_tasks,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
                COUNT(CASE WHEN t.due_date < NOW() AND t.status = 'pending' THEN 1 END) as overdue_tasks
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE t.assigned_to = %s AND wi.tenant_id = %s
        """, (user_id, tenant_id))
        
        # Get SLA breach statistics
        sla_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_breaches,
                COUNT(CASE WHEN resolved_at IS NULL THEN 1 END) as active_breaches,
                COUNT(CASE WHEN escalation_level >= 2 THEN 1 END) as escalated_breaches
            FROM sla_breaches sb
            JOIN workflow_instances wi ON sb.workflow_instance_id = wi.id
            WHERE wi.tenant_id = %s
        """, (tenant_id,))
        
        # Calculate completion rate
        total_instances = instance_stats['total_instances'] or 0
        completed_instances = instance_stats['completed_instances'] or 0
        completion_rate = round((completed_instances / total_instances) * 100, 1) if total_instances > 0 else 0
        
        # Get workflow trend data (last 30 days)
        trend_data = Database.execute_query("""
            SELECT 
                DATE(created_at) as date,
                COUNT(*) as started,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
            FROM workflow_instances 
            WHERE tenant_id = %s 
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY date
        """, (tenant_id,))
        
        return jsonify({
            'workflows': dict(workflow_stats),
            'instances': dict(instance_stats),
            'tasks': dict(task_stats),
            'sla': dict(sla_stats),
            'completion_rate': completion_rate,
            'trend': [dict(row) for row in trend_data]
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting dashboard stats: {e}")
        return jsonify({'error': 'Failed to retrieve dashboard statistics'}), 500

@reports_bp.route('/performance', methods=['GET'])
@require_auth
@require_permissions(['view_reports'])
def get_performance_report():
    """Get performance metrics report"""
    try:
        tenant_id = g.current_user['tenant_id']
        
        # Get query parameters
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        workflow_id = request.args.get('workflow_id')
        
        # Default to last 30 days if no dates provided
        if not start_date or not end_date:
            end_date = datetime.now().strftime('%Y-%m-%d')
            start_date = (datetime.now() - timedelta(days=30)).strftime('%Y-%m-%d')
        
        # Build query conditions
        where_conditions = ["wi.tenant_id = %s", "wi.created_at >= %s", "wi.created_at <= %s"]
        params = [tenant_id, start_date, end_date]
        
        if workflow_id:
            where_conditions.append("wi.workflow_id = %s")
            params.append(workflow_id)
        
        where_clause = "WHERE " + " AND ".join(where_conditions)
        
        # Get workflow performance metrics
        performance_data = Database.execute_query(f"""
            SELECT 
                w.name as workflow_name,
                w.id as workflow_id,
                COUNT(wi.id) as total_instances,
                COUNT(CASE WHEN wi.status = 'completed' THEN 1 END) as completed_instances,
                COUNT(CASE WHEN wi.status = 'failed' THEN 1 END) as failed_instances,
                ROUND(AVG(EXTRACT(EPOCH FROM (wi.completed_at - wi.created_at))/3600), 2) as avg_completion_hours,
                COUNT(CASE WHEN sb.id IS NOT NULL THEN 1 END) as sla_breaches
            FROM workflow_instances wi
            JOIN workflows w ON wi.workflow_id = w.id
            LEFT JOIN sla_breaches sb ON wi.id = sb.workflow_instance_id
            {where_clause}
            GROUP BY w.id, w.name
            ORDER BY total_instances DESC
        """, params)
        
        # Get user performance metrics
        user_performance = Database.execute_query(f"""
            SELECT 
                u.first_name || ' ' || u.last_name as user_name,
                u.id as user_id,
                COUNT(t.id) as total_tasks,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_tasks,
                ROUND(AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600), 2) as avg_task_hours,
                COUNT(CASE WHEN t.due_date < t.completed_at THEN 1 END) as overdue_completions
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            LEFT JOIN users u ON t.assigned_to = u.id
            {where_clause}
            AND t.assigned_to IS NOT NULL
            GROUP BY u.id, u.first_name, u.last_name
            ORDER BY total_tasks DESC
        """, params)
        
        # Get daily activity metrics
        daily_activity = Database.execute_query(f"""
            SELECT 
                DATE(wi.created_at) as date,
                COUNT(wi.id) as workflows_started,
                COUNT(CASE WHEN wi.status = 'completed' THEN 1 END) as workflows_completed,
                COUNT(t.id) as tasks_created,
                COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as tasks_completed
            FROM workflow_instances wi
            LEFT JOIN tasks t ON wi.id = t.workflow_instance_id 
                AND DATE(t.created_at) = DATE(wi.created_at)
            {where_clause}
            GROUP BY DATE(wi.created_at)
            ORDER BY date
        """, params)
        
        return jsonify({
            'workflow_performance': [dict(row) for row in performance_data],
            'user_performance': [dict(row) for row in user_performance],
            'daily_activity': [dict(row) for row in daily_activity],
            'period': {
                'start_date': start_date,
                'end_date': end_date
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating performance report: {e}")
        return jsonify({'error': 'Failed to generate performance report'}), 500

@reports_bp.route('/sla-compliance', methods=['GET'])
@require_auth
@require_permissions(['view_reports'])
def get_sla_compliance_report():
    """Get SLA compliance report"""
    try:
        tenant_id = g.current_user['tenant_id']
        
        # Get SLA compliance by workflow
        sla_compliance = Database.execute_query("""
            SELECT 
                w.name as workflow_name,
                w.id as workflow_id,
                COUNT(wi.id) as total_instances,
                COUNT(sb.id) as breached_instances,
                ROUND((COUNT(wi.id) - COUNT(sb.id))::DECIMAL / NULLIF(COUNT(wi.id), 0) * 100, 2) as compliance_rate,
                AVG(EXTRACT(EPOCH FROM (wi.completed_at - wi.created_at))/3600) as avg_completion_hours,
                sd.duration_hours as sla_hours
            FROM workflows w
            LEFT JOIN workflow_instances wi ON w.id = wi.workflow_id
            LEFT JOIN sla_definitions sd ON w.id = sd.workflow_id AND sd.step_id IS NULL
            LEFT JOIN sla_breaches sb ON wi.id = sb.workflow_instance_id
            WHERE w.tenant_id = %s
            AND wi.created_at >= NOW() - INTERVAL '90 days'
            GROUP BY w.id, w.name, sd.duration_hours
            ORDER BY compliance_rate DESC NULLS LAST
        """, (tenant_id,))
        
        # Get SLA breaches by escalation level
        breach_escalation = Database.execute_query("""
            SELECT 
                escalation_level,
                COUNT(*) as breach_count,
                AVG(EXTRACT(EPOCH FROM (COALESCE(resolved_at, NOW()) - breach_time))/3600) as avg_resolution_hours
            FROM sla_breaches sb
            JOIN workflow_instances wi ON sb.workflow_instance_id = wi.id
            WHERE wi.tenant_id = %s
            AND sb.breach_time >= NOW() - INTERVAL '90 days'
            GROUP BY escalation_level
            ORDER BY escalation_level
        """, (tenant_id,))
        
        # Get recent SLA breaches
        recent_breaches = Database.execute_query("""
            SELECT 
                w.name as workflow_name,
                wi.title as instance_title,
                t.name as task_name,
                sb.escalation_level,
                sb.breach_time,
                sb.resolved_at,
                u.first_name || ' ' || u.last_name as assigned_to
            FROM sla_breaches sb
            JOIN workflow_instances wi ON sb.workflow_instance_id = wi.id
            JOIN workflows w ON wi.workflow_id = w.id
            LEFT JOIN tasks t ON sb.task_id = t.id
            LEFT JOIN users u ON t.assigned_to = u.id
            WHERE wi.tenant_id = %s
            ORDER BY sb.breach_time DESC
            LIMIT 50
        """, (tenant_id,))
        
        return jsonify({
            'compliance_by_workflow': [dict(row) for row in sla_compliance],
            'breach_by_escalation': [dict(row) for row in breach_escalation],
            'recent_breaches': [dict(row) for row in recent_breaches]
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating SLA compliance report: {e}")
        return jsonify({'error': 'Failed to generate SLA compliance report'}), 500

@reports_bp.route('/export/<report_type>', methods=['GET'])
@require_auth
@require_permissions(['export_reports'])
def export_report(report_type):
    """Export report data as CSV"""
    try:
        tenant_id = g.current_user['tenant_id']
        
        if report_type == 'workflow_instances':
            data = Database.execute_query("""
                SELECT 
                    wi.id,
                    w.name as workflow_name,
                    wi.title,
                    wi.status,
                    wi.priority,
                    wi.created_at,
                    wi.completed_at,
                    u1.username as initiated_by,
                    u2.username as assigned_to
                FROM workflow_instances wi
                JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN users u1 ON wi.initiated_by = u1.id
                LEFT JOIN users u2 ON wi.assigned_to = u2.id
                WHERE wi.tenant_id = %s
                ORDER BY wi.created_at DESC
                LIMIT 10000
            """, (tenant_id,))
            
            filename = f'workflow_instances_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            
        elif report_type == 'tasks':
            data = Database.execute_query("""
                SELECT 
                    t.id,
                    t.name,
                    t.type,
                    t.status,
                    t.created_at,
                    t.completed_at,
                    t.due_date,
                    wi.title as workflow_title,
                    u1.username as assigned_to,
                    u2.username as assigned_by
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                LEFT JOIN users u1 ON t.assigned_to = u1.id
                LEFT JOIN users u2 ON t.assigned_by = u2.id
                WHERE wi.tenant_id = %s
                ORDER BY t.created_at DESC
                LIMIT 10000
            """, (tenant_id,))
            
            filename = f'tasks_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv'
            
        else:
            return jsonify({'error': 'Invalid report type'}), 400
        
        # Create CSV
        output = io.StringIO()
        if data:
            writer = csv.DictWriter(output, fieldnames=data[0].keys())
            writer.writeheader()
            for row in data:
                writer.writerow(dict(row))
        
        # Create file-like object
        output.seek(0)
        file_output = io.BytesIO()
        file_output.write(output.getvalue().encode('utf-8'))
        file_output.seek(0)
        
        return send_file(
            file_output,
            mimetype='text/csv',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        logger.error(f"Error exporting report {report_type}: {e}")
        return jsonify({'error': 'Failed to export report'}), 500

@reports_bp.route('/custom', methods=['POST'])
@require_auth
@require_permissions(['create_reports'])
def generate_custom_report():
    """Generate custom report based on user criteria"""
    try:
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        
        # Validate request
        required_fields = ['report_name', 'date_range', 'metrics']
        if not all(field in data for field in required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        date_range = data['date_range']
        if not validate_date_range(date_range['start'], date_range['end']):
            return jsonify({'error': 'Invalid date range'}), 400
        
        # Build dynamic query based on selected metrics
        metrics = data['metrics']
        filters = data.get('filters', {})
        
        # This is a simplified example - in production, you'd want more sophisticated
        # query building with proper validation to prevent SQL injection
        base_query = """
            SELECT 
                wi.id as instance_id,
                w.name as workflow_name,
                wi.title,
                wi.status,
                wi.created_at,
                wi.completed_at
            FROM workflow_instances wi
            JOIN workflows w ON wi.workflow_id = w.id
            WHERE wi.tenant_id = %s
            AND wi.created_at >= %s
            AND wi.created_at <= %s
        """
        
        params = [tenant_id, date_range['start'], date_range['end']]
        
        # Add filters
        if filters.get('workflow_id'):
            base_query += " AND wi.workflow_id = %s"
            params.append(filters['workflow_id'])
        
        if filters.get('status'):
            base_query += " AND wi.status = %s"
            params.append(filters['status'])
        
        base_query += " ORDER BY wi.created_at DESC LIMIT 1000"
        
        results = Database.execute_query(base_query, params)
        
        # Save custom report definition for future use
        report_definition = {
            'name': data['report_name'],
            'date_range': date_range,
            'metrics': metrics,
            'filters': filters,
            'query': base_query,
            'created_by': g.current_user['user_id']
        }
        
        # In a real implementation, you'd save this to a custom_reports table
        
        return jsonify({
            'report_name': data['report_name'],
            'data': [dict(row) for row in results],
            'total_records': len(results),
            'generated_at': datetime.now().isoformat()
        }), 200
        
    except Exception as e:
        logger.error(f"Error generating custom report: {e}")
        return jsonify({'error': 'Failed to generate custom report'}), 500