# app/services/webhook_queue.py - Webhook Queue Management System
"""
Webhook queue management system for handling high-volume webhook processing,
retry logic, and asynchronous processing
"""
import asyncio
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import logging
import requests
from dataclasses import dataclass
from enum import Enum

from app.database import Database
from app.services.webhook_security import WebhookSecurity
from app.services.notification_service import NotificationService

logger = logging.getLogger(__name__)


class WebhookStatus(Enum):
    """Webhook delivery status enumeration"""
    PENDING = "pending"
    PROCESSING = "processing"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETRYING = "retrying"
    CANCELLED = "cancelled"


@dataclass
class WebhookJob:
    """Webhook job data structure"""
    id: str
    webhook_id: str
    event_type: str
    payload: Dict
    headers: Dict
    url: str
    retry_count: int = 0
    max_retries: int = 3
    timeout: int = 30
    priority: int = 5  # 1-10, higher number = higher priority
    created_at: datetime = None
    scheduled_at: datetime = None
    status: WebhookStatus = WebhookStatus.PENDING
    error_message: str = None
    metadata: Dict = None
    
    def __post_init__(self):
        if self.created_at is None:
            self.created_at = datetime.now()
        if self.scheduled_at is None:
            self.scheduled_at = datetime.now()
        if self.metadata is None:
            self.metadata = {}


class WebhookQueue:
    """High-performance webhook queue with retry logic and load balancing"""
    
    def __init__(self, max_workers: int = 10, max_queue_size: int = 1000):
        self.max_workers = max_workers
        self.max_queue_size = max_queue_size
        self.queue_lock = Lock()
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.running = False
        self.stats = {
            'processed': 0,
            'failed': 0,
            'retried': 0,
            'cancelled': 0,
            'queue_size': 0
        }
    
    def enqueue_webhook(self, webhook_job: WebhookJob) -> bool:
        """
        Add webhook job to the queue
        
        Args:
            webhook_job: WebhookJob instance
        
        Returns:
            True if successfully enqueued, False otherwise
        """
        try:
            with self.queue_lock:
                # Check queue size limit
                current_queue_size = self._get_queue_size()
                if current_queue_size >= self.max_queue_size:
                    logger.warning(f"Queue full, dropping webhook job {webhook_job.id}")
                    return False
                
                # Insert into database queue
                success = Database.execute_insert("""
                    INSERT INTO webhook_queue 
                    (id, webhook_id, event_type, payload, headers, url, 
                     retry_count, max_retries, timeout_seconds, priority, 
                     status, scheduled_at, metadata)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, (
                    webhook_job.id, webhook_job.webhook_id, webhook_job.event_type,
                    json.dumps(webhook_job.payload), json.dumps(webhook_job.headers),
                    webhook_job.url, webhook_job.retry_count, webhook_job.max_retries,
                    webhook_job.timeout, webhook_job.priority, webhook_job.status.value,
                    webhook_job.scheduled_at, json.dumps(webhook_job.metadata)
                ))
                
                if success:
                    self.stats['queue_size'] += 1
                    logger.info(f"Enqueued webhook job {webhook_job.id} for webhook {webhook_job.webhook_id}")
                    return True
                else:
                    logger.error(f"Failed to enqueue webhook job {webhook_job.id}")
                    return False
                    
        except Exception as e:
            logger.error(f"Error enqueuing webhook job: {e}")
            return False
    
    def process_queue(self) -> None:
        """Process webhook jobs from the queue"""
        if self.running:
            return
        
        self.running = True
        logger.info("Starting webhook queue processor")
        
        try:
            while self.running:
                # Get pending jobs
                jobs = self._get_pending_jobs()
                
                if not jobs:
                    time.sleep(1)  # Wait before checking again
                    continue
                
                # Process jobs concurrently
                future_to_job = {}
                for job in jobs:
                    future = self.executor.submit(self._process_webhook_job, job)
                    future_to_job[future] = job
                
                # Wait for completion
                for future in as_completed(future_to_job):
                    job = future_to_job[future]
                    try:
                        result = future.result()
                        self._handle_job_result(job, result)
                    except Exception as e:
                        logger.error(f"Error processing webhook job {job.id}: {e}")
                        self._handle_job_failure(job, str(e))
                
        except Exception as e:
            logger.error(f"Webhook queue processor error: {e}")
        finally:
            self.running = False
            logger.info("Webhook queue processor stopped")
    
    def stop_processing(self) -> None:
        """Stop the queue processor"""
        self.running = False
        self.executor.shutdown(wait=True)
    
    def _get_pending_jobs(self, limit: int = None) -> List[WebhookJob]:
        """Get pending webhook jobs from database"""
        if limit is None:
            limit = self.max_workers
        
        try:
            jobs_data = Database.execute_query("""
                SELECT * FROM webhook_queue
                WHERE status IN ('pending', 'retrying')
                AND scheduled_at <= NOW()
                ORDER BY priority DESC, created_at ASC
                LIMIT %s
            """, (limit,))
            
            jobs = []
            for job_data in jobs_data:
                job = WebhookJob(
                    id=job_data['id'],
                    webhook_id=job_data['webhook_id'],
                    event_type=job_data['event_type'],
                    payload=json.loads(job_data['payload']),
                    headers=json.loads(job_data['headers']),
                    url=job_data['url'],
                    retry_count=job_data['retry_count'],
                    max_retries=job_data['max_retries'],
                    timeout=job_data['timeout_seconds'],
                    priority=job_data['priority'],
                    created_at=job_data['created_at'],
                    scheduled_at=job_data['scheduled_at'],
                    status=WebhookStatus(job_data['status']),
                    metadata=json.loads(job_data.get('metadata', '{}'))
                )
                jobs.append(job)
            
            return jobs
            
        except Exception as e:
            logger.error(f"Error getting pending jobs: {e}")
            return []
    
    def _process_webhook_job(self, job: WebhookJob) -> Dict:
        """
        Process a single webhook job
        
        Args:
            job: WebhookJob to process
        
        Returns:
            Processing result dictionary
        """
        start_time = time.time()
        
        try:
            # Update job status to processing
            self._update_job_status(job.id, WebhookStatus.PROCESSING)
            
            # Prepare request
            headers = job.headers.copy()
            headers.setdefault('Content-Type', 'application/json')
            headers.setdefault('User-Agent', 'WorkflowManagement-Webhook/2.0')
            headers.setdefault('X-Event-Type', job.event_type)
            headers.setdefault('X-Delivery-ID', job.id)
            headers.setdefault('X-Retry-Count', str(job.retry_count))
            
            # Add timestamp
            timestamp = str(int(time.time()))
            headers['X-Timestamp'] = timestamp
            
            # Add signature if webhook has secret
            webhook_config = self._get_webhook_config(job.webhook_id)
            if webhook_config and webhook_config.get('secret'):
                signature = self._generate_signature(
                    webhook_config['secret'], 
                    json.dumps(job.payload), 
                    timestamp
                )
                headers['X-Webhook-Signature'] = f'sha256={signature}'
            
            # Make HTTP request
            response = requests.post(
                job.url,
                json=job.payload,
                headers=headers,
                timeout=job.timeout,
                verify=True,
                allow_redirects=False
            )
            
            execution_time = int((time.time() - start_time) * 1000)
            
            # Process response
            if 200 <= response.status_code < 300:
                return {
                    'success': True,
                    'status_code': response.status_code,
                    'response_body': response.text[:1000],  # Limit response size
                    'execution_time_ms': execution_time,
                    'headers': dict(response.headers)
                }
            else:
                return {
                    'success': False,
                    'status_code': response.status_code,
                    'response_body': response.text[:1000],
                    'execution_time_ms': execution_time,
                    'error': f'HTTP {response.status_code}: {response.reason}'
                }
                
        except requests.exceptions.Timeout:
            execution_time = int((time.time() - start_time) * 1000)
            return {
                'success': False,
                'status_code': 0,
                'error': 'Request timeout',
                'execution_time_ms': execution_time
            }
        except requests.exceptions.ConnectionError as e:
            execution_time = int((time.time() - start_time) * 1000)
            return {
                'success': False,
                'status_code': 0,
                'error': f'Connection error: {str(e)}',
                'execution_time_ms': execution_time
            }
        except Exception as e:
            execution_time = int((time.time() - start_time) * 1000)
            return {
                'success': False,
                'status_code': 0,
                'error': f'Unexpected error: {str(e)}',
                'execution_time_ms': execution_time
            }
    
    def _handle_job_result(self, job: WebhookJob, result: Dict) -> None:
        """Handle the result of a webhook job"""
        try:
            if result['success']:
                # Successful delivery
                self._record_delivery(job, result)
                self._update_job_status(job.id, WebhookStatus.DELIVERED)
                self._remove_from_queue(job.id)
                self.stats['processed'] += 1
                
                logger.info(f"Webhook job {job.id} delivered successfully")
                
            else:
                # Failed delivery
                self._handle_job_failure(job, result.get('error', 'Unknown error'), result)
        
        except Exception as e:
            logger.error(f"Error handling job result for {job.id}: {e}")
    
    def _handle_job_failure(self, job: WebhookJob, error_message: str, 
                           result: Dict = None) -> None:
        """Handle webhook job failure and retry logic"""
        try:
            job.retry_count += 1
            
            # Record the failed attempt
            if result:
                self._record_delivery(job, result)
            
            if job.retry_count < job.max_retries:
                # Schedule retry with exponential backoff
                delay_seconds = min(300, 2 ** job.retry_count * 10)  # Max 5 minutes
                retry_time = datetime.now() + timedelta(seconds=delay_seconds)
                
                Database.execute_query("""
                    UPDATE webhook_queue
                    SET retry_count = %s, status = %s, scheduled_at = %s,
                        error_message = %s, updated_at = NOW()
                    WHERE id = %s
                """, (job.retry_count, WebhookStatus.RETRYING.value, 
                      retry_time, error_message, job.id))
                
                self.stats['retried'] += 1
                logger.warning(f"Webhook job {job.id} failed, retry {job.retry_count}/{job.max_retries} scheduled for {retry_time}")
                
            else:
                # Max retries reached, mark as failed
                self._update_job_status(job.id, WebhookStatus.FAILED, error_message)
                self._remove_from_queue(job.id)
                self.stats['failed'] += 1
                
                # Send failure notification
                self._send_failure_notification(job, error_message)
                
                logger.error(f"Webhook job {job.id} failed permanently after {job.retry_count} attempts: {error_message}")
        
        except Exception as e:
            logger.error(f"Error handling job failure for {job.id}: {e}")
    
    def _update_job_status(self, job_id: str, status: WebhookStatus, 
                          error_message: str = None) -> None:
        """Update job status in database"""
        try:
            Database.execute_query("""
                UPDATE webhook_queue
                SET status = %s, error_message = %s, updated_at = NOW()
                WHERE id = %s
            """, (status.value, error_message, job_id))
        except Exception as e:
            logger.error(f"Error updating job status: {e}")
    
    def _record_delivery(self, job: WebhookJob, result: Dict) -> None:
        """Record webhook delivery in the deliveries table"""
        try:
            Database.execute_insert("""
                INSERT INTO webhook_deliveries 
                (webhook_id, event_type, payload, response_status, response_body,
                 delivery_attempts, execution_time_ms, last_attempt_at, 
                 delivered_at, webhook_type, is_test)
                VALUES (%s, %s, %s, %s, %s, %s, %s, NOW(), %s, %s, %s)
            """, (
                job.webhook_id, job.event_type, json.dumps(job.payload),
                result.get('status_code', 0), result.get('response_body', ''),
                job.retry_count + 1, result.get('execution_time_ms', 0),
                datetime.now() if result['success'] else None,
                'outgoing', job.metadata.get('is_test', False)
            ))
        except Exception as e:
            logger.error(f"Error recording delivery: {e}")
    
    def _remove_from_queue(self, job_id: str) -> None:
        """Remove job from queue"""
        try:
            Database.execute_query("DELETE FROM webhook_queue WHERE id = %s", (job_id,))
            self.stats['queue_size'] = max(0, self.stats['queue_size'] - 1)
        except Exception as e:
            logger.error(f"Error removing job from queue: {e}")
    
    def _get_queue_size(self) -> int:
        """Get current queue size"""
        try:
            result = Database.execute_one("""
                SELECT COUNT(*) as count FROM webhook_queue 
                WHERE status IN ('pending', 'processing', 'retrying')
            """)
            return result['count'] if result else 0
        except Exception as e:
            logger.error(f"Error getting queue size: {e}")
            return 0
    
    def _get_webhook_config(self, webhook_id: str) -> Optional[Dict]:
        """Get webhook configuration"""
        try:
            webhook = Database.execute_one("""
                SELECT secret, retry_count, timeout_seconds, headers
                FROM webhooks WHERE id = %s
            """, (webhook_id,))
            
            if webhook:
                config = {
                    'secret': webhook['secret'],
                    'retry_count': webhook['retry_count'],
                    'timeout_seconds': webhook['timeout_seconds']
                }
                
                if webhook['headers']:
                    try:
                        config['headers'] = json.loads(webhook['headers'])
                    except json.JSONDecodeError:
                        pass
                
                return config
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting webhook config: {e}")
            return None
    
    def _generate_signature(self, secret: str, payload: str, timestamp: str) -> str:
        """Generate webhook signature"""
        import hashlib
        import hmac
        
        payload_to_sign = f"{timestamp}.{payload}"
        signature = hmac.new(
            secret.encode(),
            payload_to_sign.encode(),
            hashlib.sha256
        ).hexdigest()
        
        return signature
    
    def _send_failure_notification(self, job: WebhookJob, error_message: str) -> None:
        """Send notification about webhook failure"""
        try:
            # Get webhook owner
            webhook = Database.execute_one("""
                SELECT w.name, w.created_by, t.name as tenant_name
                FROM webhooks w
                JOIN tenants t ON w.tenant_id = t.id
                WHERE w.id = %s
            """, (job.webhook_id,))
            
            if webhook and webhook['created_by']:
                NotificationService.send_notification(
                    webhook['created_by'],
                    'webhook_failure',
                    {
                        'webhook_name': webhook['name'],
                        'webhook_id': job.webhook_id,
                        'event_type': job.event_type,
                        'error_message': error_message,
                        'retry_count': job.retry_count,
                        'job_id': job.id,
                        'tenant_name': webhook['tenant_name']
                    }
                )
        except Exception as e:
            logger.error(f"Error sending failure notification: {e}")
    
    def get_queue_stats(self) -> Dict:
        """Get queue statistics"""
        try:
            db_stats = Database.execute_one("""
                SELECT 
                    COUNT(*) as total_jobs,
                    COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_jobs,
                    COUNT(CASE WHEN status = 'processing' THEN 1 END) as processing_jobs,
                    COUNT(CASE WHEN status = 'retrying' THEN 1 END) as retrying_jobs,
                    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_jobs,
                    AVG(CASE WHEN status = 'delivered' THEN retry_count + 1 END) as avg_attempts,
                    MIN(created_at) as oldest_job,
                    MAX(updated_at) as newest_update
                FROM webhook_queue
                WHERE created_at >= NOW() - INTERVAL '24 hours'
            """)
            
            stats = self.stats.copy()
            if db_stats:
                stats.update({
                    'total_jobs': db_stats['total_jobs'],
                    'pending_jobs': db_stats['pending_jobs'],
                    'processing_jobs': db_stats['processing_jobs'],
                    'retrying_jobs': db_stats['retrying_jobs'],
                    'failed_jobs_24h': db_stats['failed_jobs'],
                    'avg_attempts': float(db_stats['avg_attempts']) if db_stats['avg_attempts'] else 0,
                    'oldest_job': db_stats['oldest_job'].isoformat() if db_stats['oldest_job'] else None,
                    'newest_update': db_stats['newest_update'].isoformat() if db_stats['newest_update'] else None
                })
            
            return stats
            
        except Exception as e:
            logger.error(f"Error getting queue stats: {e}")
            return self.stats.copy()


class WebhookQueueManager:
    """Global webhook queue manager"""
    
    _instance = None
    _lock = Lock()
    
    def __new__(cls):
        if cls._instance is None:
            with cls._lock:
                if cls._instance is None:
                    cls._instance = super().__new__(cls)
                    cls._instance.queue = WebhookQueue()
                    cls._instance.initialized = False
        return cls._instance
    
    def initialize(self, max_workers: int = 10, max_queue_size: int = 1000):
        """Initialize the queue manager"""
        if not self.initialized:
            self.queue = WebhookQueue(max_workers, max_queue_size)
            self.initialized = True
    
    def enqueue_webhook(self, webhook_id: str, event_type: str, payload: Dict,
                       url: str, headers: Dict = None, priority: int = 5,
                       max_retries: int = 3, timeout: int = 30,
                       metadata: Dict = None) -> str:
        """
        Enqueue a webhook for processing
        
        Returns:
            Job ID if successful, None if failed
        """
        job_id = str(uuid.uuid4())
        
        job = WebhookJob(
            id=job_id,
            webhook_id=webhook_id,
            event_type=event_type,
            payload=payload,
            headers=headers or {},
            url=url,
            priority=priority,
            max_retries=max_retries,
            timeout=timeout,
            metadata=metadata or {}
        )
        
        if self.queue.enqueue_webhook(job):
            return job_id
        return None
    
    def start_processing(self):
        """Start processing webhooks"""
        if not self.queue.running:
            import threading
            processing_thread = threading.Thread(target=self.queue.process_queue)
            processing_thread.daemon = True
            processing_thread.start()
    
    def stop_processing(self):
        """Stop processing webhooks"""
        self.queue.stop_processing()
    
    def get_stats(self) -> Dict:
        """Get queue statistics"""
        return self.queue.get_queue_stats()
    
    def cancel_job(self, job_id: str) -> bool:
        """Cancel a pending webhook job"""
        try:
            result = Database.execute_query("""
                UPDATE webhook_queue
                SET status = 'cancelled', updated_at = NOW()
                WHERE id = %s AND status IN ('pending', 'retrying')
            """, (job_id,))
            
            if result:
                self.queue.stats['cancelled'] += 1
                return True
            return False
            
        except Exception as e:
            logger.error(f"Error cancelling job {job_id}: {e}")
            return False
    
    def cleanup_old_jobs(self, days_to_keep: int = 7) -> int:
        """Clean up old completed and failed jobs"""
        try:
            result = Database.execute_query("""
                DELETE FROM webhook_queue
                WHERE status IN ('delivered', 'failed', 'cancelled')
                AND updated_at < NOW() - INTERVAL '%s days'
            """, (days_to_keep,))
            
            deleted_count = result if result else 0
            logger.info(f"Cleaned up {deleted_count} old webhook jobs")
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old jobs: {e}")
            return 0


# Global instance
webhook_queue_manager = WebhookQueueManager()


# Database schema for webhook queue (add to migrations)
WEBHOOK_QUEUE_SCHEMA = """
-- Webhook Queue Table
CREATE TABLE IF NOT EXISTS webhook_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}',
    url VARCHAR(500) NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'retrying', 'cancelled')),
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Indexes for webhook queue
CREATE INDEX IF NOT EXISTS idx_webhook_queue_status ON webhook_queue(status);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_scheduled ON webhook_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_priority ON webhook_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_webhook_id ON webhook_queue(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_cleanup ON webhook_queue(status, updated_at);
"""