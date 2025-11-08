/**
 * Admin API - Run Version System Database Migration
 * 
 * POST /api/admin/migrations/version-system
 * 
 * Creates the three tables needed for Version Progression System:
 * - version_settings
 * - ip_version_history
 * - version_statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    console.log('🚀 Starting Version System migration...');
    
    // Create version_settings table
    await db.query(`
      CREATE TABLE IF NOT EXISTS version_settings (
          id SERIAL PRIMARY KEY,
          site_id INTEGER REFERENCES deployed_sites(id) ON DELETE CASCADE,
          is_enabled BOOLEAN DEFAULT false,
          version_sequence JSONB DEFAULT '["clean", "gray", "aggressive"]'::jsonb,
          version_config JSONB DEFAULT '{
              "clean": {"cooldown_minutes": 1440, "max_views": 0},
              "gray": {"cooldown_minutes": 720, "max_views": 0},
              "aggressive": {"cooldown_minutes": 360, "max_views": 0}
          }'::jsonb,
          end_action VARCHAR(50) DEFAULT 'block',
          end_action_value TEXT,
          advanced_filters JSONB DEFAULT '{}'::jsonb,
          bypass_ips TEXT[],
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW(),
          created_by INTEGER REFERENCES users(id),
          updated_by INTEGER REFERENCES users(id)
      )
    `);
    console.log('✅ version_settings table created');

    // Create ip_version_history table
    await db.query(`
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
      )
    `);
    console.log('✅ ip_version_history table created');

    // Create version_statistics table
    await db.query(`
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
      )
    `);
    console.log('✅ version_statistics table created');

    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_version_settings_site ON version_settings(site_id);
      CREATE INDEX IF NOT EXISTS idx_ip_version_ip ON ip_version_history(ip);
      CREATE INDEX IF NOT EXISTS idx_ip_version_site ON ip_version_history(site_id);
      CREATE UNIQUE INDEX IF NOT EXISTS idx_ip_version_unique ON ip_version_history(ip, site_id);
      CREATE INDEX IF NOT EXISTS idx_version_stats_site ON version_statistics(site_id);
      CREATE INDEX IF NOT EXISTS idx_version_stats_date ON version_statistics(stat_date);
    `);
    console.log('✅ Indexes created');

    // Insert default global settings
    await db.query(`
      INSERT INTO version_settings (site_id, is_enabled, version_config) 
      VALUES (NULL, false, '{
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
      }'::jsonb)
      ON CONFLICT DO NOTHING
    `);
    console.log('✅ Default settings inserted');

    return NextResponse.json({
      success: true,
      message: 'Version System tables created successfully',
      tables: ['version_settings', 'ip_version_history', 'version_statistics'],
      indexes: 6,
      default_data: 'Global settings inserted (disabled by default)'
    });

  } catch (error: any) {
    console.error('❌ Migration failed:', error);
    return NextResponse.json({
      success: false,
      error: 'Migration failed',
      message: error.message,
      detail: error.detail
    }, { status: 500 });
  }
}

// GET endpoint to check if tables exist
export async function GET(request: NextRequest) {
  try {
    const checks = await Promise.all([
      db.query(`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'version_settings'
      )`),
      db.query(`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'ip_version_history'
      )`),
      db.query(`SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'version_statistics'
      )`)
    ]);

    const exists = {
      version_settings: checks[0].rows[0].exists,
      ip_version_history: checks[1].rows[0].exists,
      version_statistics: checks[2].rows[0].exists
    };

    const allExist = Object.values(exists).every(v => v === true);

    return NextResponse.json({
      success: true,
      exists,
      all_tables_exist: allExist,
      message: allExist ? 'All Version System tables exist' : 'Some tables are missing'
    });

  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: 'Check failed',
      message: error.message
    }, { status: 500 });
  }
}
