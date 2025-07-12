-- Scripts Management Database Migration
-- Add missing tables and columns for script management functionality

-- ===== ENHANCE AUTOMATION_SCRIPTS TABLE =====

-- Add missing columns to automation_scripts if they don't exist
DO $$
BEGIN
    -- Add category column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='automation_scripts' AND column_name='category') THEN
        ALTER TABLE automation_scripts ADD COLUMN category VARCHAR(100) DEFAULT 'general';
        COMMENT ON COLUMN automation_scripts.category IS 'Script category for organization';
    END IF;

    -- Add is_template column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='automation_scripts' AND column_name='is_template') THEN
        ALTER TABLE automation_scripts ADD COLUMN is_template BOOLEAN DEFAULT false;
        COMMENT ON COLUMN automation_scripts.is_template IS 'Whether this script is a template';
    END IF;

    -- Add is_system column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='automation_scripts' AND column_name='is_system') THEN
        ALTER TABLE automation_scripts ADD COLUMN is_system BOOLEAN DEFAULT false;
        COMMENT ON COLUMN automation_scripts.is_system IS 'Whether this is a system script (cannot be deleted)';
    END IF;

    -- Add version column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='automation_scripts' AND column_name='version') THEN
        ALTER TABLE automation_scripts ADD COLUMN version INTEGER DEFAULT 1;
        COMMENT ON COLUMN automation_scripts.version IS 'Script version number';
    END IF;

    -- Add tags column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='automation_scripts' AND column_name='tags') THEN
        ALTER TABLE automation_scripts ADD COLUMN tags TEXT[];
        COMMENT ON COLUMN automation_scripts.tags IS 'Tags for script categorization and search';
    END IF;
END $$;

-- ===== CREATE SCRIPT_EXECUTIONS TABLE =====
CREATE TABLE IF NOT EXISTS script_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID NOT NULL,
    success BOOLEAN NOT NULL,
    execution_duration_ms INTEGER,
    result JSONB,
    error_message TEXT,
    is_test BOOLEAN DEFAULT false,
    executed_by UUID,
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (script_id) REFERENCES automation_scripts(id) ON DELETE CASCADE,
    FOREIGN KEY (executed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== CREATE SCRIPT_VERSIONS TABLE =====
CREATE TABLE IF NOT EXISTS script_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    script_content TEXT NOT NULL,
    description TEXT,
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(script_id, version_number),
    FOREIGN KEY (script_id) REFERENCES automation_scripts(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ===== CREATE SCRIPT_FAVORITES TABLE =====
CREATE TABLE IF NOT EXISTS script_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    script_id UUID NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id, script_id),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (script_id) REFERENCES automation_scripts(id) ON DELETE CASCADE
);

-- ===== CREATE SCRIPT_COMMENTS TABLE =====
CREATE TABLE IF NOT EXISTS script_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    script_id UUID NOT NULL,
    user_id UUID NOT NULL,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (script_id) REFERENCES automation_scripts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ===== CREATE INDEXES FOR PERFORMANCE =====

-- Automation scripts indexes
CREATE INDEX IF NOT EXISTS idx_automation_scripts_category ON automation_scripts(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_automation_scripts_type ON automation_scripts(tenant_id, script_type);
CREATE INDEX IF NOT EXISTS idx_automation_scripts_active ON automation_scripts(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_automation_scripts_template ON automation_scripts(tenant_id, is_template);
CREATE INDEX IF NOT EXISTS idx_automation_scripts_tags ON automation_scripts USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_automation_scripts_search ON automation_scripts(tenant_id, name, description);

-- Script executions indexes
CREATE INDEX IF NOT EXISTS idx_script_executions_script_id ON script_executions(script_id);
CREATE INDEX IF NOT EXISTS idx_script_executions_executed_at ON script_executions(executed_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_executions_success ON script_executions(script_id, success);
CREATE INDEX IF NOT EXISTS idx_script_executions_executed_by ON script_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_script_executions_test ON script_executions(script_id, is_test);

-- Script versions indexes
CREATE INDEX IF NOT EXISTS idx_script_versions_script_id ON script_versions(script_id, version_number DESC);

-- Script favorites indexes
CREATE INDEX IF NOT EXISTS idx_script_favorites_user_id ON script_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_script_favorites_script_id ON script_favorites(script_id);

-- Script comments indexes
CREATE INDEX IF NOT EXISTS idx_script_comments_script_id ON script_comments(script_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_script_comments_user_id ON script_comments(user_id);

-- ===== TRIGGERS =====

-- Function to update script version when content changes
CREATE OR REPLACE FUNCTION update_script_version()
RETURNS TRIGGER AS $$
BEGIN
    -- If script content changed, increment version
    IF OLD.script_content IS DISTINCT FROM NEW.script_content THEN
        NEW.version = OLD.version + 1;
        
        -- Store old version in script_versions table
        INSERT INTO script_versions (script_id, version_number, script_content, description, created_by)
        VALUES (OLD.id, OLD.version, OLD.script_content, 'Automatic version backup', NEW.updated_at);
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for script versioning
-- Recreate trigger
DROP TRIGGER IF EXISTS trigger_script_versioning ON automation_scripts;
CREATE TRIGGER trigger_script_versioning
    BEFORE UPDATE ON automation_scripts
    FOR EACH ROW
    EXECUTE FUNCTION update_script_version();

-- Function to update comments updated_at
CREATE OR REPLACE FUNCTION update_script_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for comments updated_at
CREATE TRIGGER trigger_script_comments_updated_at
    BEFORE UPDATE ON script_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_script_comments_updated_at();

-- ===== VIEWS FOR ANALYTICS =====

-- View for script statistics
CREATE OR REPLACE VIEW script_statistics AS
SELECT 
    s.id,
    s.name,
    s.script_type,
    s.category,
    s.is_active,
    s.is_template,
    COUNT(se.id) as total_executions,
    COUNT(CASE WHEN se.success = true THEN 1 END) as successful_executions,
    COUNT(CASE WHEN se.success = false THEN 1 END) as failed_executions,
    ROUND(
        COUNT(CASE WHEN se.success = true THEN 1 END) * 100.0 / NULLIF(COUNT(se.id), 0),
        2
    ) as success_rate,
    AVG(se.execution_duration_ms) as avg_execution_time_ms,
    MAX(se.executed_at) as last_executed,
    COUNT(DISTINCT se.executed_by) as unique_users,
    COUNT(sf.id) as favorite_count,
    COUNT(sc.id) as comment_count
FROM automation_scripts s
LEFT JOIN script_executions se ON s.id = se.script_id
LEFT JOIN script_favorites sf ON s.id = sf.script_id
LEFT JOIN script_comments sc ON s.id = sc.script_id
GROUP BY s.id, s.name, s.script_type, s.category, s.is_active, s.is_template;

-- View for script execution trends
CREATE OR REPLACE VIEW script_execution_trends AS
SELECT 
    DATE(se.executed_at) as execution_date,
    s.script_type,
    s.category,
    COUNT(*) as total_executions,
    COUNT(CASE WHEN se.success = true THEN 1 END) as successful_executions,
    COUNT(CASE WHEN se.success = false THEN 1 END) as failed_executions,
    AVG(se.execution_duration_ms) as avg_duration_ms
FROM script_executions se
JOIN automation_scripts s ON se.script_id = s.id
WHERE se.executed_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(se.executed_at), s.script_type, s.category
ORDER BY execution_date DESC;

-- View for user script activity

CREATE OR REPLACE VIEW user_script_activity AS
WITH created_scripts AS (
    SELECT created_by AS user_id, COUNT(*) AS scripts_created
    FROM automation_scripts
    GROUP BY created_by
),
executed_scripts AS (
    SELECT executed_by AS user_id,
           COUNT(DISTINCT script_id) AS scripts_executed,
           COUNT(*) AS total_executions,
           COUNT(*) FILTER (WHERE success = true) AS successful_executions,
           MAX(executed_at) AS last_execution
    FROM script_executions
    GROUP BY executed_by
),
favorite_scripts AS (
    SELECT user_id, COUNT(*) AS favorite_scripts
    FROM script_favorites
    GROUP BY user_id
)
SELECT 
    u.id AS user_id,
    u.username,
    u.first_name || ' ' || u.last_name AS full_name,
    COALESCE(cs.scripts_created, 0) AS scripts_created,
    COALESCE(es.scripts_executed, 0) AS scripts_executed,
    COALESCE(es.total_executions, 0) AS total_executions,
    COALESCE(es.successful_executions, 0) AS successful_executions,
    COALESCE(fs.favorite_scripts, 0) AS favorite_scripts,
    es.last_execution
FROM users u
LEFT JOIN created_scripts cs ON u.id = cs.user_id
LEFT JOIN executed_scripts es ON u.id = es.user_id
LEFT JOIN favorite_scripts fs ON u.id = fs.user_id;

-- ===== FUNCTIONS =====

-- Function to get script with execution stats
CREATE OR REPLACE FUNCTION get_script_with_stats(script_uuid UUID)
RETURNS TABLE(
    id UUID,
    name VARCHAR,
    description TEXT,
    script_type VARCHAR,
    category VARCHAR,
    is_active BOOLEAN,
    is_template BOOLEAN,
    created_at TIMESTAMP WITH TIME ZONE,
    updated_at TIMESTAMP WITH TIME ZONE,
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    success_rate NUMERIC,
    avg_execution_time_ms NUMERIC,
    last_executed TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.name,
        s.description,
        s.script_type,
        s.category,
        s.is_active,
        s.is_template,
        s.created_at,
        s.updated_at,
        COUNT(se.id) as total_executions,
        COUNT(CASE WHEN se.success = true THEN 1 END) as successful_executions,
        COUNT(CASE WHEN se.success = false THEN 1 END) as failed_executions,
        ROUND(
            COUNT(CASE WHEN se.success = true THEN 1 END) * 100.0 / NULLIF(COUNT(se.id), 0),
            2
        ) as success_rate,
        AVG(se.execution_duration_ms) as avg_execution_time_ms,
        MAX(se.executed_at) as last_executed
    FROM automation_scripts s
    LEFT JOIN script_executions se ON s.id = se.script_id
    WHERE s.id = script_uuid
    GROUP BY s.id, s.name, s.description, s.script_type, s.category, 
             s.is_active, s.is_template, s.created_at, s.updated_at;
END;
$$ LANGUAGE plpgsql;

-- Function to cleanup old script executions
CREATE OR REPLACE FUNCTION cleanup_old_script_executions(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM script_executions 
    WHERE executed_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND is_test = false;  -- Keep test executions shorter
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    -- Clean up old test executions (keep for 7 days)
    DELETE FROM script_executions 
    WHERE executed_at < NOW() - INTERVAL '7 days'
    AND is_test = true;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get script execution summary
CREATE OR REPLACE FUNCTION get_script_execution_summary(
    tenant_uuid UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    total_scripts BIGINT,
    active_scripts BIGINT,
    total_executions BIGINT,
    successful_executions BIGINT,
    failed_executions BIGINT,
    success_rate NUMERIC,
    avg_execution_time_ms NUMERIC,
    most_used_script_type VARCHAR,
    most_used_category VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH script_stats AS (
        SELECT 
            COUNT(DISTINCT s.id) as total_scripts,
            COUNT(DISTINCT CASE WHEN s.is_active THEN s.id END) as active_scripts,
            COUNT(se.id) as total_executions,
            COUNT(CASE WHEN se.success = true THEN 1 END) as successful_executions,
            COUNT(CASE WHEN se.success = false THEN 1 END) as failed_executions,
            AVG(se.execution_duration_ms) as avg_execution_time_ms
        FROM automation_scripts s
        LEFT JOIN script_executions se ON s.id = se.script_id 
            AND se.executed_at >= NOW() - INTERVAL '1 day' * days_back
        WHERE s.tenant_id = tenant_uuid
    ),
    type_stats AS (
        SELECT s.script_type, COUNT(se.id) as execution_count
        FROM automation_scripts s
        JOIN script_executions se ON s.id = se.script_id
        WHERE s.tenant_id = tenant_uuid 
        AND se.executed_at >= NOW() - INTERVAL '1 day' * days_back
        GROUP BY s.script_type
        ORDER BY execution_count DESC
        LIMIT 1
    ),
    category_stats AS (
        SELECT s.category, COUNT(se.id) as execution_count
        FROM automation_scripts s
        JOIN script_executions se ON s.id = se.script_id
        WHERE s.tenant_id = tenant_uuid 
        AND se.executed_at >= NOW() - INTERVAL '1 day' * days_back
        GROUP BY s.category
        ORDER BY execution_count DESC
        LIMIT 1
    )
    SELECT 
        ss.total_scripts,
        ss.active_scripts,
        ss.total_executions,
        ss.successful_executions,
        ss.failed_executions,
        ROUND(
            ss.successful_executions * 100.0 / NULLIF(ss.total_executions, 0),
            2
        ) as success_rate,
        ROUND(ss.avg_execution_time_ms, 2) as avg_execution_time_ms,
        ts.script_type as most_used_script_type,
        cs.category as most_used_category
    FROM script_stats ss
    LEFT JOIN type_stats ts ON true
    LEFT JOIN category_stats cs ON true;
END;
$$ LANGUAGE plpgsql;

-- ===== INSERT SAMPLE DATA =====

-- Update existing automation_scripts to have categories if they don't
UPDATE automation_scripts 
SET category = 'workflow'
WHERE category IS NULL AND description ILIKE '%workflow%';

UPDATE automation_scripts 
SET category = 'validation'
WHERE category IS NULL AND description ILIKE '%valid%';

UPDATE automation_scripts 
SET category = 'calculation'
WHERE category IS NULL AND description ILIKE '%calculat%';

UPDATE automation_scripts 
SET category = 'general'
WHERE category IS NULL;

-- Insert sample script templates
INSERT INTO automation_scripts (
    tenant_id, name, script_type, script_content, description, 
    category, is_template, is_active, created_by
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Email Validation Template',
    'python',
    '# Email validation script template
import re

def validate_email(email):
    pattern = r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$"
    return re.match(pattern, email) is not None

# Get email from workflow data
email = context.get("workflow_data", {}).get("email", "")

result = {
    "valid": validate_email(email),
    "email": email,
    "domain": email.split("@")[1] if "@" in email else None
}

print(f"Email validation result: {result}")
',
    'Template for validating email addresses in workflow data',
    'validation',
    true,
    true,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (tenant_id, name) DO NOTHING;

INSERT INTO automation_scripts (
    tenant_id, name, script_type, script_content, description, 
    category, is_template, is_active, created_by
) VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Data Processing Template',
    'python',
    '# Data processing script template
import json

# Get data from workflow
workflow_data = context.get("workflow_data", {})

# Process the data
processed_data = {}
for key, value in workflow_data.items():
    if isinstance(value, str):
        processed_data[key] = value.strip().title()
    elif isinstance(value, (int, float)):
        processed_data[f"{key}_formatted"] = f"{value:,.2f}"
    else:
        processed_data[key] = value

result = {
    "original_data": workflow_data,
    "processed_data": processed_data,
    "processing_timestamp": context.get("timestamp")
}

print(f"Processed {len(workflow_data)} fields")
',
    'Template for processing and formatting workflow data',
    'processing',
    true,
    true,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (tenant_id, name) DO NOTHING;

-- ===== UPDATE PERMISSIONS =====

-- Add script management permissions to roles
UPDATE roles 
SET permissions = permissions::jsonb || '["view_scripts", "manage_scripts", "test_scripts"]'::jsonb
WHERE name = 'Admin' 
AND NOT (permissions::jsonb ? 'view_scripts');

UPDATE roles 
SET permissions = permissions::jsonb || '["view_scripts"]'::jsonb
WHERE name = 'User' 
AND NOT (permissions::jsonb ? 'view_scripts');

-- Create Script Developer role
INSERT INTO roles (tenant_id, name, description, permissions, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Script Developer',
    'Can create, modify, and test automation scripts',
    '["view_scripts", "manage_scripts", "test_scripts", "view_script_analytics", "manage_script_templates"]',
    false
) ON CONFLICT (tenant_id, name) DO NOTHING;

-- ===== CONSTRAINTS AND VALIDATION =====

-- Add check constraints
-- ALTER TABLE automation_scripts 
-- ADD CONSTRAINT IF NOT EXISTS scripts_script_type_check 
-- CHECK (script_type IN ('python', 'javascript', 'shell', 'sql'));

-- ALTER TABLE automation_scripts 
-- ADD CONSTRAINT IF NOT EXISTS scripts_category_length_check 
-- CHECK (LENGTH(category) <= 100);

-- ALTER TABLE automation_scripts 
-- ADD CONSTRAINT IF NOT EXISTS scripts_name_not_empty_check 
-- CHECK (LENGTH(TRIM(name)) > 0);

-- ALTER TABLE script_executions 
-- ADD CONSTRAINT IF NOT EXISTS script_executions_duration_check 
-- CHECK (execution_duration_ms >= 0);

DO $$
BEGIN
    -- Check for script_type constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scripts_script_type_check'
    ) THEN
        ALTER TABLE automation_scripts
        ADD CONSTRAINT scripts_script_type_check
        CHECK (script_type IN ('python', 'javascript', 'shell', 'sql'));
    END IF;

    -- Check for category length constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scripts_category_length_check'
    ) THEN
        ALTER TABLE automation_scripts
        ADD CONSTRAINT scripts_category_length_check
        CHECK (LENGTH(category) <= 100);
    END IF;

    -- Check for name not empty constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'scripts_name_not_empty_check'
    ) THEN
        ALTER TABLE automation_scripts
        ADD CONSTRAINT scripts_name_not_empty_check
        CHECK (LENGTH(TRIM(name)) > 0);
    END IF;

    -- Check for execution duration constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'script_executions_duration_check'
    ) THEN
        ALTER TABLE script_executions
        ADD CONSTRAINT script_executions_duration_check
        CHECK (execution_duration_ms >= 0);
    END IF;
END $$;

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE automation_scripts IS 'Enhanced automation scripts with versioning and categorization';
COMMENT ON TABLE script_executions IS 'Execution log for all script runs with performance metrics';
COMMENT ON TABLE script_versions IS 'Version history for scripts with automatic backup on changes';
COMMENT ON TABLE script_favorites IS 'User favorites for quick access to commonly used scripts';
COMMENT ON TABLE script_comments IS 'Comments and discussions on scripts for collaboration';

COMMENT ON COLUMN automation_scripts.category IS 'Script category: validation, processing, workflow, calculation, etc.';
COMMENT ON COLUMN automation_scripts.is_template IS 'Whether this script serves as a template for others';
COMMENT ON COLUMN automation_scripts.version IS 'Current version number, auto-incremented on content changes';
COMMENT ON COLUMN automation_scripts.tags IS 'Array of tags for enhanced search and categorization';

COMMENT ON FUNCTION get_script_with_stats IS 'Returns script details with execution statistics';
COMMENT ON FUNCTION cleanup_old_script_executions IS 'Cleans up old execution logs to maintain performance';
COMMENT ON FUNCTION get_script_execution_summary IS 'Returns summary statistics for script usage in a tenant';

-- ===== COMPLETION MESSAGE =====

DO $$
BEGIN
    RAISE NOTICE 'Scripts management migration completed successfully!';
    RAISE NOTICE 'Enhanced automation_scripts table with categories, templates, and versioning';
    RAISE NOTICE 'Created script_executions, script_versions, script_favorites, and script_comments tables';
    RAISE NOTICE 'Added indexes, views, triggers, and utility functions';
    RAISE NOTICE 'Added sample script templates and updated role permissions';
    RAISE NOTICE 'Use cleanup_old_script_executions() to maintain performance';
    RAISE NOTICE 'Use get_script_execution_summary() for analytics';
END $$;