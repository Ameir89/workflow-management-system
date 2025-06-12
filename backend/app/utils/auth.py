### app/utils/auth.py
"""
Authentication utilities
"""
import jwt
import bcrypt
import pyotp
import qrcode
from datetime import datetime, timedelta
from flask import current_app
from app.database import Database
import logging

logger = logging.getLogger(__name__)

class AuthUtils:
    """Authentication utility functions"""
    
    @staticmethod
    def hash_password(password):
        """Hash password using bcrypt"""
        rounds = current_app.config.get('BCRYPT_LOG_ROUNDS', 12)
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds)).decode('utf-8')
    
    @staticmethod
    def verify_password(password, hashed):
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    @staticmethod
    def generate_jwt_token(user_data, token_type='access'):
        """Generate JWT token"""
        expires_delta = (
            current_app.config['JWT_ACCESS_TOKEN_EXPIRES'] 
            if token_type == 'access' 
            else current_app.config['JWT_REFRESH_TOKEN_EXPIRES']
        )
        
        payload = {
            'user_id': str(user_data['id']),
            'tenant_id': str(user_data['tenant_id']),
            'username': user_data['username'],
            'email': user_data['email'],
            'permissions': user_data.get('permissions', []),
            'type': token_type,
            'exp': datetime.utcnow() + expires_delta,
            'iat': datetime.utcnow()
        }
        
        return jwt.encode(payload, current_app.config['JWT_SECRET_KEY'], algorithm='HS256')
    
    @staticmethod
    def verify_jwt_token(token):
        """Verify and decode JWT token"""
        try:
            payload = jwt.decode(token, current_app.config['JWT_SECRET_KEY'], algorithms=['HS256'])
            
            # Check if token is expired
            if datetime.utcnow() > datetime.fromtimestamp(payload['exp']):
                return None
            
            # Verify session exists and is active
            if not AuthUtils.verify_session(payload['user_id'], token):
                return None
            
            return payload
        except jwt.InvalidTokenError:
            return None
    
    @staticmethod
    def verify_session(user_id, token):
        """Verify user session exists and is active"""
        token_hash = AuthUtils.hash_token(token)
        query = """
            SELECT id FROM user_sessions 
            WHERE user_id = %s AND token_hash = %s AND expires_at > NOW()
        """
        result = Database.execute_one(query, (user_id, token_hash))
        return result is not None
    
    @staticmethod
    def create_session(user_id, token, ip_address=None, user_agent=None):
        """Create user session"""
        token_hash = AuthUtils.hash_token(token)
        expires_at = datetime.utcnow() + current_app.config['SESSION_TIMEOUT']
        
        query = """
            INSERT INTO user_sessions (user_id, token_hash, ip_address, user_agent, expires_at)
            VALUES (%s, %s, %s, %s, %s)
        """
        Database.execute_query(query, (user_id, token_hash, ip_address, user_agent, expires_at))
    
    @staticmethod
    def revoke_session(user_id, token):
        """Revoke user session"""
        token_hash = AuthUtils.hash_token(token)
        query = "DELETE FROM user_sessions WHERE user_id = %s AND token_hash = %s"
        Database.execute_query(query, (user_id, token_hash))
    
    @staticmethod
    def hash_token(token):
        """Hash token for storage"""
        return bcrypt.hashpw(token.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    @staticmethod
    def generate_2fa_secret():
        """Generate 2FA secret"""
        return pyotp.random_base32()
    
    @staticmethod
    def verify_2fa_token(secret, token):
        """Verify 2FA token"""
        totp = pyotp.TOTP(secret)
        return totp.verify(token, valid_window=1)
    
    @staticmethod
    def generate_qr_code(secret, email):
        """Generate QR code for 2FA setup"""
        totp_uri = pyotp.totp.TOTP(secret).provisioning_uri(
            email,
            issuer_name="Workflow Management System"
        )
        
        qr = qrcode.QRCode(version=1, box_size=10, border=5)
        qr.add_data(totp_uri)
        qr.make(fit=True)
        
        return qr.make_image(fill_color="black", back_color="white")
    
    @staticmethod
    def check_account_locked(user_id):
        """Check if account is locked"""
        query = """
            SELECT failed_login_attempts, locked_until 
            FROM users 
            WHERE id = %s
        """
        result = Database.execute_one(query, (user_id,))
        
        if not result:
            return False
        
        if result['locked_until'] and datetime.now() < result['locked_until']:
            return True
        
        return False
    
    @staticmethod
    def increment_failed_attempts(user_id):
        """Increment failed login attempts"""
        max_attempts = current_app.config.get('MAX_LOGIN_ATTEMPTS', 5)
        lockout_duration = current_app.config.get('ACCOUNT_LOCKOUT_DURATION')
        
        query = """
            UPDATE users 
            SET failed_login_attempts = failed_login_attempts + 1,
                locked_until = CASE 
                    WHEN failed_login_attempts + 1 >= %s THEN %s 
                    ELSE locked_until 
                END
            WHERE id = %s
        """
        
        locked_until = datetime.now() + lockout_duration if lockout_duration else None
        Database.execute_query(query, (max_attempts, locked_until, user_id))
    
    @staticmethod
    def reset_failed_attempts(user_id):
        """Reset failed login attempts"""
        query = """
            UPDATE users 
            SET failed_login_attempts = 0, locked_until = NULL, last_login = NOW()
            WHERE id = %s
        """
        Database.execute_query(query, (user_id,))

def verify_jwt_token(token):
    """Convenience function for JWT verification"""
    return AuthUtils.verify_jwt_token(token)