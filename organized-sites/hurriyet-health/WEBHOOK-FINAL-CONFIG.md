# 🎯 WEBHOOK YAPILANDIRMASI - FİNAL

## ✅ İKİ AYRI WEBHOOK SİSTEMİ

Artık **2 farklı webhook** kullanılıyor ve **birbirini etkilemiyor**:

---

## 📋 1. FORM SUBMISSION WEBHOOK (Sipariş)

### URL:
```
https://n8nwork.dtekai.com/webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31
```

### Ne Zaman Tetiklenir?
- Kullanıcı formu doldurduğunda
- "SİPARİŞ VER" butonuna tıkladığında

### Gönderilen Veriler:
```json
{
  "type": "order",
  
  // Kişisel Bilgiler
  "siparisID": "SIP-20251013160520",
  "isim": "Ahmet",
  "soyisim": "Yılmaz",
  "telefon": "0555 123 45 67",
  "ip": "85.98.16.30",
  
  // Zaman ve Kaynak
  "zamanDamgasi": "2025-10-13T16:05:20.000Z",
  "gelenSite": "http://207.180.204.60:8080/",
  "webhookUrl": "https://n8nwork.dtekai.com/webhook/...",
  "yürütmeModu": "üretme",
  
  // Cihaz Bilgileri
  "cihazBilgisi": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36...",
  "cihazDegeri": 35000,
  "cihazModeli": "iPhone 13",
  
  // VIP Detection
  "vipSeviye": "GOLD",
  "vipPuan": 75,
  "oncelik": 8,
  "onerilenAksiyon": "priority_agent",
  
  // Davranış Analizi
  "sayfadaKalisSuresi": 120,
  "scrollDerinligi": 85,
  "etkilesimSayisi": 10
}
```

### N8N'de Kullanım:
```javascript
// Form submission verileri
const name = $json.isim;
const phone = $json.telefon;
const vipTier = $json.vipSeviye;
const vipScore = $json.vipPuan;

// VIP kontrolü
if (vipTier === 'PLATINUM') {
    // Hemen ara, senior agent
} else if (vipTier === 'GOLD') {
    // 15 dakika içinde ara, experienced agent
}
```

---

## 🚪 2. ABANDONMENT TRACKING WEBHOOK (Terk Etme)

### URL:
```
https://n8nwork.dtekai.com/webhook/ef297f4c-c137-46aa-8f42-895253fff2c7
```

### Ne Zaman Tetiklenir?
- Kullanıcı fareyi sayfanın dışına çıkardığında (exit intent)
- Form doldurmadan sayfayı terk ettiğinde

### Gönderilen Veriler:
```json
{
  "type": "abandonment",
  
  // Session Bilgisi
  "sessionId": "SESSION_1697123456_abc123",
  "timestamp": "2025-10-13T16:10:30.000Z",
  "ip": "85.98.16.30",
  "userIP": "85.98.16.30",
  
  // VIP Detection (Form olmadan!)
  "vip": {
    "score": 65,
    "tier": "SILVER",
    "priority": 5,
    "action": "expedited_followup",
    "reasons": [
      "Orta-üst segment cihaz",
      "Normal inceleme (1+ dakika)",
      "Orta scroll (%50+)"
    ]
  },
  
  // Cihaz Bilgileri
  "device": {
    "model": "iPhone 13",
    "value": 35000,
    "type": "mobile",
    "screen": "390x844",
    "isPremium": false,
    "isHighEnd": true
  },
  
  // Terk Analizi
  "abandonment": {
    "reason": "price_objection",
    "strategy": "price_incentive",
    "message": "Özel indirim hazırladık",
    "timing": "2 hours",
    "priority": "high",
    "exitData": {
      "section": "fiyat",
      "timeOnPage": 78,
      "scrollDepth": 65,
      "lastInteraction": {
        "type": "click",
        "target": "price_info"
      }
    }
  },
  
  // Davranış Bilgileri
  "behavior": {
    "pageViews": 1,
    "interactions": 5,
    "maxScrollDepth": 65,
    "timeOnPage": 78,
    "sectionTimes": {
      "başlık": 15,
      "fiyat": 45,
      "form": 18
    }
  }
}
```

### N8N'de Kullanım:
```javascript
// Abandonment verileri
const sessionId = $json.sessionId;
const vipScore = $json.vip.score;
const abandonReason = $json.abandonment.reason;
const timing = $json.abandonment.timing;

// Terk sebebine göre aksiyon
if (abandonReason === 'price_objection') {
    // 2 saat sonra özel indirimli SMS gönder
} else if (abandonReason === 'form_abandonment') {
    // 1 saat sonra formu tamamla mesajı
} else if (abandonReason === 'consideration_phase') {
    // 6 saat sonra stok uyarısı
}
```

---

## 🔄 WEBHOOK AKIŞI

### Senaryo 1: Kullanıcı Formu Dolduruyor
```
1. Kullanıcı sayfayı açar
2. Smart tracking başlar (VIP detection)
3. Kullanıcı formu doldurur
4. "Sipariş Ver" tıklar
5. ✅ FORM SUBMISSION WEBHOOK tetiklenir
   → https://n8nwork.dtekai.com/webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31
6. İsim, telefon, VIP bilgileri N8N'e gider
```

### Senaryo 2: Kullanıcı Sayfayı Terk Ediyor
```
1. Kullanıcı sayfayı açar
2. Smart tracking başlar (VIP detection)
3. Sayfada 78 saniye kalır, %65 scroll yapar
4. Fiyat bölümüne gelir
5. Fareyi sayfanın dışına çıkarır (exit intent)
6. ✅ ABANDONMENT WEBHOOK tetiklenir
   → https://n8nwork.dtekai.com/webhook/ef297f4c-c137-46aa-8f42-895253fff2c7
7. Terk analizi, VIP bilgileri N8N'e gider
```

### Senaryo 3: Kullanıcı Formu Doldurup Çıkıyor (ÖNEMLİ!)
```
1. Kullanıcı sayfayı açar
2. Sayfada dolaşır (abandonment tracking aktif)
3. Formu doldurur ve gönderir
4. ✅ FORM SUBMISSION WEBHOOK tetiklenir (sipariş)
5. Kullanıcı sayfayı kapatır
6. ❌ ABANDONMENT WEBHOOK tetiklenmez (zaten sipariş verdi)
```

---

## 📊 N8N WORKFLOW ÖNERİSİ

### Workflow 1: Form Submission (Sipariş)
```javascript
// Webhook trigger: bc74f59e-54c2-4521-85a1-6e21a0438c31
// Gelen veri: $json

// 1. VIP kontrolü
const vipTier = $json.vipSeviye;
const vipScore = $json.vipPuan;

// 2. Agent ataması
let agentType, callTiming, discount;

if (vipScore >= 85) {
    agentType = 'senior';
    callTiming = '5 minutes';
    discount = 25;
} else if (vipScore >= 70) {
    agentType = 'experienced';
    callTiming = '15 minutes';
    discount = 15;
} else {
    agentType = 'standard';
    callTiming = '1 hour';
    discount = 10;
}

// 3. CRM'e kaydet
// 4. SMS gönder
// 5. Agent'a bildir
```

### Workflow 2: Abandonment Tracking (Terk Etme)
```javascript
// Webhook trigger: ef297f4c-c137-46aa-8f42-895253fff2c7
// Gelen veri: $json

// 1. Terk sebebini analiz et
const reason = $json.abandonment.reason;
const strategy = $json.abandonment.strategy;
const timing = $json.abandonment.timing;

// 2. Zamanlayıcı kur
// Örnek: "2 hours" → 2 saat sonra işlem yap

// 3. Strateji uygula
if (reason === 'price_objection') {
    // Özel indirim SMS'i hazırla
} else if (reason === 'form_abandonment') {
    // Form tamamlama hatırlatması
}

// 4. VIP kontrolü
if ($json.vip.score >= 70) {
    // Daha kısa sürede, daha iyi teklif
}
```

---

## 🎯 FARKLAR

| Özellik | Form Submission | Abandonment |
|---------|----------------|-------------|
| **Webhook URL** | `bc74f59e...` | `ef297f4c...` |
| **Tetikleme** | Form gönderildiğinde | Sayfa terk edildiğinde |
| **İsim/Telefon** | ✅ Var | ❌ Yok |
| **VIP Detection** | ✅ Var | ✅ Var |
| **Cihaz Bilgisi** | ✅ Var | ✅ Var |
| **Terk Analizi** | ❌ Yok | ✅ Var |
| **Sipariş ID** | ✅ Var | ❌ Yok |
| **Session ID** | ❌ Yok | ✅ Var |

---

## ✅ KONTROL LİSTESİ

- [x] İki ayrı webhook URL'i tanımlandı
- [x] Form submission webhook aktif
- [x] Abandonment webhook aktif
- [x] Duplicate webhook problemi çözüldü
- [x] Her webhook farklı veri gönderiyor
- [x] N8N'de iki ayrı workflow oluşturulabilir

---

## 🧪 TEST

### Test 1: Form Submission
1. http://207.180.204.60:8080 aç
2. Formu doldur ve gönder
3. N8N'de `bc74f59e...` webhook'unda **1 istek** göreceksin
4. İsim, telefon, VIP bilgileri olacak

### Test 2: Abandonment
1. http://207.180.204.60:8080 aç
2. Sayfada dolaş (form doldurma!)
3. Fareyi sayfanın dışına çıkar
4. N8N'de `ef297f4c...` webhook'unda **1 istek** göreceksin
5. Terk analizi, VIP bilgileri olacak

---

**🎉 Sistem tamamen ayrıştırıldı ve optimize edildi!**

**Son güncelleme:** 13 Ekim 2025, 16:10
