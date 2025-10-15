-- Privacy Consent Table
CREATE TABLE IF NOT EXISTS privacy_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    consent_type VARCHAR(50) NOT NULL CHECK (consent_type IN ('data_processing', 'marketing', 'analytics', 'third_party_sharing', 'cookies')),
    consent_status VARCHAR(20) NOT NULL CHECK (consent_status IN ('granted', 'denied', 'withdrawn')),
    consent_version VARCHAR(50) NOT NULL,
    consent_text TEXT NOT NULL,
    ip_address INET,
    user_agent TEXT,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Export Request Table
CREATE TABLE IF NOT EXISTS data_export_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'expired')),
    format VARCHAR(10) NOT NULL DEFAULT 'json' CHECK (format IN ('json', 'csv', 'xml')),
    data_types TEXT[] NOT NULL,
    file_path TEXT,
    file_size BIGINT,
    download_url TEXT,
    expires_at TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Data Deletion Request Table
CREATE TABLE IF NOT EXISTS data_deletion_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed', 'cancelled')),
    deletion_type VARCHAR(20) NOT NULL DEFAULT 'full_account' CHECK (deletion_type IN ('full_account', 'partial_data', 'anonymization')),
    data_types TEXT[],
    reason TEXT,
    verification_code VARCHAR(100),
    verified_at TIMESTAMPTZ,
    scheduled_for TIMESTAMPTZ NOT NULL,
    processed_at TIMESTAMPTZ,
    error_message TEXT,
    backup_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit Log Table
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    session_id VARCHAR(255),
    action VARCHAR(50) NOT NULL CHECK (action IN ('create', 'read', 'update', 'delete', 'login', 'logout', 'export', 'consent_granted', 'consent_withdrawn', 'password_reset', 'email_verified', 'two_factor_enabled', 'two_factor_disabled')),
    resource_type VARCHAR(100) NOT NULL,
    resource_id VARCHAR(255),
    result VARCHAR(20) NOT NULL DEFAULT 'success' CHECK (result IN ('success', 'failure', 'partial')),
    ip_address INET,
    user_agent TEXT,
    request_id VARCHAR(255),
    metadata JSONB,
    old_values JSONB,
    new_values JSONB,
    error_message TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for Privacy Tables
CREATE INDEX IF NOT EXISTS idx_privacy_consents_user_id ON privacy_consents(user_id);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_type_status ON privacy_consents(consent_type, consent_status);
CREATE INDEX IF NOT EXISTS idx_privacy_consents_created_at ON privacy_consents(created_at);

CREATE INDEX IF NOT EXISTS idx_data_export_requests_user_id ON data_export_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_status ON data_export_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_export_requests_created_at ON data_export_requests(created_at);

CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_user_id ON data_deletion_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_status ON data_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_data_deletion_requests_scheduled_for ON data_deletion_requests(scheduled_for);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id_created_at ON audit_logs(user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_created_at ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource_type_resource_id ON audit_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Partitioning for Audit Logs (by month)
-- Note: This would typically be done with a more sophisticated partitioning strategy in production
-- CREATE TABLE audit_logs_y2024m01 PARTITION OF audit_logs FOR VALUES FROM ('2024-01-01') TO ('2024-02-01');
-- CREATE TABLE audit_logs_y2024m02 PARTITION OF audit_logs FOR VALUES FROM ('2024-02-01') TO ('2024-03-01');
-- ... etc

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_privacy_consents_updated_at BEFORE UPDATE ON privacy_consents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_export_requests_updated_at BEFORE UPDATE ON data_export_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_data_deletion_requests_updated_at BEFORE UPDATE ON data_deletion_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Data retention policy (example - adjust as needed)
-- This would typically be implemented as a scheduled job
-- DELETE FROM audit_logs WHERE created_at < NOW() - INTERVAL '7 years';
-- DELETE FROM data_export_requests WHERE status = 'expired' AND created_at < NOW() - INTERVAL '1 year';
-- DELETE FROM data_deletion_requests WHERE status IN ('completed', 'failed') AND created_at < NOW() - INTERVAL '1 year';