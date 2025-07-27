# app/__init__.py - Updated with Complete Webhook Integration
"""
Workflow Management System - Enhanced Flask Application Factory with Complete Webhook System
"""
import os
import logging
import time
from logging.handlers import RotatingFileHandler
from flask import Flask, app, jsonify, request
from flask_cors import CORS
from app.config import Config
from app.database import Database
from app.middleware import setup_middleware, setup_enhanced_error_handlers


def create_app(config_class=Config):
    """Create and configure Flask application with complete webhook system"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ---------------------------
    # Setup Logging
    # ---------------------------
    setup_logging(app)

    # ---------------------------
    # Initialize CORS
    # ---------------------------
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
    # Initialize Webhook System (NEW)
    # ---------------------------
    try:
        from app.services.webhook_init import init_webhook_system
        init_webhook_system(app)
        app.logger.info("✓ Webhook system initialized successfully")
    except Exception as e:
        app.logger.error(f"✗ Failed to initialize webhook system: {e}")
        # Continue without webhook system in development
        if app.config.get('ENV') == 'development':
            app.logger.warning("Continuing without webhook system in development mode")
        else:
            raise

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

    # Admin Dashboard
    from app.blueprints.admin_dashboard import dashboard_bp
    app.register_blueprint(dashboard_bp, url_prefix='/api/admin/dashboard')

    # Reporting & Analytics
    from app.blueprints.reports import reports_bp
    app.register_blueprint(reports_bp, url_prefix='/api/reports')

    # Automation & Integration
    from app.blueprints.automation import automation_bp
    app.register_blueprint(automation_bp, url_prefix='/api/automation')

    # Enhanced Webhooks (UPDATED)
    from app.blueprints.webhooks_complete import webhooks_bp
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')

    # Notifications
    from app.blueprints.notifications import notifications_bp
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')

    # Notification Management (Admin)
    from app.blueprints.notification_management import notification_mgmt_bp
    app.register_blueprint(notification_mgmt_bp, url_prefix='/api/admin')

    # Scripts Management
    from app.blueprints.scripts import scripts_bp
    app.register_blueprint(scripts_bp, url_prefix='/api/scripts')

    # ---------------------------
    # Health Check Endpoints (Enhanced)
    # ---------------------------
    @app.route('/health')
    def health_check():
        """Enhanced health check including webhook system"""
        health_status = {
            'status': 'healthy',
            'service': 'workflow-management-api',
            'version': '2.1.0',
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ')
        }
        
        # Check webhook system health
        try:
            from app.services.webhook_init import webhook_system_health_check
            webhook_health = webhook_system_health_check()
            health_status['webhook_system'] = webhook_health['status']
            
            if webhook_health['status'] != 'healthy':
                health_status['status'] = 'degraded'
        except Exception as e:
            health_status['webhook_system'] = 'error'
            health_status['status'] = 'degraded'
            app.logger.error(f"Webhook health check failed: {e}")

        return jsonify(health_status)

    @app.route('/health/detailed')
    def detailed_health_check():
        """Detailed health check with all component status"""
        health_status = {
            'status': 'healthy',
            'service': 'workflow-management-api',
            'version': '2.1.0',
            'timestamp': time.strftime('%Y-%m-%dT%H:%M:%SZ'),
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

        # Check webhook system (ENHANCED)
        try:
            from app.services.webhook_init import webhook_system_health_check
            webhook_health = webhook_system_health_check()
            health_status['components']['webhook_system'] = webhook_health['status']
            health_status['webhook_details'] = webhook_health['details']
            
            if webhook_health['status'] != 'healthy':
                health_status['status'] = 'degraded'
        except Exception as e:
            health_status['components']['webhook_system'] = 'error'
            health_status['status'] = 'degraded'
            app.logger.error(f"Webhook system health check failed: {e}")

        # Add other component checks
        health_status['components']['authentication'] = 'healthy'
        health_status['components']['permissions'] = 'healthy'
        health_status['components']['workflow_engine'] = 'healthy'

        return jsonify(health_status)

    @app.route('/api/info')
    def api_info():
        """Enhanced API information endpoint with webhook features"""
        return jsonify({
            'name': 'Workflow Management API',
            'version': '2.1.0',
            'description': 'Comprehensive workflow management system with advanced webhook integration',
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
                'Advanced Webhook System',  # NEW
                'Webhook Queue Management',  # NEW
                'Webhook Security & Monitoring',  # NEW
                'Admin Dashboard',
                'Script Management',
                'Notification Management'
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
                'webhooks': '/api/webhooks',  # ENHANCED
                'webhook_security': '/api/webhooks/security',  # NEW
                'webhook_monitoring': '/api/webhooks/monitoring',  # NEW
                'webhook_queue': '/api/webhooks/queue',  # NEW
                'notifications': '/api/notifications',
                'scripts': '/api/scripts',
                'notification_management': '/api/admin/notification-templates'
            },
            'webhook_features': {  # NEW SECTION
                'incoming_webhooks': 'Process webhooks from external systems',
                'outgoing_webhooks': 'Send events to external systems',
                'webhook_templates': 'Pre-built integrations (GitHub, Slack, Teams, etc.)',
                'webhook_security': 'Signature verification, rate limiting, IP whitelisting',
                'webhook_monitoring': 'Health checks, performance metrics, alerting',
                'webhook_queue': 'Asynchronous processing with retry logic',
                'webhook_analytics': 'Delivery statistics and trend analysis'
            },
            'documentation': '/api/docs',
            'health_check': '/health'
        })

    # ---------------------------
    # Enhanced API Documentation Endpoint
    # ---------------------------
    @app.route('/api/docs')
    def api_documentation():
        """Enhanced API documentation including webhook endpoints"""
        return jsonify({
            'title': 'Workflow Management API Documentation',
            'version': '2.1.0',
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
                'webhooks': {  # ENHANCED SECTION
                    'GET /api/webhooks': 'List webhooks with filtering and statistics',
                    'POST /api/webhooks': 'Create webhook',
                    'GET /api/webhooks/{id}': 'Get webhook details with analytics',
                    'PUT /api/webhooks/{id}': 'Update webhook',
                    'DELETE /api/webhooks/{id}': 'Delete webhook',
                    'POST /api/webhooks/{id}/test': 'Test webhook delivery',
                    'POST /api/webhooks/{id}/bulk-test': 'Test webhook with multiple events',
                    'GET /api/webhooks/{id}/deliveries': 'Get webhook delivery history',
                    'GET /api/webhooks/analytics': 'Get webhook analytics',
                    'GET /api/webhooks/health': 'Get webhook health status',
                    'POST /api/webhooks/batch/enable': 'Enable multiple webhooks',
                    'POST /api/webhooks/batch/disable': 'Disable multiple webhooks',
                    'POST /api/webhooks/incoming/{webhook_id}': 'Incoming webhook endpoint',
                    'POST /api/webhooks/incoming/{webhook_id}/simulate': 'Simulate incoming webhook'
                },
                'webhook_queue': {  # NEW SECTION
                    'GET /api/webhooks/queue/status': 'Get webhook queue status',
                    'POST /api/webhooks/queue/manage': 'Manage webhook queue (cancel, retry, cleanup)'
                },
                'webhook_security': {  # NEW SECTION
                    'GET /api/webhooks/security/logs': 'Get webhook security logs',
                    'POST /api/webhooks/security/action': 'Perform security actions (block IP, update whitelist)'
                },
                'webhook_monitoring': {  # NEW SECTION
                    'GET /api/webhooks/monitoring': 'Get webhook monitoring data',
                    'POST /api/webhooks/test/advanced': 'Advanced webhook testing',
                    'GET /api/webhooks/templates': 'Get webhook templates',
                    'POST /api/webhooks/create-from-template': 'Create webhook from template'
                },
                'notifications': {
                    'GET /api/notifications': 'Get user notifications',
                    'PUT /api/notifications/{id}/read': 'Mark notification as read',
                    'PUT /api/notifications/mark-all-read': 'Mark all notifications as read',
                    'GET /api/notifications/stats': 'Get notification statistics'
                },
                'scripts': {
                    'GET /api/scripts': 'List scripts with filtering and pagination',
                    'POST /api/scripts': 'Create new script',
                    'GET /api/scripts/{id}': 'Get script details with execution history',
                    'PUT /api/scripts/{id}': 'Update script',
                    'DELETE /api/scripts/{id}': 'Delete script',
                    'POST /api/scripts/{id}/test': 'Test script execution'
                }
            },
            'webhook_event_types': {  # NEW SECTION
                'workflow_started': 'Triggered when a workflow instance is started',
                'workflow_completed': 'Triggered when a workflow instance is completed',
                'workflow_failed': 'Triggered when a workflow instance fails',
                'task_assigned': 'Triggered when a task is assigned to a user',
                'task_completed': 'Triggered when a task is completed',
                'approval_requested': 'Triggered when an approval is requested',
                'approval_approved': 'Triggered when an approval is approved',
                'approval_rejected': 'Triggered when an approval is rejected',
                'sla_breach': 'Triggered when an SLA breach occurs',
                'notification_sent': 'Triggered when a notification is sent',
                'user_created': 'Triggered when a new user is created',
                'form_submitted': 'Triggered when a form is submitted'
            },
            'webhook_security': {  # NEW SECTION
                'signature_verification': 'HMAC-SHA256 signature verification',
                'rate_limiting': 'Configurable rate limits per IP/webhook',
                'ip_whitelisting': 'IP address whitelisting support',
                'url_validation': 'Security validation of webhook URLs',
                'timeout_configuration': 'Configurable request timeouts'
            },
            'models': {
                'Webhook': {
                    'id': 'UUID',
                    'name': 'string',
                    'url': 'string',
                    'events': 'array',
                    'webhook_type': 'string (incoming/outgoing/bidirectional)',
                    'environment': 'string (development/staging/production)',
                    'is_active': 'boolean',
                    'priority': 'integer (1-10)',
                    'failure_count': 'integer',
                    'last_triggered_at': 'datetime'
                },
                'WebhookDelivery': {
                    'id': 'UUID',
                    'webhook_id': 'UUID',
                    'event_type': 'string',
                    'payload': 'object',
                    'response_status': 'integer',
                    'delivery_attempts': 'integer',
                    'execution_time_ms': 'integer',
                    'delivered_at': 'datetime',
                    'is_test': 'boolean'
                }
            },
            'response_codes': {
                '200': 'Success',
                '201': 'Created',
                '400': 'Bad Request',
                '401': 'Unauthorized',
                '403': 'Forbidden',
                '404': 'Not Found',
                '409': 'Conflict',
                '429': 'Rate Limited',
                '500': 'Internal Server Error'
            }
        })

    # ---------------------------
    # Webhook System Status Endpoint (NEW)
    # ---------------------------
    @app.route('/api/webhooks/system/status')
    def webhook_system_status():
        """Get webhook system status (public endpoint for monitoring)"""
        try:
            from app.services.webhook_init import webhook_system
            status = webhook_system.get_system_status()
            return jsonify(status), 200
        except Exception as e:
            return jsonify({
                'error': 'Failed to get webhook system status',
                'details': str(e)
            }), 500

    # ---------------------------
    # Webhook System Metrics Endpoint (NEW)
    # ---------------------------
    @app.route('/api/webhooks/system/metrics')
    def webhook_system_metrics():
        """Get webhook system metrics for monitoring tools"""
        try:
            from app.services.webhook_init import get_webhook_metrics
            metrics = get_webhook_metrics()
            return jsonify(metrics), 200
        except Exception as e:
            return jsonify({
                'error': 'Failed to get webhook metrics',
                'details': str(e)
            }), 500

    # ---------------------------
    # Development Tools (Enhanced)
    # ---------------------------
    if app.config.get('ENV') == 'development':

        @app.route('/dev/reset-demo-data', methods=['POST'])
        def reset_demo_data():
            """Reset demo data for development"""
            try:
                app.logger.info("Demo data reset requested")
                
                # Reset webhook test data
                from app.services.webhook_testing import WebhookTestingUtils
                cleanup_result = WebhookTestingUtils.cleanup_test_data(
                    '00000000-0000-0000-0000-000000000001'
                )
                
                return jsonify({
                    'message': 'Demo data reset successfully',
                    'webhook_cleanup': cleanup_result
                }), 200
            except Exception as e:
                app.logger.error(f"Error resetting demo data: {e}")
                return jsonify({'error': 'Failed to reset demo data'}), 500

        @app.route('/dev/test-webhooks', methods=['POST'])
        def test_webhooks_dev():
            """Test webhook system in development"""
            try:
                from app.services.webhook_testing import WebhookTestingUtils
                
                tenant_id = '00000000-0000-0000-0000-000000000001'
                results = WebhookTestingUtils.trigger_test_webhook_events(tenant_id)
                
                return jsonify({
                    'message': 'Webhook tests completed',
                    'results': results
                }), 200
            except Exception as e:
                app.logger.error(f"Error testing webhooks: {e}")
                return jsonify({'error': 'Failed to test webhooks'}), 500

        @app.route('/dev/webhook-integration-status')
        def webhook_integration_status():
            """Check webhook integration status"""
            try:
                from app.services.webhook_testing import validate_webhook_system_integration
                
                is_valid, details = validate_webhook_system_integration()
                
                return jsonify({
                    'webhook_integration_valid': is_valid,
                    'details': details
                }), 200
            except Exception as e:
                return jsonify({
                    'webhook_integration_valid': False,
                    'error': str(e)
                }), 500

    # ---------------------------
    # Enhanced Performance Monitoring
    # ---------------------------
    if app.config.get('ENABLE_PERFORMANCE_MONITORING', False):

        @app.before_request
        def track_performance():
            """Track request performance including webhook metrics"""
            import time
            request.start_time = time.time()

        @app.after_request
        def log_performance(response):
            """Log performance metrics including webhook performance"""
            if hasattr(request, 'start_time'):
                duration = time.time() - request.start_time
                
                # Log slow requests
                if duration > 1.0:
                    app.logger.warning(f"Slow request: {request.method} {request.path} took {duration:.3f}s")
                
                # Log webhook-related requests separately
                if '/api/webhooks/' in request.path:
                    app.log_performance_metric('webhook_request_duration', duration * 1000, 'ms', {
                        'endpoint': request.path,
                        'method': request.method,
                        'status_code': response.status_code
                    })
            
            return response

    # ---------------------------
    # Graceful Shutdown Handler (NEW)
    # ---------------------------
    def shutdown_handler():
        """Handle graceful shutdown of webhook system"""
        try:
            from app.services.webhook_init import webhook_system
            webhook_system.shutdown()
            app.logger.info("Application shutdown completed gracefully")
        except Exception as e:
            app.logger.error(f"Error during graceful shutdown: {e}")

    # Register shutdown handler
    import atexit
    atexit.register(shutdown_handler)

    # ---------------------------
    # Application Context Processors (NEW)
    # ---------------------------
    @app.context_processor
    def inject_webhook_info():
        """Inject webhook system information into templates"""
        try:
            from app.services.webhook_init import webhook_system
            return {
                'webhook_system_enabled': webhook_system.initialized,
                'webhook_system_running': webhook_system.running
            }
        except:
            return {
                'webhook_system_enabled': False,
                'webhook_system_running': False
            }

    return app


def setup_logging(app):
    """Enhanced logging setup with webhook-specific loggers"""
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

    # Webhook-specific log (NEW)
    webhook_log_file = os.path.join(logs_dir, 'webhooks.log')
    webhook_handler = RotatingFileHandler(
        webhook_log_file,
        maxBytes=20 * 1024 * 1024,  # 20MB
        backupCount=10
    )
    webhook_handler.setLevel(logging.INFO)
    webhook_formatter = logging.Formatter(
        '[%(asctime)s] WEBHOOK: %(message)s'
    )
    webhook_handler.setFormatter(webhook_formatter)

    # Create webhook logger
    webhook_logger = logging.getLogger('webhook')
    webhook_logger.setLevel(logging.INFO)
    webhook_logger.addHandler(webhook_handler)

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

    # Configure third-party loggers
    if app.config.get('ENV') != 'development':
        logging.getLogger('werkzeug').setLevel(logging.WARNING)

    logging.getLogger('flask_cors').setLevel(logging.WARNING)

    # Log application startup
    app.logger.info(f"Workflow Management System starting up")
    app.logger.info(f"Environment: {app.config.get('ENV', 'unknown')}")
    app.logger.info(f"Log level: {logging.getLevelName(log_level)}")
    app.logger.info(f"Logs directory: {logs_dir}")
    app.logger.info(f"Enhanced logging with webhook support enabled")

    # Enhanced helper functions
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

    def log_webhook_event(event_type, webhook_id=None, details=None):
        """Log webhook-related events"""
        webhook_logger = logging.getLogger('webhook')
        message = f"Event: {event_type}"
        if webhook_id:
            message += f" | Webhook: {webhook_id}"
        if details:
            message += f" | Details: {details}"
        webhook_logger.info(message)

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
    app.log_webhook_event = log_webhook_event  # NEW
    app.log_performance_metric = log_performance_metric

    return app.logger