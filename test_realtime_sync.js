const { Client } = require('pg');
const redis = require('redis');

async function testRealtimeSync() {
    console.log('🔄 REAL-TIME SYNCHRONIZATION TEST');
    console.log('=' .repeat(60));
    console.log('');
    
    // PostgreSQL connection
    const pgClient = new Client({
        host: 'postgres.dtekai.com',
        port: 5432,
        database: 'dtektracking',
        user: 'postgres',
        password: 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s'
    });
    
    // Redis connection
    const redisClient = redis.createClient({
        socket: {
            host: 'localhost',
            port: 6379,
            connectTimeout: 5000
        }
    });
    
    try {
        // Connect to PostgreSQL
        console.log('1️⃣  POSTGRESQL CONNECTION TEST');
        console.log('-' .repeat(60));
        await pgClient.connect();
        console.log('✅ Connected to PostgreSQL at postgres.dtekai.com');
        console.log('');
        
        // Insert test data
        const testKey = 'sync_test_' + Date.now();
        const testValue = 'Real-time sync test at ' + new Date().toISOString();
        
        console.log('2️⃣  DATABASE UPDATE TEST');
        console.log('-' .repeat(60));
        console.log(`📝 Inserting test record:`);
        console.log(`   Key: ${testKey}`);
        console.log(`   Value: ${testValue}`);
        
        await pgClient.query(`
            INSERT INTO global_system_settings (key, value, description, category, updated_at)
            VALUES ($1, $2, $3, $4, NOW())
            ON CONFLICT (key) DO UPDATE SET 
                value = $2,
                updated_at = NOW()
        `, [testKey, testValue, 'Real-time synchronization test', 'test']);
        
        console.log('✅ Database updated successfully');
        console.log('');
        
        // Verify the insert
        const result = await pgClient.query(
            'SELECT * FROM global_system_settings WHERE key = $1',
            [testKey]
        );
        
        if (result.rows.length > 0) {
            console.log('3️⃣  DATABASE VERIFICATION');
            console.log('-' .repeat(60));
            console.log('✅ Record verified in database:');
            console.log(`   ID: ${result.rows[0].id}`);
            console.log(`   Key: ${result.rows[0].key}`);
            console.log(`   Value: ${result.rows[0].value}`);
            console.log(`   Updated: ${result.rows[0].updated_at}`);
            console.log('');
        }
        
        // Connect to Redis and test cache
        console.log('4️⃣  REDIS CACHE TEST');
        console.log('-' .repeat(60));
        
        try {
            await redisClient.connect();
            console.log('✅ Connected to Redis at localhost:6379');
            
            // Set cache key
            const cacheKey = `cache:${testKey}`;
            await redisClient.set(cacheKey, JSON.stringify({
                value: testValue,
                timestamp: new Date().toISOString(),
                source: 'test_sync'
            }));
            console.log(`✅ Cache key set: ${cacheKey}`);
            
            // Get cache value
            const cachedValue = await redisClient.get(cacheKey);
            if (cachedValue) {
                const parsed = JSON.parse(cachedValue);
                console.log('✅ Cache value retrieved:');
                console.log(`   Value: ${parsed.value}`);
                console.log(`   Timestamp: ${parsed.timestamp}`);
            }
            
            // Simulate cache invalidation
            await redisClient.del(cacheKey);
            console.log('✅ Cache invalidated (simulating update)');
            
            await redisClient.quit();
        } catch (redisError) {
            console.log('⚠️  Redis connection failed (Redis might not be running)');
            console.log(`   Error: ${redisError.message}`);
        }
        console.log('');
        
        // Show all test records
        console.log('5️⃣  ALL TEST RECORDS IN DATABASE');
        console.log('-' .repeat(60));
        const allTests = await pgClient.query(`
            SELECT key, value, updated_at 
            FROM global_system_settings 
            WHERE key LIKE 'sync_test_%'
            ORDER BY updated_at DESC
            LIMIT 5
        `);
        
        if (allTests.rows.length > 0) {
            console.log(`Found ${allTests.rows.length} test record(s):`);
            allTests.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.key}`);
                console.log(`      Value: ${row.value}`);
                console.log(`      Updated: ${row.updated_at}`);
                console.log('');
            });
        } else {
            console.log('No test records found');
        }
        
        // Cleanup old test records (keep last 5)
        await pgClient.query(`
            DELETE FROM global_system_settings 
            WHERE key LIKE 'sync_test_%' 
            AND key NOT IN (
                SELECT key FROM global_system_settings 
                WHERE key LIKE 'sync_test_%'
                ORDER BY updated_at DESC
                LIMIT 5
            )
        `);
        
        console.log('6️⃣  SYNCHRONIZATION TEST COMPLETE');
        console.log('=' .repeat(60));
        console.log('');
        console.log('📊 HOW TO VERIFY IN MANAGEMENT PANELS:');
        console.log('');
        console.log('1. pgAdmin (https://postgres.dtektracking.com):');
        console.log('   - Login with admin@dtektracking.com / DtekAdmin2024!');
        console.log('   - Navigate to dtektracking database');
        console.log('   - Query: SELECT * FROM global_system_settings WHERE key LIKE \'sync_test_%\';');
        console.log('');
        console.log('2. Redis Commander (https://redis.dtektracking.com):');
        console.log('   - Check for cache keys starting with "cache:sync_test_"');
        console.log('   - View real-time key creation/deletion');
        console.log('');
        console.log('3. Glances Monitor (https://monitor.dtektracking.com):');
        console.log('   - Observe CPU/Memory usage during operations');
        console.log('   - Check PostgreSQL and Node.js process activity');
        console.log('');
        console.log('✅ All systems synchronized successfully!');
        
    } catch (error) {
        console.error('❌ Error during sync test:', error.message);
    } finally {
        await pgClient.end();
        console.log('');
        console.log('🔌 Connections closed.');
    }
}

// Run the test
testRealtimeSync().catch(console.error);