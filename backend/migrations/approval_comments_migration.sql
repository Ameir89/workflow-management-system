-- Migration: Fix Approval Comments Storage
-- This script ensures proper storage and retrieval of approval comments

-- ===== ENSURE TASK_COMMENTS TABLE EXISTS =====
CREATE TABLE IF NOT EXISTS task_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    task_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ===== ADD MISSING COLUMNS IF THEY DON'T EXIST =====

-- Add comment_type column to distinguish different types of comments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='task_comments' AND column_name='comment_type') THEN
        ALTER TABLE task_comments ADD COLUMN comment_type VARCHAR(50) DEFAULT 'general';
        COMMENT ON COLUMN task_comments.comment_type IS 'Type of comment: general, approval, system, etc.';
    END IF;
END $$;

-- Add metadata column for structured comment data
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='task_comments' AND column_name='metadata') THEN
        ALTER TABLE task_comments ADD COLUMN metadata JSONB DEFAULT '{}';
        COMMENT ON COLUMN task_comments.metadata IS 'Additional structured data for the comment';
    END IF;
END $$;

-- Add parent_comment_id for threaded comments
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='task_comments' AND column_name='parent_comment_id') THEN
        ALTER TABLE task_comments ADD COLUMN parent_comment_id UUID REFERENCES task_comments(id);
        COMMENT ON COLUMN task_comments.parent_comment_id IS 'Parent comment ID for threaded discussions';
    END IF;
END $$;

-- ===== CREATE INDEXES FOR PERFORMANCE =====

-- Index for task-based queries
CREATE INDEX IF NOT EXISTS idx_task_comments_task_id ON task_comments(task_id);

-- Index for comment type queries
CREATE INDEX IF NOT EXISTS idx_task_comments_type ON task_comments(task_id, comment_type);

-- Index for chronological ordering
CREATE INDEX IF NOT EXISTS idx_task_comments_created_at ON task_comments(created_at DESC);

-- Index for user-based queries
CREATE INDEX IF NOT EXISTS idx_task_comments_created_by ON task_comments(created_by);

-- Composite index for approval comments
CREATE INDEX IF NOT EXISTS idx_task_comments_approval 
ON task_comments(task_id, comment_type, created_at) 
WHERE comment_type = 'approval';

-- Index for metadata searches
CREATE INDEX IF NOT EXISTS idx_task_comments_metadata 
ON task_comments USING GIN(metadata);

-- ===== CREATE TRIGGERS =====

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_task_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at field
DROP TRIGGER IF EXISTS trigger_task_comments_updated_at ON task_comments;
CREATE TRIGGER trigger_task_comments_updated_at
    BEFORE UPDATE ON task_comments
    FOR EACH ROW
    EXECUTE FUNCTION update_task_comments_updated_at();

-- ===== CREATE VIEWS FOR EASY QUERYING =====

-- View for approval comments with user details
CREATE OR REPLACE VIEW approval_comments_view AS
SELECT 
    tc.id,
    tc.task_id,
    tc.comment,
    tc.comment_type,
    tc.metadata,
    tc.is_internal,
    tc.created_at,
    tc.updated_at,
    u.username,
    u.first_name || ' ' || u.last_name as author_name,
    u.email,
    t.name as task_name,
    wi.title as workflow_title,
    w.name as workflow_name
FROM task_comments tc
LEFT JOIN users u ON tc.created_by = u.id
LEFT JOIN tasks t ON tc.task_id = t.id
LEFT JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
LEFT JOIN workflows w ON wi.workflow_id = w.id
WHERE tc.comment_type = 'approval' OR tc.comment ILIKE '%APPROVE%' OR tc.comment ILIKE '%REJECT%'
ORDER BY tc.created_at DESC;

-- View for task comment statistics
CREATE OR REPLACE VIEW task_comment_stats AS
SELECT 
    t.id as task_id,
    t.name as task_name,
    COUNT(tc.id) as total_comments,
    COUNT(CASE WHEN tc.comment_type = 'approval' THEN 1 END) as approval_comments,
    COUNT(CASE WHEN tc.comment_type = 'general' THEN 1 END) as general_comments,
    COUNT(CASE WHEN tc.is_internal = true THEN 1 END) as internal_comments,
    MAX(tc.created_at) as last_comment_at,
    COUNT(DISTINCT tc.created_by) as unique_commenters
FROM tasks t
LEFT JOIN task_comments tc ON t.id = tc.task_id
GROUP BY t.id, t.name;

-- ===== FUNCTIONS FOR COMMENT MANAGEMENT =====

-- Function to add approval comment
CREATE OR REPLACE FUNCTION add_approval_comment(
    p_task_id UUID,
    p_decision VARCHAR(50),
    p_comments TEXT,
    p_reason TEXT,
    p_user_id UUID,
    p_user_name VARCHAR(255)
)
RETURNS UUID AS $$
DECLARE
    comment_id UUID;
    comment_text TEXT;
BEGIN
    -- Build structured comment text
    comment_text := '**' || UPPER(p_decision) || '** decision by ' || p_user_name;
    
    IF p_comments IS NOT NULL AND LENGTH(TRIM(p_comments)) > 0 THEN
        comment_text := comment_text || E'\n\nComments: ' || p_comments;
    END IF;
    
    IF p_reason IS NOT NULL AND LENGTH(TRIM(p_reason)) > 0 AND p_reason != p_comments THEN
        comment_text := comment_text || E'\nReason: ' || p_reason;
    END IF;
    
    -- Insert the comment
    INSERT INTO task_comments (
        task_id, 
        comment, 
        comment_type, 
        is_internal, 
        created_by,
        metadata
    ) VALUES (
        p_task_id,
        comment_text,
        'approval',
        false,
        p_user_id,
        jsonb_build_object(
            'decision', p_decision,
            'comments', p_comments,
            'reason', p_reason,
            'user_name', p_user_name
        )
    ) RETURNING id INTO comment_id;
    
    RETURN comment_id;
END;
$$ LANGUAGE plpgsql;

-- Function to get approval history with comments
CREATE OR REPLACE FUNCTION get_task_approval_history(p_task_id UUID)
RETURNS TABLE(
    source VARCHAR,
    decision VARCHAR,
    comments TEXT,
    reason TEXT,
    user_name TEXT,
    username TEXT,
    created_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    -- Get from audit logs
    SELECT 
        'audit_log' as source,
        (al.new_values->>'decision')::VARCHAR as decision,
        (al.new_values->>'comments')::TEXT as comments,
        (al.new_values->>'reason')::TEXT as reason,
        (u.first_name || ' ' || u.last_name)::TEXT as user_name,
        u.username::TEXT as username,
        al.created_at,
        al.new_values as metadata
    FROM audit_logs al
    LEFT JOIN users u ON al.user_id = u.id
    WHERE al.resource_type = 'task' 
    AND al.resource_id = p_task_id::TEXT
    AND al.action LIKE 'approval_%'
    
    UNION ALL
    
    -- Get from task comments
    SELECT 
        'task_comment' as source,
        (tc.metadata->>'decision')::VARCHAR as decision,
        (tc.metadata->>'comments')::TEXT as comments,
        (tc.metadata->>'reason')::TEXT as reason,
        (u.first_name || ' ' || u.last_name)::TEXT as user_name,
        u.username::TEXT as username,
        tc.created_at,
        tc.metadata
    FROM task_comments tc
    LEFT JOIN users u ON tc.created_by = u.id
    WHERE tc.task_id = p_task_id
    AND tc.comment_type = 'approval'
    
    ORDER BY created_at DESC;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old comments (optional)
CREATE OR REPLACE FUNCTION cleanup_old_comments(days_to_keep INTEGER DEFAULT 90)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM task_comments 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND comment_type != 'approval'; -- Keep approval comments longer
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- ===== UPDATE EXISTING DATA =====

-- Update existing comments to have proper comment_type
UPDATE task_comments 
SET comment_type = 'approval'
WHERE (
    comment ILIKE '%APPROVE%' OR 
    comment ILIKE '%REJECT%' OR 
    comment ILIKE '%RETURN%' OR
    comment ILIKE '%decision%'
) AND comment_type = 'general';

-- ===== CONSTRAINTS AND VALIDATION =====

-- Add check constraint for comment_type
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'task_comments' AND constraint_name = 'task_comments_comment_type_check'
    ) THEN
        ALTER TABLE task_comments 
        ADD CONSTRAINT task_comments_comment_type_check 
        CHECK (comment_type IN ('general', 'approval', 'system', 'automated', 'notification'));
    END IF;
END $$;

-- Add constraint to ensure comment is not empty
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.constraint_column_usage 
        WHERE table_name = 'task_comments' AND constraint_name = 'task_comments_comment_not_empty'
    ) THEN
        ALTER TABLE task_comments 
        ADD CONSTRAINT task_comments_comment_not_empty 
        CHECK (LENGTH(TRIM(comment)) > 0);
    END IF;
END $$;

-- ===== PERMISSIONS AND SECURITY =====

-- Create RLS policy for tenant isolation (if RLS is enabled)
-- This is commented out but can be enabled if needed
/*
ALTER TABLE task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_comments_tenant_isolation ON task_comments
    USING (
        task_id IN (
            SELECT t.id FROM tasks t
            JOIN workflow_instances wi ON t.workflow_instance_id = wi.id
            WHERE wi.tenant_id = current_setting('app.current_tenant_id')::UUID
        )
    );
*/

-- ===== SAMPLE DATA FOR TESTING =====

-- Insert some sample approval comments for testing (only if no approval comments exist)
DO $$
DECLARE
    sample_task_id UUID;
    admin_user_id UUID := '00000000-0000-0000-0000-000000000001';
BEGIN
    -- Check if we have any tasks to add sample comments to
    SELECT id INTO sample_task_id 
    FROM tasks 
    WHERE type = 'approval' 
    LIMIT 1;
    
    IF sample_task_id IS NOT NULL THEN
        -- Add sample approval comment only if none exist
        IF NOT EXISTS (SELECT 1 FROM task_comments WHERE task_id = sample_task_id AND comment_type = 'approval') THEN
            PERFORM add_approval_comment(
                sample_task_id,
                'approve',
                'This request looks good and meets all requirements.',
                'Budget approved within allocated limits',
                admin_user_id,
                'System Administrator'
            );
        END IF;
    END IF;
END $$;

-- ===== DOCUMENTATION =====

COMMENT ON TABLE task_comments IS 'Stores all comments and discussions related to tasks, including approval decisions';
COMMENT ON COLUMN task_comments.comment_type IS 'Type of comment: general, approval, system, automated, notification';
COMMENT ON COLUMN task_comments.metadata IS 'Structured data for the comment including approval details';
COMMENT ON COLUMN task_comments.is_internal IS 'Whether the comment is internal (visible only to team members)';

COMMENT ON FUNCTION add_approval_comment IS 'Adds a structured approval comment to a task';
COMMENT ON FUNCTION get_task_approval_history IS 'Returns complete approval history from both audit logs and comments';
COMMENT ON VIEW approval_comments_view IS 'Easy-to-query view of all approval-related comments';

-- ===== COMPLETION MESSAGE =====

DO $$
BEGIN
    RAISE NOTICE 'Approval comments migration completed successfully!';
    RAISE NOTICE 'Enhanced task_comments table with comment_type and metadata';
    RAISE NOTICE 'Created indexes, views, and utility functions for approval comments';
    RAISE NOTICE 'Added approval comment management functions';
    RAISE NOTICE 'Use add_approval_comment() function to add structured approval comments';
    RAISE NOTICE 'Use get_task_approval_history() function to retrieve complete approval history';
END $$;