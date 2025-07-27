# app/services/notification_service.py
"""
Enhanced notification service for sending alerts and updates with template support
"""
import json
import re
from datetime import datetime
from app.database import Database
from app.utils.security import validate_email
import logging
from app.utils.json_utils import JSONUtils
logger = logging.getLogger(__name__)


class NotificationService:
    """Enhanced service for managing notifications with template support"""

    @staticmethod
    def send_task_assignment(user_id, task_id):
        """Send task assignment notification"""
        try:
            # Get task details
            task = Database.execute_one("""
                SELECT t.name, t.description, t.due_date, wi.title as workflow_title
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))

            if not task:
                return

            # Create notification data
            notification_data = {
                'task_id': str(task_id),
                'task_name': task['name'],
                'workflow_title': task['workflow_title'],
                'due_date': task['due_date'].isoformat() if task['due_date'] else None,
                'description': task['description']
            }

            # Send using template
            NotificationService.send_notification(
                user_id, 'task_assignment', notification_data
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

            notification_data = {
                'task_id': str(task_id),
                'task_name': task['name'],
                'workflow_title': task['workflow_title']
            }

            NotificationService.send_notification(
                user_id, 'task_completion', notification_data
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

            notification_data = {
                'workflow_instance_id': str(workflow_instance_id),
                'workflow_title': workflow['title'],
                'workflow_name': workflow['workflow_name']
            }

            NotificationService.send_notification(
                user_id, 'workflow_completion', notification_data
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

            notification_data = {
                'task_id': str(task_id),
                'task_name': task['name'],
                'workflow_title': task['workflow_title'],
                'escalation_level': escalation_level,
                'level_text': level_text,
                'due_date': task['due_date'].isoformat() if task['due_date'] else None
            }

            NotificationService.send_notification(
                user_id, 'sla_breach', notification_data
            )

        except Exception as e:
            logger.error(f"Error sending SLA breach notification: {e}")

    @staticmethod
    def send_workflow_failure(user_id: int, instance_id: int, error: str):
        """Send workflow failure notification"""
        try:
            workflow = Database.execute_one("""
                SELECT wi.title, w.name as workflow_name
                FROM workflow_instances wi
                JOIN workflows w ON wi.workflow_id = w.id
                WHERE wi.id = %s
            """, (instance_id,))

            notification_data = {
                'workflow_instance_id': str(instance_id),
                'workflow_title': workflow['title'] if workflow else 'Unknown',
                'workflow_name': workflow['workflow_name'] if workflow else 'Unknown',
                'error_message': error
            }

            NotificationService.send_notification(
                user_id, 'workflow_failure', notification_data
            )

        except Exception as e:
            logger.error(f"Error sending workflow failure notification: {e}")

    @staticmethod
    def send_approval_request(user_id, approval_id, context):
        """Send approval request notification"""
        try:
            notification_data = {
                'approval_id': str(approval_id),
                'workflow_instance_id': context.get('workflow_instance_id'),
                'workflow_title': context.get('workflow_data', {}).get('title', 'Approval Required'),
                'amount': context.get('workflow_data', {}).get('amount'),
                'department': context.get('workflow_data', {}).get('department'),
                'requestor': context.get('workflow_data', {}).get('requestor_name')
            }

            NotificationService.send_notification(
                user_id, 'approval_request', notification_data
            )

        except Exception as e:
            logger.error(f"Error sending approval request notification: {e}")

    # ===== NEW ENHANCED NOTIFICATION METHOD =====

    @staticmethod
    def send_notification(user_id, template_name, data=None, channels=None):
        """
        Enhanced notification method with template support

        Args:
            user_id: Target user ID
            template_name: Name of the notification template
            data: Dictionary of data to interpolate in template
            channels: List of channels to send to ['in_app', 'email', 'sms']
        """
        try:
            if data is None:
                data = {}

            if channels is None:
                channels = ['in_app']  # Default to in-app notifications

            # Get user info
            user = Database.execute_one("""
                SELECT id, email, phone, first_name, last_name, tenant_id,
                       notification_preferences
                FROM users 
                WHERE id = %s AND is_active = true
            """, (user_id,))

            if not user:
                logger.warning(f"User {user_id} not found for notification")
                return

            # Parse notification preferences
            preferences = {}
            if user['notification_preferences']:
                try:
                    preferences = JSONUtils.safe_parse_json(user['notification_preferences'])
                except json.JSONDecodeError:
                    preferences = {}

            # Get notification template
            template = NotificationService._get_notification_template(
                user['tenant_id'], template_name
            )

            if not template:
                # Fall back to default template
                template = NotificationService._get_default_template(template_name)

            # Prepare notification data with user context
            notification_context = {
                'user_name': f"{user['first_name']} {user['last_name']}",
                'user_email': user['email'],
                'timestamp': datetime.now().isoformat(),
                **data
            }

            # Interpolate template with data
            title = NotificationService._interpolate_template(
                template['title'], notification_context
            )
            message = NotificationService._interpolate_template(
                template['message'], notification_context
            )

            # Send via requested channels
            success_channels = []

            if 'in_app' in channels:
                if NotificationService._send_in_app_notification(
                        user_id, template_name, title, message, data
                ):
                    success_channels.append('in_app')

            if 'email' in channels and user['email']:
                if preferences.get('email_enabled', True):
                    if NotificationService._send_email_notification(
                            user['email'], title, message, template_name, notification_context
                    ):
                        success_channels.append('email')

            if 'sms' in channels and user['phone']:
                if preferences.get('sms_enabled', False):
                    if NotificationService._send_sms_notification(
                            user['phone'], message, template_name, notification_context
                    ):
                        success_channels.append('sms')

            logger.info(f"Notification sent to user {user_id} via {success_channels}")
            return len(success_channels) > 0

        except Exception as e:
            logger.error(f"Error sending notification: {e}")
            return False

    @staticmethod
    def _get_notification_template(tenant_id, template_name):
        """Get notification template from database"""
        try:
            template = Database.execute_one("""
                SELECT title_template, message_template, channels
                FROM notification_templates 
                WHERE tenant_id = %s AND name = %s AND is_active = true
            """, (tenant_id, template_name))

            if template:
                return {
                    'title': template['title_template'],
                    'message': template['message_template'],
                    'channels': JSONUtils.safe_parse_json(template['channels']) if template['channels'] else ['in_app']
                }

            return None

        except Exception as e:
            logger.error(f"Error getting notification template: {e}")
            return None

    # @staticmethod
    # def _get_default_template(template_name):
    #     """Get default template for common notification types"""
    #     default_templates = {
    #         'task_assignment': {
    #             'title': 'New Task Assigned: {{task_name}}',
    #             'message': 'You have been assigned a new task "{{task_name}}" in workflow "{{workflow_title}}"'
    #         },
    #         'task_completion': {
    #             'title': 'Task Completed: {{task_name}}',
    #             'message': 'Task "{{task_name}}" has been completed in workflow "{{workflow_title}}"'
    #         },
    #         'workflow_completion': {
    #             'title': 'Workflow Completed: {{workflow_title}}',
    #             'message': 'Workflow "{{workflow_title}}" has been completed successfully'
    #         },
    #         'workflow_failure': {
    #             'title': 'Workflow Failed: {{workflow_title}}',
    #             'message': 'Workflow "{{workflow_title}}" has failed with error: {{error_message}}'
    #         },
    #         'sla_breach': {
    #             'title': 'SLA Breach - {{level_text}}: {{task_name}}',
    #             'message': 'Task "{{task_name}}" has breached its SLA deadline. Escalation level: {{escalation_level}}'
    #         },
    #         'approval_request': {
    #             'title': 'Approval Required: {{workflow_title}}',
    #             'message': 'Your approval is required for "{{workflow_title}}" (Amount: ${{amount}})'
    #         },
    #         'automation_notification': {
    #             'title': 'Automation {{automation_status}}: {{step_name}}',
    #             'message': 'Automation step "{{step_name}}" in workflow "{{workflow_title}}" has {{automation_status}}'
    #         },
    #         'generic': {
    #             'title': 'Workflow Notification',
    #             'message': 'You have a new workflow notification'
    #         },
    #         'task_approved': {
    #             'title': 'Task Approved: {{task_name}}',
    #             'message': 'Your task "{{task_name}}" in workflow "{{workflow_title}}" has been approved by {{approved_by_name}}. {{#comments}}Comments: {{comments}}{{/comments}}'
    #         },
    #         'task_rejected': {
    #             'title': 'Task Rejected: {{task_name}}',
    #             'message': 'Your task "{{task_name}}" in workflow "{{workflow_title}}" has been rejected by {{rejected_by_name}}. {{#rejection_reason}}Reason: {{rejection_reason}}{{/rejection_reason}}'
    #         },
    #         'task_returned_for_edit': {
    #             'title': 'Task Returned for Edit: {{task_name}}',
    #             'message': 'Your task "{{task_name}}" in workflow "{{workflow_title}}" has been returned for editing by {{returned_by_name}}. {{#return_reason}}Reason: {{return_reason}}{{/return_reason}} Please make the necessary changes and resubmit.'
    #         }
    #     }

    #     return default_templates.get(template_name, default_templates['generic'])
    
    # Enhanced notification templates in notification_service.py for return task support

    @staticmethod
    def _get_default_template(template_name):
        """Get default template for common notification types - Enhanced with return task templates"""
        default_templates = {
            'task_assignment': {
                'title': 'New Task Assigned: {{task_name}}',
                'message': 'You have been assigned a new task "{{task_name}}" in workflow "{{workflow_title}}"'
            },
            'task_assignment_resubmission': {
                'title': 'Re-approval Required: {{task_name}}',
                'message': 'A task has been resubmitted for your approval: "{{task_name}}" in workflow "{{workflow_title}}". Previous feedback has been addressed.'
            },
            'task_assignment_post_return': {
                'title': 'Review Required: {{task_name}}',
                'message': 'Content has been resubmitted for review: "{{task_name}}" in workflow "{{workflow_title}}"'
            },
            'task_completion': {
                'title': 'Task Completed: {{task_name}}',
                'message': 'Task "{{task_name}}" has been completed in workflow "{{workflow_title}}"'
            },
            'workflow_completion': {
                'title': 'Workflow Completed: {{workflow_title}}',
                'message': 'Workflow "{{workflow_title}}" has been completed successfully'
            },
            'workflow_failure': {
                'title': 'Workflow Failed: {{workflow_title}}',
                'message': 'Workflow "{{workflow_title}}" has failed with error: {{error_message}}'
            },
            'sla_breach': {
                'title': 'SLA Breach - {{level_text}}: {{task_name}}',
                'message': 'Task "{{task_name}}" has breached its SLA deadline. Escalation level: {{escalation_level}}'
            },
            'approval_request': {
                'title': 'Approval Required: {{workflow_title}}',
                'message': 'Your approval is required for "{{workflow_title}}" {{#amount}}(Amount: ${{amount}}){{/amount}}'
            },
            'automation_notification': {
                'title': 'Automation {{automation_status}}: {{step_name}}',
                'message': 'Automation step "{{step_name}}" in workflow "{{workflow_title}}" has {{automation_status}}'
            },
            'generic': {
                'title': 'Workflow Notification',
                'message': 'You have a new workflow notification'
            },
            'task_approved': {
                'title': 'Task Approved: {{task_name}}',
                'message': 'Your task "{{task_name}}" in workflow "{{workflow_title}}" has been approved by {{approved_by_name}}. {{#comments}}Comments: {{comments}}{{/comments}}'
            },
            'task_rejected': {
                'title': 'Task Rejected: {{task_name}}',
                'message': 'Your task "{{task_name}}" in workflow "{{workflow_title}}" has been rejected by {{rejected_by_name}}. {{#rejection_reason}}Reason: {{rejection_reason}}{{/rejection_reason}}'
            },
            'task_returned_for_edit': {
                'title': 'Task Returned for Edit: {{task_name}}',
                'message': '''Your task "{{task_name}}" in workflow "{{workflow_title}}" has been returned for editing by {{returned_by_name}}.

    {{#return_reason}}Feedback: {{return_reason}}{{/return_reason}}

    Please review the feedback, make the necessary changes, and resubmit the task. You have been assigned a new task to complete the edits.'''
            },
            'return_task_reminder': {
                'title': 'Reminder: Edit Required for {{task_name}}',
                'message': '''This is a reminder that you have a task requiring edits: "{{task_name}}" in workflow "{{workflow_title}}".

    Original feedback: {{return_reason}}

    Please complete your edits and resubmit as soon as possible.'''
            },
            'return_task_completed': {
                'title': 'Resubmission Completed: {{task_name}}',
                'message': 'Task "{{task_name}}" has been successfully resubmitted in workflow "{{workflow_title}}" and is now pending re-approval.'
            },
            'return_task_deadline_warning': {
                'title': 'Edit Deadline Approaching: {{task_name}}',
                'message': '''Your task edit deadline is approaching for "{{task_name}}" in workflow "{{workflow_title}}".

    Deadline: {{due_date}}
    Feedback: {{return_reason}}

    Please complete your edits soon to avoid delays.'''
            }
        }

        return default_templates.get(template_name, default_templates['generic'])

    # Enhanced notification methods for return task scenarios
    @staticmethod
    def send_return_task_reminder(user_id, task_id, hours_until_due=24):
        """Send reminder for pending return task"""
        try:
            task = Database.execute_one("""
                SELECT t.name, t.due_date, t.metadata, wi.title as workflow_title
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))

            if not task:
                return

            metadata = JSONUtils.safe_parse_json(task.get('metadata'), {})
            
            notification_data = {
                'task_id': str(task_id),
                'task_name': task['name'],
                'workflow_title': task['workflow_title'],
                'due_date': task['due_date'].isoformat() if task['due_date'] else None,
                'return_reason': metadata.get('return_reason', 'Please review and address feedback'),
                'hours_until_due': hours_until_due
            }

            template = 'return_task_deadline_warning' if hours_until_due <= 24 else 'return_task_reminder'
            
            NotificationService.send_notification(
                user_id, template, notification_data
            )

        except Exception as e:
            logger.error(f"Error sending return task reminder: {e}")


    @staticmethod
    def send_return_task_completed_notification(instance_id, original_task_id, return_task_id):
        """Send notification when return task is completed"""
        try:
            # Get workflow instance and original approver
            instance_info = Database.execute_one("""
                SELECT wi.title, wi.initiated_by, 
                    t.assigned_to as original_approver, t.name as task_name
                FROM workflow_instances wi
                JOIN tasks t ON wi.id = t.workflow_instance_id
                WHERE wi.id = %s AND t.id = %s
            """, (instance_id, original_task_id))

            if not instance_info:
                return

            notification_data = {
                'task_name': instance_info['task_name'],
                'workflow_title': instance_info['title'],
                'workflow_instance_id': str(instance_id),
                'original_task_id': str(original_task_id),
                'return_task_id': str(return_task_id)
            }

            # Notify the original approver that content has been resubmitted
            if instance_info['original_approver']:
                NotificationService.send_notification(
                    instance_info['original_approver'],
                    'return_task_completed',
                    notification_data
                )

            # Notify the submitter that resubmission was successful
            if instance_info['initiated_by']:
                NotificationService.send_notification(
                    instance_info['initiated_by'],
                    'return_task_completed',
                    notification_data
                )

        except Exception as e:
            logger.error(f"Error sending return task completed notification: {e}")


    @staticmethod
    def send_escalation_notification_for_return_task(task_id, escalation_level):
        """Send escalation notification for overdue return tasks"""
        try:
            task = Database.execute_one("""
                SELECT t.name, t.assigned_to, t.due_date, t.metadata,
                    wi.title as workflow_title, wi.initiated_by
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))

            if not task:
                return

            metadata = JSONUtils.safe_parse_json(task.get('metadata'), {})
            
            # Calculate how overdue the task is
            if task['due_date']:
                hours_overdue = (datetime.now() - task['due_date']).total_seconds() / 3600
            else:
                hours_overdue = 0

            notification_data = {
                'task_id': str(task_id),
                'task_name': task['name'],
                'workflow_title': task['workflow_title'],
                'escalation_level': escalation_level,
                'hours_overdue': int(hours_overdue),
                'return_reason': metadata.get('return_reason', ''),
                'assigned_to': task['assigned_to'],
                'due_date': task['due_date'].isoformat() if task['due_date'] else None
            }

            # Determine escalation recipients based on level
            escalation_recipients = []
            
            if escalation_level >= 1:
                # Level 1: Notify task assignee and their manager
                escalation_recipients.append(task['assigned_to'])
                # Could add manager lookup here
                
            if escalation_level >= 2:
                # Level 2: Notify workflow initiator and department head
                escalation_recipients.append(task['initiated_by'])
                # Could add department head lookup here
                
            if escalation_level >= 3:
                # Level 3: Notify senior management
                # Could add senior management lookup here
                pass

            # Send escalation notifications
            for recipient in escalation_recipients:
                if recipient:
                    NotificationService.send_notification(
                        recipient,
                        'return_task_escalation',
                        notification_data
                    )

        except Exception as e:
            logger.error(f"Error sending return task escalation notification: {e}")


    
    @staticmethod
    def _interpolate_template(template, data):
        """Interpolate template variables with data"""
        if not template:
            return ""

        def replace_var(match):
            var_name = match.group(1)
            # Support nested variables like {{workflow_data.title}}
            try:
                value = data
                for key in var_name.split('.'):
                    value = value[key]
                return str(value) if value is not None else ""
            except (KeyError, TypeError):
                return match.group(0)  # Return original if not found

        return re.sub(r'\{\{([^}]+)\}\}', replace_var, template)

    @staticmethod
    def _send_in_app_notification(user_id, notification_type, title, message, data):
        """Send in-app notification"""
        try:
            if isinstance(data, str):
                data = JSONUtils.safe_parse_json(data)  # convert JSON string to dict
            elif not isinstance(data, dict):
                data = {}

            notification_id = Database.execute_insert("""
                INSERT INTO notifications 
                (user_id, type, title, message, data)
                VALUES (%s, %s, %s, %s, %s)
            """, (user_id, notification_type, title, message, JSONUtils.safe_json_dumps(data)))

            return notification_id is not None

        except Exception as e:
            logger.error(f"Error sending in-app notification: {e}")
            return False

    @staticmethod
    def _send_email_notification(email, subject, body, template_name, data):
        """Send email notification"""
        try:
            # Get email template if exists
            template = Database.execute_one("""
                SELECT subject, body, is_html
                FROM email_templates 
                WHERE name = %s AND is_active = true
                LIMIT 1
            """, (template_name,))

            if template:
                subject = NotificationService._interpolate_template(template['subject'], data)
                body = NotificationService._interpolate_template(template['body'], data)
                is_html = template['is_html']
            else:
                is_html = False

            # TODO: Implement actual email sending via SMTP/SendGrid/etc.
            # For now, just log the email
            logger.info(f"EMAIL TO {email}: {subject}")
            logger.info(f"EMAIL BODY: {body[:100]}...")

            # Placeholder for actual email sending
            # email_service.send_email(
            #     to=email,
            #     subject=subject,
            #     body=body,
            #     is_html=is_html
            # )

            return True

        except Exception as e:
            logger.error(f"Error sending email notification: {e}")
            return False

    @staticmethod
    def _send_sms_notification(phone, message, template_name, data):
        """Send SMS notification"""
        try:
            # Get SMS template if exists
            template = Database.execute_one("""
                SELECT message 
                FROM sms_templates 
                WHERE name = %s AND is_active = true
                LIMIT 1
            """, (template_name,))

            if template:
                message = NotificationService._interpolate_template(template['message'], data)

            # TODO: Implement actual SMS sending via Twilio/AWS SNS/etc.
            # For now, just log the SMS
            logger.info(f"SMS TO {phone}: {message}")

            # Placeholder for actual SMS sending
            # sms_service.send_sms(
            #     to=phone,
            #     message=message
            # )

            return True

        except Exception as e:
            logger.error(f"Error sending SMS notification: {e}")
            return False

    # ===== EXISTING METHODS (Enhanced) =====

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

            notifications = Database.execute_query(query, params)

            # Parse JSON data
            for notification in notifications:
                if notification['data']:
                    try:
                        notification['data'] = JSONUtils.safe_parse_json(notification['data'])
                    except json.JSONDecodeError:
                        notification['data'] = {}

            return notifications

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

    # ===== BULK NOTIFICATION METHODS =====

    @staticmethod
    def send_bulk_notification(user_ids, template_name, data=None, channels=None):
        """Send notification to multiple users"""
        try:
            results = []
            for user_id in user_ids:
                success = NotificationService.send_notification(
                    user_id, template_name, data, channels
                )
                results.append({'user_id': user_id, 'success': success})

            return results

        except Exception as e:
            logger.error(f"Error sending bulk notifications: {e}")
            return []

    @staticmethod
    def send_role_notification(tenant_id, role_name, template_name, data=None, channels=None):
        """Send notification to all users with a specific role"""
        try:
            users = Database.execute_query("""
                SELECT DISTINCT u.id
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.tenant_id = %s AND r.name = %s AND u.is_active = true
            """, (tenant_id, role_name))

            user_ids = [user['id'] for user in users]
            return NotificationService.send_bulk_notification(
                user_ids, template_name, data, channels
            )

        except Exception as e:
            logger.error(f"Error sending role notifications: {e}")
            return []
        
        
    # Add these notification methods to app/services/notification_service.py

    @staticmethod
    def send_task_approved(user_id, task_id, approved_by_name, comments=""):
        """Send task approved notification"""
        try:
            task = Database.execute_one("""
                SELECT t.name, wi.title as workflow_title
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))

            if not task:
                return

            notification_data = {
                'task_id': str(task_id),
                'task_name': task['name'],
                'workflow_title': task['workflow_title'],
                'approved_by_name': approved_by_name,
                'comments': comments
            }

            NotificationService.send_notification(
                user_id, 'task_approved', notification_data
            )

        except Exception as e:
            logger.error(f"Error sending task approved notification: {e}")

    @staticmethod
    def send_task_rejected(user_id, task_id, rejected_by_name, rejection_reason=""):
        """Send task rejected notification"""
        try:
            task = Database.execute_one("""
                SELECT t.name, wi.title as workflow_title
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))

            if not task:
                return

            notification_data = {
                'task_id': str(task_id),
                'task_name': task['name'],
                'workflow_title': task['workflow_title'],
                'rejected_by_name': rejected_by_name,
                'rejection_reason': rejection_reason
            }

            NotificationService.send_notification(
                user_id, 'task_rejected', notification_data
            )

        except Exception as e:
            logger.error(f"Error sending task rejected notification: {e}")

    @staticmethod
    def send_task_returned_for_edit(user_id, task_id, returned_by_name, return_reason=""):
        """Send task returned for edit notification"""
        try:
            task = Database.execute_one("""
                SELECT t.name, wi.title as workflow_title
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))

            if not task:
                return

            notification_data = {
                'task_id': str(task_id),
                'task_name': task['name'],
                'workflow_title': task['workflow_title'],
                'returned_by_name': returned_by_name,
                'return_reason': return_reason
            }

            NotificationService.send_notification(
                user_id, 'task_returned_for_edit', notification_data
            )

        except Exception as e:
            logger.error(f"Error sending task returned for edit notification: {e}")
            
            
            
    # Add this template to the default templates dictionary above:
    def get_return_task_templates():
        """Get additional templates specific to return task functionality"""
        return {
            'return_task_escalation': {
                'title': 'OVERDUE: Edit Required for {{task_name}}',
                'message': '''ESCALATION LEVEL {{escalation_level}}: Task requiring edits is {{hours_overdue}} hours overdue.

    Task: "{{task_name}}" in workflow "{{workflow_title}}"
    Original feedback: {{return_reason}}
    Due date: {{due_date}}

    Immediate action is required to prevent further delays.'''
            },
            'return_task_auto_reminder': {
                'title': 'Daily Reminder: Edit Required for {{task_name}}',
                'message': '''Daily reminder: You have a task requiring edits.

    Task: "{{task_name}}" in workflow "{{workflow_title}}"
    Feedback: {{return_reason}}
    Due: {{due_date}}

    Please complete your edits to keep the workflow moving.'''
            }
        }