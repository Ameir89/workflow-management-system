import json
import logging
from typing import Any, Dict, List, Optional, Union
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
        
    @staticmethod
    def safe_json_dumps_new(data: Any, default=None) -> str:
        """
        Safely serialize data to JSON string
        
        Args:
            data: Data to serialize
            default: Default value if serialization fails
            
        Returns:
            JSON string or default value
        """
        if data is None:
            return json.dumps({})
            
        try:
            if isinstance(data, str):
                # If it's already a string, try to parse and re-serialize to validate
                try:
                    parsed = json.loads(data)
                    return json.dumps(parsed)
                except json.JSONDecodeError:
                    # If it's not valid JSON, treat it as a plain string
                    return json.dumps({"value": data})
            
            return json.dumps(data, default=str, ensure_ascii=False)
            
        except (TypeError, ValueError) as e:
            logger.warning(f"Failed to serialize data to JSON: {e}")
            return json.dumps(default or {})

    @staticmethod
    def safe_parse_json_new(data: Union[str, Dict, None], default=None) -> Dict[str, Any]:
        """
        Safely parse JSON string to dictionary
        
        Args:
            data: JSON string or dict to parse
            default: Default value if parsing fails
            
        Returns:
            Parsed dictionary or default value
        """
        if data is None:
            return default or {}
            
        if isinstance(data, dict):
            return data
            
        if isinstance(data, str):
            if not data.strip():
                return default or {}
                
            try:
                parsed = json.loads(data)
                return parsed if isinstance(parsed, dict) else {"value": parsed}
            except json.JSONDecodeError as e:
                logger.warning(f"Failed to parse JSON string: {e}")
                return default or {}
        
        # For other types, try to convert
        try:
            return json.loads(json.dumps(data))
        except (TypeError, ValueError):
            logger.warning(f"Failed to convert data to JSON: {type(data)}")
            return default or {}

    @staticmethod
    def safe_stringify_json_new(data: Any) -> str:
        """
        Safely convert data to JSON string for database storage
        
        Args:
            data: Data to convert
            
        Returns:
            JSON string suitable for database storage
        """
        return JSONUtils.safe_json_dumps(data)

    @staticmethod
    def merge_json_data_new(base_data: Union[str, Dict, None], 
                       new_data: Union[str, Dict, None]) -> Dict[str, Any]:
        """
        Merge two JSON data structures
        
        Args:
            base_data: Base data (will be modified)
            new_data: New data to merge in
            
        Returns:
            Merged dictionary
        """
        base = JSONUtils.safe_parse_json_new(base_data, {})
        new = JSONUtils.safe_parse_json_new(new_data, {})
        
        # Deep merge
        result = base.copy()
        
        def deep_merge(target: Dict, source: Dict):
            for key, value in source.items():
                if key in target and isinstance(target[key], dict) and isinstance(value, dict):
                    deep_merge(target[key], value)
                else:
                    target[key] = value
        
        deep_merge(result, new)
        return result

    @staticmethod
    def extract_json_field(data: Union[str, Dict, None], 
                          field_path: str, 
                          default=None) -> Any:
        """
        Extract a field from JSON data using dot notation
        
        Args:
            data: JSON data
            field_path: Field path like "user.name" or "settings.notifications.email"
            default: Default value if field not found
            
        Returns:
            Field value or default
        """
        parsed_data = JSONUtils.safe_parse_json_new(data, {})
        
        if not field_path:
            return default
            
        try:
            value = parsed_data
            for key in field_path.split('.'):
                value = value[key]
            return value
        except (KeyError, TypeError, AttributeError):
            return default

    @staticmethod
    def validate_json_structure(data: Union[str, Dict], 
                               required_fields: Optional[List[str]] = None,
                               optional_fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """
        Validate JSON structure and return validation result
        
        Args:
            data: JSON data to validate
            required_fields: List of required field names
            optional_fields: List of optional field names
            
        Returns:
            Dictionary with validation results
        """
        parsed_data = JSONUtils.safe_parse_json_new(data, {})
        
        result = {
            'is_valid': True,
            'errors': [],
            'warnings': [],
            'missing_required': [],
            'extra_fields': []
        }
        
        if required_fields:
            for field in required_fields:
                if field not in parsed_data:
                    result['missing_required'].append(field)
                    result['errors'].append(f"Required field '{field}' is missing")
        
        if required_fields or optional_fields:
            all_allowed_fields = set((required_fields or []) + (optional_fields or []))
            extra_fields = set(parsed_data.keys()) - all_allowed_fields
            if extra_fields:
                result['extra_fields'] = list(extra_fields)
                result['warnings'].append(f"Extra fields found: {', '.join(extra_fields)}")
        
        result['is_valid'] = len(result['errors']) == 0
        
        return result

    @staticmethod
    def clean_json_for_response(data: Union[str, Dict, None]) -> Dict[str, Any]:
        """
        Clean JSON data for API response (remove sensitive fields, etc.)
        
        Args:
            data: JSON data to clean
            
        Returns:
            Cleaned dictionary
        """
        parsed_data = JSONUtils.safe_parse_json_new(data, {})
        
        # Remove sensitive fields
        sensitive_fields = ['password', 'secret', 'token', 'key', 'private']
        
        def clean_dict(d):
            if not isinstance(d, dict):
                return d
                
            cleaned = {}
            for key, value in d.items():
                # Check if key contains sensitive words
                key_lower = key.lower()
                is_sensitive = any(sensitive_word in key_lower for sensitive_word in sensitive_fields)
                
                if is_sensitive:
                    cleaned[key] = "[REDACTED]"
                elif isinstance(value, dict):
                    cleaned[key] = clean_dict(value)
                elif isinstance(value, list):
                    cleaned[key] = [clean_dict(item) if isinstance(item, dict) else item for item in value]
                else:
                    cleaned[key] = value
                    
            return cleaned
        
        return clean_dict(parsed_data)

    @staticmethod
    def format_json_for_display(data: Union[str, Dict, None], 
                               indent: int = 2) -> str:
        """
        Format JSON data for human-readable display
        
        Args:
            data: JSON data to format
            indent: Indentation spaces
            
        Returns:
            Formatted JSON string
        """
        parsed_data = JSONUtils.safe_parse_json_new(data, {})
        
        try:
            return json.dumps(parsed_data, indent=indent, ensure_ascii=False, sort_keys=True)
        except (TypeError, ValueError):
            return str(parsed_data)

    @staticmethod
    def compress_json(data: Union[str, Dict, None]) -> str:
        """
        Compress JSON data for storage (remove whitespace)
        
        Args:
            data: JSON data to compress
            
        Returns:
            Compressed JSON string
        """
        parsed_data = JSONUtils.safe_parse_json_new(data, {})
        
        try:
            return json.dumps(parsed_data, separators=(',', ':'), ensure_ascii=False)
        except (TypeError, ValueError):
            return json.dumps({})

    @staticmethod
    def is_valid_json(data: str) -> bool:
        """
        Check if string is valid JSON
        
        Args:
            data: String to check
            
        Returns:
            True if valid JSON, False otherwise
        """
        if not isinstance(data, str):
            return False
            
        try:
            json.loads(data)
            return True
        except json.JSONDecodeError:
            return False

    @staticmethod
    def json_diff(old_data: Union[str, Dict, None], 
                  new_data: Union[str, Dict, None]) -> Dict[str, Any]:
        """
        Calculate difference between two JSON objects
        
        Args:
            old_data: Original JSON data
            new_data: New JSON data
            
        Returns:
            Dictionary with changes
        """
        old = JSONUtils.safe_parse_json_new(old_data, {})
        new = JSONUtils.safe_parse_json_new(new_data, {})
        
        changes = {
            'added': {},
            'removed': {},
            'modified': {},
            'unchanged': {}
        }
        
        all_keys = set(old.keys()) | set(new.keys())
        
        for key in all_keys:
            if key not in old:
                changes['added'][key] = new[key]
            elif key not in new:
                changes['removed'][key] = old[key]
            elif old[key] != new[key]:
                changes['modified'][key] = {
                    'old': old[key],
                    'new': new[key]
                }
            else:
                changes['unchanged'][key] = old[key]
        
        return changes 
     