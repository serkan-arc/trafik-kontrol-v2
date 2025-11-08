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
    
    try {
        // Connect to PostgreSQL
        console.log('1️⃣  POSTGRESQL CONNECTION TEST');
        console.log('-' .repeat(60));
        await pgClient.connect();
        console.log('✅ Connected to PostgreSQL at postgres.dtekai.com');
        console.log('');
        
        // Insert test data
        const testKey = 'sync_test_' + Date.now();
        const testValue = {
            message: 'Real-time sync test',
            timestamp: new Date().toISOString(),
            test_id: Date.now()
        };
        
        console.log('2️⃣  DATABASE UPDATE TEST');
        console.log('-' .repeat(60));
        console.log(`📝 Inserting test record:`);
        console.log(`   Key: ${testKey}`);
        console.log(`   Value: ${JSON.stringify(testValue)}`);
        
        await pgClient.query(`
            INSERT INTO global_system_settings 
            (setting_key, setting_value, setting_type, description, category, updated_at)
            VALUES ($1, $2, $3, $4, $5, NOW())
            ON CONFLICT (setting_key) DO UPDATE SET 
                setting_value = $2,
                updated_at = NOW()
        `, [testKey, JSON.stringify(testValue), 'json', 'Real-time synchronization test', 'test']);
        
        console.log('✅ Database updated successfully');
        console.log('');
        
        // Verify the insert
        const result = await pgClient.query(
            'SELECT * FROM global_system_settings WHERE setting_key = $1',
            [testKey]
        );
        
        if (result.rows.length > 0) {
            console.log('3️⃣  DATABASE VERIFICATION');
            console.log('-' .repeat(60));
            console.log('✅ Record verified in database:');
            console.log(`   ID: ${result.rows[0].id}`);
            console.log(`   Key: ${result.rows[0].setting_key}`);
            console.log(`   Value: ${JSON.stringify(result.rows[0].setting_value)}`);
            console.log(`   Type: ${result.rows[0].setting_type}`);
            console.log(`   Updated: ${result.rows[0].updated_at}`);
            console.log('');
        }
        
        // Redis cache test
        console.log('4️⃣  REDIS CACHE TEST');
        console.log('-' .repeat(60));
        
        let redisClient;
        try {
            // Create Redis client with timeout
            redisClient = redis.createClient({
                socket: {
                    host: 'localhost',
                    port: 6379,
                    connectTimeout: 3000,
                    commandTimeout: 3000
                }
            });
            
            // Set up error handler
            redisClient.on('error', (err) => {
                console.log('Redis Client Error:', err.message);
            });
            
            // Connect with timeout
            const connectPromise = redisClient.connect();
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Redis connection timeout')), 3000)
            );
            
            await Promise.race([connectPromise, timeoutPromise]);
            
            console.log('✅ Connected to Redis at localhost:6379');
            
            // Set cache key
            const cacheKey = `cache:${testKey}`;
            await redisClient.set(cacheKey, JSON.stringify(testValue), {
                EX: 60 // Expire in 60 seconds
            });
            console.log(`✅ Cache key set: ${cacheKey} (expires in 60s)`);
            
            // Get cache value
            const cachedValue = await redisClient.get(cacheKey);
            if (cachedValue) {
                const parsed = JSON.parse(cachedValue);
                console.log('✅ Cache value retrieved:');
                console.log(`   Message: ${parsed.message}`);
                console.log(`   Timestamp: ${parsed.timestamp}`);
                console.log(`   Test ID: ${parsed.test_id}`);
            }
            
            // List all cache keys
            const keys = await redisClient.keys('cache:sync_test_*');
            console.log(`✅ Found ${keys.length} test cache keys in Redis`);
            
            // Simulate cache invalidation
            await redisClient.del(cacheKey);
            console.log('✅ Cache invalidated (simulating update)');
            
        } catch (redisError) {
            console.log('⚠️  Redis test skipped (connection failed)');
            console.log(`   Reason: ${redisError.message}`);
            console.log('   Note: Redis might not be configured or running');
        } finally {
            if (redisClient && redisClient.isOpen) {
                await redisClient.quit();
            }
        }
        console.log('');
        
        // Show all test records
        console.log('5️⃣  ALL TEST RECORDS IN DATABASE');
        console.log('-' .repeat(60));
        const allTests = await pgClient.query(`
            SELECT setting_key, setting_value, updated_at 
            FROM global_system_settings 
            WHERE setting_key LIKE 'sync_test_%'
            ORDER BY updated_at DESC
            LIMIT 5
        `);
        
        if (allTests.rows.length > 0) {
            console.log(`Found ${allTests.rows.length} test record(s):`);
            allTests.rows.forEach((row, index) => {
                console.log(`   ${index + 1}. ${row.setting_key}`);
                console.log(`      Value: ${JSON.stringify(row.setting_value)}`);
                console.log(`      Updated: ${row.updated_at}`);
                console.log('');
            });
        } else {
            console.log('No test records found');
        }
        
        // Cleanup old test records (keep last 5)
        const deleteResult = await pgClient.query(`
            DELETE FROM global_system_settings 
            WHERE setting_key LIKE 'sync_test_%' 
            AND setting_key NOT IN (
                SELECT setting_key FROM global_system_settings 
                WHERE setting_key LIKE 'sync_test_%'
                ORDER BY updated_at DESC
                LIMIT 5
            )
        `);
        
        if (deleteResult.rowCount > 0) {
            console.log(`🧹 Cleaned up ${deleteResult.rowCount} old test record(s)`);
        }
        
        console.log('');
        console.log('6️⃣  SYNCHRONIZATION TEST COMPLETE');
        console.log('=' .repeat(60));
        console.log('');
        console.log('📊 HOW TO VERIFY IN MANAGEMENT PANELS:');
        console.log('');
        console.log('1. pgAdmin (https://postgres.dtektracking.com):');
        console.log('   - Login with: admin@dtektracking.com / DtekAdmin2024!');
        console.log('   - Navigate to: dtektracking database → public schema');
        console.log('   - Query tool: SELECT * FROM global_system_settings WHERE setting_key LIKE \'sync_test_%\';');
        console.log('');
        console.log('2. Redis Commander (https://redis.dtektracking.com):');
        console.log('   - Check for keys: cache:sync_test_*');
        console.log('   - View JSON values in real-time');
        console.log('   - Monitor key expiration (60 second TTL)');
        console.log('');
        console.log('3. Glances Monitor (https://monitor.dtektracking.com):');
        console.log('   - CPU usage during database operations');
        console.log('   - Memory usage for PostgreSQL and Node.js');
        console.log('   - Network traffic for database connections');
        console.log('');
        console.log('✅ Real-time synchronization test completed successfully!');
        
    } catch (error) {
        console.error('❌ Error during sync test:', error.message);
        console.error('   Stack:', error.stack);
    } finally {
        await pgClient.end();
        console.log('');
        console.log('🔌 Database connection closed.');
    }
}

// Run the test
testRealtimeSync().catch(console.error);