-- ============================================
-- GLOBAL MANAGEMENT TABLES
-- Migration: 008 - Global IP, Rules, Bot, Spam Management
-- Created: 2025-11-06
-- Description: Adds global management tables that work across all domains
-- ============================================

-- ============================================
-- 1. GLOBAL IP MANAGEMENT
-- ============================================

-- Global IP Reputation Database
CREATE TABLE IF NOT EXISTS global_ip_reputation (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip VARCHAR(45) UNIQUE NOT NULL,
  
  -- Reputation Score (0-100, lower is better)
  reputation_score INTEGER DEFAULT 50 CHECK (reputation_score >= 0 AND reputation_score <= 100),
  
  -- Classification
  list_type VARCHAR(20) CHECK (list_type IN ('whitelist', 'graylist', 'blacklist', 'unknown')) DEFAULT 'unknown',
  
  -- Automatic classification reasons
  auto_classified BOOLEAN DEFAULT false,
  classification_reason JSONB DEFAULT '[]'::jsonb,
  /* Example:
  [
    {"reason": "high_suspicious_activity", "weight": 30, "timestamp": "2024-01-01T00:00:00Z"},
    {"reason": "failed_challenges", "weight": 20, "timestamp": "2024-01-01T01:00:00Z"}
  ]
  */
  
  -- Geographic & ISP Info
  country VARCHAR(2),
  city VARCHAR(100),
  isp VARCHAR(255),
  organization VARCHAR(255),
  is_vpn BOOLEAN DEFAULT false,
  is_proxy BOOLEAN DEFAULT false,
  is_tor BOOLEAN DEFAULT false,
  is_datacenter BOOLEAN DEFAULT false,
  
  -- Activity Stats (Across all domains)
  total_requests INTEGER DEFAULT 0,
  suspicious_requests INTEGER DEFAULT 0,
  blocked_requests INTEGER DEFAULT 0,
  spam_attempts INTEGER DEFAULT 0,
  failed_challenges INTEGER DEFAULT 0,
  
  -- Domains affected
  domains_visited TEXT[] DEFAULT ARRAY[]::TEXT[],
  first_seen_domain VARCHAR(255),
  
  -- Timestamps
  first_seen_at TIMESTAMP DEFAULT NOW(),
  last_seen_at TIMESTAMP DEFAULT NOW(),
  last_updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ban Info
  is_banned BOOLEAN DEFAULT false,
  ban_type VARCHAR(20) CHECK (ban_type IN ('permanent', 'temporary', NULL)),
  ban_expires_at TIMESTAMP,
  ban_reason TEXT,
  banned_at TIMESTAMP,
  banned_by VARCHAR(100), -- user or 'auto-system'
  
  -- Notes
  notes TEXT
);

-- Global IP Activity Log (Lightweight, aggregated)
CREATE TABLE IF NOT EXISTS global_ip_activity (
  id BIGSERIAL PRIMARY KEY,
  ip VARCHAR(45) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  
  -- Activity summary for this hour
  hour_timestamp TIMESTAMP NOT NULL, -- Rounded to hour
  
  -- Counters
  request_count INTEGER DEFAULT 1,
  suspicious_count INTEGER DEFAULT 0,
  bot_score INTEGER DEFAULT 0, -- Average bot score
  
  -- Flags
  triggered_rate_limit BOOLEAN DEFAULT false,
  triggered_rules TEXT[] DEFAULT ARRAY[]::TEXT[], -- Rule IDs that were triggered
  
  -- Created/Updated
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  UNIQUE(ip, domain, hour_timestamp)
);

-- ============================================
-- 2. GLOBAL AUTO RULES
-- ============================================

-- Global Rules (Apply to all domains unless overridden)
CREATE TABLE IF NOT EXISTS global_auto_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Rule Info
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) CHECK (rule_type IN (
    'rate_limit',        -- Requests per time window
    'path_blocking',     -- Block specific paths
    'geo_blocking',      -- Block by country/region
    'user_agent',        -- User-agent based rules
    'behavior_pattern',  -- Behavioral analysis
    'time_based',        -- Time-of-day rules
    'ip_range'           -- CIDR/IP range rules
  )),
  
  -- Rule Definition
  conditions JSONB NOT NULL,
  /* Examples:
  Rate Limit: {"window": "1m", "max_requests": 60, "action": "challenge"}
  Path Blocking: {"paths": ["/wp-admin", "/.env", "/.git"], "action": "block"}
  Geo Blocking: {"countries": ["CN", "RU"], "action": "challenge", "whitelist_ips": []}
  User-Agent: {"patterns": ["curl", "wget"], "action": "block", "exceptions": ["GoogleBot"]}
  */
  
  -- Action to take
  action VARCHAR(50) CHECK (action IN (
    'allow',
    'block',           -- HTTP 403
    'drop',            -- HTTP 444 (no response)
    'challenge',       -- JS/CAPTCHA challenge
    'rate_limit',      -- Slow down requests
    'log_only'         -- Just log, don't act
  )) NOT NULL,
  
  -- Action config
  action_config JSONB DEFAULT '{}'::jsonb,
  /* Example:
  {"response_code": 403, "message": "Access Denied", "redirect_url": null}
  */
  
  -- Priority (higher = evaluated first)
  priority INTEGER DEFAULT 0,
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  
  -- Apply to which domains
  apply_to VARCHAR(20) CHECK (apply_to IN ('all', 'specific', 'exclude')) DEFAULT 'all',
  domain_list TEXT[] DEFAULT ARRAY[]::TEXT[], -- Used when apply_to = 'specific' or 'exclude'
  
  -- Statistics
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP,
  blocked_requests INTEGER DEFAULT 0,
  challenged_requests INTEGER DEFAULT 0,
  
  -- Metadata
  description TEXT,
  created_by VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Rule Trigger Log
CREATE TABLE IF NOT EXISTS global_rule_triggers (
  id BIGSERIAL PRIMARY KEY,
  rule_id UUID REFERENCES global_auto_rules(id) ON DELETE CASCADE,
  rule_name VARCHAR(255),
  
  -- Request Info
  ip VARCHAR(45) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  path TEXT,
  user_agent TEXT,
  
  -- Action taken
  action VARCHAR(50),
  blocked BOOLEAN DEFAULT false,
  
  -- Timestamp
  triggered_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 3. GLOBAL BOT DETECTION
-- ============================================

-- Bot Pattern Database
CREATE TABLE IF NOT EXISTS global_bot_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Bot Info
  bot_name VARCHAR(255) NOT NULL,
  bot_type VARCHAR(50) CHECK (bot_type IN ('good', 'bad', 'unknown')) NOT NULL,
  category VARCHAR(100), -- 'search_engine', 'scraper', 'monitoring', 'malicious'
  
  -- Detection Patterns
  user_agent_patterns TEXT[] NOT NULL, -- Regex patterns
  ip_ranges TEXT[], -- CIDR ranges if known
  
  -- Behavior signatures
  behavior_signatures JSONB DEFAULT '{}'::jsonb,
  /* Example:
  {
    "request_rate": {"min": 10, "max": 100, "window": "1m"},
    "common_paths": ["/robots.txt", "/sitemap.xml"],
    "headers": {"accept": "text/html"}
  }
  */
  
  -- Action recommendation
  recommended_action VARCHAR(50) CHECK (recommended_action IN ('allow', 'monitor', 'challenge', 'block')),
  
  -- Metadata
  vendor VARCHAR(255), -- Google, Microsoft, Yandex, etc.
  description TEXT,
  verified BOOLEAN DEFAULT false, -- Verified by admin
  
  -- Statistics
  detection_count INTEGER DEFAULT 0,
  last_detected_at TIMESTAMP,
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Bot Detection Results (Aggregated)
CREATE TABLE IF NOT EXISTS global_bot_detections (
  id BIGSERIAL PRIMARY KEY,
  
  -- Request Info
  ip VARCHAR(45) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  user_agent TEXT,
  
  -- Detection
  is_bot BOOLEAN DEFAULT false,
  bot_name VARCHAR(255),
  bot_type VARCHAR(50), -- good, bad, unknown
  bot_score INTEGER CHECK (bot_score >= 0 AND bot_score <= 100), -- 0 = human, 100 = definitely bot
  
  -- Detection method
  detection_method VARCHAR(100), -- 'user_agent', 'behavior', 'ip_range', 'challenge_failed'
  matched_pattern_id UUID REFERENCES global_bot_patterns(id) ON DELETE SET NULL,
  
  -- Action taken
  action VARCHAR(50),
  blocked BOOLEAN DEFAULT false,
  
  -- Timestamp
  detected_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 4. GLOBAL SPAM CONTROL
-- ============================================

-- Spam Detection Patterns
CREATE TABLE IF NOT EXISTS global_spam_patterns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Pattern Info
  pattern_name VARCHAR(255) NOT NULL,
  pattern_type VARCHAR(50) CHECK (pattern_type IN (
    'keyword',         -- Spam keywords
    'email_domain',    -- Disposable email domains
    'url_pattern',     -- Malicious URL patterns
    'content_hash',    -- Known spam content hashes
    'behavior'         -- Behavioral patterns
  )) NOT NULL,
  
  -- Pattern Definition
  pattern_value TEXT NOT NULL, -- Regex or exact match
  is_regex BOOLEAN DEFAULT false,
  
  -- Severity (1-10, higher = more likely spam)
  severity INTEGER DEFAULT 5 CHECK (severity >= 1 AND severity <= 10),
  
  -- Category
  category VARCHAR(100), -- 'url_spam', 'promotional', 'malicious', 'test'
  
  -- Action
  action VARCHAR(50) CHECK (action IN ('flag', 'block', 'quarantine', 'log_only')) DEFAULT 'flag',
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  
  -- Statistics
  matches_count INTEGER DEFAULT 0,
  false_positive_count INTEGER DEFAULT 0,
  last_matched_at TIMESTAMP,
  
  -- Metadata
  description TEXT,
  source VARCHAR(100), -- 'manual', 'akismet', 'machine_learning'
  
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Spam Detection Results
CREATE TABLE IF NOT EXISTS global_spam_detections (
  id BIGSERIAL PRIMARY KEY,
  
  -- Source Info
  ip VARCHAR(45) NOT NULL,
  domain VARCHAR(255) NOT NULL,
  
  -- Submission Info
  form_type VARCHAR(100), -- 'contact', 'comment', 'registration'
  content_hash VARCHAR(64), -- SHA256 hash for duplicate detection
  
  -- Spam Score (0-100)
  spam_score INTEGER CHECK (spam_score >= 0 AND spam_score <= 100),
  
  -- Detection Details
  matched_patterns JSONB DEFAULT '[]'::jsonb,
  /* Example:
  [
    {"pattern_id": "uuid", "pattern_name": "viagra_keyword", "severity": 8},
    {"pattern_id": "uuid", "pattern_name": "disposable_email", "severity": 6}
  ]
  */
  
  -- Action taken
  action VARCHAR(50),
  blocked BOOLEAN DEFAULT false,
  
  -- Email & Content Analysis
  email VARCHAR(255),
  email_is_disposable BOOLEAN DEFAULT false,
  phone VARCHAR(50),
  contains_urls BOOLEAN DEFAULT false,
  url_count INTEGER DEFAULT 0,
  
  -- Submission data (limited for privacy)
  submission_data JSONB, -- Store minimal data for analysis
  
  -- Timestamp
  detected_at TIMESTAMP DEFAULT NOW()
);

-- Disposable Email Domains List
CREATE TABLE IF NOT EXISTS disposable_email_domains (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(255) UNIQUE NOT NULL,
  added_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 5. GLOBAL ANALYTICS & STATISTICS
-- ============================================

-- Global Analytics Summary (Hourly rollup)
CREATE TABLE IF NOT EXISTS global_analytics_hourly (
  id BIGSERIAL PRIMARY KEY,
  
  -- Time window
  hour_timestamp TIMESTAMP NOT NULL,
  
  -- Request stats
  total_requests INTEGER DEFAULT 0,
  unique_ips INTEGER DEFAULT 0,
  
  -- Geographic distribution
  top_countries JSONB DEFAULT '[]'::jsonb, -- [{"country": "US", "count": 1234}, ...]
  
  -- Detection stats
  bot_requests INTEGER DEFAULT 0,
  spam_attempts INTEGER DEFAULT 0,
  suspicious_requests INTEGER DEFAULT 0,
  
  -- Action stats
  blocked_requests INTEGER DEFAULT 0,
  challenged_requests INTEGER DEFAULT 0,
  
  -- Performance
  avg_response_time INTEGER, -- milliseconds
  
  -- Top domains
  top_domains JSONB DEFAULT '[]'::jsonb, -- [{"domain": "example.com", "requests": 5678}, ...]
  
  UNIQUE(hour_timestamp)
);

-- Security Events Timeline
CREATE TABLE IF NOT EXISTS global_security_events (
  id BIGSERIAL PRIMARY KEY,
  
  -- Event Info
  event_type VARCHAR(50) CHECK (event_type IN (
    'mass_attack',        -- Coordinated attack detected
    'ddos_attempt',       -- DDoS pattern detected
    'brute_force',        -- Brute force attempt
    'sql_injection',      -- SQLi attempt detected
    'xss_attempt',        -- XSS attempt detected
    'suspicious_spike',   -- Unusual traffic spike
    'new_bot_detected',   -- New bot pattern found
    'rate_limit_exceeded' -- Rate limit violation
  )) NOT NULL,
  
  severity VARCHAR(20) CHECK (severity IN ('low', 'medium', 'high', 'critical')) NOT NULL,
  
  -- Affected Resources
  affected_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  involved_ips TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Event Details
  event_data JSONB DEFAULT '{}'::jsonb,
  /* Example:
  {
    "attack_vector": "wp-admin brute force",
    "request_count": 1500,
    "time_window": "5 minutes",
    "countries": ["CN", "RU"],
    "auto_mitigated": true
  }
  */
  
  -- Response
  auto_mitigated BOOLEAN DEFAULT false,
  mitigation_action TEXT,
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('detected', 'investigating', 'mitigated', 'false_positive')) DEFAULT 'detected',
  
  -- Timestamps
  detected_at TIMESTAMP DEFAULT NOW(),
  resolved_at TIMESTAMP
);

-- ============================================
-- 6. SYSTEM SETTINGS
-- ============================================

-- Global System Configuration
CREATE TABLE IF NOT EXISTS global_system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Setting Key-Value
  setting_key VARCHAR(255) UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  setting_type VARCHAR(50) CHECK (setting_type IN ('string', 'number', 'boolean', 'json', 'array')),
  
  -- Metadata
  description TEXT,
  category VARCHAR(100), -- 'nginx', 'database', 'redis', 'performance', 'security'
  
  -- Validation
  validation_rules JSONB, -- Min/max, regex, allowed values, etc.
  
  -- Status
  is_sensitive BOOLEAN DEFAULT false, -- Sensitive data like passwords
  requires_restart BOOLEAN DEFAULT false, -- Requires system restart to apply
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  updated_by VARCHAR(100)
);

-- ============================================
-- 7. USER MANAGEMENT
-- ============================================

-- Users table
CREATE TABLE IF NOT EXISTS system_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User Info
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  
  -- Role & Permissions
  role VARCHAR(50) CHECK (role IN ('admin', 'manager', 'viewer')) NOT NULL,
  permissions JSONB DEFAULT '{}'::jsonb,
  /* Example:
  {
    "can_manage_users": true,
    "can_modify_rules": true,
    "can_view_analytics": true,
    "can_manage_domains": ["example.com", "test.com"] // Empty array = all domains
  }
  */
  
  -- Status
  status VARCHAR(20) CHECK (status IN ('active', 'inactive', 'suspended')) DEFAULT 'active',
  
  -- Domain Access (Empty = all domains)
  accessible_domains TEXT[] DEFAULT ARRAY[]::TEXT[],
  
  -- Session
  last_login_at TIMESTAMP,
  last_login_ip VARCHAR(45),
  
  -- Security
  failed_login_attempts INTEGER DEFAULT 0,
  locked_until TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- 8. INDEXES FOR PERFORMANCE
-- ============================================

-- IP Reputation
CREATE INDEX idx_global_ip_reputation_ip ON global_ip_reputation(ip);
CREATE INDEX idx_global_ip_reputation_list_type ON global_ip_reputation(list_type);
CREATE INDEX idx_global_ip_reputation_score ON global_ip_reputation(reputation_score);
CREATE INDEX idx_global_ip_reputation_country ON global_ip_reputation(country);
CREATE INDEX idx_global_ip_reputation_is_banned ON global_ip_reputation(is_banned);

-- IP Activity
CREATE INDEX idx_global_ip_activity_ip ON global_ip_activity(ip);
CREATE INDEX idx_global_ip_activity_domain ON global_ip_activity(domain);
CREATE INDEX idx_global_ip_activity_hour ON global_ip_activity(hour_timestamp);

-- Rules
CREATE INDEX idx_global_auto_rules_enabled ON global_auto_rules(enabled);
CREATE INDEX idx_global_auto_rules_type ON global_auto_rules(rule_type);
CREATE INDEX idx_global_auto_rules_priority ON global_auto_rules(priority DESC);

-- Rule Triggers
CREATE INDEX idx_global_rule_triggers_rule_id ON global_rule_triggers(rule_id);
CREATE INDEX idx_global_rule_triggers_ip ON global_rule_triggers(ip);
CREATE INDEX idx_global_rule_triggers_triggered_at ON global_rule_triggers(triggered_at);

-- Bot Patterns
CREATE INDEX idx_global_bot_patterns_type ON global_bot_patterns(bot_type);
CREATE INDEX idx_global_bot_patterns_enabled ON global_bot_patterns(enabled);

-- Bot Detections
CREATE INDEX idx_global_bot_detections_ip ON global_bot_detections(ip);
CREATE INDEX idx_global_bot_detections_domain ON global_bot_detections(domain);
CREATE INDEX idx_global_bot_detections_detected_at ON global_bot_detections(detected_at);

-- Spam Patterns
CREATE INDEX idx_global_spam_patterns_type ON global_spam_patterns(pattern_type);
CREATE INDEX idx_global_spam_patterns_enabled ON global_spam_patterns(enabled);

-- Spam Detections
CREATE INDEX idx_global_spam_detections_ip ON global_spam_detections(ip);
CREATE INDEX idx_global_spam_detections_domain ON global_spam_detections(domain);
CREATE INDEX idx_global_spam_detections_content_hash ON global_spam_detections(content_hash);
CREATE INDEX idx_global_spam_detections_detected_at ON global_spam_detections(detected_at);

-- Analytics
CREATE INDEX idx_global_analytics_hour ON global_analytics_hourly(hour_timestamp);

-- Security Events
CREATE INDEX idx_global_security_events_type ON global_security_events(event_type);
CREATE INDEX idx_global_security_events_severity ON global_security_events(severity);
CREATE INDEX idx_global_security_events_detected_at ON global_security_events(detected_at);

-- System Settings
CREATE INDEX idx_global_system_settings_category ON global_system_settings(category);

-- Users
CREATE INDEX idx_system_users_email ON system_users(email);
CREATE INDEX idx_system_users_role ON system_users(role);
CREATE INDEX idx_system_users_status ON system_users(status);

-- ============================================
-- 9. INITIAL DATA
-- ============================================

-- Insert default good bot patterns
INSERT INTO global_bot_patterns (bot_name, bot_type, category, user_agent_patterns, recommended_action, vendor, verified) VALUES
('Googlebot', 'good', 'search_engine', ARRAY['Googlebot', 'Googlebot-Image', 'Googlebot-News'], 'allow', 'Google', true),
('Bingbot', 'good', 'search_engine', ARRAY['bingbot', 'msnbot'], 'allow', 'Microsoft', true),
('Yandex Bot', 'good', 'search_engine', ARRAY['YandexBot', 'YandexImages'], 'allow', 'Yandex', true),
('DuckDuckBot', 'good', 'search_engine', ARRAY['DuckDuckBot'], 'allow', 'DuckDuckGo', true),
('Baiduspider', 'good', 'search_engine', ARRAY['Baiduspider'], 'allow', 'Baidu', true)
ON CONFLICT DO NOTHING;

-- Insert common bad bot patterns
INSERT INTO global_bot_patterns (bot_name, bot_type, category, user_agent_patterns, recommended_action, verified) VALUES
('Generic Scrapers', 'bad', 'scraper', ARRAY['curl', 'wget', 'python-requests', 'scrapy'], 'block', true),
('Headless Chrome', 'bad', 'automation', ARRAY['HeadlessChrome', 'Chrome-Lighthouse'], 'challenge', true),
('Selenium', 'bad', 'automation', ARRAY['selenium', 'webdriver'], 'challenge', true),
('Malicious Bots', 'bad', 'malicious', ARRAY['masscan', 'nmap', 'zgrab'], 'block', true)
ON CONFLICT DO NOTHING;

-- Insert common spam patterns
INSERT INTO global_spam_patterns (pattern_name, pattern_type, pattern_value, is_regex, severity, category, action) VALUES
('Viagra Keywords', 'keyword', '(viagra|cialis|levitra)', true, 9, 'promotional', 'block'),
('Casino Keywords', 'keyword', '(casino|poker|gambling)', true, 7, 'promotional', 'flag'),
('URL Shorteners', 'url_pattern', '(bit\.ly|tinyurl|goo\.gl)', true, 5, 'url_spam', 'flag'),
('Excessive URLs', 'behavior', '{"max_urls_in_message": 3}', false, 6, 'url_spam', 'flag')
ON CONFLICT DO NOTHING;

-- Insert default system settings
INSERT INTO global_system_settings (setting_key, setting_value, setting_type, category, description) VALUES
('nginx.log_path', '"/var/log/nginx/access.log"', 'string', 'nginx', 'Path to nginx access log'),
('nginx.log_retention_days', '90', 'number', 'nginx', 'Days to retain traffic logs'),
('redis.host', '"localhost"', 'string', 'redis', 'Redis server host'),
('redis.port', '6379', 'number', 'redis', 'Redis server port'),
('security.auto_blacklist_threshold', '70', 'number', 'security', 'Reputation score threshold for auto-blacklist'),
('security.rate_limit_default', '{"window": "1m", "max_requests": 60}', 'json', 'security', 'Default rate limit'),
('performance.max_domains', '100', 'number', 'performance', 'Maximum number of domains'),
('performance.auto_refresh_interval', '30', 'number', 'performance', 'Dashboard auto-refresh interval (seconds)')
ON CONFLICT (setting_key) DO NOTHING;

-- ============================================
-- 10. COMMENTS
-- ============================================

COMMENT ON TABLE global_ip_reputation IS 'Centralized IP reputation database for all domains';
COMMENT ON TABLE global_auto_rules IS 'Global security rules applied across all domains';
COMMENT ON TABLE global_bot_patterns IS 'Known bot patterns for detection';
COMMENT ON TABLE global_spam_patterns IS 'Spam detection patterns and keywords';
COMMENT ON TABLE global_analytics_hourly IS 'Hourly aggregated analytics across all domains';
COMMENT ON TABLE global_security_events IS 'Security event timeline and alerts';
COMMENT ON TABLE system_users IS 'System users with role-based access control';
