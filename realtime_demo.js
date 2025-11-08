const { Client } = require('pg');

async function realtimeDemo() {
    const pgClient = new Client({
        host: 'postgres.dtekai.com',
        port: 5432,
        database: 'dtektracking',
        user: 'postgres',
        password: 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s'
    });

    try {
        await pgClient.connect();
        console.log('═'.repeat(70));
        console.log('🔄 GERÇEK ZAMANLI SENKRON DEMONSTRASİYONU');
        console.log('═'.repeat(70));
        console.log('\n✅ PostgreSQL\'e bağlandı: postgres.dtekai.com\n');
        
        const timestamp = Date.now();
        const demoId = Math.floor(Math.random() * 10000);
        
        // 1. Create a new demo table
        const tableName = `genspark_demo_${demoId}`;
        console.log(`📊 ADIM 1: Yeni tablo oluşturuluyor: ${tableName}`);
        
        await pgClient.query(`
            CREATE TABLE ${tableName} (
                id SERIAL PRIMARY KEY,
                mesaj TEXT,
                olusturulma_zamani TIMESTAMP DEFAULT NOW(),
                olusturan VARCHAR(100) DEFAULT 'GenSpark AI'
            )
        `);
        console.log(`   ✅ Tablo oluşturuldu!\n`);
        
        // 2. Add demo data
        console.log('📝 ADIM 2: Demo verileri ekleniyor...');
        
        await pgClient.query(`
            INSERT INTO ${tableName} (mesaj) 
            VALUES 
                ('🤖 Bu kayıt GenSpark AI tarafından ${new Date().toLocaleString('tr-TR')} tarihinde oluşturuldu'),
                ('🔄 Realtime senkronizasyon test kaydı'),
                ('✨ pgAdmin''de bu tabloyu ve verileri görebilirsiniz'),
                ('🎯 Demo ID: ${demoId}')
        `);
        console.log(`   ✅ 4 demo kaydı eklendi!\n`);
        
        // 3. Add test IP to ip_tracking
        console.log('🌐 ADIM 3: ip_tracking tablosuna test IP ekleniyor...');
        
        const testIp = `10.99.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
        await pgClient.query(`
            INSERT INTO ip_tracking (ip, country_name, city, visit_count, risk_score, bot_score, list_status, admin_notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            ON CONFLICT (ip) DO UPDATE 
            SET visit_count = ip_tracking.visit_count + 1,
                last_seen = NOW(),
                admin_notes = $8
        `, [
            testIp,
            'Test Ülke',
            'AI Test Şehri',
            999,
            Math.floor(Math.random() * 100),
            0,
            'whitelist',
            `GenSpark AI tarafından ${new Date().toLocaleString('tr-TR')} tarihinde eklendi - Demo ${demoId}`
        ]);
        console.log(`   ✅ Test IP eklendi: ${testIp}\n`);
        
        // 4. Update users table (if exists)
        console.log('👤 ADIM 4: Users tablosuna demo kullanıcı ekleniyor...');
        
        try {
            // Generate UUID for PostgreSQL
            const userResult = await pgClient.query(`
                INSERT INTO users (id, email, password_hash, role, first_name, last_name, status, created_at, updated_at)
                VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, NOW(), NOW())
                RETURNING id, email
            `, [
                `ai_demo_${demoId}@genspark.com`,
                'demo_password_hash',
                'user',
                'GenSpark',
                `Demo ${demoId}`,
                'active'
            ]);
            console.log(`   ✅ Demo kullanıcı eklendi: ${userResult.rows[0].email}\n`);
        } catch (err) {
            console.log(`   ⚠️  Kullanıcı eklenemedi: ${err.message}\n`);
        }
        
        // 5. Show created tables count
        const tableCount = await pgClient.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'genspark_demo_%'
        `);
        
        const aiTestCount = await pgClient.query(`
            SELECT COUNT(*) as count 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE 'ai_test_%'
        `);
        
        console.log('📊 ADIM 5: Oluşturulan test tabloları...');
        console.log(`   • GenSpark demo tabloları: ${tableCount.rows[0].count}`);
        console.log(`   • AI test tabloları: ${aiTestCount.rows[0].count}`);
        console.log(`   • Toplam: ${parseInt(tableCount.rows[0].count) + parseInt(aiTestCount.rows[0].count)}\n`);
        
        // Display verification instructions
        console.log('═'.repeat(70));
        console.log('🎯 pgADMIN\'DE DOĞRULAMA TALİMATLARI:');
        console.log('═'.repeat(70));
        console.log('\n1️⃣  SOL PANEL - Tabloları Yenileyin:');
        console.log('   • dtektracking → Schemas → public → Tables');
        console.log('   • Sağ tık → Refresh (veya F5)');
        console.log(`   • Yeni tablo görünecek: ${tableName}\n`);
        
        console.log('2️⃣  QUERY TOOL - Test Sorguları:');
        console.log('   Aşağıdaki sorguları kopyalayıp Query Tool\'da çalıştırın:\n');
        console.log(`   -- Yeni oluşturulan demo tablosu`);
        console.log(`   SELECT * FROM ${tableName};\n`);
        console.log(`   -- Test IP kaydı`);
        console.log(`   SELECT * FROM ip_tracking WHERE ip = '${testIp}';\n`);
        console.log(`   -- Demo kullanıcı`);
        console.log(`   SELECT * FROM users WHERE email LIKE 'ai_demo_%';\n`);
        console.log(`   -- Tüm GenSpark test tabloları`);
        console.log(`   SELECT table_name FROM information_schema.tables`);
        console.log(`   WHERE table_schema = 'public'`);
        console.log(`   AND (table_name LIKE 'genspark_demo_%' OR table_name LIKE 'ai_test_%')`);
        console.log(`   ORDER BY table_name;\n`);
        
        console.log('═'.repeat(70));
        console.log('✅ DEMO TAMAMLANDI!');
        console.log('═'.repeat(70));
        console.log('\n📌 ÖNEMLİ: Ben bu veritabanına her değişiklik yaptığımda,');
        console.log('   siz pgAdmin\'den ANINDA görebileceksiniz!');
        console.log('   Çünkü aynı veritabanına bağlıyız.\n');
        
        await pgClient.end();
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
        console.error('Detay:', error);
        await pgClient.end();
    }
}

// Run demo
realtimeDemo();