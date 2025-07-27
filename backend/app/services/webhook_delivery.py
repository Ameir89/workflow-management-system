# app/services/webhook_delivery.py - Enhanced Webhook Delivery Service
"""
Enhanced webhook delivery service that integrates with queue management,
security, and provides comprehensive delivery guarantees
"""
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
import uuid

from app.database import Database
from app.services.webhook_queue import webhook_queue_manager, WebhookJob
from app.services.webhook_security import WebhookSecurity
from app.services.notification_service import NotificationService
from app.utils.json_utils import JSONUtils

logger = logging.getLogger(__name__)


class WebhookDeliveryService:
    """Enhanced webhook delivery service with queue integration"""
    
    def __init__(self):
        self.queue_manager = webhook_queue_manager
        self.security = WebhookSecurity()
    
    def deliver_webhook(self, event_type: str, payload: Dict, 
                       tenant_id: str, **kwargs) -> Dict[str, Any]:
        """
        Deliver webhook to all registered endpoints for an event
        
        Args:
            event_type: Type of event (e.g., 'workflow_started')
            payload: Event payload data
            tenant_id: Tenant identifier
            **kwargs: Additional options (priority, immediate, etc.)
        
        Returns:
            Dictionary with delivery summary
        """
        try:
            # Get all active webhooks for this event and tenant
            webhooks = Database.execute_query("""
                SELECT id, name, url, events, headers, secret, retry_count,
                       timeout_seconds, webhook_type, environment, is_active,
                       failure_count
                FROM webhooks
                WHERE tenant_id = %s 
                AND is_active = true
                AND (events @> %s OR events @> '["*"]')
                AND (environment = %s OR environment = 'production')
                ORDER BY priority DESC, created_at ASC
            """, (tenant_id, json.dumps([event_type]), 
                  kwargs.get('environment', 'production')))
            
            if not webhooks:
                logger.info(f"No webhooks found for event {event_type} in tenant {tenant_id}")
                return {
                    'success': True,
                    'delivered_count': 0,
                    'failed_count': 0,
                    'skipped_count': 0,
                    'message': 'No webhooks configured for this event'
                }
            
            delivery_results = {
                'delivered_count': 0,
                'failed_count': 0,
                'skipped_count': 0,
                'queued_count': 0,
                'details': []
            }
            
            # Process each webhook
            for webhook in webhooks:
                try:
                    result = self._process_webhook_delivery(
                        webhook, event_type, payload, kwargs
                    )
                    delivery_results['details'].append(result)
                    
                    if result['status'] == 'delivered':
                        delivery_results['delivered_count'] += 1
                    elif result['status'] == 'queued':
                        delivery_results['queued_count'] += 1
                    elif result['status'] == 'failed':
                        delivery_results['failed_count'] += 1
                    else:
                        delivery_results['skipped_count'] += 1
                        
                except Exception as e:
                    logger.error(f"Error processing webhook {webhook['id']}: {e}")
                    delivery_results['failed_count'] += 1
                    delivery_results['details'].append({
                        'webhook_id': webhook['id'],
                        'webhook_name': webhook['name'],
                        'status': 'error',
                        'error': str(e)
                    })
            
            # Log delivery summary
            total_processed = (delivery_results['delivered_count'] + 
                             delivery_results['queued_count'] +
                             delivery_results['failed_count'] + 
                             delivery_results['skipped_count'])
            
            logger.info(f"Webhook delivery summary for {event_type}: "
                       f"{total_processed} webhooks processed, "
                       f"{delivery_results['delivered_count']} delivered immediately, "
                       f"{delivery_results['queued_count']} queued, "
                       f"{delivery_results['failed_count']} failed, "
                       f"{delivery_results['skipped_count']} skipped")
            
            delivery_results['success'] = delivery_results['failed_count'] == 0
            return delivery_results
            
        except Exception as e:
            logger.error(f"Error in webhook delivery: {e}")
            return {
                'success': False,
                'error': str(e),
                'delivered_count': 0,
                'failed_count': 1,
                'skipped_count': 0
            }
    
    def _process_webhook_delivery(self, webhook: Dict, event_type: str, 
                                 payload: Dict, options: Dict) -> Dict:
        """
        Process delivery for a single webhook
        
        Args:
            webhook: Webhook configuration
            event_type: Event type
            payload: Event payload
            options: Delivery options
        
        Returns:
            Delivery result for this webhook
        """
        webhook_id = webhook['id']
        webhook_name = webhook['name']
        
        try:
            # Check if webhook should be skipped
            skip_reason = self._should_skip_webhook(webhook, event_type, options)
            if skip_reason:
                return {
                    'webhook_id': webhook_id,
                    'webhook_name': webhook_name,
                    'status': 'skipped',
                    'reason': skip_reason
                }
            
            # Prepare headers
            headers = self._prepare_headers(webhook, event_type)
            
            # Enhance payload with metadata
            enhanced_payload = self._enhance_payload(payload, webhook, event_type, options)
            
            # Determine delivery method
            immediate = options.get('immediate', False)
            priority = options.get('priority', 5)
            
            if immediate and webhook['failure_count'] < 3:
                # Try immediate delivery for high-priority webhooks
                try:
                    from app.services.webhook_processor import WebhookProcessor
                    processor = WebhookProcessor()
                    
                    success, status_code, response_body, error_details = processor.send_webhook_request_enhanced(
                        webhook, event_type, enhanced_payload
                    )
                    
                    if success:
                        # Record successful delivery
                        self._record_immediate_delivery(
                            webhook_id, event_type, enhanced_payload, 
                            status_code, response_body
                        )
                        
                        return {
                            'webhook_id': webhook_id,
                            'webhook_name': webhook_name,
                            'status': 'delivered',
                            'method': 'immediate',
                            'status_code': status_code,
                            'response_preview': response_body[:100] if response_body else None
                        }
                    else:
                        # Immediate delivery failed, fall back to queue
                        logger.warning(f"Immediate delivery failed for webhook {webhook_id}, queuing")
                        
                except Exception as e:
                    logger.warning(f"Immediate delivery error for webhook {webhook_id}: {e}")
            
            # Queue for asynchronous delivery
            job_id = self.queue_manager.enqueue_webhook(
                webhook_id=webhook_id,
                event_type=event_type,
                payload=enhanced_payload,
                url=webhook['url'],
                headers=headers,
                priority=priority,
                max_retries=webhook['retry_count'],
                timeout=webhook['timeout_seconds'],
                metadata={
                    'webhook_name': webhook_name,
                    'tenant_id': options.get('tenant_id'),
                    'original_event_time': options.get('event_time', datetime.now().isoformat()),
                    'is_test': options.get('is_test', False)
                }
            )
            
            if job_id:
                return {
                    'webhook_id': webhook_id,
                    'webhook_name': webhook_name,
                    'status': 'queued',
                    'method': 'asynchronous',
                    'job_id': job_id
                }
            else:
                return {
                    'webhook_id': webhook_id,
                    'webhook_name': webhook_name,
                    'status': 'failed',
                    'reason': 'Failed to enqueue'
                }
                
        except Exception as e:
            logger.error(f"Error processing webhook delivery for {webhook_id}: {e}")
            return {
                'webhook_id': webhook_id,
                'webhook_name': webhook_name,
                'status': 'error',
                'error': str(e)
            }
    
    def _should_skip_webhook(self, webhook: Dict, event_type: str, 
                           options: Dict) -> Optional[str]:
        """
        Determine if webhook should be skipped
        
        Returns:
            Skip reason if should skip, None otherwise
        """
        # Check if webhook is active
        if not webhook['is_active']:
            return "Webhook is inactive"
        
        # Check failure count threshold
        if webhook['failure_count'] > 10:
            return f"Too many recent failures ({webhook['failure_count']})"
        
        # Check environment
        webhook_env = webhook.get('environment', 'production')
        current_env = options.get('environment', 'production')
        if webhook_env != current_env and webhook_env != 'production':
            return f"Environment mismatch: webhook={webhook_env}, current={current_env}"
        
        # Check webhook type
        if webhook.get('webhook_type') == 'incoming':
            return "Cannot deliver to incoming webhook"
        
        # Check if event is in webhook's events list
        try:
            webhook_events = json.loads(webhook['events']) if isinstance(webhook['events'], str) else webhook['events']
            if event_type not in webhook_events and '*' not in webhook_events:
                return f"Event {event_type} not in webhook events"
        except (json.JSONDecodeError, TypeError):
            return "Invalid webhook events configuration"
        
        return None
    
    def _prepare_headers(self, webhook: Dict, event_type: str) -> Dict:
        """Prepare headers for webhook request"""
        headers = {'Content-Type': 'application/json'}
        
        # Add webhook-specific headers
        if webhook['headers']:
            try:
                webhook_headers = json.loads(webhook['headers']) if isinstance(webhook['headers'], str) else webhook['headers']
                headers.update(webhook_headers)
            except (json.JSONDecodeError, TypeError):
                logger.warning(f"Invalid headers configuration for webhook {webhook['id']}")
        
        # Add standard headers
        headers.update({
            'User-Agent': 'WorkflowManagement-Webhook/2.1',
            'X-Event-Type': event_type,
            'X-Delivery-ID': str(uuid.uuid4()),
            'X-Timestamp': str(int(datetime.now().timestamp())),
            'X-Webhook-ID': webhook['id']
        })
        
        return headers
    
    def _enhance_payload(self, payload: Dict, webhook: Dict, 
                        event_type: str, options: Dict) -> Dict:
        """Enhance payload with additional metadata"""
        enhanced_payload = payload.copy()
        
        # Add delivery metadata
        enhanced_payload['_webhook_metadata'] = {
            'event_type': event_type,
            'webhook_id': webhook['id'],
            'webhook_name': webhook['name'],
            'delivery_timestamp': datetime.now().isoformat(),
            'delivery_id': str(uuid.uuid4()),
            'version': '2.1'
        }
        
        # Add tenant context if available
        if options.get('tenant_id'):
            enhanced_payload['_webhook_metadata']['tenant_id'] = options['tenant_id']
        
        # Add test flag
        if options.get('is_test'):
            enhanced_payload['_webhook_metadata']['is_test'] = True
        
        return enhanced_payload
    
    def _record_immediate_delivery(self, webhook_id: str, event_type: str,
                                 payload: Dict, status_code: int, 
                                 response_body: str) -> None:
        """Record successful immediate delivery"""
        try:
            Database.execute_insert("""
                INSERT INTO webhook_deliveries 
                (webhook_id, event_type, payload, response_status, response_body,
                 delivery_attempts, execution_time_ms, last_attempt_at, 
                 delivered_at, webhook_type, is_test)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), NOW(), %s, %s)
            """, (
                webhook_id, event_type, json.dumps(payload),
                status_code, response_body[:1000],  # Limit response size
                1, 0,  # execution_time_ms will be updated by actual measurement
                'outgoing', payload.get('_webhook_metadata', {}).get('is_test', False)
            ))
        except Exception as e:
            logger.error(f"Error recording immediate delivery: {e}")
    
    def test_webhook_endpoint(self, webhook_id: str, test_payload: Dict = None,
                            user_id: str = None) -> Dict:
        """
        Test a webhook endpoint with a test payload
        
        Args:
            webhook_id: Webhook to test
            test_payload: Custom test payload (optional)
            user_id: User performing the test
        
        Returns:
            Test result
        """
        try:
            # Get webhook configuration
            webhook = Database.execute_one("""
                SELECT * FROM webhooks WHERE id = %s
            """, (webhook_id,))
            
            if not webhook:
                return {
                    'success': False,
                    'error': 'Webhook not found'
                }
            
            # Prepare test payload
            if test_payload is None:
                test_payload = {
                    'event_type': 'webhook_test',
                    'test_id': str(uuid.uuid4()),
                    'timestamp': datetime.now().isoformat(),
                    'message': 'This is a test webhook delivery',
                    'data': {
                        'webhook_id': webhook_id,
                        'webhook_name': webhook['name'],
                        'tested_by': user_id
                    }
                }
            
            # Add test metadata
            test_payload['_webhook_metadata'] = {
                'is_test': True,
                'test_timestamp': datetime.now().isoformat(),
                'tested_by': user_id
            }
            
            # Prepare headers
            headers = self._prepare_headers(webhook, 'webhook_test')
            
            # Use immediate delivery for testing
            from app.services.webhook_processor import WebhookProcessor
            processor = WebhookProcessor()
            
            start_time = datetime.now()
            success, status_code, response_body, error_details = processor.send_webhook_request_enhanced(
                webhook, 'webhook_test', test_payload
            )
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            
            # Record test delivery
            Database.execute_insert("""
                INSERT INTO webhook_deliveries 
                (webhook_id, event_type, payload, response_status, response_body,
                 delivery_attempts, execution_time_ms, last_attempt_at, 
                 delivered_at, webhook_type, is_test)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s)
            """, (
                webhook_id, 'webhook_test', json.dumps(test_payload),
                status_code, response_body[:1000],
                1, int(execution_time),
                datetime.now() if success else None,
                'outgoing', True
            ))
            
            return {
                'success': success,
                'status_code': status_code,
                'response_body': response_body[:500] if response_body else None,
                'execution_time_ms': int(execution_time),
                'test_payload': test_payload,
                'error_details': error_details if not success else None,
                'timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Error testing webhook {webhook_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'timestamp': datetime.now().isoformat()
            }
    
    def get_delivery_stats(self, webhook_id: str = None, 
                          tenant_id: str = None, 
                          days: int = 30) -> Dict:
        """
        Get webhook delivery statistics
        
        Args:
            webhook_id: Specific webhook (optional)
            tenant_id: Tenant filter (optional)
            days: Number of days to analyze
        
        Returns:
            Delivery statistics
        """
        try:
            where_conditions = ["wd.created_at >= NOW() - INTERVAL '%s days'"]
            params = [days]
            
            if webhook_id:
                where_conditions.append("wd.webhook_id = %s")
                params.append(webhook_id)
            
            if tenant_id:
                where_conditions.append("w.tenant_id = %s")
                params.append(tenant_id)
            
            where_clause = "WHERE " + " AND ".join(where_conditions)
            
            stats = Database.execute_one(f"""
                SELECT 
                    COUNT(*) as total_deliveries,
                    COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
                    COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries,
                    COUNT(CASE WHEN wd.is_test THEN 1 END) as test_deliveries,
                    AVG(wd.execution_time_ms) as avg_execution_time_ms,
                    MAX(wd.execution_time_ms) as max_execution_time_ms,
                    AVG(wd.delivery_attempts) as avg_delivery_attempts,
                    COUNT(DISTINCT wd.webhook_id) as unique_webhooks,
                    COUNT(DISTINCT wd.event_type) as unique_event_types
                FROM webhook_deliveries wd
                LEFT JOIN webhooks w ON wd.webhook_id = w.id
                {where_clause}
            """, params)
            
            if not stats:
                return {
                    'total_deliveries': 0,
                    'successful_deliveries': 0,
                    'failed_deliveries': 0,
                    'success_rate': 0.0
                }
            
            # Calculate success rate
            total = stats['total_deliveries']
            successful = stats['successful_deliveries']
            success_rate = (successful / total * 100) if total > 0 else 0.0
            
            # Get event type breakdown
            event_stats = Database.execute_query(f"""
                SELECT 
                    wd.event_type,
                    COUNT(*) as delivery_count,
                    COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_count
                FROM webhook_deliveries wd
                LEFT JOIN webhooks w ON wd.webhook_id = w.id
                {where_clause}
                GROUP BY wd.event_type
                ORDER BY delivery_count DESC
                LIMIT 10
            """, params)
            
            return {
                'total_deliveries': stats['total_deliveries'],
                'successful_deliveries': stats['successful_deliveries'],
                'failed_deliveries': stats['failed_deliveries'],
                'test_deliveries': stats['test_deliveries'],
                'success_rate': round(success_rate, 2),
                'avg_execution_time_ms': round(float(stats['avg_execution_time_ms']), 2) if stats['avg_execution_time_ms'] else 0,
                'max_execution_time_ms': stats['max_execution_time_ms'] or 0,
                'avg_delivery_attempts': round(float(stats['avg_delivery_attempts']), 2) if stats['avg_delivery_attempts'] else 0,
                'unique_webhooks': stats['unique_webhooks'],
                'unique_event_types': stats['unique_event_types'],
                'event_breakdown': [dict(event) for event in event_stats]
            }
            
        except Exception as e:
            logger.error(f"Error getting delivery stats: {e}")
            return {
                'error': str(e),
                'total_deliveries': 0,
                'successful_deliveries': 0,
                'failed_deliveries': 0,
                'success_rate': 0.0
            }
    
    def retry_failed_deliveries(self, webhook_id: str = None, 
                               max_age_hours: int = 24) -> Dict:
        """
        Retry failed webhook deliveries
        
        Args:
            webhook_id: Specific webhook to retry (optional)
            max_age_hours: Maximum age of failures to retry
        
        Returns:
            Retry operation result
        """
        try:
            where_conditions = [
                "wd.delivered_at IS NULL",
                "wd.response_status >= 400",
                "wd.delivery_attempts < w.retry_count",
                "wd.created_at >= NOW() - INTERVAL '%s hours'"
            ]
            params = [max_age_hours]
            
            if webhook_id:
                where_conditions.append("wd.webhook_id = %s")
                params.append(webhook_id)
            
            where_clause = "WHERE " + " AND ".join(where_conditions)
            
            # Get failed deliveries to retry
            failed_deliveries = Database.execute_query(f"""
                SELECT wd.*, w.url, w.headers, w.secret, w.retry_count, w.timeout_seconds
                FROM webhook_deliveries wd
                JOIN webhooks w ON wd.webhook_id = w.id
                {where_clause}
                ORDER BY wd.created_at DESC
                LIMIT 100
            """, params)
            
            retry_count = 0
            for delivery in failed_deliveries:
                try:
                    # Queue for retry
                    job_id = self.queue_manager.enqueue_webhook(
                        webhook_id=delivery['webhook_id'],
                        event_type=delivery['event_type'],
                        payload=json.loads(delivery['payload']),
                        url=delivery['url'],
                        headers=json.loads(delivery['headers']) if delivery['headers'] else {},
                        priority=7,  # Higher priority for retries
                        max_retries=delivery['retry_count'] - delivery['delivery_attempts'],
                        timeout=delivery['timeout_seconds'],
                        metadata={'is_retry': True, 'original_delivery_id': delivery['id']}
                    )
                    
                    if job_id:
                        retry_count += 1
                        
                except Exception as e:
                    logger.error(f"Error queuing retry for delivery {delivery['id']}: {e}")
            
            return {
                'success': True,
                'retry_count': retry_count,
                'total_failed': len(failed_deliveries),
                'message': f'Queued {retry_count} deliveries for retry'
            }
            
        except Exception as e:
            logger.error(f"Error retrying failed deliveries: {e}")
            return {
                'success': False,
                'error': str(e),
                'retry_count': 0
            }


# Global delivery service instance
webhook_delivery_service = WebhookDeliveryService()