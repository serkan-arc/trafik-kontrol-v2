# 📋 Affiliate Lead Yönetim Sistemi - Genel Bakış

**Tarih:** 2025-11-09  
**Versiyon:** 1.0.0  
**Durum:** Planlama Aşaması

---

## 🎯 Sistem Amacı

**Affiliate Network** (trafikçiler) ile **Buyer** (ürün sahibi/CallCenter CRM) arasında **köprü kurarak** lead yönetimi ve komisyon takibi yapmak.

---

## 🔄 Temel İş Akışı

```
┌─────────────────────────────────────────────────────────┐
│ 1. AFFİLİATE (Trafikçi)                                 │
│ • Facebook/Google Ads'de reklam veriyor                 │
│ • BİZİM sitelerimizin linkini kullanıyor               │
│   → newsalesozphyzenid2.shop?aff=AFF001                │
│   → feroxil-sales.com?aff=AFF002                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. KULLANICI (Müşteri Adayı)                           │
│ • Reklama tıklıyor → BİZİM sitemize geliyor            │
│ • Formu dolduruyor (isim, telefon, adres)              │
│ • Submit → LEAD OLUŞUR                                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. DTEK SİSTEMİ (Bizim Platform)                       │
│ • Tıklamayı kaydediyor (tracking_clicks tablosu)       │
│ • Lead'i kaydediyor (leads tablosu)                     │
│ • Tracking ID oluşturuyor: DTK_2024_11_08_ABC123       │
│ • n8n workflow tetikleniyor                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. n8n WORKFLOW                                         │
│ • Lead'i CallCenter CRM'e gönderiyor (POST)            │
│ • API: crm.esvella.com/api/leads/single                │
│ • Payload: tracking_id, campaign, customer             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. CALLCENTER CRM (Esvella)                            │
│ • Lead'i alıyor                                         │
│ • Agent'a atıyor                                        │
│ • Agent müşteriyi arıyor                                │
│ • Satış oluyor / Reddediliyor                          │
│ • Kargo hazırlanıyor / Gönderiliyor                    │
└────────────────────┬────────────────────────────────────┘
                     │ WEBHOOK ⚡
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 6. WEBHOOK CALLBACK (CRM → DTEK)                        │
│ POST https://dtektracking.com/webhook/crm-status       │
│ {                                                       │
│   tracking_id: "DTK_2024_11_08_ABC123",                │
│   status: "sold",                                       │
│   agent: "Ahmet Yılmaz",                               │
│   order_id: "ORD-123456",                              │
│   amount: 2500                                          │
│ }                                                       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 7. n8n WEBHOOK RECEIVER                                │
│ • Signature validation (güvenlik)                      │
│ • Database güncelle (status = "sold")                  │
│ • Komisyon hesapla (€5.00)                             │
│ • Affiliate'e bildirim (opsiyonel)                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 8. AFFİLİATE PANEL (Real-time görünür)                │
│ Lead DTK_2024_11_08_ABC123:                            │
│ ✅ Status: SATILDI (SOLD)                               │
│ ✅ Agent: Ahmet Yılmaz                                  │
│ ✅ Komisyon: €5.00                                      │
│ ✅ Tarih: 08.11.2025 15:30                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🏗️ Sistem Bileşenleri

### **A) Frontend (Dashboard)**
- **Affiliate Panel:** Trafikçilerin kendi lead'lerini görüp takip ettiği panel
- **Admin Panel:** Tüm affiliate'leri, lead'leri, komisyonları yönettiğimiz panel
- **Tracking Links:** Her affiliate için özel linkler (newsalesozphyzenid2.shop?aff=AFF001)
- **Real-time Stats:** Canlı istatistikler (tıklama, lead, satış, kazanç)

### **B) Backend (API)**
- **Lead Tracking API:** Tıklama ve form submit'lerini kaydeden endpoint'ler
- **Webhook Receiver:** CRM'den gelen status güncellemelerini alan endpoint'ler
- **Affiliate API:** Affiliate login, stats, earnings endpoint'leri
- **CRM Integration:** CallCenter CRM'e lead gönderen servis

### **C) Database (PostgreSQL)**
- **affiliates:** Affiliate bilgileri (code, name, api_token, commission_rate)
- **tracking_clicks:** Tıklama kayıtları (click_id, affiliate_code, ip, referrer)
- **leads:** Lead kayıtları (lead_id, tracking_id, affiliate_code, status, commission)
- **transactions:** Ödeme kayıtları (affiliate_id, amount, type, status)

### **D) n8n Workflows**
- **Lead → CRM Workflow:** Yeni lead geldiğinde CRM'e gönderen workflow
- **Webhook Receiver Workflow:** CRM'den gelen status güncellemelerini işleyen workflow
- **Status Sync Workflow:** Periyodik olarak CRM'i sorgulayan workflow (fallback)
- **Commission Calculator:** Satış olduğunda komisyon hesaplayan workflow

### **E) Tracking Script (JavaScript)**
- **Her sitede çalışan script:** Affiliate parametresini cookie'ye kaydeder
- **Form submit handler:** Lead oluştuğunda backend'e gönderir
- **Click tracking:** Her tıklamayı kaydeder

---

## 📊 Veri Modeli

### **Tracking ID Formatı**
```
DTK_YYYY_MM_DD_XXXXXX

Örnekler:
- DTK_2024_11_08_ABC123
- DTK_2024_11_08_XYZ789

Özellikler:
✅ Benzersiz (unique)
✅ Tarih bilgisi içerir
✅ 6 haneli random kod
✅ CRM'e bu ID gönderilir
✅ Webhook'ta bu ID ile güncelleme gelir
```

### **Lead Durumları (Status)**
```javascript
const LEAD_STATUS = {
  // Başlangıç
  'pending': 'Bekliyor',
  'sent_to_crm': 'CRM\'e Gönderildi',
  
  // CRM Tarafı
  'queued': 'Kuyrukta',
  'assigned': 'Agent\'a Atandı',
  'calling': 'Aranıyor',
  
  // Sonuç
  'contacted': 'İletişim Kuruldu',
  'interested': 'İlgilendi',
  'sold': 'Satış Tamamlandı', // 💰 Komisyon kazanıldı
  'rejected': 'Reddedildi',
  'no_answer': 'Ulaşılamadı',
  'wrong_number': 'Yanlış Numara',
  'callback_requested': 'Tekrar Aranacak',
  
  // Kargo
  'cargo_preparing': 'Kargo Hazırlanıyor',
  'cargo_shipped': 'Kargoya Verildi',
  'cargo_delivered': 'Teslim Edildi',
  'cargo_failed': 'Teslim Edilemedi'
};
```

---

## 🔐 Güvenlik

### **1. API Authentication**
- **API Key:** Her affiliate için unique token
- **Header:** `Authorization: Bearer {token}`
- **Rate Limiting:** IP ve affiliate bazlı limit

### **2. Webhook Security**
- **HMAC Signature:** Webhook'lar imzalanıyor
- **Secret Key:** `DTEKTRACKING_WEBHOOK_SECRET`
- **IP Whitelist:** Sadece CRM IP'sinden gelen istekler kabul

### **3. Data Protection**
- **Müşteri verileri:** Encrypted storage
- **GDPR Compliance:** Veri silme, export hakları
- **Audit Logs:** Tüm işlemler loglanıyor

---

## 📈 Metrikler

### **Affiliate Metrikleri**
- **Clicks:** Kaç tıklama aldı
- **Leads:** Kaç lead oluşturdu
- **Conversion Rate:** Lead / Click oranı
- **Approval Rate:** Satış / Lead oranı
- **Earnings:** Toplam kazanç (approved lead * commission_rate)

### **Sistem Metrikleri**
- **Total Leads:** Toplam lead sayısı
- **Pending Leads:** Bekleyen lead sayısı
- **Active Affiliates:** Aktif affiliate sayısı
- **Revenue:** Toplam satış tutarı
- **Commission Payout:** Ödenecek komisyon

---

## 🚀 Gelecek Özellikler (Roadmap)

### **Faz 1: MVP (Minimum Viable Product)** ✅ Planlama
- [ ] Database schema
- [ ] Basic tracking (click + lead)
- [ ] CRM integration (n8n)
- [ ] Webhook receiver
- [ ] Basic affiliate panel

### **Faz 2: Gelişmiş Özellikler**
- [ ] Real-time dashboard
- [ ] Advanced analytics
- [ ] Automated payments
- [ ] Multi-currency support
- [ ] Custom commission rules

### **Faz 3: Bonus Özellikler** 🎁
- [ ] GraphQL API
- [ ] WebSocket real-time updates
- [ ] JavaScript SDK
- [ ] Webhook retry mechanism
- [ ] Custom fields support

---

## 📁 Dokümantasyon Yapısı

```
Affiliate-lead-yönetimi/
├── 01-SISTEM-GENEL-BAKIS.md          (Bu dosya)
├── 02-DATABASE-SCHEMA.md             (Veritabanı şeması)
├── 03-API-ENDPOINTS.md               (API dokümantasyonu)
├── 04-CRM-ENTEGRASYON.md             (CallCenter CRM entegrasyon detayları)
├── 05-WEBHOOK-DETAYLARI.md           (Webhook payload örnekleri)
├── 06-N8N-WORKFLOWS.md               (n8n workflow'ları)
├── 07-TRACKING-SCRIPT.md             (Frontend tracking script)
├── 08-AFFILIATE-PANEL.md             (Affiliate dashboard tasarımı)
├── 09-ADMIN-PANEL.md                 (Admin dashboard özellikleri)
├── 10-DEPLOYMENT-PLANI.md            (Deployment adımları)
└── 99-NOTLAR-FIKIRLER.md             (Geliştirme notları)
```

---

## 🎯 Sonraki Adımlar

1. ✅ **Genel bakış hazırlandı**
2. ⏳ **Database schema tasarımı** (sonraki dosya)
3. ⏳ **API endpoint'lerini tanımla**
4. ⏳ **CRM entegrasyon detayları**
5. ⏳ **n8n workflow'larını kur**

---

**Not:** Bu döküman canlı bir dokümandır. İlham geldikçe güncellenecek! 💡
