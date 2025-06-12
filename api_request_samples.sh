# Workflow Management System - API Request Examples

## Base URL
BASE_URL="http://localhost:5000/api"

## 1. AUTHENTICATION

### Login (Basic)
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@example.com",
    "password": "admin123!"
  }'

# Response:
{
  "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "refresh_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
  "user": {
    "id": "00000000-0000-0000-0000-000000000001",
    "username": "admin",
    "email": "admin@example.com",
    "first_name": "System",
    "last_name": "Administrator",
    "roles": ["Super Admin"],
    "permissions": ["*"]
  }
}

### Login with 2FA
curl -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "username": "admin@example.com",
    "password": "admin123!",
    "two_fa_token": "123456"
  }'

### Setup 2FA
curl -X POST "$BASE_URL/auth/setup-2fa" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "secret": "JBSWY3DPEHPK3PXP",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
}

### Verify 2FA
curl -X POST "$BASE_URL/auth/verify-2fa" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "token": "123456"
  }'

### Refresh Token
curl -X POST "$BASE_URL/auth/refresh" \
  -H "Content-Type: application/json" \
  -d '{
    "refresh_token": "YOUR_REFRESH_TOKEN"
  }'

### Get Profile
curl -X GET "$BASE_URL/auth/profile" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Logout
curl -X POST "$BASE_URL/auth/logout" \
  -H "Authorization: Bearer YOUR_TOKEN"

## 2. WORKFLOW MANAGEMENT

### List Workflows
curl -X GET "$BASE_URL/workflows?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "workflows": [
    {
      "id": "workflow-uuid",
      "name": "Employee Leave Request",
      "description": "Process for requesting and approving employee leave",
      "version": 1,
      "is_active": true,
      "category": "HR",
      "tags": ["hr", "leave", "approval"],
      "created_at": "2024-01-15T10:30:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "created_by_name": "System Administrator",
      "instance_count": 25
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 1,
    "pages": 1
  }
}

### Get Specific Workflow
curl -X GET "$BASE_URL/workflows/workflow-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "workflow": {
    "id": "workflow-uuid",
    "name": "Employee Leave Request",
    "description": "Process for requesting and approving employee leave",
    "definition": {
      "steps": [
        {
          "id": "submit_request",
          "name": "Submit Leave Request",
          "type": "task",
          "isStart": true,
          "position": { "x": 100, "y": 100 },
          "properties": {
            "formId": "leave-request-form",
            "assignee": "{{initiator}}",
            "dueHours": 24
          }
        }
      ],
      "transitions": [
        {
          "id": "submit_to_manager",
          "from": "submit_request",
          "to": "manager_review"
        }
      ]
    }
  }
}

### Create Workflow
curl -X POST "$BASE_URL/workflows" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Document Review Process",
    "description": "Multi-step document review and approval",
    "category": "Operations",
    "tags": ["document", "review", "approval"],
    "definition": {
      "steps": [
        {
          "id": "submit_document",
          "name": "Submit Document",
          "type": "task",
          "isStart": true,
          "position": { "x": 100, "y": 100 },
          "properties": {
            "formId": "document-submission-form",
            "assignee": "{{initiator}}",
            "dueHours": 24,
            "instructions": "Upload document and provide description"
          }
        },
        {
          "id": "review_document",
          "name": "Review Document",
          "type": "approval",
          "position": { "x": 300, "y": 100 },
          "properties": {
            "approvers": ["{{initiator.manager}}"],
            "approvalType": "any",
            "dueHours": 48
          }
        }
      ],
      "transitions": [
        {
          "id": "submit_to_review",
          "from": "submit_document",
          "to": "review_document"
        }
      ]
    }
  }'

### Update Workflow
curl -X PUT "$BASE_URL/workflows/workflow-uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Updated Document Review Process",
    "description": "Enhanced multi-step document review",
    "is_active": true
  }'

### Execute Workflow
curl -X POST "$BASE_URL/workflows/workflow-uuid/execute" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "data": {
      "document_type": "contract",
      "priority": "high",
      "department": "legal",
      "requested_by": "john.doe@company.com"
    }
  }'

# Response:
{
  "message": "Workflow executed successfully",
  "instance_id": "instance-uuid"
}

### Get Workflow Instances
curl -X GET "$BASE_URL/workflows/workflow-uuid/instances?status=in_progress&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Get Specific Workflow Instance
curl -X GET "$BASE_URL/workflows/instances/instance-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "instance": {
    "id": "instance-uuid",
    "title": "Document Review Process",
    "status": "in_progress",
    "current_step": "review_document",
    "priority": "medium",
    "created_at": "2024-01-15T14:30:00Z",
    "workflow_name": "Document Review Process",
    "initiated_by_name": "John Doe",
    "data": {
      "document_type": "contract",
      "priority": "high"
    }
  },
  "tasks": [
    {
      "id": "task-uuid",
      "name": "Submit Document",
      "status": "completed",
      "assigned_to_name": "John Doe",
      "completed_at": "2024-01-15T15:00:00Z"
    },
    {
      "id": "task-uuid-2",
      "name": "Review Document",
      "status": "pending",
      "assigned_to_name": "Jane Manager",
      "due_date": "2024-01-17T15:00:00Z"
    }
  ]
}

## 3. TASK MANAGEMENT

### List Tasks
curl -X GET "$BASE_URL/tasks?assigned_to_me=true&status=pending&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "tasks": [
    {
      "id": "task-uuid",
      "name": "Review Contract Terms",
      "description": "Review legal terms and conditions",
      "type": "approval",
      "status": "pending",
      "due_date": "2024-01-17T15:00:00Z",
      "created_at": "2024-01-15T14:30:00Z",
      "workflow_title": "Contract Review Process",
      "workflow_instance_id": "instance-uuid",
      "assigned_to_name": "Jane Manager",
      "is_overdue": false
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 5,
    "pages": 1
  }
}

### Get Task Details
curl -X GET "$BASE_URL/tasks/task-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "task": {
    "id": "task-uuid",
    "name": "Review Contract Terms",
    "description": "Review legal terms and conditions",
    "type": "approval",
    "status": "pending",
    "step_id": "review_document",
    "form_schema": {
      "fields": [
        {
          "name": "approval_decision",
          "type": "radio",
          "label": "Decision",
          "required": true,
          "options": [
            {"value": "approved", "label": "Approve"},
            {"value": "rejected", "label": "Reject"},
            {"value": "needs_revision", "label": "Needs Revision"}
          ]
        },
        {
          "name": "comments",
          "type": "textarea",
          "label": "Comments",
          "required": false
        }
      ]
    },
    "workflow_data": {
      "document_type": "contract",
      "priority": "high"
    }
  }
}

### Complete Task
curl -X POST "$BASE_URL/tasks/task-uuid/complete" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "result": {
      "approval_decision": "approved",
      "comments": "Contract terms look good. Approved for execution.",
      "approved_amount": 50000,
      "approval_date": "2024-01-16T10:00:00Z"
    }
  }'

### Assign Task
curl -X POST "$BASE_URL/tasks/task-uuid/assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "assigned_to": "user-uuid"
  }'

### Submit Form Response
curl -X POST "$BASE_URL/tasks/task-uuid/form-response" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "form_data": {
      "employee_name": "John Doe",
      "leave_type": "vacation",
      "start_date": "2024-02-01",
      "end_date": "2024-02-05",
      "reason": "Family vacation",
      "emergency_contact": "+1-555-0123"
    }
  }'

### Get Task Dashboard Stats
curl -X GET "$BASE_URL/tasks/dashboard-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "stats": {
    "total_tasks": 45,
    "pending_tasks": 12,
    "in_progress_tasks": 8,
    "completed_tasks": 25,
    "overdue_tasks": 3
  },
  "recent_tasks": [
    {
      "id": "task-uuid",
      "name": "Approve Budget Request",
      "status": "pending",
      "due_date": "2024-01-18T17:00:00Z",
      "workflow_title": "Budget Approval Process"
    }
  ]
}

## 4. FORM MANAGEMENT

### Create Form Definition
curl -X POST "$BASE_URL/forms" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Employee Information Form",
    "description": "Collect employee personal and work information",
    "schema": {
      "title": "Employee Information",
      "description": "Please provide your complete information",
      "fields": [
        {
          "name": "first_name",
          "type": "text",
          "label": "First Name",
          "required": true,
          "validation": {
            "minLength": 2,
            "maxLength": 50
          }
        },
        {
          "name": "last_name",
          "type": "text",
          "label": "Last Name",
          "required": true,
          "validation": {
            "minLength": 2,
            "maxLength": 50
          }
        },
        {
          "name": "email",
          "type": "email",
          "label": "Email Address",
          "required": true,
          "validation": {
            "pattern": "^[\\w-\\.]+@([\\w-]+\\.)+[\\w-]{2,4}$"
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
            {"value": "hr", "label": "Human Resources"}
          ]
        },
        {
          "name": "hire_date",
          "type": "date",
          "label": "Hire Date",
          "required": true
        },
        {
          "name": "skills",
          "type": "multiselect",
          "label": "Skills",
          "required": false,
          "options": [
            {"value": "javascript", "label": "JavaScript"},
            {"value": "python", "label": "Python"},
            {"value": "java", "label": "Java"},
            {"value": "sql", "label": "SQL"}
          ]
        },
        {
          "name": "resume",
          "type": "file",
          "label": "Resume",
          "required": false,
          "accept": ".pdf,.doc,.docx",
          "maxSize": 5242880
        }
      ]
    }
  }'

### Get Form Definitions
curl -X GET "$BASE_URL/forms?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Get Form Definition
curl -X GET "$BASE_URL/forms/form-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"

## 5. FILE MANAGEMENT

### Upload File
curl -X POST "$BASE_URL/files/upload" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/document.pdf" \
  -F "workflow_instance_id=instance-uuid" \
  -F "task_id=task-uuid" \
  -F "description=Contract document for review"

# Response:
{
  "message": "File uploaded successfully",
  "file_id": "file-uuid",
  "file_name": "document.pdf",
  "file_size": 2048576,
  "file_url": "/api/files/file-uuid/download"
}

### Download File
curl -X GET "$BASE_URL/files/file-uuid/download" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o downloaded_document.pdf

### List Files
curl -X GET "$BASE_URL/files?workflow_instance_id=instance-uuid&page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Delete File
curl -X DELETE "$BASE_URL/files/file-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"

## 6. REPORTS AND ANALYTICS

### Get Dashboard Statistics
curl -X GET "$BASE_URL/reports/dashboard-stats" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "workflows": {
    "total_workflows": 15,
    "active_workflows": 12,
    "recent_workflows": 3
  },
  "instances": {
    "total_instances": 145,
    "pending_instances": 25,
    "in_progress_instances": 45,
    "completed_instances": 70,
    "failed_instances": 5
  },
  "tasks": {
    "total_tasks": 320,
    "pending_tasks": 45,
    "completed_tasks": 275,
    "overdue_tasks": 8
  },
  "completion_rate": 78.5,
  "trend": [
    {
      "date": "2024-01-15",
      "started": 5,
      "completed": 3
    }
  ]
}

### Get Performance Report
curl -X GET "$BASE_URL/reports/performance?start_date=2024-01-01&end_date=2024-01-31&workflow_id=workflow-uuid" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Get SLA Compliance Report
curl -X GET "$BASE_URL/reports/sla-compliance" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "compliance_by_workflow": [
    {
      "workflow_name": "Leave Request Process",
      "total_instances": 50,
      "breached_instances": 5,
      "compliance_rate": 90.0,
      "avg_completion_hours": 36.5,
      "sla_hours": 48
    }
  ],
  "breach_by_escalation": [
    {
      "escalation_level": 1,
      "breach_count": 8,
      "avg_resolution_hours": 12.5
    }
  ],
  "recent_breaches": [
    {
      "workflow_name": "Budget Approval",
      "instance_title": "Q1 Marketing Budget",
      "task_name": "Finance Review",
      "escalation_level": 2,
      "breach_time": "2024-01-15T10:00:00Z",
      "assigned_to": "Finance Manager"
    }
  ]
}

### Export Report
curl -X GET "$BASE_URL/reports/export/workflow_instances" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -o workflow_instances_export.csv

### Generate Custom Report
curl -X POST "$BASE_URL/reports/custom" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "report_name": "Monthly Performance Summary",
    "date_range": {
      "start": "2024-01-01",
      "end": "2024-01-31"
    },
    "metrics": [
      "workflow_completion_rate",
      "average_task_duration",
      "sla_compliance"
    ],
    "filters": {
      "department": "engineering",
      "priority": "high"
    }
  }'

## 7. ADMIN FUNCTIONS

### Get Users
curl -X GET "$BASE_URL/admin/users?page=1&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Create User
curl -X POST "$BASE_URL/admin/users" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "username": "jane.doe",
    "email": "jane.doe@company.com",
    "password": "SecurePassword123!",
    "first_name": "Jane",
    "last_name": "Doe",
    "phone": "+1-555-0123",
    "roles": ["user"]
  }'

### Update User
curl -X PUT "$BASE_URL/admin/users/user-uuid" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "first_name": "Jane",
    "last_name": "Smith",
    "phone": "+1-555-0456",
    "is_active": true
  }'

### Get Roles
curl -X GET "$BASE_URL/admin/roles" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Create Role
curl -X POST "$BASE_URL/admin/roles" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Project Manager",
    "description": "Can manage workflows and view reports",
    "permissions": [
      "create_workflows",
      "manage_workflows",
      "view_reports",
      "assign_tasks"
    ]
  }'

### Get Audit Logs
curl -X GET "$BASE_URL/admin/audit-logs?action=workflow_created&date_from=2024-01-01&page=1&limit=50" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Get System Health
curl -X GET "$BASE_URL/admin/health" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "status": "healthy",
  "database": "connected",
  "redis": "connected",
  "storage": "available",
  "version": "1.0.0",
  "uptime": "5 days, 3 hours"
}

## 8. WEBHOOKS

### Create Webhook
curl -X POST "$BASE_URL/webhooks" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "name": "Slack Notifications",
    "url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
    "events": [
      "workflow_started",
      "workflow_completed",
      "task_completed",
      "sla_breach"
    ],
    "headers": {
      "Content-Type": "application/json"
    },
    "secret": "your-webhook-secret"
  }'

### List Webhooks
curl -X GET "$BASE_URL/webhooks" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Test Webhook
curl -X POST "$BASE_URL/webhooks/webhook-uuid/test" \
  -H "Authorization: Bearer YOUR_TOKEN"

## 9. NOTIFICATION MANAGEMENT

### Get Notifications
curl -X GET "$BASE_URL/notifications?unread_only=true&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Response:
{
  "notifications": [
    {
      "id": "notification-uuid",
      "type": "task_assigned",
      "title": "New Task Assigned: Review Budget",
      "message": "You have been assigned a new task in Budget Approval workflow",
      "data": {
        "task_id": "task-uuid",
        "workflow_instance_id": "instance-uuid"
      },
      "is_read": false,
      "created_at": "2024-01-16T09:30:00Z"
    }
  ]
}

### Mark Notification as Read
curl -X PUT "$BASE_URL/notifications/notification-uuid/read" \
  -H "Authorization: Bearer YOUR_TOKEN"

### Mark All Notifications as Read
curl -X PUT "$BASE_URL/notifications/mark-all-read" \
  -H "Authorization: Bearer YOUR_TOKEN"

## 10. ERROR HANDLING EXAMPLES

### 400 Bad Request
{
  "error": "Bad request",
  "message": "Missing required fields: name, definition"
}

### 401 Unauthorized
{
  "error": "Unauthorized",
  "message": "Authentication required"
}

### 403 Forbidden
{
  "error": "Forbidden",
  "message": "Permission required: manage_workflows"
}

### 404 Not Found
{
  "error": "Not found",
  "message": "Workflow not found"
}

### 429 Rate Limited
{
  "error": "Rate limit exceeded",
  "message": "Too many requests. Please try again later."
}

### 500 Internal Server Error
{
  "error": "Internal server error",
  "message": "An unexpected error occurred"
}

## 11. PAGINATION AND FILTERING

### Advanced Filtering Examples
# Get workflows by category and tags
curl -X GET "$BASE_URL/workflows?category=HR&tags=leave,approval&is_active=true" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get tasks with date range and status
curl -X GET "$BASE_URL/tasks?created_after=2024-01-01&created_before=2024-01-31&status=completed&sort_by=completed_at&sort_order=desc" \
  -H "Authorization: Bearer YOUR_TOKEN"

# Search workflows by name
curl -X GET "$BASE_URL/workflows?search=leave request&page=1&limit=10" \
  -H "Authorization: Bearer YOUR_TOKEN"

## 12. BULK OPERATIONS

### Bulk Task Assignment
curl -X POST "$BASE_URL/tasks/bulk-assign" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "task_ids": ["task-uuid-1", "task-uuid-2", "task-uuid-3"],
    "assigned_to": "user-uuid"
  }'

### Bulk Task Status Update
curl -X POST "$BASE_URL/tasks/bulk-update" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "task_ids": ["task-uuid-1", "task-uuid-2"],
    "updates": {
      "status": "in_progress",
      "priority": "high"
    }
  }'