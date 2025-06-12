### app/utils/validators.py
"""
Input validation utilities
"""
import re
from datetime import datetime
from typing import Dict, List, Any, Optional

def validate_required_fields(data: Dict[str, Any], required_fields: List[str]) -> bool:
    """Validate that all required fields are present and not empty"""
    if not isinstance(data, dict):
        return False
    
    for field in required_fields:
        if field not in data or data[field] is None or str(data[field]).strip() == '':
            return False
    
    return True

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