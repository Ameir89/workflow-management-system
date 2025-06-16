# app/services/permission_service.py
"""
Permission validation and management service
"""
import json
from typing import List, Dict, Set, Optional
from app.database import Database
import logging

logger = logging.getLogger(__name__)


class PermissionService:
    """Service for advanced permission management and validation"""

    @staticmethod
    def validate_user_permission(user_id: str, required_permission: str) -> bool:
        """Check if user has a specific permission through their roles"""
        try:
            user_permissions = PermissionService.get_user_permissions(user_id)
            return '*' in user_permissions or required_permission in user_permissions
        except Exception as e:
            logger.error(f"Error validating user permission: {e}")
            return False

    @staticmethod
    def get_user_permissions(user_id: str) -> Set[str]:
        """Get all permissions for a user from their roles"""
        try:
            result = Database.execute_query("""
                SELECT DISTINCT r.permissions
                FROM users u
                JOIN user_roles ur ON u.id = ur.user_id
                JOIN roles r ON ur.role_id = r.id
                WHERE u.id = %s AND u.is_active = true AND r.is_active = true
            """, (user_id,))

            all_permissions = set()
            for row in result:
                try:
                    permissions = json.loads(row['permissions']) if isinstance(row['permissions'], str) else row[
                        'permissions']
                    if permissions:
                        all_permissions.update(permissions)
                except (json.JSONDecodeError, TypeError):
                    continue

            return all_permissions
        except Exception as e:
            logger.error(f"Error getting user permissions: {e}")
            return set()

    @staticmethod
    def check_permission_dependencies(permissions: List[str]) -> Dict[str, List[str]]:
        """Check if permissions have proper dependencies"""
        dependencies = {
            'manage_users': ['view_users'],
            'manage_workflows': ['view_workflows'],
            'manage_tasks': ['view_tasks'],
            'manage_forms': ['view_forms'],
            'manage_roles': ['view_roles'],
            'manage_lookups': ['view_lookups'],
            'create_reports': ['view_reports'],
            'export_reports': ['view_reports'],
            'manage_automation': ['view_automation'],
            'execute_automation': ['view_automation'],
            'manage_webhooks': ['view_automation'],
        }

        missing_dependencies = {}
        for permission in permissions:
            if permission in dependencies:
                required_deps = dependencies[permission]
                missing_deps = [dep for dep in required_deps if dep not in permissions]
                if missing_deps:
                    missing_dependencies[permission] = missing_deps

        return missing_dependencies

    @staticmethod
    def get_permission_hierarchy() -> Dict[str, List[str]]:
        """Get permission hierarchy showing which permissions include others"""
        return {
            '*': ['all_permissions'],
            'manage_system': [
                'manage_users', 'manage_roles', 'manage_workflows',
                'manage_system_config', 'view_system_health'
            ],
            'manage_users': ['view_users', 'create_users'],
            'manage_workflows': ['view_workflows', 'create_workflows', 'execute_workflows'],
            'manage_tasks': ['view_tasks', 'execute_tasks', 'assign_tasks'],
            'manage_forms': ['view_forms', 'create_forms', 'view_form_responses'],
            'manage_lookups': ['view_lookups', 'view_all_lookups'],
            'manage_automation': ['view_automation', 'execute_automation'],
        }

    @staticmethod
    def suggest_role_permissions(role_type: str) -> List[str]:
        """Suggest permissions based on role type"""
        suggestions = {
            'admin': ['*'],
            'manager': [
                'view_workflows', 'create_workflows', 'execute_workflows',
                'view_tasks', 'manage_tasks', 'assign_tasks',
                'view_users', 'view_reports', 'create_reports'
            ],
            'supervisor': [
                'view_workflows', 'execute_workflows',
                'view_tasks', 'execute_tasks', 'assign_tasks',
                'view_reports'
            ],
            'user': [
                'view_workflows', 'execute_workflows',
                'view_tasks', 'execute_tasks',
                'view_forms', 'upload_files'
            ],
            'viewer': ['view_workflows', 'view_tasks', 'view_reports'],
        }

        return suggestions.get(role_type.lower(), [])

    @staticmethod
    def audit_permission_changes(user_id: str, role_id: str, old_permissions: List[str],
                                 new_permissions: List[str]) -> Dict[str, List[str]]:
        """Audit permission changes and return added/removed permissions"""
        old_set = set(old_permissions)
        new_set = set(new_permissions)

        added = list(new_set - old_set)
        removed = list(old_set - new_set)

        # Log the changes
        if added or removed:
            logger.info(f"Permission changes for role {role_id} by user {user_id}: "
                        f"Added: {added}, Removed: {removed}")

        return {
            'added': added,
            'removed': removed,
            'unchanged': list(old_set & new_set)
        }

    @staticmethod
    def validate_permission_conflicts(permissions: List[str]) -> List[str]:
        """Check for conflicting permissions"""
        conflicts = []

        # Define conflicting permission pairs
        conflict_rules = [
            (['view_users', 'manage_users'], 'manage_users includes view_users'),
            (['view_workflows', 'manage_workflows'], 'manage_workflows includes view_workflows'),
            (['*'], 'Super admin permission conflicts with specific permissions')
        ]

        for conflict_perms, message in conflict_rules:
            if len(conflict_perms) == 1 and conflict_perms[0] == '*':
                if '*' in permissions and len(permissions) > 1:
                    conflicts.append(message)
            elif all(perm in permissions for perm in conflict_perms):
                conflicts.append(message)

        return conflicts

    @staticmethod
    def get_permission_impact_analysis(tenant_id: str, permission: str) -> Dict[str, any]:
        """Analyze the impact of adding/removing a permission"""
        try:
            # Get roles that have this permission
            roles_with_permission = Database.execute_query("""
                SELECT r.id, r.name, r.permissions,
                       COUNT(ur.user_id) as user_count
                FROM roles r
                LEFT JOIN user_roles ur ON r.id = ur.role_id
                WHERE r.tenant_id = %s
                GROUP BY r.id, r.name, r.permissions
            """, (tenant_id,))

            affected_roles = []
            total_affected_users = 0

            for role in roles_with_permission:
                try:
                    permissions = json.loads(role['permissions']) if isinstance(role['permissions'], str) else role[
                        'permissions']
                    if permissions and (permission in permissions or '*' in permissions):
                        affected_roles.append({
                            'role_id': role['id'],
                            'role_name': role['name'],
                            'user_count': role['user_count']
                        })
                        total_affected_users += role['user_count']
                except (json.JSONDecodeError, TypeError):
                    continue

            # Get workflows/tasks that might be affected
            workflow_impact = Database.execute_one("""
                SELECT COUNT(*) as workflow_count
                FROM workflows w
                WHERE w.tenant_id = %s AND w.is_active = true
            """, (tenant_id,))

            return {
                'permission': permission,
                'affected_roles': affected_roles,
                'total_affected_users': total_affected_users,
                'potential_workflow_impact': workflow_impact['workflow_count'],
                'risk_level': 'high' if total_affected_users > 10 else 'medium' if total_affected_users > 5 else 'low'
            }

        except Exception as e:
            logger.error(f"Error analyzing permission impact: {e}")
            return {'error': 'Failed to analyze permission impact'}