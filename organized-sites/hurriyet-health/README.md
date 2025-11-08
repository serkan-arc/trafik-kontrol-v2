# 🏥 Hürriyet Health - Restore Edildi

**Tarih:** 2025-11-04  
**Konum:** `/home/root/webapp/organized-sites/hurriyet-health/`  
**Durum:** ✅ Backup'tan restore edildi

---

## 📂 PROJE BİLGİLERİ

### Domain Bilgileri:
```
🌐 Domain 1: hürriyetsağlıksonnhaberler.com (HTTP)
🌐 Domain 2: hürriyetrehberhaber.store (HTTPS + Video)
🔒 SSL: Let's Encrypt
```

### Teknoloji:
```
Backend: Express.js 5.1.0 (Node.js)
Database: SQLite3 (analytics.db - 252 KB, 687 ziyaret)
Port: 8080
Process Manager: PM2
```

---

## 🎥 VIDEO DESTEĞİ

Bu site **video içeriği** destekliyor:
- ✅ MP4
- ✅ WebM
- ✅ OGG
- ✅ AVI
- ✅ MOV

**NOT:** Video dosyaları backup'ta yok, ancak nginx config video desteğini içeriyor.

---

## 📊 PROJE YAPISI

```
hurriyet-health/
├── server.cjs                  # Express sunucu (Port 8080)
├── ecosystem.config.cjs        # PM2 config
├── package.json                # Dependencies
├── analytics.db                # SQLite database (687 visits)
├── smart-tracking.js           # Smart tracking logic
├── dynamic-stock-orders.js     # Sipariş yönetimi
├── tv-teasers-simple-fixed.js  # TV teasers
│
├── public/                     # Frontend dosyaları
│   ├── index.html              # Ana sayfa
│   ├── css/                    # Styles
│   ├── js/                     # JavaScript
│   ├── images/                 # Görseller
│   └── static/                 # Statik dosyalar
│
├── dist/                       # Build çıktıları
├── src/                        # Kaynak kodlar
├── data/                       # Data files
├── css/                        # CSS files
├── images/                     # Images
└── js/                         # JavaScript files
```

---

## 🚀 ÇALIŞTIRMA

### 1. Dependencies Kur:
```bash
cd /home/root/webapp/organized-sites/hurriyet-health
npm install
```

### 2. PM2 ile Başlat:
```bash
pm2 start ecosystem.config.cjs
```

### 3. Durumu Kontrol Et:
```bash
pm2 status
pm2 logs hurriyet-server
```

### 4. Test Et:
```bash
curl http://localhost:8080
```

---

## 🌐 NGINX KURULUM

### Nginx Config Dosyaları:
```
📂 Konum: /home/root/webapp/backups/production-20251019-041843/

Dosyalar:
├── nginx-hurriyet-health.conf (HTTP)
└── nginx-hurriyetrehberhaber.conf (HTTPS + Video)
```

### Kurulum:
```bash
# Config dosyasını kopyala
sudo cp /home/root/webapp/backups/production-20251019-041843/nginx-hurriyetrehberhaber.conf \
        /etc/nginx/sites-available/

# Sembolik link oluştur
sudo ln -s /etc/nginx/sites-available/nginx-hurriyetrehberhaber.conf \
            /etc/nginx/sites-enabled/

# Test et
sudo nginx -t

# Nginx'i yeniden yükle
sudo systemctl reload nginx
```

---

## 📊 ANALYTICS

### Database Bilgisi:
```
Dosya: analytics.db
Boyut: 252 KB
Ziyaretler: 687 visits
Tarih: 18-19 Ekim 2025
```

### Tracked Data:
- IP Address
- Country & City
- Device Type (mobile/desktop/bot)
- Browser & OS
- URL & Referrer
- UTM Parameters
- Facebook Click ID
- A/B Test Variant
- Response Time

---

## 🔒 GÜVENLİK ÖZELLİKLERİ

### Mobile-Only Access:
- Sadece mobil cihazlar erişebilir
- Desktop'tan 404 döner
- Facebook bot bypass (domain verification)

### Geo-Blocking:
- Türkiye: Sadece Facebook referrer ile
- Yurtdışı: Sadece Facebook Ads ile
- Admin IP bypass

### Rate Limiting:
- Pages: 30 req/min + 10 burst
- Static files: 100 req/min + 50 burst
- Forms: 5 req/min + 2 burst
- API: 10 req/min + 3 burst

---

## 📄 ÖNEMLİ DOSYALAR

### Backend:
- `server.cjs` - Ana Express sunucu
- `smart-tracking.js` - Ziyaretçi takip sistemi
- `dynamic-stock-orders.js` - Sipariş yönetimi
- `tv-teasers-simple-fixed.js` - TV teasers

### Config:
- `ecosystem.config.cjs` - PM2 configuration
- `package.json` - Node.js dependencies
- `.htaccess` - Apache config (public/)

### Frontend:
- `public/index.html` - Ana sayfa
- `public/css/` - Styles
- `public/js/` - JavaScript
- `public/images/` - Görseller

---

## 📋 PM2 ECOSYSTEM

### ecosystem.config.cjs:
```javascript
module.exports = {
  apps: [
    {
      name: 'hurriyet-server',
      script: './server.cjs',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
        PORT: 8080
      }
    }
  ]
}
```

---

## 🎯 HIZLI BAŞLATMA

```bash
# 1. Dizine git
cd /home/root/webapp/organized-sites/hurriyet-health

# 2. Dependencies kur
npm install

# 3. PM2 ile başlat
pm2 start ecosystem.config.cjs

# 4. Kontrol et
pm2 status
curl http://localhost:8080

# 5. Logları izle
pm2 logs hurriyet-server

echo "✅ Hürriyet Health çalışıyor!"
```

---

## 📦 BACKUP BİLGİSİ

### Kaynak Backup:
```
Dosya: /root/hurriyet-health-FINAL-20251013-235932.tar.gz
Boyut: 20.4 MB
Tarih: 2025-10-13 23:59
```

### Restore Tarihi:
```
Tarih: 2025-11-04
Restore Edilen Konum: /home/root/webapp/organized-sites/hurriyet-health/
Boyut: 23 MB
```

---

## ✅ DURUM

```
✅ Backup'tan restore edildi
✅ Tüm dosyalar mevcut
✅ Analytics.db kopyalandı
✅ Dependencies kurulabilir
✅ PM2 config hazır
✅ Nginx config hazır
✅ Çalıştırılmaya hazır
```

---

**Restore Eden:** Claude Code Agent  
**Tarih:** 2025-11-04  
**Durum:** ✅ Başarılı
