# app/blueprints/files.py
"""
Files blueprint - handles file upload, download, and management
"""
from flask import Blueprint, request, jsonify, g, send_file
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid, secure_filename
from app.utils.validators import validate_required_fields
from app.utils.file_handler import FileHandler
import os
import mimetypes
import logging

logger = logging.getLogger(__name__)

files_bp = Blueprint('files', __name__)


@files_bp.route('/upload', methods=['POST'])
@require_auth
@audit_log('upload', 'file')
def upload_file():
    """Upload file with security checks"""
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400

        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Get optional metadata
        workflow_instance_id = request.form.get('workflow_instance_id')
        task_id = request.form.get('task_id')
        description = request.form.get('description', '')
        access_level = request.form.get('access_level', 'private')

        if workflow_instance_id and not validate_uuid(workflow_instance_id):
            return jsonify({'error': 'Invalid workflow instance ID'}), 400

        if task_id and not validate_uuid(task_id):
            return jsonify({'error': 'Invalid task ID'}), 400

        # Validate file
        if not FileHandler.validate_file(file):
            return jsonify({'error': 'Invalid file type or size'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Save file
        file_path, file_size, checksum = FileHandler.save_file(file, tenant_id)

        # Store file metadata
        file_id = Database.execute_insert("""
            INSERT INTO files 
            (tenant_id, workflow_instance_id, task_id, original_name, 
             file_path, file_size, mime_type, checksum, uploaded_by, 
             access_level)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, workflow_instance_id, task_id, file.filename,
            file_path, file_size, file.mimetype, checksum, user_id,
            access_level
        ))

        return jsonify({
            'message': 'File uploaded successfully',
            'file_id': file_id,
            'file_name': file.filename,
            'file_size': file_size,
            'file_url': f'/api/files/{file_id}/download'
        }), 201

    except Exception as e:
        logger.error(f"Error uploading file: {e}")
        return jsonify({'error': 'Failed to upload file'}), 500


@files_bp.route('', methods=['GET'])
@require_auth
def get_files():
    """Get files list with filtering"""
    try:
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit

        # Filters
        workflow_instance_id = request.args.get('workflow_instance_id')
        task_id = request.args.get('task_id')
        access_level = request.args.get('access_level')
        mime_type = request.args.get('mime_type')

        # Build query
        where_conditions = ["f.tenant_id = %s"]
        params = [tenant_id]

        # Access control: users can see their own files and public files
        user_permissions = g.current_user.get('permissions', [])
        if 'view_all_files' not in user_permissions and '*' not in user_permissions:
            where_conditions.append("(f.uploaded_by = %s OR f.access_level = 'public')")
            params.append(user_id)

        if workflow_instance_id:
            where_conditions.append("f.workflow_instance_id = %s")
            params.append(workflow_instance_id)

        if task_id:
            where_conditions.append("f.task_id = %s")
            params.append(task_id)

        if access_level:
            where_conditions.append("f.access_level = %s")
            params.append(access_level)

        if mime_type:
            where_conditions.append("f.mime_type LIKE %s")
            params.append(f"{mime_type}%")

        where_clause = "WHERE " + " AND ".join(where_conditions)

        files = Database.execute_query(f"""
            SELECT f.id, f.original_name, f.file_size, f.mime_type, 
                   f.access_level, f.uploaded_at,
                   u.first_name || ' ' || u.last_name as uploaded_by_name,
                   wi.title as workflow_title,
                   t.name as task_name
            FROM files f
            LEFT JOIN users u ON f.uploaded_by = u.id
            LEFT JOIN workflow_instances wi ON f.workflow_instance_id = wi.id
            LEFT JOIN tasks t ON f.task_id = t.id
            {where_clause}
            ORDER BY f.uploaded_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(*) as count FROM files f
            {where_clause}
        """, params)

        return jsonify({
            'files': [dict(f) for f in files],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting files: {e}")
        return jsonify({'error': 'Failed to retrieve files'}), 500


@files_bp.route('/<file_id>', methods=['GET'])
@require_auth
def get_file_info(file_id):
    """Get file information"""
    try:
        if not validate_uuid(file_id):
            return jsonify({'error': 'Invalid file ID'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        file_info = Database.execute_one("""
            SELECT f.*, u.first_name || ' ' || u.last_name as uploaded_by_name,
                   wi.title as workflow_title,
                   t.name as task_name
            FROM files f
            LEFT JOIN users u ON f.uploaded_by = u.id
            LEFT JOIN workflow_instances wi ON f.workflow_instance_id = wi.id
            LEFT JOIN tasks t ON f.task_id = t.id
            WHERE f.id = %s AND f.tenant_id = %s
        """, (file_id, tenant_id))

        if not file_info:
            return jsonify({'error': 'File not found'}), 404

        # Check access permissions
        user_permissions = g.current_user.get('permissions', [])
        if (file_info['uploaded_by'] != user_id and
                file_info['access_level'] == 'private' and
                'view_all_files' not in user_permissions and
                '*' not in user_permissions):
            return jsonify({'error': 'Access denied'}), 403

        return jsonify({'file': dict(file_info)}), 200

    except Exception as e:
        logger.error(f"Error getting file info {file_id}: {e}")
        return jsonify({'error': 'Failed to retrieve file information'}), 500


@files_bp.route('/<file_id>/download', methods=['GET'])
@require_auth
@audit_log('download', 'file')
def download_file(file_id):
    """Download file with access control"""
    try:
        if not validate_uuid(file_id):
            return jsonify({'error': 'Invalid file ID'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        file_info = Database.execute_one("""
            SELECT f.original_name, f.file_path, f.mime_type, f.uploaded_by, f.access_level
            FROM files f
            WHERE f.id = %s AND f.tenant_id = %s
        """, (file_id, tenant_id))

        if not file_info:
            return jsonify({'error': 'File not found'}), 404

        # Check access permissions
        user_permissions = g.current_user.get('permissions', [])
        if (file_info['uploaded_by'] != user_id and
                file_info['access_level'] == 'private' and
                'view_all_files' not in user_permissions and
                '*' not in user_permissions):
            return jsonify({'error': 'Access denied'}), 403

        # Check if file exists on disk
        if not os.path.exists(file_info['file_path']):
            logger.error(f"File not found on disk: {file_info['file_path']}")
            return jsonify({'error': 'File not found on storage'}), 404

        return send_file(
            file_info['file_path'],
            mimetype=file_info['mime_type'],
            as_attachment=True,
            download_name=file_info['original_name']
        )

    except Exception as e:
        logger.error(f"Error downloading file {file_id}: {e}")
        return jsonify({'error': 'Failed to download file'}), 500


@files_bp.route('/<file_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_files'])
@audit_log('update', 'file')
def update_file_metadata(file_id):
    """Update file metadata"""
    try:
        if not validate_uuid(file_id):
            return jsonify({'error': 'Invalid file ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Check if file exists and user has permission
        file_info = Database.execute_one("""
            SELECT uploaded_by FROM files 
            WHERE id = %s AND tenant_id = %s
        """, (file_id, tenant_id))

        if not file_info:
            return jsonify({'error': 'File not found'}), 404

        # Check permissions
        user_permissions = g.current_user.get('permissions', [])
        if (file_info['uploaded_by'] != user_id and
                'manage_all_files' not in user_permissions and
                '*' not in user_permissions):
            return jsonify({'error': 'Access denied'}), 403

        # Update allowed fields
        update_fields = []
        params = []

        if 'access_level' in data and data['access_level'] in ['private', 'team', 'public']:
            update_fields.append('access_level = %s')
            params.append(data['access_level'])

        if update_fields:
            params.append(file_id)
            query = f"""
                UPDATE files 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            Database.execute_query(query, params)

        return jsonify({'message': 'File metadata updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating file metadata {file_id}: {e}")
        return jsonify({'error': 'Failed to update file metadata'}), 500


@files_bp.route('/<file_id>', methods=['DELETE'])
@require_auth
@require_permissions(['manage_files'])
@audit_log('delete', 'file')
def delete_file(file_id):
    """Delete file"""
    try:
        if not validate_uuid(file_id):
            return jsonify({'error': 'Invalid file ID'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Get file info
        file_info = Database.execute_one("""
            SELECT file_path, uploaded_by FROM files 
            WHERE id = %s AND tenant_id = %s
        """, (file_id, tenant_id))

        if not file_info:
            return jsonify({'error': 'File not found'}), 404

        # Check permissions
        user_permissions = g.current_user.get('permissions', [])
        if (file_info['uploaded_by'] != user_id and
                'manage_all_files' not in user_permissions and
                '*' not in user_permissions):
            return jsonify({'error': 'Access denied'}), 403

        # Delete file from database
        Database.execute_query("""
            DELETE FROM files WHERE id = %s
        """, (file_id,))

        # Delete file from storage
        try:
            if os.path.exists(file_info['file_path']):
                os.remove(file_info['file_path'])
        except Exception as e:
            logger.error(f"Failed to delete file from storage: {e}")

        return jsonify({'message': 'File deleted successfully'}), 200

    except Exception as e:
        logger.error(f"Error deleting file {file_id}: {e}")
        return jsonify({'error': 'Failed to delete file'}), 500


@files_bp.route('/stats', methods=['GET'])
@require_auth
def get_file_stats():
    """Get file statistics"""
    try:
        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Get user's file stats
        user_stats = Database.execute_one("""
            SELECT 
                COUNT(*) as total_files,
                SUM(file_size) as total_size,
                COUNT(CASE WHEN uploaded_at >= NOW() - INTERVAL '30 days' THEN 1 END) as recent_files
            FROM files 
            WHERE tenant_id = %s AND uploaded_by = %s
        """, (tenant_id, user_id))

        # Get file type breakdown
        type_breakdown = Database.execute_query("""
            SELECT 
                SPLIT_PART(mime_type, '/', 1) as file_type,
                COUNT(*) as count,
                SUM(file_size) as total_size
            FROM files 
            WHERE tenant_id = %s AND uploaded_by = %s
            GROUP BY SPLIT_PART(mime_type, '/', 1)
            ORDER BY count DESC
        """, (tenant_id, user_id))

        return jsonify({
            'user_stats': dict(user_stats),
            'type_breakdown': [dict(t) for t in type_breakdown]
        }), 200

    except Exception as e:
        logger.error(f"Error getting file stats: {e}")
        return jsonify({'error': 'Failed to retrieve file statistics'}), 500