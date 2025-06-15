## Database Schema (PostgreSQL)

### migrations/schema.sql

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tenants table for multi-tenancy
CREATE TABLE tenants (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    subdomain VARCHAR(100) UNIQUE NOT NULL,
    settings JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    two_fa_secret VARCHAR(32),
    two_fa_enabled BOOLEAN DEFAULT false,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_login TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Roles table
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    permissions JSONB DEFAULT '[]',
    is_system BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- User roles mapping
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    role_id UUID REFERENCES roles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES users(id),
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, role_id)
);

-- Workflows table
CREATE TABLE workflows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    version INTEGER DEFAULT 1,
    definition JSONB NOT NULL, -- Workflow steps, conditions, etc.
    is_active BOOLEAN DEFAULT true,
    is_template BOOLEAN DEFAULT false,
    category VARCHAR(100),
    tags TEXT[],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Workflow instances (executions)
CREATE TABLE workflow_instances (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_id UUID REFERENCES workflows(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    current_step VARCHAR(100),
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, cancelled, failed
    priority VARCHAR(20) DEFAULT 'medium', -- low, medium, high, urgent
    initiated_by UUID REFERENCES users(id),
    assigned_to UUID REFERENCES users(id),
    data JSONB DEFAULT '{}', -- Instance-specific data
    metadata JSONB DEFAULT '{}',
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);



-- Form definitions
CREATE TABLE form_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    schema JSONB NOT NULL, -- Form fields, validation rules, etc.
    version INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Tasks (workflow steps)
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    step_id VARCHAR(100) NOT NULL, -- References step in workflow definition
    name VARCHAR(255) NOT NULL,
    description TEXT,
    type VARCHAR(50) NOT NULL, -- form, approval, notification, automation, etc.
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_progress, completed, skipped, failed
    assigned_to UUID REFERENCES users(id),
    assigned_by UUID REFERENCES users(id),
    form_id UUID REFERENCES form_definitions(id) ON DELETE SET NULL,  -- NEW COLUMN
    form_data JSONB DEFAULT '{}',
    result JSONB DEFAULT '{}',
    due_date TIMESTAMP WITH TIME ZONE,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Form responses
CREATE TABLE form_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    form_definition_id UUID REFERENCES form_definitions(id),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    workflow_instance_id UUID REFERENCES workflow_instances(id) ON DELETE CASCADE,
    data JSONB NOT NULL,
    submitted_by UUID REFERENCES users(id),
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SLA definitions
CREATE TABLE sla_definitions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    workflow_id UUID REFERENCES workflows(id),
    step_id VARCHAR(100), -- NULL means applies to entire workflow
    duration_hours INTEGER NOT NULL,
    escalation_rules JSONB DEFAULT '[]',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- SLA breaches
CREATE TABLE sla_breaches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sla_definition_id UUID REFERENCES sla_definitions(id),
    workflow_instance_id UUID REFERENCES workflow_instances(id),
    task_id UUID REFERENCES tasks(id),
    breach_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    escalation_level INTEGER DEFAULT 1,
    notified_users UUID[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Files table
CREATE TABLE files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    workflow_instance_id UUID REFERENCES workflow_instances(id),
    task_id UUID REFERENCES tasks(id),
    original_name VARCHAR(255) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    file_size BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    checksum VARCHAR(64),
    is_encrypted BOOLEAN DEFAULT false,
    uploaded_by UUID REFERENCES users(id),
    uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    access_level VARCHAR(20) DEFAULT 'private' -- private, team, public
);

-- Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL, -- task_assigned, task_completed, sla_breach, etc.
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB DEFAULT '{}',
    is_read BOOLEAN DEFAULT false,
    delivery_method VARCHAR(20) DEFAULT 'in_app', -- in_app, email, sms
    sent_at TIMESTAMP WITH TIME ZONE,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit logs table
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(50) NOT NULL,
    resource_id UUID,
    old_values JSONB,
    new_values JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Session management
CREATE TABLE user_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_activity TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhooks
CREATE TABLE webhooks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    url VARCHAR(500) NOT NULL,
    events TEXT[] NOT NULL, -- workflow_started, task_completed, etc.
    headers JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    secret VARCHAR(255),
    retry_count INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Webhook deliveries
CREATE TABLE webhook_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    response_status INTEGER,
    response_body TEXT,
    delivery_attempts INTEGER DEFAULT 0,
    last_attempt_at TIMESTAMP WITH TIME ZONE,
    delivered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add task_comments table for task notes/comments
-- This table was referenced in the code but missing from schema

CREATE TABLE task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);



-- Indexes for performance
CREATE INDEX idx_users_tenant_id ON users(tenant_id);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_workflow_instances_status ON workflow_instances(status);
CREATE INDEX idx_workflow_instances_assigned_to ON workflow_instances(assigned_to);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);
CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, is_read);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_files_workflow_instance ON files(workflow_instance_id);
CREATE INDEX idx_sla_breaches_workflow_instance ON sla_breaches(workflow_instance_id);
-- Add index for performance
CREATE INDEX idx_task_comments_task_id ON task_comments(task_id);
CREATE INDEX idx_task_comments_created_at ON task_comments(created_at);

ALTER TABLE tasks ADD COLUMN completed_by UUID REFERENCES users(id);

-- Add indexes for performance
CREATE INDEX idx_tasks_form_id ON tasks(form_id);
CREATE INDEX idx_tasks_completed_by ON tasks(completed_by);

-- Insert default tenant and admin user
INSERT INTO tenants (id, name, subdomain) VALUES
('00000000-0000-0000-0000-000000000001', 'Default Organization', 'default');

INSERT INTO roles (id, tenant_id, name, description, permissions, is_system) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Super Admin', 'System administrator with full access', '["*"]', true),
('00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001', 'Admin', 'Organization administrator', '["manage_workflows", "manage_users", "view_reports", "manage_sla"]', false),
('00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001', 'User', 'Regular user', '["create_workflows", "execute_tasks", "view_reports"]', false);

-- Default admin user (password: admin123!)
INSERT INTO users (id, tenant_id, username, email, password_hash, first_name, last_name, is_verified) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'admin', 'admin@example.com', '$2b$12$Ppyp.CEXX0GttnrEz733Z.asnCsG6RUg11DNaJ5hSJh57eJjWYQXO', 'System', 'Administrator', true);

INSERT INTO user_roles (user_id, role_id) VALUES
('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');

ALTER TABLE webhooks ADD COLUMN updated_at TIMESTAMP;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_webhooks_updated_at
BEFORE UPDATE ON webhooks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

INSERT INTO roles (tenant_id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', 'manager', 'Department Manager', '["approve_requests"]'),
('00000000-0000-0000-0000-000000000001', 'supervisor', 'Team Supervisor', '["review_tasks"]'),
('00000000-0000-0000-0000-000000000001', 'director', 'Department Director', '["approve_budget"]');


-- Enhanced Lookup Tables Schema with multi-tenancy support
-- This extends your existing schema to match your application patterns

-- Lookup Tables (main table definition)
CREATE TABLE lookup_tables (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    display_name VARCHAR(200) NOT NULL,
    description TEXT,
    value_field VARCHAR(100) NOT NULL DEFAULT 'value',
    display_field VARCHAR(100) NOT NULL DEFAULT 'label',
    additional_fields JSONB DEFAULT '[]', -- Array of additional field names
    settings JSONB DEFAULT '{}', -- Table-specific settings
    is_active BOOLEAN DEFAULT true,
    is_system BOOLEAN DEFAULT false, -- System tables cannot be deleted
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

-- Lookup Data (stores actual lookup records)
CREATE TABLE lookup_data (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lookup_table_id UUID REFERENCES lookup_tables(id) ON DELETE CASCADE,
    data JSONB NOT NULL, -- Contains all field values
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lookup Usage Tracking (optional - for analytics)
CREATE TABLE lookup_usage_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lookup_table_id UUID REFERENCES lookup_tables(id) ON DELETE CASCADE,
    lookup_data_id UUID REFERENCES lookup_data(id) ON DELETE CASCADE,
    used_by_table VARCHAR(100), -- Table where lookup was used
    used_by_id UUID, -- Record ID where lookup was used
    used_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_lookup_tables_tenant_id ON lookup_tables(tenant_id);
CREATE INDEX idx_lookup_tables_name ON lookup_tables(tenant_id, name);
CREATE INDEX idx_lookup_tables_active ON lookup_tables(is_active);

CREATE INDEX idx_lookup_data_table_id ON lookup_data(lookup_table_id);
CREATE INDEX idx_lookup_data_active ON lookup_data(lookup_table_id, is_active);
CREATE INDEX idx_lookup_data_sort ON lookup_data(lookup_table_id, sort_order);
CREATE INDEX idx_lookup_data_search ON lookup_data USING gin(data);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_lookup_tables_updated_at
    BEFORE UPDATE ON lookup_tables
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lookup_data_updated_at
    BEFORE UPDATE ON lookup_data
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Insert some sample system lookup tables
INSERT INTO lookup_tables (
    id, tenant_id, name, display_name, description, value_field, display_field,
    additional_fields, is_system, created_by
) VALUES
(
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'priorities',
    'Priority Levels',
    'Standard priority levels for tasks and workflows',
    'value',
    'label',
    '["color", "sort_order"]',
    true,
    '00000000-0000-0000-0000-000000000001'
),
(
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'departments',
    'Departments',
    'Organization departments',
    'code',
    'name',
    '["manager", "budget_code"]',
    true,
    '00000000-0000-0000-0000-000000000001'
),
(
    '10000000-0000-0000-0000-000000000003',
    '00000000-0000-0000-0000-000000000001',
    'countries',
    'Countries',
    'Country list for address forms',
    'iso_code',
    'name',
    '["region", "currency"]',
    true,
    '00000000-0000-0000-0000-000000000001'
);

-- Insert sample data for priorities
INSERT INTO lookup_data (lookup_table_id, data, sort_order) VALUES
('10000000-0000-0000-0000-000000000001', '{"value": "low", "label": "Low", "color": "#28a745", "sort_order": 1}', 1),
('10000000-0000-0000-0000-000000000001', '{"value": "medium", "label": "Medium", "color": "#ffc107", "sort_order": 2}', 2),
('10000000-0000-0000-0000-000000000001', '{"value": "high", "label": "High", "color": "#fd7e14", "sort_order": 3}', 3),
('10000000-0000-0000-0000-000000000001', '{"value": "urgent", "label": "Urgent", "color": "#dc3545", "sort_order": 4}', 4);

-- Insert sample data for departments
INSERT INTO lookup_data (lookup_table_id, data, sort_order) VALUES
('10000000-0000-0000-0000-000000000002', '{"code": "ENG", "name": "Engineering", "manager": "John Smith", "budget_code": "ENG-2024"}', 1),
('10000000-0000-0000-0000-000000000002', '{"code": "HR", "name": "Human Resources", "manager": "Jane Doe", "budget_code": "HR-2024"}', 2),
('10000000-0000-0000-0000-000000000002', '{"code": "FIN", "name": "Finance", "manager": "Bob Johnson", "budget_code": "FIN-2024"}', 3),
('10000000-0000-0000-0000-000000000002', '{"code": "MKT", "name": "Marketing", "manager": "Alice Brown", "budget_code": "MKT-2024"}', 4);

-- Insert sample data for countries (few examples)
INSERT INTO lookup_data (lookup_table_id, data, sort_order) VALUES
('10000000-0000-0000-0000-000000000003', '{"iso_code": "SD", "name": "Sudan", "region": "Africa", "currency": "SD"}', 1);
--('10000000-0000-0000-0000-000000000003', '{"iso_code": "CA", "name": "Canada", "region": "North America", "currency": "CAD"}', 2),
--('10000000-0000-0000-0000-000000000003', '{"iso_code": "UK", "name": "United Kingdom", "region": "Europe", "currency": "GBP"}', 3),
--('10000000-0000-0000-0000-000000000003', '{"iso_code": "DE", "name": "Germany", "region": "Europe", "currency": "EUR"}', 4),
--('10000000-0000-0000-0000-000000000003', '{"iso_code": "UG", "name": "Uganda", "region": "Africa", "currency": "UGX"}', 5);

-- Updated role permissions to include lookup table management
-- Add this to your existing schema migration or run separately

-- Update Admin role permissions to include lookup management
UPDATE roles
SET permissions = '["manage_workflows", "manage_users", "view_reports", "manage_sla", "manage_lookups", "view_all_lookups"]'
WHERE name = 'Admin' AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- Update User role permissions to include basic lookup access
UPDATE roles
SET permissions = '["create_workflows", "execute_tasks", "view_reports", "view_lookups"]'
WHERE name = 'User' AND tenant_id = '00000000-0000-0000-0000-000000000001';

-- Create new role for Lookup Administrator
INSERT INTO roles (tenant_id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', 'Lookup Admin', 'Lookup Table Administrator',
 '["manage_lookups", "view_all_lookups", "import_lookups", "export_lookups", "manage_system_lookups"]');

-- Create new role for Data Manager
INSERT INTO roles (tenant_id, name, description, permissions) VALUES
('00000000-0000-0000-0000-000000000001', 'Data Manager', 'Data and Configuration Manager',
 '["manage_lookups", "view_all_lookups", "manage_forms", "view_reports", "export_data"]');

-- Add lookup-specific permissions reference
--/*
--Available Lookup Permissions:
--- view_lookups: Can view and use lookup tables in forms
--- manage_lookups: Can create, edit, and delete custom lookup tables and data
--- view_all_lookups: Can view all lookup tables including system tables
--- manage_system_lookups: Can modify system lookup tables (admin only)
--- import_lookups: Can bulk import lookup data
--- export_lookups: Can export lookup data
--*/