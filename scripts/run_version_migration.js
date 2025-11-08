#!/usr/bin/env node

/**
 * Script to run Version System database migrations
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Database configuration (same as in lib/db.ts)
const pool = new Pool({
  host: 'postgres.dtekai.com',
  port: 5432,
  database: 'dtektracking',
  user: 'postgres',
  password: 'Dtek2024!',
  ssl: false
});

async function runMigration() {
  const client = await pool.connect();
  
  try {
    console.log('🔌 Connected to database: dtektracking');
    console.log('📂 Reading migration file...');
    
    const migrationPath = path.join(__dirname, '../database/migrations/create_version_system_tables.sql');
    const sql = fs.readFileSync(migrationPath, 'utf8');
    
    console.log('🚀 Running migration...\n');
    
    const result = await client.query(sql);
    
    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Results:', result);
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Details:', error);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
