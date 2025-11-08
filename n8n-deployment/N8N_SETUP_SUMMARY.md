# n8n Multi-Worker Kurulum Özeti

## ✅ TAMAMLANAN İŞLEMLER

### 1. PostgreSQL Veritabanı Hazırlığı
- **Database:** n8n_db
- **User:** n8n_user
- **Password:** N8nDtek2024!
- **Port:** 5432 (localhost)
- **Status:** ✅ Oluşturuldu ve yapılandırıldı

### 2. Redis Queue Yapılandırması
- **Host:** localhost
- **Port:** 6379
- **Password:** DtekRedis2024!
- **Status:** ✅ Mevcut ve kullanıma hazır

### 3. Docker Containers
```
┌─────────────────┬──────────────────────────────┬────────┐
│ Container       │ Role                         │ Status │
├─────────────────┼──────────────────────────────┼────────┤
│ n8n-main        │ Main UI + Webhook + Editor   │   ✅   │
│ n8n-worker-1    │ Workflow Executor Worker     │   ✅   │
│ n8n-worker-2    │ Workflow Executor Worker     │   ✅   │
│ n8n-worker-3    │ Workflow Executor Worker     │   ✅   │
│ n8n-worker-4    │ Workflow Executor Worker     │   ✅   │
│ n8n-worker-5    │ Workflow Executor Worker     │   ✅   │
└─────────────────┴──────────────────────────────┴────────┘
```

**Exposed Port:** 5678 (n8n-main)

### 4. Nginx Reverse Proxy
- **Domain:** n8n.dtektracking.com
- **Temporary Config:** ✅ HTTP yapılandırması aktif
- **SSL Config:** ⏳ DNS kaydı sonrası aktif olacak

### 5. Architecture Overview
```
                    ┌──────────────────────┐
                    │   Client Requests    │
                    │   (HTTPS/WebSocket)  │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   Nginx (Port 80)    │
                    │  n8n.dtektracking.com│
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │   n8n-main (5678)    │
                    │   - UI/Editor        │
                    │   - Webhooks         │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
     ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
     │  PostgreSQL    │ │  Redis Queue   │ │  Shared Volume │
     │  (n8n_db)      │ │  (Bull Queue)  │ │  (n8n_data)    │
     │  Port 5432     │ │  Port 6379     │ │                │
     └────────────────┘ └────────┬───────┘ └────────────────┘
                                 │
              ┌──────────────────┴──────────────────┐
              │                                     │
              ▼                                     ▼
     ┌─────────────────┐                  ┌─────────────────┐
     │  Worker Pool 1-3 │                  │  Worker Pool 4-5 │
     │  - n8n-worker-1  │                  │  - n8n-worker-4  │
     │  - n8n-worker-2  │                  │  - n8n-worker-5  │
     │  - n8n-worker-3  │                  │                  │
     └─────────────────┘                  └─────────────────┘
         Execution                            Execution
         Queue Mode                           Queue Mode
```

## 🔴 GEREKLI DNS KAYDI

**n8n paneline erişim için DNS kaydı eklemeniz gerekiyor:**

```
Type: A Record
Name: n8n
Value: 207.180.204.60
TTL: 300 (veya otomatik)
```

**Cloudflare üzerinden eklenecek:**
1. Cloudflare Dashboard → dtektracking.com domain
2. DNS → Add Record
3. Type: A, Name: n8n, IPv4: 207.180.204.60
4. Proxy status: DNS only (gri bulut)
5. Save

## 📋 DNS KAYDI EKLENDİKTEN SONRA

DNS kaydı aktif olduktan sonra (5-10 dakika), şu komutları çalıştırın:

```bash
# 1. SSL sertifikası al
cd /home/root
sudo certbot certonly --webroot -w /var/www/html -d n8n.dtektracking.com \
  --non-interactive --agree-tos --email admin@dtektracking.com

# 2. Final nginx yapılandırmasını aktif et
sudo ln -sf /etc/nginx/sites-available/n8n.dtektracking.com \
  /etc/nginx/sites-enabled/n8n.dtektracking.com
sudo nginx -t && sudo systemctl reload nginx

# 3. SYSTEM_CONFIG.json'a ekle
cd /home/root/webapp
# JSON güncelleme komutları buraya eklenecek
```

## 🌐 ERİŞİM BİLGİLERİ

### Geçici Erişim (HTTP - Sadece Test):
- **URL:** http://207.180.204.60:5678
- **Status:** ✅ Şu anda erişilebilir

### Final Erişim (DNS sonrası):
- **URL:** https://n8n.dtektracking.com
- **Status:** ⏳ DNS kaydı bekleniyor

## 🔧 DOCKER COMPOSE KOMUTLARI

```bash
cd /home/root/webapp/n8n-deployment

# Container'ları göster
docker compose ps

# Logları izle
docker compose logs -f

# Yeniden başlat
docker compose restart

# Durdur
docker compose stop

# Başlat
docker compose up -d

# Kaldır (VERİLER SİLİNMEZ - volume korunur)
docker compose down
```

## 📊 SYSTEM_CONFIG.json Güncellemesi

DNS ve SSL tamamlandıktan sonra eklenecek:

```json
{
  "n8n": {
    "port": 5678,
    "domain": "n8n.dtektracking.com",
    "type": "automation",
    "workers": 5,
    "database": "postgresql",
    "queue": "redis",
    "status": "active"
  }
}
```

## 🎯 SONRAKI ADIMLAR

1. ✅ PostgreSQL veritabanı oluşturuldu
2. ✅ Docker containers başlatıldı (1 main + 5 workers)
3. ✅ Nginx geçici konfigürasyonu hazır
4. 🔴 **DNS kaydı ekle** (Cloudflare üzerinden)
5. ⏳ DNS propagation bekle (5-10 dakika)
6. ⏳ SSL sertifikası al (certbot)
7. ⏳ Final nginx config aktif et
8. ⏳ SYSTEM_CONFIG.json güncelle
9. ⏳ İlk n8n kullanıcısı oluştur

## 📞 DESTEK BİLGİLERİ

**Encryption Keys:**
- N8N_ENCRYPTION_KEY: +BaCbS+x2sDClUcKRzOeco143Ll8cWXtAFq/cVfTB8A=
- N8N_JWT_SECRET: nC2TYM0kyc5mnRa3T9eFouXfk/iS7F1fHUksJt6HA94=

**Database Connection String:**
```
postgresql://n8n_user:N8nDtek2024!@localhost:5432/n8n_db
```

**Redis Connection String:**
```
redis://:DtekRedis2024!@localhost:6379
```

---

**Tarih:** 2025-11-08 22:36  
**Durum:** DNS kaydı bekleniyor  
**Sonraki Aksiyon:** Cloudflare'den A kaydı ekle
