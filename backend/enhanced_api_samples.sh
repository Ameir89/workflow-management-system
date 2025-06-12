# Enhanced Workflow Management System - Complete API Request Examples

## Base Configuration
BASE_URL="http://localhost:5000/api"
TOKEN="your_access_token_here"

# Helper function to set auth header
auth_header() {
    echo "Authorization: Bearer $TOKEN"
}

## 1. ADVANCED AUTHENTICATION EXAMPLES

### Register New User
curl -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "jane.smith",
    "email": "jane.smith@company.com",
    "password": "SecurePass123!",
    "first_name": "Jane",
    "last_name": "Smith"
  }'

### Login with 2FA
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@example.com",
    "password": "admin123!",
    "two_fa_token": "123456"
  }'

### Disable 2FA
curl -X POST "$BASE_URL/auth/disable-2fa" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "token": "123456",
    "password": "current_password"
  }'

## 2. COMPREHENSIVE WORKFLOW EXAMPLES

### Create Complex Multi-Step Workflow
curl -X POST "$BASE_URL/workflows" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "name": "Employee Onboarding Process",
    "description": "Complete onboarding workflow for new employees",
    "category": "HR",
    "tags": ["onboarding", "hr", "employee"],
    "definition": {
      "steps": [
        {
          "id": "welcome_email",
          "name": "Send Welcome Email",
          "type": "automation",
          "isStart": true,
          "position": { "x": 100, "y": 100 },
          "properties": {
            "script": "email_service.send_welcome",
            "template": "employee_welcome",
            "timeout": 60
          }
        },
        {
          "id": "document_collection",
          "name": "Collect Required Documents",
          "type": "task",
          "position": { "x": 300, "y": 100 },
          "properties": {
            "formId": "document-collection-form",
            "assignee": "{{new_employee}}",
            "dueHours": 72,
            "instructions": "Please upload required documents: ID, tax forms, emergency contacts"
          }
        },
        {
          "id": "hr_verification",
          "name": "HR Document Verification",
          "type": "approval",
          "position": { "x": 500, "y": 100 },
          "properties": {
            "approvers": ["hr_team"],
            "approvalType": "any",
            "dueHours": 48,
            "instructions": "Verify all documents are complete and valid"
          }
        },
        {
          "id": "it_setup",
          "name": "IT Account Setup",
          "type": "task",
          "position": { "x": 700, "y": 100 },
          "properties": {
            "assignee": "it_team",
            "dueHours": 24,
            "instructions": "Create user accounts, email, and assign equipment"
          }
        },
        {
          "id": "manager_introduction",
          "name": "Manager Introduction",
          "type": "task",
          "position": { "x": 500, "y": 200 },
          "properties": {
            "assignee": "{{direct_manager}}",
            "dueHours": 48,
            "instructions": "Schedule introduction meeting and first week plan"
          }
        },
        {
          "id": "training_enrollment",
          "name": "Enroll in Training Programs",
          "type": "automation",
          "position": { "x": 900, "y": 100 },
          "properties": {
            "script": "training_system.enroll_employee",
            "timeout": 300
          }
        }
      ],
      "transitions": [
        {
          "id": "welcome_to_documents",
          "from": "welcome_email",
          "to": "document_collection"
        },
        {
          "id": "documents_to_verification",
          "from": "document_collection",
          "to": "hr_verification"
        },
        {
          "id": "verification_to_it",
          "from": "hr_verification",
          "to": "it_setup",
          "condition": {
            "field": "verification_status",
            "operator": "equals",
            "value": "approved"
          }
        },
        {
          "id": "verification_to_manager",
          "from": "hr_verification",
          "to": "manager_introduction",
          "condition": {
            "field": "verification_status",
            "operator": "equals",
            "value": "approved"
          }
        },
        {
          "id": "it_to_training",
          "from": "it_setup",
          "to": "training_enrollment"
        }
      ]
    }
  }'

### Execute Workflow with Complex Data
curl -X POST "$BASE_URL/workflows/workflow-uuid/execute" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "data": {
      "new_employee": "jane.smith@company.com",
      "direct_manager": "john.manager@company.com",
      "department": "Engineering",
      "start_date": "2024-02-01",
      "employee_type": "full_time",
      "office_location": "New York",
      "security_clearance": "standard",
      "equipment_needed": ["laptop", "monitor", "phone"],
      "training_programs": ["security_awareness", "company_culture", "technical_onboarding"]
    }
  }'

### Clone Workflow
curl -X POST "$BASE_URL/workflows/workflow-uuid/clone" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "name": "Contractor Onboarding Process",
    "modifications": {
      "remove_steps": ["training_enrollment"],
      "update_steps": {
        "hr_verification": {
          "dueHours": 24
        }
      }
    }
  }'

## 3. ADVANCED TASK MANAGEMENT

### Get Tasks with Complex Filtering
curl -X GET "$BASE_URL/tasks?assigned_to_me=true&status=pending&priority=high&due_date_range=2024-01-01,2024-01-31&workflow_category=HR&sort_by=due_date&sort_order=asc&page=1&limit=50" \
  -H "$(auth_header)"

### Bulk Task Assignment
curl -X POST "$BASE_URL/tasks/bulk-assign" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "task_ids": ["task-uuid-1", "task-uuid-2", "task-uuid-3"],
    "assigned_to": "user-uuid",
    "notify": true,
    "due_date": "2024-01-20T17:00:00Z",
    "message": "Urgent: Please complete these tasks by end of week"
  }'

### Complete Task with Rich Result Data
curl -X POST "$BASE_URL/tasks/task-uuid/complete" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "result": {
      "decision": "approved",
      "amount_approved": 75000,
      "conditions": [
        "Monthly progress reports required",
        "Budget review after 6 months"
      ],
      "approval_date": "2024-01-16T10:00:00Z",
      "comments": "Approved with conditions. Excellent business case presented.",
      "next_review_date": "2024-07-16",
      "approved_by": "Jane Director",
      "budget_code": "PROJ-2024-001",
      "attachments": ["approval_memo.pdf", "budget_breakdown.xlsx"]
    }
  }'

### Task Delegation
curl -X POST "$BASE_URL/tasks/task-uuid/delegate" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "delegate_to": "user-uuid",
    "reason": "Subject matter expertise required",
    "retain_oversight": true,
    "new_due_date": "2024-01-18T17:00:00Z",
    "instructions": "Please review technical specifications and provide recommendation"
  }'

### Add Task Comment/Note
curl -X POST "$BASE_URL/tasks/task-uuid/comments" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "comment": "Contacted vendor for additional pricing information. Waiting for response.",
    "is_internal": true,
    "attachments": ["vendor_correspondence.pdf"]
  }'

## 4. DYNAMIC FORM MANAGEMENT

### Create Advanced Form Definition
curl -X POST "$BASE_URL/forms" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "name": "Equipment Request Form",
    "description": "Request form for IT equipment and software",
    "schema": {
      "title": "Equipment Request",
      "description": "Please provide details for your equipment request",
      "sections": [
        {
          "title": "Requestor Information",
          "fields": [
            {
              "name": "employee_id",
              "type": "text",
              "label": "Employee ID",
              "required": true,
              "validation": {
                "pattern": "^EMP[0-9]{4}$",
                "message": "Employee ID must be in format EMP1234"
              }
            },
            {
              "name": "department",
              "type": "select",
              "label": "Department",
              "required": true,
              "options": [
                {"value": "engineering", "label": "Engineering"},
                {"value": "marketing", "label": "Marketing"},
                {"value": "sales", "label": "Sales"},
                {"value": "hr", "label": "Human Resources"},
                {"value": "finance", "label": "Finance"}
              ]
            }
          ]
        },
        {
          "title": "Equipment Details",
          "fields": [
            {
              "name": "equipment_type",
              "type": "multiselect",
              "label": "Equipment Type",
              "required": true,
              "options": [
                {"value": "laptop", "label": "Laptop"},
                {"value": "desktop", "label": "Desktop Computer"},
                {"value": "monitor", "label": "Monitor"},
                {"value": "phone", "label": "Mobile Phone"},
                {"value": "tablet", "label": "Tablet"},
                {"value": "software", "label": "Software License"}
              ]
            },
            {
              "name": "justification",
              "type": "textarea",
              "label": "Business Justification",
              "required": true,
              "validation": {
                "minLength": 50,
                "maxLength": 1000
              },
              "placeholder": "Please explain why this equipment is needed for your role..."
            },
            {
              "name": "budget_estimate",
              "type": "number",
              "label": "Estimated Budget ($)",
              "required": true,
              "validation": {
                "min": 0,
                "max": 10000
              }
            },
            {
              "name": "urgency",
              "type": "radio",
              "label": "Urgency Level",
              "required": true,
              "options": [
                {"value": "low", "label": "Low - Can wait 30+ days"},
                {"value": "medium", "label": "Medium - Needed within 2 weeks"},
                {"value": "high", "label": "High - Needed within 1 week"},
                {"value": "urgent", "label": "Urgent - Needed immediately"}
              ]
            },
            {
              "name": "preferred_specs",
              "type": "file",
              "label": "Preferred Specifications",
              "required": false,
              "accept": ".pdf,.doc,.docx",
              "maxSize": 5242880,
              "help": "Upload document with specific requirements if any"
            }
          ]
        }
      ],
      "conditional_logic": [
        {
          "condition": {
            "field": "equipment_type",
            "operator": "contains",
            "value": "software"
          },
          "show_fields": ["software_details"],
          "required_fields": ["software_details"]
        }
      ]
    }
  }'

### Submit Form Response with Validation
curl -X POST "$BASE_URL/tasks/task-uuid/form-response" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "form_data": {
      "employee_id": "EMP1234",
      "department": "engineering",
      "equipment_type": ["laptop", "monitor"],
      "justification": "Current laptop is 4 years old and cannot run new development tools efficiently. Additional monitor needed for code review and debugging activities.",
      "budget_estimate": 2500,
      "urgency": "medium",
      "preferred_vendor": "Dell",
      "additional_notes": "Prefer Linux compatibility"
    },
    "attachments": ["specs_document.pdf"]
  }'

## 5. FILE MANAGEMENT ENHANCEMENTS

### Upload Multiple Files
curl -X POST "$BASE_URL/files/upload-multiple" \
  -H "$(auth_header)" \
  -F "files[]=@contract_draft.pdf" \
  -F "files[]=@budget_sheet.xlsx" \
  -F "files[]=@technical_specs.docx" \
  -F "workflow_instance_id=instance-uuid" \
  -F "task_id=task-uuid" \
  -F "descriptions[]=Contract draft for review" \
  -F "descriptions[]=Budget breakdown" \
  -F "descriptions[]=Technical specifications"

### Get File Preview/Thumbnail
curl -X GET "$BASE_URL/files/file-uuid/preview?size=medium" \
  -H "$(auth_header)" \
  -o preview_image.jpg

### Search Files
curl -X GET "$BASE_URL/files/search?query=contract&file_type=pdf&date_from=2024-01-01&date_to=2024-01-31&workflow_id=workflow-uuid" \
  -H "$(auth_header)"

### File Version Management
curl -X POST "$BASE_URL/files/file-uuid/new-version" \
  -H "$(auth_header)" \
  -F "file=@contract_v2.pdf" \
  -F "version_notes=Updated terms and conditions based on legal review"

## 6. ADVANCED REPORTING AND ANALYTICS

### Generate Executive Dashboard Report
curl -X POST "$BASE_URL/reports/executive-dashboard" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "period": "quarterly",
    "year": 2024,
    "quarter": 1,
    "include_metrics": [
      "workflow_completion_rate",
      "average_cycle_time",
      "sla_compliance",
      "cost_savings",
      "productivity_metrics"
    ],
    "breakdowns": ["department", "workflow_type", "priority"],
    "format": "pdf"
  }'

### Workflow Efficiency Analysis
curl -X GET "$BASE_URL/reports/workflow-efficiency?workflow_id=workflow-uuid&date_range=last_90_days&include_bottlenecks=true&include_recommendations=true" \
  -H "$(auth_header)"

### User Productivity Report
curl -X GET "$BASE_URL/reports/user-productivity?user_id=user-uuid&period=monthly&year=2024&month=1&compare_to_previous=true" \
  -H "$(auth_header)"

### Cost Analysis Report
curl -X POST "$BASE_URL/reports/cost-analysis" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "analysis_type": "workflow_cost_breakdown",
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-03-31"
    },
    "include_labor_costs": true,
    "include_resource_costs": true,
    "cost_centers": ["HR", "Finance", "IT", "Legal"],
    "output_format": "excel"
  }'

## 7. SLA MANAGEMENT

### Create SLA Definition
curl -X POST "$BASE_URL/sla/definitions" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "name": "Critical Financial Approval SLA",
    "workflow_id": "workflow-uuid",
    "step_id": "finance_approval",
    "duration_hours": 24,
    "business_hours_only": true,
    "escalation_rules": [
      {
        "level": 1,
        "after_hours": 8,
        "recipients": ["supervisor"],
        "actions": ["email_notification"]
      },
      {
        "level": 2,
        "after_hours": 16,
        "recipients": ["department_head"],
        "actions": ["email_notification", "sms_notification"]
      },
      {
        "level": 3,
        "after_hours": 24,
        "recipients": ["executive_team"],
        "actions": ["email_notification", "sms_notification", "create_incident"]
      }
    ],
    "conditions": {
      "amount": {"greater_than": 50000},
      "priority": {"equals": "high"}
    }
  }'

### Get SLA Breach Predictions
curl -X GET "$BASE_URL/sla/breach-predictions?horizon_hours=72&confidence_threshold=0.8" \
  -H "$(auth_header)"

### Manual SLA Escalation
curl -X POST "$BASE_URL/sla/breaches/breach-uuid/escalate" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "escalation_level": 2,
    "reason": "Business critical requirement",
    "additional_recipients": ["ceo@company.com"],
    "custom_message": "This approval is blocking a critical customer delivery."
  }'

## 8. INTEGRATION AND WEBHOOKS

### Create Advanced Webhook
curl -X POST "$BASE_URL/webhooks" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "name": "Slack Integration Webhook",
    "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    "events": [
      "workflow_started",
      "workflow_completed",
      "task_overdue",
      "sla_breach",
      "approval_required"
    ],
    "headers": {
      "Content-Type": "application/json",
      "X-Custom-Header": "workflow-system"
    },
    "secret": "your-webhook-secret",
    "retry_count": 5,
    "timeout_seconds": 15,
    "conditions": {
      "workflow_categories": ["Finance", "HR"],
      "priority_levels": ["high", "urgent"],
      "departments": ["Engineering", "Sales"]
    },
    "payload_template": {
      "channel": "#workflows",
      "username": "WorkflowBot",
      "text": "{{event_type}}: {{workflow_title}}",
      "attachments": [
        {
          "color": "{{priority_color}}",
          "fields": [
            {
              "title": "Workflow",
              "value": "{{workflow_name}}",
              "short": true
            },
            {
              "title": "Status",
              "value": "{{status}}",
              "short": true
            }
          ]
        }
      ]
    }
  }'

### Test Webhook with Custom Payload
curl -X POST "$BASE_URL/webhooks/webhook-uuid/test" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "event_type": "custom_test",
    "test_data": {
      "workflow_name": "Test Workflow",
      "status": "in_progress",
      "priority": "high",
      "assigned_to": "test.user@company.com"
    }
  }'

## 9. SYSTEM ADMINISTRATION

### Backup Workflow Definitions
curl -X POST "$BASE_URL/admin/backup/workflows" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "include_instances": false,
    "include_forms": true,
    "include_sla_definitions": true,
    "format": "json",
    "compression": "gzip"
  }'

### System Performance Metrics
curl -X GET "$BASE_URL/admin/metrics?metrics=cpu,memory,database,response_time&period=last_24_hours&granularity=hour" \
  -H "$(auth_header)"

### Bulk User Import
curl -X POST "$BASE_URL/admin/users/import" \
  -H "$(auth_header)" \
  -F "file=@users.csv" \
  -F "update_existing=true" \
  -F "send_welcome_emails=true" \
  -F "default_role=User"

### System Configuration Update
curl -X PUT "$BASE_URL/admin/system-config" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "settings": {
      "workflow_execution": {
        "max_concurrent_instances": 1000,
        "default_task_timeout_hours": 72,
        "auto_cleanup_completed_instances_days": 90
      },
      "notifications": {
        "email_enabled": true,
        "sms_enabled": false,
        "in_app_enabled": true,
        "digest_frequency": "daily"
      },
      "security": {
        "session_timeout_minutes": 480,
        "max_login_attempts": 5,
        "password_expiry_days": 90,
        "require_2fa_for_admins": true
      },
      "file_storage": {
        "max_file_size_mb": 50,
        "allowed_extensions": ["pdf", "doc", "docx", "xls", "xlsx", "png", "jpg"],
        "virus_scanning_enabled": true,
        "retention_days": 2555
      }
    }
  }'

## 10. REAL-WORLD SCENARIO EXAMPLES

### Scenario: Emergency Workflow Override
curl -X POST "$BASE_URL/workflows/instances/instance-uuid/emergency-override" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "override_reason": "Critical system outage requires immediate approval",
    "skip_steps": ["legal_review", "finance_review"],
    "new_approvers": ["emergency_contact"],
    "emergency_contact": "cto@company.com",
    "incident_ticket": "INC-2024-001"
  }'

### Scenario: Workflow Instance Recovery
curl -X POST "$BASE_URL/workflows/instances/instance-uuid/recover" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "recovery_point": "before_step_failure",
    "failed_step_id": "automation_step",
    "recovery_action": "manual_completion",
    "recovery_data": {
      "manual_result": "completed",
      "notes": "Automation failed due to external service outage. Completed manually."
    }
  }'

### Scenario: Bulk Workflow Cancellation
curl -X POST "$BASE_URL/workflows/instances/bulk-cancel" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "filters": {
      "workflow_id": "old-workflow-uuid",
      "status": "pending",
      "created_before": "2024-01-01"
    },
    "cancellation_reason": "Workflow deprecated - migrating to new process",
    "notify_stakeholders": true,
    "migration_workflow_id": "new-workflow-uuid"
  }'

## 11. INTEGRATION TESTING

### Health Check with Detailed Status
curl -X GET "$BASE_URL/health/detailed" \
  -H "$(auth_header)"

# Response includes:
{
  "status": "healthy",
  "timestamp": "2024-01-16T10:00:00Z",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "response_time_ms": 15,
      "connections": {
        "active": 5,
        "max": 100
      }
    },
    "redis": {
      "status": "healthy",
      "memory_usage": "45%"
    },
    "file_storage": {
      "status": "healthy",
      "disk_usage": "68%",
      "available_space_gb": 150
    },
    "email_service": {
      "status": "healthy",
      "last_sent": "2024-01-16T09:45:00Z"
    }
  },
  "metrics": {
    "active_workflows": 245,
    "pending_tasks": 1205,
    "users_online": 89
  }
}

### API Rate Limit Check
curl -X GET "$BASE_URL/rate-limit/status" \
  -H "$(auth_header)"

### Test All Service Endpoints
curl -X POST "$BASE_URL/admin/test/all-endpoints" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "include_external_services": true,
    "timeout_seconds": 30
  }'

## 12. ERROR SCENARIOS AND HANDLING

### Simulate Workflow Failure for Testing
curl -X POST "$BASE_URL/admin/test/simulate-failure" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "failure_type": "database_timeout",
    "affected_endpoints": ["/api/workflows", "/api/tasks"],
    "duration_seconds": 60
  }'

### Retry Failed Operations
curl -X POST "$BASE_URL/operations/retry-failed" \
  -H "Content-Type: application/json" \
  -H "$(auth_header)" \
  -d '{
    "operation_type": "webhook_delivery",
    "failed_after": "2024-01-15T00:00:00Z",
    "max_retries": 3
  }'

## Common HTTP Status Codes and Responses

### 422 Validation Error
{
  "error": "Validation failed",
  "message": "Invalid input data",
  "details": {
    "field_errors": {
      "email": ["Invalid email format"],
      "password": ["Password must be at least 8 characters"],
      "due_date": ["Due date cannot be in the past"]
    }
  }
}

### 409 Conflict
{
  "error": "Conflict",
  "message": "Workflow with this name already exists",
  "conflict_type": "duplicate_name",
  "existing_resource_id": "existing-workflow-uuid"
}

### 503 Service Unavailable
{
  "error": "Service temporarily unavailable",
  "message": "System is under maintenance",
  "retry_after": 300,
  "maintenance_window": {
    "start": "2024-01-16T02:00:00Z",
    "end": "2024-01-16T04:00:00Z"
  }
}

# Environment Variables for Different Environments
# Development
export BASE_URL="http://localhost:5000/api"
export TOKEN="dev_token_here"

# Staging
export BASE_URL="https://staging-api.workflow.company.com/api"
export TOKEN="staging_token_here"

# Production
export BASE_URL="https://api.workflow.company.com/api"
export TOKEN="prod_token_here"