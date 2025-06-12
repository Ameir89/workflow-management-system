### app/blueprints/auth.py

"""
Authentication blueprint - handles login, registration, 2FA
"""
from flask import Blueprint, g, request, jsonify, current_app
from app.utils.auth import AuthUtils
from app.utils.security import validate_email, validate_password_strength, sanitize_input
from app.utils.validators import validate_required_fields
from app.database import Database
from app.middleware import require_auth
import io
import base64
import logging

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
    """User login endpoint"""
    try:
        # data = sanitize_input(request.get_json())
        data = getattr(g, 'sanitized_json', None) or request.get_json()
        if not validate_required_fields(data, ['username', 'password']):
            return jsonify({'error': 'Username and password required'}), 400
        
        # Get user with roles and permissions
        user = Database.execute_one("""
            SELECT u.id, u.tenant_id, u.username, u.email, u.password_hash, 
                   u.first_name, u.last_name, u.is_active, u.is_verified,
                   u.two_fa_enabled, u.two_fa_secret, u.failed_login_attempts,
                   u.locked_until,
                   ARRAY_AGG(DISTINCT r.name) as roles,
                   ARRAY_AGG(DISTINCT p.permission) as permissions
            FROM users u
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            LEFT JOIN LATERAL jsonb_array_elements_text(r.permissions) p(permission) ON true
            WHERE u.username = %s OR u.email = %s
            GROUP BY u.id
        """, (data['username'], data['username']))
        
        # if not user or not AuthUtils.verify_password(data['password'], user['password_hash']):
        #     return jsonify({'error': 'Invalid credentials'}), 401
        
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
        
        # Reset failed attempts on successful login
        AuthUtils.reset_failed_attempts(user['id'])
        
        # Generate tokens
        user_data = {
            'id': user['id'],
            'tenant_id': user['tenant_id'],
            'username': user['username'],
            'email': user['email'],
            'first_name': user['first_name'],
            'last_name': user['last_name'],
            'roles': user['roles'] or [],
            'permissions': user['permissions'] or []
        }
        
        access_token = AuthUtils.generate_jwt_token(user_data, 'access')
        refresh_token = AuthUtils.generate_jwt_token(user_data, 'refresh')
        
        # Create session
        AuthUtils.create_session(
            user['id'], access_token, 
            request.remote_addr, request.headers.get('User-Agent')
        )
        
        return jsonify({
            'access_token': access_token,
            'refresh_token': refresh_token,
            'user': user_data
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {e}")
        logger.exception("Login error: {e}")
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
        
        return jsonify({'message': 'Logged out successfully'}), 200
        
    except Exception as e:
        logger.error(f"Logout error: {e}")
        return jsonify({'error': 'Logout failed'}), 500

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
        
        # Generate new access token
        access_token = AuthUtils.generate_jwt_token(user_data, 'access')
        
        return jsonify({'access_token': access_token}), 200
        
    except Exception as e:
        logger.error(f"Token refresh error: {e}")
        return jsonify({'error': 'Token refresh failed'}), 500

@auth_bp.route('/profile', methods=['GET'])
@require_auth
def get_profile():
    """Get user profile"""
    try:
        user_id = g.current_user['user_id']
        
        user = Database.execute_one("""
            SELECT u.id, u.username, u.email, u.first_name, u.last_name,
                   u.phone, u.two_fa_enabled, u.created_at, u.last_login,
                   t.name as tenant_name,
                   ARRAY_AGG(DISTINCT r.name) as roles
            FROM users u
            JOIN tenants t ON u.tenant_id = t.id
            LEFT JOIN user_roles ur ON u.id = ur.user_id
            LEFT JOIN roles r ON ur.role_id = r.id
            WHERE u.id = %s
            GROUP BY u.id, t.name
        """, (user_id,))
        
        if not user:
            return jsonify({'error': 'User not found'}), 404
        
        return jsonify({'user': dict(user)}), 200
        
    except Exception as e:
        logger.error(f"Profile retrieval error: {e}")
        return jsonify({'error': 'Failed to retrieve profile'}), 500