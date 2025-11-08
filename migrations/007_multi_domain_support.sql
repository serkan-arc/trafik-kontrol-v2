-- ============================================
-- MULTI-DOMAIN TRAFFIC CONTROL SUPPORT
-- Migration: 007 - Multi Domain Architecture
-- Created: 2025-11-05
-- Description: Adds multi-domain support to traffic control system
-- ============================================

-- 1. Master Domains Table (Tüm domainlerin listesi)
CREATE TABLE IF NOT EXISTS master_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain VARCHAR(255) UNIQUE NOT NULL,
  
  -- Database Info
  db_schema VARCHAR(255) NOT NULL, -- dtektracking_com gibi
  tables_created BOOLEAN DEFAULT false,
  
  -- Traffic Settings (Domain'e özel ayarlar)
  traffic_settings JSONB DEFAULT '{
    "bot_detection": {
      "enabled": true,
      "mode": "balanced",
      "block_suspicious": false
    },
    "spam_control": {
      "enabled": true,
      "max_submissions_per_hour": 10,
      "duplicate_check": true
    },
    "ip_rules": {
      "auto_blacklist_threshold": 70,
      "whitelist": [],
      "blacklist": []
    }
  }'::jsonb,
  
  -- Statistics Summary
  total_visits INTEGER DEFAULT 0,
  total_bots_blocked INTEGER DEFAULT 0,
  total_spam_blocked INTEGER DEFAULT 0,
  last_traffic_at TIMESTAMP,
  
  -- Status
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'paused', 'deleted')),
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 2. Master Traffic Log (Tüm domainlerin trafiği - özet)
CREATE TABLE IF NOT EXISTS master_traffic_log (
  id BIGSERIAL PRIMARY KEY,
  domain VARCHAR(255) NOT NULL,
  domain_id UUID REFERENCES master_domains(id) ON DELETE CASCADE,
  
  -- Traffic Info
  ip VARCHAR(45) NOT NULL,
  country VARCHAR(2),
  city VARCHAR(100),
  
  -- Request Info
  path TEXT,
  method VARCHAR(10),
  status_code INTEGER,
  
  -- Detection
  is_bot BOOLEAN DEFAULT false,
  is_spam BOOLEAN DEFAULT false,
  action_taken VARCHAR(50), -- allowed, blocked, challenged
  
  -- Timestamp
  timestamp TIMESTAMP DEFAULT NOW()
);

-- 3. Domain Traffic Stats (Günlük istatistikler)
CREATE TABLE IF NOT EXISTS domain_traffic_stats (
  id BIGSERIAL PRIMARY KEY,
  domain_id UUID REFERENCES master_domains(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  
  -- Date
  date DATE NOT NULL,
  hour INTEGER, -- 0-23 for hourly stats
  
  -- Metrics
  total_requests INTEGER DEFAULT 0,
  unique_visitors INTEGER DEFAULT 0,
  bot_requests INTEGER DEFAULT 0,
  spam_attempts INTEGER DEFAULT 0,
  blocked_requests INTEGER DEFAULT 0,
  
  -- Performance
  avg_response_time INTEGER, -- milliseconds
  error_count INTEGER DEFAULT 0,
  
  -- Unique constraint
  UNIQUE(domain_id, date, hour)
);

-- 4. Domain Auto Rules (Domain'e özel kurallar)
CREATE TABLE IF NOT EXISTS domain_auto_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain_id UUID REFERENCES master_domains(id) ON DELETE CASCADE,
  domain VARCHAR(255) NOT NULL,
  
  -- Rule Definition
  rule_name VARCHAR(255) NOT NULL,
  rule_type VARCHAR(50) CHECK (rule_type IN ('ip_pattern', 'user_agent', 'geo', 'behavior', 'custom')),
  
  -- Conditions (JSON)
  conditions JSONB NOT NULL,
  /* Example:
  {
    "ip_pattern": "^192\\.168\\.",
    "country": ["RU", "CN"],
    "requests_per_minute": 100
  }
  */
  
  -- Action
  action VARCHAR(50) CHECK (action IN ('whitelist', 'graylist', 'blacklist', 'challenge', 'log_only')),
  priority INTEGER DEFAULT 0,
  
  -- Status
  enabled BOOLEAN DEFAULT true,
  triggered_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- 5. Function to create domain-specific tables
CREATE OR REPLACE FUNCTION create_domain_tables(p_domain VARCHAR, p_schema VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Create schema for domain
  EXECUTE format('CREATE SCHEMA IF NOT EXISTS %I', p_schema);
  
  -- Create ip_tracking table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.ip_tracking (
      LIKE public.ip_tracking INCLUDING ALL
    )', p_schema);
  
  -- Create ip_visit_history table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.ip_visit_history (
      LIKE public.ip_visit_history INCLUDING ALL
    )', p_schema);
  
  -- Create form_submission_history table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.form_submission_history (
      LIKE public.form_submission_history INCLUDING ALL
    )', p_schema);
  
  -- Create bot_detection_log table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.bot_detection_log (
      id BIGSERIAL PRIMARY KEY,
      ip VARCHAR(45) NOT NULL,
      detection_type VARCHAR(50),
      confidence_score INTEGER,
      action_taken VARCHAR(50),
      details JSONB,
      detected_at TIMESTAMP DEFAULT NOW()
    )', p_schema);
  
  -- Create spam_detection_log table
  EXECUTE format('
    CREATE TABLE IF NOT EXISTS %I.spam_detection_log (
      id BIGSERIAL PRIMARY KEY,
      ip VARCHAR(45) NOT NULL,
      form_data_hash VARCHAR(64),
      spam_score INTEGER,
      spam_reasons JSONB,
      action_taken VARCHAR(50),
      detected_at TIMESTAMP DEFAULT NOW()
    )', p_schema);
  
  -- Update master_domains table
  UPDATE master_domains 
  SET tables_created = true, updated_at = NOW()
  WHERE domain = p_domain;
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error creating tables for domain %: %', p_domain, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 6. Function to delete domain tables
CREATE OR REPLACE FUNCTION delete_domain_tables(p_schema VARCHAR)
RETURNS BOOLEAN AS $$
BEGIN
  -- Drop schema cascade (deletes all tables in it)
  EXECUTE format('DROP SCHEMA IF EXISTS %I CASCADE', p_schema);
  
  RETURN true;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Error deleting schema %: %', p_schema, SQLERRM;
    RETURN false;
END;
$$ LANGUAGE plpgsql;

-- 7. Indexes
CREATE INDEX idx_master_domains_status ON master_domains(status);
CREATE INDEX idx_master_domains_domain ON master_domains(domain);

CREATE INDEX idx_master_traffic_log_domain ON master_traffic_log(domain);
CREATE INDEX idx_master_traffic_log_timestamp ON master_traffic_log(timestamp);
CREATE INDEX idx_master_traffic_log_ip ON master_traffic_log(ip);

CREATE INDEX idx_domain_traffic_stats_domain_id ON domain_traffic_stats(domain_id);
CREATE INDEX idx_domain_traffic_stats_date ON domain_traffic_stats(date);

CREATE INDEX idx_domain_auto_rules_domain_id ON domain_auto_rules(domain_id);
CREATE INDEX idx_domain_auto_rules_enabled ON domain_auto_rules(enabled);

-- 8. Initial data - Add existing domain if any
-- INSERT INTO master_domains (domain, db_schema) 
-- VALUES ('dtektracking.com', 'dtektracking_com')
-- ON CONFLICT DO NOTHING;

COMMENT ON TABLE master_domains IS 'Master table for all domains in traffic control system';
COMMENT ON TABLE master_traffic_log IS 'Aggregated traffic log for all domains';
COMMENT ON TABLE domain_traffic_stats IS 'Daily and hourly statistics per domain';
COMMENT ON TABLE domain_auto_rules IS 'Domain-specific traffic rules';
COMMENT ON FUNCTION create_domain_tables IS 'Creates all necessary tables for a new domain';
COMMENT ON FUNCTION delete_domain_tables IS 'Safely removes all tables for a domain';