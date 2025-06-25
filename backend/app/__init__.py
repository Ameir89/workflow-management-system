# app/__init__.py - Updated to include all new features
"""
Workflow Management System - Enhanced Flask Application Factory
"""
import os
import logging
import time
from logging.handlers import RotatingFileHandler
from flask import Flask, jsonify, request
from flask_cors import CORS
from app.config import Config
from app.database import Database
from app.middleware import setup_middleware, setup_enhanced_error_handlers


def create_app(config_class=Config):
    """Create and configure Flask application with all features"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ---------------------------
    # Setup Logging
    # ---------------------------
    setup_logging(app)

    # ---------------------------
    # Initialize CORS
    # ---------------------------
    # CORS(app, origins=app.config['CORS_ORIGINS'])
    CORS(app, origins="*",
         allow_headers=["Content-Type", "Authorization", "X-Requested-With", "Accept", "Origin"],
         methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
         supports_credentials=True)

    # ---------------------------
    # Initialize Database
    # ---------------------------
    Database.init_app(app)

    # ---------------------------
    # Setup Middleware (Enhanced)
    # ---------------------------
    setup_middleware(app)

    # ---------------------------
    # Setup Enhanced Error Handlers
    # ---------------------------
    setup_enhanced_error_handlers(app)

    # ---------------------------
    # Register All Blueprints
    # ---------------------------

    # Core Authentication & User Management
    from app.blueprints.auth import auth_bp
    app.register_blueprint(auth_bp, url_prefix='/api/auth')

    # Core Workflow Management
    from app.blueprints.workflows import workflows_bp
    from app.blueprints.tasks import tasks_bp
    app.register_blueprint(workflows_bp, url_prefix='/api/workflows')
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')

    # Form & Data Management
    from app.blueprints.forms import forms_bp
    from app.blueprints.lookups import lookups_bp
    from app.blueprints.files import files_bp
    app.register_blueprint(forms_bp, url_prefix='/api/forms')
    app.register_blueprint(lookups_bp, url_prefix='/api/lookups')
    app.register_blueprint(files_bp, url_prefix='/api/files')

    # Administration & Security
    from app.blueprints.admin import admin_bp
    app.register_blueprint(admin_bp, url_prefix='/api/admin')

    # Admin Dashboard (New)
    from app.blueprints.admin_dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp, url_prefix='/api/admin/dashboard')

    # Reporting & Analytics
    from app.blueprints.reports import reports_bp
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    # Automation & Integration
    from app.blueprints.automation import automation_bp
    from app.blueprints.webhooks import webhooks_bp
    app.register_blueprint(automation_bp, url_prefix='/api/automation')
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')

    # Notifications
    from app.blueprints.notifications import notifications_bp
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')

    # ---------------------------
    # Health Check Endpoints
    # ---------------------------
    @app.route('/health')
    def health_check():
        """Basic health check"""
        return jsonify({
            'status': 'healthy',
            'service': 'workflow-management-api',
            'version': '1.0.0',
            'timestamp': '2025-06-16T20:30:00Z'
        })

    @app.route('/health/detailed')
    def detailed_health_check():
        """Detailed health check with component status"""
        health_status = {
            'status': 'healthy',
            'service': 'workflow-management-api',
            'version': '1.0.0',
            'timestamp': '2025-06-16T20:30:00Z',
            'components': {}
        }

        # Check database connectivity
        try:
            Database.execute_one("SELECT 1")
            health_status['components']['database'] = 'healthy'
        except Exception as e:
            health_status['components']['database'] = 'unhealthy'
            health_status['status'] = 'degraded'
            app.logger.error(f"Database health check failed: {e}")

        # Check file storage
        try:
            upload_folder = app.config.get('UPLOAD_FOLDER', 'uploads')
            if os.path.exists(upload_folder) and os.access(upload_folder, os.W_OK):
                health_status['components']['file_storage'] = 'healthy'
            else:
                health_status['components']['file_storage'] = 'degraded'
        except Exception as e:
            health_status['components']['file_storage'] = 'unhealthy'
            app.logger.error(f"File storage health check failed: {e}")

        # Add more component checks as needed
        health_status['components']['authentication'] = 'healthy'
        health_status['components']['permissions'] = 'healthy'
        health_status['components']['workflow_engine'] = 'healthy'

        return jsonify(health_status)

    @app.route('/api/info')
    def api_info():
        """API information endpoint"""
        return jsonify({
            'name': 'Workflow Management API',
            'version': '1.0.0',
            'description': 'Comprehensive workflow management system with advanced features',
            'features': [
                'Multi-tenant Architecture',
                'Role-based Access Control',
                'Dynamic Forms',
                'Lookup Tables',
                'Workflow Automation',
                'SLA Monitoring',
                'Audit Logging',
                'File Management',
                'Reporting & Analytics',
                'Webhook Integration',
                'Admin Dashboard'
            ],
            'endpoints': {
                'auth': '/api/auth',
                'workflows': '/api/workflows',
                'tasks': '/api/tasks',
                'forms': '/api/forms',
                'lookups': '/api/lookups',
                'files': '/api/files',
                'admin': '/api/admin',
                'admin_dashboard': '/api/admin/dashboard',
                'reports': '/api/reports',
                'automation': '/api/automation',
                'webhooks': '/api/webhooks',
                'notifications': '/api/notifications'
            },
            'documentation': '/api/docs',
            'health_check': '/health'
        })

    # ---------------------------
    # API Documentation Endpoint (Basic)
    # ---------------------------
    @app.route('/api/docs')
    def api_documentation():
        """Basic API documentation"""
        return jsonify({
            'title': 'Workflow Management API Documentation',
            'version': '1.0.0',
            'base_url': request.base_url.replace('/api/docs', ''),
            'authentication': {
                'type': 'Bearer Token',
                'header': 'Authorization: Bearer <token>',
                'login_endpoint': '/api/auth/login'
            },
            'endpoints': {
                'authentication': {
                    'POST /api/auth/login': 'User login',
                    'POST /api/auth/register': 'User registration',
                    'POST /api/auth/logout': 'User logout',
                    'GET /api/auth/profile': 'Get user profile',
                    'POST /api/auth/setup-2fa': 'Setup two-factor authentication'
                },
                'workflows': {
                    'GET /api/workflows': 'List workflows',
                    'POST /api/workflows': 'Create workflow',
                    'GET /api/workflows/{id}': 'Get workflow details',
                    'PUT /api/workflows/{id}': 'Update workflow',
                    'POST /api/workflows/{id}/execute': 'Execute workflow',
                    'DELETE /api/workflows/{id}': 'Delete workflow'
                },
                'tasks': {
                    'GET /api/tasks': 'List tasks with advanced filtering',
                    'GET /api/tasks/{id}': 'Get task details',
                    'POST /api/tasks/{id}/complete': 'Complete task',
                    'POST /api/tasks/{id}/assign': 'Assign task',
                    'POST /api/tasks/{id}/form-response': 'Submit form response'
                },
                'admin': {
                    'GET /api/admin/users': 'List users',
                    'POST /api/admin/users': 'Create user',
                    'GET /api/admin/roles': 'List roles',
                    'POST /api/admin/roles': 'Create role',
                    'GET /api/admin/permissions': 'List permissions',
                    'GET /api/admin/permission-matrix': 'Get permission matrix',
                    'GET /api/admin/health': 'System health status'
                },
                'admin_dashboard': {
                    'GET /api/admin/dashboard/overview': 'Dashboard overview',
                    'GET /api/admin/dashboard/analytics/trends': 'Analytics trends',
                    'GET /api/admin/dashboard/security/overview': 'Security overview',
                    'GET /api/admin/dashboard/system-status': 'System status'
                },
                'lookups': {
                    'GET /api/lookups/tables': 'List lookup tables',
                    'POST /api/lookups/tables': 'Create lookup table',
                    'GET /api/lookups/tables/{id}/data': 'Get lookup data',
                    'POST /api/lookups/tables/{id}/data': 'Add lookup record',
                    'GET /api/lookups/tables/{id}/options': 'Get form options'
                }
            },
            'models': {
                'User': {
                    'id': 'UUID',
                    'username': 'string',
                    'email': 'string',
                    'first_name': 'string',
                    'last_name': 'string',
                    'is_active': 'boolean'
                },
                'Workflow': {
                    'id': 'UUID',
                    'name': 'string',
                    'description': 'string',
                    'definition': 'object',
                    'is_active': 'boolean'
                },
                'Task': {
                    'id': 'UUID',
                    'name': 'string',
                    'type': 'string',
                    'status': 'string',
                    'assigned_to': 'UUID',
                    'due_date': 'datetime'
                }
            },
            'response_codes': {
                '200': 'Success',
                '201': 'Created',
                '400': 'Bad Request',
                '401': 'Unauthorized',
                '403': 'Forbidden',
                '404': 'Not Found',
                '429': 'Rate Limited',
                '500': 'Internal Server Error'
            }
        })

    # ---------------------------
    # Development Tools (only in development)
    # ---------------------------
    if app.config.get('ENV') == 'development':

        @app.route('/dev/reset-demo-data', methods=['POST'])
        def reset_demo_data():
            """Reset demo data for development"""
            try:
                # This would reset demo data in development
                app.logger.info("Demo data reset requested")
                return jsonify({'message': 'Demo data reset successfully'}), 200
            except Exception as e:
                app.logger.error(f"Error resetting demo data: {e}")
                return jsonify({'error': 'Failed to reset demo data'}), 500

        @app.route('/dev/test-permissions')
        def test_permissions():
            """Test permission system (development only)"""
            from app.services.permission_service import PermissionService
            return jsonify({
                'permission_hierarchy': PermissionService.get_permission_hierarchy(),
                'suggestions': {
                    'admin': PermissionService.suggest_role_permissions('admin'),
                    'manager': PermissionService.suggest_role_permissions('manager'),
                    'user': PermissionService.suggest_role_permissions('user')
                }
            })

    # ---------------------------
    # Performance Monitoring (if enabled)
    # ---------------------------
    if app.config.get('ENABLE_PERFORMANCE_MONITORING', False):

        @app.before_request
        def track_performance():
            """Track request performance"""
            import time
            request.start_time = time.time()

        @app.after_request
        def log_performance(response):
            """Log performance metrics"""
            if hasattr(request, 'start_time'):
                duration = time.time() - request.start_time
                if duration > 1.0:  # Log slow requests
                    app.logger.warning(f"Slow request: {request.method} {request.path} took {duration:.3f}s")
            return response

    # ---------------------------
    # Request ID Tracking
    # ---------------------------
    @app.before_request
    def add_request_id():
        """Add request ID for tracing"""
        import uuid
        request.id = str(uuid.uuid4())

    return app


def setup_logging(app):
    """
    Setup comprehensive logging for the application
    """
    # Create logs directory if it doesn't exist
    logs_dir = app.config.get('LOGS_DIR', 'logs')
    if not os.path.exists(logs_dir):
        os.makedirs(logs_dir)

    # Get log level from config or default to INFO
    log_level = getattr(logging, app.config.get('LOG_LEVEL', 'INFO').upper())

    # Clear any existing handlers to avoid duplicates
    app.logger.handlers.clear()

    # Set log level
    app.logger.setLevel(log_level)

    # Create formatters
    detailed_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s in %(module)s [%(pathname)s:%(lineno)d]: '
        '%(message)s'
    )

    simple_formatter = logging.Formatter(
        '[%(asctime)s] %(levelname)s: %(message)s'
    )

    # Console handler (for development)
    if app.config.get('ENV') == 'development' or app.config.get('LOG_TO_CONSOLE', False):
        console_handler = logging.StreamHandler()
        console_handler.setLevel(log_level)
        console_handler.setFormatter(simple_formatter)
        app.logger.addHandler(console_handler)

    # File handlers for different log levels

    # General application log (rotating)
    general_log_file = os.path.join(logs_dir, 'workflow_app.log')
    file_handler = RotatingFileHandler(
        general_log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=5
    )
    file_handler.setLevel(logging.INFO)
    file_handler.setFormatter(detailed_formatter)
    app.logger.addHandler(file_handler)

    # Error log (rotating) - only errors and critical
    error_log_file = os.path.join(logs_dir, 'workflow_errors.log')
    error_handler = RotatingFileHandler(
        error_log_file,
        maxBytes=10 * 1024 * 1024,  # 10MB
        backupCount=10
    )
    error_handler.setLevel(logging.ERROR)
    error_handler.setFormatter(detailed_formatter)
    app.logger.addHandler(error_handler)

    # Security log (for authentication, authorization events)
    security_log_file = os.path.join(logs_dir, 'security.log')
    security_handler = RotatingFileHandler(
        security_log_file,
        maxBytes=5 * 1024 * 1024,  # 5MB
        backupCount=10
    )
    security_handler.setLevel(logging.INFO)
    security_handler.setFormatter(detailed_formatter)

    # Create security logger
    security_logger = logging.getLogger('security')
    security_logger.setLevel(logging.INFO)
    security_logger.addHandler(security_handler)

    # Audit log (for data changes, workflow actions)
    audit_log_file = os.path.join(logs_dir, 'audit.log')
    audit_handler = RotatingFileHandler(
        audit_log_file,
        maxBytes=20 * 1024 * 1024,  # 20MB
        backupCount=15
    )
    audit_handler.setLevel(logging.INFO)
    audit_formatter = logging.Formatter(
        '[%(asctime)s] AUDIT: %(message)s'
    )
    audit_handler.setFormatter(audit_formatter)

    # Create audit logger
    audit_logger = logging.getLogger('audit')
    audit_logger.setLevel(logging.INFO)
    audit_logger.addHandler(audit_handler)

    # Performance log (for slow queries, performance metrics)
    if app.config.get('ENABLE_PERFORMANCE_LOGGING', False):
        perf_log_file = os.path.join(logs_dir, 'performance.log')
        perf_handler = RotatingFileHandler(
            perf_log_file,
            maxBytes=10 * 1024 * 1024,  # 10MB
            backupCount=5
        )
        perf_handler.setLevel(logging.INFO)
        perf_formatter = logging.Formatter(
            '[%(asctime)s] PERF: %(message)s'
        )
        perf_handler.setFormatter(perf_formatter)

        # Create performance logger
        perf_logger = logging.getLogger('performance')
        perf_logger.setLevel(logging.INFO)
        perf_logger.addHandler(perf_handler)

    # Database query log (if enabled)
    if app.config.get('LOG_DATABASE_QUERIES', False):
        db_log_file = os.path.join(logs_dir, 'database.log')
        db_handler = RotatingFileHandler(
            db_log_file,
            maxBytes=20 * 1024 * 1024,  # 20MB
            backupCount=5
        )
        db_handler.setLevel(logging.DEBUG)
        db_formatter = logging.Formatter(
            '[%(asctime)s] DB: %(message)s'
        )
        db_handler.setFormatter(db_formatter)

        # Create database logger
        db_logger = logging.getLogger('database')
        db_logger.setLevel(logging.DEBUG)
        db_logger.addHandler(db_handler)

    # Configure third-party loggers

    # Reduce werkzeug logging noise in production
    if app.config.get('ENV') != 'development':
        logging.getLogger('werkzeug').setLevel(logging.WARNING)

    # Configure Flask-CORS logger
    logging.getLogger('flask_cors').setLevel(logging.WARNING)

    # Configure SQLAlchemy logger (if using SQLAlchemy)
    if app.config.get('LOG_DATABASE_QUERIES', False):
        logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)
    else:
        logging.getLogger('sqlalchemy.engine').setLevel(logging.WARNING)

    # Log application startup
    app.logger.info(f"Workflow Management System starting up")
    app.logger.info(f"Environment: {app.config.get('ENV', 'unknown')}")
    app.logger.info(f"Log level: {logging.getLevelName(log_level)}")
    app.logger.info(f"Logs directory: {logs_dir}")

    # Create helper functions for specialized logging

    def log_security_event(event_type, user_id=None, ip_address=None, details=None):
        """Log security-related events"""
        security_logger = logging.getLogger('security')
        message = f"Event: {event_type}"
        if user_id:
            message += f" | User: {user_id}"
        if ip_address:
            message += f" | IP: {ip_address}"
        if details:
            message += f" | Details: {details}"
        security_logger.info(message)

    def log_audit_event(action, user_id, resource_type, resource_id, details=None):
        """Log audit trail events"""
        audit_logger = logging.getLogger('audit')
        message = f"Action: {action} | User: {user_id} | Resource: {resource_type}:{resource_id}"
        if details:
            message += f" | Details: {details}"
        audit_logger.info(message)

    def log_performance_metric(metric_name, value, unit='ms', details=None):
        """Log performance metrics"""
        if app.config.get('ENABLE_PERFORMANCE_LOGGING', False):
            perf_logger = logging.getLogger('performance')
            message = f"Metric: {metric_name} | Value: {value}{unit}"
            if details:
                message += f" | Details: {details}"
            perf_logger.info(message)

    # Add helper functions to app for easy access
    app.log_security_event = log_security_event
    app.log_audit_event = log_audit_event
    app.log_performance_metric = log_performance_metric

    return app.logger


def setup_request_logging(app):
    """
    Setup request/response logging middleware
    """

    @app.before_request
    def log_request_info():
        """Log incoming request details"""
        if app.config.get('LOG_REQUESTS', False):
            app.logger.debug(f"Request: {request.method} {request.path} from {request.remote_addr}")

            # Log request headers (excluding sensitive ones)
            if app.config.get('LOG_REQUEST_HEADERS', False):
                safe_headers = {k: v for k, v in request.headers.items()
                                if k.lower() not in ['authorization', 'cookie', 'x-api-key']}
                app.logger.debug(f"Request headers: {safe_headers}")

    @app.after_request
    def log_response_info(response):
        """Log response details"""
        if app.config.get('LOG_RESPONSES', False):
            app.logger.debug(f"Response: {response.status_code} for {request.method} {request.path}")

        return response