# 🚀 TRAFİK MANAGER V3 - SİSTEM DURUMU

**Son Güncelleme:** 8 Kasım 2024 - 21:05  
**Sistem Versiyonu:** 3.0.0  
**Backup Lokasyonu:** `/home/root/system_backup_20251108_210300.tar.gz`

---

## 📊 HIZLI DURUM ÖZETİ

```
✅ Tüm Servisler  : ÇALIŞIYOR
✅ SSL Sertifikalar: GEÇERLİ (2026'ya kadar)
✅ Nginx           : AKTİF (6 site)
✅ PM2             : ONLINE
✅ Database        : BAĞLI
✅ Redis Cache     : AKTİF
```

---

## 🌐 AKTİF SERVİSLER

### 1. Traffic Control System (Ana Uygulama)
- **URL:** https://dtektracking.com
- **Port:** 3001
- **Tip:** PM2 (Next.js)
- **Durum:** ✅ Online
- **Login:** serkandogan@aiteldtek.com / Esvella2025136326.
- **Konum:** `/home/root/Trafic-manager-uretim-dosyasi`

### 2. PostgreSQL Admin (pgAdmin)
- **URL:** https://postgres.dtektracking.com
- **Port:** 5050
- **Tip:** Docker Container
- **Durum:** ✅ Running
- **Login:** admin@dtektracking.com / DtekAdmin2024!
- **DB Bağlantı:** postgres.dtekai.com:5432

### 3. Redis Commander
- **URL:** https://redis.dtektracking.com
- **Port:** 8081
- **Tip:** Node.js
- **Durum:** ✅ Running
- **Redis:** localhost:6379 (Password: DtekRedis2024!)

### 4. File Browser
- **URL:** https://dosya.dtektracking.com
- **Port:** 9001
- **Tip:** Binary
- **Durum:** ✅ Running
- **Login:** admin / DtekAdmin2024!

### 5. System Monitor
- **URL:** https://monitor.dtektracking.com
- **Port:** 61209
- **Tip:** Python/Flask
- **Durum:** ✅ Running
- **Özellikler:**
  - Sistem metrikleri (CPU, RAM, Disk, Network)
  - Notification monitoring
  - Failed notifications tracking
  - Service health checks

---

## 🔒 SSL SERTİFİKALARI

| Domain | Provider | Son Kullanma | Durum |
|--------|----------|--------------|-------|
| dtektracking.com | Let's Encrypt | 3 Şubat 2026 | ✅ Geçerli |
| postgres.dtektracking.com | Let's Encrypt | 6 Şubat 2026 | ✅ Geçerli |
| redis.dtektracking.com | Let's Encrypt | 6 Şubat 2026 | ✅ Geçerli |
| dosya.dtektracking.com | Let's Encrypt | 6 Şubat 2026 | ✅ Geçerli |
| monitor.dtektracking.com | Let's Encrypt | 6 Şubat 2026 | ✅ Geçerli |

**Auto-Renewal:** ✅ Aktif (Certbot)

---

## 🗄️ VERİTABANI

### PostgreSQL
- **Host:** postgres.dtekai.com
- **Port:** 5432
- **Database:** dtektracking
- **Tablolar:** 31 adet
- **Notification Tabloları:** 5 adet
  - notification_channels
  - notification_rules
  - notification_history
  - notification_templates
  - notification_throttle

### Redis Cache
- **Host:** localhost
- **Port:** 6379
- **Password:** DtekRedis2024!
- **Durum:** ✅ Connected

---

## 🔧 YAPILANDIRMA DOSYALARI

### Merkezi Konfigürasyon
- **Dosya:** `/home/root/webapp/SYSTEM_CONFIG.json`
- **İçerik:** Tüm servislerin detaylı yapılandırması
- **Kullanım:** Otomatik senkronizasyon ve health check için

### Health Check Script
- **Dosya:** `/home/root/webapp/health-check.sh`
- **Kullanım:** `./health-check.sh`
- **Özellikler:**
  - Port kontrolleri
  - HTTP endpoint testleri
  - PM2 durumu
  - Nginx durumu
  - Docker konteyner durumu
  - Redis bağlantısı
  - SSL sertifika kontrolleri

---

## 📝 SON YAPILAN DEĞİŞİKLİKLER (8 Kasım 2024)

### ✂️ Kaldırılanlar:
1. **glances.dtektracking.com**
   - Port 61208'e yönlendiriyordu
   - Servis çalışmıyordu
   - professional_monitor.py ile değiştirildi

2. **panel.dtektracking.com**
   - 3 farklı servise yönlendiriyordu (/pgadmin, /redis, /monitor)
   - Tüm servislerin ayrı domain'leri var
   - Gereksiz karmaşıklık

3. **Redis Commander Duplicate (Port 5540)**
   - Port 8081'deki ile aynı işi yapıyordu
   - Durduruldu

### ➕ Eklenenler:
1. **Merkezi Konfigürasyon Sistemi**
   - SYSTEM_CONFIG.json
   - Tek kaynak doğruluk

2. **Health Check Script**
   - Otomatik servis kontrolü
   - Renkli çıktı
   - Detaylı raporlama

3. **Monitor'e Notification Tracking**
   - 24 saat istatistikleri
   - Başarısız bildirimler listesi
   - Başarı oranı gösterimi
   - Weekly trend analizi

### 🔄 Güncellenenler:
1. **Nginx Konfigürasyonları**
   - Temizlendi (8 → 6 site)
   - Sadece çalışan servisler
   
2. **Dokümantasyon**
   - 11 dosya arşivlendi
   - Tek kaynak oluşturuldu (bu dosya)

---

## 🚀 HIZLI KOMUTLAR

### Servis Kontrolleri
```bash
# Health check
/home/root/webapp/health-check.sh

# PM2 durumu
pm2 status
pm2 logs traffic-control-prod --lines 50

# Nginx durumu
systemctl status nginx
nginx -t

# Redis test
redis-cli -a "DtekRedis2024!" ping
```

### Yeniden Başlatma
```bash
# PM2
pm2 restart traffic-control-prod

# Nginx
systemctl reload nginx

# Monitor
pkill -f professional_monitor.py
nohup python3 /home/root/webapp/professional_monitor.py > /home/root/webapp/monitor.log 2>&1 &

# FileBrowser
systemctl restart filebrowser
```

### Backup
```bash
# En son backup
ls -lh /home/root/system_backup_*.tar.gz | tail -1

# Yeni backup oluştur
cd /home/root && tar -czf system_backup_$(date +%Y%m%d_%H%M%S).tar.gz \
  /etc/nginx/sites-available \
  /etc/nginx/sites-enabled \
  ~/.pm2 \
  /home/root/webapp/trafik-manager-v3 \
  /home/root/Trafic-manager-uretim-dosyasi/ecosystem.config.js
```

---

## 🔍 SORUN GİDERME

### Servis Çalışmıyorsa
```bash
# 1. Port kontrolü
netstat -tlnp | grep <PORT>

# 2. Process kontrolü
ps aux | grep <SERVICE_NAME>

# 3. Health check
/home/root/webapp/health-check.sh

# 4. Logları kontrol et
# PM2: pm2 logs
# Nginx: tail -f /var/log/nginx/error.log
# Monitor: tail -f /home/root/webapp/monitor.log
```

### SSL Sertifika Yenileme
```bash
# Manuel yenileme
certbot renew

# Test (dry-run)
certbot renew --dry-run

# Belirli domain için
certbot renew --cert-name dtektracking.com
```

### Nginx 502/504 Hatası
```bash
# 1. Backend servis çalışıyor mu?
curl http://localhost:<PORT>

# 2. Nginx config testi
nginx -t

# 3. Nginx restart
systemctl restart nginx
```

---

## 📊 SİSTEM METRİKLERİ

### Kaynak Kullanımı
- **PM2 (traffic-control):** ~56 MB RAM, %0 CPU
- **Monitor (Python):** ~38 MB RAM, %1.7 CPU
- **FileBrowser:** ~29 MB RAM
- **Docker (pgAdmin):** Container içinde
- **Nginx:** ~23 MB RAM

### Network
- **Port Kullanımı:** 3001, 5050, 8081, 9001, 61209, 80, 443
- **SSL:** TLS 1.2+
- **HTTP/2:** Aktif

---

## 📞 DESTEK VE KAYNAKLAR

### Konfigürasyon Dosyaları
- Merkezi Config: `/home/root/webapp/SYSTEM_CONFIG.json`
- Nginx: `/etc/nginx/sites-available/`
- PM2: `/home/root/Trafic-manager-uretim-dosyasi/ecosystem.config.js`
- Monitor: `/home/root/webapp/professional_monitor.py`

### Log Dosyaları
- PM2: `/home/root/Trafic-manager-uretim-dosyasi/logs/`
- Nginx: `/var/log/nginx/`
- Monitor: `/home/root/webapp/monitor.log`
- System Cleanup: `/home/root/SYSTEM_CLEANUP_LOG.txt`

### Backup
- **Son Backup:** `2024-11-08 21:03:00`
- **Lokasyon:** `/home/root/system_backup_20251108_210300.tar.gz` (9.6 MB)
- **İçerik:** Nginx, PM2, Docs, Services, SSL info

---

## ✅ KONTROL LİSTESİ

Günlük kontroller için:

- [ ] Tüm servisler çalışıyor mu? (`/home/root/webapp/health-check.sh`)
- [ ] PM2 online mı? (`pm2 status`)
- [ ] Nginx aktif mi? (`systemctl status nginx`)
- [ ] SSL sertifikaları geçerli mi? (Health check script kontrol eder)
- [ ] Disk alanı yeterli mi? (`df -h`)
- [ ] Notification sistemi çalışıyor mu? (Monitor'den kontrol et)

Haftalık kontroller için:

- [ ] Backup alındı mı?
- [ ] Log dosyaları temizlendi mi?
- [ ] Gereksiz docker image'ları silindi mi? (`docker system prune`)
- [ ] Database backup alındı mı?

---

**Sistem Durumu:** ✅ **STABIL VE ÇALIŞIR DURUMDA**

*Bu dokümantasyon sisteminizin tek kaynak doğruluk noktasıdır. Değişiklik yapıldığında bu dosyayı güncelleyin.*

---

**Oluşturulma:** 8 Kasım 2024  
**Son Güncelleme:** 8 Kasım 2024 21:05  
**Sistem Versiyonu:** 3.0.0
