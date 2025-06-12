### app/utils/security.py
"""
Security utilities for input validation and sanitization
"""
import re
import bleach
import ipaddress
from collections import defaultdict
from datetime import datetime, timedelta
from flask import current_app
import logging

logger = logging.getLogger(__name__)

# Rate limiting storage (in production, use Redis)
rate_limit_storage = defaultdict(list)

def sanitize_input(data):
    """Sanitize input data to prevent XSS and injection attacks"""
    if isinstance(data, dict):
        return {key: sanitize_input(value) for key, value in data.items()}
    elif isinstance(data, list):
        return [sanitize_input(item) for item in data]
    elif isinstance(data, str):
        # Remove potential XSS
        cleaned = bleach.clean(data, tags=[], attributes={}, strip=True)
        return cleaned.strip()
    else:
        return data

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(pattern, email) is not None

def validate_password_strength(password):
    """Validate password strength"""
    if len(password) < 8:
        return False, "Password must be at least 8 characters long"
    
    if not re.search(r'[A-Z]', password):
        return False, "Password must contain at least one uppercase letter"
    
    if not re.search(r'[a-z]', password):
        return False, "Password must contain at least one lowercase letter"
    
    if not re.search(r'\d', password):
        return False, "Password must contain at least one digit"
    
    if not re.search(r'[!@#$%^&*(),.?":{}|<>]', password):
        return False, "Password must contain at least one special character"
    
    return True, "Password is strong"

def validate_uuid(uuid_string):
    """Validate UUID format"""
    pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return re.match(pattern, str(uuid_string).lower()) is not None

def check_rate_limit(ip_address):
    """Check if IP address has exceeded rate limit"""
    now = datetime.now()
    rate_limit = current_app.config.get('RATE_LIMIT_PER_MINUTE', 100)
    
    # Clean old entries
    cutoff = now - timedelta(minutes=1)
    rate_limit_storage[ip_address] = [
        timestamp for timestamp in rate_limit_storage[ip_address]
        if timestamp > cutoff
    ]
    
    # Check current rate
    if len(rate_limit_storage[ip_address]) >= rate_limit:
        logger.warning(f"Rate limit exceeded for IP: {ip_address}")
        return False
    
    # Add current request
    rate_limit_storage[ip_address].append(now)
    return True

def validate_file_type(filename, allowed_extensions=None):
    """Validate file type based on extension"""
    if allowed_extensions is None:
        allowed_extensions = current_app.config.get('ALLOWED_EXTENSIONS', set())
    
    if '.' not in filename:
        return False
    
    extension = filename.rsplit('.', 1)[1].lower()
    return extension in allowed_extensions

def validate_ip_address(ip_string):
    """Validate IP address format"""
    try:
        ipaddress.ip_address(ip_string)
        return True
    except ValueError:
        return False

def prevent_sql_injection(query_params):
    """Additional SQL injection prevention (paranoid mode)"""
    dangerous_patterns = [
        r'(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC)\b)',
        r'(\b(UNION|OR|AND)\b.*\b(SELECT|INSERT|UPDATE|DELETE)\b)',
        r'(--|/\*|\*/)',
        r'(\bxp_cmdshell\b|\bsp_executesql\b)'
    ]
    
    for param in query_params if isinstance(query_params, (list, tuple)) else [query_params]:
        if isinstance(param, str):
            for pattern in dangerous_patterns:
                if re.search(pattern, param, re.IGNORECASE):
                    logger.warning(f"Potential SQL injection attempt: {param}")
                    return False
    
    return True

class CSRFProtection:
    """CSRF protection utilities"""
    
    @staticmethod
    def generate_csrf_token():
        """Generate CSRF token"""
        import secrets
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def validate_csrf_token(token, session_token):
        """Validate CSRF token"""
        return token == session_token

def secure_filename(filename):
    """Make filename secure for storage"""
    # Remove directory traversal attempts
    filename = filename.replace('..', '').replace('/', '').replace('\\', '')
    
    # Remove non-alphanumeric characters except dots and hyphens
    filename = re.sub(r'[^a-zA-Z0-9.-]', '_', filename)
    
    # Limit length
    if len(filename) > 255:
        name, ext = filename.rsplit('.', 1) if '.' in filename else (filename, '')
        filename = name[:255-len(ext)-1] + '.' + ext if ext else name[:255]
    
    return filename