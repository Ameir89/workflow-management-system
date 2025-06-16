# ===== SCRIPT MANAGER =====

from typing import Dict, List, Any, Optional

import logging

from app.database import Database


logger = logging.getLogger(__name__)
class AutomationScriptManager:
    """Manage reusable automation scripts"""

    @staticmethod
    def save_script(tenant_id: str, name: str, script_type: str,
                    script_content: str, created_by: str) -> str:
        """Save automation script to database"""
        try:
            script_id = Database.execute_insert("""
                INSERT INTO automation_scripts 
                (tenant_id, name, script_type, script_content, created_by)
                VALUES (%s, %s, %s, %s, %s)
            """, (tenant_id, name, script_type, script_content, created_by))

            return script_id

        except Exception as e:
            logger.error(f"Failed to save automation script: {e}")
            raise

    @staticmethod
    def get_scripts(tenant_id: str, script_type: str = None) -> List[Dict[str, Any]]:
        """Get automation scripts for tenant"""
        try:
            if script_type:
                scripts = Database.execute_query("""
                    SELECT id, name, script_type, description, created_at, is_active
                    FROM automation_scripts 
                    WHERE tenant_id = %s AND script_type = %s
                    ORDER BY created_at DESC
                """, (tenant_id, script_type))
            else:
                scripts = Database.execute_query("""
                    SELECT id, name, script_type, description, created_at, is_active
                    FROM automation_scripts 
                    WHERE tenant_id = %s
                    ORDER BY created_at DESC
                """, (tenant_id,))

            return [dict(script) for script in scripts]

        except Exception as e:
            logger.error(f"Failed to get automation scripts: {e}")
            return []

    @staticmethod
    def get_script_content(script_id: str) -> Optional[str]:
        """Get script content by ID"""
        try:
            script = Database.execute_one("""
                SELECT script_content FROM automation_scripts 
                WHERE id = %s AND is_active = true
            """, (script_id,))

            return script['script_content'] if script else None

        except Exception as e:
            logger.error(f"Failed to get script content: {e}")
            return None

