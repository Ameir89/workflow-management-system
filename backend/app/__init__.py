### app/__init__.py
"""
Workflow Management System - Flask Application Factory
"""
from flask import Flask, jsonify, request
from flask_cors import CORS
from app.config import Config
from app.database import Database
from app.middleware import setup_middleware
import os
import logging
from logging.handlers import RotatingFileHandler

def create_app(config_class=Config):
    """Create and configure Flask application"""
    app = Flask(__name__)
    app.config.from_object(config_class)

    # ---------------------------
    # Setup logging
    # ---------------------------
    if not os.path.exists('logs'):
        os.mkdir('logs')

    file_handler = RotatingFileHandler('logs/app.log', maxBytes=10240, backupCount=5)
    file_handler.setLevel(logging.INFO)

    formatter = logging.Formatter(
        '[%(asctime)s] [%(levelname)s] %(name)s: %(message)s'
    )
    file_handler.setFormatter(formatter)

    app.logger.addHandler(file_handler)
    app.logger.setLevel(logging.INFO)
    app.logger.info('App startup')

    # Optionally log to console in development
    if app.config.get('ENV') == 'development':
        console_handler = logging.StreamHandler()
        console_handler.setLevel(logging.DEBUG)
        console_handler.setFormatter(formatter)
        app.logger.addHandler(console_handler)

    # Initialize CORS
    CORS(app, origins=app.config['CORS_ORIGINS'])
    
    # Initialize database
    Database.init_app(app)
    
    # Setup middleware
    setup_middleware(app)
    
    # Register blueprints
    from app.blueprints.auth import auth_bp
    from app.blueprints.workflows import workflows_bp
    from app.blueprints.tasks import tasks_bp
    from app.blueprints.forms import forms_bp
    from app.blueprints.files import files_bp
    from app.blueprints.reports import reports_bp
    from app.blueprints.admin import admin_bp
    from app.blueprints.webhooks import webhooks_bp
    from app.blueprints.notifications import notifications_bp

    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(workflows_bp, url_prefix='/api/workflows')
    app.register_blueprint(tasks_bp, url_prefix='/api/tasks')
    app.register_blueprint(forms_bp, url_prefix='/api/forms')
    app.register_blueprint(files_bp, url_prefix='/api/files')
    app.register_blueprint(reports_bp, url_prefix='/api/reports')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(webhooks_bp, url_prefix='/api/webhooks')
    app.register_blueprint(notifications_bp, url_prefix='/api/notifications')
    
    # Health check endpoint
    @app.route('/health')
    def health_check():
        return jsonify({'status': 'healthy', 'service': 'workflow-management-api'})
    
    # Global error handlers
    @app.errorhandler(400)
    def bad_request(error):
        return jsonify({'error': 'Bad request', 'message': str(error)}), 400
    
    @app.errorhandler(401)
    def unauthorized(error):
        return jsonify({'error': 'Unauthorized', 'message': 'Authentication required'}), 401
    
    @app.errorhandler(403)
    def forbidden(error):
        return jsonify({'error': 'Forbidden', 'message': 'Insufficient permissions'}), 403
    
    @app.errorhandler(404)
    def not_found(error):
        return jsonify({'error': 'Not found', 'message': 'Resource not found'}), 404
    
    @app.errorhandler(500)
    def internal_error(error):
        return jsonify({'error': 'Internal server error', 'message': 'An unexpected error occurred'}), 500
    
    return app