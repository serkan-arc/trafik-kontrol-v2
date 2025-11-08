import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// Simplified migration - just create the essential table if not exists
export async function POST() {
  try {
    console.log('Starting simplified migration...')
    
    // Create master_domains table if not exists
    await db.query(`
      CREATE TABLE IF NOT EXISTS master_domains (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        domain VARCHAR(255) NOT NULL UNIQUE,
        db_schema VARCHAR(255) NOT NULL,
        status VARCHAR(50) DEFAULT 'active',
        traffic_settings JSONB DEFAULT '{}',
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      )
    `)
    
    console.log('Master domains table created/verified')
    
    // Create indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_master_domains_domain ON master_domains(domain)
    `).catch(err => console.log('Index might already exist:', err.message))
    
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_master_domains_status ON master_domains(status)
    `).catch(err => console.log('Index might already exist:', err.message))
    
    // Create the function for creating domain tables
    await db.query(`
      CREATE OR REPLACE FUNCTION create_domain_tables(domain_name TEXT)
      RETURNS void AS $$
      DECLARE
        schema_name TEXT;
      BEGIN
        -- Generate schema name from domain
        schema_name := REPLACE(domain_name, '.', '_');
        
        -- Create IP addresses table
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          ip_address INET NOT NULL UNIQUE,
          country VARCHAR(100),
          country_code VARCHAR(10),
          city VARCHAR(100),
          list_type VARCHAR(20) DEFAULT ''unknown'',
          risk_score INTEGER DEFAULT 0,
          first_seen TIMESTAMP DEFAULT NOW(),
          last_seen TIMESTAMP DEFAULT NOW(),
          notes TEXT
        )', schema_name || '_ip_addresses');
        
        -- Create traffic logs table
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          ip_address INET NOT NULL,
          path TEXT,
          method VARCHAR(10),
          status_code INTEGER,
          user_agent TEXT,
          referer TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_traffic_logs');
        
        -- Create bot patterns table (domain-specific)
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          bot_name VARCHAR(255) NOT NULL,
          bot_type VARCHAR(50) CHECK (bot_type IN (''good'', ''bad'', ''unknown'')),
          category VARCHAR(100),
          user_agent_patterns TEXT[],
          ip_ranges TEXT[],
          behavior_signatures JSONB DEFAULT ''{}'',
          recommended_action VARCHAR(50),
          vendor VARCHAR(255),
          description TEXT,
          verified BOOLEAN DEFAULT false,
          detection_count INTEGER DEFAULT 0,
          last_detected_at TIMESTAMP,
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_bot_patterns');
        
        -- Create bot detections table
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          ip_address INET NOT NULL,
          user_agent TEXT,
          bot_name VARCHAR(255),
          bot_type VARCHAR(100),
          detection_method VARCHAR(100),
          is_fake BOOLEAN DEFAULT false,
          confidence_score DECIMAL(3,2),
          action_taken VARCHAR(50),
          blocked BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_bot_detections');
        
        -- Create spam patterns table (domain-specific)
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          pattern_name VARCHAR(255) NOT NULL,
          pattern_type VARCHAR(50),
          pattern_value TEXT,
          is_regex BOOLEAN DEFAULT false,
          severity INTEGER DEFAULT 5,
          category VARCHAR(100),
          action VARCHAR(50) DEFAULT ''flag'',
          enabled BOOLEAN DEFAULT true,
          matches_count INTEGER DEFAULT 0,
          false_positive_count INTEGER DEFAULT 0,
          last_matched_at TIMESTAMP,
          description TEXT,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_spam_patterns');
        
        -- Create spam detections table
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          ip_address INET NOT NULL,
          form_type VARCHAR(100),
          spam_score INTEGER,
          matched_patterns JSONB DEFAULT ''[]'',
          action VARCHAR(50),
          blocked BOOLEAN DEFAULT false,
          email VARCHAR(255),
          email_is_disposable BOOLEAN DEFAULT false,
          phone VARCHAR(50),
          contains_urls BOOLEAN DEFAULT false,
          url_count INTEGER DEFAULT 0,
          content TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_spam_detections');
        
        -- Create traffic rules table
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          rule_name VARCHAR(255) NOT NULL,
          rule_type VARCHAR(50),
          conditions JSONB DEFAULT ''[]'',
          actions JSONB DEFAULT ''[]'',
          priority INTEGER DEFAULT 0,
          is_active BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_traffic_rules');
        
        -- Create form submissions table
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          ip_address INET NOT NULL,
          form_data JSONB DEFAULT ''{}'',
          is_spam BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_form_submissions');
        
        -- Create analytics hourly table (domain-specific)
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id BIGSERIAL PRIMARY KEY,
          hour_timestamp TIMESTAMP NOT NULL,
          total_requests INTEGER DEFAULT 0,
          unique_ips INTEGER DEFAULT 0,
          bot_requests INTEGER DEFAULT 0,
          spam_attempts INTEGER DEFAULT 0,
          blocked_requests INTEGER DEFAULT 0,
          avg_response_time DECIMAL(10,2),
          top_paths JSONB DEFAULT ''[]'',
          top_user_agents JSONB DEFAULT ''[]'',
          geographic_distribution JSONB DEFAULT ''{}'',
          created_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_analytics_hourly');
        
        -- Create rate limit rules table (domain-specific)
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          rule_name VARCHAR(255) NOT NULL,
          path_pattern TEXT,
          method VARCHAR(10),
          rate_limit INTEGER NOT NULL,
          window_seconds INTEGER NOT NULL,
          burst_limit INTEGER,
          action VARCHAR(50) DEFAULT ''throttle'',
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_rate_limit_rules');
        
        -- Create geoip rules table (domain-specific)
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          rule_name VARCHAR(255) NOT NULL,
          rule_type VARCHAR(50), -- allow, block, challenge
          countries VARCHAR(2)[],
          regions TEXT[],
          cities TEXT[],
          is_vpn_blocked BOOLEAN DEFAULT false,
          is_proxy_blocked BOOLEAN DEFAULT false,
          is_tor_blocked BOOLEAN DEFAULT false,
          action VARCHAR(50) DEFAULT ''monitor'',
          enabled BOOLEAN DEFAULT true,
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_geoip_rules');
        
        -- Create traffic settings table
        EXECUTE format('CREATE TABLE IF NOT EXISTS %I (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          setting_key VARCHAR(255) NOT NULL UNIQUE,
          setting_value JSONB DEFAULT ''{}'',
          created_at TIMESTAMP DEFAULT NOW(),
          updated_at TIMESTAMP DEFAULT NOW()
        )', schema_name || '_traffic_settings');
        
      END;
      $$ LANGUAGE plpgsql
    `)
    
    console.log('Domain table creation function created/verified')
    
    // Check if we have any test domain
    const domainCheck = await db.query('SELECT COUNT(*) as count FROM master_domains')
    
    if (domainCheck.rows[0].count === '0') {
      // Add a sample domain for testing
      await db.query(`
        INSERT INTO master_domains (domain, db_schema, status)
        VALUES ('example.com', 'example_com', 'active')
        ON CONFLICT (domain) DO NOTHING
      `)
      
      // Create tables for the sample domain
      await db.query(`SELECT create_domain_tables('example.com')`)
      
      console.log('Sample domain added')
    }
    
    return NextResponse.json({
      success: true,
      message: 'Simplified migration completed successfully'
    })
    
  } catch (error: any) {
    console.error('Simplified migration error:', error)
    return NextResponse.json({
      success: false,
      error: error.message,
      details: error.stack
    }, { status: 500 })
  }
}

// GET - Check if migration exists
export async function GET() {
  try {
    const result = await db.query(`
      SELECT COUNT(*) as count 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'master_domains'
    `)
    
    const exists = parseInt(result.rows[0]?.count || '0') > 0
    
    return NextResponse.json({
      success: true,
      migrationApplied: exists,
      tableCount: result.rows[0]?.count
    })
  } catch (error: any) {
    console.error('Check migration error:', error)
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 })
  }
}