# app/services/webhook_init.py - Webhook System Initialization
"""
Webhook system initialization and configuration
This module sets up and configures the complete webhook system
"""
import logging
import threading
import time
from typing import Dict, Any

from app.services.webhook_queue import webhook_queue_manager
from app.services.webhook_events import webhook_event_trigger, webhook_events
from app.services.webhook_delivery import webhook_delivery_service
from app.services.webhook_security import WebhookSecurity
from app.database import Database

logger = logging.getLogger(__name__)


class WebhookSystemManager:
    """Central manager for the webhook system"""
    
    def __init__(self):
        self.initialized = False
        self.queue_processor_thread = None
        self.monitoring_thread = None
        self.cleanup_thread = None
        self.running = False
        self.config = {}
    
    def initialize(self, app_config: Dict[str, Any] = None) -> bool:
        """
        Initialize the webhook system
        
        Args:
            app_config: Application configuration dictionary
        
        Returns:
            True if initialization successful, False otherwise
        """
        try:
            logger.info("Initializing webhook system...")
            
            # Load configuration
            self.config = self._load_webhook_config(app_config)
            
            # Initialize queue manager
            webhook_queue_manager.initialize(
                max_workers=self.config.get('max_workers', 10),
                max_queue_size=self.config.get('max_queue_size', 1000)
            )
            
            # Enable/disable webhook events based on config
            if self.config.get('enable_webhook_events', True):
                webhook_event_trigger.enable()
            else:
                webhook_event_trigger.disable()
            
            # Start background services
            if self.config.get('enable_queue_processing', True):
                self._start_queue_processor()
            
            if self.config.get('enable_monitoring', True):
                self._start_monitoring()
            
            if self.config.get('enable_cleanup', True):
                self._start_cleanup_service()
            
            # Validate webhook URLs on startup
            if self.config.get('validate_urls_on_startup', True):
                self._validate_existing_webhooks()
            
            self.initialized = True
            self.running = True
            
            logger.info("Webhook system initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize webhook system: {e}")
            return False
    
    def shutdown(self) -> None:
        """Shutdown the webhook system gracefully"""
        try:
            logger.info("Shutting down webhook system...")
            
            self.running = False
            
            # Stop queue processing
            webhook_queue_manager.stop_processing()
            
            # Wait for background threads to finish
            threads_to_join = [
                self.queue_processor_thread,
                self.monitoring_thread,
                self.cleanup_thread
            ]
            
            for thread in threads_to_join:
                if thread and thread.is_alive():
                    thread.join(timeout=10)
            
            self.initialized = False
            logger.info("Webhook system shutdown complete")
            
        except Exception as e:
            logger.error(f"Error during webhook system shutdown: {e}")
    
    def get_system_status(self) -> Dict[str, Any]:
        """Get webhook system status"""
        try:
            # Get queue statistics
            queue_stats = webhook_queue_manager.get_stats()
            
            # Get webhook counts by tenant
            webhook_counts = Database.execute_query("""
                SELECT 
                    t.name as tenant_name,
                    COUNT(w.id) as total_webhooks,
                    COUNT(CASE WHEN w.is_active THEN 1 END) as active_webhooks,
                    COUNT(CASE WHEN w.webhook_type = 'incoming' THEN 1 END) as incoming_webhooks,
                    COUNT(CASE WHEN w.webhook_type = 'outgoing' THEN 1 END) as outgoing_webhooks
                FROM tenants t
                LEFT JOIN webhooks w ON t.id = w.tenant_id
                GROUP BY t.id, t.name
                ORDER BY total_webhooks DESC
            """)
            
            # Get recent delivery statistics
            recent_deliveries = Database.execute_one("""
                SELECT 
                    COUNT(*) as total_deliveries_24h,
                    COUNT(CASE WHEN delivered_at IS NOT NULL THEN 1 END) as successful_deliveries_24h,
                    COUNT(CASE WHEN response_status >= 400 THEN 1 END) as failed_deliveries_24h,
                    AVG(execution_time_ms) as avg_response_time_ms
                FROM webhook_deliveries
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            """)
            
            # Get security events count
            security_events = Database.execute_one("""
                SELECT 
                    COUNT(*) as total_events_24h,
                    COUNT(CASE WHEN severity = 'critical' THEN 1 END) as critical_events_24h
                FROM webhook_security_logs
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            """)
            
            return {
                'system_status': {
                    'initialized': self.initialized,
                    'running': self.running,
                    'queue_processor_active': self.queue_processor_thread and self.queue_processor_thread.is_alive(),
                    'monitoring_active': self.monitoring_thread and self.monitoring_thread.is_alive(),
                    'cleanup_active': self.cleanup_thread and self.cleanup_thread.is_alive()
                },
                'configuration': {
                    'max_workers': self.config.get('max_workers', 10),
                    'max_queue_size': self.config.get('max_queue_size', 1000),
                    'webhook_events_enabled': webhook_event_trigger.enabled,
                    'queue_processing_enabled': self.config.get('enable_queue_processing', True),
                    'monitoring_enabled': self.config.get('enable_monitoring', True)
                },
                'queue_statistics': queue_stats,
                'webhook_counts': [dict(count) for count in webhook_counts],
                'delivery_statistics': dict(recent_deliveries) if recent_deliveries else {},
                'security_statistics': dict(security_events) if security_events else {},
                'uptime_seconds': getattr(self, '_start_time', 0) and (time.time() - self._start_time) or 0
            }
            
        except Exception as e:
            logger.error(f"Error getting system status: {e}")
            return {
                'system_status': {'initialized': self.initialized, 'running': self.running},
                'error': str(e)
            }
    
    def _load_webhook_config(self, app_config: Dict[str, Any] = None) -> Dict[str, Any]:
        """Load webhook configuration from app config and environment"""
        import os
        
        default_config = {
            'max_workers': 10,
            'max_queue_size': 1000,
            'enable_webhook_events': True,
            'enable_queue_processing': True,
            'enable_monitoring': True,
            'enable_cleanup': True,
            'validate_urls_on_startup': True,
            'monitoring_interval_seconds': 300,  # 5 minutes
            'cleanup_interval_hours': 24,
            'cleanup_retention_days': 90,
            'max_webhook_timeout': 300,  # 5 minutes
            'default_retry_count': 3,
            'rate_limit_per_hour': 1000,
            'enable_webhook_signatures': True
        }
        
        # Override with app config if provided
        if app_config:
            default_config.update(app_config.get('WEBHOOK_CONFIG', {}))
        
        # Override with environment variables
        env_overrides = {
            'max_workers': int(os.environ.get('WEBHOOK_MAX_WORKERS', default_config['max_workers'])),
            'max_queue_size': int(os.environ.get('WEBHOOK_MAX_QUEUE_SIZE', default_config['max_queue_size'])),
            'enable_webhook_events': os.environ.get('WEBHOOK_ENABLE_EVENTS', 'true').lower() == 'true',
            'enable_queue_processing': os.environ.get('WEBHOOK_ENABLE_QUEUE_PROCESSING', 'true').lower() == 'true',
            'monitoring_interval_seconds': int(os.environ.get('WEBHOOK_MONITORING_INTERVAL', default_config['monitoring_interval_seconds'])),
            'cleanup_interval_hours': int(os.environ.get('WEBHOOK_CLEANUP_INTERVAL_HOURS', default_config['cleanup_interval_hours'])),
            'cleanup_retention_days': int(os.environ.get('WEBHOOK_CLEANUP_RETENTION_DAYS', default_config['cleanup_retention_days']))
        }
        
        default_config.update(env_overrides)
        return default_config
    
    def _start_queue_processor(self) -> None:
        """Start the webhook queue processor"""
        try:
            webhook_queue_manager.start_processing()
            logger.info("Webhook queue processor started")
        except Exception as e:
            logger.error(f"Failed to start queue processor: {e}")
    
    def _start_monitoring(self) -> None:
        """Start webhook monitoring service"""
        def monitoring_loop():
            logger.info("Starting webhook monitoring service")
            self._start_time = time.time()
            
            while self.running:
                try:
                    self._perform_monitoring_checks()
                    time.sleep(self.config['monitoring_interval_seconds'])
                except Exception as e:
                    logger.error(f"Error in monitoring loop: {e}")
                    time.sleep(60)  # Wait a minute before retrying
        
        self.monitoring_thread = threading.Thread(target=monitoring_loop, daemon=True)
        self.monitoring_thread.start()
    
    def _start_cleanup_service(self) -> None:
        """Start cleanup service for old webhook data"""
        def cleanup_loop():
            logger.info("Starting webhook cleanup service")
            
            while self.running:
                try:
                    # Wait for the interval
                    time.sleep(self.config['cleanup_interval_hours'] * 3600)
                    
                    if not self.running:
                        break
                    
                    self._perform_cleanup()
                    
                except Exception as e:
                    logger.error(f"Error in cleanup loop: {e}")
                    time.sleep(3600)  # Wait an hour before retrying
        
        self.cleanup_thread = threading.Thread(target=cleanup_loop, daemon=True)
        self.cleanup_thread.start()
    
    def _perform_monitoring_checks(self) -> None:
        """Perform webhook monitoring checks"""
        try:
            # Check for unhealthy webhooks
            unhealthy_webhooks = Database.execute_query("""
                SELECT w.id, w.name, w.tenant_id, w.failure_count,
                       t.name as tenant_name
                FROM webhooks w
                JOIN tenants t ON w.tenant_id = t.id
                WHERE w.is_active = true 
                AND w.failure_count > 5
                AND w.last_triggered_at > NOW() - INTERVAL '1 hour'
            """)
            
            if unhealthy_webhooks:
                logger.warning(f"Found {len(unhealthy_webhooks)} unhealthy webhooks")
                # Could send alerts here
            
            # Check queue backlog
            queue_stats = webhook_queue_manager.get_stats()
            backlog_size = queue_stats.get('pending_jobs', 0) + queue_stats.get('retrying_jobs', 0)
            
            if backlog_size > 100:
                logger.warning(f"Webhook queue backlog is high: {backlog_size} jobs pending")
            
            # Check for security incidents
            recent_security_events = Database.execute_one("""
                SELECT COUNT(*) as count
                FROM webhook_security_logs
                WHERE severity IN ('error', 'critical')
                AND created_at >= NOW() - INTERVAL '1 hour'
            """)
            
            if recent_security_events and recent_security_events['count'] > 10:
                logger.warning(f"High number of security events: {recent_security_events['count']} in last hour")
            
        except Exception as e:
            logger.error(f"Error performing monitoring checks: {e}")
    
    def _perform_cleanup(self) -> None:
        """Perform cleanup of old webhook data"""
        try:
            logger.info("Starting webhook data cleanup")
            
            # Use the database cleanup function
            result = Database.execute_one("""
                SELECT * FROM cleanup_webhook_data(%s)
            """, (self.config['cleanup_retention_days'],))
            
            if result:
                logger.info(f"Cleanup completed: "
                           f"deliveries={result['deliveries_deleted']}, "
                           f"received_data={result['received_data_deleted']}, "
                           f"security_logs={result['security_logs_deleted']}, "
                           f"monitoring={result['monitoring_deleted']}, "
                           f"event_logs={result['event_logs_deleted']}, "
                           f"queue_jobs={result['queue_jobs_deleted']}")
            
            # Clean up old rate limit records
            Database.execute_query("""
                DELETE FROM webhook_rate_limits
                WHERE window_start < NOW() - INTERVAL '7 days'
            """)
            
        except Exception as e:
            logger.error(f"Error performing cleanup: {e}")
    
    def _validate_existing_webhooks(self) -> None:
        """Validate existing webhook URLs on startup"""
        try:
            logger.info("Validating existing webhook URLs")
            
            webhooks = Database.execute_query("""
                SELECT id, name, url, tenant_id FROM webhooks 
                WHERE is_active = true
            """)
            
            invalid_count = 0
            for webhook in webhooks:
                try:
                    is_valid, error_msg = WebhookSecurity.validate_webhook_url(webhook['url'])
                    if not is_valid:
                        logger.warning(f"Invalid webhook URL found: {webhook['name']} ({webhook['id']}): {error_msg}")
                        invalid_count += 1
                        
                        # Optionally disable invalid webhooks
                        if self.config.get('disable_invalid_webhooks_on_startup', False):
                            Database.execute_query("""
                                UPDATE webhooks SET is_active = false WHERE id = %s
                            """, (webhook['id'],))
                            logger.info(f"Disabled invalid webhook: {webhook['name']}")
                            
                except Exception as e:
                    logger.error(f"Error validating webhook {webhook['id']}: {e}")
                    invalid_count += 1
            
            if invalid_count > 0:
                logger.warning(f"Found {invalid_count} invalid webhooks during startup validation")
            else:
                logger.info("All webhook URLs are valid")
                
        except Exception as e:
            logger.error(f"Error validating existing webhooks: {e}")


# Global webhook system manager
webhook_system = WebhookSystemManager()


# Integration with Flask app initialization
def init_webhook_system(app):
    """
    Initialize webhook system with Flask app
    
    Usage in app/__init__.py:
        from app.services.webhook_init import init_webhook_system
        init_webhook_system(app)
    """
    try:
        # Initialize the webhook system
        webhook_system.initialize(app.config)
        
        # Register cleanup on app teardown
        @app.teardown_appcontext
        def cleanup_webhook_system(error):
            if error:
                logger.error(f"App context error: {error}")
        
        # Register graceful shutdown
        import atexit
        atexit.register(webhook_system.shutdown)
        
        # Add webhook system status to app
        app.webhook_system = webhook_system
        
        logger.info("Webhook system integrated with Flask app")
        
    except Exception as e:
        logger.error(f"Failed to initialize webhook system with Flask app: {e}")
        raise


# Health check function for webhook system
def webhook_system_health_check():
    """
    Health check function for webhook system
    
    Returns:
        Dictionary with health status and details
    """
    try:
        if not webhook_system.initialized:
            return {
                'status': 'unhealthy',
                'message': 'Webhook system not initialized',
                'details': {}
            }
        
        status = webhook_system.get_system_status()
        system_status = status.get('system_status', {})
        
        # Determine overall health
        is_healthy = (
            system_status.get('running', False) and
            system_status.get('queue_processor_active', False) and
            not status.get('error')
        )
        
        return {
            'status': 'healthy' if is_healthy else 'unhealthy',
            'message': 'Webhook system operational' if is_healthy else 'Webhook system has issues',
            'details': status
        }
        
    except Exception as e:
        return {
            'status': 'unhealthy',
            'message': f'Error checking webhook system health: {str(e)}',
            'details': {}
        }


# Configuration validation
def validate_webhook_config(config: Dict[str, Any]) -> Dict[str, Any]:
    """
    Validate webhook configuration
    
    Args:
        config: Configuration dictionary
    
    Returns:
        Dictionary with validation results
    """
    errors = []
    warnings = []
    
    # Validate required settings
    if config.get('max_workers', 0) < 1:
        errors.append("max_workers must be at least 1")
    
    if config.get('max_workers', 0) > 50:
        warnings.append("max_workers > 50 may consume excessive resources")
    
    if config.get('max_queue_size', 0) < 100:
        warnings.append("max_queue_size < 100 may cause queue to fill quickly")
    
    if config.get('cleanup_retention_days', 0) < 7:
        warnings.append("cleanup_retention_days < 7 may delete data too aggressively")
    
    # Validate intervals
    if config.get('monitoring_interval_seconds', 0) < 60:
        warnings.append("monitoring_interval_seconds < 60 may cause excessive monitoring overhead")
    
    if config.get('cleanup_interval_hours', 0) < 1:
        errors.append("cleanup_interval_hours must be at least 1")
    
    return {
        'valid': len(errors) == 0,
        'errors': errors,
        'warnings': warnings
    }


# Webhook system metrics for monitoring
def get_webhook_metrics():
    """
    Get webhook system metrics for monitoring/alerting systems
    
    Returns:
        Dictionary with key metrics
    """
    try:
        status = webhook_system.get_system_status()
        
        # Extract key metrics
        queue_stats = status.get('queue_statistics', {})
        delivery_stats = status.get('delivery_statistics', {})
        security_stats = status.get('security_statistics', {})
        
        return {
            'webhook_system_up': 1 if status.get('system_status', {}).get('running') else 0,
            'webhook_queue_size': queue_stats.get('pending_jobs', 0) + queue_stats.get('retrying_jobs', 0),
            'webhook_deliveries_24h': delivery_stats.get('total_deliveries_24h', 0),
            'webhook_success_rate_24h': (
                (delivery_stats.get('successful_deliveries_24h', 0) / 
                 max(delivery_stats.get('total_deliveries_24h', 1), 1)) * 100
            ),
            'webhook_avg_response_time_ms': delivery_stats.get('avg_response_time_ms', 0),
            'webhook_security_events_24h': security_stats.get('total_events_24h', 0),
            'webhook_critical_security_events_24h': security_stats.get('critical_events_24h', 0),
            'webhook_failed_deliveries_24h': delivery_stats.get('failed_deliveries_24h', 0),
            'webhook_system_uptime_seconds': status.get('uptime_seconds', 0)
        }
        
    except Exception as e:
        logger.error(f"Error getting webhook metrics: {e}")
        return {
            'webhook_system_up': 0,
            'error': str(e)
        }