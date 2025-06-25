import requests
import re
import logging

logger = logging.getLogger(__name__)

class OrgAPI:
    @staticmethod
    def get_manager(user_id, role_name):
        """
        Query external org system for manager role of the user.
        Expects API to return a dict like { "branch_manager": "uuid", ... }
        """
        try:
            response = requests.get(
                f"http://127.0.0.1:5002/api/managers/{user_id}",
                timeout=5
            )
            if response.status_code == 200:
                chain = response.json()
                return chain.get(role_name)
        except Exception as e:
            logger.warning(f"OrgAPI error: {e}")
        return None
