# app/blueprints/webhooks.py
"""
Webhooks blueprint - handles webhook management and delivery
"""
from flask import Blueprint, request, jsonify, g
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid
from app.utils.validators import validate_required_fields
import json
import requests
import hmac
import hashlib
import logging

logger = logging.getLogger(__name__)

webhooks_bp = Blueprint('webhooks', __name__)


@webhooks_bp.route('', methods=['GET'])
@require_auth
@require_permissions(['view_webhooks'])
def get_webhooks():
    """Get all webhooks for the current tenant"""
    try:
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit

        webhooks = Database.execute_query("""
            SELECT w.id, w.name, w.url, w.events, w.is_active, w.retry_count,
                   w.timeout_seconds, w.created_at, w.updated_at,
                   u.first_name || ' ' || u.last_name as created_by_name,
                   COUNT(wd.id) as delivery_count,
                   COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries
            FROM webhooks w
            LEFT JOIN users u ON w.created_by = u.id
            LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id
            WHERE w.tenant_id = %s
            GROUP BY w.id, u.first_name, u.last_name
            ORDER BY w.created_at DESC
            LIMIT %s OFFSET %s
        """, (tenant_id, limit, offset))

        # Get total count
        total = Database.execute_one("""
            SELECT COUNT(*) as count 
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
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting webhooks: {e}")
        return jsonify({'error': 'Failed to retrieve webhooks'}), 500


@webhooks_bp.route('/<webhook_id>', methods=['GET'])
@require_auth
@require_permissions(['view_webhooks'])
def get_webhook(webhook_id):
    """Get specific webhook"""
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

        # Parse JSON fields
        webhook_dict = dict(webhook)
        if webhook_dict['headers']:
            webhook_dict['headers'] = json.loads(webhook_dict['headers'])

        # Get recent deliveries
        deliveries = Database.execute_query("""
            SELECT id, event_type, response_status, delivery_attempts,
                   last_attempt_at, delivered_at, created_at
            FROM webhook_deliveries
            WHERE webhook_id = %s
            ORDER BY created_at DESC
            LIMIT 10
        """, (webhook_id,))

        webhook_dict['recent_deliveries'] = [dict(d) for d in deliveries]

        return jsonify({'webhook': webhook_dict}), 200

    except Exception as e:
        logger.error(f"Error getting webhook {webhook_id}: {e}")
        return jsonify({'error': 'Failed to retrieve webhook'}), 500


@webhooks_bp.route('', methods=['POST'])
@require_auth
@require_permissions(['manage_webhooks'])
@audit_log('create', 'webhook')
def create_webhook():
    """Create new webhook"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['name', 'url', 'events']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        # Validate URL
        if not data['url'].startswith(('http://', 'https://')):
            return jsonify({'error': 'Invalid webhook URL'}), 400

        # Validate events
        valid_events = [
            'workflow_started', 'workflow_completed', 'workflow_failed',
            'task_assigned', 'task_completed', 'task_failed',
            'sla_breach', 'user_created', 'form_submitted'
        ]

        for event in data['events']:
            if event not in valid_events:
                return jsonify({'error': f'Invalid event type: {event}'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        webhook_id = Database.execute_insert("""
            INSERT INTO webhooks 
            (tenant_id, name, url, events, headers, retry_count, 
             timeout_seconds, secret, created_by)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, data['name'], data['url'], data['events'],
            json.dumps(data.get('headers', {})),
            data.get('retry_count', 3),
            data.get('timeout_seconds', 30),
            data.get('secret'),
            user_id
        ))

        return jsonify({
            'message': 'Webhook created successfully',
            'webhook_id': webhook_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating webhook: {e}")
        return jsonify({'error': 'Failed to create webhook'}), 500


@webhooks_bp.route('/<webhook_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_webhooks'])
@audit_log('update', 'webhook')
def update_webhook(webhook_id):
    """Update webhook"""
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

        # Update webhook
        update_fields = []
        params = []

        if 'name' in data:
            update_fields.append('name = %s')
            params.append(data['name'])

        if 'url' in data:
            if not data['url'].startswith(('http://', 'https://')):
                return jsonify({'error': 'Invalid webhook URL'}), 400
            update_fields.append('url = %s')
            params.append(data['url'])

        if 'events' in data:
            update_fields.append('events = %s')
            params.append(data['events'])

        if 'headers' in data:
            update_fields.append('headers = %s')
            params.append(json.dumps(data['headers']))

        if 'is_active' in data:
            update_fields.append('is_active = %s')
            params.append(data['is_active'])

        if 'retry_count' in data:
            update_fields.append('retry_count = %s')
            params.append(data['retry_count'])

        if 'timeout_seconds' in data:
            update_fields.append('timeout_seconds = %s')
            params.append(data['timeout_seconds'])

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


@webhooks_bp.route('/<webhook_id>/test', methods=['POST'])
@require_auth
@require_permissions(['manage_webhooks'])
def test_webhook(webhook_id):
    """Test webhook delivery"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Get webhook
        webhook = Database.execute_one("""
            SELECT id, name, url, headers, secret, timeout_seconds
            FROM webhooks 
            WHERE id = %s AND tenant_id = %s AND is_active = true
        """, (webhook_id, tenant_id))

        if not webhook:
            return jsonify({'error': 'Webhook not found or inactive'}), 404

        # Prepare test payload
        test_payload = {
            'event_type': 'webhook_test',
            'timestamp': '2024-01-16T10:00:00Z',
            'data': {
                'message': 'This is a test webhook delivery',
                'webhook_id': webhook_id,
                'webhook_name': webhook['name']
            }
        }

        # Send webhook
        success, response_status, response_body = send_webhook_request(
            webhook, 'webhook_test', test_payload
        )

        # Record delivery
        Database.execute_insert("""
            INSERT INTO webhook_deliveries 
            (webhook_id, event_type, payload, response_status, response_body,
             delivery_attempts, last_attempt_at, delivered_at)
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), %s)
        """, (
            webhook_id, 'webhook_test', json.dumps(test_payload),
            response_status, response_body, 1,
            'NOW()' if success else None
        ))

        if success:
            return jsonify({
                'message': 'Webhook test successful',
                'status_code': response_status,
                'response': response_body[:500]  # Truncate long responses
            }), 200
        else:
            return jsonify({
                'message': 'Webhook test failed',
                'status_code': response_status,
                'error': response_body[:500]
            }), 400

    except Exception as e:
        logger.error(f"Error testing webhook {webhook_id}: {e}")
        return jsonify({'error': 'Failed to test webhook'}), 500


@webhooks_bp.route('/<webhook_id>/deliveries', methods=['GET'])
@require_auth
@require_permissions(['view_webhooks'])
def get_webhook_deliveries(webhook_id):
    """Get webhook delivery history"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = (page - 1) * limit

        # Check webhook exists
        webhook_exists = Database.execute_one("""
            SELECT id FROM webhooks 
            WHERE id = %s AND tenant_id = %s
        """, (webhook_id, tenant_id))

        if not webhook_exists:
            return jsonify({'error': 'Webhook not found'}), 404

        deliveries = Database.execute_query("""
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
            LIMIT %s OFFSET %s
        """, (webhook_id, limit, offset))

        # Get total count
        total = Database.execute_one("""
            SELECT COUNT(*) as count 
            FROM webhook_deliveries 
            WHERE webhook_id = %s
        """, (webhook_id,))

        return jsonify({
            'deliveries': [dict(d) for d in deliveries],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
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
    """Delete webhook"""
    try:
        if not validate_uuid(webhook_id):
            return jsonify({'error': 'Invalid webhook ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Delete webhook and related deliveries
        Database.execute_query("""
            DELETE FROM webhook_deliveries WHERE webhook_id = %s
        """, (webhook_id,))

        Database.execute_query("""
            DELETE FROM webhooks 
            WHERE id = %s AND tenant_id = %s
        """, (webhook_id, tenant_id))

        return jsonify({'message': 'Webhook deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Error deleting webhook {webhook_id}: {e}")
        return jsonify({'error': 'Failed to delete webhook'}), 500


def send_webhook_request(webhook, event_type, payload):
    """Send webhook request with proper error handling"""
    try:
        headers = json.loads(webhook['headers']) if webhook['headers'] else {}
        headers['Content-Type'] = 'application/json'
        headers['User-Agent'] = 'WorkflowManagement-Webhook/1.0'

        # Add signature if secret is provided
        if webhook['secret']:
            signature = hmac.new(
                webhook['secret'].encode(),
                json.dumps(payload).encode(),
                hashlib.sha256
            ).hexdigest()
            headers['X-Webhook-Signature'] = f'sha256={signature}'

        response = requests.post(
            webhook['url'],
            json=payload,
            headers=headers,
            timeout=webhook['timeout_seconds'],
            verify=True
        )

        return (
            response.status_code == 200,
            response.status_code,
            response.text[:1000]  # Limit response body size
        )

    except requests.exceptions.RequestException as e:
        logger.error(f"Webhook request failed: {e}")
        return False, 0, str(e)[:1000]