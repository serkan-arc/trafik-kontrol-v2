# n8n Kurulum Durum Raporu

**Tarih:** 2025-11-08 22:43  
**Durum:** Docker container - PostgreSQL bağlantı problemi

## ✅ TAMAMLANAN İŞLEMLER

1. **PostgreSQL Veritabanı:**
   - Database: `n8n_db` oluşturuldu
   - User: `n8n_user` oluşturuldu  
   - Password: `N8nDtek2024!`
   - pg_hba.conf'a Docker network'leri eklendi (172.17.0.0/16, 172.19.0.0/16)
   - listen_addresses = '*' yapılandırıldı

2. **Redis:**
   - Port 6379 çalışıyor
   - Password: `DtekRedis2024!`

3. **Docker Containers:**
   - n8n image pulled
   - docker-compose.yml hazırlandı (1 main + 5 workers)
   - Encryption keys oluşturuldu

4. **Nginx:**
   - Geçici HTTP konfigürasyonu oluşturuldu
   - Final HTTPS konfigürasyonu hazır (SSL sonrası)

## 🔴 SORUN

Docker container'dan PostgreSQL'e bağlantı kurulamıyor:
- Container'lar 172.19.0.x network'ünde
- PostgreSQL gateway erişimi takılıyor
- n8n container'ı sürekli crash loop'a giriyor

## 💡 ÇÖZÜM ÖNERİLERİ

### Seçenek 1: PostgreSQL Container (ÖNERİLEN)
Mevcut host PostgreSQL yerine, Docker container'da PostgreSQL kullan:

```yaml
services:
  postgres:
    image: postgres:16
    container_name: n8n-postgres
    environment:
      - POSTGRES_DB=n8n_db
      - POSTGRES_USER=n8n_user
      - POSTGRES_PASSWORD=N8nDtek2024!
    volumes:
      - n8n_postgres_data:/var/lib/postgresql/data
    networks:
      - n8n-network
  
  n8n-main:
    environment:
      - DB_POSTGRESDB_HOST=postgres  # Container name
      # ... diğer ayarlar
    depends_on:
      - postgres
```

**Avantajlar:**
- Network izolasyonu sorunları ortadan kalkar
- Container'lar arası iletişim daha kolay
- Production-ready mimari

### Seçenek 2: Network Mode Host
docker-compose.yml'de `network_mode: host` kullan:

```yaml
services:
  n8n-main:
    network_mode: host
    environment:
      - DB_POSTGRESDB_HOST=localhost
```

**Dezavantajları:**
- Port çakışmaları olabilir
- Container izolasyonu azalır

### Seçenek 3: SQLite (Geliştirme İçin)
Basit kurulum için SQLite kullan, sonra migrate et:

```yaml
environment:
  - DB_TYPE=sqlite
```

**Sınırlamalar:**
- Multi-worker desteklemez
- Production için uygun değil

## 🚀 ÖNERİLEN AKSIY ON

**1. Seçenek 1 ile devam et** (PostgreSQL Container):
- Mevcut docker-compose.yml'i güncelle
- PostgreSQL container ekle
- Tüm container'ları yeniden başlat
- Test et

**2. DNS kaydını hazırla:**
```
Type: A
Name: n8n  
Value: 207.180.204.60
```

**3. Kurulum tamamlandıktan sonra:**
- SSL sertifikası al
- Nginx HTTPS config aktif et
- SYSTEM_CONFIG.json güncelle

## 📁 DOSYALAR

- `/home/root/webapp/n8n-deployment/docker-compose.yml` - Asıl config (5 worker)
- `/home/root/webapp/n8n-deployment/.env` - Encryption keys
- `/home/root/webapp/n8n-deployment/N8N_SETUP_SUMMARY.md` - Detaylı kurulum dökümanı
- `/etc/nginx/sites-available/n8n.dtektracking.com` - Nginx HTTPS config (SSL sonrası)
- `/etc/nginx/sites-available/n8n.dtektracking.com.temp` - Nginx HTTP config (aktif)

## 🔑 ÖNEMLİ BİLGİLER

**Database:**
```
Host: localhost (host PostgreSQL)
Port: 5432
Database: n8n_db
User: n8n_user
Password: N8nDtek2024!
```

**Redis:**
```
Host: localhost
Port: 6379
Password: DtekRedis2024!
```

**Encryption Keys:**
```
N8N_ENCRYPTION_KEY=+BaCbS+x2sDClUcKRzOeco143Ll8cWXtAFq/cVfTB8A=
N8N_JWT_SECRET=nC2TYM0kyc5mnRa3T9eFouXfk/iS7F1fHUksJt6HA94=
```

## 📞 SONRAKI ADIM

**Karar gerekiyor:** Hangi çözüm ile devam edilecek?

1. PostgreSQL Container (önerilen - isolated)
2. Network Mode Host (hızlı ama riskli)  
3. SQLite (sadece test)

