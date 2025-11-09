# 🗺️ ESVELLA LEAD YÖNETİM SİSTEMİ - DETAYLI YOL HARİTASI

**Oluşturulma Tarihi:** 9 Kasım 2024  
**Son Güncelleme:** 9 Kasım 2024 - 21:00  
**Versiyon:** 1.2  
**Durum:** 🚀 Aktif Geliştirme (Partner Yönetimi ✅ + Lead Havuzu ✅)

---

## 📋 İÇİNDEKİLER

1. [Proje Durumu Özet](#proje-durumu-özet)
2. [Sistem Mimarisi Anlaşması](#sistem-mimarisi-anlaşması)
3. [Lead Akışı](#lead-akışı)
4. [Database Yapılanması](#database-yapılanması)
5. [Yapılacaklar Listesi](#yapılacaklar-listesi)
6. [Sayfa Tasarım Önceliği](#sayfa-tasarım-önceliği)
7. [Veri Akışı Diyagramları](#veri-akışı-diyagramları)
8. [Güvenlik & Yetkilendirme](#güvenlik-yetkilendirme)
9. [Toplam Süre Tahmini](#toplam-süre-tahmini)
10. [Önerilen Çalışma Sırası](#önerilen-çalışma-sırası)

---

## 📋 PROJE DURUMU ÖZET

### ✅ **TAMAMLANAN BÖLÜMLER:**

#### **1. Temel Altyapı (100%)**
- ✅ Next.js 14.2.5 production dashboard çalışıyor
- ✅ PostgreSQL (postgres.dtekai.com/dtektracking) bağlantısı aktif
- ✅ PM2 ile servis yönetimi (traffic-control-prod)
- ✅ Port: 3001 - http://207.180.204.60:3001

#### **2. Sidebar Menü (100%)** ✅ **GÜNCELLEME: 9 Kasım 2024**
- ✅ Menü yeniden yapılandırıldı (8 ana menü)
- ✅ Aktif menü highlight eklendi (mavi background)
- ✅ Görsel hiyerarşi (bold ana menü + indent alt menü)
- ✅ Ürün Yönetimi kaldırıldı → Raporlama'ya entegre edildi
- ✅ Partner Yönetimi oluşturuldu (Alıcı + Komisyon birleştirildi)
- ✅ Güncel yapı:
  1. 📈 Traffic Control
  2. 🌐 Site Yönetimi
  3. ⚡ n8n Yönetimi (5 alt menü)
  4. 📋 Lead Yönetimi (4 alt menü)
  5. 👥 Partner Yönetimi (7 alt menü - komisyon içinde)
  6. 📊 Raporlama (5 alt menü - ürün performansı içinde)
  7. ⚙️ Sistem Ayarları
  8. 📊 Sistem Bilgileri

#### **3. n8n Modülü (100%)** ✅ **TAMAMLANDI: 9 Kasım 2024**
- ✅ `/dashboard/n8n` - n8n Dashboard (8 stat card, 6 quick action)
- ✅ `/dashboard/n8n/workflows` - Workflow listesi ve yönetimi
- ✅ `/dashboard/n8n/webhooks` - Webhook log viewer (detail modal)
- ✅ `/dashboard/n8n/errors` - Hata logları (taşındı)
- ✅ API Routes: `/api/n8n/stats`, `/api/n8n/workflows`, `/api/n8n/webhooks`, `/api/n8n/executions`
- ✅ Modüler yapı (ayrı dosyalar, temiz kod)
- ⏳ **Database tabloları bekliyor:** `n8n_workflows`, `n8n_webhook_logs`, `n8n_executions`

#### **4. Partner Yönetimi (100% ✅ TAMAMLANDI)** - 9 Kasım 2024

**✅ Database & Backend (100%):**
- ✅ Database migration çalıştırıldı (5 tablo + 1 view)
  - `buyers` (partner bilgileri + portal erişim)
  - `offers` (Feroxil €99, Ozphyzen €89)
  - `deal_types` (CPA, CPL, CPS, HYBRID, REVSHARE)
  - `buyer_deals` (partner anlaşmaları)
  - `buyer_commissions` (komisyon takibi)
  - `vw_partner_stats` (özet view)
- ✅ Database helper `/lib/db.ts` - pg library ile bağlantı
- ✅ Tüm API'ler aktif ve test edildi:
  - `/api/partners` - GET, POST ✅ (1 partner)
  - `/api/partners/[id]` - GET, PATCH, DELETE ✅
  - `/api/partners/deals` - GET, POST ✅ (1 deal)
  - `/api/partners/commissions` - GET ✅ (0 commission)
  - `/api/partners/performance` - GET ✅ (1 partner)
  - `/api/partners/[id]/portal-access` - Portal yönetimi ✅
  - `/api/offers` - GET ✅ (2 ürün)

**✅ Frontend Sayfaları (100%):**
- ✅ `/dashboard/partners` - Partner listesi (5 stat + filtreleme)
- ✅ `/dashboard/partners/new` - Yeni partner ekleme formu
- ✅ `/dashboard/partners/[id]` - Partner detay sayfası
- ✅ `/dashboard/partners/[id]/portal-access` - Portal erişim yönetimi
- ✅ `/dashboard/partners/deals` - Anlaşmalar yönetimi
- ✅ `/dashboard/partners/commissions` - Komisyon takibi
- ✅ `/dashboard/partners/performance` - Performans raporları

**📊 Mevcut Test Data:**
- 1 Partner: BUYER_TEST
- 1 Deal: BUYER_TEST - Feroxil CPA Deal
- 2 Ürün: Feroxil (€99), Ozphyzen (€89)
- 5 Deal Type: CPA, CPL, CPS, HYBRID, REVSHARE

**📍 DURUM:** ✅ Partner Yönetimi %100 tamamlandı ve production'da aktif!

#### **5. Database Tabloları (BEKLEMEDE)**
- ✅ `n8n_leads` tablosu mevcut
- ✅ `n8n_errors` tablosu mevcut
- ✅ Migration dosyası hazır: `/database/migrations/001_create_partner_tables.sql`
- ⏳ **Migration çalıştırılmayı bekliyor** (credentials gerekiyor)
- ⏳ Eklenecek kolonlar:
  - `n8n_leads.offer_id` VARCHAR(50)
  - `n8n_leads.deal_id` INTEGER
  - `n8n_leads.commission_calculated` BOOLEAN
  - `n8n_leads.commission_id` INTEGER

#### **6. Lead Havuzu Sayfası (90%)**
- ✅ `/dashboard/affiliate/leads` sayfası çalışıyor
- ✅ 7 istatistik kartı (Toplam, Bekliyor, Onaylı, Paketlendi, Gönderildi, Beklemede, Reddedildi)
- ✅ 7 filtre (Durum, Site, Kampanya, Affiliate, Buyer, Kaynak, Tarih)
- ✅ Multi-select checkbox sistemi
- ✅ Toplu işlemler (Onayla, Beklet, Reddet, Pakete Ekle)
- ✅ Detay modal (Kampanya bilgisi, Müşteri bilgisi, Kaynak bilgisi, Full JSON)
- ✅ Tablo kolonları: Tracking ID, Müşteri, Site, Kampanya, Affiliate, Buyer, Kaynak, Durum, Tarih, İşlemler
- ⚠️ **EKSİK:** Offer ID (ürün bilgisi) kolonu henüz eklenmedi

#### **7. Hatalı Bağlantılar Sayfası (100%)**
- ✅ `/dashboard/affiliate/errors` → `/dashboard/n8n/errors` taşındı
- ✅ n8n workflow hatalarını gösteriyor

---

## 🎯 SİSTEM MİMARİSİ ANLAŞMASI

### **Roller ve Tanımlar:**

#### **1. BİZ (ESVELLA) - Ürün Sahibi**
- Ürünlerimiz: Feroxil, Ozphyzen
- Sitelerimiz: site1.com, site2.com, vb.
- Lead topluyoruz
- CRM'imize gönderiyoruz
- Call center arıyor, satış yapıyor
- Alıcılara komisyon ödüyoruz

#### **2. ALICI (BUYER) - Lead Gönderen Müşteri**
- Bizden ürün ve site hizmeti alır
- Kendi kampanyalarını oluşturur
- Affiliateleri ile çalışır (bizi ilgilendirmez)
- Toplanan leadler n8n üzerinden bizim database'e gelir
- Kendi panelinden sadece şunları görür:
  - ✅ Tracking ID
  - ✅ Kampanya adı
  - ✅ Affiliate kodu
  - ✅ Durum bilgisi
  - ✅ Komisyon bilgisi
  - ❌ Müşteri adı/soyadı (GÖRMEZ)
  - ❌ Telefon numarası (GÖRMEZ)
  - ❌ Email adresi (GÖRMEZ)

#### **3. AFİLİATE - Alıcının Çalışanı**
- Alıcıya bağlı çalışır
- Trafik toplar
- Bizi doğrudan ilgilendirmez
- Sadece etiketlendirme için kodlarını kullanırız
  - Örnek: `x-12334568788`, `y-44521588559`

#### **4. MÜŞTERİ (SON KULLANICI)**
- Gerçek ürün alıcısı
- Site formunu doldurur / WhatsApp'tan mesaj atar
- n8n otomatik olarak verisini database'e yazar

---

## 🔄 LEAD AKIŞI

```
┌─────────────────────────────────────────────────────────────┐
│  1️⃣ MÜŞTERİ (Gerçek Alıcı)                                 │
│  └─> Site formu doldurur / WhatsApp'tan yazar              │
├─────────────────────────────────────────────────────────────┤
│  2️⃣ n8n Workflow                                            │
│  └─> Form verisini alır                                     │
│  └─> PostgreSQL'e DOĞRUDAN INSERT eder                      │
│      INSERT INTO n8n_leads (                                │
│        tracking_id: DTK_2024_11_09_X_ABC123                 │
│        buyer_code: BUYER_X                                  │
│        affiliate_code: x-12334568788                        │
│        campaign_id: winter_sale_2024                        │
│        offer_id: ESV-FRX-2025                               │
│        site_domain: site1.com                               │
│        customer_name: "Ali Yılmaz"                          │
│        customer_phone: "+90 532..."                         │
│        customer_email: "ali@..."                            │
│        source: "whatsapp"                                   │
│        status: "pending"                                    │
│      )                                                       │
├─────────────────────────────────────────────────────────────┤
│  3️⃣ BİZ (ESVELLA ADMIN) - Lead Havuzu                      │
│  └─> Tüm detayları görürüz (isim, tel, email)              │
│  └─> Filtreleme yaparız (buyer, kampanya, ürün)            │
│  └─> Lead seçeriz (checkbox)                               │
│  └─> Toplu işlem (Onayla / Beklet / Reddet)                │
├─────────────────────────────────────────────────────────────┤
│  4️⃣ BİZ - Paket Yönetimi (YENİ YAPILACAK)                  │
│  └─> Onaylı leadleri görürüz                                │
│  └─> Buyer'lara göre gruplarız                             │
│  └─> Ürünlere göre gruplarız                               │
│  └─> Paket oluştururuz                                      │
│  └─> Excel export ederiz                                    │
│  └─> CRM'imize göndeririz (API / Manuel)                   │
├─────────────────────────────────────────────────────────────┤
│  5️⃣ BİZİM CRM                                              │
│  └─> Leadleri alır                                          │
│  └─> Call center arıyor                                     │
│  └─> Sipariş oluşturuyor                                    │
│  └─> Status güncelleme:                                     │
│      - contacted (görüşüldü)                                │
│      - approved (onaylandı)                                 │
│      - shipped (kargoya verildi)                            │
│      - delivered (teslim edildi)                            │
│      - sold (satış tamamlandı)                              │
│      - rejected (iptal/iade)                                │
├─────────────────────────────────────────────────────────────┤
│  6️⃣ BİZ - Komisyon Hesaplama (YENİ YAPILACAK)              │
│  └─> Lead status değiştiğinde tetiklenir                   │
│  └─> Anlaşma tipine göre hesaplar:                         │
│      - CPA: Satış olunca komisyon                           │
│      - CPL: Lead gönderilince komisyon                      │
│      - CPS: Satış tutarının %'si                            │
│      - HYBRID: Lead + Satış ikisi birden                    │
│      - REVSHARE: Aylık gelir paylaşımı                      │
│  └─> buyer_commissions tablosuna yazar                      │
├─────────────────────────────────────────────────────────────┤
│  7️⃣ ALICI (BUYER) - Kendi Paneli (YENİ YAPILACAK)          │
│  └─> Login: /buyer/login                                    │
│  └─> Dashboard: İstatistikler + Komisyonlar                 │
│  └─> Leadler: Sadece tracking_id + durum (isim/tel YOK)    │
│  └─> Affiliateler: Performans raporu                        │
│  └─> Komisyonlar: Bekleyen / Onaylanan / Ödenen            │
└─────────────────────────────────────────────────────────────┘
```

---

## 🗄️ DATABASE YAPILANMASI

### **MEVCUT TABLOLAR (✅ Hazır):**

#### **1. `n8n_leads` - Ana Lead Tablosu**
```sql
✅ id
✅ tracking_id (UNIQUE)
✅ source (whatsapp, web_form, vb.)
✅ affiliate_code
✅ campaign_id
✅ site_domain
✅ buyer_code
✅ customer_name
✅ customer_phone
✅ customer_email
✅ customer_address
✅ customer_country
✅ lead_data (JSONB - full data)
✅ status (pending, approved_for_crm, in_package, sent_to_crm, on_hold, rejected)
✅ crm_lead_id
✅ crm_order_id
✅ agent_id
✅ agent_name
✅ agent_notes
✅ commission_amount
✅ commission_currency
✅ commission_status
✅ created_at
✅ sent_to_crm_at
✅ contacted_at
✅ sold_at
✅ updated_at
✅ approved_by
✅ approved_at
✅ batch_id
✅ rejection_reason
⚠️ offer_id (EKLENECEK)
```

---

### **YENİ TABLOLAR (❌ Yapılacak):**

#### **2. `buyers` - Alıcı Yönetimi**
```sql
CREATE TABLE buyers (
  id SERIAL PRIMARY KEY,
  buyer_code VARCHAR(50) UNIQUE NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  dashboard_username VARCHAR(100) UNIQUE NOT NULL,
  dashboard_password VARCHAR(255) NOT NULL,
  status VARCHAR(20) DEFAULT 'active',
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **3. `offers` - Ürün Kataloğu**
```sql
CREATE TABLE offers (
  id SERIAL PRIMARY KEY,
  offer_id VARCHAR(50) UNIQUE NOT NULL,
  offer_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(100),
  base_price DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'EUR',
  description TEXT,
  status VARCHAR(20) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO offers (offer_id, offer_name, product_type, base_price) VALUES
('ESV-FRX-2025', 'Feroxil', 'health_supplement', 99.00),
('ESV-OZP-2025', 'Ozphyzen', 'health_supplement', 89.00);
```

#### **4. `deal_types` - Anlaşma Tipleri**
```sql
CREATE TABLE deal_types (
  id SERIAL PRIMARY KEY,
  deal_code VARCHAR(20) UNIQUE NOT NULL,
  deal_name VARCHAR(100) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO deal_types (deal_code, deal_name, description) VALUES
('CPA', 'Cost Per Acquisition', 'Satış başına sabit ödeme'),
('CPL', 'Cost Per Lead', 'Lead başına sabit ödeme'),
('CPS', 'Cost Per Sale', 'Satış tutarının yüzdesi'),
('HYBRID', 'Hybrid Model', 'Lead + Satış karma modeli'),
('REVSHARE', 'Revenue Share', 'Aylık gelir paylaşımı');
```

#### **5. `buyer_deals` - Alıcı Anlaşmaları**
```sql
CREATE TABLE buyer_deals (
  id SERIAL PRIMARY KEY,
  buyer_code VARCHAR(50) REFERENCES buyers(buyer_code),
  offer_id VARCHAR(50) REFERENCES offers(offer_id),
  deal_type VARCHAR(20) REFERENCES deal_types(deal_code),
  fixed_amount DECIMAL(10,2),
  percentage DECIMAL(5,2),
  lead_amount DECIMAL(10,2),
  sale_bonus DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'EUR',
  status VARCHAR(20) DEFAULT 'active',
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **6. `buyer_commissions` - Komisyon Takibi**
```sql
CREATE TABLE buyer_commissions (
  id SERIAL PRIMARY KEY,
  buyer_code VARCHAR(50) REFERENCES buyers(buyer_code),
  tracking_id VARCHAR(50) REFERENCES n8n_leads(tracking_id),
  deal_id INT REFERENCES buyer_deals(id),
  deal_type VARCHAR(20),
  offer_id VARCHAR(50),
  lead_commission DECIMAL(10,2) DEFAULT 0,
  sale_commission DECIMAL(10,2) DEFAULT 0,
  total_commission DECIMAL(10,2) DEFAULT 0,
  lead_status VARCHAR(50),
  currency VARCHAR(10) DEFAULT 'EUR',
  status VARCHAR(20) DEFAULT 'pending',
  approved_at TIMESTAMP,
  approved_by VARCHAR(100),
  paid_at TIMESTAMP,
  paid_by VARCHAR(100),
  payment_method VARCHAR(50),
  transaction_id VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

#### **7. `lead_batches` - Paket Yönetimi**
```sql
CREATE TABLE lead_batches (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(100) UNIQUE NOT NULL,
  batch_name VARCHAR(255),
  buyer_code VARCHAR(50) REFERENCES buyers(buyer_code),
  offer_id VARCHAR(50) REFERENCES offers(offer_id),
  lead_count INT DEFAULT 0,
  status VARCHAR(50) DEFAULT 'draft',
  created_by VARCHAR(100),
  sent_by VARCHAR(100),
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  export_format VARCHAR(20),
  export_path TEXT,
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🎯 YAPILACAKLAR LİSTESİ

### **ADIM 1: SIDEBAR MENU** ⏱️ 30 dakika ✅ **TAMAMLANDI**

- [x] Menu yapısı yeniden düzenleme
- [x] Partner Yönetimi (Alıcı + Komisyon birleştirildi)
- [x] Ürün Yönetimi kaldırıldı → Raporlama'ya entegre
- [x] Aktif menü highlight ekleme
- [x] Görsel hiyerarşi (bold + indent)

---

### **ADIM 2: n8n MODÜLÜ** ⏱️ 2 saat ✅ **TAMAMLANDI**

- [x] `/dashboard/n8n` - Dashboard sayfası
- [x] `/dashboard/n8n/workflows` - Workflow yönetimi
- [x] `/dashboard/n8n/webhooks` - Webhook logları
- [x] `/dashboard/n8n/errors` - Hata logları (taşındı)
- [x] API Routes (stats, workflows, webhooks, executions)
- [x] Build & Deploy

---

### **ADIM 3: PARTNER YÖNETİMİ** ⏱️ 3 saat ✅ **TAMAMLANDI (100%)**

**✅ Tamamlanan (9 Kasım 2024):**
- [x] Database migration hazırlama (001_create_partner_tables.sql)
- [x] Database migration çalıştırma (5 tablo + 1 view oluşturuldu)
- [x] `/lib/db.ts` - pg library ile database helper
- [x] `/dashboard/partners` - Partner listesi sayfası ✅
- [x] `/dashboard/partners/new` - Yeni partner formu ✅
- [x] `/dashboard/partners/[id]` - Partner detay sayfası ✅
- [x] `/dashboard/partners/[id]/portal-access` - Portal yönetimi ✅
- [x] `/dashboard/partners/deals` - Anlaşmalar ✅
- [x] `/dashboard/partners/commissions` - Komisyon takibi ✅
- [x] `/dashboard/partners/performance` - Performans raporları ✅
- [x] `/api/partners` - GET, POST ✅
- [x] `/api/partners/[id]` - GET, PATCH, DELETE ✅
- [x] `/api/partners/deals` - GET, POST ✅
- [x] `/api/partners/commissions` - GET ✅
- [x] `/api/partners/performance` - GET ✅
- [x] `/api/offers` - GET ✅
- [x] Build & Deploy ✅
- [x] Production test ✅

**📍 Son Durum:** ✅ Partner Yönetimi %100 tamamlandı! Tüm API'ler ve sayfalar çalışıyor.

---

### **FAZE 1: DATABASE HAZIRLIK** ⏱️ 5 dakika ✅ **TAMAMLANDI**

- [x] Migration dosyası hazır: `001_create_partner_tables.sql`
- [x] **SQL execute edildi** (9 Kasım 2024)
  - [x] `buyers` tablosu oluşturuldu
  - [x] `offers` tablosu oluşturuldu (Feroxil €99, Ozphyzen €89)
  - [x] `deal_types` tablosu oluşturuldu (CPA, CPL, CPS, HYBRID, REVSHARE)
  - [x] `buyer_deals` tablosu oluşturuldu
  - [x] `buyer_commissions` tablosu oluşturuldu
  - [x] `vw_partner_stats` view oluşturuldu
  - [x] Trigger'lar ve index'ler eklendi
  - [x] Test verisi eklendi (BUYER_TEST + 1 deal)

**✅ Migration Başarıyla Çalıştırıldı:**
```bash
psql -h postgres.dtekai.com -p 5432 -U postgres -d dtektracking \
  -f /home/root/Trafic-manager-uretim-dosyasi/database/migrations/001_create_partner_tables.sql
```

---

### **FAZE 2: LEAD HAVUZU GÜNCELLEMELERİ** ⏱️ 30 dakika ✅ **TAMAMLANDI**

- [x] Offer ID entegrasyonu (interface, query, filtre, kolon)
  - [x] Lead interface'ine offer_id ve offer_name eklendi
  - [x] SQL query'ye offer JOIN eklendi
  - [x] Ürün filtresi eklendi (8. filtre)
  - [x] Ürün kolonu tabloya eklendi
- [x] Buyer filtreleme (zaten vardı)
- [x] query helper'a geçiş (@vercel/postgres -> pg)

---

### **FAZE 4: PAKET YÖNETİMİ** ⏱️ 90 dakika

- [ ] `/dashboard/affiliate/packages` sayfası
- [ ] Paket oluşturma sistemi
- [ ] Onaylı lead listesi
- [ ] Paket detay modal
- [ ] Excel export fonksiyonu
- [ ] CRM'ye gönderme sistemi
- [ ] API endpoint'leri

---

### **FAZE 5: PAKET GEÇMİŞİ** ⏱️ 40 dakika

- [ ] `/dashboard/affiliate/packages/history` sayfası
- [ ] Paket listesi ve filtreleme
- [ ] Paket rapor modal

---

### **FAZE 6: KOMİSYON HESAPLAMA** ⏱️ 50 dakika

- [ ] Otomatik komisyon hesaplama logic
- [ ] CPA/CPL/CPS/HYBRID/REVSHARE algoritmaları
- [ ] Komisyon API endpoint'leri
- [ ] Admin komisyon yönetimi sayfası

---

### **FAZE 7: PARTNER PORTAL (AYRI PROJE)** ⏱️ 4-5 saat

**📌 KARAR: Partner Portal ayrı bir proje olarak geliştirilecek**
**📅 Tarih: 9 Kasım 2024**

#### **Mimari Yaklaşım:**
```
Admin Panel (/dashboard/)        Partner Portal (Ayrı Proje)
├─ Full data access             ├─ Limited data access
├─ Müşteri PII görür            ├─ Müşteri PII GÖRMEz
├─ Tüm partner'ları görür       ├─ Sadece kendi verisini görür
└─ Komisyon onay/red            └─ Komisyon takibi (read-only)
```

#### **Yapılacaklar:**

##### **7.1 Auth & Security (60 dk)**
- [ ] Ayrı Next.js projesi kurulumu
- [ ] Partner giriş sistemi (`/login`)
- [ ] JWT token authentication
- [ ] Middleware (partner_code validation)
- [ ] Rate limiting (güvenlik)

##### **7.2 Partner API Bridge (45 dk)**
- [ ] Admin panel API endpoint'leri (read-only)
  - [ ] `GET /api/partner/leads?buyer_code=X` (filtered)
  - [ ] `GET /api/partner/commissions?buyer_code=X`
  - [ ] `GET /api/partner/stats?buyer_code=X`
- [ ] Partner portal API client
- [ ] Data filtering (PII removal)

##### **7.3 Partner Portal Pages (90 dk)**
- [ ] `/partner-portal/dashboard` - Ana sayfa (istatistikler)
- [ ] `/partner-portal/leads` - Lead listesi (tracking_id, status, commission)
- [ ] `/partner-portal/commissions` - Komisyon detayları
- [ ] `/partner-portal/performance` - Performans grafikleri
- [ ] `/partner-portal/profile` - Profil ayarları

##### **7.4 Admin - Partner Credential Management (30 dk)**
- [ ] `/dashboard/partners/[id]/portal-access` - Portal erişim yönetimi
- [ ] Username/Password oluşturma
- [ ] Portal aktif/pasif toggle
- [ ] Partner portal URL paylaşımı

##### **7.5 Testing & Security Audit (45 dk)**
- [ ] PII leak kontrolü (müşteri bilgisi sızmasın)
- [ ] Authorization test (başka partner'ın verisini görememe)
- [ ] Performance test
- [ ] Security headers

#### **Database Değişikliği:**
```sql
-- buyers tablosuna eklenecek
ALTER TABLE buyers ADD COLUMN portal_active BOOLEAN DEFAULT false;
ALTER TABLE buyers ADD COLUMN portal_last_login TIMESTAMP;
ALTER TABLE buyers ADD COLUMN portal_ip_whitelist TEXT[]; -- opsiyonel
```

#### **Deployment:**
- Ayrı domain/subdomain: `partner.dtektracking.com`
- Ayrı PM2 service: `partner-portal`
- Ayrı port: 3002

---

### **FAZE 8: RAPORLAMA** ⏱️ 60 dakika (Opsiyonel)

- [ ] Admin raporlama
- [ ] Buyer raporları
- [ ] Excel export

---

## 📊 SAYFA TASARIM ÖNCELİĞİ

### **Admin Sayfaları:**
```
/dashboard/admin/buyers
/dashboard/admin/buyers/[id]
/dashboard/admin/commissions
/dashboard/affiliate/leads (✅ VAR)
/dashboard/affiliate/packages (YENİ)
/dashboard/affiliate/packages/history (YENİ)
/dashboard/affiliate/errors (✅ VAR)
```

### **Buyer Sayfaları:**
```
/buyer/login
/buyer/dashboard
/buyer/leads
/buyer/affiliates
/buyer/commissions
/buyer/api
```

---

## 🔐 GÜVENLİK & YETKİLENDİRME

### **Admin Panel:**
- ✅ Tüm verilere erişim
- ✅ Müşteri bilgileri görülebilir

### **Buyer Panel:**
- ✅ Sadece kendi leadleri
- ❌ Müşteri kişisel bilgileri GÖREMEZ
- ✅ Tracking ID, kampanya, durum, komisyon görülebilir

### **Database Security:**
```sql
CREATE VIEW buyer_safe_leads AS
SELECT 
  tracking_id, buyer_code, campaign_id, affiliate_code,
  offer_id, source, status, created_at
FROM n8n_leads;
```

---

## ⏱️ TOPLAM SÜRE TAHMİNİ

```
Faze 1: Database             → 20 dakika
Faze 2: Lead Havuzu          → 30 dakika
Faze 3: Admin Alıcı          → 60 dakika
Faze 4: Paket Yönetimi       → 90 dakika
Faze 5: Paket Geçmişi        → 40 dakika
Faze 6: Komisyon             → 50 dakika
Faze 7: Buyer Panel          → 90 dakika
Faze 8: Raporlama            → 60 dakika
────────────────────────────────────────
TOPLAM:                      → 7.5 saat
```

---

## 🚀 ÖNERİLEN ÇALIŞMA SIRASI

### **SPRINT 1: Temel Altyapı (1.5 saat)**
- Faze 1: Database
- Faze 2: Lead Havuzu
- Faze 3: Admin Alıcı Yönetimi

### **SPRINT 2: Paket ve Komisyon (2.5 saat)**
- Faze 4: Paket Yönetimi
- Faze 5: Paket Geçmişi
- Faze 6: Komisyon Hesaplama

### **SPRINT 3: Buyer Paneli (1.5 saat)**
- Faze 7: Buyer Panel

### **SPRINT 4: Raporlama (1 saat)**
- Faze 8: Raporlama

---

## 📌 ÖNCELİKLENDİRME

### 🔴 **KRİTİK:**
- Database hazırlık
- Lead Havuzu offer_id
- Admin Alıcı Yönetimi
- Paket Yönetimi

### 🟠 **ÖNEMLİ:**
- Komisyon Hesaplama
- Buyer Panel
- Paket Geçmişi

### 🟢 **İYİ OLUR:**
- Raporlama & Analitik
- API Entegrasyonları

---

## 📝 NOTLAR

- Bu dokümantasyon proje başlangıcında hazırlanmıştır
- Her faze tamamlandıkça güncellenecektir
- Değişiklikler versiyon numarası ile işaretlenecektir
- Detaylı teknik dokümantasyon diğer MD dosyalarında bulunmaktadır

---

**Son Güncelleme:** 9 Kasım 2024  
**Hazırlayan:** AI Development Team  
**Onaylayan:** Proje Yöneticisi
