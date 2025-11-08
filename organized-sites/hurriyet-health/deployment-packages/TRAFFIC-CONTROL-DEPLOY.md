# 🚀 Traffic Control System'e Deploy Rehberi

**Panel URL:** https://garantor360.com/dashboard/sites/deploy  
**Kullanıcı:** Traffic Control System panelinden "Deploy New Site" kullanarak

---

## ⚠️ ÖNEMLİ: Panel Sadece ZIP Dosyası Kabul Ediyor!

Traffic Control System paneli **sadece `.zip` dosyaları** kabul ediyor (`.tar.gz` değil).

**Kaynak Kod:**
```typescript
// /app/api/sites/upload/route.ts - Satır 58-66
if (!file.name.endsWith('.zip')) {
  return NextResponse.json({
    success: false,
    error: 'Only ZIP files are allowed'
  }, { status: 400 });
}
```

---

## 📦 ZIP DOSYALARI NASIL OLUŞTURULUR?

### Gereksinim: zip komutu

```bash
# Ubuntu/Debian sunucuda zip kurulumu
sudo apt-get update
sudo apt-get install -y zip

# Kurulum kontrolü
zip --version
```

---

## 🎯 DEPLOY İÇİN ZIP PAKETLEME

### 1️⃣ HTML-Static İçin:

```bash
cd /home/root/webapp/organized-sites/hurriyet-health/deployment-packages

# Klasörün içeriğini zip'le (klasör adı olmadan)
cd html-static
zip -r ../hurriyet-health-static.zip .
cd ..

# Veya tek komutla:
zip -r hurriyet-health-static.zip html-static/*

# Kontrol
ls -lh hurriyet-health-static.zip
unzip -l hurriyet-health-static.zip | head -20
```

**Boyut:** ~6.5 MB

---

### 2️⃣ Node.js-Fullstack İçin:

```bash
cd /home/root/webapp/organized-sites/hurriyet-health/deployment-packages

# Klasörün içeriğini zip'le
cd nodejs-fullstack
zip -r ../hurriyet-health-fullstack.zip .
cd ..

# Veya tek komutla:
zip -r hurriyet-health-fullstack.zip nodejs-fullstack/*

# Kontrol
ls -lh hurriyet-health-fullstack.zip
unzip -l hurriyet-health-fullstack.zip | head -20
```

**Boyut:** ~7 MB

---

## 📋 DEPLOY ADIMLARI (Traffic Control Panel)

### Adım 1: Panel'e Giriş

```
1. https://garantor360.com/dashboard adresine git
2. Login yap
3. Sol menüden "Sites" → "Deploy New Site" tıkla
```

---

### Adım 2: ZIP Dosyası Yükle

**Panel ekranında 2 seçenek var:**

#### Seçenek A: 📤 ZIP Yükle (Önerilen)
```
1. "📤 ZIP Yükle" seçeneğini tıkla
2. "Tıklayın veya sürükle-bırak yapın" alanına:
   - hurriyet-health-static.zip (HTML için)
   - hurriyet-health-fullstack.zip (Node.js için)
3. Site Adı: hurriyet-health (otomatik doldurulur)
4. "Yükle & Devam Et" butonuna tıkla
```

**Alternatif:** SCP ile sunucuya yükle
```bash
# Local makinenden:
scp hurriyet-health-static.zip root@garantor360.com:/tmp/

# Veya panel sunucusunda direkt oluştur (yukarıdaki komutlarla)
```

#### Seçenek B: 📁 Sunucudaki Klasör
```
1. "📁 Sunucudaki Klasör" seçeneğini tıkla
2. Arama kutusuna: "hurriyet" yaz
3. Klasör listesinden seç:
   /home/root/webapp/organized-sites/hurriyet-health/deployment-packages/html-static
   (veya nodejs-fullstack)
4. "Devam Et" butonuna tıkla
```

---

### Adım 3: Site Yapılandırma

**Panel otomatik dolduracak, ama kontrol et:**

#### HTML-Static İçin:
```
Site Name: hurriyet-health-static
Domain: hurriyetsaglik.com (veya boş bırak)
Site Type: Static HTML ✅
Port: 8080 (boş domain için gerekli)

SSL Configuration:
☐ Request SSL certificate (domain varsa işaretle)
```

#### Node.js-Fullstack İçin:
```
Site Name: hurriyet-health
Domain: hurriyetsaglik.com (veya boş bırak)
Site Type: Node.js ✅
Clean Version Port: 8080
Gray Version Port: 8081 (opsiyonel)
Aggressive Port: 8082 (opsiyonel)

SSL Configuration:
☑ Request SSL certificate (domain varsa)
Email: admin@hurriyetsaglik.com
```

**"Deploy Site"** butonuna tıkla!

---

### Adım 4: Deploy İşlemi

Panel otomatik olarak:

```
✅ 1. Site kaydı oluştur (PostgreSQL)
✅ 2. Dosyaları yerleştir (/home/root/webapp/deployed-sites/)
✅ 3. PM2 process başlat (Node.js için)
✅ 4. Nginx config oluştur
✅ 5. SSL sertifikası al (domain varsa)
✅ 6. Nginx reload
```

**Deploy log'u gerçek zamanlı görünecek.**

---

### Adım 5: Test & Doğrulama

Deploy tamamlandıktan sonra:

```bash
# Domain ile:
https://hurriyetsaglik.com

# IP + Port ile (domain yoksa):
http://your-server-ip:8080

# Panel'den kontrol:
Dashboard → Sites → Manage → Site listesinde görünecek
```

---

## 🔧 DEPLOY SONRASI YÖNETİM

### Site Yönetimi:

```
Dashboard → Sites → Manage → Siteni seç

Yapabileceklerin:
✅ Site bilgilerini düzenle
✅ Domain ekle/değiştir
✅ SSL ekle/kaldır
✅ PM2 process yönet
✅ Nginx config düzenle
✅ Site loglarını gör
✅ Siteyi sil
```

---

## ⚠️ SORUN GİDERME

### ZIP Yükleme Hatası:

**Hata:** "Only ZIP files are allowed"
```bash
# Çözüm: Dosya uzantısını kontrol et
file hurriyet-health-static.zip
# Çıktı: Zip archive data olmalı

# Eğer .tar.gz ise, zip'e çevir:
tar -xzf file.tar.gz
zip -r file.zip extracted-folder/
```

---

### Dosya Boyutu Çok Büyük:

**Limit:** 100 MB (MAX_FILE_SIZE)

```bash
# Boyutu kontrol et
ls -lh hurriyet-health-static.zip

# Eğer >100MB ise, gereksiz dosyaları temizle:
# - node_modules/ (zip'e ekleme!)
# - .git/
# - .DS_Store
# - *.log
```

**Node.js için:** package.json + kaynak dosyalar yeter, `node_modules/` ZİP'E EKLEME!

---

### Deploy Sonrası Site Açılmıyor:

```bash
# 1. PM2 kontrol
pm2 list
pm2 logs hurriyet-health

# 2. Port kontrol
sudo netstat -tulpn | grep 8080

# 3. Nginx kontrol
sudo nginx -t
sudo systemctl status nginx

# 4. Site Yönetimi panelinden logları incele
```

---

## 📊 ZIP İÇERİK YAPISI

### ✅ DOĞRU ZIP Yapısı (İçerik direkt root'ta):

```
hurriyet-health-static.zip
├── index.html          ✅ Root'ta
├── css/
│   └── style.css
├── js/
│   └── script.js
├── images/
└── robots.txt
```

**Nasıl oluşturulur:**
```bash
cd html-static/
zip -r ../hurriyet-health-static.zip .
# Veya:
zip -r hurriyet-health-static.zip html-static/*
```

---

### ❌ YANLIŞ ZIP Yapısı (Klasör içinde klasör):

```
hurriyet-health-static.zip
└── html-static/          ❌ Gereksiz wrapper klasör
    ├── index.html
    ├── css/
    └── ...
```

**Bu hatayı yapma:**
```bash
# YANLIŞ:
zip -r hurriyet-health-static.zip html-static/
# Bu şekilde html-static/ klasörü zip içine girer!
```

---

## 🎯 HIZLI KOMUTLAR

### Sunucuda Zip Oluştur:

```bash
# HTML-Static
cd /home/root/webapp/organized-sites/hurriyet-health/deployment-packages/html-static
zip -r ../hurriyet-health-static.zip .

# Node.js-Fullstack
cd /home/root/webapp/organized-sites/hurriyet-health/deployment-packages/nodejs-fullstack
zip -r ../hurriyet-health-fullstack.zip .

# Kontrol
cd ..
ls -lh *.zip
unzip -l hurriyet-health-static.zip | head -20
```

---

### Local Makineden Sunucuya Yükle:

```bash
# ZIP'i sunucuya kopyala
scp hurriyet-health-static.zip root@garantor360.com:/tmp/

# Sunucuda:
mv /tmp/hurriyet-health-static.zip /home/root/webapp/site-uploads/

# Panel'den "Sunucudaki Klasör" ile kullan
# Veya ZIP'i extract edip path'i panel'e ver
```

---

## ✅ SONUÇ

```
1. ✅ zip komutu kur: sudo apt-get install zip
2. ✅ ZIP dosyası oluştur: cd klasor && zip -r ../site.zip .
3. ✅ Panel'e git: https://garantor360.com/dashboard/sites/deploy
4. ✅ ZIP yükle veya sunucu klasörü seç
5. ✅ Yapılandır: Domain, Port, SSL
6. ✅ Deploy butonuna tıkla
7. ✅ Site yayında! 🎉
```

---

## 📚 EK BİLGİLER

### Panel Tarafından Desteklenen Site Tipleri:

- ✅ **Static HTML**: Sadece HTML/CSS/JS (npx serve ile çalışır)
- ✅ **Node.js**: Express, custom Node.js apps
- ✅ **Next.js**: Next.js uygulamaları
- ✅ **React**: React SPA'ler

### Panel Tarafından Otomatik Algılanan Dosyalar:

- `next.config.js` → Next.js
- `package.json` + `react` dependency → React
- `package.json` → Node.js
- `server.js` / `app.js` → Node.js
- `index.html` → Static

---

**Hazırlayan:** Claude Code Agent  
**Tarih:** 2025-11-04  
**Panel:** Traffic Control System  
**Durum:** ✅ Kullanıma hazır!
