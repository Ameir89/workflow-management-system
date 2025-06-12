### Additional Backend Services

### app/services/audit_logger.py

"""
Audit logging service for tracking all system activities
"""
import json
from datetime import datetime
from app.database import Database
from flask import g
import logging

logger = logging.getLogger(__name__)

class AuditLogger:
    """Service for logging audit events"""
    
    @staticmethod
    def log_action(user_id, action, resource_type, resource_id=None, 
                   old_values=None, new_values=None, ip_address=None, user_agent=None):
        """Log an audit event"""
        try:
            # Get tenant_id from user if available
            tenant_id = None
            if user_id:
                user = Database.execute_one(
                    "SELECT tenant_id FROM users WHERE id = %s",
                    (user_id,)
                )
                tenant_id = user['tenant_id'] if user else None
            
            # Insert audit log
            Database.execute_insert("""
                INSERT INTO audit_logs 
                (tenant_id, user_id, action, resource_type, resource_id, 
                 old_values, new_values, ip_address, user_agent)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """, (
                tenant_id, user_id, action, resource_type, resource_id,
                json.dumps(old_values) if old_values else None,
                json.dumps(new_values) if new_values else None,
                ip_address, user_agent
            ))
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
    
    @staticmethod
    def get_audit_logs(tenant_id, filters=None, page=1, limit=50):
        """Get audit logs with optional filters"""
        try:
            where_conditions = ["tenant_id = %s"]
            params = [tenant_id]
            
            if filters:
                if filters.get('user_id'):
                    where_conditions.append("user_id = %s")
                    params.append(filters['user_id'])
                
                if filters.get('action'):
                    where_conditions.append("action = %s")
                    params.append(filters['action'])
                
                if filters.get('resource_type'):
                    where_conditions.append("resource_type = %s")
                    params.append(filters['resource_type'])
                
                if filters.get('date_from'):
                    where_conditions.append("created_at >= %s")
                    params.append(filters['date_from'])
                
                if filters.get('date_to'):
                    where_conditions.append("created_at <= %s")
                    params.append(filters['date_to'])
            
            where_clause = "WHERE " + " AND ".join(where_conditions)
            offset = (page - 1) * limit
            
            logs = Database.execute_query(f"""
                SELECT al.*, u.username, u.first_name, u.last_name
                FROM audit_logs al
                LEFT JOIN users u ON al.user_id = u.id
                {where_clause}
                ORDER BY al.created_at DESC
                LIMIT %s OFFSET %s
            """, params + [limit, offset])
            
            # Get total count
            total = Database.execute_one(f"""
                SELECT COUNT(*) as count FROM audit_logs al
                {where_clause}
            """, params)
            
            return {
                'logs': [dict(log) for log in logs],
                'total': total['count'],
                'page': page,
                'limit': limit
            }
            
        except Exception as e:
            logger.error(f"Failed to get audit logs: {e}")
            return {'logs': [], 'total': 0, 'page': page, 'limit': limit}