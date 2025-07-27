# app/services/webhook_security.py - Enhanced Security Service
"""
Enhanced webhook security service with comprehensive validation and protection
"""
import hashlib
import hmac
import ipaddress
import time
import json
import re
from datetime import datetime, timedelta
from urllib.parse import urlparse
from typing import Dict, List, Tuple, Optional
import logging

from app.database import Database

logger = logging.getLogger(__name__)


class WebhookSecurity:
    """Enhanced webhook security and validation service"""
    
    # Private IP ranges to block
    PRIVATE_IP_RANGES = [
        ipaddress.ip_network('10.0.0.0/8'),
        ipaddress.ip_network('172.16.0.0/12'),
        ipaddress.ip_network('192.168.0.0/16'),
        ipaddress.ip_network('127.0.0.0/8'),
        ipaddress.ip_network('169.254.0.0/16'),  # AWS metadata
        ipaddress.ip_network('::1/128'),  # IPv6 localhost
        ipaddress.ip_network('fc00::/7'),  # IPv6 private
    ]
    
    # Dangerous ports to block
    BLOCKED_PORTS = [
        22,    # SSH
        25,    # SMTP
        53,    # DNS
        110,   # POP3
        143,   # IMAP
        993,   # IMAPS
        995,   # POP3S
        1433,  # SQL Server
        3306,  # MySQL
        5432,  # PostgreSQL
        6379,  # Redis
        27017, # MongoDB
    ]

    @staticmethod
    def verify_signature(secret: str, payload: bytes, headers: Dict, 
                        timestamp_tolerance: int = 300) -> bool:
        """
        Verify webhook signature with timestamp validation
        
        Args:
            secret: Webhook secret key
            payload: Raw request payload
            headers: Request headers
            timestamp_tolerance: Maximum age in seconds for timestamp validation
        """
        try:
            # Get signature from headers (support multiple formats)
            signature_header = (
                headers.get('X-Webhook-Signature') or
                headers.get('X-Hub-Signature-256') or
                headers.get('X-Signature-256') or
                headers.get('Signature')
            )
            
            if not signature_header:
                logger.warning("No signature header found")
                return False

            # Extract signature
            if signature_header.startswith('sha256='):
                provided_signature = signature_header[7:]
                algorithm = 'sha256'
            elif signature_header.startswith('sha1='):
                provided_signature = signature_header[5:]
                algorithm = 'sha1'
            elif '=' in signature_header:
                algorithm, provided_signature = signature_header.split('=', 1)
            else:
                provided_signature = signature_header
                algorithm = 'sha256'  # Default
            
            # Validate timestamp if present
            timestamp_header = headers.get('X-Timestamp')
            if timestamp_header:
                try:
                    request_timestamp = int(timestamp_header)
                    current_timestamp = int(time.time())
                    
                    if abs(current_timestamp - request_timestamp) > timestamp_tolerance:
                        logger.warning(f"Request timestamp too old: {request_timestamp}")
                        return False
                        
                    # Include timestamp in signature validation
                    payload_to_verify = f"{timestamp_header}.{payload.decode('utf-8', errors='ignore')}"
                    payload = payload_to_verify.encode('utf-8')
                except (ValueError, TypeError):
                    logger.warning(f"Invalid timestamp header: {timestamp_header}")
                    return False

            # Calculate expected signature
            if algorithm == 'sha256':
                expected_signature = hmac.new(
                    secret.encode(), payload, hashlib.sha256
                ).hexdigest()
            elif algorithm == 'sha1':
                expected_signature = hmac.new(
                    secret.encode(), payload, hashlib.sha1
                ).hexdigest()
            else:
                logger.warning(f"Unsupported signature algorithm: {algorithm}")
                return False

            # Compare signatures securely
            is_valid = hmac.compare_digest(provided_signature, expected_signature)
            
            if not is_valid:
                logger.warning(f"Signature verification failed. Expected: {expected_signature}, Got: {provided_signature}")
            
            return is_valid

        except Exception as e:
            logger.error(f"Error verifying webhook signature: {e}")
            return False

    @staticmethod
    def validate_webhook_url(url: str, allow_private: bool = False, 
                           environment: str = 'production') -> Tuple[bool, str]:
        """
        Enhanced webhook URL validation with detailed error messages
        
        Args:
            url: URL to validate
            allow_private: Whether to allow private IP addresses
            environment: Environment context (development, staging, production)
        
        Returns:
            Tuple of (is_valid, error_message)
        """
        try:
            if not url:
                return False, "URL cannot be empty"
            
            if len(url) > 2000:
                return False, "URL too long (max 2000 characters)"
            
            # Parse URL
            try:
                parsed = urlparse(url)
            except Exception:
                return False, "Invalid URL format"
            
            # Validate scheme
            allowed_schemes = ['https']
            if environment == 'development':
                allowed_schemes.append('http')
            
            if parsed.scheme not in allowed_schemes:
                if environment == 'production':
                    return False, "HTTPS required in production environment"
                else:
                    return False, f"Invalid scheme: {parsed.scheme}. Allowed: {allowed_schemes}"
            
            # Validate hostname
            if not parsed.hostname:
                return False, "Missing hostname in URL"
            
            # Check for suspicious patterns
            suspicious_patterns = [
                r'localhost',
                r'127\.0\.0\.1',
                r'0\.0\.0\.0',
                r'::1',
                r'metadata\.google\.internal',
                r'169\.254\.169\.254',  # AWS metadata
                r'metadata\.azure\.com',  # Azure metadata
            ]
            
            hostname_lower = parsed.hostname.lower()
            for pattern in suspicious_patterns:
                if re.search(pattern, hostname_lower):
                    if not allow_private:
                        return False, f"Suspicious hostname detected: {parsed.hostname}"
            
            # Validate IP addresses
            try:
                ip = ipaddress.ip_address(parsed.hostname)
                if not allow_private:
                    for private_range in WebhookSecurity.PRIVATE_IP_RANGES:
                        if ip in private_range:
                            return False, f"Private IP address not allowed: {parsed.hostname}"
            except ValueError:
                # Not an IP address, continue with hostname validation
                pass
            
            # Validate port
            if parsed.port:
                if parsed.port in WebhookSecurity.BLOCKED_PORTS:
                    return False, f"Port {parsed.port} is not allowed for security reasons"
                
                if parsed.port < 1 or parsed.port > 65535:
                    return False, f"Invalid port number: {parsed.port}"
            
            # Additional security checks
            if parsed.username or parsed.password:
                return False, "URLs with embedded credentials are not allowed"
            
            # Check for valid TLD (basic check)
            if '.' in parsed.hostname and not parsed.hostname.replace('.', '').isdigit():
                tld = parsed.hostname.split('.')[-1]
                if len(tld) < 2:
                    return False, "Invalid top-level domain"
            
            return True, "URL is valid"
            
        except Exception as e:
            logger.error(f"Error validating webhook URL: {e}")
            return False, f"Validation error: {str(e)}"

    @staticmethod
    def check_rate_limit(webhook_id: str, client_ip: str, 
                        limit: int = 100, window: int = 3600) -> Tuple[bool, Dict]:
        """
        Enhanced rate limiting with detailed metrics
        
        Args:
            webhook_id: Webhook identifier
            client_ip: Client IP address
            limit: Maximum requests per window
            window: Time window in seconds
        
        Returns:
            Tuple of (is_allowed, rate_limit_info)
        """
        try:
            current_time = datetime.now()
            window_start = current_time - timedelta(seconds=window)
            
            # Get or create rate limit record
            rate_limit_record = Database.execute_one("""
                SELECT * FROM webhook_rate_limits
                WHERE webhook_id = %s AND client_ip = %s
            """, (webhook_id, client_ip))
            
            if not rate_limit_record:
                # Create new record
                Database.execute_insert("""
                    INSERT INTO webhook_rate_limits 
                    (webhook_id, client_ip, request_count, window_start, last_request)
                    VALUES (%s, %s, 1, %s, %s)
                """, (webhook_id, client_ip, current_time, current_time))
                
                return True, {
                    'allowed': True,
                    'limit': limit,
                    'remaining': limit - 1,
                    'reset_time': (current_time + timedelta(seconds=window)).isoformat(),
                    'window_seconds': window
                }
            
            # Check if window has expired
            if rate_limit_record['window_start'] < window_start:
                # Reset window
                Database.execute_query("""
                    UPDATE webhook_rate_limits
                    SET request_count = 1, window_start = %s, last_request = %s, blocked_until = NULL
                    WHERE webhook_id = %s AND client_ip = %s
                """, (current_time, current_time, webhook_id, client_ip))
                
                return True, {
                    'allowed': True,
                    'limit': limit,
                    'remaining': limit - 1,
                    'reset_time': (current_time + timedelta(seconds=window)).isoformat(),
                    'window_seconds': window
                }
            
            # Check if currently blocked
            if (rate_limit_record['blocked_until'] and 
                rate_limit_record['blocked_until'] > current_time):
                return False, {
                    'allowed': False,
                    'limit': limit,
                    'remaining': 0,
                    'reset_time': rate_limit_record['blocked_until'].isoformat(),
                    'window_seconds': window,
                    'blocked_until': rate_limit_record['blocked_until'].isoformat()
                }
            
            # Check rate limit
            if rate_limit_record['request_count'] >= limit:
                # Block for remaining window time
                block_until = rate_limit_record['window_start'] + timedelta(seconds=window)
                
                Database.execute_query("""
                    UPDATE webhook_rate_limits
                    SET blocked_until = %s
                    WHERE webhook_id = %s AND client_ip = %s
                """, (block_until, webhook_id, client_ip))
                
                # Log rate limit exceeded
                WebhookSecurity.log_security_event(
                    webhook_id, client_ip, 'rate_limit_exceeded',
                    {'limit': limit, 'window': window, 'request_count': rate_limit_record['request_count']},
                    'warning'
                )
                
                return False, {
                    'allowed': False,
                    'limit': limit,
                    'remaining': 0,
                    'reset_time': block_until.isoformat(),
                    'window_seconds': window,
                    'blocked_until': block_until.isoformat()
                }
            
            # Increment counter
            new_count = rate_limit_record['request_count'] + 1
            Database.execute_query("""
                UPDATE webhook_rate_limits
                SET request_count = %s, last_request = %s
                WHERE webhook_id = %s AND client_ip = %s
            """, (new_count, current_time, webhook_id, client_ip))
            
            return True, {
                'allowed': True,
                'limit': limit,
                'remaining': limit - new_count,
                'reset_time': (rate_limit_record['window_start'] + timedelta(seconds=window)).isoformat(),
                'window_seconds': window
            }
            
        except Exception as e:
            logger.error(f"Error checking rate limit: {e}")
            # On error, allow the request but log the issue
            return True, {
                'allowed': True,
                'limit': limit,
                'remaining': limit,
                'error': str(e)
            }

    @staticmethod
    def validate_payload(payload: bytes, content_type: str, 
                        max_size: int = 10 * 1024 * 1024) -> Tuple[bool, str, Dict]:
        """
        Validate webhook payload
        
        Args:
            payload: Raw payload bytes
            content_type: Content-Type header
            max_size: Maximum payload size in bytes
        
        Returns:
            Tuple of (is_valid, error_message, parsed_payload)
        """
        try:
            # Size validation
            if len(payload) > max_size:
                return False, f"Payload too large: {len(payload)} bytes (max: {max_size})", {}
            
            if len(payload) == 0:
                return False, "Empty payload not allowed", {}
            
            # Content type validation
            if not content_type:
                return False, "Missing Content-Type header", {}
            
            parsed_payload = {}
            
            if content_type.startswith('application/json'):
                try:
                    parsed_payload = json.loads(payload.decode('utf-8'))
                except json.JSONDecodeError as e:
                    return False, f"Invalid JSON: {str(e)}", {}
                except UnicodeDecodeError:
                    return False, "Invalid UTF-8 encoding", {}
            
            elif content_type.startswith('application/x-www-form-urlencoded'):
                try:
                    from urllib.parse import parse_qs
                    decoded_payload = payload.decode('utf-8')
                    parsed_payload = parse_qs(decoded_payload)
                    # Flatten single-item lists
                    for key, value in parsed_payload.items():
                        if isinstance(value, list) and len(value) == 1:
                            parsed_payload[key] = value[0]
                except Exception as e:
                    return False, f"Invalid form data: {str(e)}", {}
            
            else:
                # For other content types, store as raw string
                try:
                    parsed_payload = {'raw': payload.decode('utf-8', errors='replace')}
                except Exception:
                    parsed_payload = {'raw': payload.hex()}
            
            # Basic structure validation for JSON
            if isinstance(parsed_payload, dict):
                # Check for suspicious patterns
                suspicious_keys = ['__proto__', 'constructor', 'prototype']
                for key in suspicious_keys:
                    if key in parsed_payload:
                        return False, f"Suspicious key in payload: {key}", {}
            
            return True, "Payload is valid", parsed_payload
            
        except Exception as e:
            logger.error(f"Error validating payload: {e}")
            return False, f"Validation error: {str(e)}", {}

    @staticmethod
    def log_security_event(webhook_id: Optional[str], client_ip: str, 
                          event_type: str, details: Dict, 
                          severity: str = 'warning') -> None:
        """
        Log security events for monitoring and analysis
        
        Args:
            webhook_id: Webhook identifier (can be None for general events)
            client_ip: Client IP address
            event_type: Type of security event
            details: Additional event details
            severity: Event severity level
        """
        try:
            Database.execute_insert("""
                INSERT INTO webhook_security_logs
                (webhook_id, client_ip, event_type, details, severity)
                VALUES (%s, %s, %s, %s, %s)
            """, (webhook_id, client_ip, event_type, json.dumps(details), severity))
            
            # Log to application logger based on severity
            log_message = f"Webhook security event: {event_type} from {client_ip}"
            if webhook_id:
                log_message += f" for webhook {webhook_id}"
            
            if severity == 'critical':
                logger.critical(log_message, extra={'details': details})
            elif severity == 'error':
                logger.error(log_message, extra={'details': details})
            elif severity == 'warning':
                logger.warning(log_message, extra={'details': details})
            else:
                logger.info(log_message, extra={'details': details})
                
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")

    @staticmethod
    def get_client_info(headers: Dict, client_ip: str) -> Dict:
        """
        Extract client information for security analysis
        
        Args:
            headers: Request headers
            client_ip: Client IP address
        
        Returns:
            Dictionary with client information
        """
        return {
            'ip': client_ip,
            'user_agent': headers.get('User-Agent', ''),
            'x_forwarded_for': headers.get('X-Forwarded-For', ''),
            'x_real_ip': headers.get('X-Real-IP', ''),
            'origin': headers.get('Origin', ''),
            'referer': headers.get('Referer', ''),
            'accept': headers.get('Accept', ''),
            'accept_language': headers.get('Accept-Language', ''),
            'content_length': headers.get('Content-Length', ''),
            'timestamp': datetime.now().isoformat()
        }

    @staticmethod
    def is_ip_whitelisted(ip: str, webhook_id: str) -> bool:
        """
        Check if IP is in webhook whitelist
        
        Args:
            ip: IP address to check
            webhook_id: Webhook identifier
        
        Returns:
            True if IP is whitelisted or no whitelist exists
        """
        try:
            webhook = Database.execute_one("""
                SELECT headers FROM webhooks WHERE id = %s
            """, (webhook_id,))
            
            if not webhook or not webhook['headers']:
                return True  # No restrictions
            
            try:
                headers_config = json.loads(webhook['headers'])
                whitelist = headers_config.get('ip_whitelist', [])
                
                if not whitelist:
                    return True  # No whitelist configured
                
                client_ip = ipaddress.ip_address(ip)
                
                for allowed_ip in whitelist:
                    try:
                        if '/' in allowed_ip:
                            # CIDR notation
                            if client_ip in ipaddress.ip_network(allowed_ip):
                                return True
                        else:
                            # Single IP
                            if client_ip == ipaddress.ip_address(allowed_ip):
                                return True
                    except ValueError:
                        logger.warning(f"Invalid IP in whitelist: {allowed_ip}")
                        continue
                
                return False
                
            except json.JSONDecodeError:
                return True  # Invalid config, allow by default
            
        except Exception as e:
            logger.error(f"Error checking IP whitelist: {e}")
            return True  # On error, allow by default

    @staticmethod
    def cleanup_old_security_logs(days_to_keep: int = 30) -> int:
        """
        Clean up old security logs
        
        Args:
            days_to_keep: Number of days to keep logs
        
        Returns:
            Number of records deleted
        """
        try:
            result = Database.execute_query("""
                DELETE FROM webhook_security_logs
                WHERE created_at < NOW() - INTERVAL '%s days'
            """, (days_to_keep,))
            
            deleted_count = result if result else 0
            logger.info(f"Cleaned up {deleted_count} old security log entries")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up security logs: {e}")
            return 0