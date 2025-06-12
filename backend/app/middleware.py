### app/middleware.py
"""
Application middleware for security, logging, and request processing
"""
from flask import request, jsonify, g, current_app
from functools import wraps
import time
import uuid
import logging
from app.utils.auth import verify_jwt_token
from app.utils.security import sanitize_input, check_rate_limit
from app.services.audit_logger import AuditLogger

logger = logging.getLogger(__name__)

def setup_middleware(app):
    """Setup application middleware"""
    
    @app.before_request
    def before_request():
        """Execute before each request"""
        # Generate request ID
        g.request_id = str(uuid.uuid4())
        g.start_time = time.time()
        
        # Log request
        logger.info(f"Request {g.request_id}: {request.method} {request.path}")
        
        # Rate limiting
        if not check_rate_limit(request.remote_addr):
            return jsonify({'error': 'Rate limit exceeded'}), 429
        
        # # Sanitize input data
        # if request.is_json and request.get_json():
        #     sanitized_data = sanitize_input(request.get_json())
        #     request._cached_json = sanitized_data
        if request.is_json:
            raw_json = request.get_json(silent=True)
            if raw_json:
                g.sanitized_json = sanitize_input(raw_json)

    # Add security headers
    @app.after_request
    def after_request(response):
        """Execute after each request"""
        # Security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['X-Request-ID'] = g.request_id

        # Log response
        duration = time.time() - g.start_time
        logger.info(f"Response {g.request_id}: {response.status_code} ({duration:.3f}s)")

        return response



def require_auth(f):
    """Decorator to require authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            return jsonify({'error': 'Missing or invalid authorization header'}), 401
        
        token = auth_header.split(' ')[1]
        user_data = verify_jwt_token(token)
        # logger.error(user_data)
        if not user_data:
            return jsonify({'error': 'Invalid or expired token'}), 401
        
        g.current_user = user_data
        return f(*args, **kwargs)
    
    return decorated_function

def require_permissions(permissions):
    """Decorator to require specific permissions"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401
            
            user_permissions = g.current_user.get('permissions', [])
            if '*' not in user_permissions:
                for permission in permissions:
                    if permission not in user_permissions:
                        return jsonify({'error': f'Permission required: {permission}'}), 403
            
            return f(*args, **kwargs)
        return decorated_function
    return decorator

def audit_log(action, resource_type):
    """Decorator to log actions for audit trail"""
    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Execute the function
            result = f(*args, **kwargs)
            
            # Log the action
            if current_app.config.get('ENABLE_AUDIT_LOG'):
                user_id = g.current_user.get('user_id') if hasattr(g, 'current_user') else None
                resource_id = kwargs.get('id') or request.view_args.get('id')
                
                AuditLogger.log_action(
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    ip_address=request.remote_addr,
                    user_agent=request.headers.get('User-Agent')
                )
            
            return result
        return decorated_function
    return decorator