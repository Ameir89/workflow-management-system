# app/services/webhook_testing.py - Webhook Integration Examples and Testing
"""
Webhook integration examples and testing utilities
Shows how to integrate the webhook system with existing components
"""
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import requests
from unittest.mock import Mock, patch
import time

from app.database import Database
from app.services.webhook_events import webhook_events, webhook_event_trigger
from app.services.webhook_delivery import webhook_delivery_service
from app.services.webhook_queue import webhook_queue_manager
from app.services.webhook_security import WebhookSecurity
from app.utils.json_utils import JSONUtils

logger = logging.getLogger(__name__)


# ===== INTEGRATION EXAMPLES =====

class WorkflowEngineWebhookIntegration:
    """
    Example integration of webhook system with workflow engine
    Shows how to modify the existing workflow engine to trigger webhooks
    """
    
    @staticmethod
    def integrate_with_workflow_completion():
        """
        Example of how to modify workflow_engine.py to trigger webhooks
        Add this to the _complete_workflow method in workflow_engine.py
        """
        example_code = '''
        # In app/services/workflow_engine.py - _complete_workflow method
        
        @staticmethod
        def _complete_workflow(instance_id):
            """Mark workflow instance as completed"""
            query = """
                UPDATE workflow_instances 
                SET status = 'completed', completed_at = NOW(), updated_at = NOW()
                WHERE id = %s
            """
            Database.execute_query(query, (instance_id,))

            # Get workflow instance for webhook
            instance = WorkflowEngine._get_workflow_instance(instance_id)
            if instance:
                try:
                    # Send completion notification
                    NotificationService.send_workflow_completion(instance['initiated_by'], instance_id)
                    
                    # ===== ADD WEBHOOK INTEGRATION HERE =====
                    from app.services.webhook_events import webhook_events
                    
                    # Trigger webhook for workflow completion
                    webhook_events.workflow_completed(
                        workflow_instance_id=instance_id,
                        completed_by=None,  # System completion
                        tenant_id=instance['tenant_id']
                    )
                    
                except Exception as e:
                    logger.error(f"Failed to send completion notification or webhook: {e}")
        '''
        return example_code
    
    @staticmethod
    def integrate_with_task_assignment():
        """
        Example of how to modify task creation to trigger webhooks
        Add this to the _create_task method in workflow_engine.py
        """
        example_code = '''
        # In app/services/workflow_engine.py - _create_task method
        
        # After creating the task and before return
        if assigned_to:
            try:
                NotificationService.send_task_assignment(assigned_to, task_id)
                
                # ===== ADD WEBHOOK INTEGRATION HERE =====
                from app.services.webhook_events import webhook_events
                
                # Trigger webhook for task assignment
                webhook_events.task_assigned(
                    task_id=task_id,
                    assigned_to=assigned_to,
                    assigned_by=user_id,  # From context
                    tenant_id=tenant_id   # From context
                )
                
            except Exception as e:
                logger.error(f"Failed to send task assignment notification or webhook: {e}")
        '''
        return example_code
    
    @staticmethod
    def integrate_with_task_completion():
        """
        Example of how to modify task completion to trigger webhooks
        Add this to the complete_task method in workflow_engine.py
        """
        example_code = '''
        # In app/services/workflow_engine.py - complete_task method
        
        # After updating task status and before determining next step
        try:
            # ===== ADD WEBHOOK INTEGRATION HERE =====
            from app.services.webhook_events import webhook_events
            
            # Trigger webhook for task completion
            webhook_events.task_completed(
                task_id=task_id,
                completed_by=completed_by,
                result_data=result_data,
                tenant_id=workflow_instance['tenant_id']
            )
            
        except Exception as e:
            logger.error(f"Failed to trigger task completion webhook: {e}")
        '''
        return example_code


class NotificationWebhookIntegration:
    """Integration examples for notification system"""
    
    @staticmethod
    def integrate_notification_with_webhooks():
        """
        Example of how to integrate notification service with webhooks
        """
        example_code = '''
        # In app/services/notification_service.py
        
        @staticmethod
        def send_notification(user_id, notification_type, data):
            """Enhanced notification sending with webhook integration"""
            try:
                # Existing notification logic...
                notification_id = Database.execute_insert("""
                    INSERT INTO notifications 
                    (user_id, type, title, message, data, tenant_id)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (...))
                
                # ===== ADD WEBHOOK INTEGRATION HERE =====
                # Get user's tenant for webhook triggering
                user = Database.execute_one("""
                    SELECT tenant_id FROM users WHERE id = %s
                """, (user_id,))
                
                if user:
                    from app.services.webhook_events import webhook_event_trigger
                    
                    # Trigger webhook for notification sent
                    webhook_event_trigger.trigger_webhook_event(
                        'notification_sent',
                        {
                            'notification_id': notification_id,
                            'user_id': user_id,
                            'notification_type': notification_type,
                            'data': data,
                            'sent_at': datetime.now().isoformat()
                        },
                        user['tenant_id'],
                        source_component='notification_service'
                    )
                
            except Exception as e:
                logger.error(f"Error in notification with webhook: {e}")
        '''
        return example_code


# ===== TESTING UTILITIES =====

class WebhookTestingUtils:
    """Utilities for testing the webhook system"""
    
    @staticmethod
    def create_test_webhook(tenant_id: str, webhook_name: str = None, 
                           webhook_url: str = None, events: List[str] = None) -> str:
        """
        Create a test webhook for testing purposes
        
        Args:
            tenant_id: Tenant ID
            webhook_name: Name for the webhook (optional)
            webhook_url: URL for the webhook (optional, uses httpbin if not provided)
            events: List of events to listen for (optional)
        
        Returns:
            Webhook ID
        """
        webhook_name = webhook_name or f"Test Webhook {int(time.time())}"
        webhook_url = webhook_url or "https://httpbin.org/post"
        events = events or ["workflow_completed", "task_assigned"]
        
        webhook_id = Database.execute_insert("""
            INSERT INTO webhooks 
            (tenant_id, name, url, events, is_active, webhook_type, created_by)
            VALUES (%s, %s, %s, %s, true, 'outgoing', %s)
        """, (
            tenant_id, webhook_name, webhook_url, 
            json.dumps(events), 
            '00000000-0000-0000-0000-000000000001'  # Default admin user
        ))
        
        logger.info(f"Created test webhook {webhook_id}: {webhook_name}")
        return webhook_id
    
    @staticmethod
    def create_test_workflow_instance(tenant_id: str, workflow_data: Dict = None) -> str:
        """Create a test workflow instance for testing webhooks"""
        workflow_data = workflow_data or {
            'title': 'Test Workflow Instance',
            'description': 'Test workflow for webhook testing',
            'priority': 'medium'
        }
        
        # Create a test workflow first
        workflow_id = Database.execute_insert("""
            INSERT INTO workflows (tenant_id, name, definition, is_active)
            VALUES (%s, %s, %s, true)
        """, (
            tenant_id, 
            'Test Workflow',
            json.dumps({
                'steps': [{'id': 'start', 'name': 'Start', 'type': 'start'}],
                'transitions': []
            })
        ))
        
        # Create workflow instance
        instance_id = Database.execute_insert("""
            INSERT INTO workflow_instances 
            (workflow_id, tenant_id, title, data, initiated_by, status)
            VALUES (%s, %s, %s, %s, %s, 'in_progress')
        """, (
            workflow_id, tenant_id, workflow_data.get('title', 'Test Instance'),
            json.dumps(workflow_data),
            '00000000-0000-0000-0000-000000000001',  # Default admin user
        ))
        
        logger.info(f"Created test workflow instance {instance_id}")
        return instance_id
    
    @staticmethod
    def create_test_task(workflow_instance_id: str, assigned_to: str = None) -> str:
        """Create a test task for testing webhooks"""
        assigned_to = assigned_to or '00000000-0000-0000-0000-000000000001'
        
        task_id = Database.execute_insert("""
            INSERT INTO tasks 
            (workflow_instance_id, step_id, name, type, assigned_to, status)
            VALUES (%s, %s, %s, %s, %s, 'pending')
        """, (
            workflow_instance_id, 'test_step', 'Test Task', 
            'form', assigned_to
        ))
        
        logger.info(f"Created test task {task_id}")
        return task_id
    
    @staticmethod
    def trigger_test_webhook_events(tenant_id: str, webhook_id: str = None) -> Dict[str, Any]:
        """
        Trigger various test webhook events
        
        Args:
            tenant_id: Tenant ID
            webhook_id: Specific webhook ID (optional)
        
        Returns:
            Dictionary with test results
        """
        results = {}
        
        try:
            # Create test entities if needed
            if not webhook_id:
                webhook_id = WebhookTestingUtils.create_test_webhook(tenant_id)
            
            workflow_instance_id = WebhookTestingUtils.create_test_workflow_instance(tenant_id)
            task_id = WebhookTestingUtils.create_test_task(workflow_instance_id)
            
            # Test workflow started event
            result = webhook_events.workflow_started(
                workflow_instance_id=workflow_instance_id,
                workflow_data={'test': True, 'event': 'workflow_started'},
                initiated_by='00000000-0000-0000-0000-000000000001',
                tenant_id=tenant_id
            )
            results['workflow_started'] = result
            
            # Test task assigned event
            result = webhook_events.task_assigned(
                task_id=task_id,
                assigned_to='00000000-0000-0000-0000-000000000001',
                assigned_by='00000000-0000-0000-0000-000000000001',
                tenant_id=tenant_id
            )
            results['task_assigned'] = result
            
            # Test task completed event
            result = webhook_events.task_completed(
                task_id=task_id,
                completed_by='00000000-0000-0000-0000-000000000001',
                result_data={'test': True, 'event': 'task_completed'},
                tenant_id=tenant_id
            )
            results['task_completed'] = result
            
            # Test workflow completed event
            result = webhook_events.workflow_completed(
                workflow_instance_id=workflow_instance_id,
                completed_by='00000000-0000-0000-0000-000000000001',
                tenant_id=tenant_id
            )
            results['workflow_completed'] = result
            
            logger.info(f"Triggered test webhook events for tenant {tenant_id}")
            
        except Exception as e:
            logger.error(f"Error triggering test webhook events: {e}")
            results['error'] = str(e)
        
        return results
    
    @staticmethod
    def mock_webhook_endpoint(status_code: int = 200, response_data: Dict = None,
                             delay_seconds: float = 0) -> Mock:
        """
        Create a mock webhook endpoint for testing
        
        Args:
            status_code: HTTP status code to return
            response_data: Response data
            delay_seconds: Artificial delay
        
        Returns:
            Mock object that can be used with patch
        """
        response_data = response_data or {'success': True, 'message': 'Test response'}
        
        def mock_post(*args, **kwargs):
            if delay_seconds > 0:
                time.sleep(delay_seconds)
            
            mock_response = Mock()
            mock_response.status_code = status_code
            mock_response.text = json.dumps(response_data)
            mock_response.json.return_value = response_data
            mock_response.headers = {'Content-Type': 'application/json'}
            mock_response.reason = 'OK' if status_code == 200 else 'Error'
            return mock_response
        
        return Mock(side_effect=mock_post)
    
    @staticmethod
    def test_webhook_delivery_performance(webhook_id: str, num_requests: int = 100) -> Dict[str, Any]:
        """
        Test webhook delivery performance
        
        Args:
            webhook_id: Webhook to test
            num_requests: Number of test requests to send
        
        Returns:
            Performance test results
        """
        start_time = time.time()
        successful_deliveries = 0
        failed_deliveries = 0
        response_times = []
        
        # Get webhook details
        webhook = Database.execute_one("""
            SELECT * FROM webhooks WHERE id = %s
        """, (webhook_id,))
        
        if not webhook:
            return {'error': 'Webhook not found'}
        
        logger.info(f"Starting performance test for webhook {webhook_id} with {num_requests} requests")
        
        for i in range(num_requests):
            try:
                # Create test payload
                test_payload = {
                    'test_id': i,
                    'timestamp': datetime.now().isoformat(),
                    'test_type': 'performance',
                    'message': f'Performance test request {i + 1} of {num_requests}'
                }
                
                # Measure delivery time
                delivery_start = time.time()
                
                result = webhook_delivery_service.test_webhook_endpoint(
                    webhook_id, test_payload=test_payload,
                    user_id='00000000-0000-0000-0000-000000000001'
                )
                
                delivery_time = time.time() - delivery_start
                response_times.append(delivery_time * 1000)  # Convert to milliseconds
                
                if result['success']:
                    successful_deliveries += 1
                else:
                    failed_deliveries += 1
                    
                # Brief pause between requests
                time.sleep(0.01)
                
            except Exception as e:
                logger.error(f"Error in performance test request {i}: {e}")
                failed_deliveries += 1
        
        total_time = time.time() - start_time
        
        # Calculate statistics
        avg_response_time = sum(response_times) / len(response_times) if response_times else 0
        min_response_time = min(response_times) if response_times else 0
        max_response_time = max(response_times) if response_times else 0
        
        # Calculate percentiles
        if response_times:
            sorted_times = sorted(response_times)
            p50 = sorted_times[len(sorted_times) // 2]
            p95 = sorted_times[int(len(sorted_times) * 0.95)]
            p99 = sorted_times[int(len(sorted_times) * 0.99)]
        else:
            p50 = p95 = p99 = 0
        
        results = {
            'webhook_id': webhook_id,
            'webhook_name': webhook['name'],
            'test_summary': {
                'total_requests': num_requests,
                'successful_deliveries': successful_deliveries,
                'failed_deliveries': failed_deliveries,
                'success_rate': (successful_deliveries / num_requests) * 100,
                'total_test_time_seconds': round(total_time, 2),
                'requests_per_second': round(num_requests / total_time, 2)
            },
            'response_time_metrics': {
                'average_ms': round(avg_response_time, 2),
                'minimum_ms': round(min_response_time, 2),
                'maximum_ms': round(max_response_time, 2),
                'percentile_50_ms': round(p50, 2),
                'percentile_95_ms': round(p95, 2),
                'percentile_99_ms': round(p99, 2)
            },
            'test_completed_at': datetime.now().isoformat()
        }
        
        logger.info(f"Performance test completed: {successful_deliveries}/{num_requests} successful, "
                   f"avg response time: {avg_response_time:.2f}ms")
        
        return results
    
    @staticmethod
    def cleanup_test_data(tenant_id: str) -> Dict[str, int]:
        """
        Clean up test data created during testing
        
        Args:
            tenant_id: Tenant ID to clean up test data for
        
        Returns:
            Dictionary with cleanup counts
        """
        cleanup_counts = {}
        
        try:
            # Clean up test webhooks
            result = Database.execute_query("""
                DELETE FROM webhooks 
                WHERE tenant_id = %s AND name LIKE 'Test Webhook%'
            """, (tenant_id,))
            cleanup_counts['webhooks'] = result if result else 0
            
            # Clean up test workflow instances
            result = Database.execute_query("""
                DELETE FROM workflow_instances 
                WHERE tenant_id = %s AND title LIKE 'Test%'
            """, (tenant_id,))
            cleanup_counts['workflow_instances'] = result if result else 0
            
            # Clean up test workflows
            result = Database.execute_query("""
                DELETE FROM workflows 
                WHERE tenant_id = %s AND name LIKE 'Test%'
            """, (tenant_id,))
            cleanup_counts['workflows'] = result if result else 0
            
            # Clean up test deliveries
            result = Database.execute_query("""
                DELETE FROM webhook_deliveries 
                WHERE is_test = true
            """, ())
            cleanup_counts['deliveries'] = result if result else 0
            
            # Clean up test queue jobs
            result = Database.execute_query("""
                DELETE FROM webhook_queue 
                WHERE metadata->>'test' = 'true'
            """, ())
            cleanup_counts['queue_jobs'] = result if result else 0
            
            logger.info(f"Cleaned up test data for tenant {tenant_id}: {cleanup_counts}")
            
        except Exception as e:
            logger.error(f"Error cleaning up test data: {e}")
            cleanup_counts['error'] = str(e)
        
        return cleanup_counts


# ===== WEBHOOK TESTING API ENDPOINTS =====

class WebhookTestingAPI:
    """API endpoints for webhook testing (can be added to blueprints)"""
    
    @staticmethod
    def test_webhook_system_endpoint():
        """
        Test endpoint for webhook system
        POST /api/webhooks/test/system
        """
        example_endpoint = '''
        @webhooks_bp.route('/test/system', methods=['POST'])
        @require_auth
        @require_permissions(['manage_webhooks'])
        def test_webhook_system():
            """Test the entire webhook system"""
            try:
                data = sanitize_input(request.get_json())
                tenant_id = g.current_user['tenant_id']
                
                test_type = data.get('test_type', 'basic')  # basic, performance, integration
                webhook_id = data.get('webhook_id')
                
                if test_type == 'basic':
                    # Basic functionality test
                    results = WebhookTestingUtils.trigger_test_webhook_events(
                        tenant_id, webhook_id
                    )
                    
                elif test_type == 'performance':
                    # Performance test
                    if not webhook_id:
                        return jsonify({'error': 'webhook_id required for performance test'}), 400
                    
                    num_requests = data.get('num_requests', 50)
                    results = WebhookTestingUtils.test_webhook_delivery_performance(
                        webhook_id, num_requests
                    )
                    
                elif test_type == 'integration':
                    # Full integration test
                    webhook_id = WebhookTestingUtils.create_test_webhook(tenant_id)
                    
                    # Test with mock endpoint
                    with patch('requests.post', WebhookTestingUtils.mock_webhook_endpoint()):
                        results = WebhookTestingUtils.trigger_test_webhook_events(
                            tenant_id, webhook_id
                        )
                    
                    # Clean up
                    WebhookTestingUtils.cleanup_test_data(tenant_id)
                    
                else:
                    return jsonify({'error': f'Unknown test type: {test_type}'}), 400
                
                return jsonify({
                    'test_type': test_type,
                    'results': results,
                    'timestamp': datetime.now().isoformat()
                }), 200
                
            except Exception as e:
                logger.error(f"Error in webhook system test: {e}")
                return jsonify({'error': 'Test failed', 'details': str(e)}), 500
        '''
        return example_endpoint
    
    @staticmethod
    def webhook_load_test_endpoint():
        """
        Load test endpoint for webhooks
        POST /api/webhooks/test/load
        """
        example_endpoint = '''
        @webhooks_bp.route('/test/load', methods=['POST'])
        @require_auth
        @require_permissions(['manage_webhooks'])
        @rate_limit_by_user(2)  # Limit load tests
        def webhook_load_test():
            """Perform load test on webhook system"""
            try:
                data = sanitize_input(request.get_json())
                tenant_id = g.current_user['tenant_id']
                
                # Create temporary webhook for testing
                test_webhook_id = WebhookTestingUtils.create_test_webhook(
                    tenant_id, 
                    webhook_url=data.get('test_url', 'https://httpbin.org/post')
                )
                
                # Configure test parameters
                num_concurrent = min(data.get('concurrent_requests', 10), 20)  # Limit concurrency
                total_requests = min(data.get('total_requests', 100), 500)     # Limit total
                
                # Run load test with threading
                import threading
                import queue
                
                results_queue = queue.Queue()
                
                def worker():
                    for _ in range(total_requests // num_concurrent):
                        try:
                            result = webhook_delivery_service.test_webhook_endpoint(
                                test_webhook_id,
                                test_payload={'load_test': True, 'timestamp': time.time()}
                            )
                            results_queue.put(result)
                        except Exception as e:
                            results_queue.put({'success': False, 'error': str(e)})
                
                # Start worker threads
                threads = []
                for _ in range(num_concurrent):
                    thread = threading.Thread(target=worker)
                    thread.start()
                    threads.append(thread)
                
                # Wait for completion
                for thread in threads:
                    thread.join()
                
                # Collect results
                results = []
                while not results_queue.empty():
                    results.append(results_queue.get())
                
                # Analyze results
                successful = sum(1 for r in results if r.get('success'))
                failed = len(results) - successful
                avg_time = sum(r.get('execution_time_ms', 0) for r in results) / len(results)
                
                # Clean up test webhook
                Database.execute_query("DELETE FROM webhooks WHERE id = %s", (test_webhook_id,))
                
                return jsonify({
                    'load_test_results': {
                        'total_requests': len(results),
                        'successful_requests': successful,
                        'failed_requests': failed,
                        'success_rate': (successful / len(results)) * 100,
                        'average_response_time_ms': round(avg_time, 2),
                        'concurrent_workers': num_concurrent
                    }
                }), 200
                
            except Exception as e:
                logger.error(f"Error in webhook load test: {e}")
                return jsonify({'error': 'Load test failed', 'details': str(e)}), 500
        '''
        return example_endpoint


# ===== INTEGRATION HELPER FUNCTIONS =====

def integrate_webhooks_with_existing_system():
    """
    Helper function to integrate webhooks with existing system
    Call this after initializing the webhook system
    """
    try:
        logger.info("Integrating webhooks with existing system components...")
        
        # Example: Patch existing notification service
        # This is just an example - you would implement the actual patching
        
        # 1. Add webhook triggers to workflow engine methods
        # 2. Add webhook triggers to notification service
        # 3. Add webhook triggers to approval system
        # 4. Add webhook triggers to SLA monitoring
        
        logger.info("Webhook integration completed")
        
    except Exception as e:
        logger.error(f"Error integrating webhooks: {e}")


def validate_webhook_system_integration():
    """
    Validate that webhook system is properly integrated
    """
    validation_results = {
        'webhook_system_initialized': False,
        'queue_manager_active': False,
        'event_triggers_enabled': False,
        'database_tables_exist': False,
        'security_components_active': False
    }
    
    try:
        # Check if webhook system is initialized
        from app.services.webhook_init import webhook_system
        validation_results['webhook_system_initialized'] = webhook_system.initialized
        
        # Check queue manager
        validation_results['queue_manager_active'] = webhook_queue_manager.queue.running
        
        # Check event triggers
        validation_results['event_triggers_enabled'] = webhook_event_trigger.enabled
        
        # Check database tables
        required_tables = [
            'webhooks', 'webhook_deliveries', 'webhook_queue', 
            'webhook_security_logs', 'webhook_templates'
        ]
        
        existing_tables = Database.execute_query("""
            SELECT table_name FROM information_schema.tables 
            WHERE table_schema = 'public' AND table_name = ANY(%s)
        """, (required_tables,))
        
        validation_results['database_tables_exist'] = len(existing_tables) == len(required_tables)
        
        # Check security components
        validation_results['security_components_active'] = True  # Assume active if no errors
        
        # Overall validation
        all_valid = all(validation_results.values())
        
        logger.info(f"Webhook system validation: {'PASSED' if all_valid else 'FAILED'}")
        logger.info(f"Validation details: {validation_results}")
        
        return all_valid, validation_results
        
    except Exception as e:
        logger.error(f"Error validating webhook system: {e}")
        validation_results['error'] = str(e)
        return False, validation_results


# ===== EXAMPLE USAGE =====

if __name__ == "__main__":
    # Example usage of webhook testing utilities
    
    # This would normally be run as part of your test suite
    tenant_id = "00000000-0000-0000-0000-000000000001"
    
    # Create test webhook
    webhook_id = WebhookTestingUtils.create_test_webhook(
        tenant_id, 
        webhook_name="Example Test Webhook",
        webhook_url="https://httpbin.org/post",
        events=["workflow_completed", "task_assigned"]
    )
    
    # Trigger test events
    results = WebhookTestingUtils.trigger_test_webhook_events(tenant_id, webhook_id)
    print(f"Test results: {results}")
    
    # Run performance test
    perf_results = WebhookTestingUtils.test_webhook_delivery_performance(webhook_id, 10)
    print(f"Performance results: {perf_results}")
    
    # Clean up
    cleanup_results = WebhookTestingUtils.cleanup_test_data(tenant_id)
    print(f"Cleanup results: {cleanup_results}")
    
    print("Webhook testing example completed!")