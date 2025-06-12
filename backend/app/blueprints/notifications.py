# app/blueprints/notifications.py (New Blueprint)
"""
Notifications blueprint - handles notification management
"""
from flask import Blueprint, request, jsonify, g
from app.middleware import require_auth, audit_log
from app.database import Database
from app.utils.security import validate_uuid
from app.utils.validators import validate_pagination_params
from app.services.notification_service import NotificationService
import json
import logging

logger = logging.getLogger(__name__)

notifications_bp = Blueprint('notifications', __name__)


@notifications_bp.route('', methods=['GET'])
@require_auth
def get_notifications():
    """Get user notifications"""
    try:
        user_id = g.current_user['user_id']
        page, limit = validate_pagination_params(
            request.args.get('page', 1),
            request.args.get('limit', 20)
        )
        unread_only = request.args.get('unread_only', 'false').lower() == 'true'

        notifications = NotificationService.get_user_notifications(
            user_id, unread_only, limit
        )

        # Parse JSON data
        for notification in notifications:
            if notification['data']:
                notification['data'] = json.loads(notification['data'])

        return jsonify({
            'notifications': notifications,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': len(notifications)
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting notifications: {e}")
        return jsonify({'error': 'Failed to retrieve notifications'}), 500


@notifications_bp.route('/<notification_id>/read', methods=['PUT'])
@require_auth
@audit_log('mark_read', 'notification')
def mark_notification_read(notification_id):
    """Mark notification as read"""
    try:
        if not validate_uuid(notification_id):
            return jsonify({'error': 'Invalid notification ID'}), 400

        user_id = g.current_user['user_id']

        NotificationService.mark_notification_read(notification_id, user_id)

        return jsonify({'message': 'Notification marked as read'}), 200

    except Exception as e:
        logger.error(f"Error marking notification as read: {e}")
        return jsonify({'error': 'Failed to mark notification as read'}), 500


@notifications_bp.route('/mark-all-read', methods=['PUT'])
@require_auth
@audit_log('mark_all_read', 'notification')
def mark_all_notifications_read():
    """Mark all notifications as read"""
    try:
        user_id = g.current_user['user_id']

        NotificationService.mark_all_read(user_id)

        return jsonify({'message': 'All notifications marked as read'}), 200

    except Exception as e:
        logger.error(f"Error marking all notifications as read: {e}")
        return jsonify({'error': 'Failed to mark all notifications as read'}), 500


@notifications_bp.route('/stats', methods=['GET'])
@require_auth
def get_notification_stats():
    """Get notification statistics"""
    try:
        user_id = g.current_user['user_id']

        stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_notifications,
                COUNT(CASE WHEN is_read = false THEN 1 END) as unread_count,
                COUNT(CASE WHEN created_at >= NOW() - INTERVAL '24 hours' THEN 1 END) as recent_count
            FROM notifications 
            WHERE user_id = %s
        """, (user_id,))

        return jsonify({'stats': dict(stats)}), 200

    except Exception as e:
        logger.error(f"Error getting notification stats: {e}")
        return jsonify({'error': 'Failed to retrieve notification statistics'}), 500


@notifications_bp.route('/<notification_id>', methods=['DELETE'])
@require_auth
@audit_log('delete', 'notification')
def delete_notification(notification_id):
    """Delete notification"""
    try:
        if not validate_uuid(notification_id):
            return jsonify({'error': 'Invalid notification ID'}), 400

        user_id = g.current_user['user_id']

        Database.execute_query("""
            DELETE FROM notifications 
            WHERE id = %s AND user_id = %s
        """, (notification_id, user_id))

        return jsonify({'message': 'Notification deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Error deleting notification: {e}")
        return jsonify({'error': 'Failed to delete notification'}), 500