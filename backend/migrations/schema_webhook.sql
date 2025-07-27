-- Add missing columns to webhooks table if they don't exist
DO $$
BEGIN
    -- Add description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='description') THEN
        ALTER TABLE webhooks ADD COLUMN description TEXT;
        COMMENT ON COLUMN webhooks.description IS 'Webhook description for documentation';
    END IF;

    -- Add webhook_type column to distinguish incoming vs outgoing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='webhook_type') THEN
        ALTER TABLE webhooks ADD COLUMN webhook_type VARCHAR(20) DEFAULT 'outgoing' 
        CHECK (webhook_type IN ('incoming', 'outgoing', 'bidirectional'));
        COMMENT ON COLUMN webhooks.webhook_type IS 'Type of webhook: incoming, outgoing, or bidirectional';
    END IF;

    -- Add last_triggered_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='last_triggered_at') THEN
        ALTER TABLE webhooks ADD COLUMN last_triggered_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN webhooks.last_triggered_at IS 'Last time this webhook was triggered';
    END IF;

    -- Add failure_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='failure_count') THEN
        ALTER TABLE webhooks ADD COLUMN failure_count INTEGER DEFAULT 0;
        COMMENT ON COLUMN webhooks.failure_count IS 'Number of consecutive failures';
    END IF;

    -- Add tags column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='tags') THEN
        ALTER TABLE webhooks ADD COLUMN tags TEXT[];
        COMMENT ON COLUMN webhooks.tags IS 'Tags for webhook categorization';
    END IF;

    -- Add environment column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='environment') THEN
        ALTER TABLE webhooks ADD COLUMN environment VARCHAR(20) DEFAULT 'production'
        CHECK (environment IN ('development', 'staging', 'production'));
        COMMENT ON COLUMN webhooks.environment IS 'Environment where webhook is active';
    END IF;
END $$;

-- ===== CREATE WEBHOOK RECEIVED DATA TABLE =====
CREATE TABLE IF NOT EXISTS webhook_received_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    client_ip INET,
    user_agent TEXT,
    processed BOOLEAN DEFAULT false,
    processing_result JSONB,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== CREATE WEBHOOK RATE LIMITS TABLE =====
CREATE TABLE IF NOT EXISTS webhook_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    client_ip INET NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(webhook_id, client_ip)
);

-- ===== CREATE WEBHOOK SECURITY LOGS TABLE =====
CREATE TABLE IF NOT EXISTS webhook_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    client_ip INET,
    event_type VARCHAR(50) NOT NULL, -- signature_failure, rate_limit_exceeded, invalid_payload, etc.
    details JSONB,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== ENHANCE WEBHOOK DELIVERIES TABLE =====

-- Add missing columns to webhook_deliveries table
DO $$
BEGIN
    -- Add webhook_type to track delivery direction
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='webhook_type') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN webhook_type VARCHAR(20) DEFAULT 'outgoing'
        CHECK (webhook_type IN ('incoming', 'outgoing'));
    END IF;

    -- Add execution_time_ms column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='execution_time_ms') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN execution_time_ms INTEGER;
        COMMENT ON COLUMN webhook_deliveries.execution_time_ms IS 'Execution time in milliseconds';
    END IF;

    -- Add error_details column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='error_details') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN error_details JSONB;
        COMMENT ON COLUMN webhook_deliveries.error_details IS 'Detailed error information';
    END IF;

    -- Add retry_after column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='retry_after') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN retry_after TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN webhook_deliveries.retry_after IS 'When to retry failed delivery';
    END IF;

    -- Add is_test column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='is_test') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN is_test BOOLEAN DEFAULT false;
        COMMENT ON COLUMN webhook_deliveries.is_test IS 'Whether this was a test delivery';
    END IF;
END $$;

-- ===== CREATE WEBHOOK TEMPLATES TABLE =====
CREATE TABLE IF NOT EXISTS webhook_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    webhook_type VARCHAR(20) NOT NULL CHECK (webhook_type IN ('incoming', 'outgoing', 'bidirectional')),
    template_config JSONB NOT NULL,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- ===== CREATE WEBHOOK MONITORING TABLE =====
CREATE TABLE IF NOT EXISTS webhook_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
    response_time_ms INTEGER,
    error_message TEXT,
    check_type VARCHAR(20) DEFAULT 'automatic' CHECK (check_type IN ('automatic', 'manual')),
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== CREATE INDEXES FOR PERFORMANCE =====

-- Webhook received data indexes
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_tenant ON webhook_received_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_webhook ON webhook_received_data(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_event ON webhook_received_data(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_processed ON webhook_received_data(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_received_at ON webhook_received_data(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_payload ON webhook_received_data USING gin(payload);

-- Webhook rate limits indexes
CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_webhook ON webhook_rate_limits(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_client_ip ON webhook_rate_limits(client_ip);
CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_window ON webhook_rate_limits(window_start);

-- Webhook security logs indexes
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_webhook ON webhook_security_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_client_ip ON webhook_security_logs(client_ip);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_event_type ON webhook_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_severity ON webhook_security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_created_at ON webhook_security_logs(created_at DESC);

-- Enhanced webhook deliveries indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_type ON webhook_deliveries(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_execution_time ON webhook_deliveries(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry_after ON webhook_deliveries(retry_after);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_is_test ON webhook_deliveries(is_test);
-- CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries(
--     CASE 
--         WHEN delivered_at IS NOT NULL THEN 'delivered'
--         WHEN delivery_attempts >= 3 THEN 'failed'
--         ELSE 'pending'
--     END
-- );
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status
ON webhook_deliveries (
    (
        CASE 
            WHEN delivered_at IS NOT NULL THEN 'delivered'
            WHEN delivery_attempts >= 3 THEN 'failed'
            ELSE 'pending'
        END
    )
);

-- Webhook templates indexes
CREATE INDEX IF NOT EXISTS idx_webhook_templates_tenant ON webhook_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_templates_type ON webhook_templates(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_templates_active ON webhook_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_templates_system ON webhook_templates(is_system);

-- Webhook monitoring indexes
CREATE INDEX IF NOT EXISTS idx_webhook_monitoring_webhook ON webhook_monitoring(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_monitoring_timestamp ON webhook_monitoring(check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_monitoring_status ON webhook_monitoring(status);

-- Enhanced webhook indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_type ON webhooks(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_environment ON webhooks(environment);
CREATE INDEX IF NOT EXISTS idx_webhooks_last_triggered ON webhooks(last_triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_failure_count ON webhooks(failure_count);
CREATE INDEX IF NOT EXISTS idx_webhooks_tags ON webhooks USING gin(tags);

-- ===== CREATE FUNCTIONS =====

-- Function to get webhook health status
CREATE OR REPLACE FUNCTION get_webhook_health_status(webhook_uuid UUID)
RETURNS TABLE(
    webhook_id UUID,
    webhook_name VARCHAR,
    status VARCHAR,
    last_success TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER,
    recent_deliveries BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as webhook_id,
        w.name as webhook_name,
        CASE 
            WHEN NOT w.is_active THEN 'disabled'
            WHEN w.failure_count > 5 THEN 'critical'
            WHEN w.failure_count > 2 THEN 'warning'
            WHEN MAX(wd.delivered_at) < NOW() - INTERVAL '24 hours' AND COUNT(wd.id) > 0 THEN 'stale'
            ELSE 'healthy'
        END as status,
        MAX(wd.delivered_at) as last_success,
        w.failure_count,
        COUNT(wd.id) as recent_deliveries,
        ROUND(
            COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) * 100.0 / 
            NULLIF(COUNT(wd.id), 0), 2
        ) as success_rate
    FROM webhooks w
    LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id 
        AND wd.created_at >= NOW() - INTERVAL '24 hours'
    WHERE w.id = webhook_uuid
    GROUP BY w.id, w.name, w.is_active, w.failure_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old webhook data
CREATE OR REPLACE FUNCTION cleanup_webhook_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE(
    deliveries_deleted INTEGER,
    received_data_deleted INTEGER,
    security_logs_deleted INTEGER,
    monitoring_deleted INTEGER
) AS $$
DECLARE
    del_deliveries INTEGER;
    del_received INTEGER;
    del_security INTEGER;
    del_monitoring INTEGER;
BEGIN
    -- Clean up old deliveries
    DELETE FROM webhook_deliveries 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND is_test = false;
    GET DIAGNOSTICS del_deliveries = ROW_COUNT;
    
    -- Clean up test deliveries more aggressively (7 days)
    DELETE FROM webhook_deliveries 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND is_test = true;
    
    -- Clean up old received data
    DELETE FROM webhook_received_data 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND processed = true;
    GET DIAGNOSTICS del_received = ROW_COUNT;
    
    -- Clean up old security logs
    DELETE FROM webhook_security_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * (days_to_keep / 2);
    GET DIAGNOSTICS del_security = ROW_COUNT;
    
    -- Clean up old monitoring data
    DELETE FROM webhook_monitoring 
    WHERE created_at < NOW() - INTERVAL '1 day' * (days_to_keep / 3);
    GET DIAGNOSTICS del_monitoring = ROW_COUNT;
    
    RETURN QUERY SELECT del_deliveries, del_received, del_security, del_monitoring;
END;
$$ LANGUAGE plpgsql;

-- Function to get webhook analytics
CREATE OR REPLACE FUNCTION get_webhook_analytics(
    tenant_uuid UUID,
    days_back INTEGER DEFAULT 30
)
RETURNS TABLE(
    total_webhooks BIGINT,
    active_webhooks BIGINT,
    total_deliveries BIGINT,
    successful_deliveries BIGINT,
    failed_deliveries BIGINT,
    avg_response_time_ms NUMERIC,
    most_active_webhook VARCHAR,
    most_failed_webhook VARCHAR
) AS $$
BEGIN
    RETURN QUERY
    WITH webhook_stats AS (
        SELECT 
            COUNT(DISTINCT w.id) as total_webhooks,
            COUNT(DISTINCT CASE WHEN w.is_active THEN w.id END) as active_webhooks,
            COUNT(wd.id) as total_deliveries,
            COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
            COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries,
            AVG(wd.execution_time_ms) as avg_response_time_ms
        FROM webhooks w
        LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id 
            AND wd.created_at >= NOW() - INTERVAL '1 day' * days_back
        WHERE w.tenant_id = tenant_uuid
    ),
    most_active AS (
        SELECT w.name
        FROM webhooks w
        JOIN webhook_deliveries wd ON w.id = wd.webhook_id
        WHERE w.tenant_id = tenant_uuid 
        AND wd.created_at >= NOW() - INTERVAL '1 day' * days_back
        GROUP BY w.id, w.name
        ORDER BY COUNT(wd.id) DESC
        LIMIT 1
    ),
    most_failed AS (
        SELECT w.name
        FROM webhooks w
        JOIN webhook_deliveries wd ON w.id = wd.webhook_id
        WHERE w.tenant_id = tenant_uuid 
        AND wd.created_at >= NOW() - INTERVAL '1 day' * days_back
        AND wd.response_status >= 400
        GROUP BY w.id, w.name
        ORDER BY COUNT(wd.id) DESC
        LIMIT 1
    )
    SELECT 
        ws.total_webhooks,
        ws.active_webhooks,
        ws.total_deliveries,
        ws.successful_deliveries,
        ws.failed_deliveries,
        ROUND(ws.avg_response_time_ms, 2) as avg_response_time_ms,
        ma.name as most_active_webhook,
        mf.name as most_failed_webhook
    FROM webhook_stats ws
    LEFT JOIN most_active ma ON true
    LEFT JOIN most_failed mf ON true;
END;
$$ LANGUAGE plpgsql;

-- ===== CREATE TRIGGERS =====

-- Function to update webhook updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at fields
CREATE TRIGGER trigger_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_updated_at();

CREATE TRIGGER trigger_webhook_templates_updated_at
    BEFORE UPDATE ON webhook_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_updated_at();

-- Function to update webhook failure count
CREATE OR REPLACE FUNCTION update_webhook_failure_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update failure count based on delivery status
    IF NEW.response_status >= 400 AND (OLD.response_status IS NULL OR OLD.response_status < 400) THEN
        -- New failure
        UPDATE webhooks 
        SET failure_count = failure_count + 1
        WHERE id = NEW.webhook_id;
    ELSIF NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
        -- Successful delivery, reset failure count
        UPDATE webhooks 
        SET failure_count = 0, last_triggered_at = NOW()
        WHERE id = NEW.webhook_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update webhook failure count
CREATE TRIGGER trigger_webhook_delivery_failure_count
    AFTER UPDATE ON webhook_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_failure_count();

-- ===== CREATE VIEWS =====

-- View for webhook health dashboard
CREATE OR REPLACE VIEW webhook_health_dashboard AS
SELECT 
    w.id,
    w.name,
    w.webhook_type,
    w.is_active,
    w.failure_count,
    w.last_triggered_at,
    CASE 
        WHEN NOT w.is_active THEN 'disabled'
        WHEN w.failure_count > 5 THEN 'critical'
        WHEN w.failure_count > 2 THEN 'warning'
        WHEN w.last_triggered_at < NOW() - INTERVAL '24 hours' THEN 'stale'
        ELSE 'healthy'
    END as health_status,
    COUNT(wd.id) as deliveries_24h,
    COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries_24h,
    COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries_24h,
    AVG(wd.execution_time_ms) as avg_response_time_ms_24h
FROM webhooks w
LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id 
    AND wd.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY w.id, w.name, w.webhook_type, w.is_active, w.failure_count, w.last_triggered_at;

-- View for webhook delivery trends
CREATE OR REPLACE VIEW webhook_delivery_trends AS
SELECT 
    DATE(wd.created_at) as delivery_date,
    w.tenant_id,
    wd.webhook_type,
    COUNT(*) as total_deliveries,
    COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
    COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries,
    AVG(wd.execution_time_ms) as avg_response_time_ms,
    COUNT(DISTINCT wd.webhook_id) as unique_webhooks
FROM webhook_deliveries wd
JOIN webhooks w ON wd.webhook_id = w.id
WHERE wd.created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(wd.created_at), w.tenant_id, wd.webhook_type
ORDER BY delivery_date DESC;

-- ===== INSERT SAMPLE DATA =====

-- Insert webhook templates
INSERT INTO webhook_templates (tenant_id, name, description, webhook_type, template_config, is_system, created_by) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'GitHub Integration',
    'Template for GitHub webhook integration',
    'incoming',
    '{
        "events": ["push", "pull_request", "issue"],
        "security": {
            "verify_signature": true,
            "allowed_ips": ["192.30.252.0/22", "185.199.108.0/22"]
        },
        "processing": {
            "auto_create_tasks": true,
            "notify_team": true
        }
    }',
    true,
    '00000000-0000-0000-0000-000000000001'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Slack Notification',
    'Template for sending notifications to Slack',
    'outgoing',
    '{
        "url_template": "https://hooks.slack.com/services/{team}/{channel}/{token}",
        "headers": {
            "Content-Type": "application/json"
        },
        "payload_template": {
            "channel": "#{channel}",
            "username": "WorkflowBot",
            "text": "{message}",
            "attachments": []
        }
    }',
    true,
    '00000000-0000-0000-0000-000000000001'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Microsoft Teams',
    'Template for Microsoft Teams notifications',
    'outgoing',
    '{
        "headers": {
            "Content-Type": "application/json"
        },
        "payload_template": {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "0076D7",
            "summary": "{summary}",
            "sections": [{
                "activityTitle": "{title}",
                "activitySubtitle": "{subtitle}",
                "text": "{message}"
            }]
        }
    }',
    true,
    '00000000-0000-0000-0000-000000000001'
);

-- Update existing webhook permissions in roles
UPDATE roles 
SET permissions = permissions::jsonb || '["view_webhook_analytics", "manage_webhook_security"]'::jsonb
WHERE name = 'Admin' 
AND NOT (permissions::jsonb ? 'view_webhook_analytics');

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE webhook_received_data IS 'Stores incoming webhook payloads for processing and audit';
COMMENT ON TABLE webhook_rate_limits IS 'Rate limiting data for incoming webhooks by client IP';
COMMENT ON TABLE webhook_security_logs IS 'Security events and violations for webhook endpoints';
COMMENT ON TABLE webhook_templates IS 'Reusable webhook configuration templates';
COMMENT ON TABLE webhook_monitoring IS 'Webhook health monitoring and status checks';

COMMENT ON FUNCTION get_webhook_health_status IS 'Returns comprehensive health status for a webhook';
COMMENT ON FUNCTION cleanup_webhook_data IS 'Cleans up old webhook data to maintain performance';
COMMENT ON FUNCTION get_webhook_analytics IS 'Returns webhook usage analytics for a tenant';

COMMENT ON VIEW webhook_health_dashboard IS 'Real-time webhook health dashboard data';
COMMENT ON VIEW webhook_delivery_trends IS 'Daily webhook delivery trends and statistics';

-- ===== COMPLETION MESSAGE =====

DO $$
BEGIN
    RAISE NOTICE 'Webhook enhancement migration completed successfully!';
    RAISE NOTICE 'Enhanced webhooks table with new columns for better tracking';
    RAISE NOTICE 'Created tables: webhook_received_data, webhook_rate_limits, webhook_security_logs, webhook_templates, webhook_monitoring';
    RAISE NOTICE 'Added comprehensive indexes, functions, triggers, and views';
    RAISE NOTICE 'Added webhook templates for common integrations';
    RAISE NOTICE 'Use cleanup_webhook_data() to maintain performance';
    RAISE NOTICE 'Use get_webhook_analytics() for usage insights';
    RAISE NOTICE 'Check webhook_health_dashboard view for real-time status';
END $$;




-- Complete Webhook System Migration
-- Run this script to add all missing tables and enhancements for the complete webhook system

-- ===== CREATE WEBHOOK QUEUE TABLE =====
CREATE TABLE IF NOT EXISTS webhook_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB DEFAULT '{}',
    url VARCHAR(500) NOT NULL,
    retry_count INTEGER DEFAULT 0,
    max_retries INTEGER DEFAULT 3,
    timeout_seconds INTEGER DEFAULT 30,
    priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'delivered', 'failed', 'retrying', 'cancelled')),
    error_message TEXT,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- ===== ENHANCE EXISTING WEBHOOK TABLES =====

-- Add missing columns to webhooks table if they don't exist
DO $$
BEGIN
    -- Add description column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='description') THEN
        ALTER TABLE webhooks ADD COLUMN description TEXT;
        COMMENT ON COLUMN webhooks.description IS 'Webhook description for documentation';
    END IF;

    -- Add webhook_type column to distinguish incoming vs outgoing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='webhook_type') THEN
        ALTER TABLE webhooks ADD COLUMN webhook_type VARCHAR(20) DEFAULT 'outgoing' 
        CHECK (webhook_type IN ('incoming', 'outgoing', 'bidirectional'));
        COMMENT ON COLUMN webhooks.webhook_type IS 'Type of webhook: incoming, outgoing, or bidirectional';
    END IF;

    -- Add last_triggered_at column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='last_triggered_at') THEN
        ALTER TABLE webhooks ADD COLUMN last_triggered_at TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN webhooks.last_triggered_at IS 'Last time this webhook was triggered';
    END IF;

    -- Add failure_count column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='failure_count') THEN
        ALTER TABLE webhooks ADD COLUMN failure_count INTEGER DEFAULT 0;
        COMMENT ON COLUMN webhooks.failure_count IS 'Number of consecutive failures';
    END IF;

    -- Add tags column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='tags') THEN
        ALTER TABLE webhooks ADD COLUMN tags TEXT[];
        COMMENT ON COLUMN webhooks.tags IS 'Tags for webhook categorization';
    END IF;

    -- Add environment column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='environment') THEN
        ALTER TABLE webhooks ADD COLUMN environment VARCHAR(20) DEFAULT 'production'
        CHECK (environment IN ('development', 'staging', 'production'));
        COMMENT ON COLUMN webhooks.environment IS 'Environment where webhook is active';
    END IF;

    -- Add priority column for webhook execution order
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhooks' AND column_name='priority') THEN
        ALTER TABLE webhooks ADD COLUMN priority INTEGER DEFAULT 5 CHECK (priority >= 1 AND priority <= 10);
        COMMENT ON COLUMN webhooks.priority IS 'Webhook execution priority (1-10, higher = more priority)';
    END IF;
END $$;

-- Enhance webhook_deliveries table
DO $$
BEGIN
    -- Add webhook_type to track delivery direction
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='webhook_type') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN webhook_type VARCHAR(20) DEFAULT 'outgoing'
        CHECK (webhook_type IN ('incoming', 'outgoing'));
    END IF;

    -- Add execution_time_ms column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='execution_time_ms') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN execution_time_ms INTEGER;
        COMMENT ON COLUMN webhook_deliveries.execution_time_ms IS 'Execution time in milliseconds';
    END IF;

    -- Add error_details column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='error_details') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN error_details JSONB;
        COMMENT ON COLUMN webhook_deliveries.error_details IS 'Detailed error information';
    END IF;

    -- Add retry_after column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='retry_after') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN retry_after TIMESTAMP WITH TIME ZONE;
        COMMENT ON COLUMN webhook_deliveries.retry_after IS 'When to retry failed delivery';
    END IF;

    -- Add is_test column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                   WHERE table_name='webhook_deliveries' AND column_name='is_test') THEN
        ALTER TABLE webhook_deliveries ADD COLUMN is_test BOOLEAN DEFAULT false;
        COMMENT ON COLUMN webhook_deliveries.is_test IS 'Whether this was a test delivery';
    END IF;
END $$;

-- ===== CREATE WEBHOOK RECEIVED DATA TABLE =====
CREATE TABLE IF NOT EXISTS webhook_received_data (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    payload JSONB NOT NULL,
    headers JSONB,
    client_ip INET,
    user_agent TEXT,
    processed BOOLEAN DEFAULT false,
    processing_result JSONB,
    received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== CREATE WEBHOOK RATE LIMITS TABLE =====
CREATE TABLE IF NOT EXISTS webhook_rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    client_ip INET NOT NULL,
    request_count INTEGER DEFAULT 1,
    window_start TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_request TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    blocked_until TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(webhook_id, client_ip)
);

-- ===== CREATE WEBHOOK SECURITY LOGS TABLE =====
CREATE TABLE IF NOT EXISTS webhook_security_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID REFERENCES webhooks(id) ON DELETE CASCADE,
    client_ip INET,
    event_type VARCHAR(50) NOT NULL, -- signature_failure, rate_limit_exceeded, invalid_payload, etc.
    details JSONB,
    severity VARCHAR(20) DEFAULT 'warning' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== CREATE WEBHOOK TEMPLATES TABLE =====
CREATE TABLE IF NOT EXISTS webhook_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    webhook_type VARCHAR(20) NOT NULL CHECK (webhook_type IN ('incoming', 'outgoing', 'bidirectional')),
    template_config JSONB NOT NULL,
    is_system BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, name)
);

-- ===== CREATE WEBHOOK MONITORING TABLE =====
CREATE TABLE IF NOT EXISTS webhook_monitoring (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    webhook_id UUID NOT NULL REFERENCES webhooks(id) ON DELETE CASCADE,
    check_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status VARCHAR(20) NOT NULL CHECK (status IN ('healthy', 'warning', 'critical', 'unknown')),
    response_time_ms INTEGER,
    error_message TEXT,
    check_type VARCHAR(20) DEFAULT 'automatic' CHECK (check_type IN ('automatic', 'manual')),
    performed_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ===== CREATE WEBHOOK EVENT LOG TABLE =====
CREATE TABLE IF NOT EXISTS webhook_event_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    event_type VARCHAR(100) NOT NULL,
    source_type VARCHAR(50) NOT NULL, -- workflow, task, approval, etc.
    source_id UUID,
    payload JSONB NOT NULL,
    triggered_by UUID REFERENCES users(id) ON DELETE SET NULL,
    webhooks_triggered INTEGER DEFAULT 0,
    successful_deliveries INTEGER DEFAULT 0,
    failed_deliveries INTEGER DEFAULT 0,
    processing_status VARCHAR(20) DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

-- ===== CREATE INDEXES FOR PERFORMANCE =====

-- Webhook queue indexes
CREATE INDEX IF NOT EXISTS idx_webhook_queue_status ON webhook_queue(status);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_scheduled ON webhook_queue(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_priority ON webhook_queue(priority DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_webhook_id ON webhook_queue(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_queue_cleanup ON webhook_queue(status, updated_at);

-- Enhanced webhook indexes
CREATE INDEX IF NOT EXISTS idx_webhooks_type ON webhooks(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhooks_environment ON webhooks(environment);
CREATE INDEX IF NOT EXISTS idx_webhooks_last_triggered ON webhooks(last_triggered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhooks_failure_count ON webhooks(failure_count);
CREATE INDEX IF NOT EXISTS idx_webhooks_tags ON webhooks USING gin(tags);
CREATE INDEX IF NOT EXISTS idx_webhooks_tenant_active ON webhooks(tenant_id, is_active);
CREATE INDEX IF NOT EXISTS idx_webhooks_priority ON webhooks(priority DESC);

-- Webhook received data indexes
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_tenant ON webhook_received_data(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_webhook ON webhook_received_data(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_event ON webhook_received_data(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_processed ON webhook_received_data(processed);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_received_at ON webhook_received_data(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_received_data_payload ON webhook_received_data USING gin(payload);

-- Webhook rate limits indexes
CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_webhook ON webhook_rate_limits(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_client_ip ON webhook_rate_limits(client_ip);
CREATE INDEX IF NOT EXISTS idx_webhook_rate_limits_window ON webhook_rate_limits(window_start);

-- Webhook security logs indexes
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_webhook ON webhook_security_logs(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_client_ip ON webhook_security_logs(client_ip);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_event_type ON webhook_security_logs(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_severity ON webhook_security_logs(severity);
CREATE INDEX IF NOT EXISTS idx_webhook_security_logs_created_at ON webhook_security_logs(created_at DESC);

-- Enhanced webhook deliveries indexes
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_type ON webhook_deliveries(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_execution_time ON webhook_deliveries(execution_time_ms);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_retry_after ON webhook_deliveries(retry_after);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_is_test ON webhook_deliveries(is_test);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_type ON webhook_deliveries(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_status ON webhook_deliveries (
    (
        CASE 
            WHEN delivered_at IS NOT NULL THEN 'delivered'
            WHEN delivery_attempts >= 3 THEN 'failed'
            ELSE 'pending'
        END
    )
);

-- Webhook templates indexes
CREATE INDEX IF NOT EXISTS idx_webhook_templates_tenant ON webhook_templates(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_templates_type ON webhook_templates(webhook_type);
CREATE INDEX IF NOT EXISTS idx_webhook_templates_active ON webhook_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_webhook_templates_system ON webhook_templates(is_system);

-- Webhook monitoring indexes
CREATE INDEX IF NOT EXISTS idx_webhook_monitoring_webhook ON webhook_monitoring(webhook_id);
CREATE INDEX IF NOT EXISTS idx_webhook_monitoring_timestamp ON webhook_monitoring(check_timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_monitoring_status ON webhook_monitoring(status);

-- Webhook event log indexes
CREATE INDEX IF NOT EXISTS idx_webhook_event_log_tenant ON webhook_event_log(tenant_id);
CREATE INDEX IF NOT EXISTS idx_webhook_event_log_event_type ON webhook_event_log(event_type);
CREATE INDEX IF NOT EXISTS idx_webhook_event_log_source ON webhook_event_log(source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_webhook_event_log_status ON webhook_event_log(processing_status);
CREATE INDEX IF NOT EXISTS idx_webhook_event_log_created_at ON webhook_event_log(created_at DESC);

-- ===== CREATE TRIGGERS =====

-- Function to update webhook updated_at timestamp
CREATE OR REPLACE FUNCTION update_webhook_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at fields
CREATE TRIGGER trigger_webhooks_updated_at
    BEFORE UPDATE ON webhooks
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_updated_at();

CREATE TRIGGER trigger_webhook_templates_updated_at
    BEFORE UPDATE ON webhook_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_updated_at();

CREATE TRIGGER trigger_webhook_queue_updated_at
    BEFORE UPDATE ON webhook_queue
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_updated_at();

-- Function to update webhook failure count
CREATE OR REPLACE FUNCTION update_webhook_failure_count()
RETURNS TRIGGER AS $$
BEGIN
    -- Update failure count based on delivery status
    IF NEW.response_status >= 400 AND (OLD.response_status IS NULL OR OLD.response_status < 400) THEN
        -- New failure
        UPDATE webhooks 
        SET failure_count = failure_count + 1
        WHERE id = NEW.webhook_id;
    ELSIF NEW.delivered_at IS NOT NULL AND OLD.delivered_at IS NULL THEN
        -- Successful delivery, reset failure count
        UPDATE webhooks 
        SET failure_count = 0, last_triggered_at = NOW()
        WHERE id = NEW.webhook_id;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to update webhook failure count
DROP TRIGGER IF EXISTS trigger_webhook_delivery_failure_count ON webhook_deliveries;
CREATE TRIGGER trigger_webhook_delivery_failure_count
    AFTER UPDATE ON webhook_deliveries
    FOR EACH ROW
    EXECUTE FUNCTION update_webhook_failure_count();

-- ===== INSERT SAMPLE WEBHOOK TEMPLATES =====

-- Insert webhook templates for common integrations
INSERT INTO webhook_templates (tenant_id, name, description, webhook_type, template_config, is_system, created_by) VALUES
(
    '00000000-0000-0000-0000-000000000001',
    'GitHub Integration',
    'Template for GitHub webhook integration',
    'incoming',
    '{
        "events": ["push", "pull_request", "issue"],
        "security": {
            "verify_signature": true,
            "allowed_ips": ["192.30.252.0/22", "185.199.108.0/22"]
        },
        "processing": {
            "auto_create_tasks": true,
            "notify_team": true
        }
    }',
    true,
    '00000000-0000-0000-0000-000000000001'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Slack Notification',
    'Template for sending notifications to Slack',
    'outgoing',
    '{
        "events": ["workflow_completed", "task_assigned", "approval_requested"],
        "headers": {
            "Content-Type": "application/json"
        },
        "payload_template": {
            "channel": "#{channel}",
            "username": "WorkflowBot",
            "text": "{message}",
            "attachments": []
        }
    }',
    true,
    '00000000-0000-0000-0000-000000000001'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Microsoft Teams',
    'Template for Microsoft Teams notifications',
    'outgoing',
    '{
        "events": ["workflow_completed", "sla_breach", "approval_requested"],
        "headers": {
            "Content-Type": "application/json"
        },
        "payload_template": {
            "@type": "MessageCard",
            "@context": "http://schema.org/extensions",
            "themeColor": "0076D7",
            "summary": "{summary}",
            "sections": [{
                "activityTitle": "{title}",
                "activitySubtitle": "{subtitle}",
                "text": "{message}"
            }]
        }
    }',
    true,
    '00000000-0000-0000-0000-000000000001'
),
(
    '00000000-0000-0000-0000-000000000001',
    'JIRA Integration',
    'Template for JIRA ticket creation',
    'outgoing',
    '{
        "events": ["workflow_failed", "sla_breach"],
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Basic {base64_credentials}"
        },
        "payload_template": {
            "fields": {
                "project": {"key": "{project_key}"},
                "summary": "{title}",
                "description": "{description}",
                "issuetype": {"name": "Bug"}
            }
        }
    }',
    true,
    '00000000-0000-0000-0000-000000000001'
),
(
    '00000000-0000-0000-0000-000000000001',
    'Email Service',
    'Template for email notifications via API',
    'outgoing',
    '{
        "events": ["workflow_completed", "task_assigned", "approval_requested"],
        "headers": {
            "Content-Type": "application/json",
            "Authorization": "Bearer {api_key}"
        },
        "payload_template": {
            "to": ["{recipient_email}"],
            "subject": "{subject}",
            "html": "{html_content}",
            "from": {
                "email": "noreply@yourcompany.com",
                "name": "Workflow System"
            }
        }
    }',
    true,
    '00000000-0000-0000-0000-000000000001'
) ON CONFLICT (tenant_id, name) DO NOTHING;

-- ===== UPDATE PERMISSIONS =====

-- Add webhook management permissions to roles
UPDATE roles 
SET permissions = permissions::jsonb || '["view_webhook_analytics", "manage_webhook_security", "view_webhook_monitoring"]'::jsonb
WHERE name = 'Admin' 
AND NOT (permissions::jsonb ? 'view_webhook_analytics');

UPDATE roles 
SET permissions = permissions::jsonb || '["view_webhooks"]'::jsonb
WHERE name = 'User' 
AND NOT (permissions::jsonb ? 'view_webhooks');

-- Create Webhook Administrator role
INSERT INTO roles (tenant_id, name, description, permissions, is_system)
VALUES (
    '00000000-0000-0000-0000-000000000001',
    'Webhook Administrator',
    'Can manage all webhook operations including security and monitoring',
    '["view_webhooks", "manage_webhooks", "view_webhook_analytics", "manage_webhook_security", "view_webhook_monitoring", "test_webhooks", "manage_webhook_templates"]',
    false
) ON CONFLICT (tenant_id, name) DO NOTHING;

-- ===== CREATE VIEWS FOR ANALYTICS =====

-- View for webhook health dashboard
CREATE OR REPLACE VIEW webhook_health_dashboard AS
SELECT 
    w.id,
    w.name,
    w.webhook_type,
    w.environment,
    w.is_active,
    w.failure_count,
    w.last_triggered_at,
    w.priority,
    CASE 
        WHEN NOT w.is_active THEN 'disabled'
        WHEN w.failure_count > 5 THEN 'critical'
        WHEN w.failure_count > 2 THEN 'warning'
        WHEN w.last_triggered_at < NOW() - INTERVAL '24 hours' THEN 'stale'
        ELSE 'healthy'
    END as health_status,
    COUNT(wd.id) as deliveries_24h,
    COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries_24h,
    COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries_24h,
    AVG(wd.execution_time_ms) as avg_response_time_ms_24h,
    COUNT(wsl.id) as security_events_24h
FROM webhooks w
LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id 
    AND wd.created_at >= NOW() - INTERVAL '24 hours'
LEFT JOIN webhook_security_logs wsl ON w.id = wsl.webhook_id
    AND wsl.created_at >= NOW() - INTERVAL '24 hours'
GROUP BY w.id, w.name, w.webhook_type, w.environment, w.is_active, 
         w.failure_count, w.last_triggered_at, w.priority;

-- View for webhook delivery trends
CREATE OR REPLACE VIEW webhook_delivery_trends AS
SELECT 
    DATE(wd.created_at) as delivery_date,
    w.tenant_id,
    wd.webhook_type,
    wd.event_type,
    COUNT(*) as total_deliveries,
    COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
    COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries,
    AVG(wd.execution_time_ms) as avg_response_time_ms,
    COUNT(DISTINCT wd.webhook_id) as unique_webhooks
FROM webhook_deliveries wd
JOIN webhooks w ON wd.webhook_id = w.id
WHERE wd.created_at >= NOW() - INTERVAL '90 days'
GROUP BY DATE(wd.created_at), w.tenant_id, wd.webhook_type, wd.event_type
ORDER BY delivery_date DESC;

-- View for webhook performance metrics
CREATE OR REPLACE VIEW webhook_performance_metrics AS
SELECT 
    w.id as webhook_id,
    w.name as webhook_name,
    w.tenant_id,
    w.webhook_type,
    COUNT(wd.id) as total_deliveries,
    COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) as successful_deliveries,
    COUNT(CASE WHEN wd.response_status >= 400 THEN 1 END) as failed_deliveries,
    ROUND(
        COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) * 100.0 / 
        NULLIF(COUNT(wd.id), 0), 2
    ) as success_rate,
    AVG(wd.execution_time_ms) as avg_response_time_ms,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY wd.execution_time_ms) as p95_response_time_ms,
    MAX(wd.execution_time_ms) as max_response_time_ms,
    AVG(wd.delivery_attempts) as avg_delivery_attempts,
    MAX(wd.created_at) as last_delivery_at
FROM webhooks w
LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id
    AND wd.created_at >= NOW() - INTERVAL '30 days'
GROUP BY w.id, w.name, w.tenant_id, w.webhook_type;

-- ===== CREATE UTILITY FUNCTIONS =====

-- Function to get webhook health status
CREATE OR REPLACE FUNCTION get_webhook_health_status(webhook_uuid UUID)
RETURNS TABLE(
    webhook_id UUID,
    webhook_name VARCHAR,
    status VARCHAR,
    last_success TIMESTAMP WITH TIME ZONE,
    failure_count INTEGER,
    recent_deliveries BIGINT,
    success_rate NUMERIC
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        w.id as webhook_id,
        w.name as webhook_name,
        CASE 
            WHEN NOT w.is_active THEN 'disabled'
            WHEN w.failure_count > 5 THEN 'critical'
            WHEN w.failure_count > 2 THEN 'warning'
            WHEN MAX(wd.delivered_at) < NOW() - INTERVAL '24 hours' AND COUNT(wd.id) > 0 THEN 'stale'
            ELSE 'healthy'
        END as status,
        MAX(wd.delivered_at) as last_success,
        w.failure_count,
        COUNT(wd.id) as recent_deliveries,
        ROUND(
            COUNT(CASE WHEN wd.delivered_at IS NOT NULL THEN 1 END) * 100.0 / 
            NULLIF(COUNT(wd.id), 0), 2
        ) as success_rate
    FROM webhooks w
    LEFT JOIN webhook_deliveries wd ON w.id = wd.webhook_id 
        AND wd.created_at >= NOW() - INTERVAL '24 hours'
    WHERE w.id = webhook_uuid
    GROUP BY w.id, w.name, w.is_active, w.failure_count;
END;
$$ LANGUAGE plpgsql;

-- Function to clean up old webhook data
CREATE OR REPLACE FUNCTION cleanup_webhook_data(days_to_keep INTEGER DEFAULT 90)
RETURNS TABLE(
    deliveries_deleted INTEGER,
    received_data_deleted INTEGER,
    security_logs_deleted INTEGER,
    monitoring_deleted INTEGER,
    event_logs_deleted INTEGER,
    queue_jobs_deleted INTEGER
) AS $$
DECLARE
    del_deliveries INTEGER;
    del_received INTEGER;
    del_security INTEGER;
    del_monitoring INTEGER;
    del_events INTEGER;
    del_queue INTEGER;
BEGIN
    -- Clean up old deliveries (keep test deliveries for shorter time)
    DELETE FROM webhook_deliveries 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND is_test = false;
    GET DIAGNOSTICS del_deliveries = ROW_COUNT;
    
    -- Clean up test deliveries more aggressively (7 days)
    DELETE FROM webhook_deliveries 
    WHERE created_at < NOW() - INTERVAL '7 days'
    AND is_test = true;
    
    -- Clean up old received data
    DELETE FROM webhook_received_data 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND processed = true;
    GET DIAGNOSTICS del_received = ROW_COUNT;
    
    -- Clean up old security logs
    DELETE FROM webhook_security_logs 
    WHERE created_at < NOW() - INTERVAL '1 day' * (days_to_keep / 2);
    GET DIAGNOSTICS del_security = ROW_COUNT;
    
    -- Clean up old monitoring data
    DELETE FROM webhook_monitoring 
    WHERE created_at < NOW() - INTERVAL '1 day' * (days_to_keep / 3);
    GET DIAGNOSTICS del_monitoring = ROW_COUNT;
    
    -- Clean up old event logs
    DELETE FROM webhook_event_log 
    WHERE created_at < NOW() - INTERVAL '1 day' * days_to_keep
    AND processing_status = 'completed';
    GET DIAGNOSTICS del_events = ROW_COUNT;
    
    -- Clean up old completed queue jobs
    DELETE FROM webhook_queue
    WHERE status IN ('delivered', 'failed', 'cancelled')
    AND updated_at < NOW() - INTERVAL '7 days';
    GET DIAGNOSTICS del_queue = ROW_COUNT;
    
    RETURN QUERY SELECT del_deliveries, del_received, del_security, del_monitoring, del_events, del_queue;
END;
$$ LANGUAGE plpgsql;

-- ===== COMMENTS FOR DOCUMENTATION =====

COMMENT ON TABLE webhook_queue IS 'Queue for asynchronous webhook processing with retry logic';
COMMENT ON TABLE webhook_received_data IS 'Stores incoming webhook payloads for processing and audit';
COMMENT ON TABLE webhook_rate_limits IS 'Rate limiting data for incoming webhooks by client IP';
COMMENT ON TABLE webhook_security_logs IS 'Security events and violations for webhook endpoints';
COMMENT ON TABLE webhook_templates IS 'Reusable webhook configuration templates';
COMMENT ON TABLE webhook_monitoring IS 'Webhook health monitoring and status checks';
COMMENT ON TABLE webhook_event_log IS 'Log of webhook events triggered by system activities';

COMMENT ON FUNCTION get_webhook_health_status IS 'Returns comprehensive health status for a webhook';
COMMENT ON FUNCTION cleanup_webhook_data IS 'Cleans up old webhook data to maintain performance';

COMMENT ON VIEW webhook_health_dashboard IS 'Real-time webhook health dashboard data';
COMMENT ON VIEW webhook_delivery_trends IS 'Daily webhook delivery trends and statistics';
COMMENT ON VIEW webhook_performance_metrics IS 'Performance metrics for webhooks over the last 30 days';

-- ===== COMPLETION MESSAGE =====

DO $$
BEGIN
    RAISE NOTICE 'Complete webhook system migration finished successfully!';
    RAISE NOTICE 'Created tables: webhook_queue, webhook_received_data, webhook_rate_limits, webhook_security_logs, webhook_templates, webhook_monitoring, webhook_event_log';
    RAISE NOTICE 'Enhanced existing tables: webhooks, webhook_deliveries';
    RAISE NOTICE 'Added comprehensive indexes, triggers, views, and utility functions';
    RAISE NOTICE 'Added webhook templates for common integrations';
    RAISE NOTICE 'Added webhook management permissions and roles';
    RAISE NOTICE 'Use cleanup_webhook_data() to maintain performance';
    RAISE NOTICE 'Use get_webhook_health_status() for webhook monitoring';
    RAISE NOTICE 'Check webhook_health_dashboard view for real-time status';
    RAISE NOTICE 'Webhook system is now complete and ready for production use!';
END $$;