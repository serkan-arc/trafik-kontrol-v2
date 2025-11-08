-- ============================================
-- TRAFFIC CONTROL & SITE DEPLOYMENT SYSTEM
-- Migration: 001 - Core Tables
-- Created: 2025-11-01
-- Description: Creates all tables for Traffic Control Station 1 & 2
-- ============================================

-- ============================================
-- STATION 1: TRAFFIC CONTROL TABLES
-- ============================================

-- 1. IP Tracking (Main IP Information)
CREATE TABLE IF NOT EXISTS ip_tracking (
  -- Primary
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL UNIQUE,
  
  -- Geo Info
  country VARCHAR(2),
  country_name VARCHAR(100),
  city VARCHAR(100),
  isp VARCHAR(255),
  
  -- Device Info (Last detected)
  device_type VARCHAR(20), -- pc, mobile, tablet
  os VARCHAR(50),
  browser VARCHAR(50),
  
  -- Visit Counts
  visit_count INTEGER DEFAULT 1,
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  
  -- Form Counts
  form_submissions INTEGER DEFAULT 0,
  same_form_spam_count INTEGER DEFAULT 0,
  
  -- Risk Scores (0-100)
  risk_score INTEGER DEFAULT 0 CHECK (risk_score >= 0 AND risk_score <= 100),
  bot_score INTEGER DEFAULT 0 CHECK (bot_score >= 0 AND bot_score <= 100),
  spam_score INTEGER DEFAULT 0 CHECK (spam_score >= 0 AND spam_score <= 100),
  
  -- Status
  list_status VARCHAR(20) DEFAULT 'unknown' CHECK (list_status IN ('whitelist', 'graylist', 'blacklist', 'unknown')),
  redirect_version VARCHAR(20) DEFAULT 'clean' CHECK (redirect_version IN ('clean', 'gray', 'aggressive')),
  
  -- Admin
  admin_notes TEXT,
  manual_decision BOOLEAN DEFAULT false,
  admin_user_id UUID,
  decision_date TIMESTAMP,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for ip_tracking
CREATE INDEX idx_ip_tracking_ip ON ip_tracking(ip);
CREATE INDEX idx_ip_tracking_list_status ON ip_tracking(list_status);
CREATE INDEX idx_ip_tracking_risk_score ON ip_tracking(risk_score);
CREATE INDEX idx_ip_tracking_last_seen ON ip_tracking(last_seen);
CREATE INDEX idx_ip_tracking_country ON ip_tracking(country);

-- ============================================

-- 2. IP Visit History (Every Visit Detail)
CREATE TABLE IF NOT EXISTS ip_visit_history (
  -- Primary
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  session_id VARCHAR(255),
  
  -- Visit Info
  page_url TEXT,
  page_title VARCHAR(500),
  referer TEXT,
  utm_source VARCHAR(255),
  utm_medium VARCHAR(255),
  utm_campaign VARCHAR(255),
  
  -- Device Info (This visit)
  user_agent TEXT,
  device_type VARCHAR(20),
  os VARCHAR(50),
  browser VARCHAR(50),
  screen_resolution VARCHAR(20),
  
  -- Behavioral Data
  time_on_page INTEGER, -- seconds
  scroll_depth INTEGER CHECK (scroll_depth >= 0 AND scroll_depth <= 100), -- percentage
  clicks_count INTEGER DEFAULT 0,
  mouse_movements BOOLEAN DEFAULT false,
  keyboard_inputs BOOLEAN DEFAULT false,
  
  -- Bot Detection
  is_bot BOOLEAN DEFAULT false,
  bot_type VARCHAR(50),
  bot_verified BOOLEAN DEFAULT false,
  
  -- Timestamps
  visit_timestamp TIMESTAMP DEFAULT NOW(),
  leave_timestamp TIMESTAMP,
  
  -- Foreign Key
  ip_tracking_id BIGINT REFERENCES ip_tracking(id) ON DELETE CASCADE
);

-- Indexes for ip_visit_history
CREATE INDEX idx_ip_visit_history_ip ON ip_visit_history(ip);
CREATE INDEX idx_ip_visit_history_session_id ON ip_visit_history(session_id);
CREATE INDEX idx_ip_visit_history_visit_timestamp ON ip_visit_history(visit_timestamp);
CREATE INDEX idx_ip_visit_history_is_bot ON ip_visit_history(is_bot);

-- ============================================

-- 3. Form Submission History (Form Spam Detection)
CREATE TABLE IF NOT EXISTS form_submission_history (
  -- Primary
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  session_id VARCHAR(255),
  
  -- Form Info
  site_id UUID,
  site_domain VARCHAR(255),
  form_name VARCHAR(255),
  form_url TEXT,
  
  -- Form Data (Hashed for privacy)
  data_hash VARCHAR(64), -- SHA256 hash
  field_count INTEGER,
  
  -- Behavioral
  time_to_fill INTEGER, -- seconds
  focus_changes INTEGER,
  paste_detected BOOLEAN DEFAULT false,
  autocomplete_used BOOLEAN DEFAULT false,
  
  -- Spam Detection
  is_spam BOOLEAN DEFAULT false,
  spam_score INTEGER DEFAULT 0 CHECK (spam_score >= 0 AND spam_score <= 100),
  spam_reasons JSONB,
  
  -- Same Form Spam Detection
  same_form_count_24h INTEGER DEFAULT 1,
  same_data_count INTEGER DEFAULT 1,
  
  -- Actions Taken
  action_taken VARCHAR(50) CHECK (action_taken IN ('allow', 'graylist', 'blacklist', 'manual_review')),
  
  -- Timestamp
  submitted_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign Key
  ip_tracking_id BIGINT REFERENCES ip_tracking(id) ON DELETE CASCADE
);

-- Indexes for form_submission_history
CREATE INDEX idx_form_submission_ip ON form_submission_history(ip);
CREATE INDEX idx_form_submission_form_name ON form_submission_history(form_name);
CREATE INDEX idx_form_submission_data_hash ON form_submission_history(data_hash);
CREATE INDEX idx_form_submission_submitted_at ON form_submission_history(submitted_at);
CREATE INDEX idx_form_submission_is_spam ON form_submission_history(is_spam);
CREATE INDEX idx_form_submission_site_id ON form_submission_history(site_id);

-- ============================================

-- 4. IP User Agent History (Bot Detection)
CREATE TABLE IF NOT EXISTS ip_user_agent_history (
  -- Primary
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  
  -- User Agent
  user_agent TEXT NOT NULL,
  parsed_device VARCHAR(20),
  parsed_os VARCHAR(50),
  parsed_browser VARCHAR(50),
  
  -- Detection
  is_bot BOOLEAN DEFAULT false,
  claims_to_be_bot BOOLEAN DEFAULT false,
  bot_type VARCHAR(50),
  
  -- DNS Verification (Bot validation)
  dns_hostname VARCHAR(255),
  dns_verified BOOLEAN DEFAULT false,
  dns_check_date TIMESTAMP,
  
  -- Usage Stats
  first_seen TIMESTAMP DEFAULT NOW(),
  last_seen TIMESTAMP DEFAULT NOW(),
  visit_count_with_this_ua INTEGER DEFAULT 1,
  
  -- Foreign Key
  ip_tracking_id BIGINT REFERENCES ip_tracking(id) ON DELETE CASCADE
);

-- Indexes for ip_user_agent_history
CREATE INDEX idx_ip_user_agent_ip ON ip_user_agent_history(ip);
CREATE INDEX idx_ip_user_agent_hash ON ip_user_agent_history(MD5(user_agent));
CREATE INDEX idx_ip_user_agent_is_bot ON ip_user_agent_history(is_bot);
CREATE INDEX idx_ip_user_agent_dns_verified ON ip_user_agent_history(dns_verified);

-- ============================================

-- 5. IP Decision History (Admin Manual Decisions)
CREATE TABLE IF NOT EXISTS ip_decision_history (
  -- Primary
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  
  -- Decision
  old_status VARCHAR(20),
  new_status VARCHAR(20) CHECK (new_status IN ('whitelist', 'graylist', 'blacklist', 'unknown')),
  redirect_version VARCHAR(20) CHECK (redirect_version IN ('clean', 'gray', 'aggressive')),
  
  -- Reason
  decision_type VARCHAR(50) CHECK (decision_type IN ('manual', 'auto_rule', 'spam_detection')),
  reason TEXT,
  notes TEXT,
  
  -- Auto Rule (if automatic)
  triggered_by_rule_id UUID,
  rule_name VARCHAR(255),
  
  -- Admin (if manual)
  admin_user_id UUID,
  admin_username VARCHAR(255),
  
  -- Timestamp
  decided_at TIMESTAMP DEFAULT NOW(),
  
  -- Foreign Key
  ip_tracking_id BIGINT REFERENCES ip_tracking(id) ON DELETE CASCADE
);

-- Indexes for ip_decision_history
CREATE INDEX idx_ip_decision_ip ON ip_decision_history(ip);
CREATE INDEX idx_ip_decision_new_status ON ip_decision_history(new_status);
CREATE INDEX idx_ip_decision_decided_at ON ip_decision_history(decided_at);
CREATE INDEX idx_ip_decision_type ON ip_decision_history(decision_type);
CREATE INDEX idx_ip_decision_rule_id ON ip_decision_history(triggered_by_rule_id);

-- ============================================

-- 6. IP Pattern Detection (Behavioral Patterns)
CREATE TABLE IF NOT EXISTS ip_pattern_detection (
  -- Primary
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  
  -- Pattern Type
  pattern_type VARCHAR(50) CHECK (pattern_type IN ('rapid_visits', 'form_spam', 'bot_behavior', 'scraping', 'suspicious')),
  pattern_score INTEGER CHECK (pattern_score >= 0 AND pattern_score <= 100),
  
  -- Detection Details (JSON)
  detection_data JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  resolved BOOLEAN DEFAULT false,
  
  -- Timestamps
  first_detected TIMESTAMP DEFAULT NOW(),
  last_detected TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP,
  
  -- Foreign Key
  ip_tracking_id BIGINT REFERENCES ip_tracking(id) ON DELETE CASCADE
);

-- Indexes for ip_pattern_detection
CREATE INDEX idx_ip_pattern_ip ON ip_pattern_detection(ip);
CREATE INDEX idx_ip_pattern_type ON ip_pattern_detection(pattern_type);
CREATE INDEX idx_ip_pattern_is_active ON ip_pattern_detection(is_active);
CREATE INDEX idx_ip_pattern_resolved ON ip_pattern_detection(resolved);

-- ============================================

-- 7. Auto Rules (Automatic Decision Engine)
CREATE TABLE IF NOT EXISTS auto_rules (
  -- Primary
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  
  -- Conditions (JSON)
  conditions JSONB NOT NULL,
  
  -- Actions
  action VARCHAR(50) NOT NULL CHECK (action IN ('whitelist', 'graylist', 'blacklist', 'notify')),
  redirect_version VARCHAR(20) CHECK (redirect_version IN ('clean', 'gray', 'aggressive', 'forbidden')),
  
  -- Priority
  priority INTEGER DEFAULT 0,
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID
);

-- Indexes for auto_rules
CREATE INDEX idx_auto_rules_enabled ON auto_rules(enabled);
CREATE INDEX idx_auto_rules_priority ON auto_rules(priority);
CREATE INDEX idx_auto_rules_action ON auto_rules(action);

-- ============================================
-- STATION 2: SITE DEPLOYMENT TABLES
-- ============================================

-- 8. Deployed Sites (Site Management)
CREATE TABLE IF NOT EXISTS deployed_sites (
  -- Primary
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  
  -- File Info
  file_path TEXT NOT NULL,
  site_type VARCHAR(50) CHECK (site_type IN ('static', 'nodejs', 'nextjs', 'react')),
  
  -- Ports
  clean_port INTEGER,
  gray_port INTEGER,
  aggr_port INTEGER,
  mobile_clean_port INTEGER,
  mobile_gray_port INTEGER,
  mobile_aggr_port INTEGER,
  
  -- Configuration
  ssl_enabled BOOLEAN DEFAULT false,
  ssl_expires_at TIMESTAMP,
  nginx_config_path TEXT,
  
  -- PM2 Processes (JSON)
  pm2_processes JSONB,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'stopped', 'error', 'deploying')),
  
  -- Timestamps
  deployed_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  deployed_by UUID
);

-- Indexes for deployed_sites
CREATE INDEX idx_deployed_sites_domain ON deployed_sites(domain);
CREATE INDEX idx_deployed_sites_status ON deployed_sites(status);
CREATE INDEX idx_deployed_sites_deployed_at ON deployed_sites(deployed_at);

-- ============================================

-- 9. NGINX Configurations
CREATE TABLE IF NOT EXISTS nginx_configs (
  -- Primary
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  site_id UUID REFERENCES deployed_sites(id) ON DELETE CASCADE,
  
  -- Config
  config_path TEXT NOT NULL,
  config_content TEXT NOT NULL,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  tested BOOLEAN DEFAULT false,
  test_result TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for nginx_configs
CREATE INDEX idx_nginx_configs_site_id ON nginx_configs(site_id);
CREATE INDEX idx_nginx_configs_is_active ON nginx_configs(is_active);

-- ============================================

-- 10. SSL Certificates
CREATE TABLE IF NOT EXISTS ssl_certificates (
  -- Primary
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  site_id UUID REFERENCES deployed_sites(id) ON DELETE CASCADE,
  
  -- Certificate Info
  cert_path TEXT,
  key_path TEXT,
  fullchain_path TEXT,
  
  -- Status
  status VARCHAR(50) CHECK (status IN ('pending', 'active', 'expired', 'error')),
  issued_at TIMESTAMP,
  expires_at TIMESTAMP,
  
  -- Auto Renewal
  auto_renew BOOLEAN DEFAULT true,
  last_renewal_attempt TIMESTAMP,
  renewal_error TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for ssl_certificates
CREATE INDEX idx_ssl_certificates_domain ON ssl_certificates(domain);
CREATE INDEX idx_ssl_certificates_site_id ON ssl_certificates(site_id);
CREATE INDEX idx_ssl_certificates_status ON ssl_certificates(status);
CREATE INDEX idx_ssl_certificates_expires_at ON ssl_certificates(expires_at);

-- ============================================
-- TRIGGERS FOR AUTO-UPDATE
-- ============================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply trigger to tables with updated_at
CREATE TRIGGER update_ip_tracking_updated_at BEFORE UPDATE ON ip_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_auto_rules_updated_at BEFORE UPDATE ON auto_rules FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_deployed_sites_updated_at BEFORE UPDATE ON deployed_sites FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_nginx_configs_updated_at BEFORE UPDATE ON nginx_configs FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ssl_certificates_updated_at BEFORE UPDATE ON ssl_certificates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- INITIAL DATA (Sample for testing)
-- ============================================

-- Insert sample IP tracking data
INSERT INTO ip_tracking (ip, country, country_name, city, device_type, visit_count, form_submissions, risk_score, list_status)
VALUES 
('185.123.45.67', 'TR', 'Turkey', 'Istanbul', 'mobile', 12, 3, 65, 'graylist'),
('192.168.1.1', 'US', 'United States', 'New York', 'pc', 5, 5, 92, 'blacklist'),
('10.0.0.1', 'GB', 'United Kingdom', 'London', 'pc', 234, 45, 15, 'whitelist')
ON CONFLICT (ip) DO NOTHING;

-- Insert sample auto rule
INSERT INTO auto_rules (name, description, conditions, action, redirect_version, priority, enabled)
VALUES 
('3 Kez Geldi Blokla', '3 kez ziyaret eden IP''leri otomatik engelle', 
 '{"visit_count": {"operator": ">=", "value": 3, "within_hours": 24}}'::jsonb,
 'blacklist', 'forbidden', 10, true)
ON CONFLICT DO NOTHING;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================

-- Log migration
DO $$
BEGIN
    RAISE NOTICE 'Migration 001_traffic_control_tables completed successfully!';
    RAISE NOTICE 'Created 10 tables:';
    RAISE NOTICE '  1. ip_tracking';
    RAISE NOTICE '  2. ip_visit_history';
    RAISE NOTICE '  3. form_submission_history';
    RAISE NOTICE '  4. ip_user_agent_history';
    RAISE NOTICE '  5. ip_decision_history';
    RAISE NOTICE '  6. ip_pattern_detection';
    RAISE NOTICE '  7. auto_rules';
    RAISE NOTICE '  8. deployed_sites';
    RAISE NOTICE '  9. nginx_configs';
    RAISE NOTICE ' 10. ssl_certificates';
    RAISE NOTICE '';
    RAISE NOTICE 'Created indexes for optimal performance';
    RAISE NOTICE 'Created auto-update triggers';
    RAISE NOTICE 'Inserted sample data for testing';
END $$;
