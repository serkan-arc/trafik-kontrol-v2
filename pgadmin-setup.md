# 📊 pgAdmin PostgreSQL Bağlantı Kurulum Rehberi

## 🔐 PostgreSQL Veritabanı Bilgileri (GÜNCEL)

```
Host: postgres.dtekai.com
Port: 5432
Database: dtektracking
Username: postgres
Password: T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s
```

## 📝 pgAdmin'de Server Ekleme Adımları

### 1. pgAdmin'e Giriş Yapın
- **URL:** https://postgres.dtektracking.com
- **Email:** serkandogan@aiteldtek.com
- **Şifre:** Esvella2025136326

### 2. Yeni Server Ekleme

1. **Sol menüde "Servers" üzerine sağ tıklayın**
2. **"Register" → "Server..." seçin**

### 3. General Tab (Genel Bilgiler)
```
Name: DTek Tracking Database
Comment: Production PostgreSQL Database
```

### 4. Connection Tab (Bağlantı Bilgileri)
```
Host name/address: postgres.dtekai.com
Port: 5432
Maintenance database: dtektracking
Username: postgres
Password: T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s
Save password?: ✅ (işaretleyin)
```

### 5. SSL Tab (Güvenlik)
```
SSL mode: Prefer (veya Require)
```

### 6. Advanced Tab (İleri Ayarlar)
```
DB restriction: dtektracking
(Sadece dtektracking veritabanını gösterir)
```

### 7. Save (Kaydet)
"Save" butonuna tıklayın.

---

## ✅ Bağlantı Başarılı Olduktan Sonra

### Göreceğiniz Tablolar (80+ tablo):
- **users** - Kullanıcı tablosu
- **traffic_logs** - Trafik kayıtları
- **ip_lists** - IP listeleri (blacklist/whitelist)
- **sessions** - Oturum bilgileri
- **campaigns** - Kampanyalar
- **sites** - Site yönetimi
- **leads** - Lead'ler
- **networks** - Network bilgileri
- **bot_detections** - Bot tespitleri
- **spam_patterns** - Spam kalıpları
- **rate_limits** - Rate limiting kuralları
- **geoip_rules** - Coğrafi IP kuralları
- Ve daha fazlası...

---

## 🔧 SQL Sorgu Örnekleri

### Kullanıcıları Listele:
```sql
SELECT * FROM users LIMIT 10;
```

### Toplam Trafik:
```sql
SELECT COUNT(*) as total_traffic FROM traffic_logs;
```

### Son 24 Saatteki Trafik:
```sql
SELECT * FROM traffic_logs 
WHERE created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### IP Blacklist:
```sql
SELECT * FROM ip_lists 
WHERE list_type = 'blacklist';
```

### Admin Kullanıcı:
```sql
SELECT * FROM users 
WHERE email = 'serkandogan@aiteldtek.com';
```

---

## 🚨 Sorun Giderme

### Hata: "password authentication failed"
**Çözüm:** Yukarıdaki şifreyi tam olarak kopyalayın (boşluksuz)

### Hata: "could not connect to server"
**Çözüm:** 
- Host: postgres.dtekai.com (local değil!)
- Port: 5432
- Firewall/VPN kontrolü yapın

### Hata: "database does not exist"
**Çözüm:** Maintenance database: dtektracking

---

## 📊 Database İstatistikleri

```sql
-- Tablo sayısı
SELECT COUNT(*) FROM information_schema.tables 
WHERE table_schema = 'public';

-- Database boyutu
SELECT pg_database_size('dtektracking');

-- En büyük tablolar
SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

---

## 🔗 Hızlı Erişim

- **pgAdmin:** https://postgres.dtektracking.com
- **Redis Commander:** https://redis.dtektracking.com
- **System Monitor:** https://monitor.dtektracking.com
- **Ana Site:** https://dtektracking.com
- **Dosya Yöneticisi:** https://dosya.dtektracking.com

---

*Bu dokümantasyonu kullanarak pgAdmin'de PostgreSQL veritabanınıza bağlanabilirsiniz.*