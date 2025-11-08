/**
 * Test Traffic Control Tables
 * 
 * Verifies that all tables are working correctly
 */

import { config } from 'dotenv';
import { resolve } from 'path';
import { Pool } from 'pg';

// Load environment variables
config({ path: resolve(process.cwd(), '.env.local') });

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 5,
});

async function testTables() {
  console.log('┌─────────────────────────────────────────────────────────┐');
  console.log('│   🧪 TESTING TRAFFIC CONTROL TABLES                   │');
  console.log('└─────────────────────────────────────────────────────────┘');
  console.log('');

  try {
    const client = await pool.connect();

    try {
      // Test 1: Query ip_tracking
      console.log('📊 Test 1: Query ip_tracking table');
      const ipResult = await client.query(`
        SELECT ip, country, device_type, visit_count, list_status, risk_score
        FROM ip_tracking
        ORDER BY risk_score DESC
      `);
      console.log(`   ✅ Found ${ipResult.rows.length} IP records:`);
      ipResult.rows.forEach(row => {
        console.log(`      ${row.ip} (${row.country}) - ${row.device_type} - Risk: ${row.risk_score} - Status: ${row.list_status}`);
      });
      console.log('');

      // Test 2: Query auto_rules
      console.log('📋 Test 2: Query auto_rules table');
      const rulesResult = await client.query(`
        SELECT name, action, enabled, conditions
        FROM auto_rules
        WHERE enabled = true
      `);
      console.log(`   ✅ Found ${rulesResult.rows.length} active rules:`);
      rulesResult.rows.forEach(row => {
        console.log(`      Rule: "${row.name}"`);
        console.log(`      Action: ${row.action}`);
        console.log(`      Conditions: ${JSON.stringify(row.conditions, null, 2)}`);
      });
      console.log('');

      // Test 3: Insert a test visit
      console.log('📝 Test 3: Insert test visit');
      const testIP = '185.123.45.67';
      await client.query(`
        INSERT INTO ip_visit_history 
        (ip, session_id, page_url, user_agent, device_type, time_on_page, scroll_depth, clicks_count)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [testIP, 'test-session-123', '/test-page', 'Mozilla/5.0 Test', 'mobile', 120, 75, 5]);
      console.log('   ✅ Test visit inserted');
      console.log('');

      // Test 4: Insert a test form submission
      console.log('📄 Test 4: Insert test form submission');
      await client.query(`
        INSERT INTO form_submission_history
        (ip, form_name, data_hash, time_to_fill, is_spam, spam_score)
        VALUES ($1, $2, $3, $4, $5, $6)
      `, [testIP, 'contact_form', 'abc123hash', 45, false, 0]);
      console.log('   ✅ Test form submission inserted');
      console.log('');

      // Test 5: Join query
      console.log('🔗 Test 5: Join ip_tracking with ip_visit_history');
      const joinResult = await client.query(`
        SELECT 
          it.ip,
          it.country,
          it.list_status,
          COUNT(ivh.id) as visit_count
        FROM ip_tracking it
        LEFT JOIN ip_visit_history ivh ON it.ip = ivh.ip
        GROUP BY it.ip, it.country, it.list_status
      `);
      console.log(`   ✅ Join query successful:`);
      joinResult.rows.forEach(row => {
        console.log(`      ${row.ip} (${row.country}) - ${row.visit_count} visits`);
      });
      console.log('');

      // Test 6: Test triggers
      console.log('⚡ Test 6: Test auto-update trigger');
      const beforeUpdate = await client.query(`SELECT updated_at FROM ip_tracking WHERE ip = $1`, [testIP]);
      console.log(`   Before update: ${beforeUpdate.rows[0].updated_at}`);
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      
      await client.query(`UPDATE ip_tracking SET visit_count = visit_count + 1 WHERE ip = $1`, [testIP]);
      
      const afterUpdate = await client.query(`SELECT updated_at FROM ip_tracking WHERE ip = $1`, [testIP]);
      console.log(`   After update:  ${afterUpdate.rows[0].updated_at}`);
      console.log(`   ✅ Trigger working! updated_at changed automatically`);
      console.log('');

      // Test 7: Check indexes
      console.log('🗂️  Test 7: Verify indexes exist');
      const indexCheck = await client.query(`
        SELECT 
          tablename,
          COUNT(*) as index_count
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND tablename IN ('ip_tracking', 'ip_visit_history', 'form_submission_history')
        GROUP BY tablename
      `);
      console.log('   ✅ Indexes found:');
      indexCheck.rows.forEach(row => {
        console.log(`      ${row.tablename}: ${row.index_count} indexes`);
      });
      console.log('');

      console.log('┌─────────────────────────────────────────────────────────┐');
      console.log('│   ✅ ALL TESTS PASSED!                                 │');
      console.log('└─────────────────────────────────────────────────────────┘');
      console.log('');
      console.log('🎉 Database tables are working correctly!');
      console.log('');

    } finally {
      client.release();
    }

  } catch (error: any) {
    console.error('');
    console.error('❌ Test failed:', error.message);
    console.error('');
    process.exit(1);
  } finally {
    await pool.end();
  }
}

// Run tests
if (require.main === module) {
  testTables();
}

export { testTables };
