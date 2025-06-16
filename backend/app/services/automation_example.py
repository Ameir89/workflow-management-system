# ===== AUTOMATION CONFIGURATION EXAMPLES =====

AUTOMATION_EXAMPLES = {
    "api_call_example": {
        "type": "api_call",
        "name": "Update External System",
        "url": "https://api.external-system.com/update",
        "method": "POST",
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer {{api_token}}"
        },
        "data": {
            "workflow_id": "{{workflow_instance_id}}",
            "status": "{{workflow_data.status}}",
            "user_email": "{{workflow_data.user.email}}"
        },
        "auth": {
            "type": "bearer",
            "token": "{{api_token}}"
        },
        "timeout": 30,
        "max_retries": 2,
        "retry_delay": 10
    },

    "python_script_example": {
        "type": "script_execution",
        "script_type": "python",
        "script": """
# Calculate approval amount based on workflow data
amount = float(context['workflow_data'].get('amount', 0))
department = context['workflow_data'].get('department', '')

# Business logic
if department == 'IT' and amount > 10000:
    result = {
        'requires_cto_approval': True,
        'approval_level': 'executive'
    }
elif amount > 5000:
    result = {
        'requires_manager_approval': True,
        'approval_level': 'manager'
    }
else:
    result = {
        'auto_approved': True,
        'approval_level': 'automatic'
    }
        """,
        "timeout": 60,
        "allow_network": False
    },

    "email_notification_example": {
        "type": "email_notification",
        "recipients": ["{{workflow_data.manager_email}}", "finance@company.com"],
        "subject": "Approval Required: {{workflow_data.title}}",
        "body": """
Dear {{workflow_data.manager_name}},

A new approval request has been submitted:

Title: {{workflow_data.title}}
Amount: ${{workflow_data.amount}}
Department: {{workflow_data.department}}
Submitted by: {{workflow_data.submitter_name}}

Please review and approve at: {{approval_url}}

Best regards,
Workflow System
        """,
        "template_id": "approval_notification"
    },

    "database_operation_example": {
        "type": "database_operation",
        "operation": "insert",
        "table": "approval_logs",
        "data": {
            "workflow_instance_id": "{{workflow_instance_id}}",
            "amount": "{{workflow_data.amount}}",
            "department": "{{workflow_data.department}}",
            "status": "pending_approval",
            "created_at": "NOW()"
        }
    },

    "webhook_trigger_example": {
        "type": "webhook_trigger",
        "webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
        "event_type": "workflow_started",
        "payload": {
            "text": "New workflow started: {{workflow_data.title}}",
            "channel": "#approvals",
            "username": "WorkflowBot"
        }
    },

    "data_transformation_example": {
        "type": "data_transformation",
        "transformation_type": "map_fields",
        "field_mapping": {
            "external_id": "workflow_instance_id",
            "request_amount": "amount",
            "requesting_department": "department",
            "requestor_email": "user.email"
        }
    }
}
