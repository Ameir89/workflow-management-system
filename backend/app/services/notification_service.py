### app/services/notification_service.py

"""
Notification service for sending alerts and updates
"""
import json
from datetime import datetime
from app.database import Database
from app.utils.security import validate_email
import logging

logger = logging.getLogger(__name__)

class NotificationService:
    """Service for managing notifications"""
    
    @staticmethod
    def send_task_assignment(user_id, task_id):
        """Send task assignment notification"""
        try:
            # Get task details
            task = Database.execute_one("""
                SELECT t.name, t.description, wi.title as workflow_title
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))
            
            if not task:
                return
            
            # Create notification
            NotificationService._create_notification(
                user_id=user_id,
                type='task_assigned',
                title=f'New Task Assigned: {task["name"]}',
                message=f'You have been assigned a new task "{task["name"]}" in workflow "{task["workflow_title"]}"',
                data={'task_id': str(task_id)}
            )
            
        except Exception as e:
            logger.error(f"Error sending task assignment notification: {e}")
    
    @staticmethod
    def send_task_completion(user_id, task_id):
        """Send task completion notification"""
        try:
            task = Database.execute_one("""
                SELECT t.name, wi.title as workflow_title
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))
            
            if not task:
                return
            
            NotificationService._create_notification(
                user_id=user_id,
                type='task_completed',
                title=f'Task Completed: {task["name"]}',
                message=f'Task "{task["name"]}" has been completed in workflow "{task["workflow_title"]}"',
                data={'task_id': str(task_id)}
            )
            
        except Exception as e:
            logger.error(f"Error sending task completion notification: {e}")
    
    @staticmethod
    def send_workflow_completion(user_id, workflow_instance_id):
        """Send workflow completion notification"""
        try:
            workflow = Database.execute_one("""
                SELECT wi.title, w.name as workflow_name
                FROM workflow_instances wi
                JOIN workflows w ON wi.workflow_id = w.id
                WHERE wi.id = %s
            """, (workflow_instance_id,))
            
            if not workflow:
                return
            
            NotificationService._create_notification(
                user_id=user_id,
                type='workflow_completed',
                title=f'Workflow Completed: {workflow["title"]}',
                message=f'Workflow "{workflow["title"]}" has been completed successfully',
                data={'workflow_instance_id': str(workflow_instance_id)}
            )
            
        except Exception as e:
            logger.error(f"Error sending workflow completion notification: {e}")
    
    @staticmethod
    def send_sla_breach_notification(user_id, task_id, escalation_level):
        """Send SLA breach notification"""
        try:
            task = Database.execute_one("""
                SELECT t.name, t.due_date, wi.title as workflow_title
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))
            
            if not task:
                return
            
            level_text = ['', 'Warning', 'Critical', 'Urgent'][min(escalation_level, 3)]
            
            NotificationService._create_notification(
                user_id=user_id,
                type='sla_breach',
                title=f'SLA Breach - {level_text}: {task["name"]}',
                message=f'Task "{task["name"]}" has breached its SLA deadline. Escalation level: {escalation_level}',
                data={
                    'task_id': str(task_id),
                    'escalation_level': escalation_level,
                    'due_date': task['due_date'].isoformat() if task['due_date'] else None
                }
            )
            
        except Exception as e:
            logger.error(f"Error sending SLA breach notification: {e}")
    
    @staticmethod
    def _create_notification(user_id, type, title, message, data=None):
        """Create notification in database"""
        try:
            # Get user's tenant
            user = Database.execute_one(
                "SELECT tenant_id FROM users WHERE id = %s",
                (user_id,)
            )
            
            if not user:
                return
            
            notification_id = Database.execute_insert("""
                INSERT INTO notifications 
                (tenant_id, user_id, type, title, message, data)
                VALUES (%s, %s, %s, %s, %s, %s)
            """, (
                user['tenant_id'], user_id, type, title, message,
                json.dumps(data) if data else '{}'
            ))
            
            # TODO: Send real-time notification via WebSocket
            # TODO: Send email notification if user preferences allow
            
            return notification_id
            
        except Exception as e:
            logger.error(f"Error creating notification: {e}")
    
    @staticmethod
    def get_user_notifications(user_id, unread_only=False, limit=50):
        """Get notifications for a user"""
        try:
            where_clause = "WHERE user_id = %s"
            params = [user_id]
            
            if unread_only:
                where_clause += " AND is_read = false"
            
            query = f"""
                SELECT id, type, title, message, data, is_read, created_at
                FROM notifications
                {where_clause}
                ORDER BY created_at DESC
                LIMIT %s
            """
            params.append(limit)
            
            return Database.execute_query(query, params)
            
        except Exception as e:
            logger.error(f"Error getting user notifications: {e}")
            return []
    
    @staticmethod
    def mark_notification_read(notification_id, user_id):
        """Mark notification as read"""
        try:
            Database.execute_query("""
                UPDATE notifications 
                SET is_read = true, read_at = NOW()
                WHERE id = %s AND user_id = %s
            """, (notification_id, user_id))
            
        except Exception as e:
            logger.error(f"Error marking notification as read: {e}")
    
    @staticmethod
    def mark_all_read(user_id):
        """Mark all notifications as read for a user"""
        try:
            Database.execute_query("""
                UPDATE notifications 
                SET is_read = true, read_at = NOW()
                WHERE user_id = %s AND is_read = false
            """, (user_id,))
            
        except Exception as e:
            logger.error(f"Error marking all notifications as read: {e}")