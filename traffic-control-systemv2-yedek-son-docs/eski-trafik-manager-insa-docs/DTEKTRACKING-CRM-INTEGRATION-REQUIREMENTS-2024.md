# 🎯 DTEKTRACKING.COM - CRM WEBHOOK ENTEGRASYON GEREKSİNİMLERİ
## Affiliate Traffic Control & Lead Tracking System Integration

**Doküman Versiyon:** 1.0  
**Tarih:** 5 Kasım 2024  
**Sistem:** dtektracking.com Traffic Control System  
**Entegrasyon Partneri:** dtekapp CRM (Laravel 11)  
**Doküman Tipi:** Teknik Gereksinim Spesifikasyonu

---

## 📊 YÖNETİCİ ÖZETİ

dtektracking.com Traffic Control System, affiliate marketing ve lead tracking operasyonlarını yöneten merkezi sistemdir. Bu doküman, dtekapp CRM ile yapılacak webhook entegrasyonunun teknik gereksinimlerini tanımlar.

**Temel İhtiyaç:** CRM'e gönderilen müşterilerin (lead) durum güncellemelerinin gerçek zamanlı olarak tracking sistemine iletilmesi.

---

## 🏗️ SİSTEM MİMARİSİ

### Akış Diyagramı
```
┌─────────────────────┐     Tracking ID + Lead     ┌──────────────┐
│  dtektracking.com   │ ─────────────────────────> │  dtekapp CRM │
│  Traffic Control    │                             │   Call Center│
└─────────────────────┘                             └──────────────┘
         ▲                                                  │
         │                                                  │
         │              Webhook Status Update               │
         └──────────────────────────────────────────────────┘
```

### Veri Akışı
1. **Lead Gönderimi:** dtektracking.com → CRM (Tracking ID ile)
2. **İşlem:** CRM'de müşteri işlenir (çağrı, satış, vb.)
3. **Durum Bildirimi:** CRM → dtektracking.com (Webhook)
4. **Güncelleme:** Tracking sisteminde buyer/campaign güncellenir

---

## 🔌 WEBHOOK ENTEGRASYON DETAYLARI

### Ana Webhook Endpoint
```
POST https://dtektracking.com/webhook/crm-status
Content-Type: application/json
X-Signature: sha256={HMAC_SIGNATURE}
X-Timestamp: {UNIX_TIMESTAMP}
```

### Payload Formatı
```json
{
  "tracking_id": "DTK_2024_11_05_ABC123",
  "status": "contacted",
  "timestamp": "2024-11-05T14:30:00Z",
  "details": {
    "agent_notes": "Müşteri ürünle ilgilendi",
    "call_duration": 180,
    "agent_id": "agent_123"
  }
}
```

---

## 📋 DURUM KODLARI (STATUS CODES)

| Durum Kodu | Açıklama | Komisyon Etkisi | Öncelik |
|------------|----------|-----------------|---------|
| `new` | Yeni kayıt, henüz işlenmemiş | ❌ | Düşük |
| `contacted` | İletişim kuruldu | ❌ | Orta |
| `interested` | Müşteri ilgili | ❌ | Yüksek |
| `sold` | **Satış tamamlandı** | ✅ **Komisyon tetiklenir** | **Kritik** |
| `cancelled` | İptal edildi | ❌ | Orta |
| `no_answer` | Ulaşılamadı | ❌ | Düşük |
| `follow_up` | Takip edilecek | ❌ | Orta |

### Kritik Durum: SOLD
`sold` durumu geldiğinde sistem otomatik olarak:
- Affiliate komisyonunu hesaplar
- Buyer'a bildirim gönderir
- Ödeme kaydı oluşturur

---

## 🔐 GÜVENLİK GEREKSİNİMLERİ

### 1. HMAC Signature Doğrulama
```php
// PHP Örnek Implementasyon
function validateWebhookSignature($payload, $signature, $secret) {
    $expected = 'sha256=' . hash_hmac('sha256', $payload, $secret);
    return hash_equals($expected, $signature);
}
```

### 2. IP Whitelist
```
Production: 109.123.247.201  # dtekapp production server
Test: [TEST_SERVER_IP]        # Test sunucusu IP'si
```

### 3. Rate Limiting
- Max 100 webhook/dakika per tracking_id
- Max 1000 webhook/dakika toplam
- Retry policy: 3 deneme, exponential backoff

---

## 🆔 TRACKING ID STANDARDI

### Format
```
DTK_YYYY_MM_DD_XXXXXX
```

### Örnekler
- `DTK_2024_11_05_ABC123` - 5 Kasım 2024 tarihli lead
- `DTK_2024_11_05_XYZ789` - Aynı tarih, farklı lead

### Özellikler
- **Benzersiz (Unique):** Her lead için tek ID
- **Tarih Bilgisi:** Oluşturma tarihi embedded
- **Buyer Referansı:** Tracking sisteminde saklanır
- **Campaign Bağlantısı:** Tracking sisteminde eşleştirilir

---

## 🧪 TEST ORTAMI

### Test Endpoint
```
POST https://staging.dtektracking.com/webhook/crm-status
```

### Test Tracking ID'leri
```
DTK_TEST_001 - Test müşterisi 1
DTK_TEST_002 - Test müşterisi 2
DTK_TEST_SOLD - Satış testi için
```

### Test CURL Komutları

#### Basit Durum Güncellemesi
```bash
curl -X POST https://dtektracking.com/webhook/crm-status \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=test_signature" \
  -d '{
    "tracking_id": "DTK_2024_11_05_TEST001",
    "status": "contacted",
    "timestamp": "2024-11-05T14:30:00Z"
  }'
```

#### Satış Bildirimi
```bash
curl -X POST https://dtektracking.com/webhook/crm-status \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=test_signature" \
  -d '{
    "tracking_id": "DTK_2024_11_05_TEST001",
    "status": "sold",
    "timestamp": "2024-11-05T15:00:00Z",
    "details": {
      "order_id": "ORD-2024-1234",
      "amount": 2500
    }
  }'
```

---

## 📊 RESPONSE FORMATLARI

### Başarılı Response (200 OK)
```json
{
  "success": true,
  "tracking_id": "DTK_2024_11_05_ABC123",
  "message": "Status updated successfully",
  "processed_at": "2024-11-05T15:00:01Z"
}
```

### Hata Response (400/401/500)
```json
{
  "success": false,
  "error_code": "INVALID_TRACKING_ID",
  "message": "Tracking ID not found in system",
  "timestamp": "2024-11-05T15:00:01Z"
}
```

---

## 🔄 RETRY MEKANİZMASI

CRM tarafında uygulanması gereken retry politikası:

1. **İlk Deneme:** Immediate
2. **2. Deneme:** 30 saniye sonra
3. **3. Deneme:** 2 dakika sonra
4. **Son Deneme:** 10 dakika sonra

Başarısız webhook'lar loglanmalı ve raporlanmalıdır.

---

## 📝 OPSIYONEL: SORGULAMA API'Sİ

Webhook'ların yanında manuel sorgulama için:

```
GET https://api.dtekapp.com/v1/lead/status/{tracking_id}
Authorization: Bearer {API_TOKEN}

Response:
{
  "tracking_id": "DTK_2024_11_05_ABC123",
  "current_status": "contacted",
  "last_update": "2024-11-05T14:30:00Z",
  "call_count": 3,
  "total_duration": 540
}
```

---

## 🚀 ENTEGRASYON AŞAMALARI

### Faz 1: Temel Entegrasyon (HEMEN)
- [x] Webhook endpoint kurulumu
- [x] Basit durum güncellemeleri (contacted, sold, cancelled)
- [x] Signature doğrulama
- [x] Test ortamı

### Faz 2: Gelişmiş Özellikler (2. AŞAMA)
- [ ] Detaylı çağrı istatistikleri
- [ ] Sipariş detayları
- [ ] Müşteri notları
- [ ] Çoklu durum geçmişi

### Faz 3: Raporlama (3. AŞAMA)
- [ ] Günlük özet raporları
- [ ] Performans metrikleri
- [ ] Başarı oranı analizleri

---

## ❓ CRM EKİBİNDEN CEVAPLANMASI GEREKEN SORULAR

1. **Tracking ID Saklama:** CRM'de `tracking_id` alanı mevcut mu? Yoksa eklenebilir mi?
2. **Webhook Altyapısı:** Mevcut webhook sisteminiz var mı? Yoksa geliştirme süresi?
3. **Test Ortamı:** Test endpoint'i ne zaman hazır olur?
4. **Retry Mekanizması:** Başarısız webhook'lar için retry desteği var mı?
5. **Rate Limiting:** Dakikada kaç webhook gönderebilirsiniz?
6. **Dokümantasyon:** API/Webhook dokümantasyonu mevcut mu?

---

## 📞 İLETİŞİM BİLGİLERİ

### dtektracking.com Traffic Control System
- **Domain:** dtektracking.com
- **Webhook Base URL:** https://dtektracking.com/webhook/
- **Teknik Destek:** teknik@dtektracking.com
- **Acil Durum:** +90 XXX XXX XX XX

### Teknik Sorumlu
- **Ad Soyad:** [Teknik Sorumlu Adı]
- **E-mail:** [email@dtektracking.com]
- **Rol:** Traffic Control System Administrator

---

## 📌 NOTLAR VE AÇIKLAMALAR

### Önemli Noktalar
1. ✅ **Komisyon Hesaplama:** dtektracking.com tarafında yapılır, CRM'den bilgi gerekmez
2. ✅ **Buyer/Affiliate Yönetimi:** dtektracking.com'da yönetilir
3. ✅ **Campaign Tracking:** dtektracking.com'da yapılır
4. ⚠️ **Kritik Gereksinim:** Her webhook'ta `tracking_id` ZORUNLU
5. ⚠️ **Performans:** Webhook response süresi max 5 saniye

### Sistem Avantajları
- **Gerçek Zamanlı Takip:** Anlık durum güncellemeleri
- **Otomatik Komisyon:** Satış durumunda otomatik hesaplama
- **Merkezi Yönetim:** Tüm affiliate/buyer tek yerden
- **Şeffaf Raporlama:** Anlık performans metrikleri

---

## 📄 DOKÜMAN VERSİYON GEÇMİŞİ

| Versiyon | Tarih | Değişiklik | Hazırlayan |
|----------|-------|------------|------------|
| 1.0 | 05.11.2024 | İlk versiyon | dtektracking.com Team |

---

## ✅ ONAY VE KABUL

Bu doküman, dtektracking.com Traffic Control System ile dtekapp CRM arasındaki webhook entegrasyon gereksinimlerini tanımlar.

**Hazırlayan:** dtektracking.com Teknik Ekibi  
**Tarih:** 5 Kasım 2024  
**Doküman Durumu:** ✅ Aktif / Gönderildi

---

**SON NOT:** Bu entegrasyon, minimum karmaşıklık prensibiyle tasarlanmıştır. CRM'den sadece `tracking_id` ve `status` bilgisi beklenmektedir. Tüm kompleks işlemler (komisyon, buyer yönetimi, campaign tracking) dtektracking.com tarafında yönetilmektedir.

---

© 2024 dtektracking.com - Traffic Control System. All rights reserved.