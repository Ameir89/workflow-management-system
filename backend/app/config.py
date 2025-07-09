# app/config.py - Updated with debugging options
"""
Configuration settings for the Workflow Management System
"""
import os
from datetime import timedelta

class Config:
    """Base configuration class"""
    
    # Flask settings
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
    # Database settings
    DATABASE_URL = os.environ.get('DATABASE_URL') or 'postgresql://postgres:CodeSD.com@188.34.167.110:5432/workflow_db'
    
    # JWT settings
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Security settings
    BCRYPT_LOG_ROUNDS = 12
    MAX_LOGIN_ATTEMPTS = 5
    ACCOUNT_LOCKOUT_DURATION = timedelta(minutes=30)
    SESSION_TIMEOUT = timedelta(hours=8)
    
    # Session validation settings (for debugging)
    ENABLE_SESSION_VALIDATION = os.environ.get('ENABLE_SESSION_VALIDATION', 'false').lower() == 'true'
    SINGLE_SESSION_PER_USER = os.environ.get('SINGLE_SESSION_PER_USER', 'false').lower() == 'true'
    
    # File upload settings
    MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
    UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'
    ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'}
    
    # CORS settings
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
    # Redis settings (for Celery)
    CELERY_BROKER_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
    # Email settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'localhost'
    MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    
    # Encryption settings
    ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY') or 'change-this-encryption-key-in-production'
    
    # Rate limiting
    RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT_PER_MINUTE') or 100)
    
    # Audit settings
    ENABLE_AUDIT_LOG = os.environ.get('ENABLE_AUDIT_LOG', 'true').lower() in ['true', 'on', '1']
    
    # Logging settings
    LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO')
    LOG_TO_CONSOLE = os.environ.get('LOG_TO_CONSOLE', 'true').lower() in ['true', 'on', '1']
    LOGS_DIR = os.environ.get('LOGS_DIR', 'logs')
    
    # Performance monitoring
    ENABLE_PERFORMANCE_MONITORING = os.environ.get('ENABLE_PERFORMANCE_MONITORING', 'false').lower() == 'true'
    ENABLE_PERFORMANCE_LOGGING = os.environ.get('ENABLE_PERFORMANCE_LOGGING', 'false').lower() == 'true'
    LOG_DATABASE_QUERIES = os.environ.get('LOG_DATABASE_QUERIES', 'false').lower() == 'true'
    LOG_REQUESTS = os.environ.get('LOG_REQUESTS', 'false').lower() == 'true'
    LOG_RESPONSES = os.environ.get('LOG_RESPONSES', 'false').lower() == 'true'
    LOG_REQUEST_HEADERS = os.environ.get('LOG_REQUEST_HEADERS', 'false').lower() == 'true'
    
class DevelopmentConfig(Config):
    """Development configuration"""
    DEBUG = True
    
    # Disable session validation for easier debugging
    ENABLE_SESSION_VALIDATION = False
    
    # Enable more detailed logging
    LOG_LEVEL = 'DEBUG'
    LOG_TO_CONSOLE = True
    LOG_REQUESTS = True
    LOG_DATABASE_QUERIES = False  # Can be noisy, enable if needed
    
    # Longer session timeout for development
    SESSION_TIMEOUT = timedelta(hours=24)
    
class ProductionConfig(Config):
    """Production configuration"""
    DEBUG = False
    
    # Enable session validation in production
    ENABLE_SESSION_VALIDATION = True
    
    # More secure settings
    SESSION_TIMEOUT = timedelta(hours=8)
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)  # Shorter in production
    
class TestingConfig(Config):
    """Testing configuration"""
    TESTING = True
    DATABASE_URL = 'postgresql://postgres:CodeSD.com@188.34.167.110:5432/test_workflow_db'
    
    # Disable session validation for testing
    ENABLE_SESSION_VALIDATION = False
    
    # Shorter timeouts for testing
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)
    SESSION_TIMEOUT = timedelta(hours=1)


# ### app/config.py
# """
# Configuration settings for the Workflow Management System
# """
# import os
# from datetime import timedelta

# class Config:
#     """Base configuration class"""
    
#     # Flask settings
#     SECRET_KEY = os.environ.get('SECRET_KEY') or 'dev-secret-key-change-in-production'
    
#     # Database settings
#     DATABASE_URL = os.environ.get('DATABASE_URL') or 'postgresql://postgres:CodeSD.com@188.34.167.110:5432/workflow_db'
    
#     # JWT settings
#     JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY') or SECRET_KEY
#     JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=24)
#     JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
#     # Security settings
#     BCRYPT_LOG_ROUNDS = 12
#     MAX_LOGIN_ATTEMPTS = 5
#     ACCOUNT_LOCKOUT_DURATION = timedelta(minutes=30)
#     SESSION_TIMEOUT = timedelta(hours=8)
    
#     # File upload settings
#     MAX_CONTENT_LENGTH = 50 * 1024 * 1024  # 50MB
#     UPLOAD_FOLDER = os.environ.get('UPLOAD_FOLDER') or 'uploads'
#     ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx', 'xls', 'xlsx'}
    
#     # CORS settings
#     CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*').split(',')
    
#     # Redis settings (for Celery)
#     CELERY_BROKER_URL = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
#     CELERY_RESULT_BACKEND = os.environ.get('REDIS_URL') or 'redis://localhost:6379/0'
    
#     # Email settings
#     MAIL_SERVER = os.environ.get('MAIL_SERVER') or 'localhost'
#     MAIL_PORT = int(os.environ.get('MAIL_PORT') or 587)
#     MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
#     MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
#     MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    
#     # Encryption settings
#     ENCRYPTION_KEY = os.environ.get('ENCRYPTION_KEY') or 'change-this-encryption-key-in-production'
    
#     # Rate limiting
#     RATE_LIMIT_PER_MINUTE = int(os.environ.get('RATE_LIMIT_PER_MINUTE') or 100)
    
#     # Audit settings
#     ENABLE_AUDIT_LOG = os.environ.get('ENABLE_AUDIT_LOG', 'true').lower() in ['true', 'on', '1']
    
# class DevelopmentConfig(Config):
#     """Development configuration"""
#     DEBUG = True
    
# class ProductionConfig(Config):
#     """Production configuration"""
#     DEBUG = False
    
# class TestingConfig(Config):
#     """Testing configuration"""
#     TESTING = True
#     DATABASE_URL = 'postgresql://postgres:CodeSD.com@localhost:5432/test_workflow_db'