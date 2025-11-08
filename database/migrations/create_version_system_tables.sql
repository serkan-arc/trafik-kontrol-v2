-- ================================================
-- VERSION PROGRESSION SYSTEM - DATABASE TABLES
-- ================================================
-- Created: 2025-11-03
-- Purpose: Track IP version progression (Clean → Gray → Aggressive → Forbidden)
--
-- Tables:
-- 1. version_settings: Global and site-specific version configuration
-- 2. ip_version_history: Track each IP's version progression over time
-- 3. version_statistics: Aggregated stats for dashboard widgets
-- ================================================

-- ================================================
-- TABLE 1: version_settings
-- Purpose: Store global and per-site version progression rules
-- ================================================
CREATE TABLE IF NOT EXISTS version_settings (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES deployed_sites(id) ON DELETE CASCADE,
    -- NULL site_id = global settings, non-NULL = site-specific override
    
    -- Master toggle
    is_enabled BOOLEAN DEFAULT false,
    
    -- Version sequence configuration (JSON array)
    -- Example: ["clean", "gray", "aggressive", "forbidden"]
    version_sequence JSONB DEFAULT '["clean", "gray", "aggressive"]'::jsonb,
    
    -- Per-version settings (JSON object)
    -- Structure: { "clean": {...}, "gray": {...}, "aggressive": {...} }
    version_config JSONB DEFAULT '{
        "clean": {
            "cooldown_minutes": 1440,
            "max_views": 0,
            "auto_progress_conditions": {
                "high_risk_score": true,
                "spam_attempts": true,
                "fake_bot": false
            }
        },
        "gray": {
            "cooldown_minutes": 720,
            "max_views": 0,
            "auto_progress_conditions": {
                "high_risk_score": true,
                "spam_attempts": true,
                "fake_bot": true
            }
        },
        "aggressive": {
            "cooldown_minutes": 360,
            "max_views": 0,
            "auto_progress_conditions": {
                "high_risk_score": true,
                "spam_attempts": true,
                "fake_bot": true
            }
        }
    }'::jsonb,
    
    -- End-of-sequence action
    end_action VARCHAR(50) DEFAULT 'block',
    -- Options: 'block', 'redirect', 'reset', 'continue', 'message'
    end_action_value TEXT, -- Redirect URL or custom message
    
    -- Advanced filters (JSON object)
    advanced_filters JSONB DEFAULT '{
        "time_based": {
            "enabled": false,
            "business_hours": "clean",
            "off_hours": "gray"
        },
        "country_based": {
            "enabled": false,
            "trusted_countries": [],
            "default_version": "gray"
        },
        "device_based": {
            "enabled": false,
            "mobile": "clean",
            "desktop": "gray"
        }
    }'::jsonb,
    
    -- Bypass list (IPs that always see clean version)
    bypass_ips TEXT[], -- Array of IPs: ['1.2.3.4', '5.6.7.8']
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    -- Ensure only one global setting and one per site
    CONSTRAINT unique_global_setting CHECK (
        site_id IS NULL OR 
        (SELECT COUNT(*) FROM version_settings WHERE site_id IS NULL) <= 1
    )
);

-- Index for fast lookups
CREATE INDEX idx_version_settings_site ON version_settings(site_id);
CREATE INDEX idx_version_settings_enabled ON version_settings(is_enabled);

-- ================================================
-- TABLE 2: ip_version_history
-- Purpose: Track each IP's version progression timeline
-- ================================================
CREATE TABLE IF NOT EXISTS ip_version_history (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) NOT NULL, -- IPv4 or IPv6
    site_id INTEGER REFERENCES deployed_sites(id) ON DELETE CASCADE,
    
    -- Current version state
    current_version VARCHAR(50) NOT NULL DEFAULT 'clean',
    -- Values: 'clean', 'gray', 'aggressive', 'forbidden'
    
    -- Progression tracking
    version_started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    previous_version VARCHAR(50), -- What version was before this
    progression_reason VARCHAR(255), -- Why it progressed (e.g., "cooldown expired", "risk score high")
    
    -- Statistics for this version
    views_count INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0, -- How long in this version
    
    -- Manual override flags
    is_bypassed BOOLEAN DEFAULT false, -- If true, always show clean
    bypass_expires_at TIMESTAMP, -- Temporary bypass (e.g., 24h)
    is_manually_set BOOLEAN DEFAULT false, -- If admin manually changed version
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX idx_ip_version_ip ON ip_version_history(ip);
CREATE INDEX idx_ip_version_site ON ip_version_history(site_id);
CREATE INDEX idx_ip_version_current ON ip_version_history(current_version);
CREATE INDEX idx_ip_version_started ON ip_version_history(version_started_at);
CREATE INDEX idx_ip_version_bypassed ON ip_version_history(is_bypassed) WHERE is_bypassed = true;

-- Unique constraint: One active version per IP per site
CREATE UNIQUE INDEX idx_ip_version_unique ON ip_version_history(ip, site_id);

-- ================================================
-- TABLE 3: version_statistics
-- Purpose: Aggregated statistics for dashboard widgets
-- ================================================
CREATE TABLE IF NOT EXISTS version_statistics (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES deployed_sites(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Version distribution counts
    clean_count INTEGER DEFAULT 0,
    gray_count INTEGER DEFAULT 0,
    aggressive_count INTEGER DEFAULT 0,
    forbidden_count INTEGER DEFAULT 0,
    
    -- Progression counts (how many IPs moved between versions)
    clean_to_gray INTEGER DEFAULT 0,
    gray_to_aggressive INTEGER DEFAULT 0,
    aggressive_to_forbidden INTEGER DEFAULT 0,
    
    -- Progression reasons breakdown
    progression_reasons JSONB DEFAULT '{
        "cooldown_expired": 0,
        "high_risk_score": 0,
        "spam_attempts": 0,
        "fake_bot": 0,
        "manual": 0
    }'::jsonb,
    
    -- Performance metrics
    avg_time_in_clean INTEGER DEFAULT 0, -- Average minutes in clean version
    avg_time_in_gray INTEGER DEFAULT 0,
    avg_time_in_aggressive INTEGER DEFAULT 0,
    
    -- Metadata
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    
    -- Ensure one row per site per day
    CONSTRAINT unique_site_date UNIQUE(site_id, stat_date)
);

-- Index for fast date range queries
CREATE INDEX idx_version_stats_site ON version_statistics(site_id);
CREATE INDEX idx_version_stats_date ON version_statistics(stat_date);

-- ================================================
-- TRIGGER: Auto-update updated_at timestamp
-- ================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_version_settings_updated_at 
    BEFORE UPDATE ON version_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ip_version_history_updated_at 
    BEFORE UPDATE ON ip_version_history
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_version_statistics_updated_at 
    BEFORE UPDATE ON version_statistics
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ================================================
-- INITIAL DATA: Default global settings
-- ================================================
INSERT INTO version_settings (
    site_id,
    is_enabled,
    version_sequence,
    version_config,
    end_action,
    created_at
) VALUES (
    NULL, -- Global settings
    false, -- Disabled by default
    '["clean", "gray", "aggressive"]'::jsonb,
    '{
        "clean": {
            "cooldown_minutes": 1440,
            "max_views": 0,
            "auto_progress_conditions": {
                "high_risk_score": true,
                "spam_attempts": true,
                "fake_bot": false
            }
        },
        "gray": {
            "cooldown_minutes": 720,
            "max_views": 0,
            "auto_progress_conditions": {
                "high_risk_score": true,
                "spam_attempts": true,
                "fake_bot": true
            }
        },
        "aggressive": {
            "cooldown_minutes": 360,
            "max_views": 0,
            "auto_progress_conditions": {
                "high_risk_score": true,
                "spam_attempts": true,
                "fake_bot": true
            }
        }
    }'::jsonb,
    'block',
    NOW()
) ON CONFLICT DO NOTHING;

-- ================================================
-- SUCCESS MESSAGE
-- ================================================
SELECT 'Version Progression System tables created successfully!' AS message;
SELECT 'Tables: version_settings, ip_version_history, version_statistics' AS tables;
SELECT 'Triggers: auto-update updated_at on all tables' AS triggers;
SELECT 'Initial data: Global settings inserted (disabled by default)' AS initial_data;
