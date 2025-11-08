/**
 * Database Migration Runner
 * 
 * Runs SQL migration files from /migrations directory
 * Usage: npx tsx scripts/run-migration.ts [migration-file]
 */

import { readFileSync } from 'fs';
import { resolve, join } from 'path';
import { config } from 'dotenv';
import { Pool } from 'pg';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

// Database configuration
const pool = new Pool({
  host: process.env.DB_HOST || 'postgres.dtekai.com',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'dtektracking',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 5,
  connectionTimeoutMillis: 10000,
});

interface MigrationResult {
  success: boolean;
  duration: number;
  error?: string;
  notices?: string[];
}

/**
 * Run a single migration file
 */
async function runMigration(filePath: string): Promise<MigrationResult> {
  const startTime = Date.now();
  const notices: string[] = [];

  try {
    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│   🚀 DATABASE MIGRATION RUNNER                         │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('');
    console.log(`📁 Migration file: ${filePath}`);
    console.log(`🔗 Database: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
    console.log('');

    // Read migration file
    console.log('📖 Reading migration file...');
    const sql = readFileSync(filePath, 'utf-8');
    console.log(`   ✅ Read ${sql.length} characters`);
    console.log('');

    // Connect to database
    console.log('🔌 Connecting to database...');
    const client = await pool.connect();
    console.log('   ✅ Connected successfully');
    console.log('');

    try {
      // Listen for notices (RAISE NOTICE in SQL)
      client.on('notice', (msg) => {
        if (msg.message) {
          notices.push(msg.message);
        }
      });

      // Execute migration
      console.log('⚡ Executing migration...');
      console.log('─────────────────────────────────────────────────────────');
      
      await client.query(sql);
      
      console.log('─────────────────────────────────────────────────────────');
      console.log('');

      // Display notices
      if (notices.length > 0) {
        console.log('📢 Migration Notices:');
        notices.forEach(notice => {
          console.log(`   ${notice}`);
        });
        console.log('');
      }

      const duration = Date.now() - startTime;
      console.log(`✅ Migration completed successfully in ${duration}ms`);
      console.log('');

      return {
        success: true,
        duration,
        notices
      };

    } finally {
      client.release();
    }

  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error('');
    console.error('❌ Migration failed!');
    console.error('');
    console.error('Error details:');
    console.error(`   Message: ${error.message}`);
    if (error.position) {
      console.error(`   Position: ${error.position}`);
    }
    if (error.detail) {
      console.error(`   Detail: ${error.detail}`);
    }
    if (error.hint) {
      console.error(`   Hint: ${error.hint}`);
    }
    console.error('');

    return {
      success: false,
      duration,
      error: error.message
    };
  }
}

/**
 * Verify tables created
 */
async function verifyTables(): Promise<void> {
  console.log('🔍 Verifying tables...');
  console.log('');

  try {
    const client = await pool.connect();
    
    try {
      const result = await client.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN (
          'ip_tracking',
          'ip_visit_history',
          'form_submission_history',
          'ip_user_agent_history',
          'ip_decision_history',
          'ip_pattern_detection',
          'auto_rules',
          'deployed_sites',
          'nginx_configs',
          'ssl_certificates'
        )
        ORDER BY table_name
      `);

      console.log(`📊 Found ${result.rows.length} tables:`);
      result.rows.forEach((row, index) => {
        console.log(`   ${index + 1}. ${row.table_name}`);
      });
      console.log('');

      // Count records in each table
      console.log('📈 Record counts:');
      for (const row of result.rows) {
        const countResult = await client.query(`SELECT COUNT(*) as count FROM ${row.table_name}`);
        console.log(`   ${row.table_name}: ${countResult.rows[0].count} records`);
      }
      console.log('');

      // Check indexes
      const indexResult = await client.query(`
        SELECT 
          tablename,
          indexname
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename IN (
          'ip_tracking',
          'ip_visit_history',
          'form_submission_history',
          'ip_user_agent_history',
          'ip_decision_history',
          'ip_pattern_detection',
          'auto_rules',
          'deployed_sites',
          'nginx_configs',
          'ssl_certificates'
        )
        ORDER BY tablename, indexname
      `);

      console.log(`🗂️  Found ${indexResult.rows.length} indexes created`);
      console.log('');

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('❌ Verification failed:', error.message);
  }
}

/**
 * Main execution
 */
async function main() {
  try {
    // Get migration file path from arguments or use default
    const migrationFile = process.argv[2] || '001_traffic_control_tables.sql';
    const migrationPath = resolve(join(process.cwd(), 'migrations', migrationFile));

    // Run migration
    const result = await runMigration(migrationPath);

    if (!result.success) {
      console.error('Migration failed. Exiting...');
      process.exit(1);
    }

    // Verify tables
    await verifyTables();

    console.log('┌─────────────────────────────────────────────────────────┐');
    console.log('│   ✅ ALL MIGRATION TASKS COMPLETED                     │');
    console.log('└─────────────────────────────────────────────────────────┘');
    console.log('');
    console.log('🎉 Your database is ready for Traffic Control System!');
    console.log('');

  } catch (error: any) {
    console.error('');
    console.error('💥 Fatal error:', error.message);
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run if executed directly
if (require.main === module) {
  main();
}

export { runMigration, verifyTables };
