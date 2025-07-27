# app/services/webhook_processor.py
"""
Webhook processing service for handling incoming and outgoing webhooks
"""
import json
import requests
import hashlib
import hmac
import time
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
from urllib.parse import urlparse
import uuid
import re

from app.database import Database
from app.services.notification_service import NotificationService
from app.services.workflow_engine import WorkflowEngine
from app.utils.json_utils import JSONUtils

logger = logging.getLogger(__name__)


class WebhookProcessor:
    """Enhanced webhook processing service"""

    def __init__(self):
        self.max_retries = 3
        self.retry_delays = [1, 5, 15]  # Exponential backoff in seconds
        self.timeout = 30

    def process_incoming_webhook(self, webhook_id: str, webhook_config: Dict, 
                                payload: Dict, headers: Dict, request_id: str,
                                is_simulation: bool = False) -> Dict[str, Any]:
        """Process incoming webhook payload"""
        try:
            logger.info(f"Processing incoming webhook {webhook_id} - Request ID: {request_id}")

            # Extract tenant information
            tenant_id = webhook_config['tenant_id']
            
            # Determine webhook event type
            event_type = self._extract_event_type(payload, headers)
            
            # Process based on event type
            processing_result = {
                'success': True,
                'event_type': event_type,
                'processed_at': datetime.now().isoformat(),
                'request_id': request_id,
                'actions_taken': []
            }

            # Route to appropriate handler
            if event_type == 'workflow_trigger':
                result = self._handle_workflow_trigger(payload, tenant_id, webhook_config)
                processing_result['actions_taken'].append(result)
            
            elif event_type == 'task_update':
                result = self._handle_task_update(payload, tenant_id, webhook_config)
                processing_result['actions_taken'].append(result)
            
            elif event_type == 'external_approval':
                result = self._handle_external_approval(payload, tenant_id, webhook_config)
                processing_result['actions_taken'].append(result)
            
            elif event_type == 'data_sync':
                result = self._handle_data_sync(payload, tenant_id, webhook_config)
                processing_result['actions_taken'].append(result)
            
            elif event_type == 'notification':
                result = self._handle_notification_webhook(payload, tenant_id, webhook_config)
                processing_result['actions_taken'].append(result)
            
            else:
                # Generic webhook processing
                result = self._handle_generic_webhook(payload, tenant_id, webhook_config, event_type)
                processing_result['actions_taken'].append(result)

            # Send confirmation notifications if configured
            if webhook_config.get('send_confirmations', False) and not is_simulation:
                self._send_processing_confirmation(webhook_id, processing_result, tenant_id)

            logger.info(f"Successfully processed incoming webhook {webhook_id}")
            return processing_result

        except Exception as e:
            logger.error(f"Error processing incoming webhook {webhook_id}: {e}", exc_info=True)
            return {
                'success': False,
                'error': str(e),
                'request_id': request_id,
                'processed_at': datetime.now().isoformat()
            }

    def _extract_event_type(self, payload: Dict, headers: Dict) -> str:
        """Extract event type from payload or headers"""
        # Check common locations for event type
        event_type = (
            payload.get('event_type') or
            payload.get('event') or
            payload.get('type') or
            headers.get('X-Event-Type') or
            headers.get('X-GitHub-Event') or  # GitHub webhooks
            headers.get('X-Gitlab-Event') or  # GitLab webhooks
            'generic_webhook'
        )
        
        return str(event_type).lower()

    def _handle_workflow_trigger(self, payload: Dict, tenant_id: str, webhook_config: Dict) -> Dict:
        """Handle webhook that triggers a workflow"""
        try:
            workflow_id = payload.get('workflow_id')
            workflow_data = payload.get('data', {})
            initiated_by = payload.get('initiated_by')

            if not workflow_id:
                return {'action': 'workflow_trigger', 'success': False, 'error': 'Missing workflow_id'}

            # Trigger workflow
            instance_id = WorkflowEngine.execute_workflow(
                workflow_id=workflow_id,
                data=workflow_data,
                initiated_by=initiated_by,
                tenant_id=tenant_id
            )

            return {
                'action': 'workflow_trigger',
                'success': True,
                'workflow_instance_id': instance_id,
                'workflow_id': workflow_id
            }

        except Exception as e:
            logger.error(f"Error handling workflow trigger: {e}")
            return {'action': 'workflow_trigger', 'success': False, 'error': str(e)}

    def _handle_task_update(self, payload: Dict, tenant_id: str, webhook_config: Dict) -> Dict:
        """Handle webhook that updates a task"""
        try:
            task_id = payload.get('task_id')
            status = payload.get('status')
            result_data = payload.get('result', {})
            completed_by = payload.get('completed_by')

            if not task_id or not status:
                return {'action': 'task_update', 'success': False, 'error': 'Missing task_id or status'}

            # Verify task belongs to tenant
            task = Database.execute_one("""
                SELECT t.id, wi.tenant_id
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s
            """, (task_id,))

            if not task or task['tenant_id'] != tenant_id:
                return {'action': 'task_update', 'success': False, 'error': 'Task not found or unauthorized'}

            if status == 'completed':
                WorkflowEngine.complete_task(task_id, result_data, completed_by)
            else:
                # Update task status
                Database.execute_query("""
                    UPDATE tasks 
                    SET status = %s, result = %s, updated_at = NOW()
                    WHERE id = %s
                """, (status, json.dumps(result_data), task_id))

            return {
                'action': 'task_update',
                'success': True,
                'task_id': task_id,
                'status': status
            }

        except Exception as e:
            logger.error(f"Error handling task update: {e}")
            return {'action': 'task_update', 'success': False, 'error': str(e)}

    def _handle_external_approval(self, payload: Dict, tenant_id: str, webhook_config: Dict) -> Dict:
        """Handle external approval webhook"""
        try:
            approval_id = payload.get('approval_id')
            decision = payload.get('decision')  # approved, rejected
            approver = payload.get('approver')
            comments = payload.get('comments', '')

            if not approval_id or not decision:
                return {'action': 'external_approval', 'success': False, 'error': 'Missing approval_id or decision'}

            # Find related task (assuming approval_id maps to task_id)
            task = Database.execute_one("""
                SELECT t.id, wi.tenant_id
                FROM tasks t
                JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
                WHERE t.id = %s OR t.metadata->>'external_approval_id' = %s
            """, (approval_id, approval_id))

            if not task or task['tenant_id'] != tenant_id:
                return {'action': 'external_approval', 'success': False, 'error': 'Related task not found'}

            # Process approval decision
            result_data = {
                'approval_status': 'approved' if decision == 'approved' else 'rejected',
                'external_approval': True,
                'approver': approver,
                'comments': comments,
                'approved_at': datetime.now().isoformat()
            }

            if decision == 'approved':
                WorkflowEngine.complete_task(task['id'], result_data, approver)
            else:
                # Handle rejection
                Database.execute_query("""
                    UPDATE tasks 
                    SET status = 'completed', result = %s, completed_by = %s, completed_at = NOW()
                    WHERE id = %s
                """, (json.dumps(result_data), approver, task['id']))

            return {
                'action': 'external_approval',
                'success': True,
                'task_id': task['id'],
                'decision': decision
            }

        except Exception as e:
            logger.error(f"Error handling external approval: {e}")
            return {'action': 'external_approval', 'success': False, 'error': str(e)}

    def _handle_data_sync(self, payload: Dict, tenant_id: str, webhook_config: Dict) -> Dict:
        """Handle data synchronization webhook"""
        try:
            sync_type = payload.get('sync_type', 'user_data')
            data = payload.get('data', {})

            if sync_type == 'user_data':
                return self._sync_user_data(data, tenant_id)
            elif sync_type == 'lookup_data':
                return self._sync_lookup_data(data, tenant_id)
            else:
                return {'action': 'data_sync', 'success': False, 'error': f'Unknown sync_type: {sync_type}'}

        except Exception as e:
            logger.error(f"Error handling data sync: {e}")
            return {'action': 'data_sync', 'success': False, 'error': str(e)}

    def _handle_notification_webhook(self, payload: Dict, tenant_id: str, webhook_config: Dict) -> Dict:
        """Handle notification webhook"""
        try:
            notification_type = payload.get('type', 'info')
            recipients = payload.get('recipients', [])
            message = payload.get('message', '')
            data = payload.get('data', {})

            sent_count = 0
            for recipient in recipients:
                try:
                    NotificationService.send_notification(recipient, notification_type, {
                        'message': message,
                        'data': data,
                        'source': 'external_webhook'
                    })
                    sent_count += 1
                except Exception as e:
                    logger.error(f"Failed to send notification to {recipient}: {e}")

            return {
                'action': 'notification',
                'success': True,
                'sent_count': sent_count,
                'total_recipients': len(recipients)
            }

        except Exception as e:
            logger.error(f"Error handling notification webhook: {e}")
            return {'action': 'notification', 'success': False, 'error': str(e)}

    def _handle_generic_webhook(self, payload: Dict, tenant_id: str, webhook_config: Dict, event_type: str) -> Dict:
        """Handle generic webhook - store and potentially trigger automations"""
        try:
            # Store webhook data for potential processing
            webhook_data_id = Database.execute_insert("""
                INSERT INTO webhook_received_data 
                (tenant_id, event_type, payload, received_at)
                VALUES (%s, %s, %s, NOW())
            """, (tenant_id, event_type, json.dumps(payload)))

            # Check for automation triggers based on event type
            automations = Database.execute_query("""
                SELECT * FROM automation_scripts 
                WHERE tenant_id = %s 
                AND parameters->>'webhook_event' = %s
                AND is_active = true
            """, (tenant_id, event_type))

            triggered_automations = []
            for automation in automations:
                try:
                    # Trigger automation with webhook payload as context
                    from app.services.automation_engine import AutomationEngine
                    engine = AutomationEngine()
                    
                    automation_config = {
                        'type': 'script_execution',
                        'script_content': automation['script_content'],
                        'script_type': automation['script_type']
                    }
                    
                    context = {
                        'webhook_payload': payload,
                        'event_type': event_type,
                        'tenant_id': tenant_id,
                        'webhook_data_id': webhook_data_id
                    }
                    
                    result = engine.execute_automation(automation_config, context)
                    triggered_automations.append({
                        'automation_id': automation['id'],
                        'success': result['success']
                    })
                    
                except Exception as auto_error:
                    logger.error(f"Error triggering automation {automation['id']}: {auto_error}")

            return {
                'action': 'generic_webhook',
                'success': True,
                'webhook_data_id': webhook_data_id,
                'triggered_automations': triggered_automations
            }

        except Exception as e:
            logger.error(f"Error handling generic webhook: {e}")
            return {'action': 'generic_webhook', 'success': False, 'error': str(e)}

    def _sync_user_data(self, data: Dict, tenant_id: str) -> Dict:
        """Sync user data from external system"""
        try:
            user_email = data.get('email')
            user_data = data.get('user_data', {})

            if not user_email:
                return {'action': 'sync_user_data', 'success': False, 'error': 'Missing email'}

            # Find and update user
            user = Database.execute_one("""
                SELECT id FROM users WHERE email = %s AND tenant_id = %s
            """, (user_email, tenant_id))

            if user:
                # Update existing user
                update_fields = []
                params = []
                
                for field in ['first_name', 'last_name', 'phone', 'department']:
                    if field in user_data:
                        update_fields.append(f'{field} = %s')
                        params.append(user_data[field])

                if update_fields:
                    params.append(user['id'])
                    Database.execute_query(f"""
                        UPDATE users SET {', '.join(update_fields)}, updated_at = NOW()
                        WHERE id = %s
                    """, params)

                return {'action': 'sync_user_data', 'success': True, 'user_id': user['id'], 'operation': 'updated'}

            return {'action': 'sync_user_data', 'success': False, 'error': 'User not found'}

        except Exception as e:
            logger.error(f"Error syncing user data: {e}")
            return {'action': 'sync_user_data', 'success': False, 'error': str(e)}

    def _sync_lookup_data(self, data: Dict, tenant_id: str) -> Dict:
        """Sync lookup table data from external system"""
        try:
            table_name = data.get('table_name')
            lookup_data = data.get('data', [])

            if not table_name or not lookup_data:
                return {'action': 'sync_lookup_data', 'success': False, 'error': 'Missing table_name or data'}

            # Find lookup table
            lookup_table = Database.execute_one("""
                SELECT id FROM lookup_tables 
                WHERE name = %s AND tenant_id = %s
            """, (table_name, tenant_id))

            if not lookup_table:
                return {'action': 'sync_lookup_data', 'success': False, 'error': 'Lookup table not found'}

            # Clear existing data if full sync
            if data.get('sync_type') == 'full':
                Database.execute_query("""
                    DELETE FROM lookup_data WHERE lookup_table_id = %s
                """, (lookup_table['id'],))

            # Insert new data
            inserted_count = 0
            for item in lookup_data:
                Database.execute_insert("""
                    INSERT INTO lookup_data (lookup_table_id, data, is_active)
                    VALUES (%s, %s, %s)
                """, (lookup_table['id'], json.dumps(item), True))
                inserted_count += 1

            return {
                'action': 'sync_lookup_data',
                'success': True,
                'table_id': lookup_table['id'],
                'inserted_count': inserted_count
            }

        except Exception as e:
            logger.error(f"Error syncing lookup data: {e}")
            return {'action': 'sync_lookup_data', 'success': False, 'error': str(e)}

    def _send_processing_confirmation(self, webhook_id: str, result: Dict, tenant_id: str):
        """Send confirmation that webhook was processed"""
        try:
            # Get webhook owner
            webhook = Database.execute_one("""
                SELECT created_by, name FROM webhooks WHERE id = %s
            """, (webhook_id,))

            if webhook and webhook['created_by']:
                NotificationService.send_notification(
                    webhook['created_by'],
                    'webhook_processed',
                    {
                        'webhook_name': webhook['name'],
                        'webhook_id': webhook_id,
                        'success': result['success'],
                        'actions_taken': len(result.get('actions_taken', [])),
                        'processed_at': result['processed_at']
                    }
                )
        except Exception as e:
            logger.error(f"Error sending processing confirmation: {e}")

    # ===== OUTGOING WEBHOOK METHODS =====

    def send_webhook_request_enhanced(self, webhook: Dict, event_type: str, payload: Dict) -> Tuple[bool, int, str, str]:
        """Enhanced webhook request sending with detailed error tracking"""
        try:
            headers = json.loads(webhook['headers']) if webhook['headers'] else {}
            headers['Content-Type'] = 'application/json'
            headers['User-Agent'] = 'WorkflowManagement-Webhook/2.0'
            headers['X-Event-Type'] = event_type
            headers['X-Delivery-ID'] = str(uuid.uuid4())

            # Add signature if secret is provided
            if webhook['secret']:
                signature = hmac.new(
                    webhook['secret'].encode(),
                    json.dumps(payload).encode(),
                    hashlib.sha256
                ).hexdigest()
                headers['X-Webhook-Signature'] = f'sha256={signature}'

            # Add timestamp
            headers['X-Timestamp'] = str(int(time.time()))

            start_time = time.time()
            response = requests.post(
                webhook['url'],
                json=payload,
                headers=headers,
                timeout=webhook['timeout_seconds'],
                verify=True,
                allow_redirects=False
            )
            execution_time = time.time() - start_time

            # Determine success
            success = 200 <= response.status_code < 300

            # Prepare response info
            response_body = response.text[:2000] if response.text else ''
            error_details = None

            if not success:
                error_details = {
                    'status_code': response.status_code,
                    'reason': response.reason,
                    'response_body': response_body,
                    'execution_time_ms': round(execution_time * 1000, 2),
                    'url': webhook['url']
                }

            return success, response.status_code, response_body, error_details

        except requests.exceptions.Timeout:
            return False, 0, '', 'Request timeout'
        except requests.exceptions.ConnectionError as e:
            return False, 0, '', f'Connection error: {str(e)}'
        except requests.exceptions.RequestException as e:
            return False, 0, '', f'Request error: {str(e)}'
        except Exception as e:
            return False, 0, '', f'Unexpected error: {str(e)}'

    def test_webhook_delivery(self, webhook_id: str, user_id: str):
        """Test webhook delivery"""
        try:
            webhook = Database.execute_one("""
                SELECT * FROM webhooks WHERE id = %s
            """, (webhook_id,))

            if not webhook:
                raise ValueError("Webhook not found")

            test_payload = {
                'event_type': 'webhook_test',
                'timestamp': datetime.now().isoformat(),
                'test_id': str(uuid.uuid4()),
                'data': {
                    'message': 'Test webhook delivery',
                    'webhook_id': webhook_id,
                    'tested_by': user_id
                }
            }

            success, status_code, response_body, error_details = self.send_webhook_request_enhanced(
                webhook, 'webhook_test', test_payload
            )

            # Record test result
            Database.execute_insert("""
                INSERT INTO webhook_deliveries 
                (webhook_id, event_type, payload, response_status, response_body,
                 delivery_attempts, last_attempt_at, delivered_at)
                VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s)
            """, (
                webhook_id,
                'webhook_test',
                json.dumps(test_payload),
                status_code,
                response_body[:1000],
                1,
                datetime.now() if success else None
            ))

            return success, status_code, response_body

        except Exception as e:
            logger.error(f"Error testing webhook {webhook_id}: {e}")
            raise

    def generate_test_payload_for_event(self, event_type: str, tenant_id: str) -> Dict:
        """Generate test payload for specific event types"""
        base_payload = {
            'event_type': event_type,
            'timestamp': datetime.now().isoformat(),
            'tenant_id': tenant_id,
            'test': True
        }

        if event_type == 'workflow_started':
            base_payload['data'] = {
                'workflow_id': '12345678-1234-1234-1234-123456789012',
                'workflow_name': 'Test Workflow',
                'initiated_by': 'test-user@example.com',
                'priority': 'medium'
            }
        elif event_type == 'task_assigned':
            base_payload['data'] = {
                'task_id': '12345678-1234-1234-1234-123456789012',
                'task_name': 'Test Task',
                'assigned_to': 'user@example.com',
                'due_date': (datetime.now() + timedelta(days=2)).isoformat(),
                'priority': 'high'
            }
        elif event_type == 'approval_requested':
            base_payload['data'] = {
                'approval_id': '12345678-1234-1234-1234-123456789012',
                'title': 'Test Approval Request',
                'amount': 1500.00,
                'approver': 'manager@example.com',
                'due_date': (datetime.now() + timedelta(hours=48)).isoformat()
            }
        else:
            base_payload['data'] = {
                'message': f'Test payload for {event_type} event',
                'sample_field': 'sample_value'
            }

        return base_payload


# ===== WEBHOOK SECURITY SERVICE =====

class WebhookSecurity:
    """Webhook security and validation service"""

    @staticmethod
    def verify_signature(secret: str, payload: bytes, headers: Dict) -> bool:
        """Verify webhook signature"""
        try:
            # Support multiple signature header formats
            signature_header = (
                headers.get('X-Webhook-Signature') or
                headers.get('X-Hub-Signature-256') or
                headers.get('X-Signature-256') or
                headers.get('Signature')
            )

            if not signature_header:
                return False

            # Extract signature (handle different formats)
            if signature_header.startswith('sha256='):
                provided_signature = signature_header[7:]
            elif '=' in signature_header:
                provided_signature = signature_header.split('=')[1]
            else:
                provided_signature = signature_header

            # Calculate expected signature
            expected_signature = hmac.new(
                secret.encode(),
                payload,
                hashlib.sha256
            ).hexdigest()

            # Compare signatures securely
            return hmac.compare_digest(provided_signature, expected_signature)

        except Exception as e:
            logger.error(f"Error verifying webhook signature: {e}")
            return False

    @staticmethod
    def validate_webhook_url(url: str) -> bool:
        """Validate webhook URL for security"""
        try:
            parsed = urlparse(url)
            
            # Must use HTTPS in production
            if parsed.scheme not in ['http', 'https']:
                return False
            
            # Block internal/private IP ranges
            if parsed.hostname:
                # Block localhost
                if parsed.hostname.lower() in ['localhost', '127.0.0.1', '::1']:
                    return False
                
                # Block private IP ranges (basic check)
                if parsed.hostname.startswith(('10.', '192.168.', '172.')):
                    return False
                
                # Block metadata endpoints
                if '169.254.169.254' in parsed.hostname:  # AWS metadata
                    return False
            
            # URL must be reasonable length
            if len(url) > 2000:
                return False
            
            return True
            
        except Exception as e:
            logger.error(f"Error validating webhook URL: {e}")
            return False

    @staticmethod
    def check_rate_limit(webhook_id: str, client_ip: str, limit: int = 100, window: int = 3600) -> bool:
        """Check rate limiting for incoming webhooks"""
        try:
            # Use database-based rate limiting
            current_time = datetime.now()
            window_start = current_time - timedelta(seconds=window)

            # Count recent requests
            request_count = Database.execute_one("""
                SELECT COUNT(*) as count
                FROM webhook_deliveries
                WHERE webhook_id = %s 
                AND created_at >= %s
                AND payload->>'client_ip' = %s
            """, (webhook_id, window_start, client_ip))

            return request_count['count'] < limit

        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            return True  # Allow on error


# ===== WEBHOOK DATA STORAGE SCHEMA =====
"""
Add this table to store received webhook data:

CREATE TABLE IF NOT EXISTS webhook_received_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    processed BOOLEAN DEFAULT false,
    processing_result JSONB,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS idx_webhook_received_data_tenant ON webhook_received_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_webhook ON webhook_received_data(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_event ON webhook_received_data(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_processed ON webhook_received_data(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_received_at ON webhook_received_data(received_at);
"""