-- Station 2: Website Deployment System - Database Schema
-- Migration: 006_create_sites_tables.sql
-- Created: 2025-11-02

-- Sites table: Core site configuration and metadata
CREATE TABLE IF NOT EXISTS sites (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  domain VARCHAR(255) UNIQUE NOT NULL,
  port INTEGER NOT NULL UNIQUE,
  version_type VARCHAR(20) DEFAULT 'clean' CHECK (version_type IN ('clean', 'gray', 'aggressive')),
  status VARCHAR(20) DEFAULT 'stopped' CHECK (status IN ('stopped', 'running', 'error', 'deploying')),
  pm2_id INTEGER,
  pm2_name VARCHAR(255),
  ssl_enabled BOOLEAN DEFAULT false,
  ssl_expires_at TIMESTAMP,
  nginx_config_path TEXT,
  files_path TEXT,
  site_type VARCHAR(50) DEFAULT 'static' CHECK (site_type IN ('static', 'nextjs', 'node', 'python')),
  description TEXT,
  created_by VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Site versions table: Version management for A/B testing and rollbacks
CREATE TABLE IF NOT EXISTS site_versions (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  version_name VARCHAR(50) NOT NULL,
  version_path TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false,
  deployed_at TIMESTAMP DEFAULT NOW(),
  deployed_by VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(site_id, version_name)
);

-- Site logs table: Deployment and operational logs
CREATE TABLE IF NOT EXISTS site_logs (
  id SERIAL PRIMARY KEY,
  site_id INTEGER REFERENCES sites(id) ON DELETE CASCADE,
  log_type VARCHAR(50) NOT NULL CHECK (log_type IN ('deployment', 'ssl', 'nginx', 'pm2', 'error', 'info')),
  message TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sites_status ON sites(status);
CREATE INDEX IF NOT EXISTS idx_sites_domain ON sites(domain);
CREATE INDEX IF NOT EXISTS idx_site_versions_site_id ON site_versions(site_id);
CREATE INDEX IF NOT EXISTS idx_site_versions_active ON site_versions(site_id, is_active);
CREATE INDEX IF NOT EXISTS idx_site_logs_site_id ON site_logs(site_id);
CREATE INDEX IF NOT EXISTS idx_site_logs_created_at ON site_logs(created_at DESC);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_sites_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sites_updated_at_trigger
BEFORE UPDATE ON sites
FOR EACH ROW
EXECUTE FUNCTION update_sites_updated_at();

-- Insert default data for testing
INSERT INTO sites (name, domain, port, version_type, status, site_type, description, created_by) 
VALUES 
  ('Traffic Control System', 'garantor360.com', 3015, 'clean', 'running', 'nextjs', 'Main traffic control and analytics dashboard', 'system')
ON CONFLICT (domain) DO NOTHING;

-- Comments for documentation
COMMENT ON TABLE sites IS 'Core table for website deployment management';
COMMENT ON TABLE site_versions IS 'Version control for deployed sites enabling A/B testing and rollbacks';
COMMENT ON TABLE site_logs IS 'Operational and deployment logs for sites';
COMMENT ON COLUMN sites.version_type IS 'Routing strategy: clean (standard), gray (A/B testing), aggressive (conversion optimized)';
COMMENT ON COLUMN sites.status IS 'Current operational status of the site';
COMMENT ON COLUMN sites.site_type IS 'Type of site: static (HTML/CSS/JS), nextjs (Next.js app), node (Node.js app), python (Python app)';
