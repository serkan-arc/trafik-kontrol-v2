const redis = require('redis');

async function redisRealtimeDemo() {
    console.log('═'.repeat(70));
    console.log('🔴 REDIS GERÇEK ZAMANLI SENKRON DEMONSTRASİYONU');
    console.log('═'.repeat(70));
    
    const client = redis.createClient({
        host: 'localhost',
        port: 6379
    });
    
    client.on('error', (err) => {
        console.error('Redis bağlantı hatası:', err);
    });
    
    client.on('connect', () => {
        console.log('\n✅ Redis\'e bağlandı: localhost:6379\n');
    });
    
    // Demo ID
    const demoId = Math.floor(Math.random() * 10000);
    const timestamp = new Date().toISOString();
    
    try {
        // 1. String key-value
        console.log('📝 ADIM 1: String key-value ekleniyor...');
        const stringKey = `genspark:demo:${demoId}`;
        const stringValue = JSON.stringify({
            message: 'GenSpark AI tarafından oluşturuldu',
            timestamp: timestamp,
            demo_id: demoId,
            turkish_time: new Date().toLocaleString('tr-TR')
        });
        
        client.set(stringKey, stringValue, (err, reply) => {
            if (!err) {
                console.log(`   ✅ Key oluşturuldu: ${stringKey}\n`);
            }
        });
        
        // 2. Hash
        console.log('📊 ADIM 2: Hash veri yapısı oluşturuluyor...');
        const hashKey = `genspark:stats:${demoId}`;
        
        client.hset(hashKey, 'created_by', 'GenSpark AI');
        client.hset(hashKey, 'created_at', timestamp);
        client.hset(hashKey, 'demo_id', demoId);
        client.hset(hashKey, 'ip_count', Math.floor(Math.random() * 1000));
        client.hset(hashKey, 'risk_score', Math.floor(Math.random() * 100));
        
        setTimeout(() => {
            console.log(`   ✅ Hash oluşturuldu: ${hashKey}\n`);
        }, 100);
        
        // 3. List
        console.log('📋 ADIM 3: List veri yapısı oluşturuluyor...');
        const listKey = `genspark:events:${demoId}`;
        
        client.rpush(listKey, `Event 1: Demo başlatıldı - ${timestamp}`);
        client.rpush(listKey, `Event 2: PostgreSQL senkronize edildi`);
        client.rpush(listKey, `Event 3: Redis verileri eklendi`);
        client.rpush(listKey, `Event 4: Demo ID: ${demoId}`);
        
        setTimeout(() => {
            console.log(`   ✅ List oluşturuldu: ${listKey}\n`);
        }, 200);
        
        // 4. Set
        console.log('🔢 ADIM 4: Set veri yapısı oluşturuluyor...');
        const setKey = `genspark:ips:${demoId}`;
        
        for (let i = 0; i < 5; i++) {
            const randomIp = `192.168.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`;
            client.sadd(setKey, randomIp);
        }
        
        setTimeout(() => {
            console.log(`   ✅ Set oluşturuldu: ${setKey}\n`);
        }, 300);
        
        // 5. Sorted Set (Z-Set)
        console.log('📈 ADIM 5: Sorted Set (sıralı küme) oluşturuluyor...');
        const zsetKey = `genspark:top_ips:${demoId}`;
        
        client.zadd(zsetKey, 95, '192.168.1.100');
        client.zadd(zsetKey, 87, '10.0.0.50');
        client.zadd(zsetKey, 73, '172.16.0.25');
        client.zadd(zsetKey, 65, '192.168.2.75');
        client.zadd(zsetKey, 42, '10.10.10.10');
        
        setTimeout(() => {
            console.log(`   ✅ Sorted Set oluşturuldu: ${zsetKey}\n`);
        }, 400);
        
        // 6. Global stats update
        console.log('🌍 ADIM 6: Global istatistikler güncelleniyor...');
        
        client.incr('genspark:global:total_demos');
        client.set('genspark:global:last_demo_time', timestamp);
        client.hset('genspark:global:demo_info', `demo_${demoId}`, JSON.stringify({
            created: timestamp,
            type: 'realtime_sync_demo'
        }));
        
        setTimeout(() => {
            console.log(`   ✅ Global istatistikler güncellendi!\n`);
            
            // Display verification instructions
            console.log('═'.repeat(70));
            console.log('🎯 REDIS COMMANDER\'DA DOĞRULAMA TALİMATLARI:');
            console.log('═'.repeat(70));
            console.log('\n1️⃣  REDIS COMMANDER\'I AÇIN:');
            console.log(`   • http://redis.dtektracking.com`);
            console.log('   • Sol panelde key listesini yenileyin\n');
            
            console.log('2️⃣  OLUŞTURULAN KEY\'LER:');
            console.log(`   • ${stringKey} (String)`);
            console.log(`   • ${hashKey} (Hash)`);
            console.log(`   • ${listKey} (List)`);
            console.log(`   • ${setKey} (Set)`);
            console.log(`   • ${zsetKey} (Sorted Set)\n`);
            
            console.log('3️⃣  ARAMA YAPMA:');
            console.log(`   • Arama kutusuna "genspark" yazın`);
            console.log(`   • Demo ID ile arama: "${demoId}"`);
            console.log(`   • Tüm GenSpark key\'leri: "genspark:*"\n`);
            
            console.log('4️⃣  KEY İÇERİKLERİNİ GÖRME:');
            console.log('   • Her key\'e tıklayarak içeriğini görebilirsiniz');
            console.log('   • Hash: Tüm field-value çiftlerini gösterir');
            console.log('   • List: Tüm elemanları sırasıyla gösterir');
            console.log('   • Set: Tüm unique elemanları gösterir');
            console.log('   • Sorted Set: Skorlarla birlikte sıralı gösterir\n');
            
            console.log('═'.repeat(70));
            console.log('✅ REDIS DEMO TAMAMLANDI!');
            console.log('═'.repeat(70));
            console.log('\n📌 ÖNEMLİ: Ben Redis\'e her veri yazdığımda,');
            console.log('   siz Redis Commander\'dan ANINDA görebileceksiniz!');
            console.log('   Çünkü aynı Redis sunucusuna bağlıyız.\n');
            
            // Get summary stats
            client.dbsize((err, size) => {
                if (!err) {
                    console.log(`📊 Redis\'teki toplam key sayısı: ${size}`);
                }
                
                // Close connection
                setTimeout(() => {
                    client.quit();
                    console.log('\n✅ Redis bağlantısı kapatıldı.');
                }, 500);
            });
            
        }, 500);
        
    } catch (error) {
        console.error('❌ HATA:', error.message);
        client.quit();
    }
}

// Run demo
redisRealtimeDemo();