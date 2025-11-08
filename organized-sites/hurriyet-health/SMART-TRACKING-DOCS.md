# 🎯 SMART TRACKING SYSTEM - Dokümantasyon

## 📊 Sistem Özeti

Bu akıllı tracking sistemi, kullanıcı davranışlarını analiz ederek:
1. **VIP müşterileri** otomatik tespit eder
2. **Terk etme sebeplerini** analiz eder
3. **Geri dönüş stratejileri** önerir
4. **Çağrı merkezi için** zengin veri sağlar

---

## 🔥 ÖNEMLİ: Veri Akışı

### Form Gönderildiğinde N8N'e Giden Veriler:

```json
{
  "siparisID": "SIP-20251013173000",
  "isim": "Ahmet",
  "soyisim": "Yılmaz", 
  "telefon": "0555 123 45 67",
  "ip": "176.88.23.45",
  
  // VIP DETECTION VERILERI
  "vipSeviye": "PLATINUM",           // PLATINUM, GOLD, SILVER, NORMAL
  "vipPuan": 92,                     // 0-100 arası puan
  "oncelik": 10,                     // 1-10 arası öncelik
  "onerilenAksiyon": "immediate_executive_call",
  
  // CİHAZ BİLGİLERİ
  "cihazDegeri": 52000,              // TL cinsinden cihaz değeri
  "cihazModeli": "iPhone 15 Pro Max",
  
  // DAVRANIŞSAL VERİLER
  "sayfadaKalisSuresi": 245,         // Saniye
  "scrollDerinligi": 98,             // Yüzde (0-100)
  "etkilesimSayisi": 15,             // Click, scroll, form focus sayısı
  
  // DİĞER
  "cihazBilgisi": "Mozilla/5.0...",
  "gelenSite": "https://...",
  "zamanDamgasi": "2025-10-13T17:30:00.000Z"
}
```

---

## 💎 1. VIP DETECTION (Otomatik Premium Müşteri Tespiti)

### VIP Puanlama Sistemi (0-100):

| Kriter | Max Puan | Açıklama |
|--------|----------|----------|
| **Cihaz Değeri** | 30 | 40K+ TL cihaz = 30 puan |
| **Sayfa Etkileşimi** | 30 | 3+ dakika = 30 puan |
| **Scroll Derinliği** | 20 | %90+ scroll = 20 puan |
| **İş Saati Dışı** | 10 | Akşam/gece = 10 puan |
| **Etkileşim Kalitesi** | 10 | 10+ tıklama = 10 puan |

### VIP Seviyeleri:

```javascript
PLATINUM (85+ puan):
• 🔥 5 dakika içinde ara
• 👔 Senior/Executive agent
• 💎 %25 özel VIP indirimi
• 🚚 Ücretsiz express kargo
• ⚡ En yüksek öncelik

GOLD (70-84 puan):
• ⚡ 15 dakika içinde ara
• 🎯 Deneyimli agent
• 💰 %15 iyi indirim
• 📞 Direkt hat
• 🌟 Yüksek öncelik

SILVER (50-69 puan):
• 📞 30 dakika içinde ara
• 👤 Standart agent
• 💵 %10 indirim
• 📋 Normal öncelik

NORMAL (<50 puan):
• 📅 Standart takip
• 💬 Normal işlem
```

### VIP Tespit Örnekleri:

**Örnek 1: PLATINUM Müşteri**
- Cihaz: iPhone 15 Pro Max (52K TL) → 30 puan
- Sayfa süresi: 4 dakika → 30 puan
- Scroll: %98 → 20 puan
- Saat: 21:30 (iş dışı) → 10 puan
- Etkileşim: 18 tıklama → 10 puan
- **TOPLAM: 100 puan = PLATINUM**
- ⚡ Aksiyon: **Hemen ara, özel indirim sun**

**Örnek 2: GOLD Müşteri**
- Cihaz: Samsung S24 (45K TL) → 30 puan
- Sayfa süresi: 2.5 dakika → 20 puan
- Scroll: %85 → 15 puan
- Saat: 14:00 (iş saati) → 0 puan
- Etkileşim: 7 tıklama → 5 puan
- **TOPLAM: 70 puan = GOLD**
- ⚡ Aksiyon: **15 dakika içinde ara**

**Örnek 3: NORMAL Müşteri**
- Cihaz: Android orta segment (15K TL) → 10 puan
- Sayfa süresi: 1 dakika → 10 puan
- Scroll: %40 → 10 puan
- **TOPLAM: 30 puan = NORMAL**
- ⚡ Aksiyon: **Standart takip**

---

## 🔍 2. AKILLI GERİ DÖNÜŞ SİSTEMİ (Smart Retargeting)

### Terk Etme Analizi:

Sistem kullanıcının **neden** ve **nerede** terk ettiğini analiz eder:

```javascript
Terk Noktası Tespiti:
{
    exit_section: "fiyat",          // Hangi bölümde çıktı
    time_on_section: 45,            // O bölümde ne kadar kaldı
    scroll_hesitation: "garanti",   // Nerede yavaşladı
    last_interaction: "testimonial", // Son tıklama
    exit_trigger: "mouse_leave"     // Nasıl çıktı
}
```

### Geri Dönüş Stratejileri:

| Terk Sebebi | Strateji | Mesaj | Zamanlama | Öncelik |
|-------------|----------|-------|-----------|---------|
| **Quick Bounce** (<30sn) | Dikkat Çekme | "Önemli fırsatı kaçırmayın" | 1 gün sonra | Düşük |
| **Fiyat İtirazı** | Fiyat Teşviki | "Özel indirim hazırladık" | 2 saat sonra | Yüksek |
| **Form Terk** | Form Kurtarma | "Siparişi tamamlayın" | 1 saat sonra | Çok Yüksek |
| **Sosyal Kanıt** | Güven Artırma | "Daha fazla müşteri yorumu" | 4 saat sonra | Orta |
| **Uzun İnceleme** | Aciliyet/Kıtlık | "Son fırsat! Stoklar tükeniyor" | 6 saat sonra | Yüksek |

### N8N'e Giden Terk Verisi:

```json
{
  "type": "abandonment",
  "sessionId": "SESSION_1697123456_abc123",
  
  "abandonment": {
    "reason": "price_objection",
    "strategy": "price_incentive",
    "message": "Sizin için özel indirim hazırladık",
    "timing": "2 hours",
    "priority": "high",
    "exitData": {
      "section": "fiyat",
      "timeOnPage": 78,
      "scrollDepth": 65,
      "lastInteraction": "price_info"
    }
  },
  
  "vip": {
    "score": 65,
    "tier": "SILVER",
    "priority": 5
  },
  
  "device": {
    "model": "iPhone 13",
    "value": 35000
  }
}
```

---

## 📊 3. CONSOLE'DA GÖRECEĞİNİZ LOGLAR

Tarayıcı console'unda (F12) görecekleriniz:

```javascript
🚀 Smart Tracking System Başlatıldı

📄 Page View: {url: "...", title: "..."}

💎 VIP Score Calculated: {
  score: 85,
  tier: "PLATINUM",
  priority: 10,
  reasons: [
    "Premium cihaz (40K+)",
    "Derin inceleme (3+ dakika)",
    "Tam sayfa incelemesi (%90+)"
  ]
}

👆 Interaction: {type: "click", target: "BUTTON"}

🔄 Behavior Update: {
  timeOnPage: 120,
  scrollDepth: 85,
  vipScore: 85,
  vipTier: "PLATINUM"
}

🚪 Exit Intent Detected: {
  currentSection: "fiyat",
  scrollDepth: 65,
  timeOnPage: 78
}

📊 ABANDONMENT ANALYTICS: {...}
```

---

## 🎯 4. ÇAĞRI MERKEZİ İÇİN DEĞER

### Agent Dashboard'da Göreceğiniz:

```
┌─────────────────────────────────────────┐
│ 🔥 PLATINUM MÜŞTERİ - HEMEN ARA!       │
├─────────────────────────────────────────┤
│ İsim: Ahmet Yılmaz                      │
│ Telefon: 0555 123 45 67                 │
│                                         │
│ 💎 VIP Puanı: 92/100                    │
│ 📱 Cihaz: iPhone 15 Pro Max (52K TL)    │
│ ⏱️ Sayfa Süresi: 4 dakika 5 saniye      │
│ 📊 Scroll: %98 (tam okuma)              │
│ 🎯 Etkileşim: 18 tıklama (çok ilgili)  │
│                                         │
│ ✅ ÖNERİLEN STRATEJİ:                   │
│ • 5 dakika içinde ara                   │
│ • %25 VIP indirimi sun                  │
│ • Express kargo öner                    │
│ • Senior agent ata                      │
└─────────────────────────────────────────┘
```

### Agent İçin Hazır Argümanlar:

**PLATINUM Müşteri için:**
> "Merhaba Ahmet Bey, sizi Premium müşterilerimiz arasında görüyorum. 
> iPhone 15 Pro Max kullanıyorsunuz, değerli zamanınızı ayırarak 
> ürünümüzü 4 dakika boyunca detaylı incelediğinizi görüyoruz.
> Sizin için özel %25 VIP indirimi ve ücretsiz express kargo 
> hazırladık..."

**GOLD Müşteri için:**
> "Merhaba, ürünümüze gösterdiğiniz ilgi için teşekkürler.
> Sayfamızda 2.5 dakika geçirdiğinizi, neredeyse tüm içeriği 
> okuduğunuzu görüyorum. Sizin için özel %15 indirim..."

---

## 🚀 5. SİSTEM KULLANIMI

### Otomatik Çalışma:

1. Kullanıcı sayfayı açar → **Tracking başlar**
2. Her scroll, click, form fokus → **Kaydedilir**
3. Her 10 saniyede → **VIP skoru güncellenir**
4. Kullanıcı çıkar → **Terk analizi yapılır ve N8N'e gönderilir**
5. Form gönderilir → **Tüm analytics webhook'a eklenir**

### Manuel Test:

Tarayıcı console'unda (F12):

```javascript
// Mevcut analytics verilerini gör
console.log(window.smartTracker.getAnalyticsData());

// Mevcut session verisini gör
console.log(window.smartTracker.sessionData);

// VIP skorunu manuel hesapla
window.smartTracker.calculateVIPScore();
```

---

## 📝 6. N8N WORKFLOW ÖNERİLERİ

### Webhook'tan Gelen Veriyi İşleme:

```javascript
// N8N Function Node
const vipTier = $json.vipSeviye;
const vipScore = $json.vipPuan;
const phone = $json.telefon;
const name = $json.isim;

// Öncelik belirle
let callTiming = '24 hours';
let discount = 10;
let agent = 'standard';

if (vipTier === 'PLATINUM') {
    callTiming = '5 minutes';
    discount = 25;
    agent = 'senior';
} else if (vipTier === 'GOLD') {
    callTiming = '15 minutes';
    discount = 15;
    agent = 'experienced';
}

return {
    phone: phone,
    name: name,
    callTiming: callTiming,
    discount: discount,
    agentType: agent,
    priority: vipScore
};
```

### Çağrı Merkezi Entegrasyonu:

1. **Yüksek Öncelik Kuyruk:** VIP 85+ → Anında executive'e yönlendir
2. **Orta Öncelik Kuyruk:** VIP 70-84 → Deneyimli agent'a yönlendir
3. **Normal Kuyruk:** VIP <70 → Standart işlem

---

## ✅ KURULUM DURUMU

- [x] `smart-tracking.js` oluşturuldu
- [x] `index.html`'e eklendi
- [x] `server.cjs`'e API endpoint'leri eklendi
- [x] Form submission'a analytics entegre edildi
- [x] N8N webhook'a VIP verileri eklendi

## 🌐 TEST

Web sitesi: http://207.180.204.60:8080

1. Sayfayı aç
2. F12 ile console'u aç
3. Sayfada scroll yap, tıkla
4. Console'da `window.smartTracker.getAnalyticsData()` yaz
5. VIP skorunu ve tier'ı gör!

---

## 🎓 ÖNEMLİ NOTLAR

1. **Real-time Tracking:** Her eylem anlık olarak kaydedilir
2. **Non-intrusive:** Kullanıcı deneyimini etkilemez
3. **Privacy-focused:** Hassas veri toplamaz
4. **Performance:** Sayfa hızını etkilemez
5. **Fallback:** Sistem çökerse form yine çalışır

---

**🎯 Sonuç:** Artık her müşteri için zengin analitik veriniz var!
