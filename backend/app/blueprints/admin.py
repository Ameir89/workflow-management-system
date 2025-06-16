# app/blueprints/admin.py
"""
Admin blueprint - handles administrative functions
"""
from flask import Blueprint, request, jsonify, g,json
from app.middleware import require_auth, require_permissions, audit_log
from app.database import Database
from app.services.permission_service import PermissionService
from app.utils.security import sanitize_input, validate_uuid, validate_email
from app.utils.validators import validate_required_fields, validate_pagination_params
from app.utils.auth import AuthUtils
from app.services.audit_logger import AuditLogger
import logging
import json

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


# Add these new routes to your existing admin.py file

@admin_bp.route('/permissions', methods=['GET'])
@require_auth
@require_permissions(['view_permissions'])
def get_all_permissions():
    """Get all available permissions in the system"""
    try:
        # Define all available permissions with categories
        permissions_structure = {
            'workflow_management': {
                'name': 'Workflow Management',
                'description': 'Permissions related to workflow creation and management',
                'permissions': [
                    'create_workflows',
                    'manage_workflows',
                    'execute_workflows',
                    'view_workflows',
                    'delete_workflows'
                ]
            },
            'task_management': {
                'name': 'Task Management',
                'description': 'Permissions for task handling and execution',
                'permissions': [
                    'execute_tasks',
                    'manage_tasks',
                    'view_tasks',
                    'assign_tasks',
                    'complete_tasks'
                ]
            },
            'user_management': {
                'name': 'User Management',
                'description': 'User administration and management',
                'permissions': [
                    'manage_users',
                    'view_users',
                    'create_users',
                    'delete_users',
                    'manage_user_roles'
                ]
            },
            'role_management': {
                'name': 'Role Management',
                'description': 'Role and permission administration',
                'permissions': [
                    'manage_roles',
                    'view_roles',
                    'create_roles',
                    'delete_roles',
                    'assign_permissions'
                ]
            },
            'form_management': {
                'name': 'Form Management',
                'description': 'Dynamic form creation and management',
                'permissions': [
                    'create_forms',
                    'manage_forms',
                    'view_forms',
                    'view_form_responses',
                    'delete_forms'
                ]
            },
            'lookup_management': {
                'name': 'Lookup Management',
                'description': 'Lookup table and data management',
                'permissions': [
                    'manage_lookups',
                    'view_lookups',
                    'view_all_lookups',
                    'manage_system_lookups',
                    'import_lookups',
                    'export_lookups'
                ]
            },
            'reporting': {
                'name': 'Reporting & Analytics',
                'description': 'Access to reports and system analytics',
                'permissions': [
                    'view_reports',
                    'create_reports',
                    'export_reports',
                    'view_analytics',
                    'view_audit_logs'
                ]
            },
            'system_administration': {
                'name': 'System Administration',
                'description': 'System-level administration and configuration',
                'permissions': [
                    'manage_system',
                    'view_system_health',
                    'manage_system_config',
                    'manage_integrations',
                    'manage_backups'
                ]
            },
            'file_management': {
                'name': 'File Management',
                'description': 'File upload, download, and management',
                'permissions': [
                    'manage_files',
                    'view_all_files',
                    'upload_files',
                    'download_files',
                    'delete_files'
                ]
            },
            'automation': {
                'name': 'Automation',
                'description': 'Automation and workflow scripting',
                'permissions': [
                    'manage_automation',
                    'view_automation',
                    'execute_automation',
                    'test_automation',
                    'manage_webhooks'
                ]
            },
            'sla_management': {
                'name': 'SLA Management',
                'description': 'Service Level Agreement monitoring',
                'permissions': [
                    'manage_sla',
                    'view_sla',
                    'configure_sla',
                    'view_sla_breaches'
                ]
            }
        }

        return jsonify({
            'permissions': permissions_structure,
            'total_categories': len(permissions_structure),
            'total_permissions': sum(len(cat['permissions']) for cat in permissions_structure.values())
        }), 200

    except Exception as e:
        logger.error(f"Error getting permissions: {e}")
        return jsonify({'error': 'Failed to retrieve permissions'}), 500


@admin_bp.route('/permissions/by-category', methods=['GET'])
@require_auth
@require_permissions(['view_permissions'])
def get_permissions_by_category():
    """Get permissions organized by category for UI display"""
    try:
        # You can customize this based on your needs
        permissions_by_category = {
            'Core Workflow': [
                'create_workflows', 'manage_workflows', 'execute_workflows', 'view_workflows',
                'execute_tasks', 'manage_tasks', 'view_tasks', 'assign_tasks'
            ],
            'Administration': [
                'manage_users', 'view_users', 'create_users', 'manage_roles', 'view_roles',
                'manage_system', 'view_system_health'
            ],
            'Data Management': [
                'create_forms', 'manage_forms', 'view_form_responses', 'manage_lookups',
                'view_lookups', 'manage_files'
            ],
            'Analytics & Reporting': [
                'view_reports', 'create_reports', 'export_reports', 'view_analytics',
                'view_audit_logs'
            ],
            'Advanced Features': [
                'manage_automation', 'view_automation', 'execute_automation',
                'manage_webhooks', 'manage_sla'
            ]
        }

        return jsonify({'categories': permissions_by_category}), 200

    except Exception as e:
        logger.error(f"Error getting permissions by category: {e}")
        return jsonify({'error': 'Failed to retrieve permissions by category'}), 500


@admin_bp.route('/roles/<role_id>/permissions', methods=['GET'])
@require_auth
@require_permissions(['view_roles'])
def get_role_permissions(role_id):
    """Get permissions for a specific role"""
    try:
        if not validate_uuid(role_id):
            return jsonify({'error': 'Invalid role ID'}), 400

        tenant_id = g.current_user['tenant_id']

        role = Database.execute_one("""
            SELECT id, name, description, permissions, is_system
            FROM roles 
            WHERE id = %s AND tenant_id = %s
        """, (role_id, tenant_id))

        if not role:
            return jsonify({'error': 'Role not found'}), 404

        # Parse permissions
        permissions = []
        try:
            if role['permissions']:
                permissions = json.loads(role['permissions']) if isinstance(role['permissions'], str) else role[
                    'permissions']
        except json.JSONDecodeError:
            permissions = []

        return jsonify({
            'role': {
                'id': role['id'],
                'name': role['name'],
                'description': role['description'],
                'is_system': role['is_system'],
                'permissions': permissions
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting role permissions: {e}")
        return jsonify({'error': 'Failed to retrieve role permissions'}), 500


@admin_bp.route('/roles/<role_id>/permissions', methods=['PUT'])
@require_auth
@require_permissions(['manage_roles'])
@audit_log('update_permissions', 'role')
def update_role_permissions(role_id):
    """Update permissions for a role"""
    try:
        if not validate_uuid(role_id):
            return jsonify({'error': 'Invalid role ID'}), 400

        data = sanitize_input(request.get_json())
        tenant_id = g.current_user['tenant_id']

        if not validate_required_fields(data, ['permissions']):
            return jsonify({'error': 'Permissions array required'}), 400

        # Check if role exists and is not system role
        role = Database.execute_one("""
            SELECT id, name, is_system FROM roles 
            WHERE id = %s AND tenant_id = %s
        """, (role_id, tenant_id))

        if not role:
            return jsonify({'error': 'Role not found'}), 404

        if role['is_system'] and not g.current_user.get('permissions', []).count('*'):
            return jsonify({'error': 'Cannot modify system role permissions'}), 403

        # Validate permissions
        valid_permissions = get_all_valid_permissions()
        invalid_permissions = [p for p in data['permissions'] if p not in valid_permissions and p != '*']

        if invalid_permissions:
            return jsonify({
                'error': f'Invalid permissions: {", ".join(invalid_permissions)}'
            }), 400

        # Update role permissions
        Database.execute_query("""
            UPDATE roles 
            SET permissions = %s, updated_at = NOW()
            WHERE id = %s
        """, (json.dumps(data['permissions']), role_id))

        return jsonify({'message': 'Role permissions updated successfully'}), 200

    except Exception as e:
        logger.error(f"Error updating role permissions: {e}")
        return jsonify({'error': 'Failed to update role permissions'}), 500


@admin_bp.route('/users/<user_id>/permissions', methods=['GET'])
@require_auth
@require_permissions(['view_users'])
def get_user_effective_permissions(user_id):
    """Get effective permissions for a user (combined from all roles)"""
    try:
        if not validate_uuid(user_id):
            return jsonify({'error': 'Invalid user ID'}), 400

        tenant_id = g.current_user['tenant_id']

        # Get user with all roles and permissions
        user_data = Database.execute_one("""
            SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                   ARRAY_AGG(DISTINCT r.name) as roles,
                   ARRAY_AGG(DISTINCT r.id) as role_ids
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = %s AND u.tenant_id = %s
            GROUP BY u.id
        """, (user_id, tenant_id))

        if not user_data:
            return jsonify({'error': 'User not found'}), 404

        # Get all permissions from user's roles
        all_permissions = set()
        role_permissions = {}

        if user_data['role_ids'] and user_data['role_ids'][0]:  # Check if user has roles
            roles_data = Database.execute_query("""
                SELECT id, name, permissions 
                FROM roles 
                WHERE id = ANY(%s)
            """, (user_data['role_ids'],))

            for role in roles_data:
                try:
                    permissions = json.loads(role['permissions']) if isinstance(role['permissions'], str) else role[
                        'permissions']
                    if permissions:
                        role_permissions[role['name']] = permissions
                        all_permissions.update(permissions)
                except (json.JSONDecodeError, TypeError):
                    continue

        return jsonify({
            'user': {
                'id': user_data['id'],
                'username': user_data['username'],
                'email': user_data['email'],
                'name': f"{user_data['first_name']} {user_data['last_name']}"
            },
            'roles': user_data['roles'] or [],
            'role_permissions': role_permissions,
            'effective_permissions': list(all_permissions),
            'has_admin_access': '*' in all_permissions or 'manage_system' in all_permissions
        }), 200

    except Exception as e:
        logger.error(f"Error getting user permissions: {e}")
        return jsonify({'error': 'Failed to retrieve user permissions'}), 500


@admin_bp.route('/permission-matrix', methods=['GET'])
@require_auth
@require_permissions(['view_roles'])
def get_permission_matrix():
    """Get permission matrix showing all roles and their permissions"""
    try:
        tenant_id = g.current_user['tenant_id']

        # Get all roles with permissions
        roles = Database.execute_query("""
            SELECT id, name, description, permissions, is_system,
                   COUNT(ur.user_id) as user_count
            FROM roles r
            LEFT JOIN user_roles ur ON r.id = ur.role_id
            WHERE r.tenant_id = %s
            GROUP BY r.id
            ORDER BY r.is_system DESC, r.name ASC
        """, (tenant_id,))

        # Process roles and permissions
        matrix_data = []
        all_permissions = set()

        for role in roles:
            permissions = []
            try:
                if role['permissions']:
                    permissions = json.loads(role['permissions']) if isinstance(role['permissions'], str) else role[
                        'permissions']
                    all_permissions.update(permissions)
            except (json.JSONDecodeError, TypeError):
                permissions = []

            matrix_data.append({
                'id': role['id'],
                'name': role['name'],
                'description': role['description'],
                'is_system': role['is_system'],
                'user_count': role['user_count'],
                'permissions': permissions
            })

        return jsonify({
            'roles': matrix_data,
            'all_permissions': sorted(list(all_permissions)),
            'total_roles': len(matrix_data)
        }), 200

    except Exception as e:
        logger.error(f"Error getting permission matrix: {e}")
        return jsonify({'error': 'Failed to retrieve permission matrix'}), 500


@admin_bp.route('/permission-usage', methods=['GET'])
@require_auth
@require_permissions(['view_system_health'])
def get_permission_usage():
    """Get usage statistics for permissions"""
    try:
        tenant_id = g.current_user['tenant_id']

        # Get permission usage across roles
        usage_stats = Database.execute_query("""
            SELECT 
                r.name as role_name,
                r.permissions,
                COUNT(ur.user_id) as user_count
            FROM roles r
            LEFT JOIN user_roles ur ON r.id = ur.role_id
            WHERE r.tenant_id = %s
            GROUP BY r.id, r.name, r.permissions
        """, (tenant_id,))

        # Analyze permission usage
        permission_counts = {}
        role_analysis = []

        for stat in usage_stats:
            try:
                permissions = json.loads(stat['permissions']) if isinstance(stat['permissions'], str) else stat[
                    'permissions']
                if permissions:
                    for perm in permissions:
                        permission_counts[perm] = permission_counts.get(perm, 0) + stat['user_count']

                role_analysis.append({
                    'role_name': stat['role_name'],
                    'user_count': stat['user_count'],
                    'permission_count': len(permissions) if permissions else 0
                })
            except (json.JSONDecodeError, TypeError):
                continue

        # Get users without roles
        users_without_roles = Database.execute_one("""
            SELECT COUNT(*) as count
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            WHERE u.tenant_id = %s AND ur.user_id IS NULL
        """, (tenant_id,))

        return jsonify({
            'permission_usage': permission_counts,
            'role_analysis': role_analysis,
            'users_without_roles': users_without_roles['count'],
            'most_used_permissions': sorted(permission_counts.items(), key=lambda x: x[1], reverse=True)[:10],
            'least_used_permissions': sorted(permission_counts.items(), key=lambda x: x[1])[:10]
        }), 200

    except Exception as e:
        logger.error(f"Error getting permission usage: {e}")
        return jsonify({'error': 'Failed to retrieve permission usage'}), 500


@admin_bp.route('/roles/<role_id>/users', methods=['GET'])
@require_auth
@require_permissions(['view_roles'])
def get_role_users(role_id):
    """Get all users assigned to a specific role"""
    try:
        if not validate_uuid(role_id):
            return jsonify({'error': 'Invalid role ID'}), 400

        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 20)), 100)
        offset = (page - 1) * limit

        # Check if role exists
        role = Database.execute_one("""
            SELECT id, name FROM roles 
            WHERE id = %s AND tenant_id = %s
        """, (role_id, tenant_id))

        if not role:
            return jsonify({'error': 'Role not found'}), 404

        # Get users with this role
        users = Database.execute_query("""
            SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                   u.is_active, u.last_login, ur.assigned_at,
                   ua.first_name || ' ' || ua.last_name as assigned_by_name
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN users ua ON ur.assigned_by = ua.id
            WHERE ur.role_id = %s AND u.tenant_id = %s
            ORDER BY ur.assigned_at DESC
            LIMIT %s OFFSET %s
        """, (role_id, tenant_id, limit, offset))

        # Get total count
        total = Database.execute_one("""
            SELECT COUNT(*) as count
            FROM users u
            JOIN user_roles ur ON u.id = ur.user_id
            WHERE ur.role_id = %s AND u.tenant_id = %s
        """, (role_id, tenant_id))

        return jsonify({
            'role': dict(role),
            'users': [dict(u) for u in users],
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting role users: {e}")
        return jsonify({'error': 'Failed to retrieve role users'}), 500


def get_all_valid_permissions():
    """Helper function to get all valid permissions in the system"""
    return [
        # Workflow Management
        'create_workflows', 'manage_workflows', 'execute_workflows', 'view_workflows', 'delete_workflows',

        # Task Management
        'execute_tasks', 'manage_tasks', 'view_tasks', 'assign_tasks', 'complete_tasks',

        # User Management
        'manage_users', 'view_users', 'create_users', 'delete_users', 'manage_user_roles',

        # Role Management
        'manage_roles', 'view_roles', 'create_roles', 'delete_roles', 'assign_permissions',

        # Form Management
        'create_forms', 'manage_forms', 'view_forms', 'view_form_responses', 'delete_forms',

        # Lookup Management
        'manage_lookups', 'view_lookups', 'view_all_lookups', 'manage_system_lookups',
        'import_lookups', 'export_lookups',

        # Reporting
        'view_reports', 'create_reports', 'export_reports', 'view_analytics', 'view_audit_logs',

        # System Administration
        'manage_system', 'view_system_health', 'manage_system_config', 'manage_integrations', 'manage_backups',

        # File Management
        'manage_files', 'view_all_files', 'upload_files', 'download_files', 'delete_files',

        # Automation
        'manage_automation', 'view_automation', 'execute_automation', 'test_automation', 'manage_webhooks',

        # SLA Management
        'manage_sla', 'view_sla', 'configure_sla', 'view_sla_breaches',

        # Special Permissions
        '*'  # Super admin permission
    ]


@admin_bp.route('/role-templates', methods=['GET'])
@require_auth
@require_permissions(['view_roles'])
def get_role_templates():
    """Get predefined role templates for quick role creation"""
    try:
        role_templates = {
            'admin': {
                'name': 'Administrator',
                'description': 'Full system administrator with all permissions',
                'permissions': ['*']
            },
            'manager': {
                'name': 'Manager',
                'description': 'Department manager with workflow and user management permissions',
                'permissions': [
                    'create_workflows', 'manage_workflows', 'execute_workflows', 'view_workflows',
                    'manage_tasks', 'view_tasks', 'assign_tasks',
                    'view_users', 'manage_user_roles',
                    'view_reports', 'create_reports', 'view_analytics'
                ]
            },
            'supervisor': {
                'name': 'Supervisor',
                'description': 'Team supervisor with task management and limited workflow permissions',
                'permissions': [
                    'execute_workflows', 'view_workflows',
                    'execute_tasks', 'manage_tasks', 'view_tasks', 'assign_tasks',
                    'view_reports'
                ]
            },
            'user': {
                'name': 'Standard User',
                'description': 'Regular user with basic workflow and task execution permissions',
                'permissions': [
                    'execute_workflows', 'view_workflows',
                    'execute_tasks', 'view_tasks',
                    'view_forms', 'upload_files'
                ]
            },
            'viewer': {
                'name': 'Viewer',
                'description': 'Read-only access to workflows and tasks',
                'permissions': [
                    'view_workflows', 'view_tasks', 'view_reports'
                ]
            },
            'form_admin': {
                'name': 'Form Administrator',
                'description': 'Manages forms and lookup tables',
                'permissions': [
                    'create_forms', 'manage_forms', 'view_forms', 'view_form_responses',
                    'manage_lookups', 'view_lookups', 'import_lookups', 'export_lookups'
                ]
            },
            'automation_admin': {
                'name': 'Automation Administrator',
                'description': 'Manages automation and integrations',
                'permissions': [
                    'manage_automation', 'view_automation', 'execute_automation', 'test_automation',
                    'manage_webhooks', 'manage_integrations'
                ]
            }
        }

        return jsonify({'templates': role_templates}), 200

    except Exception as e:
        logger.error(f"Error getting role templates: {e}")
        return jsonify({'error': 'Failed to retrieve role templates'}), 500


@admin_bp.route('/roles/create-from-template', methods=['POST'])
@require_auth
@require_permissions(['create_roles'])
@audit_log('create_role_from_template', 'role')
def create_role_from_template():
    """Create a new role from a predefined template"""
    try:
        data = sanitize_input(request.get_json())

        if not validate_required_fields(data, ['template_name', 'role_name']):
            return jsonify({'error': 'Template name and role name required'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        # Get role templates
        templates_response = get_role_templates()
        templates = json.loads(templates_response[0].data)['templates']

        template_name = data['template_name']
        if template_name not in templates:
            return jsonify({'error': 'Invalid template name'}), 400

        template = templates[template_name]

        # Check if role already exists
        existing = Database.execute_one("""
            SELECT id FROM roles 
            WHERE name = %s AND tenant_id = %s
        """, (data['role_name'], tenant_id))

        if existing:
            return jsonify({'error': 'Role with this name already exists'}), 409

        # Create role from template
        role_id = Database.execute_insert("""
            INSERT INTO roles 
            (tenant_id, name, description, permissions, created_by)
            VALUES (%s, %s, %s, %s, %s)
        """, (
            tenant_id,
            data['role_name'],
            data.get('description', template['description']),
            json.dumps(template['permissions']),
            user_id
        ))

        return jsonify({
            'message': 'Role created successfully from template',
            'role_id': role_id,
            'template_used': template_name
        }), 201

    except Exception as e:
        logger.error(f"Error creating role from template: {e}")
        return jsonify({'error': 'Failed to create role from template'}), 500


# app/blueprints/admin.py - Additional advanced permission endpoints

@admin_bp.route('/permissions/validate', methods=['POST'])
@require_auth
@require_permissions(['manage_roles'])
def validate_permissions():
    """Validate a set of permissions for conflicts and dependencies"""
    try:
        data = sanitize_input(request.get_json())

        if not validate_required_fields(data, ['permissions']):
            return jsonify({'error': 'Permissions array required'}), 400

        permissions = data['permissions']

        # Check dependencies
        missing_deps = PermissionService.check_permission_dependencies(permissions)

        # Check conflicts
        conflicts = PermissionService.validate_permission_conflicts(permissions)

        # Get suggestions
        suggestions = []
        if missing_deps:
            for perm, deps in missing_deps.items():
                suggestions.append(f"Add {', '.join(deps)} for {perm}")

        return jsonify({
            'valid': len(missing_deps) == 0 and len(conflicts) == 0,
            'missing_dependencies': missing_deps,
            'conflicts': conflicts,
            'suggestions': suggestions,
            'permission_count': len(permissions)
        }), 200

    except Exception as e:
        logger.error(f"Error validating permissions: {e}")
        return jsonify({'error': 'Failed to validate permissions'}), 500


@admin_bp.route('/permissions/<permission>/impact', methods=['GET'])
@require_auth
@require_permissions(['view_system_health'])
def get_permission_impact(permission):
    """Get impact analysis for a specific permission"""
    try:
        tenant_id = g.current_user['tenant_id']

        impact_analysis = PermissionService.get_permission_impact_analysis(tenant_id, permission)

        return jsonify(impact_analysis), 200

    except Exception as e:
        logger.error(f"Error getting permission impact: {e}")
        return jsonify({'error': 'Failed to get permission impact'}), 500


@admin_bp.route('/roles/bulk-update-permissions', methods=['POST'])
@require_auth
@require_permissions(['manage_roles'])
@audit_log('bulk_update_permissions', 'role')
def bulk_update_role_permissions():
    """Bulk update permissions for multiple roles"""
    try:
        data = sanitize_input(request.get_json())

        if not validate_required_fields(data, ['role_updates']):
            return jsonify({'error': 'Role updates array required'}), 400

        tenant_id = g.current_user['tenant_id']
        user_id = g.current_user['user_id']

        results = []
        errors = []

        for update in data['role_updates']:
            try:
                role_id = update.get('role_id')
                permissions = update.get('permissions', [])

                if not validate_uuid(role_id):
                    errors.append(f"Invalid role ID: {role_id}")
                    continue

                # Check if role exists and is not system role (unless super admin)
                role = Database.execute_one("""
                    SELECT id, name, is_system, permissions as old_permissions
                    FROM roles 
                    WHERE id = %s AND tenant_id = %s
                """, (role_id, tenant_id))

                if not role:
                    errors.append(f"Role not found: {role_id}")
                    continue

                if role['is_system'] and '*' not in g.current_user.get('permissions', []):
                    errors.append(f"Cannot modify system role: {role['name']}")
                    continue

                # Audit permission changes
                try:
                    old_permissions = json.loads(role['old_permissions']) if isinstance(role['old_permissions'],
                                                                                        str) else role[
                        'old_permissions']
                except (json.JSONDecodeError, TypeError):
                    old_permissions = []

                audit_result = PermissionService.audit_permission_changes(
                    user_id, role_id, old_permissions or [], permissions
                )

                # Update role permissions
                Database.execute_query("""
                    UPDATE roles 
                    SET permissions = %s, updated_at = NOW()
                    WHERE id = %s
                """, (json.dumps(permissions), role_id))

                results.append({
                    'role_id': role_id,
                    'role_name': role['name'],
                    'success': True,
                    'changes': audit_result
                })

            except Exception as role_error:
                errors.append(f"Error updating role {update.get('role_id', 'unknown')}: {str(role_error)}")

        return jsonify({
            'message': f'Bulk update completed. {len(results)} roles updated.',
            'results': results,
            'errors': errors,
            'total_processed': len(data['role_updates']),
            'successful': len(results),
            'failed': len(errors)
        }), 200

    except Exception as e:
        logger.error(f"Error in bulk permission update: {e}")
        return jsonify({'error': 'Failed to bulk update permissions'}), 500


@admin_bp.route('/permissions/hierarchy', methods=['GET'])
@require_auth
@require_permissions(['view_roles'])
def get_permission_hierarchy():
    """Get permission hierarchy showing relationships"""
    try:
        hierarchy = PermissionService.get_permission_hierarchy()

        return jsonify({
            'hierarchy': hierarchy,
            'total_levels': len(hierarchy)
        }), 200

    except Exception as e:
        logger.error(f"Error getting permission hierarchy: {e}")
        return jsonify({'error': 'Failed to get permission hierarchy'}), 500


@admin_bp.route('/roles/suggestions/<role_type>', methods=['GET'])
@require_auth
@require_permissions(['view_roles'])
def get_role_permission_suggestions(role_type):
    """Get permission suggestions for a role type"""
    try:
        suggestions = PermissionService.suggest_role_permissions(role_type)

        return jsonify({
            'role_type': role_type,
            'suggested_permissions': suggestions,
            'suggestion_count': len(suggestions)
        }), 200

    except Exception as e:
        logger.error(f"Error getting role suggestions: {e}")
        return jsonify({'error': 'Failed to get role suggestions'}), 500


@admin_bp.route('/users/<user_id>/permission-check', methods=['POST'])
@require_auth
@require_permissions(['view_users'])
def check_user_permissions(user_id):
    """Check if user has specific permissions"""
    try:
        if not validate_uuid(user_id):
            return jsonify({'error': 'Invalid user ID'}), 400

        data = sanitize_input(request.get_json())

        if not validate_required_fields(data, ['permissions_to_check']):
            return jsonify({'error': 'permissions_to_check array required'}), 400

        tenant_id = g.current_user['tenant_id']

        # Verify user exists in tenant
        user = Database.execute_one("""
            SELECT id, username FROM users 
            WHERE id = %s AND tenant_id = %s
        """, (user_id, tenant_id))

        if not user:
            return jsonify({'error': 'User not found'}), 404

        # Get user permissions
        user_permissions = PermissionService.get_user_permissions(user_id)

        # Check each requested permission
        permission_results = {}
        for perm in data['permissions_to_check']:
            has_permission = '*' in user_permissions or perm in user_permissions
            permission_results[perm] = {
                'has_permission': has_permission,
                'granted_by': 'super_admin' if '*' in user_permissions else 'specific' if has_permission else None
            }

        return jsonify({
            'user': dict(user),
            'permission_results': permission_results,
            'user_permissions': list(user_permissions),
            'has_super_admin': '*' in user_permissions
        }), 200

    except Exception as e:
        logger.error(f"Error checking user permissions: {e}")
        return jsonify({'error': 'Failed to check user permissions'}), 500


@admin_bp.route('/permissions/compare-roles', methods=['POST'])
@require_auth
@require_permissions(['view_roles'])
def compare_role_permissions():
    """Compare permissions between multiple roles"""
    try:
        data = sanitize_input(request.get_json())

        if not validate_required_fields(data, ['role_ids']):
            return jsonify({'error': 'role_ids array required'}), 400

        tenant_id = g.current_user['tenant_id']
        role_ids = data['role_ids']

        # Validate role IDs
        for role_id in role_ids:
            if not validate_uuid(role_id):
                return jsonify({'error': f'Invalid role ID: {role_id}'}), 400

        # Get roles with permissions
        roles_data = Database.execute_query("""
            SELECT id, name, description, permissions
            FROM roles 
            WHERE id = ANY(%s) AND tenant_id = %s
            ORDER BY name
        """, (role_ids, tenant_id))

        if len(roles_data) != len(role_ids):
            return jsonify({'error': 'One or more roles not found'}), 404

        # Process role permissions
        role_permissions = {}
        all_permissions = set()

        for role in roles_data:
            try:
                permissions = json.loads(role['permissions']) if isinstance(role['permissions'], str) else role[
                    'permissions']
                permissions = permissions or []
                role_permissions[role['id']] = {
                    'name': role['name'],
                    'description': role['description'],
                    'permissions': permissions
                }
                all_permissions.update(permissions)
            except (json.JSONDecodeError, TypeError):
                role_permissions[role['id']] = {
                    'name': role['name'],
                    'description': role['description'],
                    'permissions': []
                }

        # Create comparison matrix
        comparison_matrix = {}
        for permission in sorted(all_permissions):
            comparison_matrix[permission] = {}
            for role_id, role_data in role_permissions.items():
                has_permission = permission in role_data['permissions'] or '*' in role_data['permissions']
                comparison_matrix[permission][role_id] = has_permission

        # Find common and unique permissions
        permission_sets = [set(role_data['permissions']) for role_data in role_permissions.values()]
        common_permissions = list(set.intersection(*permission_sets) if permission_sets else set())

        unique_permissions = {}
        for role_id, role_data in role_permissions.items():
            role_perms = set(role_data['permissions'])
            other_perms = set()
            for other_id, other_data in role_permissions.items():
                if other_id != role_id:
                    other_perms.update(other_data['permissions'])
            unique_permissions[role_id] = list(role_perms - other_perms)

        return jsonify({
            'roles': role_permissions,
            'comparison_matrix': comparison_matrix,
            'common_permissions': common_permissions,
            'unique_permissions': unique_permissions,
            'total_permissions': len(all_permissions),
            'comparison_summary': {
                'total_roles_compared': len(role_ids),
                'common_permission_count': len(common_permissions),
                'total_unique_permissions': sum(len(perms) for perms in unique_permissions.values())
            }
        }), 200

    except Exception as e:
        logger.error(f"Error comparing role permissions: {e}")
        return jsonify({'error': 'Failed to compare role permissions'}), 500


@admin_bp.route('/permissions/audit-trail', methods=['GET'])
@require_auth
@require_permissions(['view_audit_logs'])
def get_permission_audit_trail():
    """Get audit trail for permission changes"""
    try:
        tenant_id = g.current_user['tenant_id']
        page = int(request.args.get('page', 1))
        limit = min(int(request.args.get('limit', 50)), 100)
        offset = (page - 1) * limit

        # Filters
        role_id = request.args.get('role_id')
        user_id = request.args.get('user_id')
        action_filter = request.args.get('action')
        date_from = request.args.get('date_from')
        date_to = request.args.get('date_to')

        # Build query conditions
        where_conditions = ["al.tenant_id = %s"]
        params = [tenant_id]

        # Filter for permission-related actions
        permission_actions = [
            'update_permissions', 'create_role', 'delete_role',
            'assign_role', 'remove_role', 'bulk_update_permissions'
        ]

        where_conditions.append("al.action = ANY(%s)")
        params.append(permission_actions)

        if role_id:
            where_conditions.append("al.resource_id = %s")
            params.append(role_id)

        if user_id:
            where_conditions.append("al.user_id = %s")
            params.append(user_id)

        if action_filter and action_filter in permission_actions:
            where_conditions.append("al.action = %s")
            params.append(action_filter)

        if date_from:
            where_conditions.append("al.created_at >= %s")
            params.append(date_from)

        if date_to:
            where_conditions.append("al.created_at <= %s")
            params.append(date_to)

        where_clause = "WHERE " + " AND ".join(where_conditions)

        # Get audit logs
        audit_logs = Database.execute_query(f"""
            SELECT al.*, u.username, u.first_name, u.last_name,
                   r.name as role_name
            FROM audit_logs al
            LEFT JOIN users u ON al.user_id = u.id
            LEFT JOIN roles r ON al.resource_id = r.id AND al.resource_type = 'role'
            {where_clause}
            ORDER BY al.created_at DESC
            LIMIT %s OFFSET %s
        """, params + [limit, offset])

        # Get total count
        total = Database.execute_one(f"""
            SELECT COUNT(*) as count 
            FROM audit_logs al
            {where_clause}
        """, params)

        # Process audit logs
        processed_logs = []
        for log in audit_logs:
            log_dict = dict(log)

            # Parse old and new values
            try:
                if log_dict.get('old_values'):
                    log_dict['old_values'] = json.loads(log_dict['old_values'])
                if log_dict.get('new_values'):
                    log_dict['new_values'] = json.loads(log_dict['new_values'])
            except (json.JSONDecodeError, TypeError):
                pass

            processed_logs.append(log_dict)

        return jsonify({
            'audit_logs': processed_logs,
            'pagination': {
                'page': page,
                'limit': limit,
                'total': total['count'],
                'pages': (total['count'] + limit - 1) // limit
            },
            'filters_applied': {
                'role_id': role_id,
                'user_id': user_id,
                'action': action_filter,
                'date_from': date_from,
                'date_to': date_to
            }
        }), 200

    except Exception as e:
        logger.error(f"Error getting permission audit trail: {e}")
        return jsonify({'error': 'Failed to get permission audit trail'}), 500