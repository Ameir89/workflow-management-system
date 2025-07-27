# app/blueprints/webhooks.py - Enhanced Webhook Processing System
"""
Enhanced webhooks blueprint - handles both incoming and outgoing webhook processing
"""
from flask import Blueprint, request, jsonify, g, current_app
from app.middleware import require_auth, require_permissions, audit_log, rate_limit_by_user
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid
from app.utils.validators import validate_required_fields
from app.services.webhook_processor import WebhookProcessor
from app.services.webhook_security import WebhookSecurity
from app.services.notification_service import NotificationService
import json
import requests
import hmac
import hashlib
import logging
import time
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor
import uuid

logger = logging.getLogger(__name__)

webhooks_bp = Blueprint('webhooks', __name__)

# Initialize webhook processor
webhook_processor = WebhookProcessor()

# ===== INCOMING WEBHOOK PROCESSING =====

@webhooks_bp.route('/incoming/<webhook_id>', methods=['POST'])
def process_incoming_webhook(webhook_id):
    """
    Process incoming webhook from external systems
    This endpoint doesn't require authentication as it's called by external systems
    """
    try:
        if not validate_uuid(webhook_id):
            logger.warning(f"Invalid webhook ID format: {webhook_id}")
            return jsonify({'error': 'Invalid webhook ID'}), 400

        # Get webhook configuration
        webhook_config = Database.execute_one("""
            SELECT w.*, t.name as tenant_name
            FROM webhooks w
            JOIN tenants t ON w.tenant_id = t.id
            WHERE w.id = %s AND w.is_active = true
        """, (webhook_id,))

        if not webhook_config:
            logger.warning(f"Webhook not found or inactive: {webhook_id}")
            return jsonify({'error': 'Webhook not found'}), 404

        # Log incoming webhook attempt
        request_id = str(uuid.uuid4())
        logger.info(f"Processing incoming webhook {webhook_id} - Request ID: {request_id}")

        # Get request data
        content_type = request.headers.get('Content-Type', '')
        if content_type.startswith('application/json'):
            try:
                payload = request.get_json()
            except Exception as e:
                logger.error(f"Invalid JSON payload: {e}")
                return jsonify({'error': 'Invalid JSON payload'}), 400
        else:
            payload = request.form.to_dict() if request.form else {}

        # Verify webhook signature if secret is configured
        if webhook_config['secret']:
            if not WebhookSecurity.verify_signature(
                webhook_config['secret'],
                request.data,
                request.headers
            ):
                logger.warning(f"Invalid signature for webhook {webhook_id}")
                return jsonify({'error': 'Invalid signature'}), 401

        # Rate limiting check
        client_ip = request.remote_addr
        if not WebhookSecurity.check_rate_limit(webhook_id, client_ip):
            logger.warning(f"Rate limit exceeded for webhook {webhook_id} from {client_ip}")
            return jsonify({'error': 'Rate limit exceeded'}), 429

        # Process the webhook
        processing_result = webhook_processor.process_incoming_webhook(
            webhook_id=webhook_id,
            webhook_config=webhook_config,
            payload=payload,
            headers=dict(request.headers),
            request_id=request_id
        )

        # Log the delivery
        Database.execute_insert("""
            INSERT INTO webhook_deliveries 
            (webhook_id, event_type, payload, response_status, response_body,
             delivery_attempts, delivered_at, created_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
        """, (
            webhook_id, 
            'incoming_webhook',
            json.dumps({
                'payload': payload,
                'headers': dict(request.headers),
                'request_id': request_id
            }),
            200 if processing_result['success'] else 400,
            json.dumps(processing_result),
            1,
            datetime.now() if processing_result['success'] else None
        ))

        if processing_result['success']:
            logger.info(f"Successfully processed incoming webhook {webhook_id}")
            return jsonify({
                'success': True,
                'message': 'Webhook processed successfully',
                'request_id': request_id,
                'processed_at': datetime.now().isoformat()
            }), 200
        else:
            logger.error(f"Failed to process incoming webhook {webhook_id}: {processing_result.get('error')}")
            return jsonify({
                'success': False,
                'error': processing_result.get('error', 'Processing failed'),
                'request_id': request_id
            }), 400

    except Exception as e:
        logger.error(f"Error processing incoming webhook {webhook_id}: {e}", exc_info=True)
        return jsonify({
            'success': False,
            'error': 'Internal server error',
            'request_id': request_id if 'request_id' in locals() else str(uuid.uuid4())
        }), 500


@webhooks_bp.route('/incoming/<webhook_id>/simulate', methods=['POST'])
@require_auth
@require_permissions(['manage_webhooks'])
def simulate_incoming_webhook(webhook_id):
    """Simulate incoming webhook for testing purposes"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        # Verify webhook belongs to user's tenant
        webhook_config = Database.execute_one("""
            SELECT * FROM webhooks 
            WHERE id = %s AND tenant_id = %s
        """, (webhook_id, tenant_id))

        if not webhook_config:
            return jsonify({'error': 'Webhook not found'}), 404

        # Simulate the webhook processing
        test_payload = data.get('payload', {
            'event': 'test_event',
            'timestamp': datetime.now().isoformat(),
            'data': {'test': True}
        })

        processing_result = webhook_processor.process_incoming_webhook(
            webhook_id=webhook_id,
            webhook_config=webhook_config,
            payload=test_payload,
            headers={'Content-Type': 'application/json'},
            request_id=f"sim_{uuid.uuid4()}",
            is_simulation=True
        )

        return jsonify({
            'simulation_result': processing_result,
            'test_payload': test_payload
        }), 200

    except Exception as e:
        logger.error(f"Error simulating incoming webhook: {e}")
        return jsonify({'error': 'Failed to simulate webhook'}), 500


# ===== ENHANCED OUTGOING WEBHOOK MANAGEMENT =====

@webhooks_bp.route('', methods=['GET'])
@require_auth
@require_permissions(['view_webhooks'])
def get_webhooks():
    """Get all webhooks with enhanced filtering and statistics"""
    try:
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        
        # Enhanced filtering
        status_filter = request.args.get('status')  # active, inactive, error
        event_filter = request.args.get('event')
        search = request.args.get('search', '').strip()

        # Build query conditions
        where_conditions = ["w.tenant_id = %s"]
        params = [tenant_id]

        if status_filter == 'active':
            where_conditions.append("w.is_active = true")
        elif status_filter == 'inactive':
            where_conditions.append("w.is_active = false")
        elif status_filter == 'error':
            where_conditions.append("""
                EXISTS (
                    SELECT 1 FROM webhook_deliveries wd 
                    WHERE wd.webhook_id = w.id 
                    AND wd.response_status >= 400 
                    AND wd.created_at >= NOW() - INTERVAL '24 hours'
                )
            """)

        if event_filter:
            where_conditions.append("w.events @> %s")
            params.append(json.dumps([event_filter]))

        if search:
            where_conditions.append("(w.name ILIKE %s OR w.url ILIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param])

        where_clause = "WHERE " + " AND ".join(where_conditions)

        # Get webhooks with enhanced statistics
        webhooks = Database.execute_query(f"""
            SELECT w.id, w.name, w.url, w.events, w.is_active, w.retry_count,
                   w.timeout_seconds, w.created_at, w.updated_at,
                   u.first_name || ' ' || u.last_name as created_by_name,
                   COUNT(wd.id) as delivery_count,
                   COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
                   COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries,
                   MAX(wd.created_at) as last_delivery_attempt,
                   MAX(CASE WHEN wd.delivered_at IS NOT NULL THEN wd.delivered_at END) as last_successful_delivery,
                   AVG(CASE WHEN wd.delivered_at IS NOT NULL THEN wd.delivery_attempts END) as avg_delivery_attempts,
                   CASE 
                       WHEN COUNT(wd.id) = 0 THEN 'unused'
                       WHEN COUNT(CASE WHEN wd.response_status >= 400 AND wd.created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) > 0 THEN 'error'
                       WHEN w.is_active THEN 'healthy'
                       ELSE 'inactive'
                   END as status
            FROM webhooks w
            LEFT JOIN users u ON w.created_by = u.id
            LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id
            {where_clause}
            GROUP BY w.id, u.first_name, u.last_name
            ORDER BY w.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(DISTINCT w.id) as count 
            FROM webhooks w
            LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id
            {where_clause}
        """, params)

        # Get summary statistics
        summary = Database.execute_one("""
            SELECT 
                COUNT(*) as total_webhooks,
                COUNT(CASE WHEN is_active THEN 1 END) as active_webhooks,
                COUNT(CASE WHEN NOT is_active THEN 1 END) as inactive_webhooks
            FROM webhooks 
            WHERE tenant_id = %s
        """, (tenant_id,))

        return jsonify({
            'webhooks': [dict(w) for w in webhooks],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            },
            'summary': dict(summary),
            'filters': {
                'status': status_filter,
                'event': event_filter,
                'search': search
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting webhooks: {e}")
        return jsonify({'error': 'Failed to retrieve webhooks'}), 500


@webhooks_bp.route('/<webhook_id>', methods=['GET'])
@require_auth
@require_permissions(['view_webhooks'])
def get_webhook(webhook_id):
    """Get specific webhook with detailed analytics"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        tenant_id = g.current_user['tenant_id']

        webhook = Database.execute_one("""
            SELECT w.*, u.first_name || ' ' || u.last_name as created_by_name
            FROM webhooks w
            LEFT JOIN users u ON w.created_by = u.id
            WHERE w.id = %s AND w.tenant_id = %s
        """, (webhook_id, tenant_id))

        if not webhook:
            return jsonify({'error': 'Webhook not found'}), 404

        # Parse JSON fields safely
        webhook_dict = dict(webhook)
        if webhook_dict['headers']:
            try:
                webhook_dict['headers'] = json.loads(webhook_dict['headers'])
            except (json.JSONDecodeError, TypeError):
                webhook_dict['headers'] = {}

        if webhook_dict['events']:
            try:
                webhook_dict['events'] = json.loads(webhook_dict['events']) if isinstance(webhook_dict['events'], str) else webhook_dict['events']
            except (json.JSONDecodeError, TypeError):
                webhook_dict['events'] = []

        # Get delivery statistics
        delivery_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_deliveries,
                COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
                COUNT(CASE WHEN response_status >= 400 THEN 1 END) as failed_deliveries,
                AVG(delivery_attempts) as avg_attempts,
                MAX(created_at) as last_delivery,
                MAX(delivered_at) as last_successful_delivery
            FROM webhook_deliveries
            WHERE webhook_id = %s
        """, (webhook_id,))

        # Get recent deliveries with more details
        recent_deliveries = Database.execute_query("""
            SELECT id, event_type, response_status, delivery_attempts,
                   last_attempt_at, delivered_at, created_at,
                   CASE 
                       WHEN delivered_at IS NOT NULL THEN 'delivered'
                       WHEN delivery_attempts >= 3 THEN 'failed'
                       ELSE 'pending'
                   END as status
            FROM webhook_deliveries
            WHERE webhook_id = %s
            ORDER BY created_at DESC
            LIMIT 20
        """, (webhook_id,))

        # Get delivery trends (last 30 days)
        delivery_trends = Database.execute_query("""
            SELECT 
                DATE(created_at) as delivery_date,
                COUNT(*) as total_attempts,
                COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
                COUNT(CASE WHEN response_status >= 400 THEN 1 END) as failed_deliveries
            FROM webhook_deliveries
            WHERE webhook_id = %s 
            AND created_at >= NOW() - INTERVAL '30 days'
            GROUP BY DATE(created_at)
            ORDER BY delivery_date DESC
        """, (webhook_id,))

        webhook_dict['statistics'] = dict(delivery_stats) if delivery_stats else {}
        webhook_dict['recent_deliveries'] = [dict(d) for d in recent_deliveries]
        webhook_dict['delivery_trends'] = [dict(t) for t in delivery_trends]

        return jsonify({'webhook': webhook_dict}), 200

    except Exception as e:
        logger.error(f"Error getting webhook {webhook_id}: {e}")
        return jsonify({'error': 'Failed to retrieve webhook'}), 500


@webhooks_bp.route('', methods=['POST'])
@require_auth
@require_permissions(['manage_webhooks'])
@audit_log('create', 'webhook')
@rate_limit_by_user(20)  # 20 webhook creations per minute
def create_webhook():
    """Create new webhook with enhanced validation"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['name', 'url', 'events']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Enhanced URL validation
        url = data['url'].strip()
        if not WebhookSecurity.validate_webhook_url(url):
            return jsonify({'error': 'Invalid or unsafe webhook URL'}), 400

        # Validate events
        valid_events = [
            'workflow_started', 'workflow_completed', 'workflow_failed',
            'task_assigned', 'task_completed', 'task_failed', 'task_overdue',
            'sla_breach', 'sla_warning', 'user_created', 'form_submitted',
            'approval_requested', 'approval_completed', 'notification_sent'
        ]

        events = data.get('events', [])
        if not isinstance(events, list):
            return jsonify({'error': 'Events must be an array'}), 400

        invalid_events = [e for e in events if e not in valid_events]
        if invalid_events:
            return jsonify({
                'error': f'Invalid event types: {invalid_events}',
                'valid_events': valid_events
            }), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Check for duplicate names within tenant
        existing = Database.execute_one("""
            SELECT id FROM webhooks 
            WHERE name = %s AND tenant_id = %s
        """, (data['name'], tenant_id))

        if existing:
            return jsonify({'error': 'Webhook with this name already exists'}), 409

        # Create webhook with enhanced configuration
        webhook_id = Database.execute_insert("""
            INSERT INTO webhooks 
            (tenant_id, name, url, events, headers, retry_count, 
             timeout_seconds, secret, created_by, is_active)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, 
            data['name'], 
            url, 
            json.dumps(events),
            json.dumps(data.get('headers', {})),
            data.get('retry_count', 3),
            data.get('timeout_seconds', 30),
            data.get('secret'),
            user_id,
            data.get('is_active', True)
        ))

        # Test webhook if requested
        if data.get('test_on_create', False):
            try:
                webhook_processor.test_webhook_delivery(webhook_id, user_id)
            except Exception as test_error:
                logger.warning(f"Failed to test newly created webhook {webhook_id}: {test_error}")

        return jsonify({
            'message': 'Webhook created successfully',
            'webhook_id': webhook_id,
            'webhook_url': f"/api/webhooks/incoming/{webhook_id}"
        }), 201

    except Exception as e:
        logger.error(f"Error creating webhook: {e}")
        return jsonify({'error': 'Failed to create webhook'}), 500


@webhooks_bp.route('/<webhook_id>/test', methods=['POST'])
@require_auth
@require_permissions(['manage_webhooks'])
@rate_limit_by_user(10)  # 10 test attempts per minute
def test_webhook(webhook_id):
    """Test webhook delivery with enhanced testing options"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        data = sanitize_input(request.get_json()) or {}
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Get webhook
        webhook = Database.execute_one("""
            SELECT id, name, url, headers, secret, timeout_seconds, events
            FROM webhooks 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (webhook_id, tenant_id))

        if not webhook:
            return jsonify({'error': 'Webhook not found or inactive'}), 404

        # Test type
        test_type = data.get('test_type', 'basic')  # basic, custom, event_specific
        
        if test_type == 'custom':
            test_payload = data.get('custom_payload', {})
        elif test_type == 'event_specific':
            event_type = data.get('event_type')
            test_payload = webhook_processor.generate_test_payload_for_event(event_type, tenant_id)
        else:
            # Basic test
            test_payload = {
                'event_type': 'webhook_test',
                'timestamp': datetime.now().isoformat(),
                'test_id': str(uuid.uuid4()),
                'data': {
                    'message': 'This is a test webhook delivery',
                    'webhook_id': webhook_id,
                    'webhook_name': webhook['name'],
                    'tested_by': user_id
                }
            }

        # Send webhook with detailed response tracking
        start_time = time.time()
        success, response_status, response_body, error_details = webhook_processor.send_webhook_request_enhanced(
            webhook, 'webhook_test', test_payload
        )
        execution_time = time.time() - start_time

        # Record test delivery
        Database.execute_insert("""
            INSERT INTO webhook_deliveries 
            (webhook_id, event_type, payload, response_status, response_body,
             delivery_attempts, last_attempt_at, delivered_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s)
        """, (
            webhook_id, 
            'webhook_test', 
            json.dumps(test_payload),
            response_status, 
            response_body[:5000],  # Limit response body size
            1,
            datetime.now() if success else None
        ))

        response_data = {
            'test_result': {
                'success': success,
                'status_code': response_status,
                'execution_time_ms': round(execution_time * 1000, 2),
                'response_body': response_body[:1000] if response_body else None,
                'test_payload': test_payload,
                'timestamp': datetime.now().isoformat()
            }
        }

        if not success:
            response_data['error_details'] = error_details

        if success:
            return jsonify(response_data), 200
        else:
            return jsonify(response_data), 400

    except Exception as e:
        logger.error(f"Error testing webhook {webhook_id}: {e}")
        return jsonify({'error': 'Failed to test webhook'}), 500


@webhooks_bp.route('/<webhook_id>/bulk-test', methods=['POST'])
@require_auth
@require_permissions(['manage_webhooks'])
@rate_limit_by_user(5)  # 5 bulk tests per minute
def bulk_test_webhook(webhook_id):
    """Test webhook with multiple event types"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        data = sanitize_input(request.get_json()) or {}
        tenant_id = g.current_user['tenant_id']

        webhook = Database.execute_one("""
            SELECT * FROM webhooks 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (webhook_id, tenant_id))

        if not webhook:
            return jsonify({'error': 'Webhook not found or inactive'}), 404

        # Get events to test
        events_to_test = data.get('events', json.loads(webhook['events'])[:5])  # Limit to 5 events
        test_results = []

        for event_type in events_to_test:
            try:
                test_payload = webhook_processor.generate_test_payload_for_event(event_type, tenant_id)
                success, status_code, response_body, error_details = webhook_processor.send_webhook_request_enhanced(
                    webhook, event_type, test_payload
                )

                test_results.append({
                    'event_type': event_type,
                    'success': success,
                    'status_code': status_code,
                    'response_preview': response_body[:200] if response_body else None,
                    'error': error_details if not success else None
                })

                # Brief delay between requests
                time.sleep(0.1)

            except Exception as test_error:
                test_results.append({
                    'event_type': event_type,
                    'success': False,
                    'error': str(test_error)
                })

        # Calculate overall success rate
        successful_tests = sum(1 for result in test_results if result['success'])
        success_rate = (successful_tests / len(test_results)) * 100 if test_results else 0

        return jsonify({
            'bulk_test_results': {
                'webhook_id': webhook_id,
                'total_tests': len(test_results),
                'successful_tests': successful_tests,
                'success_rate': round(success_rate, 2),
                'results': test_results
            }
        }), 200

    except Exception as e:
        logger.error(f"Error bulk testing webhook {webhook_id}: {e}")
        return jsonify({'error': 'Failed to perform bulk test'}), 500


# ===== WEBHOOK MONITORING AND ANALYTICS =====

@webhooks_bp.route('/analytics', methods=['GET'])
@require_auth
@require_permissions(['view_webhooks'])
def get_webhook_analytics():
    """Get comprehensive webhook analytics"""
    try:
        tenant_id = g.current_user['tenant_id']
        days = int(request.args.get('days', 30))

        # Overall statistics
        overall_stats = Database.execute_one("""
            SELECT 
                COUNT(DISTINCT w.id) as total_webhooks,
                COUNT(DISTINCT CASE WHEN w.is_active THEN w.id END) as active_webhooks,
                COUNT(wd.id) as total_deliveries,
                COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
                COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries,
                AVG(wd.delivery_attempts) as avg_delivery_attempts
            FROM webhooks w
            LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id 
                AND wd.created_at >= NOW() - INTERVAL '%s days'
            WHERE w.tenant_id = %s
        """, (days, tenant_id))

        # Event type statistics
        event_stats = Database.execute_query("""
            SELECT 
                wd.event_type,
                COUNT(*) as delivery_count,
                COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_count,
                COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_count,
                AVG(wd.delivery_attempts) as avg_attempts
            FROM webhook_deliveries wd
            JOIN webhooks w ON wd.webhook_id = w.id
            WHERE w.tenant_id = %s 
            AND wd.created_at >= NOW() - INTERVAL '%s days'
            GROUP BY wd.event_type
            ORDER BY delivery_count DESC
        """, (tenant_id, days))

        # Daily delivery trends
        daily_trends = Database.execute_query("""
            SELECT 
                DATE(wd.created_at) as delivery_date,
                COUNT(*) as total_deliveries,
                COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
                COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries
            FROM webhook_deliveries wd
            JOIN webhooks w ON wd.webhook_id = w.id
            WHERE w.tenant_id = %s 
            AND wd.created_at >= NOW() - INTERVAL '%s days'
            GROUP BY DATE(wd.created_at)
            ORDER BY delivery_date DESC
        """, (tenant_id, days))

        # Top performing webhooks
        top_webhooks = Database.execute_query("""
            SELECT 
                w.id, w.name, w.url,
                COUNT(wd.id) as delivery_count,
                COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
                COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries,
                ROUND(
                    COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) * 100.0 / 
                    NULLIF(COUNT(wd.id), 0), 2
                ) as success_rate
            FROM webhooks w
            LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id 
                AND wd.created_at >= NOW() - INTERVAL '%s days'
            WHERE w.tenant_id = %s
            GROUP BY w.id, w.name, w.url
            HAVING COUNT(wd.id) > 0
            ORDER BY delivery_count DESC
            LIMIT 10
        """, (days, tenant_id))

        return jsonify({
            'period_days': days,
            'overall_statistics': dict(overall_stats) if overall_stats else {},
            'event_statistics': [dict(stat) for stat in event_stats],
            'daily_trends': [dict(trend) for trend in daily_trends],
            'top_webhooks': [dict(webhook) for webhook in top_webhooks]
        }), 200

    except Exception as e:
        logger.error(f"Error getting webhook analytics: {e}")
        return jsonify({'error': 'Failed to retrieve webhook analytics'}), 500


# ===== WEBHOOK HEALTH MONITORING =====

@webhooks_bp.route('/health', methods=['GET'])
@require_auth
@require_permissions(['view_webhooks'])
def get_webhook_health():
    """Get webhook health status"""
    try:
        tenant_id = g.current_user['tenant_id']

        # Get webhooks with health indicators
        webhook_health = Database.execute_query("""
            SELECT 
                w.id, w.name, w.url, w.is_active,
                COUNT(wd.id) as recent_deliveries,
                COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
                COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries,
                MAX(wd.created_at) as last_delivery_attempt,
                MAX(wd.delivered_at) as last_successful_delivery,
                CASE 
                    WHEN NOT w.is_active THEN 'disabled'
                    WHEN COUNT(wd.id) = 0 THEN 'unused'
                    WHEN COUNT(CASE WHEN wd.response_status >= 500 AND wd.created_at >= NOW() - INTERVAL '1 hour' THEN 1 END) > 0 THEN 'critical'
                    WHEN COUNT(CASE WHEN wd.response_status >= 400 AND wd.created_at >= NOW() - INTERVAL '6 hours' THEN 1 END) > 2 THEN 'warning'
                    WHEN MAX(wd.delivered_at) < NOW() - INTERVAL '24 hours' AND COUNT(wd.id) > 0 THEN 'stale'
                    ELSE 'healthy'
                END as health_status
            FROM webhooks w
            LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id 
                AND wd.created_at >= NOW() - INTERVAL '24 hours'
            WHERE w.tenant_id = %s
            GROUP BY w.id, w.name, w.url, w.is_active
            ORDER BY 
                CASE health_status
                    WHEN 'critical' THEN 1
                    WHEN 'warning' THEN 2
                    WHEN 'stale' THEN 3
                    WHEN 'unused' THEN 4
                    WHEN 'disabled' THEN 5
                    ELSE 6
                END,
                w.name
        """, (tenant_id,))

        # Health summary
        health_summary = {
            'healthy': 0,
            'warning': 0,
            'critical': 0,
            'unused': 0,
            'disabled': 0,
            'stale': 0
        }

        for webhook in webhook_health:
            status = webhook['health_status']
            if status in health_summary:
                health_summary[status] += 1

        return jsonify({
            'health_summary': health_summary,
            'webhook_health': [dict(webhook) for webhook in webhook_health],
            'checked_at': datetime.now().isoformat()
        }), 200

    except Exception as e:
        logger.error(f"Error getting webhook health: {e}")
        return jsonify({'error': 'Failed to retrieve webhook health'}), 500


# ===== BATCH OPERATIONS =====

@webhooks_bp.route('/batch/enable', methods=['POST'])
@require_auth
@require_permissions(['manage_webhooks'])
@audit_log('batch_enable', 'webhook')
def batch_enable_webhooks():
    """Enable multiple webhooks"""
    try:
        data = sanitize_input(request.get_json())
        webhook_ids = data.get('webhook_ids', [])
        tenant_id = g.current_user['tenant_id']

        if not webhook_ids or not isinstance(webhook_ids, list):
            return jsonify({'error': 'webhook_ids array is required'}), 400

        # Validate all webhook IDs
        for webhook_id in webhook_ids:
            if not validate_uuid(webhook_id):
                return jsonify({'error': f'Invalid webhook ID: {webhook_id}'}), 400

        # Update webhooks
        updated_count = 0
        for webhook_id in webhook_ids:
            result = Database.execute_query("""
                UPDATE webhooks 
                SET is_active = true, updated_at = NOW()
                WHERE id = %s AND tenant_id = %s
            """, (webhook_id, tenant_id))
            
            if result is not None:
                updated_count += 1

        return jsonify({
            'message': f'Successfully enabled {updated_count} webhooks',
            'updated_count': updated_count,
            'total_requested': len(webhook_ids)
        }), 200

    except Exception as e:
        logger.error(f"Error batch enabling webhooks: {e}")
        return jsonify({'error': 'Failed to enable webhooks'}), 500


@webhooks_bp.route('/batch/disable', methods=['POST'])
@require_auth
@require_permissions(['manage_webhooks'])
@audit_log('batch_disable', 'webhook')
def batch_disable_webhooks():
    """Disable multiple webhooks"""
    try:
        data = sanitize_input(request.get_json())
        webhook_ids = data.get('webhook_ids', [])
        tenant_id = g.current_user['tenant_id']

        if not webhook_ids or not isinstance(webhook_ids, list):
            return jsonify({'error': 'webhook_ids array is required'}), 400

        # Validate all webhook IDs
        for webhook_id in webhook_ids:
            if not validate_uuid(webhook_id):
                return jsonify({'error': f'Invalid webhook ID: {webhook_id}'}), 400

        # Update webhooks
        updated_count = 0
        for webhook_id in webhook_ids:
            result = Database.execute_query("""
                UPDATE webhooks 
                SET is_active = false, updated_at = NOW()
                WHERE id = %s AND tenant_id = %s
            """, (webhook_id, tenant_id))
            
            if result is not None:
                updated_count += 1

        return jsonify({
            'message': f'Successfully disabled {updated_count} webhooks',
            'updated_count': updated_count,
            'total_requested': len(webhook_ids)
        }), 200

    except Exception as e:
        logger.error(f"Error batch disabling webhooks: {e}")
        return jsonify({'error': 'Failed to disable webhooks'}), 500


# ===== EXISTING ENDPOINTS (Enhanced) =====

@webhooks_bp.route('/<webhook_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_webhooks'])
@audit_log('update', 'webhook')
def update_webhook(webhook_id):
    """Update webhook with enhanced validation"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        # Check if webhook exists
        existing = Database.execute_one("""
            SELECT id FROM webhooks 
            WHERE id = %s AND tenant_id = %s
        """, (webhook_id, tenant_id))

        if not existing:
            return jsonify({'error': 'Webhook not found'}), 404

        # Build update query
        update_fields = []
        params = []

        if 'name' in data:
            update_fields.append('name = %s')
            params.append(data['name'])

        if 'url' in data:
            if not WebhookSecurity.validate_webhook_url(data['url']):
                return jsonify({'error': 'Invalid or unsafe webhook URL'}), 400
            update_fields.append('url = %s')
            params.append(data['url'])

        if 'events' in data:
            events = data['events']
            if not isinstance(events, list):
                return jsonify({'error': 'Events must be an array'}), 400
            update_fields.append('events = %s')
            params.append(json.dumps(events))

        if 'headers' in data:
            update_fields.append('headers = %s')
            params.append(json.dumps(data['headers']))

        if 'is_active' in data:
            update_fields.append('is_active = %s')
            params.append(data['is_active'])

        if 'retry_count' in data:
            retry_count = max(0, min(int(data['retry_count']), 10))  # Limit to 0-10
            update_fields.append('retry_count = %s')
            params.append(retry_count)

        if 'timeout_seconds' in data:
            timeout = max(5, min(int(data['timeout_seconds']), 300))  # Limit to 5-300 seconds
            update_fields.append('timeout_seconds = %s')
            params.append(timeout)

        if 'secret' in data:
            update_fields.append('secret = %s')
            params.append(data['secret'])

        if update_fields:
            update_fields.append('updated_at = NOW()')
            params.append(webhook_id)

            query = f"""
                UPDATE webhooks 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            Database.execute_query(query, params)

        return jsonify({'message': 'Webhook updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating webhook {webhook_id}: {e}")
        return jsonify({'error': 'Failed to update webhook'}), 500


@webhooks_bp.route('/<webhook_id>/deliveries', methods=['GET'])
@require_auth
@require_permissions(['view_webhooks'])
def get_webhook_deliveries(webhook_id):
    """Get webhook delivery history with enhanced filtering"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = (page - 1) * limit

        # Additional filters
        status_filter = request.args.get('status')  # delivered, failed, pending
        event_filter = request.args.get('event_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')

        # Check webhook exists
        webhook_exists = Database.execute_one("""
            SELECT id FROM webhooks 
            WHERE id = %s AND tenant_id = %s
        """, (webhook_id, tenant_id))

        if not webhook_exists:
            return jsonify({'error': 'Webhook not found'}), 404

        # Build query conditions
        where_conditions = ["webhook_id = %s"]
        params = [webhook_id]

        if status_filter == 'delivered':
            where_conditions.append("delivered_at IS NOT NULL")
        elif status_filter == 'failed':
            where_conditions.append("response_status >= 400")
        elif status_filter == 'pending':
            where_conditions.append("delivered_at IS NULL AND delivery_attempts < 3")

        if event_filter:
            where_conditions.append("event_type = %s")
            params.append(event_filter)

        if start_date:
            where_conditions.append("created_at >= %s")
            params.append(start_date)

        if end_date:
            where_conditions.append("created_at <= %s")
            params.append(end_date)

        where_clause = "WHERE " + " AND ".join(where_conditions)

        deliveries = Database.execute_query(f"""
            SELECT id, event_type, response_status, delivery_attempts,
                   last_attempt_at, delivered_at, created_at,
                   CASE 
                       WHEN delivered_at IS NOT NULL THEN 'delivered'
                       WHEN delivery_attempts >= 3 THEN 'failed'
                       ELSE 'pending'
                   END as status,
                   CASE 
                       WHEN response_status < 300 THEN 'success'
                       WHEN response_status < 400 THEN 'redirect'
                       WHEN response_status < 500 THEN 'client_error'
                       ELSE 'server_error'
                   END as response_category
            FROM webhook_deliveries
            {where_clause}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(*) as count 
            FROM webhook_deliveries 
            {where_clause}
        """, params)

        return jsonify({
            'deliveries': [dict(d) for d in deliveries],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            },
            'filters': {
                'status': status_filter,
                'event_type': event_filter,
                'start_date': start_date,
                'end_date': end_date
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting webhook deliveries: {e}")
        return jsonify({'error': 'Failed to retrieve webhook deliveries'}), 500


@webhooks_bp.route('/<webhook_id>', methods=['DELETE'])
@require_auth
@require_permissions(['manage_webhooks'])
@audit_log('delete', 'webhook')
def delete_webhook(webhook_id):
    """Delete webhook with proper cleanup"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Check if webhook exists
        webhook = Database.execute_one("""
            SELECT name FROM webhooks 
            WHERE id = %s AND tenant_id = %s
        """, (webhook_id, tenant_id))

        if not webhook:
            return jsonify({'error': 'Webhook not found'}), 404

        # Delete deliveries first (or keep for audit purposes)
        keep_deliveries = request.args.get('keep_deliveries', 'true').lower() == 'true'
        
        if not keep_deliveries:
            Database.execute_query("""
                DELETE FROM webhook_deliveries WHERE webhook_id = %s
            """, (webhook_id,))

        # Delete the webhook
        Database.execute_query("""
            DELETE FROM webhooks WHERE id = %s
        """, (webhook_id,))

        return jsonify({
            'message': 'Webhook deleted successfully',
            'webhook_name': webhook['name'],
            'deliveries_kept': keep_deliveries
        }), 200

    except Exception as e:
        logger.error(f"Error deleting webhook {webhook_id}: {e}")
        return jsonify({'error': 'Failed to delete webhook'}), 500