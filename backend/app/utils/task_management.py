# Utility functions for return task management

from app.database import Database
from app.services.notification_service import NotificationService
import logging

logger = logging.getLogger(__name__)

class ReturnTaskManager:
    """Utility class for managing return task operations"""

    @staticmethod
    def check_return_task_deadlines():
        """Check for return tasks approaching deadlines and send reminders"""
        try:
            # Get return tasks due within 24 hours
            upcoming_tasks = Database.execute_query("""
                SELECT t.id, t.assigned_to, t.due_date,
                       EXTRACT(EPOCH FROM (t.due_date - NOW()))/3600 as hours_until_due
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.status = 'pending'
                AND t.metadata::text LIKE '%"is_return_task": true%'
                AND t.due_date IS NOT NULL
                AND t.due_date > NOW()
                AND t.due_date <= NOW() + INTERVAL '24 hours'
                AND NOT EXISTS (
                    SELECT 1 FROM notifications n
                    WHERE n.user_id = t.assigned_to
                    AND n.type = 'return_task_deadline_warning'
                    AND n.data::text LIKE '%"task_id": "' || t.id || '"%'
                    AND n.created_at > NOW() - INTERVAL '12 hours'
                )
            """)

            for task in upcoming_tasks:
                try:
                    NotificationService.send_return_task_reminder(
                        task['assigned_to'], 
                        task['id'], 
                        int(task['hours_until_due'])
                    )
                    logger.info(f"Sent deadline reminder for return task {task['id']}")
                except Exception as e:
                    logger.error(f"Failed to send reminder for task {task['id']}: {e}")

            return len(upcoming_tasks)

        except Exception as e:
            logger.error(f"Error checking return task deadlines: {e}")
            return 0

    @staticmethod
    def escalate_overdue_return_tasks():
        """Escalate overdue return tasks"""
        try:
            # Get overdue return tasks
            overdue_tasks = Database.execute_query("""
                SELECT t.id, t.assigned_to, t.due_date,
                       EXTRACT(EPOCH FROM (NOW() - t.due_date))/3600 as hours_overdue
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.status = 'pending'
                AND t.metadata::text LIKE '%"is_return_task": true%'
                AND t.due_date IS NOT NULL
                AND t.due_date < NOW()
            """)

            escalated_count = 0
            for task in overdue_tasks:
                try:
                    hours_overdue = int(task['hours_overdue'])
                    
                    # Determine escalation level based on how overdue
                    if hours_overdue >= 72:  # 3 days
                        escalation_level = 3
                    elif hours_overdue >= 48:  # 2 days
                        escalation_level = 2
                    elif hours_overdue >= 24:  # 1 day
                        escalation_level = 1
                    else:
                        continue  # Not overdue enough yet

                    NotificationService.send_escalation_notification_for_return_task(
                        task['id'], escalation_level
                    )
                    escalated_count += 1
                    logger.info(f"Escalated overdue return task {task['id']} (level {escalation_level})")

                except Exception as e:
                    logger.error(f"Failed to escalate task {task['id']}: {e}")

            return escalated_count

        except Exception as e:
            logger.error(f"Error escalating overdue return tasks: {e}")
            return 0

    @staticmethod
    def get_return_task_statistics(tenant_id, days=30):
        """Get statistics about return task usage"""
        try:
            stats = Database.execute_one("""
                SELECT 
                    COUNT(*) as total_return_tasks,
                    COUNT(CASE WHEN t.status = 'completed' THEN 1 END) as completed_return_tasks,
                    COUNT(CASE WHEN t.status = 'pending' THEN 1 END) as pending_return_tasks,
                    COUNT(CASE WHEN t.due_date < NOW() AND t.status = 'pending' THEN 1 END) as overdue_return_tasks,
                    AVG(EXTRACT(EPOCH FROM (t.completed_at - t.created_at))/3600) as avg_completion_time_hours,
                    COUNT(DISTINCT wi.id) as workflows_with_returns
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE wi.tenant_id = %s
                AND t.metadata::text LIKE '%"is_return_task": true%'
                AND t.created_at >= NOW() - INTERVAL '%s days'
            """, (tenant_id, days))

            return dict(stats) if stats else {}

        except Exception as e:
            logger.error(f"Error getting return task statistics: {e}")
            return {}

    @staticmethod
    def cleanup_old_return_tasks(days_old=90):
        """Clean up old completed return tasks"""
        try:
            # Archive old completed return tasks
            archived_count = Database.execute_one("""
                UPDATE tasks 
                SET metadata = metadata || '{"archived": true}'::jsonb
                WHERE status = 'completed'
                AND metadata::text LIKE '%"is_return_task": true%'
                AND completed_at < NOW() - INTERVAL '%s days'
                AND NOT (metadata::jsonb ? 'archived')
                RETURNING id
            """, (days_old,))

            return archived_count['id'] if archived_count else 0

        except Exception as e:
            logger.error(f"Error cleaning up old return tasks: {e}")
            return 0