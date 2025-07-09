# app/blueprints/auth.py - Enhanced with better error handling and permissions
"""
Authentication blueprint - handles login, registration, 2FA with enhanced permissions
"""
from flask import Blueprint, g, request, jsonify, current_app
from app.utils.auth import AuthUtils
from app.utils.security import validate_email, validate_password_strength, sanitize_input
from app.utils.validators import validate_required_fields
from app.database import Database
from app.middleware import require_auth
from app.services.permission_service import PermissionService
import io
import base64
import logging
import json

logger = logging.getLogger(__name__)

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """User registration endpoint"""
    try:
        data = sanitize_input(request.get_json())
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name']
        if not validate_required_fields(data, required_fields):
            return jsonify({'error': 'Missing required fields'}), 400
        
        # Validate email format
        if not validate_email(data['email']):
            return jsonify({'error': 'Invalid email format'}), 400
        
        # Validate password strength
        is_strong, message = validate_password_strength(data['password'])
        if not is_strong:
            return jsonify({'error': message}), 400
        
        # Check if user already exists
        existing_user = Database.execute_one(
            "SELECT id FROM users WHERE email = %s OR username = %s",
            (data['email'], data['username'])
        )
        if existing_user:
            return jsonify({'error': 'User already exists'}), 409
        
        # Get default tenant
        tenant = Database.execute_one(
            "SELECT id FROM tenants WHERE subdomain = 'default'"
        )
        
        # Hash password
        password_hash = AuthUtils.hash_password(data['password'])
        
        # Create user
        user_id = Database.execute_insert("""
            INSERT INTO users (tenant_id, username, email, password_hash, first_name, last_name)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (
            tenant['id'], data['username'], data['email'], 
            password_hash, data['first_name'], data['last_name']
        ))
        
        # Assign default user role
        default_role = Database.execute_one(
            "SELECT id FROM roles WHERE name = 'User' AND tenant_id = %s",
            (tenant['id'],)
        )
        if default_role:
            Database.execute_query(
                "INSERT INTO user_roles (user_id, role_id) VALUES (%s, %s)",
                (user_id, default_role['id'])
            )
        
        return jsonify({
            'message': 'User registered successfully',
            'user_id': user_id
        }), 201
        
    except Exception as e:
        logger.error(f"Registration error: {e}")
        return jsonify({'error': 'Registration failed'}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Enhanced user login endpoint with full permission loading"""
    try:
        data = getattr(g, 'sanitized_json', None) or request.get_json()
        if not validate_required_fields(data, ['username', 'password']):
            return jsonify({'error': 'Username and password required'}), 400
        
        # Get user with roles and permissions
        user = Database.execute_one("""
            SELECT u.id, u.tenant_id, u.username, u.email, u.password_hash, 
                   u.first_name, u.last_name, u.is_active, u.is_verified,
                   u.two_fa_enabled, u.two_fa_secret, u.failed_login_attempts,
                   u.locked_until
            FROM users u
            WHERE u.username = %s OR u.email = %s
        """, (data['username'], data['username']))
        
        if not user or not AuthUtils.verify_password(data['password'], user['password_hash']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        # Check if account is locked
        if AuthUtils.check_account_locked(user['id']):
            return jsonify({'error': 'Account is locked due to too many failed attempts'}), 423
        
        # Check if account is active
        if not user['is_active']:
            return jsonify({'error': 'Account is disabled'}), 403
        
        # Check 2FA if enabled
        if user['two_fa_enabled']:
            two_fa_token = data.get('two_fa_token')
            if not two_fa_token:
                return jsonify({'requires_2fa': True}), 200
            
            if not AuthUtils.verify_2fa_token(user['two_fa_secret'], two_fa_token):
                AuthUtils.increment_failed_attempts(user['id'])
                return jsonify({'error': 'Invalid 2FA token'}), 401
        
        # Get user roles and permissions
        user_roles = Database.execute_query("""
            SELECT r.name, r.permissions
            FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = %s AND r.is_active = true
        """, (user['id'],))
        
        # Aggregate permissions from all roles
        all_permissions = set()
        roles = []
        
        for role in user_roles:
            roles.append(role['name'])
            if role['permissions']:
                try:
                    permissions = json.loads(role['permissions']) if isinstance(role['permissions'], str) else role['permissions']
                    if permissions:
                        all_permissions.update(permissions)
                except (json.JSONDecodeError, TypeError):
                    continue
        
        # Reset failed attempts on successful login
        AuthUtils.reset_failed_attempts(user['id'])
        
        # Prepare user data for token
        user_data = {
            'id': user['id'],
            'tenant_id': user['tenant_id'],
            'username': user['username'],
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'roles': roles,
            'permissions': list(all_permissions)
        }
        
        # Generate tokens
        access_token = AuthUtils.generate_jwt_token(user_data, 'access')
        refresh_token = AuthUtils.generate_jwt_token(user_data, 'refresh')
        
        # Create session
        AuthUtils.create_session(
            user['id'], access_token, 
            request.remote_addr, request.headers.get('User-Agent')
        )
        
        logger.info(f"User {user['username']} logged in successfully")
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user_data
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {e}", exc_info=True)
        return jsonify({'error': 'Login failed'}), 500

@auth_bp.route('/logout', methods=['POST'])
@require_auth
def logout():
    """User logout endpoint"""
    try:
        auth_header = request.headers.get('Authorization')
        token = auth_header.split(' ')[1]
        
        # Revoke session
        AuthUtils.revoke_session(g.current_user['user_id'], token)
        
        logger.info(f"User {g.current_user['username']} logged out")
        
        return jsonify({'message': 'Logged out successfully'}), 200
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'error': 'Logout failed'}), 500

@auth_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    """Enhanced user profile endpoint with full permissions and roles"""
    try:
        user_id = g.current_user['user_id']
        
        # Get user details with tenant info
        user = Database.execute_one("""
            SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                   u.phone, u.two_fa_enabled, u.created_at, u.last_login,
                   u.is_active, u.is_verified, u.department, 
                   t.name as tenant_name, t.subdomain as tenant_subdomain
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            WHERE u.id = %s
        """, (user_id,))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        # Get user roles with details
        user_roles = Database.execute_query("""
            SELECT r.id, r.name, r.description, r.permissions, r.is_system
            FROM roles r
            JOIN user_roles ur ON r.id = ur.role_id
            WHERE ur.user_id = %s AND r.is_active = true
            ORDER BY r.name
        """, (user_id,))
        
        # Process roles and permissions
        roles = []
        all_permissions = set()
        
        for role in user_roles:
            role_data = {
                'id': role['id'],
                'name': role['name'],
                'description': role['description'],
                'is_system': role['is_system']
            }
            
            # Parse permissions
            if role['permissions']:
                try:
                    permissions = json.loads(role['permissions']) if isinstance(role['permissions'], str) else role['permissions']
                    if permissions:
                        role_data['permissions'] = permissions
                        all_permissions.update(permissions)
                except (json.JSONDecodeError, TypeError):
                    role_data['permissions'] = []
            else:
                role_data['permissions'] = []
            
            roles.append(role_data)
        
        # Get recent activity (optional)
        recent_activities = Database.execute_query("""
            SELECT action, resource_type, created_at
            FROM audit_logs
            WHERE user_id = %s
            ORDER BY created_at DESC
            LIMIT 5
        """, (user_id,))
        
        # Get active sessions count
        active_sessions = Database.execute_one("""
            SELECT COUNT(*) as session_count
            FROM user_sessions
            WHERE user_id = %s AND expires_at > NOW()
        """, (user_id,))
        
        # Build enhanced profile response
        profile_data = {
            'user': {
                'id': user['id'],
                'username': user['username'],
                'email': user['email'],
                'first_name': user['first_name'],
                'last_name': user['last_name'],
                'phone': user['phone'],
                'department': user['department'],
                # 'job_title': user['job_title'],
                'is_active': user['is_active'],
                'is_verified': user['is_verified'],
                'two_fa_enabled': user['two_fa_enabled'],
                'created_at': user['created_at'].isoformat() if user['created_at'] else None,
                'last_login': user['last_login'].isoformat() if user['last_login'] else None
            },
            'tenant': {
                'name': user['tenant_name'],
                'subdomain': user['tenant_subdomain']
            },
            'roles': roles,
            'permissions': list(all_permissions),
            'has_super_admin': '*' in all_permissions,
            'security': {
                'two_fa_enabled': user['two_fa_enabled'],
                'active_sessions': active_sessions['session_count'] if active_sessions else 0
            },
            'recent_activities': [
                {
                    'action': activity['action'],
                    'resource_type': activity['resource_type'],
                    'timestamp': activity['created_at'].isoformat() if activity['created_at'] else None
                }
                for activity in recent_activities
            ] if recent_activities else []
        }
        
        logger.debug(f"Profile retrieved for user {user['username']}")
        
        return jsonify(profile_data), 200
        
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}", exc_info=True)
        return jsonify({'error': 'Failed to retrieve profile'}), 500

@auth_bp.route('/permissions', methods=['GET'])
@require_auth
def get_user_permissions():
    """Get current user's permissions"""
    try:
        user_id = g.current_user['user_id']
        
        # Get fresh permissions from database
        permissions = PermissionService.get_user_permissions(user_id)
        
        # Get permission hierarchy for context
        permission_hierarchy = PermissionService.get_permission_hierarchy()
        
        return jsonify({
            'permissions': list(permissions),
            'has_super_admin': '*' in permissions,
            'permission_hierarchy': permission_hierarchy
        }), 200
        
    except Exception as e:
        logger.error(f"Error getting user permissions: {e}")
        return jsonify({'error': 'Failed to retrieve permissions'}), 500

@auth_bp.route('/validate-token', methods=['POST'])
def validate_token():
    """Validate JWT token endpoint for client-side validation"""
    try:
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'valid': False, 'error': 'Missing or invalid authorization header'}), 400

        token = auth_header.split(' ')[1]
        user_data = AuthUtils.verify_jwt_token(token)

        if not user_data:
            return jsonify({'valid': False, 'error': 'Invalid or expired token'}), 401

        # Get fresh user permissions
        try:
            user_permissions = PermissionService.get_user_permissions(user_data['user_id'])
            user_data['permissions'] = list(user_permissions)
            user_data['has_super_admin'] = '*' in user_permissions
        except Exception as e:
            logger.error(f"Error getting user permissions during validation: {e}")
            user_data['permissions'] = []
            user_data['has_super_admin'] = False

        return jsonify({
            'valid': True,
            'user': {
                'user_id': user_data['user_id'],
                'username': user_data['username'],
                'email': user_data['email'],
                'tenant_id': user_data['tenant_id'],
                'permissions': user_data['permissions'],
                'has_super_admin': user_data['has_super_admin']
            }
        }), 200
        
    except Exception as e:
        logger.error(f"Token validation error: {e}")
        return jsonify({'valid': False, 'error': 'Token validation failed'}), 500

# Keep all other existing endpoints...
@auth_bp.route('/setup-2fa', methods=['POST'])
@require_auth
def setup_2fa():
    """Setup 2FA for user"""
    try:
        user_id = g.current_user['user_id']
        
        # Generate 2FA secret
        secret = AuthUtils.generate_2fa_secret()
        
        # Update user with secret
        Database.execute_query(
            "UPDATE users SET two_fa_secret = %s WHERE id = %s",
            (secret, user_id)
        )
        
        # Generate QR code
        email = g.current_user['email']
        qr_image = AuthUtils.generate_qr_code(secret, email)
        
        # Convert QR code to base64
        img_buffer = io.BytesIO()
        qr_image.save(img_buffer, format='PNG')
        img_str = base64.b64encode(img_buffer.getvalue()).decode()
        
        return jsonify({
            'secret': secret,
            'qr_code': f"data:image/png;base64,{img_str}"
        }), 200
        
    except Exception as e:
        logger.error(f"2FA setup error: {e}")
        return jsonify({'error': '2FA setup failed'}), 500

@auth_bp.route('/verify-2fa', methods=['POST'])
@require_auth
def verify_2fa():
    """Verify and enable 2FA"""
    try:
        data = sanitize_input(request.get_json())
        
        if not validate_required_fields(data, ['token']):
            return jsonify({'error': 'Token required'}), 400
        
        user_id = g.current_user['user_id']
        
        # Get user's 2FA secret
        user = Database.execute_one(
            "SELECT two_fa_secret FROM users WHERE id = %s",
            (user_id,)
        )
        
        if not user or not user['two_fa_secret']:
            return jsonify({'error': '2FA not set up'}), 400
        
        # Verify token
        if not AuthUtils.verify_2fa_token(user['two_fa_secret'], data['token']):
            return jsonify({'error': 'Invalid token'}), 401
        
        # Enable 2FA
        Database.execute_query(
            "UPDATE users SET two_fa_enabled = true WHERE id = %s",
            (user_id,)
        )
        
        return jsonify({'message': '2FA enabled successfully'}), 200
        
    except Exception as e:
        logger.error(f"2FA verification error: {e}")
        return jsonify({'error': '2FA verification failed'}), 500

@auth_bp.route('/refresh', methods=['POST'])
def refresh_token():
    """Refresh access token"""
    try:
        data = request.get_json()
        refresh_token = data.get('refresh_token')
        
        if not refresh_token:
            return jsonify({'error': 'Refresh token required'}), 400
        
        # Verify refresh token
        user_data = AuthUtils.verify_jwt_token(refresh_token)
        if not user_data or user_data.get('type') != 'refresh':
            return jsonify({'error': 'Invalid refresh token'}), 401
        
        # Get fresh user data with current permissions
        user = Database.execute_one("""
            SELECT u.id, u.tenant_id, u.username, u.email, 
                   u.first_name, u.last_name, u.is_active
            FROM users u
            WHERE u.id = %s AND u.is_active = true
        """, (user_data['user_id'],))
        
        if not user:
            return jsonify({'error': 'User not found or inactive'}), 401
        
        # Get fresh permissions
        permissions = PermissionService.get_user_permissions(user['id'])
        
        # Update user data
        user_data.update({
            'permissions': list(permissions),
            'first_name': user['first_name'],
            'last_name': user['last_name']
        })
        
        # Generate new access token
        access_token = AuthUtils.generate_jwt_token(user_data, 'access')
        
        return jsonify({'access_token': access_token}), 200
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({'error': 'Token refresh failed'}), 500