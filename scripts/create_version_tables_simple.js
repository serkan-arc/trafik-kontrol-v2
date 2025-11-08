#!/usr/bin/env node

/**
 * Create Version System tables using existing db module
 */

const path = require('path');

// Use the same db connection as the app
async function createTables() {
  try {
    // Import the db module (ES Module style, but we'll use require)
    const dbPath = path.join(__dirname, '../lib/db.ts');
    
    console.log('Using API endpoint to create tables...');
    console.log('Making HTTP POST request to /api/admin/migrations/version-system');
    
    // Alternative: Just output the SQL for manual execution
    console.log('\n📋 MANUAL SQL EXECUTION REQUIRED:\n');
    console.log('Copy this SQL and run it directly in your database admin panel:');
    console.log('='.repeat(80));
    
    const sql = `
-- Create version_settings table
CREATE TABLE IF NOT EXISTS version_settings (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES deployed_sites(id) ON DELETE CASCADE,
    is_enabled BOOLEAN DEFAULT false,
    version_sequence JSONB DEFAULT '["clean", "gray", "aggressive"]'::jsonb,
    version_config JSONB DEFAULT '{}'::jsonb,
    end_action VARCHAR(50) DEFAULT 'block',
    end_action_value TEXT,
    advanced_filters JSONB DEFAULT '{}'::jsonb,
    bypass_ips TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id)
);

-- Create ip_version_history table
CREATE TABLE IF NOT EXISTS ip_version_history (
    id SERIAL PRIMARY KEY,
    ip VARCHAR(45) NOT NULL,
    site_id INTEGER REFERENCES deployed_sites(id) ON DELETE CASCADE,
    current_version VARCHAR(50) NOT NULL DEFAULT 'clean',
    version_started_at TIMESTAMP NOT NULL DEFAULT NOW(),
    previous_version VARCHAR(50),
    progression_reason VARCHAR(255),
    views_count INTEGER DEFAULT 0,
    duration_minutes INTEGER DEFAULT 0,
    is_bypassed BOOLEAN DEFAULT false,
    bypass_expires_at TIMESTAMP,
    is_manually_set BOOLEAN DEFAULT false,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Create version_statistics table
CREATE TABLE IF NOT EXISTS version_statistics (
    id SERIAL PRIMARY KEY,
    site_id INTEGER REFERENCES deployed_sites(id) ON DELETE CASCADE,
    stat_date DATE NOT NULL DEFAULT CURRENT_DATE,
    clean_count INTEGER DEFAULT 0,
    gray_count INTEGER DEFAULT 0,
    aggressive_count INTEGER DEFAULT 0,
    forbidden_count INTEGER DEFAULT 0,
    clean_to_gray INTEGER DEFAULT 0,
    gray_to_aggressive INTEGER DEFAULT 0,
    aggressive_to_forbidden INTEGER DEFAULT 0,
    progression_reasons JSONB DEFAULT '{}'::jsonb,
    avg_time_in_clean INTEGER DEFAULT 0,
    avg_time_in_gray INTEGER DEFAULT 0,
    avg_time_in_aggressive INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT unique_site_date UNIQUE(site_id, stat_date)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_version_settings_site ON version_settings(site_id);
CREATE INDEX IF NOT EXISTS idx_ip_version_ip ON ip_version_history(ip);
CREATE INDEX IF NOT EXISTS idx_ip_version_site ON ip_version_history(site_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_version_unique ON ip_version_history(ip, site_id);
CREATE INDEX IF NOT EXISTS idx_version_stats_site ON version_statistics(site_id);

-- Insert default global settings
INSERT INTO version_settings (site_id, is_enabled) 
VALUES (NULL, false) 
ON CONFLICT DO NOTHING;

SELECT 'Version System tables created!' AS status;
`;
    
    console.log(sql);
    console.log('='.repeat(80));
    console.log('\n✅ Copy the above SQL and execute it in your database admin panel');
    console.log('   Or use: psql -h postgres.dtekai.com -U postgres -d dtektracking');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

createTables();
