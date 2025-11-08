-- Migration: Add Performance Indexes
-- Date: 2024-11-07
-- Description: Add indexes for better query performance

-- Sites table indexes
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_sites_active ON sites(is_active);
CREATE INDEX IF NOT EXISTS idx_sites_created_at ON sites(created_at);

-- Traffic Data table indexes
CREATE INDEX IF NOT EXISTS idx_traffic_data_site_id ON traffic_data(site_id);
CREATE INDEX IF NOT EXISTS idx_traffic_data_timestamp ON traffic_data(timestamp);
CREATE INDEX IF NOT EXISTS idx_traffic_data_ip_address ON traffic_data(ip_address);
CREATE INDEX IF NOT EXISTS idx_traffic_data_is_bot ON traffic_data(is_bot);
CREATE INDEX IF NOT EXISTS idx_traffic_data_composite ON traffic_data(site_id, timestamp DESC);

-- Bot Detection table indexes
CREATE INDEX IF NOT EXISTS idx_bot_detection_site_id ON bot_detection(site_id);
CREATE INDEX IF NOT EXISTS idx_bot_detection_detected_at ON bot_detection(detected_at);
CREATE INDEX IF NOT EXISTS idx_bot_detection_ip_address ON bot_detection(ip_address);
CREATE INDEX IF NOT EXISTS idx_bot_detection_bot_type ON bot_detection(bot_type);

-- Cache table indexes
CREATE INDEX IF NOT EXISTS idx_cache_key ON cache(key);
CREATE INDEX IF NOT EXISTS idx_cache_expires_at ON cache(expires_at);

-- Users table indexes (for authentication)
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Sessions table indexes (if exists)
CREATE TABLE IF NOT EXISTS sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- API Rate Limiting table
CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  ip_address VARCHAR(45) NOT NULL,
  endpoint VARCHAR(255) NOT NULL,
  request_count INTEGER DEFAULT 0,
  window_start TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  window_end TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_ip ON rate_limits(ip_address);
CREATE INDEX IF NOT EXISTS idx_rate_limits_endpoint ON rate_limits(endpoint);
CREATE INDEX IF NOT EXISTS idx_rate_limits_window ON rate_limits(window_start, window_end);

-- Audit Logs table for security
CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(255),
  ip_address VARCHAR(45),
  user_agent TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- Performance monitoring views
CREATE OR REPLACE VIEW v_traffic_summary AS
SELECT 
  s.domain,
  COUNT(t.id) as total_visits,
  COUNT(DISTINCT t.ip_address) as unique_visitors,
  SUM(CASE WHEN t.is_bot THEN 1 ELSE 0 END) as bot_visits,
  DATE(t.timestamp) as visit_date
FROM sites s
LEFT JOIN traffic_data t ON s.id = t.site_id
WHERE t.timestamp >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY s.domain, DATE(t.timestamp);

-- Create function for automatic cache cleanup
CREATE OR REPLACE FUNCTION cleanup_expired_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM cache WHERE expires_at < NOW();
  DELETE FROM sessions WHERE expires_at < NOW();
  DELETE FROM rate_limits WHERE window_end < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Create scheduled job for cache cleanup (requires pg_cron extension)
-- Uncomment if pg_cron is available:
-- SELECT cron.schedule('cleanup-cache', '0 * * * *', 'SELECT cleanup_expired_cache();');