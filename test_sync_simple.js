const { Client } = require('pg');

async function testSync() {
    const pgClient = new Client({
        host: 'postgres.dtekai.com',
        port: 5432,
        database: 'dtektracking',
        user: 'postgres',
        password: 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s'
    });

    try {
        await pgClient.connect();
        console.log('✅ PostgreSQL BAĞLANDI\n');
        
        // Create simple test table
        const timestamp = Date.now();
        const tableName = `ai_test_${timestamp}`;
        
        console.log(`📊 YENİ TABLO OLUŞTURULUYOR: ${tableName}`);
        await pgClient.query(`
            CREATE TABLE ${tableName} (
                id SERIAL PRIMARY KEY,
                mesaj TEXT,
                tarih TIMESTAMP DEFAULT NOW()
            )
        `);
        console.log('✅ Tablo oluşturuldu!\n');
        
        // Add data
        console.log('📝 VERİ EKLENİYOR...');
        await pgClient.query(`
            INSERT INTO ${tableName} (mesaj) 
            VALUES 
                ('GenSpark AI tarafından oluşturuldu'),
                ('Realtime sync testi'),
                ('Tarih: ${new Date().toLocaleString('tr-TR')}')
        `);
        console.log('✅ 3 kayıt eklendi!\n');
        
        // Add to users table
        console.log('👤 USERS TABLOSUNA TEST KULLANICI...');
        await pgClient.query(`
            INSERT INTO users (email, password_hash, name, role, created_at, updated_at)
            VALUES ('ai_test_${timestamp}@test.com', 'test_hash', 'AI Test User ${timestamp}', 'user', NOW(), NOW())
        `);
        console.log('✅ Test kullanıcı eklendi!\n');
        
        console.log('═'.repeat(60));
        console.log('🎯 pgADMIN\'DE KONTROL EDİN:\n');
        console.log('1. Sol tarafta Tables\'ı yenileyin (F5)');
        console.log(`2. Yeni tablo görünecek: ${tableName}`);
        console.log('3. Query Tool\'da şu sorguyu çalıştırın:\n');
        console.log(`   SELECT * FROM ${tableName};`);
        console.log(`   SELECT * FROM users WHERE email LIKE 'ai_test_%';`);
        console.log('═'.repeat(60));
        
        await pgClient.end();
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
        await pgClient.end();
    }
}

testSync();
