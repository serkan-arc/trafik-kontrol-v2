# 📦 OzPhyzen Site Paketleri - Deployment Rehberi

**Oluşturulma Tarihi:** 2025-11-04  
**Toplam Paket:** 6  
**Toplam Boyut:** 113 MB

---

## 📋 PAKET LİSTESİ

### Port 4001: Aggressive WhatsApp Landing Page
**Dosya Adı:** `ozphyzen_aggressive_whatsapp_2025-11-04.tar.gz`  
**Boyut:** 19 MB  
**İçerik:** 
- whatsapp.html (ana sayfa)
- css/, js/, images/, _next/ (assets)
- WhatsApp odaklı agresif pazarlama landing page

**PM2 Komutu:**
```bash
tar -xzf ozphyzen_aggressive_whatsapp_2025-11-04.tar.gz
cd whatsapp/
pm2 start "npx serve -s . -l 4001" --name "ozphyzen-aggressive-whatsapp"
```

---

### Port 4002: WhatsApp V2 Landing Page
**Dosya Adı:** `ozphyzen_whatsapp_v2_2025-11-04.tar.gz`  
**Boyut:** 19 MB  
**İçerik:**
- whatsapp-v2.html (ana sayfa)
- css/, js/, images/, _next/ (assets)
- WhatsApp landing page versiyon 2

**PM2 Komutu:**
```bash
tar -xzf ozphyzen_whatsapp_v2_2025-11-04.tar.gz
cd whatsapp-v2/
pm2 start "npx serve -s . -l 4002" --name "ozphyzen-whatsapp-v2"
```

---

### Port 4003: Main Product Page
**Dosya Adı:** `ozphyzen_main_2025-11-04.tar.gz`  
**Boyut:** 19 MB  
**İçerik:**
- index.html (ana sayfa)
- css/, js/, images/, _next/ (assets)
- OzPhyzen ana ürün sayfası

**PM2 Komutu:**
```bash
tar -xzf ozphyzen_main_2025-11-04.tar.gz
cd main/
pm2 start "npx serve -s . -l 4003" --name "ozphyzen-main"
```

---

### Port 4004: Main Product Page V2
**Dosya Adı:** `ozphyzen_main_v2_2025-11-04.tar.gz`  
**Boyut:** 19 MB  
**İçerik:**
- index-v2.html (ana sayfa)
- css/, js/, images/, _next/ (assets)
- OzPhyzen ana ürün sayfası versiyon 2

**PM2 Komutu:**
```bash
tar -xzf ozphyzen_main_v2_2025-11-04.tar.gz
cd main-v2/
pm2 start "npx serve -s . -l 4004" --name "ozphyzen-main-v2"
```

---

### Port 4005: Site V2 Alternative Design
**Dosya Adı:** `ozphyzen_site_v2_2025-11-04.tar.gz`  
**Boyut:** 19 MB  
**İçerik:**
- site-v2.html (ana sayfa)
- css/, js/, images/, _next/ (assets)
- OzPhyzen alternatif site tasarımı

**PM2 Komutu:**
```bash
tar -xzf ozphyzen_site_v2_2025-11-04.tar.gz
cd site-v2/
pm2 start "npx serve -s . -l 4005" --name "ozphyzen-site-v2"
```

---

### Port 4006: Aydınlanma Metni (Legal/Info)
**Dosya Adı:** `ozphyzen_aydinlanma_2025-11-04.tar.gz`  
**Boyut:** 19 MB  
**İçerik:**
- aydinlanma.html (ana sayfa)
- css/, js/, images/, _next/ (assets)
- Bilgilendirme ve aydınlanma metni sayfası

**PM2 Komutu:**
```bash
tar -xzf ozphyzen_aydinlanma_2025-11-04.tar.gz
cd aydinlanma/
pm2 start "npx serve -s . -l 4006" --name "ozphyzen-aydinlanma"
```

---

## 🚀 HIZLI DEPLOYMENT

### Tüm Siteleri Tek Seferde Deploy Et:

```bash
#!/bin/bash

# Deployment klasörü oluştur
mkdir -p ~/ozphyzen-deployments
cd ~/ozphyzen-deployments

# 1. Aggressive WhatsApp (Port 4001)
mkdir -p aggressive-whatsapp && cd aggressive-whatsapp
tar -xzf ~/ozphyzen_aggressive_whatsapp_2025-11-04.tar.gz
pm2 start "npx serve -s . -l 4001" --name "ozphyzen-aggressive-whatsapp"
cd ..

# 2. WhatsApp V2 (Port 4002)
mkdir -p whatsapp-v2 && cd whatsapp-v2
tar -xzf ~/ozphyzen_whatsapp_v2_2025-11-04.tar.gz
pm2 start "npx serve -s . -l 4002" --name "ozphyzen-whatsapp-v2"
cd ..

# 3. Main (Port 4003)
mkdir -p main && cd main
tar -xzf ~/ozphyzen_main_2025-11-04.tar.gz
pm2 start "npx serve -s . -l 4003" --name "ozphyzen-main"
cd ..

# 4. Main V2 (Port 4004)
mkdir -p main-v2 && cd main-v2
tar -xzf ~/ozphyzen_main_v2_2025-11-04.tar.gz
pm2 start "npx serve -s . -l 4004" --name "ozphyzen-main-v2"
cd ..

# 5. Site V2 (Port 4005)
mkdir -p site-v2 && cd site-v2
tar -xzf ~/ozphyzen_site_v2_2025-11-04.tar.gz
pm2 start "npx serve -s . -l 4005" --name "ozphyzen-site-v2"
cd ..

# 6. Aydınlanma (Port 4006)
mkdir -p aydinlanma && cd aydinlanma
tar -xzf ~/ozphyzen_aydinlanma_2025-11-04.tar.gz
pm2 start "npx serve -s . -l 4006" --name "ozphyzen-aydinlanma"
cd ..

# PM2 kaydet
pm2 save

echo "✅ Tüm siteler başarıyla deploy edildi!"
pm2 list
```

---

## 🔧 NGINX KONFİGÜRASYONU

Her site için örnek nginx config:

```nginx
# ozphyzen-aggressive-whatsapp.conf
server {
    server_name whatsapp.ozphyzen.com;
    
    location / {
        proxy_pass http://127.0.0.1:4001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    listen 443 ssl;
    ssl_certificate /etc/letsencrypt/live/whatsapp.ozphyzen.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/whatsapp.ozphyzen.com/privkey.pem;
}

server {
    listen 80;
    server_name whatsapp.ozphyzen.com;
    return 301 https://$server_name$request_uri;
}
```

---

## 📊 SİTE ÖZELLİKLERİ

| Site | Port | HTML Dosyası | Kategori | Amaç |
|------|------|-------------|----------|------|
| Aggressive WhatsApp | 4001 | whatsapp.html | Landing Page | WhatsApp pazarlama |
| WhatsApp V2 | 4002 | whatsapp-v2.html | Landing Page | WhatsApp v2 |
| Main | 4003 | index.html | Main Site | Ana ürün sayfası |
| Main V2 | 4004 | index-v2.html | Main Site | Ana sayfa v2 |
| Site V2 | 4005 | site-v2.html | Main Site | Alternatif tasarım |
| Aydınlanma | 4006 | aydinlanma.html | Legal/Info | Bilgilendirme |

---

## 🔍 İÇERİK DETAYI

Her paket şunları içerir:

### HTML Dosyası
- Ana sayfa (index.html, whatsapp.html, vb.)
- Responsive tasarım
- SEO optimizasyonu

### CSS Dosyaları
- Modern styling
- Animations
- Responsive breakpoints

### JavaScript Dosyaları
- Interactive features
- Form handling
- Analytics tracking

### Images
- Product images
- Logos
- Icons
- Background images

### _next Klasörü
- Next.js static assets
- Optimized bundles
- Build artifacts

---

## ✅ DEPLOYMENT CHECKLIST

### Deployment Öncesi:
- [ ] Node.js kurulu (v16+)
- [ ] PM2 kurulu (`npm install -g pm2`)
- [ ] `npx serve` kullanılabilir
- [ ] Portlar (4001-4006) boş
- [ ] Yeterli disk alanı (minimum 120 MB)

### Deployment Sırasında:
- [ ] Paketler açıldı
- [ ] PM2 process'leri başlatıldı
- [ ] `pm2 list` ile kontrol edildi
- [ ] Browser'da test edildi
- [ ] `pm2 save` ile kaydedildi

### Deployment Sonrası:
- [ ] Nginx config eklendi (opsiyonel)
- [ ] SSL sertifikası kuruldu (opsiyonel)
- [ ] Domain DNS ayarları yapıldı (opsiyonel)
- [ ] Analytics eklendi (opsiyonel)

---

## 🔄 GÜNCELLEME

Siteleri güncellemek için:

```bash
# 1. Mevcut process'i durdur
pm2 stop ozphyzen-aggressive-whatsapp

# 2. Yeni paketi aç
cd ~/ozphyzen-deployments/aggressive-whatsapp
rm -rf * # Eski dosyaları sil
tar -xzf ~/ozphyzen_aggressive_whatsapp_2025-11-04.tar.gz

# 3. Process'i yeniden başlat
pm2 restart ozphyzen-aggressive-whatsapp

# 4. Kontrol et
curl http://localhost:4001
```

---

## 🛑 DURDURMA VE SİLME

### Tüm Siteleri Durdur:
```bash
pm2 stop ozphyzen-aggressive-whatsapp
pm2 stop ozphyzen-whatsapp-v2
pm2 stop ozphyzen-main
pm2 stop ozphyzen-main-v2
pm2 stop ozphyzen-site-v2
pm2 stop ozphyzen-aydinlanma
pm2 save
```

### Tüm Siteleri Sil:
```bash
pm2 delete ozphyzen-aggressive-whatsapp
pm2 delete ozphyzen-whatsapp-v2
pm2 delete ozphyzen-main
pm2 delete ozphyzen-main-v2
pm2 delete ozphyzen-site-v2
pm2 delete ozphyzen-aydinlanma
pm2 save
```

---

## 📞 DESTEK

**Orijinal Kaynak:** `/home/root/webapp/ozphyzen-sites/ozphyzen-3004/out/`  
**Paket Tarihi:** 2025-11-04  
**PM2 Process:** Port 4001-4006  

**Test URL'leri:**
- http://localhost:4001 → Aggressive WhatsApp
- http://localhost:4002 → WhatsApp V2
- http://localhost:4003 → Main
- http://localhost:4004 → Main V2
- http://localhost:4005 → Site V2
- http://localhost:4006 → Aydınlanma

---

## 🎯 ÖZELLİKLER

✅ Tek HTML dosyası (kolay deploy)  
✅ Tüm asset'ler dahil (css, js, images)  
✅ PM2 ready (production hazır)  
✅ Next.js optimizasyonları  
✅ Responsive design  
✅ SEO optimized  
✅ Fast loading  
✅ Cross-browser compatible  

---

**İyi çalışmalar! 🚀**
