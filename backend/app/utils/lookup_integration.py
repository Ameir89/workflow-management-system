# app/utils/lookup_integration.py
"""
Integration utilities for lookup tables with existing system
"""
from app.services.lookup_service import LookupService
from app.utils.validators import validate_required_fields
import logging

logger = logging.getLogger(__name__)


class LookupFormValidator:
    """Validator for form fields that use lookup tables"""

    @staticmethod
    def validate_lookup_field(tenant_id: str, field_config: dict, value: any) -> tuple[bool, str]:
        """Validate a single lookup field"""
        try:
            table_name = field_config.get('lookup_table')
            required = field_config.get('required', False)

            if not table_name:
                return False, "Lookup table not specified"

            if not value:
                if required:
                    return False, "Field is required"
                return True, ""

            # Validate single value
            if not isinstance(value, list):
                is_valid = LookupService.validate_lookup_value(tenant_id, table_name, str(value))
                if not is_valid:
                    return False, f"Invalid value: {value}"
                return True, ""

            # Validate multiple values
            for val in value:
                is_valid = LookupService.validate_lookup_value(tenant_id, table_name, str(val))
                if not is_valid:
                    return False, f"Invalid value: {val}"

            return True, ""

        except Exception as e:
            logger.error(f"Error validating lookup field: {e}")
            return False, "Validation error"

    @staticmethod
    def validate_form_with_lookups(tenant_id: str, form_schema: dict, form_data: dict) -> dict:
        """Validate entire form including lookup fields"""
        try:
            results = {
                'valid': True,
                'errors': {},
                'warnings': {}
            }

            fields = form_schema.get('fields', [])

            for field in fields:
                field_name = field.get('name')
                field_type = field.get('type')

                if field_type in ['lookup', 'lookup_select', 'lookup_multiselect']:
                    value = form_data.get(field_name)
                    is_valid, error_msg = LookupFormValidator.validate_lookup_field(
                        tenant_id, field, value
                    )

                    if not is_valid:
                        results['valid'] = False
                        results['errors'][field_name] = error_msg

            return results

        except Exception as e:
            logger.error(f"Error validating form with lookups: {e}")
            return {'valid': False, 'errors': {'form': 'Validation error'}, 'warnings': {}}


class LookupFieldResolver:
    """Resolver for converting lookup values to display values"""

    @staticmethod
    def resolve_form_data(tenant_id: str, form_schema: dict, form_data: dict) -> dict:
        """Resolve lookup values in form data to include display values"""
        try:
            resolved_data = form_data.copy()
            fields = form_schema.get('fields', [])

            for field in fields:
                field_name = field.get('name')
                field_type = field.get('type')

                if field_type in ['lookup', 'lookup_select', 'lookup_multiselect']:
                    table_name = field.get('lookup_table')
                    if not table_name or field_name not in form_data:
                        continue

                    value = form_data[field_name]
                    if not value:
                        continue

                    if isinstance(value, list):
                        # Handle multiple values
                        display_values = []
                        for val in value:
                            display_val = LookupService.get_display_value(tenant_id, table_name, str(val))
                            if display_val:
                                display_values.append(display_val)

                        if display_values:
                            resolved_data[f"{field_name}_display"] = display_values
                    else:
                        # Handle single value
                        display_val = LookupService.get_display_value(tenant_id, table_name, str(value))
                        if display_val:
                            resolved_data[f"{field_name}_display"] = display_val

            return resolved_data

        except Exception as e:
            logger.error(f"Error resolving form data: {e}")
            return form_data


class WorkflowLookupIntegration:
    """Integration class for using lookups in workflows"""

    @staticmethod
    def get_workflow_lookup_options(tenant_id: str, workflow_id: str, step_id: str,
                                    lookup_config: dict) -> list:
        """Get lookup options for workflow step"""
        try:
            table_name = lookup_config.get('table')
            filters = lookup_config.get('filters', {})

            if not table_name:
                return []

            # Apply workflow context filters if needed
            if filters:
                return LookupService.get_filtered_options(tenant_id, table_name, filters)
            else:
                return LookupService.get_options_for_form(tenant_id, table_name)

        except Exception as e:
            logger.error(f"Error getting workflow lookup options: {e}")
            return []

    @staticmethod
    def resolve_workflow_assignee(tenant_id: str, assignee_config: any, workflow_data: dict) -> str:
        """Resolve workflow assignee using lookup tables"""
        try:
            if isinstance(assignee_config, str):
                # Check if it's a lookup reference like "lookup:departments:manager"
                if assignee_config.startswith('lookup:'):
                    parts = assignee_config.split(':')
                    if len(parts) >= 3:
                        table_name = parts[1]
                        field_name = parts[2]

                        # Get the lookup value from workflow data
                        lookup_key = workflow_data.get('department')  # Example field
                        if lookup_key:
                            record = LookupService.get_lookup_value(tenant_id, table_name, lookup_key)
                            if record and field_name in record:
                                return record[field_name]

                return assignee_config

            return assignee_config

        except Exception as e:
            logger.error(f"Error resolving workflow assignee: {e}")
            return assignee_config


# Extended form schema validation for lookup fields
def validate_lookup_form_schema(schema: dict) -> tuple[bool, str]:
    """Validate form schema with lookup field support"""
    try:
        fields = schema.get('fields', [])

        for field in fields:
            field_type = field.get('type')

            if field_type in ['lookup', 'lookup_select', 'lookup_multiselect']:
                # Validate lookup-specific properties
                if 'lookup_table' not in field:
                    return False, f"Field '{field.get('name')}' missing lookup_table property"

                # Validate dependent field configuration
                if field.get('depends_on'):
                    depend_config = field['depends_on']
                    if not isinstance(depend_config, dict):
                        return False, f"Field '{field.get('name')}' has invalid depends_on configuration"

                    if 'field' not in depend_config or 'filter_field' not in depend_config:
                        return False, f"Field '{field.get('name')}' depends_on missing required properties"

        return True, ""

    except Exception as e:
        return False, f"Schema validation error: {str(e)}"


# Utility functions for common lookup operations
def get_country_states(tenant_id: str, country_code: str) -> list:
    """Get states/provinces for a country"""
    return LookupService.get_dependent_options(
        tenant_id, 'states', 'country_code', country_code
    )


def get_department_users(tenant_id: str, department_code: str) -> list:
    """Get users in a department"""
    return LookupService.get_dependent_options(
        tenant_id, 'department_users', 'department', department_code
    )


def validate_expense_category(tenant_id: str, category: str, amount: float) -> tuple[bool, str]:
    """Validate expense category based on amount limits"""
    try:
        category_data = LookupService.get_lookup_value(tenant_id, 'expense_categories', category)
        if not category_data:
            return False, "Invalid expense category"

        max_amount = category_data.get('max_amount')
        if max_amount and amount > max_amount:
            return False, f"Amount exceeds category limit of {max_amount}"

        min_amount = category_data.get('min_amount', 0)
        if amount < min_amount:
            return False, f"Amount below category minimum of {min_amount}"

        return True, ""

    except Exception as e:
        logger.error(f"Error validating expense category: {e}")
        return False, "Validation error"


# Lookup caching utilities
class LookupCache:
    """Simple in-memory cache for frequently accessed lookup data"""

    _cache = {}
    _cache_timeout = 300  # 5 minutes

    @classmethod
    def get_cached_options(cls, tenant_id: str, table_name: str) -> list:
        """Get cached lookup options"""
        try:
            import time
            cache_key = f"{tenant_id}:{table_name}"

            if cache_key in cls._cache:
                cached_data, timestamp = cls._cache[cache_key]
                if time.time() - timestamp < cls._cache_timeout:
                    return cached_data
                else:
                    del cls._cache[cache_key]

            # Load fresh data
            options = LookupService.get_options_for_form(tenant_id, table_name)
            cls._cache[cache_key] = (options, time.time())

            return options

        except Exception as e:
            logger.error(f"Error getting cached options: {e}")
            return []

    @classmethod
    def clear_cache(cls, tenant_id: str = None, table_name: str = None):
        """Clear lookup cache"""
        try:
            if tenant_id and table_name:
                cache_key = f"{tenant_id}:{table_name}"
                if cache_key in cls._cache:
                    del cls._cache[cache_key]
            elif tenant_id:
                # Clear all cache for tenant
                keys_to_remove = [key for key in cls._cache.keys() if key.startswith(f"{tenant_id}:")]
                for key in keys_to_remove:
                    del cls._cache[key]
            else:
                # Clear all cache
                cls._cache.clear()

        except Exception as e:
            logger.error(f"Error clearing cache: {e}")


# Enhanced lookup select component data
def get_lookup_select_config(tenant_id: str, table_name: str, config: dict = None) -> dict:
    """Get configuration for LookupSelect component"""
    try:
        table = LookupService.get_table_by_name(tenant_id, table_name)
        if not table:
            return {}

        base_config = {
            'lookupTable': table_name,
            'lookupConfig': {
                'valueField': table['value_field'],
                'displayField': table['display_field'],
                'additionalFields': table.get('additional_fields', [])
            }
        }

        # Merge with provided config
        if config:
            base_config.update(config)
            if 'lookupConfig' in config:
                base_config['lookupConfig'].update(config['lookupConfig'])

        return base_config

    except Exception as e:
        logger.error(f"Error getting lookup select config: {e}")
        return {}