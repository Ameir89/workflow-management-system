### app/utils/validators.py
"""
Input validation utilities
"""
import re
from datetime import datetime
from typing import Dict, List, Any, Optional
import logging

logger = logging.getLogger(__name__)

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> bool:
    """Validate that all required fields are present and not empty"""
    if not isinstance(data, dict):
        return False
    
    for field in required_fields:
        if field not in data or data[field] is None or str(data[field]).strip() == '':
            return False
    
    return True

def validate_form_data(form_data, form_schema):
    """Validate form data against schema"""
    errors = []

    if not form_schema or 'fields' not in form_schema:
        return errors

    for field in form_schema.get('fields', []):
        field_name = field.get('name')
        field_type = field.get('type', 'text')
        required = field.get('required', False)
        options = field.get('options') or []

        # Optional constraints
        min_length = field.get('minLength')
        max_length = field.get('maxLength')
        pattern = field.get('pattern')
        allowed_extensions = field.get('allowed_extensions', [])
        
        value = form_data.get(field_name)

        # === [1] Required Field Check ===
        if required and (value is None or (isinstance(value, str) and value.strip() == "")):
            errors.append(f"Field '{field_name}' is required")
            continue

        # === [2] Skip empty optional fields ===
        if value in [None, ""]:
            continue

        try:
            # === [3] Field Type Specific Validation ===
            if field_type == 'email':
                email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
                if not re.match(email_pattern, str(value)):
                    errors.append(f"Field '{field_name}' must be a valid email")

            elif field_type == 'number':
                try:
                    float(value)
                except (ValueError, TypeError):
                    errors.append(f"Field '{field_name}' must be a valid number")

            elif field_type == 'date':
                try:
                    datetime.strptime(value, '%Y-%m-%d')
                except ValueError:
                    errors.append(f"Field '{field_name}' must be a valid date (YYYY-MM-DD)")

            elif field_type in ['select', 'radio']:
                valid_values = [opt.get('value') for opt in options if opt.get('value') is not None]
                if valid_values and value not in valid_values:
                    errors.append(f"Field '{field_name}' has invalid value. Allowed: {valid_values}")

            elif field_type == 'boolean':
                if str(value).lower() not in ['true', 'false', '1', '0']:
                    errors.append(f"Field '{field_name}' must be a boolean (true/false)")

            elif field_type in ['text', 'textarea', 'password']:
                if not isinstance(value, str):
                    errors.append(f"Field '{field_name}' must be a string")
                else:
                    if min_length is not None and len(value) < min_length:
                        errors.append(f"Field '{field_name}' must be at least {min_length} characters long")
                    if max_length is not None and len(value) > max_length:
                        errors.append(f"Field '{field_name}' must be at most {max_length} characters long")
                    if pattern:
                        if not re.match(pattern, value):
                            errors.append(f"Field '{field_name}' does not match the required pattern")

            elif field_type == 'file':
                # Expected: value is a filename or object with 'name'
                filename = value.get('name') if isinstance(value, dict) else value
                if not isinstance(filename, str) or '.' not in filename:
                    errors.append(f"Field '{field_name}' must be a valid file name")
                elif allowed_extensions:
                    ext = filename.rsplit('.', 1)[-1].lower()
                    if ext not in allowed_extensions:
                        errors.append(f"Field '{field_name}' must be one of: {allowed_extensions}")

            elif field_type == 'checkbox':
                if not isinstance(value, bool):
                    errors.append(f"Field '{field_name}' must be a boolean")

        except Exception as e:
            logger.warning(f"Validation error for field '{field_name}': {e}")
            errors.append(f"Error validating field '{field_name}'")

    return errors



def validate_email_format(email: str) -> bool:
    """Validate email format using regex"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(pattern, email))

def validate_phone_number(phone: str) -> bool:
    """Validate phone number format"""
    # Remove all non-digit characters
    digits_only = re.sub(r'\D', '', phone)
    # Check if it's between 10-15 digits
    return 10 <= len(digits_only) <= 15

def validate_workflow_definition(definition: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Validate workflow definition structure"""
    if not isinstance(definition, dict):
        return False, "Definition must be a JSON object"
    
    if 'steps' not in definition:
        return False, "Definition must contain 'steps' array"
    
    if not isinstance(definition['steps'], list):
        return False, "'steps' must be an array"
    
    if len(definition['steps']) == 0:
        return False, "Workflow must have at least one step"
    
    # Validate each step
    step_ids = set()
    has_start_step = False
    
    for i, step in enumerate(definition['steps']):
        if not isinstance(step, dict):
            return False, f"Step {i} must be an object"
        
        # Check required fields
        required_step_fields = ['id', 'name', 'type']
        for field in required_step_fields:
            if field not in step:
                return False, f"Step {i} missing required field: {field}"
        
        # Check for duplicate IDs
        step_id = step['id']
        if step_id in step_ids:
            return False, f"Duplicate step ID: {step_id}"
        step_ids.add(step_id)
        
        # Check for start step
        if step.get('isStart', False):
            has_start_step = True
        
        # Validate step type
        valid_types = ['task', 'approval', 'notification', 'condition', 'automation']
        if step['type'] not in valid_types:
            return False, f"Invalid step type: {step['type']}"
    
    if not has_start_step:
        return False, "Workflow must have a start step"
    
    # Validate transitions if present
    if 'transitions' in definition:
        transitions = definition['transitions']
        if not isinstance(transitions, list):
            return False, "'transitions' must be an array"
        
        for i, transition in enumerate(transitions):
            if not isinstance(transition, dict):
                return False, f"Transition {i} must be an object"
            
            required_transition_fields = ['from', 'to']
            for field in required_transition_fields:
                if field not in transition:
                    return False, f"Transition {i} missing required field: {field}"
            
            # Check that referenced steps exist
            if transition['from'] not in step_ids:
                return False, f"Transition {i} references non-existent step: {transition['from']}"
            
            if transition['to'] not in step_ids:
                return False, f"Transition {i} references non-existent step: {transition['to']}"
    
    return True, None

def validate_form_schema(schema: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """Validate form schema structure"""
    if not isinstance(schema, dict):
        return False, "Schema must be a JSON object"
    
    if 'fields' not in schema:
        return False, "Schema must contain 'fields' array"
    
    if not isinstance(schema['fields'], list):
        return False, "'fields' must be an array"
    
    field_names = set()
    
    for i, field in enumerate(schema['fields']):
        if not isinstance(field, dict):
            return False, f"Field {i} must be an object"
        
        required_field_attrs = ['name', 'type', 'label']
        for attr in required_field_attrs:
            if attr not in field:
                return False, f"Field {i} missing required attribute: {attr}"
        
        # Check for duplicate field names
        field_name = field['name']
        if field_name in field_names:
            return False, f"Duplicate field name: {field_name}"
        field_names.add(field_name)
        
        # Validate field type
        valid_field_types = [
            'text', 'email', 'number', 'date', 'datetime', 'select', 
            'multiselect', 'checkbox', 'radio', 'textarea', 'file'
        ]
        if field['type'] not in valid_field_types:
            return False, f"Invalid field type: {field['type']}"
        
        # Validate options for select/radio fields
        if field['type'] in ['select', 'multiselect', 'radio']:
            if 'options' not in field or not isinstance(field['options'], list):
                return False, f"Field '{field_name}' of type '{field['type']}' must have 'options' array"
    
    return True, None

def validate_date_range(start_date: str, end_date: str) -> bool:
    """Validate that start_date is before end_date"""
    try:
        start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        return start <= end
    except (ValueError, AttributeError):
        return False

def validate_pagination_params(page: Any, limit: Any) -> tuple[int, int]:
    """Validate and normalize pagination parameters"""
    try:
        page = max(1, int(page))
    except (ValueError, TypeError):
        page = 1
    
    try:
        limit = max(1, min(100, int(limit)))  # Cap at 100 items per page
    except (ValueError, TypeError):
        limit = 20
    
    return page, limit

def validate_sort_params(sort_by: str, sort_order: str, allowed_fields: List[str]) -> tuple[str, str]:
    """Validate sorting parameters"""
    if sort_by not in allowed_fields:
        sort_by = allowed_fields[0] if allowed_fields else 'created_at'
    
    if sort_order.lower() not in ['asc', 'desc']:
        sort_order = 'desc'
    
    return sort_by, sort_order.lower()