#!/usr/bin/env node

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: `.env.${process.env.NODE_ENV || 'local'}` });

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
});

// Migration tracking table
const createMigrationTable = `
CREATE TABLE IF NOT EXISTS migrations (
  id SERIAL PRIMARY KEY,
  filename VARCHAR(255) UNIQUE NOT NULL,
  executed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64) NOT NULL
);`;

// Calculate file checksum
function calculateChecksum(content) {
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Get executed migrations
async function getExecutedMigrations() {
  const result = await pool.query('SELECT filename, checksum FROM migrations');
  return new Map(result.rows.map(row => [row.filename, row.checksum]));
}

// Run migration
async function runMigration(filename, content) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Execute migration
    await client.query(content);
    
    // Record migration
    const checksum = calculateChecksum(content);
    await client.query(
      'INSERT INTO migrations (filename, checksum) VALUES ($1, $2)',
      [filename, checksum]
    );
    
    await client.query('COMMIT');
    console.log(`✅ Executed migration: ${filename}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Main function
async function runMigrations() {
  console.log('🔄 Starting database migrations...\n');
  
  try {
    // Create migrations table if not exists
    await pool.query(createMigrationTable);
    
    // Get executed migrations
    const executedMigrations = await getExecutedMigrations();
    
    // Get migration files
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort();
    
    console.log(`Found ${files.length} migration files\n`);
    
    let migrationsRun = 0;
    let migrationsSkipped = 0;
    
    for (const file of files) {
      const filePath = path.join(migrationsDir, file);
      const content = fs.readFileSync(filePath, 'utf-8');
      const checksum = calculateChecksum(content);
      
      if (executedMigrations.has(file)) {
        const existingChecksum = executedMigrations.get(file);
        if (existingChecksum !== checksum) {
          console.log(`⚠️  Migration ${file} has been modified since execution!`);
        } else {
          console.log(`⏭️  Skipping already executed: ${file}`);
        }
        migrationsSkipped++;
      } else {
        await runMigration(file, content);
        migrationsRun++;
      }
    }
    
    console.log('\n📊 Migration Summary:');
    console.log(`   - Total migrations: ${files.length}`);
    console.log(`   - Executed: ${migrationsRun}`);
    console.log(`   - Skipped: ${migrationsSkipped}`);
    
    if (migrationsRun > 0) {
      console.log('\n🎉 Migrations completed successfully!');
    } else {
      console.log('\n✨ Database is up to date!');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}