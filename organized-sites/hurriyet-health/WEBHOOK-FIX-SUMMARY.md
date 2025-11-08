# 🔧 WEBHOOK SORUNU ÇÖZÜLMESİ

## ❌ SORUN:
1. **İki webhook tetikleniyordu:**
   - Eski: `rowww4s04sc8o4gk04swgog4.dtekai.com/api/order`
   - Yeni: `n8nwork.dtekai.com/webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31`

2. **Sunucu IP gönderiliyordu** (207.180.204.60) - Kullanıcı IP değil!
3. **İsim "Bilinmeyen" gözüküyordu**

## ✅ ÇÖZÜM:

### 1. Eski Webhook Kaldırıldı
`rowww4s04sc8o4gk04swgog4.dtekai.com` URL'si kaldırıldı.

**Artık sadece N8N webhook'u kullanılıyor:**
```javascript
https://n8nwork.dtekai.com/webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31
```

### 2. Kullanıcı IP Düzeltildi

**ÖNCESİ:**
```json
{
  "ip": "207.180.204.60"  // ❌ Sunucu IP'si
}
```

**SONRASI:**
```json
{
  "ip": "176.88.23.45"  // ✅ Kullanıcının gerçek IP'si
}
```

**Nasıl Çalışıyor:**
1. Frontend → `/api/get-user-ip` endpoint'ine istek atar
2. Backend → Kullanıcının gerçek IP'sini tespit eder (`req.realUserIPv4`)
3. Frontend → IP'yi sessionData'ya kaydeder
4. Form/Abandonment → IP backend'e gönderilir
5. Backend → N8N webhook'a kullanıcı IP'sini iletir

### 3. İsim ve Soyisim Düzeltildi

**server.cjs'de doğru mapping:**
```javascript
const webhookData = {
    isim: name,        // ✅ Form'dan gelen "name"
    soyisim: surname,  // ✅ Form'dan gelen "surname"
    telefon: phone,    // ✅ Form'dan gelen "phone"
    ip: req.realUserIPv4  // ✅ Kullanıcı IP'si
};
```

## 📊 ARTIK GİDEN VERİLER:

### Form Gönderildiğinde (SADECE 1 WEBHOOK):

```json
{
  // Kişisel Bilgiler
  "isim": "Ahmet",          // ✅ Doğru
  "soyisim": "Yılmaz",      // ✅ Doğru
  "telefon": "0555 123 45 67", // ✅ Doğru
  
  // IP Bilgisi
  "ip": "176.88.23.45",     // ✅ Kullanıcı IP'si (sunucu değil!)
  
  // Sipariş Bilgisi
  "siparisID": "SIP-20251013155726",
  "zamanDamgasi": "2025-10-13T15:57:26.000Z",
  "webhookUrl": "https://n8nwork.dtekai.com/webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31",
  "yürütmeModu": "üretme",
  
  // Cihaz Bilgisi
  "cihazBilgisi": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)...",
  "cihazDegeri": 35000,
  "cihazModeli": "iPhone 13",
  
  // Kaynak
  "gelenSite": "http://207.180.204.60:8080",
  
  // VIP Detection (YENİ!)
  "vipSeviye": "GOLD",
  "vipPuan": 75,
  "oncelik": 8,
  "onerilenAksiyon": "priority_agent",
  
  // Davranış Analizi (YENİ!)
  "sayfadaKalisSuresi": 120,
  "scrollDerinligi": 85,
  "etkilesimSayisi": 10
}
```

### Sayfa Terkedildiğinde (ABANDONMENT):

```json
{
  "type": "abandonment",
  
  // IP Bilgisi
  "ip": "176.88.23.45",      // ✅ Kullanıcı IP'si
  "userIP": "176.88.23.45",  // ✅ Duplicate
  
  // Session
  "sessionId": "SESSION_1697123456_abc123",
  "timestamp": "2025-10-13T15:57:30.000Z",
  
  // VIP Detection
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
  
  // Cihaz
  "device": {
    "model": "iPhone 13",
    "value": 35000,
    "type": "mobile",
    "screen": "390x844"
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
      "lastInteraction": "price_info"
    }
  },
  
  // Davranış
  "behavior": {
    "timeOnPage": 78,
    "scrollDepth": 65,
    "interactions": 5,
    "pageViews": 1
  }
}
```

## 🔍 IP TESPİT SİSTEMİ:

Backend şu sırayla IP'yi tespit eder:

```javascript
1. req.headers['cf-connecting-ip']      // Cloudflare
2. req.headers['x-forwarded-for']       // Proxy/Load Balancer
3. req.headers['x-real-ip']             // Nginx
4. req.connection.remoteAddress         // Direkt bağlantı
5. req.socket.remoteAddress             // Socket IP
```

IPv6'yı IPv4'e dönüştürür:
- `::ffff:192.168.1.1` → `192.168.1.1`
- `::1` → `127.0.0.1`

## ✅ KONTROL LİSTESİ:

- [x] Eski webhook URL'si kaldırıldı
- [x] Sadece N8N webhook kullanılıyor
- [x] Kullanıcı IP'si doğru gönderiliyor
- [x] İsim, soyisim, telefon doğru gönderiliyor
- [x] VIP detection verileri eklendi
- [x] Davranış analizi verileri eklendi
- [x] Abandonment tracking çalışıyor
- [x] Tek webhook tetikleniyor

## 🧪 TEST:

### Manuel Test:
```bash
curl -X POST http://207.180.204.60:8080/api/submit-order \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test",
    "surname": "User",
    "phone": "0555 999 88 77",
    "analytics": {
      "vip": {"tier": "GOLD", "score": 75},
      "device": {"model": "iPhone 13", "value": 35000},
      "behavior": {"timeOnPage": 120, "scrollDepth": 85}
    }
  }'
```

### Tarayıcıdan Test:
1. http://207.180.204.60:8080 aç
2. F12 → Console
3. `🌐 User IP: ...` göreceksin
4. Formu doldur
5. N8N webhook'ta **sadece 1 istek** göreceksin!

## 🎯 SONUÇ:

✅ **Artık sadece 1 webhook tetikleniyor**
✅ **Kullanıcı IP'si doğru gidiyor**
✅ **İsim, soyisim, telefon doğru**
✅ **VIP ve davranış verileri zenginleştirilmiş**

---

**Son güncelleme:** 13 Ekim 2025, 15:57
**Durum:** ✅ Tamamlandı ve test edildi
