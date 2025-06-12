### app/services/sla_monitor.py

"""
SLA monitoring service for tracking deadlines and escalations
"""
from datetime import datetime, timedelta
from app.database import Database
from app.services.notification_service import NotificationService
from app.services.audit_logger import AuditLogger
import logging

logger = logging.getLogger(__name__)

class SLAMonitor:
    """Service for monitoring SLA compliance and escalations"""
    
    @staticmethod
    def check_sla_breaches():
        """Check for SLA breaches and handle escalations"""
        try:
            # Get active tasks that are overdue
            overdue_tasks = Database.execute_query("""
                SELECT t.id, t.workflow_instance_id, t.name, t.assigned_to, 
                       t.due_date, t.created_at,
                       wi.title as workflow_title, wi.initiated_by,
                       sla.id as sla_id, sla.duration_hours, sla.escalation_rules
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN sla_definitions sla ON (sla.workflow_id = w.id AND 
                    (sla.step_id IS NULL OR sla.step_id = t.step_id))
                WHERE t.status = 'pending' 
                AND t.due_date < NOW()
                AND sla.is_active = true
            """)
            
            for task in overdue_tasks:
                SLAMonitor._handle_sla_breach(task)
                
            # Check workflow-level SLAs
            overdue_workflows = Database.execute_query("""
                SELECT wi.id, wi.workflow_id, wi.title, wi.initiated_by,
                       wi.created_at, wi.due_date,
                       sla.id as sla_id, sla.duration_hours, sla.escalation_rules
                FROM workflow_instances wi
                JOIN sla_definitions sla ON sla.workflow_id = wi.workflow_id
                WHERE wi.status IN ('pending', 'in_progress')
                AND wi.due_date < NOW()
                AND sla.step_id IS NULL
                AND sla.is_active = true
            """)
            
            for workflow in overdue_workflows:
                SLAMonitor._handle_workflow_sla_breach(workflow)
                
        except Exception as e:
            logger.error(f"Error checking SLA breaches: {e}")
    
    @staticmethod
    def _handle_sla_breach(task):
        """Handle SLA breach for a task"""
        try:
            # Check if breach already recorded
            existing_breach = Database.execute_one("""
                SELECT id, escalation_level FROM sla_breaches
                WHERE task_id = %s AND resolved_at IS NULL
            """, (task['id'],))
            
            if existing_breach:
                # Handle escalation
                SLAMonitor._handle_escalation(existing_breach, task)
            else:
                # Record new breach
                breach_id = Database.execute_insert("""
                    INSERT INTO sla_breaches 
                    (sla_definition_id, workflow_instance_id, task_id, escalation_level)
                    VALUES (%s, %s, %s, 1)
                """, (task['sla_id'], task['workflow_instance_id'], task['id']))
                
                # Send initial notifications
                SLAMonitor._send_breach_notifications(task, 1)
                
                # Log audit
                AuditLogger.log_action(
                    user_id=None,
                    action='sla_breach_created',
                    resource_type='task',
                    resource_id=task['id']
                )
                
        except Exception as e:
            logger.error(f"Error handling SLA breach for task {task['id']}: {e}")
    
    @staticmethod
    def _handle_escalation(breach, task):
        """Handle SLA escalation"""
        try:
            escalation_rules = task.get('escalation_rules', [])
            current_level = breach['escalation_level']
            
            # Check if enough time has passed for next escalation
            time_since_breach = Database.execute_one("""
                SELECT EXTRACT(EPOCH FROM (NOW() - breach_time))/3600 as hours_since_breach
                FROM sla_breaches WHERE id = %s
            """, (breach['id'],))
            
            hours_since = time_since_breach['hours_since_breach']
            
            # Find applicable escalation rule
            for rule in escalation_rules:
                if (rule.get('level') == current_level + 1 and 
                    hours_since >= rule.get('after_hours', 24)):
                    
                    # Update escalation level
                    Database.execute_query("""
                        UPDATE sla_breaches 
                        SET escalation_level = %s, updated_at = NOW()
                        WHERE id = %s
                    """, (current_level + 1, breach['id']))
                    
                    # Send escalation notifications
                    SLAMonitor._send_breach_notifications(task, current_level + 1)
                    break
                    
        except Exception as e:
            logger.error(f"Error handling escalation for breach {breach['id']}: {e}")
    
    @staticmethod
    def _send_breach_notifications(task, escalation_level):
        """Send notifications for SLA breach"""
        try:
            # Notify task assignee
            if task['assigned_to']:
                NotificationService.send_sla_breach_notification(
                    task['assigned_to'], task['id'], escalation_level
                )
            
            # Notify workflow initiator
            if task['initiated_by'] != task['assigned_to']:
                NotificationService.send_sla_breach_notification(
                    task['initiated_by'], task['id'], escalation_level
                )
            
            # Notify managers (based on escalation level)
            if escalation_level >= 2:
                managers = SLAMonitor._get_escalation_recipients(escalation_level)
                for manager in managers:
                    NotificationService.send_sla_breach_notification(
                        manager['user_id'], task['id'], escalation_level
                    )
                    
        except Exception as e:
            logger.error(f"Error sending breach notifications: {e}")
    
    @staticmethod
    def _get_escalation_recipients(level):
        """Get recipients for escalation notifications"""
        query = """
            SELECT DISTINCT u.id as user_id, u.email
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            JOIN roles r ON ur.role_id = r.id
            WHERE r.name IN ('Admin', 'Manager')
            AND u.is_active = true
        """
        return Database.execute_query(query)
    
    @staticmethod
    def resolve_sla_breach(task_id):
        """Mark SLA breach as resolved when task is completed"""
        try:
            Database.execute_query("""
                UPDATE sla_breaches 
                SET resolved_at = NOW()
                WHERE task_id = %s AND resolved_at IS NULL
            """, (task_id,))
            
        except Exception as e:
            logger.error(f"Error resolving SLA breach for task {task_id}: {e}")
    
    @staticmethod
    def create_sla_definition(workflow_id, step_id, duration_hours, escalation_rules, tenant_id):
        """Create new SLA definition"""
        try:
            sla_id = Database.execute_insert("""
                INSERT INTO sla_definitions 
                (tenant_id, workflow_id, step_id, duration_hours, escalation_rules, name)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                tenant_id, workflow_id, step_id, duration_hours,
                escalation_rules, f"SLA for {workflow_id}/{step_id}"
            ))
            
            return sla_id
            
        except Exception as e:
            logger.error(f"Error creating SLA definition: {e}")
            raise