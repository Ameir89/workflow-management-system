-- Database Migration: Enhanced Automation System
-- Run this script to add all necessary tables for the automation engine

-- ===== AUTOMATION EXECUTION LOG =====
CREATE TABLE IF NOT EXISTS automation_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    execution_id VARCHAR(255) UNIQUE NOT NULL,
    automation_type VARCHAR(100) NOT NULL,
    config JSONB,
    context JSONB,
    result JSONB,
    status VARCHAR(50) NOT NULL CHECK (status IN ('pending', 'running', 'completed', 'failed', 'timeout', 'retrying')),
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== AUTOMATION TEMPLATES =====
CREATE TABLE IF NOT EXISTS automation_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    template_data JSONB NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== AUTOMATION SCRIPTS =====
CREATE TABLE IF NOT EXISTS automation_scripts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    script_type VARCHAR(50) NOT NULL CHECK (script_type IN ('python', 'javascript', 'shell')),
    script_content TEXT NOT NULL,
    description TEXT,
    parameters JSONB,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== EMAIL TEMPLATES =====
CREATE TABLE IF NOT EXISTS email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    subject VARCHAR(500) NOT NULL,
    body TEXT NOT NULL,
    is_html BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== SMS TEMPLATES =====
CREATE TABLE IF NOT EXISTS sms_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== CUSTOM FUNCTION REGISTRY =====
CREATE TABLE IF NOT EXISTS custom_functions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    function_code TEXT NOT NULL,
    parameters_schema JSONB,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== WORKFLOW STEP EXECUTIONS (Enhanced) =====
CREATE TABLE IF NOT EXISTS workflow_step_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    workflow_instance_id UUID NOT NULL,
    step_id VARCHAR(255) NOT NULL,
    success BOOLEAN NOT NULL,
    data JSONB,
    error_message TEXT,
    execution_duration_ms INTEGER,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (workflow_instance_id) REFERENCES workflow_instances(id) ON DELETE CASCADE
);

-- ===== ADD AUTOMATION SUPPORT TO EXISTING TABLES =====

-- Add department field to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='department') THEN
        ALTER TABLE users ADD COLUMN department VARCHAR(100);
    END IF;
END $$;

-- Add metadata and priority to tasks table if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='metadata') THEN
        ALTER TABLE tasks ADD COLUMN metadata JSONB;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='tasks' AND column_name='priority') THEN
        ALTER TABLE tasks ADD COLUMN priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
    END IF;
END $$;

-- Add error tracking to workflow_instances if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflow_instances' AND column_name='failed_at_step') THEN
        ALTER TABLE workflow_instances ADD COLUMN failed_at_step VARCHAR(255);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='workflow_instances' AND column_name='error_details') THEN
        ALTER TABLE workflow_instances ADD COLUMN error_details JSONB;
    END IF;
END $$;

-- ===== INDEXES FOR PERFORMANCE =====

-- Automation executions indexes
CREATE INDEX IF NOT EXISTS idx_automation_executions_status ON automation_executions(status);
CREATE INDEX IF NOT EXISTS idx_automation_executions_type ON automation_executions(automation_type);
CREATE INDEX IF NOT EXISTS idx_automation_executions_started_at ON automation_executions(started_at);
CREATE INDEX IF NOT EXISTS idx_automation_executions_execution_id ON automation_executions(execution_id);

-- Template and script indexes
CREATE INDEX IF NOT EXISTS idx_automation_templates_tenant ON automation_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_templates_active ON automation_templates(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_scripts_tenant ON automation_scripts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_automation_scripts_type ON automation_scripts(tenant_id, script_type);
CREATE INDEX IF NOT EXISTS idx_email_templates_tenant ON email_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sms_templates_tenant ON sms_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_functions_tenant ON custom_functions(tenant_id);

-- Workflow step executions indexes
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_instance ON workflow_step_executions(workflow_instance_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_step ON workflow_step_executions(workflow_instance_id, step_id);
CREATE INDEX IF NOT EXISTS idx_workflow_step_executions_success ON workflow_step_executions(success);

-- Enhanced indexes for existing tables
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_metadata ON tasks USING GIN(metadata);
CREATE INDEX IF NOT EXISTS idx_users_department ON users(tenant_id, department);
CREATE INDEX IF NOT EXISTS idx_workflow_instances_failed_step ON workflow_instances(failed_at_step);

-- ===== SAMPLE DATA INSERTION =====

-- Insert default automation templates
INSERT INTO automation_templates (tenant_id, name, description, template_data, created_by)
VALUES  (
'00000000-0000-0000-0000-000000000001',
'API Call Template',
    'Template for making external API calls',
    '{"type": "api_call", "method": "POST", "headers": {"Content-Type": "application/json"}, "timeout": 30, "max_retries": 2}',
    '00000000-0000-0000-0000-000000000001'
);
--SELECT
--    t.id as tenant_id,
--    'API Call Template',
--    'Template for making external API calls',
--    '{"type": "api_call", "method": "POST", "headers": {"Content-Type": "application/json"}, "timeout": 30, "max_retries": 2}',
--    u.id as created_by
--FROM tenants t
--CROSS JOIN LATERAL (
--    SELECT id FROM users
--    WHERE tenant_id = t.id
--    AND id IN (
--        SELECT user_id FROM user_roles ur
--        JOIN roles r ON ur.role_id = r.id
--        WHERE r.name = 'Admin'
--    )
--    LIMIT 1
--) u
--ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO automation_templates (tenant_id, name, description, template_data, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Email Notification Template',
    'Template for sending email notifications',
    '{"type": "email_notification", "subject": "Workflow Notification: {{workflow_data.title}}", "body": "A workflow step has been completed.\n\nWorkflow: {{workflow_data.title}}\nStep: {{step_name}}\nTime: {{timestamp}}"}',
    '00000000-0000-0000-0000-000000000001'
    );


INSERT INTO automation_templates (tenant_id, name, description, template_data, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Database Update Template',
    'Template for updating database records',
    '{"type": "database_operation", "operation": "update", "table": "workflow_tracking", "data": {"status": "{{workflow_data.status}}", "updated_at": "NOW()"}, "conditions": {"workflow_id": "{{workflow_instance_id}}"}}',
    '00000000-0000-0000-0000-000000000001'
    );


-- Insert sample automation scripts
INSERT INTO automation_scripts (tenant_id, name, script_type, script_content, description, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Approval Amount Calculator',
    'python',
    '# Calculate approval requirements based on amount
amount = float(context.get("workflow_data", {}).get("amount", 0))
department = context.get("workflow_data", {}).get("department", "")

if amount > 10000:
    result = {
        "approval_level": "executive",
        "required_approvers": ["cto", "cfo"],
        "escalation_hours": 24
    }
elif amount > 5000:
    result = {
        "approval_level": "manager",
        "required_approvers": ["department_manager"],
        "escalation_hours": 48
    }
else:
    result = {
        "approval_level": "supervisor",
        "required_approvers": ["supervisor"],
        "escalation_hours": 72
    }

print(f"Approval calculated for amount: ${amount}")
',
    'Python script to calculate approval requirements based on amount and department',
   '00000000-0000-0000-0000-000000000001'
   );

INSERT INTO automation_scripts (tenant_id, name, script_type, script_content, description, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Data Validation Script',
    'python',
    '# Validate workflow data
import re

workflow_data = context.get("workflow_data", {})
errors = []
warnings = []

# Validate email format
email = workflow_data.get("email", "")
if email and not re.match(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$", email):
    errors.append("Invalid email format")

# Validate amount
amount = workflow_data.get("amount")
if amount is not None:
    try:
        amount_float = float(amount)
        if amount_float < 0:
            errors.append("Amount cannot be negative")
        elif amount_float > 1000000:
            warnings.append("Large amount detected - additional approval may be required")
    except (ValueError, TypeError):
        errors.append("Amount must be a valid number")

# Validate required fields
required_fields = ["title", "department", "requestor"]
for field in required_fields:
    if not workflow_data.get(field):
        errors.append(f"Missing required field: {field}")

result = {
    "valid": len(errors) == 0,
    "errors": errors,
    "warnings": warnings,
    "validated_data": workflow_data
}

print(f"Validation complete. Valid: {result[\"valid\"]}, Errors: {len(errors)}, Warnings: {len(warnings)}")
',
    'Python script to validate workflow data',
    '00000000-0000-0000-0000-000000000001'
    );


-- Insert default email templates
INSERT INTO email_templates (tenant_id, name, subject, body, is_html, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Workflow Started Notification',
    'Workflow Started: {{workflow_data.title}}',
    'Dear {{workflow_data.requestor_name}},

Your workflow "{{workflow_data.title}}" has been started successfully.

Workflow Details:
- ID: {{workflow_instance_id}}
- Title: {{workflow_data.title}}
- Department: {{workflow_data.department}}
- Priority: {{workflow_data.priority}}
- Started: {{timestamp}}

You will receive updates as the workflow progresses.

Best regards,
Workflow Management System',
    false,
    '00000000-0000-0000-0000-000000000001'
    );


INSERT INTO email_templates (tenant_id, name, subject, body, is_html, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Approval Required Notification',
    'Action Required: Approval for {{workflow_data.title}}',
    '<html>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
    <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #2c5aa0;">Approval Required</h2>

        <p>Dear {{workflow_data.approver_name}},</p>

        <p>A new approval request requires your attention:</p>

        <div style="background-color: #f8f9fa; padding: 15px; border-left: 4px solid #2c5aa0; margin: 20px 0;">
            <h3 style="margin-top: 0;">{{workflow_data.title}}</h3>
            <p><strong>Submitted by:</strong> {{workflow_data.requestor_name}}</p>
            <p><strong>Department:</strong> {{workflow_data.department}}</p>
            <p><strong>Amount:</strong> ${{workflow_data.amount}}</p>
            <p><strong>Priority:</strong> {{workflow_data.priority}}</p>
            <p><strong>Due Date:</strong> {{workflow_data.due_date}}</p>
        </div>

        <div style="margin: 30px 0;">
            <a href="{{approval_url}}" style="background-color: #28a745; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Review & Approve</a>
            <a href="{{rejection_url}}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin-left: 10px;">Reject</a>
        </div>

        <p>Please review this request at your earliest convenience.</p>

        <hr style="border: none; height: 1px; background-color: #dee2e6; margin: 30px 0;">
        <p style="font-size: 12px; color: #6c757d;">
            This is an automated notification from the Workflow Management System.<br>
            Workflow ID: {{workflow_instance_id}}
        </p>
    </div>
</body>
</html>',
    true,
    '00000000-0000-0000-0000-000000000001'
    );


-- Insert default SMS templates
INSERT INTO sms_templates (tenant_id, name, message, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Task Assignment SMS',
    'New task assigned: {{task_name}}. Workflow: {{workflow_data.title}}. Due: {{due_date}}. Check your dashboard for details.',
    '00000000-0000-0000-0000-000000000001'
    );


INSERT INTO sms_templates (tenant_id, name, message, created_by)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Urgent Approval SMS',
    'URGENT: Approval required for {{workflow_data.title}} (${{workflow_data.amount}}). Please review immediately. Workflow ID: {{workflow_instance_id}}',
    '00000000-0000-0000-0000-000000000001'
    );



-- ===== PERMISSIONS FOR AUTOMATION =====

-- Add automation permissions to roles if they don't exist
INSERT INTO roles (tenant_id, name, permissions, description, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Automation Manager',
    '["view_automation", "manage_automation", "execute_automation", "test_automation", "manage_templates", "manage_scripts"]',
    'Can manage and execute automation workflows',
    false
    );


-- Update existing Admin role to include automation permissions
UPDATE roles
SET permissions = jsonb_set(
    permissions::jsonb,
    '{0}',
    (permissions::jsonb || '["view_automation", "manage_automation", "execute_automation", "test_automation"]'::jsonb)::jsonb,
    true
)
WHERE name = 'Admin' AND NOT (permissions::jsonb ? 'view_automation');

-- Update existing Manager role to include view automation permissions
UPDATE roles
SET permissions = jsonb_set(
    permissions::jsonb,
    '{0}',
    (permissions::jsonb || '["view_automation", "execute_automation"]'::jsonb)::jsonb,
    true
)
WHERE name = 'Manager' AND NOT (permissions::jsonb ? 'view_automation');

-- ===== TRIGGERS FOR AUTOMATION AUDIT =====

-- Function to update automation template updated_at timestamp
CREATE OR REPLACE FUNCTION update_automation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at fields
CREATE TRIGGER trigger_automation_templates_updated_at
    BEFORE UPDATE ON automation_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER trigger_automation_scripts_updated_at
    BEFORE UPDATE ON automation_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER trigger_email_templates_updated_at
    BEFORE UPDATE ON email_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_updated_at();

CREATE TRIGGER trigger_sms_templates_updated_at
    BEFORE UPDATE ON sms_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_automation_updated_at();

-- ===== VIEWS FOR AUTOMATION ANALYTICS =====

-- View for automation execution statistics
CREATE OR REPLACE VIEW automation_execution_stats AS
SELECT
    automation_type,
    COUNT(*) as total_executions,
    COUNT(CASE WHEN status = 'completed' THEN 1 END) as successful_executions,
    COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed_executions,
    COUNT(CASE WHEN status = 'timeout' THEN 1 END) as timeout_executions,
    ROUND(AVG(EXTRACT(EPOCH FROM (completed_at - started_at))), 2) as avg_duration_seconds,
    MAX(completed_at) as last_execution
FROM automation_executions
WHERE started_at >= NOW() - INTERVAL '30 days'
GROUP BY automation_type;

-- View for workflow automation performance
CREATE OR REPLACE VIEW workflow_automation_performance AS
SELECT
    wi.workflow_id,
    w.name as workflow_name,
    COUNT(DISTINCT wi.id) as total_instances,
    COUNT(DISTINCT ae.id) as automation_executions,
    COUNT(CASE WHEN ae.status = 'completed' THEN 1 END) as successful_automations,
    COUNT(CASE WHEN ae.status = 'failed' THEN 1 END) as failed_automations,
    ROUND(AVG(EXTRACT(EPOCH FROM (wi.completed_at - wi.created_at))), 2) as avg_workflow_duration_seconds
FROM workflow_instances wi
LEFT JOIN workflows w ON wi.workflow_id = w.id
LEFT JOIN automation_executions ae ON ae.context->>'workflow_instance_id' = wi.id::text
WHERE wi.created_at >= NOW() - INTERVAL '30 days'
GROUP BY wi.workflow_id, w.name;

-- ===== CLEANUP FUNCTION =====

-- Function to cleanup old automation executions
CREATE OR REPLACE FUNCTION cleanup_old_automation_executions(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM automation_executions
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep;

    GET DIAGNOSTICS deleted_count = ROW_COUNT;

    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE automation_executions IS 'Logs all automation executions with results and performance metrics';
COMMENT ON TABLE automation_templates IS 'Reusable automation configuration templates';
COMMENT ON TABLE automation_scripts IS 'Custom scripts for automation execution';
COMMENT ON TABLE email_templates IS 'Email templates for automated notifications';
COMMENT ON TABLE sms_templates IS 'SMS templates for automated notifications';
COMMENT ON TABLE custom_functions IS 'Registry for custom automation functions';
COMMENT ON TABLE workflow_step_executions IS 'Detailed execution log for workflow steps';

COMMENT ON COLUMN automation_executions.execution_id IS 'Unique identifier for tracking automation execution across systems';
COMMENT ON COLUMN automation_executions.config IS 'The automation configuration that was executed';
COMMENT ON COLUMN automation_executions.context IS 'The workflow context at time of execution';
COMMENT ON COLUMN automation_executions.result IS 'The result data returned by the automation';

-- ===== COMPLETION MESSAGE =====

DO $$
BEGIN
    RAISE NOTICE 'Automation system database migration completed successfully!';
    RAISE NOTICE 'Tables created: automation_executions, automation_templates, automation_scripts, email_templates, sms_templates, custom_functions';
    RAISE NOTICE 'Enhanced existing tables: users, tasks, workflow_instances, workflow_step_executions';
    RAISE NOTICE 'Added indexes, triggers, views, and sample data';
    RAISE NOTICE 'To clean up old automation logs, run: SELECT cleanup_old_automation_executions(90);';
END $$;