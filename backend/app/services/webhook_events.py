# app/services/webhook_events.py - Webhook Events Integration
"""
Webhook events integration system that automatically triggers webhooks
for various system events like workflow completion, task assignment, etc.
"""
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from contextlib import contextmanager

from app.database import Database
from app.services.webhook_delivery import webhook_delivery_service
from app.utils.json_utils import JSONUtils

logger = logging.getLogger(__name__)


class WebhookEventTrigger:
    """System for automatically triggering webhooks based on system events"""
    
    def __init__(self):
        self.delivery_service = webhook_delivery_service
        self.enabled = True
    
    def trigger_webhook_event(self, event_type: str, payload: Dict, 
                             tenant_id: str, **kwargs) -> Dict[str, Any]:
        """
        Trigger webhook event for all registered webhooks
        
        Args:
            event_type: Type of event (e.g., 'workflow_started')
            payload: Event payload data
            tenant_id: Tenant identifier
            **kwargs: Additional options
        
        Returns:
            Delivery result summary
        """
        if not self.enabled:
            logger.debug(f"Webhook events disabled, skipping event {event_type}")
            return {'success': True, 'delivered_count': 0, 'message': 'Webhooks disabled'}
        
        try:
            # Enhance payload with standard webhook metadata
            enhanced_payload = self._enhance_event_payload(event_type, payload, tenant_id, kwargs)
            
            # Trigger webhook delivery
            result = self.delivery_service.deliver_webhook(
                event_type=event_type,
                payload=enhanced_payload,
                tenant_id=tenant_id,
                **kwargs
            )
            
            logger.info(f"Webhook event {event_type} triggered: "
                       f"{result.get('delivered_count', 0)} delivered, "
                       f"{result.get('queued_count', 0)} queued, "
                       f"{result.get('failed_count', 0)} failed")
            
            return result
            
        except Exception as e:
            logger.error(f"Error triggering webhook event {event_type}: {e}")
            return {
                'success': False,
                'error': str(e),
                'delivered_count': 0,
                'failed_count': 1
            }
    
    def _enhance_event_payload(self, event_type: str, payload: Dict, 
                              tenant_id: str, options: Dict) -> Dict:
        """Enhance event payload with standard metadata"""
        enhanced_payload = payload.copy()
        
        # Add standard event metadata
        enhanced_payload['_event_metadata'] = {
            'event_type': event_type,
            'tenant_id': tenant_id,
            'timestamp': datetime.now().isoformat(),
            'source': 'workflow_management_system',
            'version': '2.1'
        }
        
        # Add optional metadata
        if options.get('user_id'):
            enhanced_payload['_event_metadata']['triggered_by'] = options['user_id']
        
        if options.get('source_component'):
            enhanced_payload['_event_metadata']['source_component'] = options['source_component']
        
        return enhanced_payload
    
    def enable(self):
        """Enable webhook event triggering"""
        self.enabled = True
        logger.info("Webhook event triggering enabled")
    
    def disable(self):
        """Disable webhook event triggering"""
        self.enabled = False
        logger.info("Webhook event triggering disabled")


# Global webhook event trigger
webhook_event_trigger = WebhookEventTrigger()


class WebhookEventHelpers:
    """Helper functions for triggering common webhook events"""
    
    @staticmethod
    def workflow_started(workflow_instance_id: str, workflow_data: Dict, 
                        initiated_by: str, tenant_id: str, **kwargs) -> Dict:
        """Trigger webhook for workflow started event"""
        try:
            # Get workflow instance details
            workflow_instance = Database.execute_one("""
                SELECT wi.*, w.name as workflow_name, w.description,
                       u.first_name || ' ' || u.last_name as initiated_by_name,
                       u.email as initiated_by_email
                FROM workflow_instances wi
                JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN users u ON wi.initiated_by = u.id
                WHERE wi.id = %s
            """, (workflow_instance_id,))
            
            if not workflow_instance:
                logger.warning(f"Workflow instance {workflow_instance_id} not found for webhook")
                return {'success': False, 'error': 'Workflow instance not found'}
            
            payload = {
                'workflow_instance_id': workflow_instance_id,
                'workflow_id': workflow_instance['workflow_id'],
                'workflow_name': workflow_instance['workflow_name'],
                'workflow_title': workflow_instance['title'],
                'workflow_description': workflow_instance['description'],
                'status': workflow_instance['status'],
                'priority': workflow_instance['priority'],
                'initiated_by': initiated_by,
                'initiated_by_name': workflow_instance['initiated_by_name'],
                'initiated_by_email': workflow_instance['initiated_by_email'],
                'due_date': workflow_instance['due_date'].isoformat() if workflow_instance['due_date'] else None,
                'created_at': workflow_instance['created_at'].isoformat(),
                'workflow_data': workflow_data
            }
            
            return webhook_event_trigger.trigger_webhook_event(
                'workflow_started', payload, tenant_id,
                user_id=initiated_by, source_component='workflow_engine', **kwargs
            )
            
        except Exception as e:
            logger.error(f"Error triggering workflow_started webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def workflow_completed(workflow_instance_id: str, completed_by: str = None, 
                          tenant_id: str = None, **kwargs) -> Dict:
        """Trigger webhook for workflow completed event"""
        try:
            # Get workflow instance details with completion info
            workflow_instance = Database.execute_one("""
                SELECT wi.*, w.name as workflow_name, w.description,
                       u1.first_name || ' ' || u1.last_name as initiated_by_name,
                       u1.email as initiated_by_email,
                       u2.first_name || ' ' || u2.last_name as completed_by_name,
                       u2.email as completed_by_email,
                       EXTRACT(EPOCH FROM (wi.completed_at - wi.created_at)) as duration_seconds
                FROM workflow_instances wi
                JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN users u1 ON wi.initiated_by = u1.id
                LEFT JOIN users u2 ON %s = u2.id
                WHERE wi.id = %s
            """, (completed_by, workflow_instance_id))
            
            if not workflow_instance:
                logger.warning(f"Workflow instance {workflow_instance_id} not found for webhook")
                return {'success': False, 'error': 'Workflow instance not found'}
            
            # Get workflow tasks summary
            tasks_summary = Database.execute_one("""
                SELECT 
                    COUNT(*) as total_tasks,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_tasks,
                    COUNT(CASE WHEN status = 'skipped' THEN 1 END) as skipped_tasks,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_tasks
                FROM tasks
                WHERE workflow_instance_id = %s
            """, (workflow_instance_id,))
            
            workflow_data = JSONUtils.safe_parse_json(workflow_instance['data'], {})
            
            payload = {
                'workflow_instance_id': workflow_instance_id,
                'workflow_id': workflow_instance['workflow_id'],
                'workflow_name': workflow_instance['workflow_name'],
                'workflow_title': workflow_instance['title'],
                'workflow_description': workflow_instance['description'],
                'status': workflow_instance['status'],
                'priority': workflow_instance['priority'],
                'initiated_by': workflow_instance['initiated_by'],
                'initiated_by_name': workflow_instance['initiated_by_name'],
                'initiated_by_email': workflow_instance['initiated_by_email'],
                'completed_by': completed_by,
                'completed_by_name': workflow_instance['completed_by_name'],
                'completed_by_email': workflow_instance['completed_by_email'],
                'created_at': workflow_instance['created_at'].isoformat(),
                'completed_at': workflow_instance['completed_at'].isoformat() if workflow_instance['completed_at'] else None,
                'duration_seconds': int(workflow_instance['duration_seconds']) if workflow_instance['duration_seconds'] else None,
                'duration_formatted': WebhookEventHelpers._format_duration(workflow_instance['duration_seconds']),
                'tasks_summary': dict(tasks_summary) if tasks_summary else {},
                'workflow_data': workflow_data
            }
            
            tenant_id = tenant_id or workflow_instance['tenant_id']
            
            return webhook_event_trigger.trigger_webhook_event(
                'workflow_completed', payload, tenant_id,
                user_id=completed_by, source_component='workflow_engine', **kwargs
            )
            
        except Exception as e:
            logger.error(f"Error triggering workflow_completed webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def workflow_failed(workflow_instance_id: str, error_message: str,
                       failed_step: str = None, tenant_id: str = None, **kwargs) -> Dict:
        """Trigger webhook for workflow failed event"""
        try:
            workflow_instance = Database.execute_one("""
                SELECT wi.*, w.name as workflow_name,
                       u.first_name || ' ' || u.last_name as initiated_by_name,
                       u.email as initiated_by_email
                FROM workflow_instances wi
                JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN users u ON wi.initiated_by = u.id
                WHERE wi.id = %s
            """, (workflow_instance_id,))
            
            if not workflow_instance:
                return {'success': False, 'error': 'Workflow instance not found'}
            
            workflow_data = JSONUtils.safe_parse_json(workflow_instance['data'], {})
            
            payload = {
                'workflow_instance_id': workflow_instance_id,
                'workflow_id': workflow_instance['workflow_id'],
                'workflow_name': workflow_instance['workflow_name'],
                'workflow_title': workflow_instance['title'],
                'status': 'failed',
                'initiated_by': workflow_instance['initiated_by'],
                'initiated_by_name': workflow_instance['initiated_by_name'],
                'initiated_by_email': workflow_instance['initiated_by_email'],
                'created_at': workflow_instance['created_at'].isoformat(),
                'failed_at': datetime.now().isoformat(),
                'error_message': error_message,
                'failed_step': failed_step,
                'workflow_data': workflow_data
            }
            
            tenant_id = tenant_id or workflow_instance['tenant_id']
            
            return webhook_event_trigger.trigger_webhook_event(
                'workflow_failed', payload, tenant_id,
                source_component='workflow_engine', **kwargs
            )
            
        except Exception as e:
            logger.error(f"Error triggering workflow_failed webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def task_assigned(task_id: str, assigned_to: str, assigned_by: str = None,
                     tenant_id: str = None, **kwargs) -> Dict:
        """Trigger webhook for task assigned event"""
        try:
            # Get task details with workflow and assignee info
            task = Database.execute_one("""
                SELECT t.*, wi.title as workflow_title, wi.tenant_id,
                       w.name as workflow_name,
                       u1.first_name || ' ' || u1.last_name as assigned_to_name,
                       u1.email as assigned_to_email,
                       u2.first_name || ' ' || u2.last_name as assigned_by_name,
                       u2.email as assigned_by_email,
                       fd.name as form_name
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN users u1 ON t.assigned_to = u1.id
                LEFT JOIN users u2 ON %s = u2.id
                LEFT JOIN form_definitions fd ON t.form_id = fd.id
                WHERE t.id = %s
            """, (assigned_by, task_id))
            
            if not task:
                return {'success': False, 'error': 'Task not found'}
            
            form_data = JSONUtils.safe_parse_json(task['form_data'], {})
            task_metadata = JSONUtils.safe_parse_json(task['metadata'], {})
            
            payload = {
                'task_id': task_id,
                'task_name': task['name'],
                'task_description': task['description'],
                'task_type': task['type'],
                'step_id': task['step_id'],
                'workflow_instance_id': task['workflow_instance_id'],
                'workflow_title': task['workflow_title'],
                'workflow_name': task['workflow_name'],
                'assigned_to': assigned_to,
                'assigned_to_name': task['assigned_to_name'],
                'assigned_to_email': task['assigned_to_email'],
                'assigned_by': assigned_by,
                'assigned_by_name': task['assigned_by_name'],
                'assigned_by_email': task['assigned_by_email'],
                'due_date': task['due_date'].isoformat() if task['due_date'] else None,
                'priority': task.get('priority', 'medium'),
                'form_id': task['form_id'],
                'form_name': task['form_name'],
                'form_data': form_data,
                'metadata': task_metadata,
                'created_at': task['created_at'].isoformat(),
                'assigned_at': datetime.now().isoformat()
            }
            
            tenant_id = tenant_id or task['tenant_id']
            
            return webhook_event_trigger.trigger_webhook_event(
                'task_assigned', payload, tenant_id,
                user_id=assigned_by, source_component='task_management', **kwargs
            )
            
        except Exception as e:
            logger.error(f"Error triggering task_assigned webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def task_completed(task_id: str, completed_by: str, result_data: Dict = None,
                      tenant_id: str = None, **kwargs) -> Dict:
        """Trigger webhook for task completed event"""
        try:
            task = Database.execute_one("""
                SELECT t.*, wi.title as workflow_title, wi.tenant_id,
                       w.name as workflow_name,
                       u1.first_name || ' ' || u1.last_name as assigned_to_name,
                       u2.first_name || ' ' || u2.last_name as completed_by_name,
                       u2.email as completed_by_email,
                       EXTRACT(EPOCH FROM (t.completed_at - t.created_at)) as duration_seconds
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN users u1 ON t.assigned_to = u1.id
                LEFT JOIN users u2 ON t.completed_by = u2.id
                WHERE t.id = %s
            """, (task_id,))
            
            if not task:
                return {'success': False, 'error': 'Task not found'}
            
            task_result = JSONUtils.safe_parse_json(task['result'], {})
            if result_data:
                task_result.update(result_data)
            
            payload = {
                'task_id': task_id,
                'task_name': task['name'],
                'task_type': task['type'],
                'step_id': task['step_id'],
                'workflow_instance_id': task['workflow_instance_id'],
                'workflow_title': task['workflow_title'],
                'workflow_name': task['workflow_name'],
                'assigned_to': task['assigned_to'],
                'assigned_to_name': task['assigned_to_name'],
                'completed_by': completed_by,
                'completed_by_name': task['completed_by_name'],
                'completed_by_email': task['completed_by_email'],
                'status': task['status'],
                'created_at': task['created_at'].isoformat(),
                'completed_at': task['completed_at'].isoformat() if task['completed_at'] else None,
                'duration_seconds': int(task['duration_seconds']) if task['duration_seconds'] else None,
                'duration_formatted': WebhookEventHelpers._format_duration(task['duration_seconds']),
                'result': task_result
            }
            
            tenant_id = tenant_id or task['tenant_id']
            
            return webhook_event_trigger.trigger_webhook_event(
                'task_completed', payload, tenant_id,
                user_id=completed_by, source_component='task_management', **kwargs
            )
            
        except Exception as e:
            logger.error(f"Error triggering task_completed webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def approval_requested(task_id: str, approver_id: str, request_data: Dict,
                          tenant_id: str = None, **kwargs) -> Dict:
        """Trigger webhook for approval requested event"""
        try:
            task = Database.execute_one("""
                SELECT t.*, wi.title as workflow_title, wi.tenant_id,
                       w.name as workflow_name,
                       u1.first_name || ' ' || u1.last_name as approver_name,
                       u1.email as approver_email,
                       u2.first_name || ' ' || u2.last_name as requestor_name,
                       u2.email as requestor_email
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN users u1 ON t.assigned_to = u1.id
                LEFT JOIN users u2 ON wi.initiated_by = u2.id
                WHERE t.id = %s AND t.type = 'approval'
            """, (task_id,))
            
            if not task:
                return {'success': False, 'error': 'Approval task not found'}
            
            payload = {
                'task_id': task_id,
                'approval_id': task_id,  # For backward compatibility
                'task_name': task['name'],
                'workflow_instance_id': task['workflow_instance_id'],
                'workflow_title': task['workflow_title'],
                'workflow_name': task['workflow_name'],
                'approver_id': approver_id,
                'approver_name': task['approver_name'],
                'approver_email': task['approver_email'],
                'requestor_name': task['requestor_name'],
                'requestor_email': task['requestor_email'],
                'due_date': task['due_date'].isoformat() if task['due_date'] else None,
                'priority': task.get('priority', 'medium'),
                'request_data': request_data,
                'approval_url': f"{kwargs.get('base_url', '')}/tasks/{task_id}/approve",
                'created_at': task['created_at'].isoformat()
            }
            
            tenant_id = tenant_id or task['tenant_id']
            
            return webhook_event_trigger.trigger_webhook_event(
                'approval_requested', payload, tenant_id,
                user_id=approver_id, source_component='approval_system', 
                priority=7, **kwargs  # Higher priority for approvals
            )
            
        except Exception as e:
            logger.error(f"Error triggering approval_requested webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def approval_completed(task_id: str, decision: str, approved_by: str,
                          comments: str = None, tenant_id: str = None, **kwargs) -> Dict:
        """Trigger webhook for approval completed event"""
        try:
            task = Database.execute_one("""
                SELECT t.*, wi.title as workflow_title, wi.tenant_id,
                       w.name as workflow_name,
                       u1.first_name || ' ' || u1.last_name as approved_by_name,
                       u1.email as approved_by_email,
                       u2.first_name || ' ' || u2.last_name as requestor_name,
                       u2.email as requestor_email
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN users u1 ON t.completed_by = u1.id
                LEFT JOIN users u2 ON wi.initiated_by = u2.id
                WHERE t.id = %s
            """, (task_id,))
            
            if not task:
                return {'success': False, 'error': 'Task not found'}
            
            result_data = JSONUtils.safe_parse_json(task['result'], {})
            
            payload = {
                'task_id': task_id,
                'approval_id': task_id,
                'task_name': task['name'],
                'workflow_instance_id': task['workflow_instance_id'],
                'workflow_title': task['workflow_title'],
                'workflow_name': task['workflow_name'],
                'decision': decision,
                'approved_by': approved_by,
                'approved_by_name': task['approved_by_name'],
                'approved_by_email': task['approved_by_email'],
                'requestor_name': task['requestor_name'],
                'requestor_email': task['requestor_email'],
                'comments': comments,
                'result_data': result_data,
                'completed_at': task['completed_at'].isoformat() if task['completed_at'] else None,
                'created_at': task['created_at'].isoformat()
            }
            
            tenant_id = tenant_id or task['tenant_id']
            
            event_type = 'approval_approved' if decision == 'approved' else 'approval_rejected'
            
            return webhook_event_trigger.trigger_webhook_event(
                event_type, payload, tenant_id,
                user_id=approved_by, source_component='approval_system', **kwargs
            )
            
        except Exception as e:
            logger.error(f"Error triggering approval_completed webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def sla_breach_warning(sla_breach_id: str, tenant_id: str, **kwargs) -> Dict:
        """Trigger webhook for SLA breach warning"""
        try:
            breach = Database.execute_one("""
                SELECT sb.*, sd.name as sla_name, sd.duration_hours,
                       wi.title as workflow_title, w.name as workflow_name,
                       t.name as task_name, t.assigned_to,
                       u.first_name || ' ' || u.last_name as assigned_to_name,
                       u.email as assigned_to_email
                FROM sla_breaches sb
                JOIN sla_definitions sd ON sb.sla_definition_id = sd.id
                LEFT JOIN workflow_instances wi ON sb.workflow_instance_id = wi.id
                LEFT JOIN workflows w ON wi.workflow_id = w.id
                LEFT JOIN tasks t ON sb.task_id = t.id
                LEFT JOIN users u ON t.assigned_to = u.id
                WHERE sb.id = %s
            """, (sla_breach_id,))
            
            if not breach:
                return {'success': False, 'error': 'SLA breach not found'}
            
            payload = {
                'sla_breach_id': sla_breach_id,
                'sla_name': breach['sla_name'],
                'duration_hours': breach['duration_hours'],
                'escalation_level': breach['escalation_level'],
                'workflow_instance_id': breach['workflow_instance_id'],
                'workflow_title': breach['workflow_title'],
                'workflow_name': breach['workflow_name'],
                'task_id': breach['task_id'],
                'task_name': breach['task_name'],
                'assigned_to': breach['assigned_to'],
                'assigned_to_name': breach['assigned_to_name'],
                'assigned_to_email': breach['assigned_to_email'],
                'breach_time': breach['breach_time'].isoformat(),
                'severity': 'warning' if breach['escalation_level'] == 1 else 'critical'
            }
            
            return webhook_event_trigger.trigger_webhook_event(
                'sla_breach', payload, tenant_id,
                source_component='sla_monitoring', priority=8, **kwargs
            )
            
        except Exception as e:
            logger.error(f"Error triggering sla_breach webhook: {e}")
            return {'success': False, 'error': str(e)}
    
    @staticmethod
    def _format_duration(duration_seconds: float) -> str:
        """Format duration in seconds to human readable format"""
        if not duration_seconds:
            return "0 seconds"
        
        duration_seconds = int(duration_seconds)
        
        if duration_seconds < 60:
            return f"{duration_seconds} seconds"
        elif duration_seconds < 3600:
            minutes = duration_seconds // 60
            seconds = duration_seconds % 60
            return f"{minutes} minutes" + (f" {seconds} seconds" if seconds > 0 else "")
        elif duration_seconds < 86400:
            hours = duration_seconds // 3600
            minutes = (duration_seconds % 3600) // 60
            return f"{hours} hours" + (f" {minutes} minutes" if minutes > 0 else "")
        else:
            days = duration_seconds // 86400
            hours = (duration_seconds % 86400) // 3600
            return f"{days} days" + (f" {hours} hours" if hours > 0 else "")


# Integration decorator for automatic webhook triggering
def trigger_webhook_on_event(event_type: str, **event_kwargs):
    """
    Decorator to automatically trigger webhook events after function execution
    
    Usage:
        @trigger_webhook_on_event('workflow_started', extract_tenant_from='workflow_instance')
        def start_workflow(workflow_id, data, user_id):
            # Function implementation
            return workflow_instance_id
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            # Execute the original function
            result = func(*args, **kwargs)
            
            try:
                # Extract parameters for webhook triggering
                tenant_id = event_kwargs.get('tenant_id')
                if not tenant_id and event_kwargs.get('extract_tenant_from'):
                    # Extract tenant_id from result or parameters
                    extract_from = event_kwargs['extract_tenant_from']
                    if extract_from == 'workflow_instance' and result:
                        # Get tenant_id from workflow instance
                        instance = Database.execute_one("""
                            SELECT tenant_id FROM workflow_instances WHERE id = %s
                        """, (result,))
                        tenant_id = instance['tenant_id'] if instance else None
                
                if tenant_id:
                    # Trigger webhook event
                    payload = event_kwargs.get('payload', {})
                    if callable(payload):
                        payload = payload(result, *args, **kwargs)
                    
                    webhook_event_trigger.trigger_webhook_event(
                        event_type, payload, tenant_id,
                        **{k: v for k, v in event_kwargs.items() 
                           if k not in ['extract_tenant_from', 'payload']}
                    )
                
            except Exception as e:
                logger.error(f"Error triggering webhook event {event_type} in decorator: {e}")
            
            return result
        return wrapper
    return decorator


# Context manager for batch webhook events
@contextmanager
def webhook_batch_context(tenant_id: str, batch_name: str = None):
    """
    Context manager for batching webhook events
    
    Usage:
        with webhook_batch_context(tenant_id, 'bulk_task_assignment'):
            # All webhook events in this context will be batched
            for task in tasks:
                assign_task(task.id, user.id)
    """
    original_enabled = webhook_event_trigger.enabled
    batch_events = []
    
    class BatchWebhookTrigger:
        def trigger_webhook_event(self, event_type, payload, tenant_id, **kwargs):
            batch_events.append({
                'event_type': event_type,
                'payload': payload,
                'tenant_id': tenant_id,
                'options': kwargs
            })
            return {'success': True, 'batched': True}
    
    # Replace the webhook trigger temporarily
    original_trigger = webhook_event_trigger
    webhook_event_trigger.__class__ = BatchWebhookTrigger
    
    try:
        yield batch_events
    finally:
        # Restore original trigger
        webhook_event_trigger.__class__ = WebhookEventTrigger
        webhook_event_trigger.enabled = original_enabled
        
        # Process batched events
        if batch_events and original_enabled:
            logger.info(f"Processing {len(batch_events)} batched webhook events")
            for event in batch_events:
                try:
                    original_trigger.trigger_webhook_event(
                        event['event_type'],
                        event['payload'],
                        event['tenant_id'],
                        **event['options']
                    )
                except Exception as e:
                    logger.error(f"Error processing batched webhook event: {e}")


# Global webhook event helpers instance
webhook_events = WebhookEventHelpers()