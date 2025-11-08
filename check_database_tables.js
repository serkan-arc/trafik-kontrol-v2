const { Client } = require('pg');

async function checkDatabaseTables() {
    const client = new Client({
        host: 'postgres.dtekai.com',
        port: 5432,
        database: 'dtektracking',
        user: 'postgres',
        password: 'T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s'
    });

    try {
        console.log('🔗 PostgreSQL veritabanına bağlanılıyor...\n');
        await client.connect();
        
        // Get all tables in public schema
        const tablesResult = await client.query(`
            SELECT table_name, table_type 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            ORDER BY table_name;
        `);
        
        console.log('📊 PUBLIC SCHEMA TABLOLARı:');
        console.log('=' .repeat(60));
        
        const expectedTables = [
            'ip_tracking',
            'ip_visit_history', 
            'ip_user_agent_history',
            'ip_decision_history',
            'ip_pattern_detection',
            'form_submission_history',
            'sessions',
            'rate_limits',
            'system_users',
            'sites',
            'deployed_sites',
            'site_versions',
            'site_logs',
            'ssl_certificates',
            'nginx_configs',
            'master_domains',
            'domain_traffic_stats',
            'domain_auto_rules',
            'global_ip_activity',
            'global_ip_reputation',
            'global_bot_detections',
            'global_spam_detections',
            'global_security_events',
            'global_analytics_hourly',
            'global_auto_rules',
            'global_rule_triggers',
            'global_system_settings',
            'global_bot_patterns',
            'global_spam_patterns',
            'notification_channels',
            'notification_templates',
            'notification_rules',
            'notification_history',
            'notification_throttle',
            'audit_logs',
            'auto_rules',
            'master_traffic_log',
            'disposable_email_domains'
        ];

        const existingTables = tablesResult.rows.map(row => row.table_name);
        
        // Check which expected tables exist
        console.log('\n✅ MEVCUT TABLOLAR (Beklenen ve Var Olan):');
        console.log('-' .repeat(60));
        let foundCount = 0;
        for (const table of expectedTables) {
            if (existingTables.includes(table)) {
                console.log(`  ✓ ${table}`);
                foundCount++;
            }
        }
        
        console.log('\n❌ EKSİK TABLOLAR (Beklenen ama Yok):');
        console.log('-' .repeat(60));
        let missingCount = 0;
        for (const table of expectedTables) {
            if (!existingTables.includes(table)) {
                console.log(`  ✗ ${table}`);
                missingCount++;
            }
        }
        
        console.log('\n➕ EKSTRA TABLOLAR (Beklenmeyen):');
        console.log('-' .repeat(60));
        for (const table of existingTables) {
            if (!expectedTables.includes(table)) {
                console.log(`  • ${table}`);
            }
        }
        
        // Get row counts for existing tables
        console.log('\n📈 TABLO VERİ SAYILARI:');
        console.log('=' .repeat(60));
        
        for (const table of existingTables) {
            try {
                const countResult = await client.query(`SELECT COUNT(*) FROM ${table}`);
                const count = countResult.rows[0].count;
                console.log(`  ${table}: ${count} kayıt`);
            } catch (err) {
                console.log(`  ${table}: Sayılamadı (${err.message})`);
            }
        }
        
        // Summary
        console.log('\n📊 ÖZET:');
        console.log('=' .repeat(60));
        console.log(`  Toplam Beklenen Tablo: ${expectedTables.length}`);
        console.log(`  Mevcut Tablo: ${foundCount}`);
        console.log(`  Eksik Tablo: ${missingCount}`);
        console.log(`  Ekstra Tablo: ${existingTables.length - foundCount}`);
        console.log(`  Veritabanındaki Toplam Tablo: ${existingTables.length}`);
        
        // Check if this is the correct database
        console.log('\n🔍 VERİTABANI BİLGİLERİ:');
        console.log('=' .repeat(60));
        const dbInfo = await client.query(`
            SELECT current_database() as database,
                   current_user as user,
                   version() as version
        `);
        console.log(`  Veritabanı: ${dbInfo.rows[0].database}`);
        console.log(`  Kullanıcı: ${dbInfo.rows[0].user}`);
        console.log(`  PostgreSQL Versiyon: ${dbInfo.rows[0].version.split(',')[0]}`);
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
    } finally {
        await client.end();
        console.log('\n✅ Bağlantı kapatıldı.');
    }
}

// Run the check
checkDatabaseTables();