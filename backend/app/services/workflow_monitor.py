
from typing import Dict, List,  Any
from app.database import Database
import logging

logger = logging.getLogger(__name__)


# Workflow monitoring and analytics class
class WorkflowMonitor:
    """Monitor and analyze workflow execution"""
    
    @staticmethod
    def get_instance_metrics(instance_id: int) -> Dict[str, Any]:
        """Get metrics for a workflow instance"""
        query = """
            SELECT 
                wi.status,
                wi.created_at,
                wi.completed_at,
                COUNT(DISTINCT t.id) as total_tasks,
                COUNT(DISTINCT CASE WHEN t.status = 'completed' THEN t.id END) as completed_tasks,
                COUNT(DISTINCT CASE WHEN t.status = 'failed' THEN t.id END) as failed_tasks,
                AVG(TIMESTAMPDIFF(SECOND, t.created_at, t.completed_at)) as avg_task_duration
            FROM workflow_instances wi
            LEFT JOIN tasks t ON wi.id = t.workflow_instance_id
            WHERE wi.id = %s
            GROUP BY wi.id
        """
        
        return Database.execute_one(query, (instance_id,))
    
    @staticmethod
    def get_workflow_analytics(workflow_id: int, days: int = 30) -> Dict[str, Any]:
        """Get analytics for a workflow over time period"""
        query = """
            SELECT 
                COUNT(*) as total_instances,
                COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
                COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
                COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled,
                AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as avg_duration,
                MIN(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as min_duration,
                MAX(TIMESTAMPDIFF(SECOND, created_at, completed_at)) as max_duration
            FROM workflow_instances
            WHERE workflow_id = %s 
            AND created_at >= DATE_SUB(NOW(), INTERVAL %s DAY)
        """
        
        return Database.execute_one(query, (workflow_id, days))
    
    @staticmethod
    def get_bottlenecks(workflow_id: int) -> List[Dict[str, Any]]:
        """Identify workflow bottlenecks"""
        query = """
            SELECT 
                t.step_id,
                COUNT(*) as task_count,
                AVG(TIMESTAMPDIFF(SECOND, t.created_at, t.completed_at)) as avg_duration,
                MAX(TIMESTAMPDIFF(SECOND, t.created_at, t.completed_at)) as max_duration,
                COUNT(CASE WHEN t.status = 'failed' THEN 1 END) as failure_count
            FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE wi.workflow_id = %s
            GROUP BY t.step_id
            HAVING avg_duration > (
                SELECT AVG(TIMESTAMPDIFF(SECOND, created_at, completed_at)) * 1.5
                FROM tasks
                WHERE workflow_instance_id IN (
                    SELECT id FROM workflow_instances WHERE workflow_id = %s
                )
            )
            ORDER BY avg_duration DESC
        """
        
        return Database.execute_many(query, (workflow_id, workflow_id))