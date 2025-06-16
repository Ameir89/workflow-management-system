# ===== AUTOMATION TEMPLATE MANAGER =====
import json
import logging
from typing import Dict, List, Any


from app.database import Database
logger = logging.getLogger(__name__)
class AutomationTemplateManager:
    """Manage reusable automation templates"""

    @staticmethod
    def create_template(tenant_id: str, name: str, template_data: Dict[str, Any],
                        created_by: str) -> str:
        """Create new automation template"""
        try:
            template_id = Database.execute_insert("""
                INSERT INTO automation_templates 
                (tenant_id, name, description, template_data, created_by)
                VALUES (%s, %s, %s, %s, %s)
            """, (
                tenant_id, name, template_data.get('description', ''),
                json.dumps(template_data), created_by
            ))

            return template_id

        except Exception as e:
            logger.error(f"Failed to create automation template: {e}")
            raise

    @staticmethod
    def get_templates(tenant_id: str) -> List[Dict[str, Any]]:
        """Get all automation templates for tenant"""
        try:
            templates = Database.execute_query("""
                SELECT id, name, description, template_data, created_at, is_active
                FROM automation_templates 
                WHERE tenant_id = %s
                ORDER BY created_at DESC
            """, (tenant_id,))

            result = []
            for template in templates:
                template_dict = dict(template)
                template_dict['template_data'] = json.loads(template_dict['template_data'])
                result.append(template_dict)

            return result

        except Exception as e:
            logger.error(f"Failed to get automation templates: {e}")
            return []

    @staticmethod
    def update_template(template_id: str, template_data: Dict[str, Any]) -> bool:
        """Update automation template"""
        try:
            Database.execute_query("""
                UPDATE automation_templates 
                SET template_data = %s, updated_at = NOW()
                WHERE id = %s
            """, (json.dumps(template_data), template_id))

            return True

        except Exception as e:
            logger.error(f"Failed to update automation template: {e}")
            return False


