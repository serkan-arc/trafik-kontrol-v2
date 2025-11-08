# 🚀 HIZLI BAŞLANGIÇ KILAVUZU

## 📥 Yedeği Geri Yükleme

### 1. AI Drive'dan İndirme
```bash
# AI Drive yolu
/mnt/aidrive/files/webapp/traffic-control-system/traffic-control-systemv2/

# Dosyalar:
- traffic-control-systemv2-backup-20251106-170302.tar.gz (186MB)
- README.md (tam dokümantasyon)
- CHANGES.txt (değişiklik listesi)
- COMMIT_LOG.txt (git log)
- QUICK_START.md (bu dosya)
```

### 2. Yerel Makinede Açma
```bash
# İndirilen dizine git
cd ~/Downloads  # veya indirdiğiniz yer

# Tar dosyasını aç
tar -xzf traffic-control-systemv2-backup-20251106-170302.tar.gz

# Proje dizinine gir
cd traffic-control-system
```

### 3. Dependencies Kurulumu
```bash
npm install
```

---

## 🗄️ Database Kurulumu

### Migration 009'u Çalıştır
```bash
# PostgreSQL'e bağlan
psql -U postgres -d traffic_control_db

# Migration'ı çalıştır
\i migrations/009_notification_settings.sql

# Kontrol et
\dt notification_*
```

Çıktı şöyle olmalı:
```
notification_channels
notification_rules
notification_history
notification_templates
notification_throttle
```

---

## ⚙️ Environment Variables

`.env.local` oluştur:
```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/traffic_control_db

# GeoIP (ÖNERİLEN)
IPINFO_API_KEY=your_api_key_here

# Rate Limiting (OPSİYONEL)
REDIS_URL=redis://localhost:6379

# NextAuth (varsa)
NEXTAUTH_SECRET=your_secret_here
NEXTAUTH_URL=http://localhost:3000
```

**Not**: IPINFO_API_KEY almak için → https://ipinfo.io/signup

---

## 🏃 Uygulamayı Çalıştırma

### Development
```bash
npm run dev
```

Tarayıcıda aç: http://localhost:3000

### Production
```bash
npm run build
npm start
```

---

## ✅ Test Edilecek Özellikler

### 1. Bot Detection
- URL: http://localhost:3000/dashboard/global/bot-detection
- Test: Pattern ekle, enable/disable yap

### 2. Spam Control
- URL: http://localhost:3000/dashboard/global/spam-control
- Test: Spam pattern oluştur

### 3. Analytics
- URL: http://localhost:3000/dashboard/analytics
- Test: Time range değiştir, grafikleri gör

### 4. Notifications
- URL: http://localhost:3000/dashboard/settings/notifications
- Test: Email channel ekle, rule oluştur

### 5. Rate Limiting
- URL: http://localhost:3000/dashboard/settings/rate-limiting
- Test: Configuration ekle

### 6. GeoIP
- URL: http://localhost:3000/dashboard/settings/geoip
- Test: IP lookup yap, "My IP" butonunu dene

---

## 🔧 Sorun Giderme

### Chart.js Hatası
```bash
npm install chart.js react-chartjs-2
```

### Redis Bağlantı Hatası
Rate limiting in-memory fallback kullanır, sorun yok. Ama production için Redis önerilir:
```bash
# Redis kur (Ubuntu/Debian)
sudo apt install redis-server

# Başlat
sudo systemctl start redis
```

### Database Connection Hatası
```bash
# PostgreSQL'in çalıştığını kontrol et
sudo systemctl status postgresql

# Şifre sıfırla (gerekirse)
sudo -u postgres psql
ALTER USER postgres PASSWORD 'newpassword';
```

---

## 📊 Branch ve Commit Bilgileri

### Branch
```
genspark_ai_developer
```

### Son 7 Commit
```
16ca32c feat: add comprehensive GeoIP integration
05f2946 feat: add comprehensive API rate limiting system
ecf2b5a feat: add comprehensive email notification system
748d23e feat: add comprehensive analytics dashboard
807c810 feat: add spam control UI and API endpoints
c9417f2 feat: implement comprehensive global management system
```

---

## 🔄 Git İşlemleri

### Local'e Branch'i Çek
```bash
# Fetch
git fetch origin genspark_ai_developer

# Checkout
git checkout genspark_ai_developer

# Pull
git pull origin genspark_ai_developer
```

### Pull Request Oluştur
```bash
# GitHub CLI kullanıyorsanız
gh pr create --base main --head genspark_ai_developer --title "feat: Add 6 major features to Traffic Control System v2"

# Veya GitHub web interface'den:
# https://github.com/serkan-arc/tracking/compare/main...genspark_ai_developer
```

---

## 📞 Yardım

Tüm detaylar için `README.md` dosyasına bakın.

**İyi Çalışmalar! 🚀**
