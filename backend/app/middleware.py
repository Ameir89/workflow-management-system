# app/middleware.py - Enhanced with advanced permission checking

from flask import request, jsonify, g, current_app
from functools import wraps
import time
import uuid
import logging
from app.utils.auth import verify_jwt_token
from app.utils.security import sanitize_input, check_rate_limit
from app.services.audit_logger import AuditLogger
from app.services.permission_service import PermissionService

logger = logging.getLogger(__name__)


def setup_middleware(app):
    """Setup application middleware with enhanced permission checking"""

    @app.before_request
    def before_request():
        """Execute before each request with enhanced security"""
        # Generate request ID
        g.request_id = str(uuid.uuid4())
        g.start_time = time.time()

        # Log request with more details
        logger.info(f"Request {g.request_id}: {request.method} {request.path} from {request.remote_addr}")

        # Rate limiting with enhanced tracking
        if not check_rate_limit(request.remote_addr):
            logger.warning(f"Rate limit exceeded for IP: {request.remote_addr}")
            return jsonify({'error': 'Rate limit exceeded', 'retry_after': 60}), 429

        # Enhanced input sanitization
        if request.is_json:
            raw_json = request.get_json(silent=True)
            if raw_json:
                g.sanitized_json = sanitize_input(raw_json)

        # Security headers and CSRF protection for state-changing requests
        if request.method in ['POST', 'PUT', 'DELETE', 'PATCH']:
            # Add CSRF token validation for web requests
            if request.headers.get('Content-Type', '').startswith('application/json'):
                # For API requests, validate origin
                origin = request.headers.get('Origin')
                if origin and origin not in current_app.config.get('ALLOWED_ORIGINS', []):
                    logger.warning(f"Invalid origin: {origin}")
                    return jsonify({'error': 'Invalid origin'}), 403

    @app.after_request
    def after_request(response):
        """Execute after each request with enhanced logging"""
        # Enhanced security headers
        response.headers['X-Content-Type-Options'] = 'nosniff'
        response.headers['X-Frame-Options'] = 'DENY'
        response.headers['X-XSS-Protection'] = '1; mode=block'
        response.headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains'
        response.headers['Content-Security-Policy'] = "default-src 'self'"
        response.headers['X-Request-ID'] = g.request_id
        response.headers['X-API-Version'] = '1.0'

        # Enhanced response logging
        duration = time.time() - g.start_time
        user_info = ""
        if hasattr(g, 'current_user'):
            user_info = f" User: {g.current_user.get('username', 'unknown')}"

        logger.info(f"Response {g.request_id}: {response.status_code} ({duration:.3f}s){user_info}")

        # Log slow requests
        if duration > 2.0:
            logger.warning(f"Slow request {g.request_id}: {request.method} {request.path} took {duration:.3f}s")

        return response


def require_auth(f):
    """Enhanced authentication decorator with session validation"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        auth_header = request.headers.get('Authorization')
        if not auth_header or not auth_header.startswith('Bearer '):
            logger.warning(f"Missing auth header for {request.path}")
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]
        user_data = verify_jwt_token(token)

        if not user_data:
            logger.warning(f"Invalid token for {request.path}")
            return jsonify({'error': 'Invalid or expired token'}), 401

        # Enhanced user data with real-time permissions
        try:
            user_permissions = PermissionService.get_user_permissions(user_data['user_id'])
            user_data['permissions'] = list(user_permissions)
            user_data['has_super_admin'] = '*' in user_permissions
        except Exception as e:
            logger.error(f"Error getting user permissions: {e}")
            user_data['permissions'] = []
            user_data['has_super_admin'] = False

        g.current_user = user_data

        # Log authentication success
        logger.debug(f"Authenticated user {user_data['username']} for {request.path}")

        return f(*args, **kwargs)

    return decorated_function


def require_permissions(permissions, require_all=True):
    """Enhanced permission decorator with detailed checking and logging"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                logger.error(f"Authentication required for {request.path}")
                return jsonify({'error': 'Authentication required'}), 401

            user_permissions = g.current_user.get('permissions', [])
            user_id = g.current_user.get('user_id')

            # Super admin bypass
            if '*' in user_permissions:
                logger.debug(f"Super admin access granted for {request.path}")
                return f(*args, **kwargs)

            # Check required permissions
            if isinstance(permissions, str):
                permissions_list = [permissions]
            else:
                permissions_list = permissions

            missing_permissions = []
            granted_permissions = []

            for permission in permissions_list:
                if permission in user_permissions:
                    granted_permissions.append(permission)
                else:
                    missing_permissions.append(permission)

            # Determine if access should be granted
            if require_all:
                access_granted = len(missing_permissions) == 0
            else:
                access_granted = len(granted_permissions) > 0

            if not access_granted:
                logger.warning(f"Permission denied for user {user_id} on {request.path}. "
                               f"Required: {permissions_list}, Missing: {missing_permissions}")

                return jsonify({
                    'error': 'Insufficient permissions',
                    'required_permissions': permissions_list,
                    'missing_permissions': missing_permissions
                }), 403

            # Log successful permission check
            logger.debug(f"Permission granted for user {user_id} on {request.path}. "
                         f"Granted: {granted_permissions}")

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_any_permission(permissions):
    """Require ANY of the specified permissions (not all)"""
    return require_permissions(permissions, require_all=False)


def require_role(roles):
    """Require specific role(s)"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401

            user_roles = g.current_user.get('roles', [])

            if isinstance(roles, str):
                required_roles = [roles]
            else:
                required_roles = roles

            # Check if user has any of the required roles
            has_required_role = any(role in user_roles for role in required_roles)

            if not has_required_role:
                logger.warning(f"Role access denied for user {g.current_user.get('user_id')} "
                               f"on {request.path}. Required roles: {required_roles}, "
                               f"User roles: {user_roles}")

                return jsonify({
                    'error': 'Insufficient role privileges',
                    'required_roles': required_roles,
                    'user_roles': user_roles
                }), 403

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def audit_log(action, resource_type, include_request_data=True):
    """Enhanced audit logging decorator with request data"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Capture request data before execution
            request_data = None
            if include_request_data and request.is_json:
                request_data = getattr(g, 'sanitized_json', None) or request.get_json(silent=True)

            # Execute the function
            start_time = time.time()
            try:
                result = f(*args, **kwargs)
                execution_time = time.time() - start_time

                # Log successful action
                if current_app.config.get('ENABLE_AUDIT_LOG'):
                    user_id = g.current_user.get('user_id') if hasattr(g, 'current_user') else None
                    resource_id = kwargs.get('id') or request.view_args.get('id') or kwargs.get(
                        'task_id') or kwargs.get('workflow_id')

                    # Enhanced audit data
                    audit_data = {
                        'request_method': request.method,
                        'request_path': request.path,
                        'execution_time': execution_time,
                        'request_id': getattr(g, 'request_id', None),
                        'user_agent': request.headers.get('User-Agent'),
                        'request_data': request_data
                    }

                    AuditLogger.log_action(
                        user_id=user_id,
                        action=action,
                        resource_type=resource_type,
                        resource_id=resource_id,
                        ip_address=request.remote_addr,
                        user_agent=request.headers.get('User-Agent'),
                        new_values=audit_data
                    )

                return result

            except Exception as e:
                execution_time = time.time() - start_time

                # Log failed action
                if current_app.config.get('ENABLE_AUDIT_LOG'):
                    user_id = g.current_user.get('user_id') if hasattr(g, 'current_user') else None

                    error_data = {
                        'error': str(e),
                        'execution_time': execution_time,
                        'request_method': request.method,
                        'request_path': request.path,
                        'request_id': getattr(g, 'request_id', None)
                    }

                    AuditLogger.log_action(
                        user_id=user_id,
                        action=f"{action}_failed",
                        resource_type=resource_type,
                        resource_id=None,
                        ip_address=request.remote_addr,
                        user_agent=request.headers.get('User-Agent'),
                        new_values=error_data
                    )

                raise  # Re-raise the exception

        return decorated_function

    return decorator


def require_tenant_access(f):
    """Ensure user can only access resources from their tenant"""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not hasattr(g, 'current_user'):
            return jsonify({'error': 'Authentication required'}), 401

        # This decorator should be used in conjunction with resource-specific checks
        # The actual tenant validation should happen in the route handlers
        return f(*args, **kwargs)

    return decorated_function


# Temporary in-memory store for tracking requests per user
user_request_log = {}


def rate_limit_by_user(requests_per_minute=60):
    """Rate limiting by authenticated user (in-memory placeholder)"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user') or not g.current_user:
                return jsonify({'error': 'Authentication required'}), 401

            user_id = g.current_user.get('user_id')
            if not user_id:
                return jsonify({'error': 'Invalid user session'}), 403

            now = time.time()
            window_start = now - 60

            # Clean old timestamps
            request_times = user_request_log.get(user_id, [])
            request_times = [t for t in request_times if t > window_start]

            if len(request_times) >= requests_per_minute:
                return jsonify({'error': 'Rate limit exceeded'}), 429

            request_times.append(now)
            user_request_log[user_id] = request_times

            return f(*args, **kwargs)

        return decorated_function

    return decorator
# def rate_limit_by_user(requests_per_minute=60):
#     """Rate limiting by authenticated user"""
#
#     def decorator(f):
#         @wraps(f)
#         def decorated_function(*args, **kwargs):
#             if not hasattr(g, 'current_user'):
#                 return jsonify({'error': 'Authentication required'}), 401
#
#             user_id = g.current_user.get('user_id')
#
#             # Use user-specific rate limiting (implementation would use Redis in production)
#             # For now, this is a placeholder - you'd implement actual user-based rate limiting
#
#             return f(*args, **kwargs)
#
#     return decorated_function


def require_feature_flag(feature_name):
    """Require a specific feature flag to be enabled"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if feature is enabled (you'd implement feature flag checking here)
            # This could check database, config, or external feature flag service

            feature_enabled = current_app.config.get(f'FEATURE_{feature_name.upper()}', True)

            if not feature_enabled:
                logger.info(f"Feature {feature_name} disabled for {request.path}")
                return jsonify({
                    'error': 'Feature not available',
                    'feature': feature_name
                }), 503

            return f(*args, **kwargs)

    return decorator


def validate_json_schema(schema):
    """Validate request JSON against a schema"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not request.is_json:
                return jsonify({'error': 'JSON request required'}), 400

            data = getattr(g, 'sanitized_json', None) or request.get_json()

            # Here you would implement actual JSON schema validation
            # Using jsonschema library or similar

            return f(*args, **kwargs)

    return decorator


def require_workflow_access(access_type='view'):
    """Require access to workflow resources with specific access level"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not hasattr(g, 'current_user'):
                return jsonify({'error': 'Authentication required'}), 401

            # Map access types to required permissions
            permission_map = {
                'view': ['view_workflows'],
                'create': ['create_workflows'],
                'manage': ['manage_workflows'],
                'execute': ['execute_workflows'],
                'delete': ['delete_workflows']
            }

            required_perms = permission_map.get(access_type, ['view_workflows'])
            user_permissions = g.current_user.get('permissions', [])

            # Check permissions
            if '*' not in user_permissions:
                has_permission = any(perm in user_permissions for perm in required_perms)
                if not has_permission:
                    return jsonify({
                        'error': f'Insufficient permissions for {access_type} access',
                        'required_permissions': required_perms
                    }), 403

            return f(*args, **kwargs)

    return decorator


def log_sensitive_action(action_description):
    """Log sensitive actions with enhanced details"""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            user_info = g.current_user if hasattr(g, 'current_user') else {'user_id': 'anonymous'}

            logger.warning(f"SENSITIVE ACTION: {action_description} by user {user_info.get('user_id')} "
                           f"from IP {request.remote_addr} on {request.path}")

            return f(*args, **kwargs)

    return decorator


# Enhanced error handlers with better logging and user feedback
def setup_enhanced_error_handlers(app):
    """Setup enhanced error handlers"""

    @app.errorhandler(400)
    def bad_request(error):
        logger.warning(f"400 Bad Request: {error} for {request.path}")
        return jsonify({
            'error': 'Bad request',
            'message': str(error),
            'request_id': getattr(g, 'request_id', None)
        }), 400

    @app.errorhandler(401)
    def unauthorized(error):
        logger.warning(f"401 Unauthorized: {error} for {request.path}")
        return jsonify({
            'error': 'Unauthorized',
            'message': 'Authentication required',
            'request_id': getattr(g, 'request_id', None)
        }), 401

    @app.errorhandler(403)
    def forbidden(error):
        user_id = g.current_user.get('user_id') if hasattr(g, 'current_user') else 'unknown'
        logger.warning(f"403 Forbidden: {error} for user {user_id} on {request.path}")
        return jsonify({
            'error': 'Forbidden',
            'message': 'Insufficient permissions',
            'request_id': getattr(g, 'request_id', None)
        }), 403

    @app.errorhandler(404)
    def not_found(error):
        logger.info(f"404 Not Found: {request.path}")
        return jsonify({
            'error': 'Not found',
            'message': 'Resource not found',
            'request_id': getattr(g, 'request_id', None)
        }), 404

    @app.errorhandler(429)
    def rate_limit_exceeded(error):
        logger.warning(f"429 Rate Limit Exceeded from IP {request.remote_addr}")
        return jsonify({
            'error': 'Rate limit exceeded',
            'message': 'Too many requests. Please try again later.',
            'retry_after': 60,
            'request_id': getattr(g, 'request_id', None)
        }), 429

    @app.errorhandler(500)
    def internal_error(error):
        logger.error(f"500 Internal Server Error: {error} for {request.path}", exc_info=True)
        return jsonify({
            'error': 'Internal server error',
            'message': 'An unexpected error occurred',
            'request_id': getattr(g, 'request_id', None)
        }), 500

    @app.errorhandler(503)
    def service_unavailable(error):
        logger.error(f"503 Service Unavailable: {error}")
        return jsonify({
            'error': 'Service unavailable',
            'message': 'Service temporarily unavailable',
            'request_id': getattr(g, 'request_id', None)
        }), 503


# Permission checking utilities
class PermissionChecker:
    """Utility class for permission checking in route handlers"""

    @staticmethod
    def can_access_resource(resource_type, resource_id, action='view'):
        """Check if current user can access a specific resource"""
        if not hasattr(g, 'current_user'):
            return False

        user_permissions = g.current_user.get('permissions', [])
        user_id = g.current_user.get('user_id')
        tenant_id = g.current_user.get('tenant_id')

        # Super admin can access everything
        if '*' in user_permissions:
            return True

        # Check resource-specific permissions
        permission_map = {
            'workflow': {
                'view': 'view_workflows',
                'create': 'create_workflows',
                'manage': 'manage_workflows',
                'execute': 'execute_workflows',
                'delete': 'delete_workflows'
            },
            'task': {
                'view': 'view_tasks',
                'execute': 'execute_tasks',
                'manage': 'manage_tasks',
                'assign': 'assign_tasks'
            },
            'user': {
                'view': 'view_users',
                'manage': 'manage_users',
                'create': 'create_users'
            },
            'role': {
                'view': 'view_roles',
                'manage': 'manage_roles',
                'create': 'create_roles'
            }
        }

        required_permission = permission_map.get(resource_type, {}).get(action)
        if not required_permission:
            return False

        if required_permission not in user_permissions:
            return False

        # Additional resource-specific checks could be added here
        # For example, checking if user owns the resource or is in same tenant

        return True

    @staticmethod
    def check_tenant_isolation(resource_tenant_id):
        """Ensure user can only access resources from their tenant"""
        if not hasattr(g, 'current_user'):
            return False

        user_tenant_id = g.current_user.get('tenant_id')
        user_permissions = g.current_user.get('permissions', [])

        # Super admin can access across tenants
        if '*' in user_permissions:
            return True

        return str(user_tenant_id) == str(resource_tenant_id)

    @staticmethod
    def can_assign_task(task_id, assignee_id):
        """Check if current user can assign a task to a specific user"""
        if not hasattr(g, 'current_user'):
            return False

        user_permissions = g.current_user.get('permissions', [])
        current_user_id = g.current_user.get('user_id')

        # Check basic task assignment permission
        if '*' not in user_permissions and 'assign_tasks' not in user_permissions:
            return False

        # Additional business logic checks could be added here
        # For example, checking if assignee is in same department/team

        return True

    @staticmethod
    def can_modify_role(role_id):
        """Check if current user can modify a specific role"""
        if not hasattr(g, 'current_user'):
            return False

        user_permissions = g.current_user.get('permissions', [])

        # Super admin can modify any role
        if '*' in user_permissions:
            return True

        # Check if user has role management permissions
        if 'manage_roles' not in user_permissions:
            return False

        # Additional checks: prevent modifying system roles unless super admin
        # This would require checking the role details from database

        return True


# Context managers for permission checking
class require_permission_context:
    """Context manager for permission checking within functions"""

    def __init__(self, permission):
        self.permission = permission

    def __enter__(self):
        if not hasattr(g, 'current_user'):
            raise PermissionError('Authentication required')

        user_permissions = g.current_user.get('permissions', [])
        if '*' not in user_permissions and self.permission not in user_permissions:
            raise PermissionError(f'Permission required: {self.permission}')

        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass

# Usage example for the context manager:
# with require_permission_context('manage_users'):
#     # Code that requires manage_users permission
#     pass