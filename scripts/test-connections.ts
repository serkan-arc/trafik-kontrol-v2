#!/usr/bin/env tsx
/**
 * Database Connection Test Script
 * Tests PostgreSQL and Redis connections
 */

// Load environment variables from .env.local
import { readFileSync } from 'fs';
import { join } from 'path';

try {
  const envPath = join(process.cwd(), '.env.local');
  const envContent = readFileSync(envPath, 'utf-8');
  envContent.split('\n').forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const [key, ...valueParts] = trimmed.split('=');
      if (key && valueParts.length > 0) {
        const value = valueParts.join('=').trim();
        process.env[key.trim()] = value;
      }
    }
  });
  console.log('✅ Environment variables loaded from .env.local\n');
} catch (error) {
  console.warn('⚠️  Could not load .env.local file:', error);
}

import { db } from '../lib/db';
import { redis } from '../lib/redis';

interface TestResult {
  service: string;
  status: 'success' | 'failed';
  message: string;
  details?: any;
}

const results: TestResult[] = [];

async function testPostgreSQL(): Promise<TestResult> {
  console.log('\n🔍 Testing PostgreSQL Connection...');
  try {
    const start = Date.now();
    const result = await db.query('SELECT version(), NOW() as current_time');
    const duration = Date.now() - start;

    if (result.rows.length > 0) {
      const version = result.rows[0].version.split(',')[0]; // Get first part
      const currentTime = result.rows[0].current_time;

      console.log('✅ PostgreSQL connected successfully!');
      console.log(`   Version: ${version}`);
      console.log(`   Server Time: ${currentTime}`);
      console.log(`   Response Time: ${duration}ms`);

      // Test database tables
      const tableCheck = await db.query(`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
        ORDER BY table_name
      `);

      console.log(`   Tables Found: ${tableCheck.rows.length}`);
      if (tableCheck.rows.length > 0) {
        console.log('   Tables:', tableCheck.rows.map(r => r.table_name).join(', '));
      }

      return {
        service: 'PostgreSQL',
        status: 'success',
        message: 'Connected successfully',
        details: {
          version,
          response_time_ms: duration,
          tables_count: tableCheck.rows.length,
          tables: tableCheck.rows.map(r => r.table_name)
        }
      };
    } else {
      throw new Error('No response from database');
    }
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    return {
      service: 'PostgreSQL',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: { error }
    };
  }
}

async function testRedis(): Promise<TestResult> {
  console.log('\n🔍 Testing Redis Connection...');
  try {
    const start = Date.now();
    await redis.connect();
    const connectDuration = Date.now() - start;

    console.log('✅ Redis connected successfully!');
    console.log(`   Connection Time: ${connectDuration}ms`);

    // Test SET operation
    const testKey = 'test:connection:timestamp';
    const testValue = new Date().toISOString();
    await redis.set(testKey, testValue, 60); // 60 seconds TTL
    console.log(`   SET test successful (key: ${testKey})`);

    // Test GET operation
    const getValue = await redis.get(testKey);
    if (getValue === testValue) {
      console.log('   GET test successful');
    } else {
      throw new Error('GET value does not match SET value');
    }

    // Test EXISTS operation
    const exists = await redis.exists(testKey);
    console.log(`   EXISTS test successful (result: ${exists})`);

    // Test DEL operation
    await redis.del(testKey);
    console.log('   DEL test successful');

    // Verify deletion
    const existsAfterDel = await redis.exists(testKey);
    if (!existsAfterDel) {
      console.log('   Deletion verified');
    }

    return {
      service: 'Redis',
      status: 'success',
      message: 'All operations successful',
      details: {
        connection_time_ms: connectDuration,
        operations_tested: ['SET', 'GET', 'EXISTS', 'DEL']
      }
    };
  } catch (error) {
    console.error('❌ Redis connection failed:', error);
    return {
      service: 'Redis',
      status: 'failed',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: { error }
    };
  }
}

async function runTests() {
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║     DTekTracking - Database Connection Tests         ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  // Test PostgreSQL
  const pgResult = await testPostgreSQL();
  results.push(pgResult);

  // Test Redis
  const redisResult = await testRedis();
  results.push(redisResult);

  // Summary
  console.log('\n╔═══════════════════════════════════════════════════════╗');
  console.log('║                    Test Summary                       ║');
  console.log('╚═══════════════════════════════════════════════════════╝');

  results.forEach(result => {
    const statusIcon = result.status === 'success' ? '✅' : '❌';
    console.log(`${statusIcon} ${result.service}: ${result.status.toUpperCase()}`);
    console.log(`   Message: ${result.message}`);
  });

  const allPassed = results.every(r => r.status === 'success');
  
  console.log('\n' + '═'.repeat(59));
  if (allPassed) {
    console.log('🎉 All connection tests passed!');
    console.log('Your database services are ready for use.');
  } else {
    console.log('⚠️  Some connection tests failed!');
    console.log('Please check your configuration and service status.');
  }
  console.log('═'.repeat(59) + '\n');

  // Cleanup
  await redis.close();
  await db.close();

  process.exit(allPassed ? 0 : 1);
}

// Run tests
runTests().catch(error => {
  console.error('Fatal error during tests:', error);
  process.exit(1);
});
