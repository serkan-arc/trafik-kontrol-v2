# 🎯 HÜRRİYET HEALTH PROJESI - DURUM RAPORU
**Tarih:** 13 Ekim 2025, 20:15  
**Proje:** OZPHYZEN Landing Page - Prof. Dr. Mehmet Öz Röportajı  
**Sunucu:** Contabo VPS (207.180.204.60:8080)

---

## 📊 PROJE BİLGİLERİ

### Temel Bilgiler
- **Ürün:** OZPHYZEN Eklem Ağrısı Kremi
- **Fiyat:** 799 TL (İndirimli, Normal: 1600 TL)
- **Kampanya Tipi:** Facebook/Meta Ads + Landing Page
- **Hedef:** Lead Generation & Direct Sales

### Teknik Altyapı
- **Frontend:** HTML5, CSS3, Vanilla JavaScript
- **Backend:** Node.js + Express.js (Port 8080)
- **Process Manager:** PM2
- **Webhook System:** N8N Workflow Automation
- **Analytics:** Meta Pixel + Smart Tracking System
- **Database:** Google Sheets (via N8N)

---

## ✅ TAMAMLANAN GÖREVLER

### 1. Frontend Optimizasyonları
- ✅ Form boyutları %20-35 küçültüldü
- ✅ Countdown timer boyutları ayarlandı (38x46px - altın oran)
- ✅ TV teaser scripti geri yüklendi
- ✅ Emoji'ler countdown başlığından kaldırıldı
- ✅ Metin renkleri düzeltildi (kırmızı: #d41f2c, siyah: #333)
- ✅ OZPHYZEN ürün görseli %50 büyütüldü (300px → 450px)
- ✅ İçerik bileşenleri kırmızı çerçeveli kutulara dönüştürüldü

### 2. Backend Geliştirmeleri
- ✅ Express.js server kuruldu (server.cjs)
- ✅ API endpoint'leri oluşturuldu:
  - `/api/submit-order` - Form gönderimi
  - `/api/get-user-ip` - Gerçek kullanıcı IP'si
  - `/api/track-abandonment` - Terketme analizi
- ✅ Real User IP detection (IPv4 zorlamalı)
- ✅ "Geldiği Yer" (Referer) tracking eklendi

### 3. Smart Tracking System
- ✅ VIP Detection algoritması (0-100 puan)
- ✅ VIP Seviyeleri: PLATINUM, GOLD, SILVER, NORMAL
- ✅ Cihaz değer tespiti (iPhone/Samsung modelleri)
- ✅ Kullanıcı davranış analizi:
  - Sayfa süresi tracking
  - Scroll derinliği ölçümü
  - İnteraksiyon sayısı
  - İş saati analizi
- ✅ Abandonment (Terketme) analizi:
  - Exit intent detection
  - Terketme nedeni analizi (7 kategori)
  - Retargeting stratejileri

### 4. Meta Pixel Entegrasyonu (YENİ!)
- ✅ Meta Pixel Base Code eklendi (ID: 1536997387317312)
- ✅ Frontend Event Tracking:
  - `PageView` - Sayfa yüklendiğinde
  - `ViewContent` - Form görüntülendiğinde (799 TRY)
  - `InitiateCheckout` - Form doldurulmaya başlandığında
  - `Purchase` - Sipariş tamamlandığında (799 TRY)
  - `Lead` - Alternatif conversion tracking
- ✅ Server-Side Conversions API altyapısı kuruldu
  - User data hashing (SHA256)
  - Cookie support (fbp, fbc)
  - ⚠️ Access Token gerekli (şu an disabled)

### 5. Güvenlik Ayarları
- ✅ robots.txt yapılandırıldı:
  - Meta botları: İzin verildi ✅
  - SEO botları: Engellendi 🚫
- ✅ Meta tags: `noindex, nofollow`
- ✅ CORS yapılandırması

---

## ⏳ DEVAM EDEN GÖREVLER

### 1. N8N Workflow Yapılandırması

#### Mevcut Yapı:
```
📥 WEBHOOK (Form Dönüşü)
   ↓
🌐 HTTP Request (IP Geolocation API)
   ↓ ipgeolocation.io
   ↓ Çıktı: şehir, ülke, ilçe, ISP, organization, ASN
   ↓
✏️ Edit Fields (Manuel Mapping)
   ↓ 16 alan mapping yapılmış
   ↓ ⚠️ SORUN: Webhook path'i yanlış
   ↓ ❌ $('Webhook').item.json.body.isim → undefined
   ↓ ✅ Olması gereken: $json.body.isim
   ↓
🔧 Cihaz-Bilgisi (JavaScript)
   ↓ User-Agent parsing
   ↓ Veri temizleme (trim)
   ↓
📊 Append or update row in sheet
   ↓
📄 ESVELLA-LEAD Google Sheets
   → "Dönüşümler" sayfası
```

#### Tespit Edilen Sorunlar:

**1. Edit Fields Node'unda Mapping Hataları:**
```javascript
// ❌ YANLIŞ (undefined döner):
{{ $('Webhook').item.json.body.isim }}

// ✅ DOĞRU:
{{ $json.body.isim }}
```

**2. Eksik Alanlar:**
- `soyisim` - Webhook'ta var ama Edit Fields'de yok
- VIP bilgileri (vipSeviye, vipPuan, oncelik)
- Smart tracking verileri (sayfadaKalisSuresi, scrollDerinligi, etkilesimSayisi)

**3. Tarih Formatting Hatası:**
```javascript
// ❌ Invalid DateTime:
{{ DateTime.fromISO($node["Webhook"].json.body.zamanDamgasi).toFormat('dd.MM.yyyy HH:mm') }}

// ✅ Düzeltilmeli:
{{ DateTime.fromISO($json.body.zamanDamgasi).toFormat('dd.MM.yyyy HH:mm') }}
```

---

## 🎯 YAPILABİLECEKLER - ÖNCELİK SIRASI

### 🔴 YÜKSEK ÖNCELİK

#### 1. N8N Edit Fields Node Düzeltmeleri
**Durum:** Pending  
**Sorun:** Tüm webhook alanları `undefined` döner  
**Çözüm:**
```javascript
// Düzeltilecek Alanlar:
siparisID: {{ $json.body.siparisID }}
isim: {{ $json.body.isim }}
soyisim: {{ $json.body.soyisim }}  // YENİ EKLENECEK
telefon: {{ $json.body.telefon }}
ip: {{ $json.body.ip }}
gelenSite: {{ $json.body.gelenSite }}
cihazBilgisi: {{ $json.body.cihazBilgisi }}
zamanDamgasi: {{ DateTime.fromISO($json.body.zamanDamgasi).toFormat('dd.MM.yyyy HH:mm') }}

// VIP Detection Verileri (YENİ):
vipSeviye: {{ $json.body.vipSeviye }}
vipPuan: {{ $json.body.vipPuan }}
oncelik: {{ $json.body.oncelik }}
cihazDegeri: {{ $json.body.cihazDegeri }}
cihazModeli: {{ $json.body.cihazModeli }}
sayfadaKalisSuresi: {{ $json.body.sayfadaKalisSuresi }}
scrollDerinligi: {{ $json.body.scrollDerinligi }}
etkilesimSayisi: {{ $json.body.etkilesimSayisi }}

// IP Geolocation Verileri (MEVCUT):
şehir: {{ $json.state_prov }}
ülke: {{ $json.country_code2 }}
ilçe: {{ $json.district }}
posta_kodu: {{ $json.zipcode }}
kullandıgı_internet_sağlayıcı: {{ $json.isp }}
organization: {{ $json.organization }}
agKimlikNo_ASN: {{ $json.asn }}

// Cihaz-Bilgisi Node'undan:
cihazTipi: {{ $json.cihazTipi }}
```

#### 2. Google Sheets "Dönüşümler" Formu Kolonları
**Durum:** Pending  
**Hedef:** 27 kolon

| # | Kolon Adı | Kaynak | Açıklama |
|---|-----------|--------|----------|
| 1 | Sipariş ID | Webhook | SIP-20251013161708 |
| 2 | Tarih | Webhook | 13.10.2025 |
| 3 | Saat | Webhook | 16:17 |
| 4 | İsim | Webhook | Ahmet |
| 5 | Soyisim | Webhook | Yılmaz |
| 6 | Telefon | Webhook | 0532 269 36 54 |
| 7 | IP | Webhook | 85.98.16.30 |
| 8 | Geldiği Yer | Webhook | https://facebook.com |
| 9 | Şehir | IP Geo | Istanbul |
| 10 | İlçe | IP Geo | Fatih |
| 11 | Ülke | IP Geo | TR |
| 12 | Posta Kodu | IP Geo | 34110 |
| 13 | ISP | IP Geo | TurkTelecom |
| 14 | Organizasyon | IP Geo | TTNet A.S. |
| 15 | ASN | IP Geo | AS47331 |
| 16 | Cihaz Bilgisi | Webhook | Mozilla/5.0... |
| 17 | Cihaz Tipi | Cihaz-Bilgisi | Desktop/Laptop |
| 18 | VIP Seviye | Webhook | NORMAL/SILVER/GOLD/PLATINUM |
| 19 | VIP Puan | Webhook | 40 |
| 20 | Öncelik | Webhook | 1 |
| 21 | Önerilen Aksiyon | Webhook | standard_followup |
| 22 | Cihaz Değeri | Webhook | 20000₺ |
| 23 | Cihaz Modeli | Webhook | Desktop/Laptop |
| 24 | Sayfa Süresi | Webhook | 12 saniye |
| 25 | Scroll % | Webhook | 100% |
| 26 | Etkileşim Sayısı | Webhook | 8 |
| 27 | Meta Pixel | Sabit | Active ✅ |

#### 3. İkinci Webhook - Terketme Tracking
**Durum:** Webhook URL mevcut, form yapılandırılmadı  
**Webhook URL:** `https://n8nwork.dtekai.com/webhook/ef297f4c-c137-46aa-8f42-895253fff2c7`

**Yeni Google Sheets Sayfası: "Terketmeler"**

Kolonlar (18 kolon):
| # | Kolon Adı | Kaynak | Açıklama |
|---|-----------|--------|----------|
| 1 | Session ID | Webhook | sess-uuid-1234 |
| 2 | Tarih | Webhook | 13.10.2025 16:25 |
| 3 | IP | Webhook | 85.98.16.30 |
| 4 | Şehir | IP Geo | Istanbul |
| 5 | Ülke | IP Geo | TR |
| 6 | VIP Seviye | Webhook | GOLD |
| 7 | VIP Puan | Webhook | 65 |
| 8 | Öncelik | Webhook | HIGH/MEDIUM/LOW |
| 9 | Cihaz Değeri | Webhook | 35000₺ |
| 10 | Cihaz Modeli | Webhook | iPhone 15 Pro |
| 11 | Terketme Nedeni | Webhook | price_objection |
| 12 | Strateji | Webhook | Fiyat odaklı mesaj |
| 13 | Mesaj | Webhook | "Özel indirim..." |
| 14 | Sayfa Süresi | Webhook | 45 saniye |
| 15 | Scroll % | Webhook | 30% |
| 16 | Form İnteraksiyon | Webhook | true/false |
| 17 | Çıkış Noktası | Webhook | Form / Fiyat |
| 18 | Retarget Durumu | Manuel | Pending/Contacted |

---

### 🟡 ORTA ÖNCELİK

#### 4. Meta Conversions API Aktivasyonu
**Durum:** Altyapı kurulu, Access Token gerekli  
**Gerekli:**
```bash
# Meta Access Token al:
# https://developers.facebook.com/tools/accesstoken

# Environment variable ekle:
export META_ACCESS_TOKEN="EAABsbCS1iHgBO..."
pm2 restart hurriyet-health-server --update-env
```

**Fayda:**
- iOS 14.5+ kullanıcıları için %100 tracking
- Facebook/Meta'nın önerdiği best practice
- Browser kısıtlamalarından bağımsız

#### 5. N8N Workflow İyileştirmeleri
- IF/Switch node ekle (Form vs Terketme ayrımı)
- Error handling
- Retry logic
- Webhook response validation

---

### 🟢 DÜŞÜK ÖNCELİK

#### 6. Raporlama ve Dashboard
- Günlük özet raporu
- Dönüşüm oranı hesaplaması
- VIP analizi
- Terketme analizi

#### 7. A/B Testing Altyapısı
- Farklı form versiyonları
- Fiyat testleri
- CTA testleri

---

## 📊 WEBHOOK VERİ YAPILARI

### 1. Form Dönüşü Webhook (Mevcut)
**URL:** `https://n8nwork.dtekai.com/webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31`

**Gönderilen Veri:**
```json
{
  "siparisID": "SIP-20251013161708",
  "isim": "Ahmet",
  "soyisim": "Yılmaz",
  "telefon": "0532 269 36 54",
  "ip": "85.98.16.30",
  "cihazBilgisi": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "gelenSite": "https://facebook.com/ads/...",
  "zamanDamgasi": "2025-10-13T16:17:08.558Z",
  "vipSeviye": "NORMAL",
  "vipPuan": 40,
  "oncelik": 1,
  "onerilenAksiyon": "standard_followup",
  "cihazDegeri": 20000,
  "cihazModeli": "Desktop/Laptop",
  "sayfadaKalisSuresi": 12,
  "scrollDerinligi": 100,
  "etkilesimSayisi": 8
}
```

### 2. Terketme Webhook (Mevcut)
**URL:** `https://n8nwork.dtekai.com/webhook/ef297f4c-c137-46aa-8f42-895253fff2c7`

**Gönderilen Veri:**
```json
{
  "type": "abandonment",
  "sessionId": "sess-uuid-1234",
  "ip": "85.98.16.30",
  "userIP": "85.98.16.30",
  "timestamp": "2025-10-13T16:25:30.000Z",
  "vip": {
    "tier": "GOLD",
    "score": 65,
    "priority": 2,
    "action": "aggressive_followup",
    "reasons": ["High device value", "Good engagement"]
  },
  "device": {
    "type": "mobile",
    "model": "iPhone 15 Pro",
    "value": 35000,
    "browser": "Safari"
  },
  "abandonment": {
    "analysis": {
      "reason": "price_objection",
      "strategy": "price_focused_message",
      "message": "Özel indirim teklifimiz var!",
      "timing": "immediate",
      "priority": "HIGH"
    },
    "exitPoint": "form_pricing_section",
    "timeBeforeExit": 3
  },
  "behavior": {
    "timeOnPage": 45,
    "scrollDepth": 30,
    "interactions": 2,
    "formInteraction": false,
    "clickedPrice": true
  }
}
```

---

## 🎯 ÖNERİLEN N8N WORKFLOW YAPISI

### Tek Workflow - İki Webhook Yaklaşımı

```
┌─────────────────────────────────────────────────────────────┐
│              N8N WORKFLOW (TEK WORKFLOW)                    │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📥 WEBHOOK 1: Form Dönüşü                                 │
│     (bc74f59e-54c2-4521-85a1-6e21a0438c31)                │
│     ↓                                                       │
│     ├─→ 🌐 HTTP Request (IP Geolocation)                  │
│     ↓                                                       │
│     ├─→ ✏️ Edit Fields (Webhook + IP Geo Merge)          │
│     ↓                                                       │
│     ├─→ 🔧 Cihaz-Bilgisi (User-Agent Parse)              │
│     ↓                                                       │
│     ├─→ 📊 Google Sheets: DÖNÜŞÜMLER                      │
│     ↓    (ESVELLA-LEAD / "Dönüşümler" sayfası)           │
│     ↓                                                       │
│     └─→ ✅ Success Response                                │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📥 WEBHOOK 2: Terketme                                    │
│     (ef297f4c-c137-46aa-8f42-895253fff2c7)                │
│     ↓                                                       │
│     ├─→ 🌐 HTTP Request (IP Geolocation)                  │
│     ↓                                                       │
│     ├─→ ✏️ Edit Fields (Abandonment Data Parse)          │
│     ↓                                                       │
│     ├─→ 📊 Google Sheets: TERKETMELER                     │
│     ↓    (ESVELLA-LEAD / "Terketmeler" sayfası)          │
│     ↓                                                       │
│     └─→ ✅ Success Response                                │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Alternatif: Birleşik Webhook + IF Node

```
┌─────────────────────────────────────────────────────────────┐
│              N8N WORKFLOW (AKILLI YÖNLENDIRME)             │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  📥 WEBHOOK (Birleşik)                                     │
│     ↓                                                       │
│     ├─→ 🔀 IF NODE (type === 'abandonment' ?)            │
│     │                                                       │
│     ├──[TRUE]──→ Terketme İşlemi                          │
│     │             ↓                                        │
│     │             📊 TERKETMELER Formu                    │
│     │                                                       │
│     └──[FALSE]──→ Form Dönüşü İşlemi                      │
│                   ↓                                        │
│                   🌐 IP Geolocation                       │
│                   ↓                                        │
│                   📊 DÖNÜŞÜMLER Formu                     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Öneri:** **İlk yapı (2 ayrı webhook)** daha temiz ve bakımı kolay.

---

## 📝 SONRAKİ ADIMLAR - SIRA İLE

### 1. N8N Edit Fields Düzeltmesi (15 dk)
- [ ] Edit Fields node'unu aç
- [ ] Tüm `$('Webhook').item.json.body.X` → `$json.body.X` değiştir
- [ ] Eksik alanları ekle (soyisim, VIP verileri)
- [ ] Test et

### 2. Google Sheets Genişletme (10 dk)
- [ ] "Dönüşümler" sayfasına yeni kolonlar ekle
- [ ] N8N "Append or update row" node'unda mapping güncelle
- [ ] Test et

### 3. Terketmeler Formu Oluştur (20 dk)
- [ ] Google Sheets'te "Terketmeler" sayfası oluştur
- [ ] 18 kolon başlığı ekle
- [ ] N8N'de ikinci webhook için flow oluştur
- [ ] Test et

### 4. Meta Pixel Test (5 dk)
- [ ] Meta Events Manager aç
- [ ] Test mode'da sayfa ziyaret et
- [ ] Form doldur ve gönder
- [ ] Event'ları doğrula

### 5. End-to-End Test (10 dk)
- [ ] Gerçek form gönderimi
- [ ] Google Sheets kontrol
- [ ] Webhook logları kontrol
- [ ] Meta Pixel events kontrol

---

## 🔗 ÖNEMLİ LİNKLER

### Sunucu
- **Landing Page:** http://207.180.204.60:8080/
- **Backend API:** http://207.180.204.60:8080/api/
- **PM2 Status:** `pm2 status`
- **Logs:** `pm2 logs hurriyet-health-server`

### N8N
- **Dashboard:** https://n8nwork.dtekai.com/
- **Form Webhook:** bc74f59e-54c2-4521-85a1-6e21a0438c31
- **Terketme Webhook:** ef297f4c-c137-46aa-8f42-895253fff2c7

### Meta
- **Events Manager:** https://business.facebook.com/events_manager2
- **Pixel ID:** 1536997387317312
- **Test Events:** Test mode'da event'ları görüntüle

### Google Sheets
- **Dosya:** ESVELLA-LEAD
- **Sayfalar:**
  - Dönüşümler (mevcut)
  - Terketmeler (oluşturulacak)

---

## 📞 DESTEK BİLGİLERİ

### Dosya Konumları
```bash
/root/hurriyet-health/
├── index.html              # Ana sayfa (Meta Pixel eklendi ✅)
├── js/script.js           # Form logic + Meta events ✅
├── css/style.css          # Styles
├── server.cjs             # Backend server ✅
├── smart-tracking.js      # VIP + Abandonment tracking ✅
├── robots.txt             # SEO botları engelli ✅
└── package.json           # Dependencies
```

### Önemli Komutlar
```bash
# Server yeniden başlat
pm2 restart hurriyet-health-server

# Logları görüntüle
pm2 logs hurriyet-health-server --lines 50

# Git commit
cd /root/hurriyet-health
git add .
git commit -m "Update: N8N workflow fixes + Meta Pixel"
git push

# Backup oluştur
tar -czf hurriyet-health-backup-$(date +%Y%m%d-%H%M%S).tar.gz hurriyet-health/
```

---

## 🎯 SONUÇ

**Proje %80 tamamlandı.**

**Kritik Kalan:**
1. N8N Edit Fields düzeltmeleri (Yüksek öncelik)
2. Google Sheets genişletmesi (Yüksek öncelik)
3. Terketmeler formu (Orta öncelik)

**Tahmini Tamamlanma Süresi:** 45-60 dakika

**Hedef:** Tam otomatik Lead Management + Smart Retargeting + Meta Conversion Tracking

---

*Son Güncelleme: 13 Ekim 2025, 20:15*  
*Hazırlayan: AI Assistant*
