import json
import logging

logger = logging.getLogger(__name__)


class JSONUtils:
    """Utility functions for safe JSON handling"""

    @staticmethod
    def safe_parse_json(data, default=None):
        """
        Safely parse JSON data that could be a string, dict, or None

        Args:
            data: The data to parse (could be str, dict, list, or None)
            default: Default value to return if parsing fails (default: {})

        Returns:
            Parsed data as Python object
        """
        if default is None:
            default = {}

        try:
            if data is None:
                return default
            elif isinstance(data, str):
                if data.strip() == '':
                    return default
                return json.loads(data)
            elif isinstance(data, (dict, list)):
                # Already parsed
                return data
            else:
                logger.warning(f"Unexpected JSON data type: {type(data)}, value: {data}")
                return default
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"JSON parsing error: {e}, data: {data}")
            return default

    @staticmethod
    def safe_stringify_json(data):
        """
        Safely convert data to JSON string

        Args:
            data: Data to convert to JSON string

        Returns:
            JSON string
        """
        try:
            if isinstance(data, str):
                # Verify it's valid JSON, then return as-is
                json.loads(data)
                return data
            else:
                return json.dumps(data)
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"JSON stringify error: {e}, data: {data}")
            return json.dumps({})

    @staticmethod
    def merge_json_data(base_data, update_data):
        """
        Safely merge two JSON data objects

        Args:
            base_data: Base data (string or dict)
            update_data: Data to merge in (string or dict)

        Returns:
            Merged data as dict
        """
        base = JSONUtils.safe_parse_json(base_data, {})
        update = JSONUtils.safe_parse_json(update_data, {})

        if isinstance(base, dict) and isinstance(update, dict):
            base.update(update)
            return base
        else:
            logger.warning(f"Cannot merge non-dict JSON data. Base: {type(base)}, Update: {type(update)}")
            return update if isinstance(update, dict) else base
        
    # @staticmethod    
    # def safe_json_loads(data, default=None):
    #     """
    #     Safely parse JSON data that could be a string, dict, or None
    
    #     Args:
    #         data: The data to parse (could be str, dict, list, or None)
    #         default: Default value to return if parsing fails (default: {})
        
    #     Returns:
    #         Parsed data as Python object
    #     """
    #     if default is None:
    #         default = {}
        
    #     try:
    #         if data is None:
    #             return default
    #         elif isinstance(data, str):
    #             if data.strip() == '':
    #                 return default
    #             return json.loads(data)
    #         elif isinstance(data, (dict, list)):
    #             # Already parsed
    #             return data
    #         else:
    #             logger.warning(f"Unexpected JSON data type: {type(data)}, value: {data}")
    #             return default
    #     except (json.JSONDecodeError, TypeError) as e:
    #         logger.error(f"JSON parsing error: {e}, data: {data}")
    #         return default
    
    @staticmethod
    def safe_json_dumps(data):
        """
        Safely convert data to JSON string
    
        Args:
            data: Data to convert to JSON string
        
        Returns:
            JSON string
        """
        try:
            if isinstance(data, str):
                # Verify it's valid JSON, then return as-is
                json.loads(data)
                return data
            else:
                return json.dumps(data, default=str)  # default=str handles datetime objects
        except (json.JSONDecodeError, TypeError) as e:
            logger.error(f"JSON stringify error: {e}, data: {data}")
            return json.dumps({})
        
        
     