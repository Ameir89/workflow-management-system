# app/blueprints/admin.py
"""
Admin blueprint - handles administrative functions
"""
from flask import Blueprint, request, jsonify, g,json
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.utils.security import sanitize_input, validate_uuid, validate_email
from app.utils.validators import validate_required_fields, validate_pagination_params
from app.utils.auth import AuthUtils
from app.services.audit_logger import AuditLogger
import logging

logger = logging.getLogger(__name__)

admin_bp = Blueprint('admin', __name__)


# User Management
@admin_bp.route('/users', methods=['GET'])
@require_auth
@require_permissions(['manage_users'])
def get_users():
    """Get all users in tenant"""
    try:
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit
        search = request.args.get('search', '')
        role_filter = request.args.get('role')
        status_filter = request.args.get('status')

        # Build query
        where_conditions = ["u.tenant_id = %s"]
        params = [tenant_id]

        if search:
            where_conditions.append("""
                (u.username ILIKE %s OR u.email ILIKE %s OR 
                 u.first_name ILIKE %s OR u.last_name ILIKE %s)
            """)
            search_pattern = f"%{search}%"
            params.extend([search_pattern] * 4)

        if role_filter:
            where_conditions.append("r.name = %s")
            params.append(role_filter)

        if status_filter == 'active':
            where_conditions.append("u.is_active = true")
        elif status_filter == 'inactive':
            where_conditions.append("u.is_active = false")

        where_clause = "WHERE " + " AND ".join(where_conditions)

        users = Database.execute_query(f"""
            SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                   u.phone, u.is_active, u.is_verified, u.two_fa_enabled,
                   u.created_at, u.last_login,
                   ARRAY_AGG(DISTINCT r.name) FILTER (WHERE r.name IS NOT NULL) as roles
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            {where_clause}
            GROUP BY u.id
            ORDER BY u.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(DISTINCT u.id) as count 
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            {where_clause}
        """, params)

        return jsonify({
            'users': [dict(u) for u in users],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting users: {e}")
        return jsonify({'error': 'Failed to retrieve users'}), 500


@admin_bp.route('/users', methods=['POST'])
@require_auth
@require_permissions(['manage_users'])
@audit_log('create', 'user')
def create_user():
    """Create new user"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400

        tenant_id = g.current_user['tenant_id']

        # Check if user already exists
        existing = Database.execute_one("""
            SELECT id FROM users 
            WHERE (username = %s OR email = %s) AND tenant_id = %s
        """, (data['username'], data['email'], tenant_id))

        if existing:
            return jsonify({'error': 'User already exists'}), 409

        # Hash password
        password_hash = AuthUtils.hash_password(data['password'])

        # Create user
        user_id = Database.execute_insert("""
            INSERT INTO users 
            (tenant_id, username, email, password_hash, first_name, last_name, phone)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (
            tenant_id, data['username'], data['email'], password_hash,
            data['first_name'], data['last_name'], data.get('phone')
        ))

        # Assign roles if provided
        if 'roles' in data and data['roles']:
            for role_name in data['roles']:
                role = Database.execute_one("""
                    SELECT id FROM roles 
                    WHERE name = %s AND tenant_id = %s
                """, (role_name, tenant_id))

                if role:
                    Database.execute_query("""
                        INSERT INTO user_roles (user_id, role_id, assigned_by)
                        VALUES (%s, %s, %s)
                    """, (user_id, role['id'], g.current_user['user_id']))

        return jsonify({
            'message': 'User created successfully',
            'user_id': user_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating user: {e}")
        return jsonify({'error': 'Failed to create user'}), 500


@admin_bp.route('/users/<user_id>', methods=['PUT'])
@require_auth
@require_permissions(['manage_users'])
@audit_log('update', 'user')
def update_user(user_id):
    """Update user"""
    try:
        if not validate_uuid(user_id):
            return jsonify({'error': 'Invalid user ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        # Check if user exists
        existing = Database.execute_one("""
            SELECT id FROM users 
            WHERE id = %s AND tenant_id = %s
        """, (user_id, tenant_id))

        if not existing:
            return jsonify({'error': 'User not found'}), 404

        # Update user
        update_fields = []
        params = []

        if 'first_name' in data:
            update_fields.append('first_name = %s')
            params.append(data['first_name'])

        if 'last_name' in data:
            update_fields.append('last_name = %s')
            params.append(data['last_name'])

        if 'email' in data:
            if not validate_email(data['email']):
                return jsonify({'error': 'Invalid email format'}), 400
            update_fields.append('email = %s')
            params.append(data['email'])

        if 'phone' in data:
            update_fields.append('phone = %s')
            params.append(data['phone'])

        if 'is_active' in data:
            update_fields.append('is_active = %s')
            params.append(data['is_active'])

        if 'password' in data:
            password_hash = AuthUtils.hash_password(data['password'])
            update_fields.append('password_hash = %s')
            params.append(password_hash)

        if update_fields:
            update_fields.append('updated_at = NOW()')
            params.append(user_id)

            query = f"""
                UPDATE users 
                SET {', '.join(update_fields)}
                WHERE id = %s
            """
            Database.execute_query(query, params)

        # Update roles if provided
        if 'roles' in data:
            # Remove existing roles
            Database.execute_query("""
                DELETE FROM user_roles WHERE user_id = %s
            """, (user_id,))

            # Add new roles
            for role_name in data['roles']:
                role = Database.execute_one("""
                    SELECT id FROM roles 
                    WHERE name = %s AND tenant_id = %s
                """, (role_name, tenant_id))

                if role:
                    Database.execute_query("""
                        INSERT INTO user_roles (user_id, role_id, assigned_by)
                        VALUES (%s, %s, %s)
                    """, (user_id, role['id'], g.current_user['user_id']))

        return jsonify({'message': 'User updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating user {user_id}: {e}")
        return jsonify({'error': 'Failed to update user'}), 500


# Role Management
@admin_bp.route('/roles', methods=['GET'])
@require_auth
@require_permissions(['manage_roles'])
def get_roles():
    """Get all roles in tenant"""
    try:
        tenant_id = g.current_user['tenant_id']

        roles = Database.execute_query("""
            SELECT r.id, r.name, r.description, r.permissions, r.is_system,
                   r.created_at, COUNT(ur.user_id) as user_count
            FROM roles r
            LEFT JOIN user_roles ur ON r.id = ur.role_id
            WHERE r.tenant_id = %s
            GROUP BY r.id
            ORDER BY r.created_at
        """, (tenant_id,))

        # Parse permissions JSON
        for role in roles:
            try:
                if role.get('permissions') and isinstance(role['permissions'], str):
                    role['permissions'] = json.loads(role['permissions'])
            except Exception as parse_err:
                logger.warning(f"Could not parse permissions for role {role['id']}: {parse_err}")
            # if role['permissions']:
            #     role['permissions'] = json.loads(role['permissions'])

        return jsonify({'roles': [dict(r) for r in roles]}), 200

    except Exception as e:
        logger.error(f"Error getting roles: {e}")
        return jsonify({'error': 'Failed to retrieve roles'}), 500


@admin_bp.route('/roles', methods=['POST'])
@require_auth
@require_permissions(['manage_roles'])
@audit_log('create', 'role')
def create_role():
    """Create new role"""
    try:
        data = sanitize_input(request.get_json())

        required_fields = ['name', 'permissions']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400

        tenant_id = g.current_user['tenant_id']

        # Check if role already exists
        existing = Database.execute_one("""
            SELECT id FROM roles 
            WHERE name = %s AND tenant_id = %s
        """, (data['name'], tenant_id))

        if existing:
            return jsonify({'error': 'Role already exists'}), 409

        role_id = Database.execute_insert("""
            INSERT INTO roles 
            (tenant_id, name, description, permissions)
            VALUES (%s, %s, %s, %s)
        """, (
            tenant_id, data['name'], data.get('description', ''),
            json.dumps(data['permissions'])
        ))

        return jsonify({
            'message': 'Role created successfully',
            'role_id': role_id
        }), 201

    except Exception as e:
        logger.error(f"Error creating role: {e}")
        return jsonify({'error': 'Failed to create role'}), 500


# System Health and Monitoring
@admin_bp.route('/health', methods=['GET'])
@require_auth
@require_permissions(['view_system_health'])
def get_system_health():
    """Get system health status"""
    try:
        # Check database connectivity
        db_status = "connected"
        try:
            Database.execute_one("SELECT 1")
        except:
            db_status = "disconnected"

        # Check Redis connectivity (simplified)
        redis_status = "connected"  # Would implement actual Redis check

        # Get basic stats
        tenant_id = g.current_user['tenant_id']

        stats = Database.execute_one("""
            SELECT 
                (SELECT COUNT(*) FROM users WHERE tenant_id = %s) as total_users,
                (SELECT COUNT(*) FROM workflows WHERE tenant_id = %s) as total_workflows,
                (SELECT COUNT(*) FROM workflow_instances WHERE tenant_id = %s) as total_instances,
                (SELECT COUNT(*) FROM tasks WHERE workflow_instance_id IN 
                    (SELECT id FROM workflow_instances WHERE tenant_id = %s)) as total_tasks
        """, (tenant_id, tenant_id, tenant_id, tenant_id))

        return jsonify({
            'status': 'healthy' if db_status == 'connected' else 'unhealthy',
            'database': db_status,
            'redis': redis_status,
            'storage': 'available',
            'version': '1.0.0',
            'stats': dict(stats)
        }), 200

    except Exception as e:
        logger.error(f"Error getting system health: {e}")
        return jsonify({'error': 'Failed to retrieve system health'}), 500


@admin_bp.route('/audit-logs', methods=['GET'])
@require_auth
@require_permissions(['view_audit_logs'])
def get_audit_logs():
    """Get audit logs with filtering"""
    try:
        tenant_id = g.current_user['tenant_id']
        page, limit = validate_pagination_params(
            request.args.get('page', 1),
            request.args.get('limit', 50)
        )

        # Filters
        filters = {
            'user_id': request.args.get('user_id'),
            'action': request.args.get('action'),
            'resource_type': request.args.get('resource_type'),
            'date_from': request.args.get('date_from'),
            'date_to': request.args.get('date_to')
        }

        # Remove None values
        filters = {k: v for k, v in filters.items() if v}

        audit_data = AuditLogger.get_audit_logs(tenant_id, filters, page, limit)

        return jsonify(audit_data), 200

    except Exception as e:
        logger.error(f"Error getting audit logs: {e}")
        return jsonify({'error': 'Failed to retrieve audit logs'}), 500


@admin_bp.route('/system-config', methods=['GET'])
@require_auth
@require_permissions(['manage_system'])
def get_system_config():
    """Get system configuration"""
    try:
        tenant_id = g.current_user['tenant_id']

        # Get tenant settings
        tenant = Database.execute_one("""
            SELECT name, settings FROM tenants WHERE id = %s
        """, (tenant_id,))

        if not tenant:
            return jsonify({'error': 'Tenant not found'}), 404

        config = {
            'tenant_name': tenant['name'],
            'settings': json.loads(tenant['settings']) if tenant['settings'] else {}
        }

        return jsonify({'config': config}), 200

    except Exception as e:
        logger.error(f"Error getting system config: {e}")
        return jsonify({'error': 'Failed to retrieve system configuration'}), 500


@admin_bp.route('/system-config', methods=['PUT'])
@require_auth
@require_permissions(['manage_system'])
@audit_log('update', 'system_config')
def update_system_config():
    """Update system configuration"""
    try:
        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        # Update tenant settings
        if 'settings' in data:
            Database.execute_query("""
                UPDATE tenants 
                SET settings = %s, updated_at = NOW()
                WHERE id = %s
            """, (json.dumps(data['settings']), tenant_id))

        return jsonify({'message': 'System configuration updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating system config: {e}")
        return jsonify({'error': 'Failed to update system configuration'}), 500

