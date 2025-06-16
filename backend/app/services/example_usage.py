# ===== USAGE EXAMPLE =====
from app.services.automation_engine import AutomationEngine
from app.services.automation_example import AUTOMATION_EXAMPLES
def example_usage():
    """Example of how to use the enhanced automation system"""

    # Initialize automation engine
    automation_engine = AutomationEngine()

    # Example context (would come from workflow)
    context = {
        'workflow_instance_id': '12345',
        'workflow_data': {
            'amount': 15000,
            'department': 'IT',
            'user': {'email': 'john@company.com'},
            'manager_email': 'manager@company.com',
            'title': 'New Server Purchase'
        },
        'tenant_id': 'tenant-123',
        'api_token': 'secret-api-token'
    }

    # Example 1: API Call
    api_config = AUTOMATION_EXAMPLES['api_call_example']
    result1 = automation_engine.execute_automation(api_config, context)
    print("API Call Result:", result1)

    # Example 2: Python Script
    script_config = AUTOMATION_EXAMPLES['python_script_example']
    result2 = automation_engine.execute_automation(script_config, context)
    print("Script Result:", result2)

    # Example 3: Email Notification
    email_config = AUTOMATION_EXAMPLES['email_notification_example']
    result3 = automation_engine.execute_automation(email_config, context)
    print("Email Result:", result3)


if __name__ == "__main__":
    example_usage()
