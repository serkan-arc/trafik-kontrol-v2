const redis = require('redis');

async function testRedisConnection() {
  console.log('🔴 Redis Bağlantı Testi Başlatılıyor...\n');
  
  // Redis client oluştur (şifresiz)
  const client = redis.createClient({
    socket: {
      host: 'localhost',
      port: 6379
    }
  });

  // Error handler
  client.on('error', (err) => {
    console.error('❌ Redis Client Error:', err);
  });

  client.on('connect', () => {
    console.log('✅ Redis\'e bağlandı!');
  });

  try {
    // Bağlan
    await client.connect();
    
    // Test verisi ekle
    console.log('\n📝 Test Verileri Ekleniyor...');
    
    // Traffic control test verileri
    await client.set('traffic:total_visits', '1500');
    await client.set('traffic:blocked_ips', '45');
    await client.set('traffic:allowed_ips', '1455');
    
    // Session test verisi
    await client.setEx('session:test_user_123', 3600, JSON.stringify({
      userId: 1,
      email: 'serkandogan@aiteldtek.com',
      role: 'admin'
    }));
    
    // Rate limit test verisi
    await client.setEx('rate_limit:api:/api/auth/login:192.168.1.1', 60, '5');
    
    // Cache test verisi
    await client.setEx('cache:dashboard_stats', 300, JSON.stringify({
      totalTraffic: 15000,
      uniqueVisitors: 3500,
      blockedRequests: 450,
      timestamp: new Date().toISOString()
    }));

    // IP listesi
    await client.sAdd('ip_blacklist', '192.168.1.100', '10.0.0.50', '172.16.0.25');
    await client.sAdd('ip_whitelist', '192.168.1.1', '192.168.1.2');
    
    console.log('✅ Test verileri eklendi!\n');
    
    // Verileri oku ve göster
    console.log('📊 Mevcut Veriler:\n');
    
    const totalVisits = await client.get('traffic:total_visits');
    console.log('Total Visits:', totalVisits);
    
    const blockedIps = await client.get('traffic:blocked_ips');
    console.log('Blocked IPs:', blockedIps);
    
    const sessionData = await client.get('session:test_user_123');
    console.log('Session Data:', JSON.parse(sessionData));
    
    const cacheData = await client.get('cache:dashboard_stats');
    console.log('Cache Data:', JSON.parse(cacheData));
    
    const blacklist = await client.sMembers('ip_blacklist');
    console.log('IP Blacklist:', blacklist);
    
    const whitelist = await client.sMembers('ip_whitelist');
    console.log('IP Whitelist:', whitelist);
    
    // Database bilgisi
    const info = await client.dbSize();
    console.log('\n📈 Toplam Key Sayısı:', info);
    
    // Key listesi
    const keys = await client.keys('*');
    console.log('\n🔑 Tüm Key\'ler:');
    keys.forEach(key => console.log('  -', key));
    
    console.log('\n✨ Redis bağlantı testi başarılı!');
    
  } catch (error) {
    console.error('❌ Hata:', error);
  } finally {
    // Bağlantıyı kapat
    await client.quit();
    console.log('\n👋 Redis bağlantısı kapatıldı.');
  }
}

// Testi çalıştır
testRedisConnection();