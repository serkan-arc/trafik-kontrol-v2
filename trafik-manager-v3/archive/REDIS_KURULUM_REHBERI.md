# 🔴 Redis ve RedisInsight Kurulum Rehberi
*Trafik Manager V3 - Redis Cache Sistemi*

## ✅ Redis Durumu

### Mevcut Redis Verileri:
```
🔑 Toplam Key Sayısı: 9
📊 Database: db0 (default)
```

### Key Listesi:
| Key | Tip | Açıklama | Örnek Değer |
|-----|-----|----------|-------------|
| `traffic:total_visits` | String | Toplam ziyaret sayısı | 1500 |
| `traffic:blocked_ips` | String | Engellenen IP sayısı | 45 |
| `traffic:allowed_ips` | String | İzin verilen IP sayısı | 1455 |
| `session:*` | String (JSON) | Kullanıcı oturumları | {userId, email, role} |
| `cache:dashboard_stats` | String (JSON) | Dashboard cache | {totalTraffic, uniqueVisitors} |
| `rate_limit:*` | String | Rate limiting sayacı | 5 (istek sayısı) |
| `ip_blacklist` | Set | Kara listedeki IP'ler | [192.168.1.100] |
| `ip_whitelist` | Set | Beyaz listedeki IP'ler | [192.168.1.1] |

---

## 🌐 RedisInsight Web Paneli

### Erişim:
- **URL:** https://redis.dtektracking.com
- **Alternatif:** http://207.180.204.60:5540

### İlk Kurulum Adımları:

#### 1. RedisInsight'a Giriş
1. Browser'da https://redis.dtektracking.com açın
2. "I have read and understood..." checkbox'ı işaretle
3. **Submit** butonuna tıklayın

#### 2. Redis Database Ekleme
1. **"Add Redis Database"** butonuna tıklayın
2. Aşağıdaki bilgileri girin:

```
Host: localhost (veya 172.17.0.1 docker için)
Port: 6379
Database Alias: Trafik Manager Cache
Username: (boş bırakın)
Password: (boş bırakın)
```

3. **"Test Connection"** butonuna tıklayın
4. Bağlantı başarılıysa **"Add Redis Database"** tıklayın

#### 3. Verileri Görüntüleme
- Sol menüden **"Browser"** sekmesine tıklayın
- Tüm key'leri göreceksiniz
- Key'e tıklayarak değerini görebilirsiniz

---

## 🖥️ Terminal Komutları

### Redis CLI Komutları:
```bash
# Redis'e bağlan
redis-cli

# Tüm key'leri listele
redis-cli keys "*"

# Belirli bir key'in değerini oku
redis-cli get "traffic:total_visits"

# JSON verisini oku
redis-cli get "cache:dashboard_stats"

# Set elemanlarını listele
redis-cli smembers "ip_blacklist"

# Database bilgisi
redis-cli info keyspace

# Key sayısı
redis-cli dbsize

# Belirli pattern'e göre key ara
redis-cli --scan --pattern "session:*"
redis-cli --scan --pattern "traffic:*"
redis-cli --scan --pattern "rate_limit:*"
```

### Test Verileri Ekleme:
```bash
# Traffic istatistikleri
redis-cli set traffic:total_visits 2000
redis-cli set traffic:blocked_ips 50

# Session verisi (1 saat TTL)
redis-cli setex session:test_user 3600 '{"userId":1,"email":"test@test.com"}'

# Rate limit (60 saniye TTL)
redis-cli setex rate_limit:api:/api/login:192.168.1.1 60 5

# IP listelerine ekleme
redis-cli sadd ip_blacklist "192.168.1.100"
redis-cli sadd ip_whitelist "192.168.1.1"
```

---

## 🔧 Production Entegrasyonu

### Environment Variables (.env.production):
```env
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

### Node.js Bağlantı Kodu:
```javascript
// lib/redis.ts
import { createClient } from 'redis';

const client = createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
  }
});

await client.connect();
```

### Kullanım Örnekleri:
```javascript
// Session kaydet
await client.setEx(`session:${userId}`, 3600, JSON.stringify(userData));

// Cache kaydet (5 dakika)
await client.setEx('cache:dashboard', 300, JSON.stringify(dashboardData));

// Rate limiting
const key = `rate_limit:${ip}:${endpoint}`;
const requests = await client.incr(key);
await client.expire(key, 60); // 60 saniye

// IP kontrolü
const isBlacklisted = await client.sIsMember('ip_blacklist', ip);
const isWhitelisted = await client.sIsMember('ip_whitelist', ip);
```

---

## 📊 Monitoring ve Performans

### RedisInsight'ta İzlenecekler:
1. **Memory Usage:** Bellek kullanımı
2. **Keys:** Toplam key sayısı
3. **Commands/sec:** Saniyedeki komut sayısı
4. **Connected Clients:** Bağlı client sayısı
5. **Expired Keys:** Süresi dolan key'ler

### Performance Metrikleri:
```bash
# Redis bilgileri
redis-cli info stats
redis-cli info memory
redis-cli info clients

# Yavaş sorguları göster
redis-cli slowlog get 10

# Memory kullanımı
redis-cli memory usage "cache:dashboard_stats"
```

---

## 🔍 Troubleshooting

### Sorun: RedisInsight'ta connection refused
**Çözüm:**
```bash
# Docker network IP'sini bul
docker inspect redis-insight | grep IPAddress
# Host olarak 172.17.0.1 kullan
```

### Sorun: PM2 Redis'e bağlanamıyor
**Çözüm:**
```bash
# .env.production kontrol et
cat .env.production | grep REDIS
# PM2 restart
pm2 restart traffic-control-prod --update-env
```

### Sorun: Redis memory doldu
**Çözüm:**
```bash
# Tüm verileri sil (DİKKAT!)
redis-cli flushdb
# Sadece expired key'leri temizle
redis-cli --scan --pattern "*" | xargs -I {} redis-cli ttl {}
```

---

## 📝 Notlar

1. **Redis şifresiz çalışıyor** - Production'da şifre eklenebilir
2. **Default database (db0)** kullanılıyor
3. **TTL (Time To Live)** session ve cache için aktif
4. **PM2 process** Redis'i kullanıyor
5. **RedisInsight** web arayüzü ile kolay yönetim

---

*Bu dokümantasyon Redis kurulumu ve kullanımı için hazırlanmıştır.*