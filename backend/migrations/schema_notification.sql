-- Notification Templates Migration
-- Add missing tables for enhanced notification system

-- ===== NOTIFICATION TEMPLATES TABLE =====
CREATE TABLE IF NOT EXISTS notification_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    name VARCHAR(255) NOT NULL,
    title_template TEXT NOT NULL,
    message_template TEXT NOT NULL,
    channels JSONB DEFAULT '["in_app"]',
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name),
    FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== ENHANCE USERS TABLE =====
-- Add notification preferences to users if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='users' AND column_name='notification_preferences') THEN
        ALTER TABLE users ADD COLUMN notification_preferences JSONB DEFAULT '{"email_enabled": true, "sms_enabled": false, "in_app_enabled": true}';
    END IF;
END $$;

-- ===== ENHANCE NOTIFICATIONS TABLE =====
-- Add title column to notifications if it doesn't exist
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='notifications' AND column_name='title') THEN
        ALTER TABLE notifications ADD COLUMN title VARCHAR(500);
    END IF;
END $$;

-- ===== INDEXES =====
CREATE INDEX IF NOT EXISTS idx_notification_templates_tenant ON notification_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_users_notification_prefs ON users USING GIN(notification_preferences);

-- ===== SAMPLE NOTIFICATION TEMPLATES =====

-- Insert default notification templates for each tenant
INSERT INTO notification_templates (tenant_id, name, title_template, message_template, channels, description, created_by)
SELECT 
    t.id as tenant_id,
    'task_assignment',
    'New Task Assigned: {{task_name}}',
    'Hello {{user_name}},

You have been assigned a new task in our workflow system:

📋 Task: {{task_name}}
🔄 Workflow: {{workflow_title}}
📅 Due Date: {{due_date}}

Please log in to your dashboard to view the details and complete this task.

Best regards,
Workflow Management System',
    '["in_app", "email"]',
    'Template for task assignment notifications',
    u.id as created_by
FROM tenants t
CROSS JOIN LATERAL (
    SELECT id FROM users 
    WHERE tenant_id = t.id 
    AND id IN (
        SELECT user_id FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.name = 'Admin'
    )
    LIMIT 1
) u
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO notification_templates (tenant_id, name, title_template, message_template, channels, description, created_by)
SELECT 
    t.id as tenant_id,
    'approval_request',
    '🔔 Approval Required: {{workflow_title}}',
    'Dear {{user_name}},

An approval request requires your immediate attention:

📋 Request: {{workflow_title}}
💰 Amount: ${{amount}}
🏢 Department: {{department}}
👤 Requested by: {{requestor}}

Please review this request and provide your approval or rejection.

View Details: {{approval_url}}

Time-sensitive - please respond within 48 hours.

Best regards,
Workflow Management System',
    '["in_app", "email", "sms"]',
    'Template for approval request notifications',
    u.id as created_by
FROM tenants t
CROSS JOIN LATERAL (
    SELECT id FROM users 
    WHERE tenant_id = t.id 
    AND id IN (
        SELECT user_id FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.name = 'Admin'
    )
    LIMIT 1
) u
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO notification_templates (tenant_id, name, title_template, message_template, channels, description, created_by)
SELECT 
    t.id as tenant_id,
    'workflow_completion',
    '✅ Workflow Completed: {{workflow_title}}',
    'Hello {{user_name}},

Great news! Your workflow has been completed successfully:

🔄 Workflow: {{workflow_title}}
📅 Completed: {{timestamp}}
⏱️ Total Duration: {{duration}}

All tasks have been finished and the process is now complete.

You can view the complete workflow history in your dashboard.

Best regards,
Workflow Management System',
    '["in_app", "email"]',
    'Template for workflow completion notifications',
    u.id as created_by
FROM tenants t
CROSS JOIN LATERAL (
    SELECT id FROM users 
    WHERE tenant_id = t.id 
    AND id IN (
        SELECT user_id FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.name = 'Admin'
    )
    LIMIT 1
) u
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO notification_templates (tenant_id, name, title_template, message_template, channels, description, created_by)
SELECT 
    t.id as tenant_id,
    'workflow_failure',
    '❌ Workflow Failed: {{workflow_title}}',
    'Hello {{user_name}},

Unfortunately, your workflow has encountered an error and failed:

🔄 Workflow: {{workflow_title}}
❌ Error: {{error_message}}
📅 Failed at: {{timestamp}}

Please check the workflow details and contact support if you need assistance resolving this issue.

Best regards,
Workflow Management System',
    '["in_app", "email"]',
    'Template for workflow failure notifications',
    u.id as created_by
FROM tenants t
CROSS JOIN LATERAL (
    SELECT id FROM users 
    WHERE tenant_id = t.id 
    AND id IN (
        SELECT user_id FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.name = 'Admin'
    )
    LIMIT 1
) u
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO notification_templates (tenant_id, name, title_template, message_template, channels, description, created_by)
SELECT 
    t.id as tenant_id,
    'sla_breach',
    '⚠️ SLA Breach - {{level_text}}: {{task_name}}',
    'URGENT: SLA Breach Alert

Task: {{task_name}}
Workflow: {{workflow_title}}
Escalation Level: {{escalation_level}} ({{level_text}})
Original Due Date: {{due_date}}

This task has exceeded its SLA deadline and requires immediate attention.

Please prioritize this task to avoid further escalation.

Best regards,
Workflow Management System',
    '["in_app", "email", "sms"]',
    'Template for SLA breach notifications',
    u.id as created_by
FROM tenants t
CROSS JOIN LATERAL (
    SELECT id FROM users 
    WHERE tenant_id = t.id 
    AND id IN (
        SELECT user_id FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.name = 'Admin'
    )
    LIMIT 1
) u
ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO notification_templates (tenant_id, name, title_template, message_template, channels, description, created_by)
SELECT 
    t.id as tenant_id,
    'automation_notification',
    '🤖 Automation {{automation_status}}: {{step_name}}',
    'Automation Update

Step: {{step_name}}
Workflow: {{workflow_title}}
Status: {{automation_status}}
Type: {{automation_type}}
Execution ID: {{execution_id}}
Timestamp: {{timestamp}}

{{#if automation_status == "success"}}
The automation step completed successfully.
{{else}}
The automation step encountered an issue. Please check the logs for details.
{{/if}}

Best regards,
Workflow Management System',
    '["in_app"]',
    'Template for automation step notifications',
    u.id as created_by
FROM tenants t
CROSS JOIN LATERAL (
    SELECT id FROM users 
    WHERE tenant_id = t.id 
    AND id IN (
        SELECT user_id FROM user_roles ur 
        JOIN roles r ON ur.role_id = r.id 
        WHERE r.name = 'Admin'
    )
    LIMIT 1
) u
ON CONFLICT (tenant_id, name) DO NOTHING;

-- ===== TRIGGERS =====

-- Function to update notification template updated_at timestamp
CREATE OR REPLACE FUNCTION update_notification_template_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification templates
CREATE TRIGGER trigger_notification_templates_updated_at
    BEFORE UPDATE ON notification_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_notification_template_updated_at();

-- ===== UPDATE EXISTING NOTIFICATIONS =====

-- Update existing notifications to have titles if they don't
UPDATE notifications 
SET title = CASE 
    WHEN type = 'task_assigned' THEN 'New Task Assignment'
    WHEN type = 'task_completed' THEN 'Task Completed'
    WHEN type = 'workflow_completed' THEN 'Workflow Completed'
    WHEN type = 'sla_breach' THEN 'SLA Breach Alert'
    ELSE 'Notification'
END
WHERE title IS NULL;

-- ===== VIEWS FOR NOTIFICATION ANALYTICS =====

-- View for notification statistics
CREATE OR REPLACE VIEW notification_stats AS
SELECT 
    n.type,
    COUNT(*) as total_notifications,
    COUNT(CASE WHEN n.is_read = true THEN 1 END) as read_notifications,
    COUNT(CASE WHEN n.is_read = false THEN 1 END) as unread_notifications,
    ROUND(
        COUNT(CASE WHEN n.is_read = true THEN 1 END) * 100.0 / COUNT(*), 
        2
    ) as read_percentage,
    MAX(n.created_at) as last_notification
FROM notifications n
WHERE n.created_at >= NOW() - INTERVAL '30 days'
GROUP BY n.type;

-- View for user notification preferences
CREATE OR REPLACE VIEW user_notification_preferences AS
SELECT 
    u.id as user_id,
    u.email,
    u.phone,
    u.notification_preferences->>'email_enabled' as email_enabled,
    u.notification_preferences->>'sms_enabled' as sms_enabled,
    u.notification_preferences->>'in_app_enabled' as in_app_enabled,
    COUNT(n.id) as total_notifications,
    COUNT(CASE WHEN n.is_read = false THEN 1 END) as unread_count
FROM users u
LEFT JOIN notifications n ON u.id = n.user_id
GROUP BY u.id, u.email, u.phone, u.notification_preferences;

-- View for template usage analytics
CREATE OR REPLACE VIEW template_usage_stats AS
SELECT 
    nt.tenant_id,
    nt.name as template_name,
    nt.title_template,
    nt.is_active,
    COUNT(n.id) as usage_count,
    MAX(n.created_at) as last_used,
    COUNT(CASE WHEN n.created_at >= NOW() - INTERVAL '7 days' THEN 1 END) as weekly_usage,
    COUNT(CASE WHEN n.created_at >= NOW() - INTERVAL '30 days' THEN 1 END) as monthly_usage
FROM notification_templates nt
LEFT JOIN notifications n ON n.type = nt.name AND n.tenant_id = nt.tenant_id
GROUP BY nt.tenant_id, nt.name, nt.title_template, nt.is_active
ORDER BY usage_count DESC;

-- ===== UTILITY FUNCTIONS =====

-- Function to render notification template with variables
CREATE OR REPLACE FUNCTION render_notification_template(
    template_name VARCHAR(255),
    tenant_uuid UUID,
    variables JSONB DEFAULT '{}'::jsonb
)
RETURNS TABLE(title TEXT, message TEXT, channels JSONB) AS $$
DECLARE
    template_record RECORD;
    rendered_title TEXT;
    rendered_message TEXT;
    var_key TEXT;
    var_value TEXT;
BEGIN
    -- Get the template
    SELECT title_template, message_template, channels INTO template_record
    FROM notification_templates 
    WHERE name = template_name AND tenant_id = tenant_uuid AND is_active = true;
    
    -- If template not found, return null
    IF NOT FOUND THEN
        RETURN;
    END IF;
    
    -- Start with original templates
    rendered_title := template_record.title_template;
    rendered_message := template_record.message_template;
    
    -- Replace variables in title and message
    FOR var_key, var_value IN SELECT * FROM jsonb_each_text(variables)
    LOOP
        rendered_title := REPLACE(rendered_title, '{{' || var_key || '}}', var_value);
        rendered_message := REPLACE(rendered_message, '{{' || var_key || '}}', var_value);
    END LOOP;
    
    -- Return the rendered template
    title := rendered_title;
    message := rendered_message;
    channels := template_record.channels;
    RETURN NEXT;
END;
$$ LANGUAGE plpgsql;

-- Function to get user notification preferences
CREATE OR REPLACE FUNCTION get_user_notification_channels(user_uuid UUID)
RETURNS JSONB AS $$
DECLARE
    prefs JSONB;
    enabled_channels JSONB := '[]'::jsonb;
BEGIN
    SELECT notification_preferences INTO prefs
    FROM users 
    WHERE id = user_uuid;
    
    -- Build array of enabled channels
    IF (prefs->>'email_enabled')::boolean = true THEN
        enabled_channels := enabled_channels || '"email"'::jsonb;
    END IF;
    
    IF (prefs->>'sms_enabled')::boolean = true THEN
        enabled_channels := enabled_channels || '"sms"'::jsonb;
    END IF;
    
    IF (prefs->>'in_app_enabled')::boolean = true THEN
        enabled_channels := enabled_channels || '"in_app"'::jsonb;
    END IF;
    
    RETURN enabled_channels;
END;
$$ LANGUAGE plpgsql;

-- ===== CLEANUP AND OPTIMIZATION =====

-- Add comment to table for documentation
COMMENT ON TABLE notification_templates IS 'Stores reusable notification templates with variable substitution support';
COMMENT ON COLUMN notification_templates.channels IS 'JSON array of supported channels: in_app, email, sms';
COMMENT ON COLUMN notification_templates.title_template IS 'Template for notification title with {{variable}} placeholders';
COMMENT ON COLUMN notification_templates.message_template IS 'Template for notification message with {{variable}} placeholders';

-- Create additional indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_type_tenant ON notifications(type, tenant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);

-- Migration completion log
--INSERT INTO migration_logs (migration_name, executed_at, description)
--VALUES (
--    'notification_templates_enhancement',
--    NOW(),
--    'Added notification templates system with user preferences and analytics views'
--) ON CONFLICT (migration_name) DO NOTHING;