-- ============================================================
-- 8x8 Hub - Enhanced Database Schema
-- For Galactic OS: Scam Reports, Agent Memory, User Layouts
-- ============================================================

-- Create extension for vector storage (if available)
-- CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- SCAM REPORTS TABLE
-- For tracking contract audits, wallet audits, and scam reports
-- ============================================================
CREATE TABLE IF NOT EXISTS scam_reports (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50) NOT NULL, -- 'contract_audit', 'wallet_audit', 'user_report'
    target_address VARCHAR(255) NOT NULL,
    chain VARCHAR(50) DEFAULT 'ethereum',
    risk_score INTEGER CHECK (risk_score >= 0 AND risk_score <= 100),
    risk_level VARCHAR(20) CHECK (risk_level IN ('safe', 'low', 'medium', 'high', 'critical')),
    flags JSONB DEFAULT '[]',
    details JSONB DEFAULT '{}',
    description TEXT,
    reporter_contact VARCHAR(255),
    evidence JSONB DEFAULT '{}',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'confirmed', 'resolved', 'dismissed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scam_reports_address ON scam_reports(target_address);
CREATE INDEX IF NOT EXISTS idx_scam_reports_risk_level ON scam_reports(risk_level);
CREATE INDEX IF NOT EXISTS idx_scam_reports_status ON scam_reports(status);
CREATE INDEX IF NOT EXISTS idx_scam_reports_created ON scam_reports(created_at DESC);

-- ============================================================
-- AGENT MEMORY TABLE
-- For storing agent long-term memory with embeddings
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_memory (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(100) NOT NULL,
    memory_type VARCHAR(50) DEFAULT 'interaction', -- 'interaction', 'decision', 'learning', 'fact'
    content TEXT NOT NULL,
    embedding JSONB, -- Vector embedding for semantic search
    metadata JSONB DEFAULT '{}',
    importance INTEGER DEFAULT 5 CHECK (importance >= 1 AND importance <= 10),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent ON agent_memory(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_memory_type ON agent_memory(memory_type);
CREATE INDEX IF NOT EXISTS idx_agent_memory_created ON agent_memory(created_at DESC);

-- ============================================================
-- AGENT STATUS TABLE
-- For tracking agent states and health
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_status (
    agent_id VARCHAR(100) PRIMARY KEY,
    status VARCHAR(20) DEFAULT 'idle' CHECK (status IN ('idle', 'running', 'paused', 'error')),
    last_run TIMESTAMP WITH TIME ZONE,
    last_error TEXT,
    config JSONB DEFAULT '{}',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- AGENT LOGS TABLE
-- For detailed agent execution logs
-- ============================================================
CREATE TABLE IF NOT EXISTS agent_logs (
    id SERIAL PRIMARY KEY,
    agent_id VARCHAR(100) NOT NULL,
    action VARCHAR(100) NOT NULL,
    details JSONB DEFAULT '{}',
    duration_ms INTEGER,
    result JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_logs_agent ON agent_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_logs_created ON agent_logs(created_at DESC);

-- ============================================================
-- USER LAYOUTS TABLE
-- For storing user-customized UI layouts (galaxy positions)
-- ============================================================
CREATE TABLE IF NOT EXISTS user_layouts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES hub_users(id) ON DELETE CASCADE,
    layout_name VARCHAR(100) DEFAULT 'default',
    layout_type VARCHAR(50) DEFAULT 'bubbles', -- 'space', 'bubbles', 'tiles', 'mixed'
    layout_data JSONB NOT NULL DEFAULT '{}', -- { positions: [{id, x, y, z}], settings: {} }
    is_public BOOLEAN DEFAULT false,
    use_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_layouts_user ON user_layouts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_layouts_public ON user_layouts(is_public) WHERE is_public = true;

-- ============================================================
-- USER AVATARS TABLE
-- For storing custom avatar configurations
-- ============================================================
CREATE TABLE IF NOT EXISTS user_avatars (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES hub_users(id) ON DELETE CASCADE,
    avatar_type VARCHAR(50) DEFAULT 'default', -- 'default', 'seraphim', 'custom', 'readyplayerme'
    model_url TEXT,
    model_data JSONB DEFAULT '{}',
    customization JSONB DEFAULT '{}', -- { color, size, accessories }
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_avatars_user ON user_avatars(user_id);

-- ============================================================
-- DONATIONS TABLE
-- For tracking charitable donations and planetary projects
-- ============================================================
CREATE TABLE IF NOT EXISTS donations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES hub_users(id) ON DELETE SET NULL,
    project_id VARCHAR(100) NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(20) DEFAULT 'ETH',
    tx_hash VARCHAR(255),
    impact_metric JSONB DEFAULT '{}', -- { treesPlanted: 5, carbonOffset: 100 }
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'failed')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_donations_user ON donations(user_id);
CREATE INDEX IF NOT EXISTS idx_donations_project ON donations(project_id);

-- ============================================================
-- APPROVED PROJECTS TABLE
-- For managing treasury-approved donation projects
-- ============================================================
CREATE TABLE IF NOT EXISTS approved_projects (
    id SERIAL PRIMARY KEY,
    project_id VARCHAR(100) UNIQUE NOT NULL,
    project_name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(50), -- 'reforestation', 'opensource', 'education', 'disaster_relief'
    website_url TEXT,
    impact_description TEXT,
    wallet_address VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    total_donated DECIMAL(20, 8) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- EVIDENCE RECORDS TABLE
-- For legal/forensic evidence collection
-- ============================================================
CREATE TABLE IF NOT EXISTS evidence_records (
    id SERIAL PRIMARY KEY,
    report_id INTEGER REFERENCES scam_reports(id) ON DELETE CASCADE,
    evidence_type VARCHAR(50) NOT NULL, -- 'transaction', 'code', 'screenshot', 'document'
    description TEXT,
    data JSONB NOT NULL DEFAULT '{}',
    ipfs_hash VARCHAR(255), -- For decentralized storage
    verified BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_evidence_report ON evidence_records(report_id);

-- ============================================================
-- REIMBURSEMENT CLAIMS TABLE
-- For fund recovery claims
-- ============================================================
CREATE TABLE IF NOT EXISTS reimbursement_claims (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES hub_users(id) ON DELETE CASCADE,
    report_id INTEGER REFERENCES scam_reports(id) ON DELETE SET NULL,
    amount DECIMAL(20, 8) NOT NULL,
    currency VARCHAR(20) DEFAULT 'ETH',
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'paid')),
    reviewed_by INTEGER,
    review_notes TEXT,
    tx_hash VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reimbursement_user ON reimbursement_claims(user_id);
CREATE INDEX IF NOT EXISTS idx_reimbursement_status ON reimbursement_claims(status);

-- ============================================================
-- Insert default approved projects
-- ============================================================
INSERT INTO approved_projects (project_id, project_name, description, category, impact_description) VALUES
    ('trees-for-lives', 'Trees for Lives', 'Planting trees in deforested areas', 'reforestation', '5 trees planted per 0.1 ETH'),
    ('ocean-cleanup', 'Ocean Cleanup Initiative', 'Removing plastic from oceans', 'environment', '100kg plastic removed per 1 ETH'),
    ('wiki-foundation', 'Wikimedia Foundation', 'Supporting free knowledge', 'opensource', '100 Wikipedia articles kept ad-free per donation')
ON CONFLICT (project_id) DO NOTHING;

-- ============================================================
-- Update existing tables with new columns if needed
-- ============================================================
ALTER TABLE hub_users ADD COLUMN IF NOT EXISTS ecosystem_id VARCHAR(100) UNIQUE;
ALTER TABLE hub_users ADD COLUMN IF NOT EXISTS galaxy_mode VARCHAR(20) DEFAULT 'bubbles';
ALTER TABLE hub_users ADD COLUMN IF NOT EXISTS notification_settings JSONB DEFAULT '{"email": true, "push": true, "alerts": true}';

-- Generate ecosystem IDs for existing users
UPDATE hub_users SET ecosystem_id = CONCAT('8x8_', id, '_', LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0'))
WHERE ecosystem_id IS NULL;

-- ============================================================
-- Grant permissions (adjust as needed for your setup)
-- ============================================================
-- GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO hub_app;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO hub_app;
