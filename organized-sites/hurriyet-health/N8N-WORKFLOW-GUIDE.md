# 🎯 N8N WORKFLOW KURULUM REHBERİ
**Proje:** OZPHYZEN Landing Page - Smart Tracking System  
**Tarih:** 13 Ekim 2025

---

## 📊 OPTIMAL WORKFLOW YAPISI

### Yaklaşım: 2 Ayrı Webhook - Tek Workflow

Bu yapı **en temiz ve bakımı kolay** çözümdür.

```
┌────────────────────────────────────────────────────────────────┐
│                  N8N WORKFLOW: OZPHYZEN                        │
│              (Tek workflow, iki webhook node)                   │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────── FORM DÖNÜŞÜ FLOW ──────────────────────┐
│                                                                 │
│  📥 WEBHOOK 1: Form Dönüşü                                     │
│     Webhook URL: bc74f59e-54c2-4521-85a1-6e21a0438c31         │
│     Method: POST                                                │
│     Path: /webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31       │
│     ↓                                                           │
│     │                                                           │
│  🌐 HTTP Request: IP Geolocation                               │
│     URL: https://api.ipgeolocation.io/ipgeo                    │
│     Method: GET                                                 │
│     Query: ?apiKey=YOUR_KEY&ip={{ $json.body.ip }}            │
│     ↓                                                           │
│     │                                                           │
│  ✏️ Edit Fields: Webhook + IP Geo Merge                       │
│     Mode: Manual Mapping                                        │
│     Fields: 27 alanlar (detay aşağıda)                        │
│     ↓                                                           │
│     │                                                           │
│  🔧 Cihaz-Bilgisi: JavaScript                                  │
│     User-Agent parsing                                          │
│     Data trimming                                               │
│     cihazTipi detection                                         │
│     ↓                                                           │
│     │                                                           │
│  📊 Google Sheets: Append Row                                  │
│     Document: ESVELLA-LEAD                                      │
│     Sheet: Dönüşümler                                          │
│     Columns: 27 kolon                                          │
│     ↓                                                           │
│     │                                                           │
│  ✅ Respond to Webhook                                         │
│     Status: 200                                                 │
│     Body: { "success": true, "message": "Kaydedildi" }        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────────── TERKETME FLOW ────────────────────────┐
│                                                                 │
│  📥 WEBHOOK 2: Terketme                                        │
│     Webhook URL: ef297f4c-c137-46aa-8f42-895253fff2c7         │
│     Method: POST                                                │
│     Path: /webhook/ef297f4c-c137-46aa-8f42-895253fff2c7       │
│     ↓                                                           │
│     │                                                           │
│  🌐 HTTP Request: IP Geolocation                               │
│     URL: https://api.ipgeolocation.io/ipgeo                    │
│     Method: GET                                                 │
│     Query: ?apiKey=YOUR_KEY&ip={{ $json.ip }}                 │
│     ↓                                                           │
│     │                                                           │
│  ✏️ Edit Fields: Abandonment Data Parse                       │
│     Mode: Manual Mapping                                        │
│     Fields: 18 alan (detay aşağıda)                           │
│     ↓                                                           │
│     │                                                           │
│  📊 Google Sheets: Append Row                                  │
│     Document: ESVELLA-LEAD                                      │
│     Sheet: Terketmeler                                         │
│     Columns: 18 kolon                                          │
│     ↓                                                           │
│     │                                                           │
│  ✅ Respond to Webhook                                         │
│     Status: 200                                                 │
│     Body: { "success": true, "message": "Tracked" }           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ ADIM ADIM KURULUM

### ADIM 1: Google Sheets Hazırlık

#### 1.1 "Dönüşümler" Sayfası Kolonları (A1-AA1)

| Kolon | Başlık | N8N Expression | Açıklama |
|-------|--------|----------------|----------|
| A | Sipariş ID | `{{ $json.body.siparisID }}` | SIP-20251013161708 |
| B | Tarih | `{{ DateTime.fromISO($json.body.zamanDamgasi).toFormat('dd.MM.yyyy') }}` | 13.10.2025 |
| C | Saat | `{{ DateTime.fromISO($json.body.zamanDamgasi).toFormat('HH:mm:ss') }}` | 16:17:08 |
| D | İsim | `{{ $json.body.isim }}` | Ahmet |
| E | Soyisim | `{{ $json.body.soyisim }}` | Yılmaz |
| F | Telefon | `{{ $json.body.telefon }}` | 0532 269 36 54 |
| G | IP | `{{ $json.body.ip }}` | 85.98.16.30 |
| H | Geldiği Yer | `{{ $json.body.gelenSite }}` | facebook.com |
| I | Şehir | `{{ $json.state_prov }}` | Istanbul |
| J | İlçe | `{{ $json.district }}` | Fatih |
| K | Ülke | `{{ $json.country_code2 }}` | TR |
| L | Posta Kodu | `{{ $json.zipcode }}` | 34110 |
| M | ISP | `{{ $json.isp }}` | TurkTelecom |
| N | Organizasyon | `{{ $json.organization }}` | TTNet A.S. |
| O | ASN | `{{ $json.asn }}` | AS47331 |
| P | Cihaz Bilgisi | `{{ $json.body.cihazBilgisi }}` | Mozilla/5.0... |
| Q | Cihaz Tipi | `{{ $json.cihazTipi }}` | Desktop/iPhone |
| R | VIP Seviye | `{{ $json.body.vipSeviye }}` | GOLD |
| S | VIP Puan | `{{ $json.body.vipPuan }}` | 75 |
| T | Öncelik | `{{ $json.body.oncelik }}` | 2 |
| U | Önerilen Aksiyon | `{{ $json.body.onerilenAksiyon }}` | aggressive_followup |
| V | Cihaz Değeri | `{{ $json.body.cihazDegeri }}₺` | 35000₺ |
| W | Cihaz Modeli | `{{ $json.body.cihazModeli }}` | iPhone 15 Pro |
| X | Sayfa Süresi | `{{ $json.body.sayfadaKalisSuresi }}s` | 320s |
| Y | Scroll % | `{{ $json.body.scrollDerinligi }}%` | 95% |
| Z | Etkileşim | `{{ $json.body.etkilesimSayisi }}` | 12 |
| AA | Meta Pixel | `Active ✅` | Sabit değer |

#### 1.2 "Terketmeler" Sayfası Kolonları (A1-R1)

| Kolon | Başlık | N8N Expression | Açıklama |
|-------|--------|----------------|----------|
| A | Session ID | `{{ $json.sessionId }}` | sess-uuid-123 |
| B | Tarih Saat | `{{ DateTime.fromISO($json.timestamp).toFormat('dd.MM.yyyy HH:mm') }}` | 13.10.2025 16:25 |
| C | IP | `{{ $json.ip }}` | 85.98.16.30 |
| D | Şehir | `{{ $json.state_prov }}` | Istanbul |
| E | Ülke | `{{ $json.country_code2 }}` | TR |
| F | VIP Seviye | `{{ $json.vip.tier }}` | GOLD |
| G | VIP Puan | `{{ $json.vip.score }}` | 65 |
| H | Öncelik | `{{ $json.vip.priority }}` | 2 (HIGH) |
| I | Cihaz Değeri | `{{ $json.device.value }}₺` | 35000₺ |
| J | Cihaz Modeli | `{{ $json.device.model }}` | iPhone 15 Pro |
| K | Terketme Nedeni | `{{ $json.abandonment.analysis.reason }}` | price_objection |
| L | Strateji | `{{ $json.abandonment.analysis.strategy }}` | price_focused |
| M | Mesaj | `{{ $json.abandonment.analysis.message }}` | Özel indirim... |
| N | Sayfa Süresi | `{{ $json.behavior.timeOnPage }}s` | 45s |
| O | Scroll % | `{{ $json.behavior.scrollDepth }}%` | 30% |
| P | Form İnteraksiyon | `{{ $json.behavior.formInteraction ? "Evet" : "Hayır" }}` | Hayır |
| Q | Çıkış Noktası | `{{ $json.abandonment.exitPoint }}` | form_pricing |
| R | Retarget Durumu | `Pending` | Manuel güncelleme |

---

### ADIM 2: N8N Workflow Oluşturma

#### 2.1 Yeni Workflow Oluştur
1. N8N Dashboard aç
2. "New Workflow" tıkla
3. İsim: "OZPHYZEN - Lead Management"
4. Kaydet

#### 2.2 Form Dönüşü Flow Kurulumu

##### Node 1: Webhook (Form Dönüşü)
```
Node Type: Webhook
Name: Form Dönüşü Webhook
HTTP Method: POST
Path: /webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31
Authentication: None
Response Code: 200
```

##### Node 2: HTTP Request (IP Geolocation)
```
Node Type: HTTP Request
Name: IP Geolocation API
Method: GET
URL: https://api.ipgeolocation.io/ipgeo
Query Parameters:
  - apiKey: YOUR_API_KEY
  - ip: {{ $json.body.ip }}
```

##### Node 3: Edit Fields (Data Merge)
```
Node Type: Edit Fields
Name: Alanları Düzenle
Mode: Manual Mapping

⚠️ ÖNEMLİ: Tüm webhook veriler için şu format kullan:
{{ $json.body.ALAN_ADI }}

DİKKAT: $('Webhook').item.json.body.X KULLANMA!
```

**Fields to Set (27 alan):**
```javascript
// Webhook'tan Gelenler
siparisID: {{ $json.body.siparisID }}
tarih: {{ DateTime.fromISO($json.body.zamanDamgasi).toFormat('dd.MM.yyyy') }}
saat: {{ DateTime.fromISO($json.body.zamanDamgasi).toFormat('HH:mm:ss') }}
isim: {{ $json.body.isim }}
soyisim: {{ $json.body.soyisim }}
telefon: {{ $json.body.telefon }}
ip: {{ $json.body.ip }}
gelenSite: {{ $json.body.gelenSite }}
cihazBilgisi: {{ $json.body.cihazBilgisi }}

// VIP Detection
vipSeviye: {{ $json.body.vipSeviye }}
vipPuan: {{ $json.body.vipPuan }}
oncelik: {{ $json.body.oncelik }}
onerilenAksiyon: {{ $json.body.onerilenAksiyon }}
cihazDegeri: {{ $json.body.cihazDegeri }}
cihazModeli: {{ $json.body.cihazModeli }}
sayfadaKalisSuresi: {{ $json.body.sayfadaKalisSuresi }}
scrollDerinligi: {{ $json.body.scrollDerinligi }}
etkilesimSayisi: {{ $json.body.etkilesimSayisi }}

// IP Geolocation'dan Gelenler
şehir: {{ $json.state_prov }}
ilçe: {{ $json.district }}
ülke: {{ $json.country_code2 }}
postaKodu: {{ $json.zipcode }}
isp: {{ $json.isp }}
organizasyon: {{ $json.organization }}
asn: {{ $json.asn }}

// Sabit Değer
metaPixel: Active ✅
```

##### Node 4: Cihaz-Bilgisi (JavaScript)
```
Node Type: Code
Name: Cihaz-Bilgisi
Mode: Run Once for All Items
Language: JavaScript

// Mevcut kodunu koru (User-Agent parsing)
// Kod zaten doğru çalışıyor
```

##### Node 5: Google Sheets (Append Row)
```
Node Type: Google Sheets
Name: Dönüşümler Formuna Ekle
Operation: Append
Document: ESVELLA-LEAD
Sheet: Dönüşümler
Data Mode: Auto-map Input Data

⚠️ Column mapping otomatik olacak çünkü 
   Edit Fields'den gelen alan isimleri 
   Google Sheets başlıklarıyla eşleşiyor!
```

##### Node 6: Respond to Webhook
```
Node Type: Respond to Webhook
Name: Success Response
Response Code: 200
Response Body:
{
  "success": true,
  "message": "Form başarıyla kaydedildi",
  "orderId": "{{ $('Edit Fields').item.json.siparisID }}"
}
```

---

#### 2.3 Terketme Flow Kurulumu

##### Node 1: Webhook (Terketme)
```
Node Type: Webhook
Name: Terketme Webhook
HTTP Method: POST
Path: /webhook/ef297f4c-c137-46aa-8f42-895253fff2c7
Authentication: None
Response Code: 200
```

##### Node 2: HTTP Request (IP Geolocation)
```
Node Type: HTTP Request
Name: IP Geolocation API (Terketme)
Method: GET
URL: https://api.ipgeolocation.io/ipgeo
Query Parameters:
  - apiKey: YOUR_API_KEY
  - ip: {{ $json.ip }}  (DİKKAT: Terketme'de body yok!)
```

##### Node 3: Edit Fields (Abandonment Parse)
```
Node Type: Edit Fields
Name: Terketme Verileri
Mode: Manual Mapping

Fields to Set (18 alan):
```

```javascript
// Session Bilgileri
sessionId: {{ $json.sessionId }}
tarihSaat: {{ DateTime.fromISO($json.timestamp).toFormat('dd.MM.yyyy HH:mm') }}
ip: {{ $json.ip }}

// VIP Bilgileri
vipSeviye: {{ $json.vip.tier }}
vipPuan: {{ $json.vip.score }}
oncelik: {{ $json.vip.priority }}

// Cihaz Bilgileri
cihazDegeri: {{ $json.device.value }}
cihazModeli: {{ $json.device.model }}

// Terketme Analizi
terketmeNedeni: {{ $json.abandonment.analysis.reason }}
strateji: {{ $json.abandonment.analysis.strategy }}
mesaj: {{ $json.abandonment.analysis.message }}

// Davranış Verileri
sayfaSuresi: {{ $json.behavior.timeOnPage }}
scrollDerinligi: {{ $json.behavior.scrollDepth }}
formInteraksiyon: {{ $json.behavior.formInteraction ? "Evet" : "Hayır" }}
cikisNoktasi: {{ $json.abandonment.exitPoint }}

// IP Geolocation
şehir: {{ $json.state_prov }}
ülke: {{ $json.country_code2 }}

// Manuel Alan
retargetDurumu: Pending
```

##### Node 4: Google Sheets (Append Row)
```
Node Type: Google Sheets
Name: Terketmeler Formuna Ekle
Operation: Append
Document: ESVELLA-LEAD
Sheet: Terketmeler
Data Mode: Auto-map Input Data
```

##### Node 5: Respond to Webhook
```
Node Type: Respond to Webhook
Name: Tracked Response
Response Code: 200
Response Body:
{
  "success": true,
  "message": "Terketme kaydedildi",
  "sessionId": "{{ $('Edit Fields').item.json.sessionId }}"
}
```

---

## 🧪 TEST PROSEDÜRÜ

### Test 1: Form Dönüşü
```bash
# Test webhook
curl -X POST https://n8nwork.dtekai.com/webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31 \
  -H "Content-Type: application/json" \
  -d '{
    "siparisID": "SIP-TEST-001",
    "isim": "Test",
    "soyisim": "User",
    "telefon": "0555 111 22 33",
    "ip": "8.8.8.8",
    "gelenSite": "https://test.com",
    "zamanDamgasi": "2025-10-13T20:00:00.000Z",
    "vipSeviye": "GOLD",
    "vipPuan": 80,
    "cihazDegeri": 40000,
    "cihazModeli": "iPhone 15 Pro",
    "sayfadaKalisSuresi": 300,
    "scrollDerinligi": 100,
    "etkilesimSayisi": 15,
    "cihazBilgisi": "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"
  }'

# Beklenen Sonuç:
# - N8N workflow çalışır
# - IP Geolocation API'den şehir/ülke bilgisi gelir
# - Google Sheets'te yeni satır oluşur
# - Response: {"success": true, ...}
```

### Test 2: Terketme
```bash
curl -X POST https://n8nwork.dtekai.com/webhook/ef297f4c-c137-46aa-8f42-895253fff2c7 \
  -H "Content-Type: application/json" \
  -d '{
    "type": "abandonment",
    "sessionId": "test-session-123",
    "ip": "8.8.8.8",
    "timestamp": "2025-10-13T20:05:00.000Z",
    "vip": {
      "tier": "GOLD",
      "score": 70,
      "priority": 2
    },
    "device": {
      "model": "iPhone 15 Pro",
      "value": 52000
    },
    "abandonment": {
      "analysis": {
        "reason": "price_objection",
        "strategy": "price_focused_message",
        "message": "Özel indirim!"
      },
      "exitPoint": "form_pricing"
    },
    "behavior": {
      "timeOnPage": 60,
      "scrollDepth": 40,
      "formInteraction": false
    }
  }'

# Beklenen Sonuç:
# - Terketmeler sayfasına yeni satır eklenir
# - Response: {"success": true, ...}
```

---

## ⚠️ SIKI YAPILAN HATALAR VE ÇÖZÜMLERİ

### Hata 1: "undefined" Değerler
**Sebep:** Yanlış expression path  
**Yanlış:** `{{ $('Webhook').item.json.body.isim }}`  
**Doğru:** `{{ $json.body.isim }}`

### Hata 2: Invalid DateTime
**Sebep:** Node referansı yanlış  
**Yanlış:** `{{ DateTime.fromISO($node["Webhook"].json.body.zamanDamgasi) }}`  
**Doğru:** `{{ DateTime.fromISO($json.body.zamanDamgasi) }}`

### Hata 3: IP Geolocation 404
**Sebep:** IP alanı yanlış path  
**Form Dönüşü:** `{{ $json.body.ip }}`  
**Terketme:** `{{ $json.ip }}` (body yok!)

### Hata 4: Google Sheets Column Mismatch
**Çözüm:** Edit Fields'deki alan isimleri ile Google Sheets başlıkları **tam olarak eşleşmeli**  
Örnek: Edit Fields'de `şehir` → Google Sheets'te `Şehir`

---

## 📊 PERFORMANS OPTİMİZASYONU

### Best Practices

1. **Error Handling Ekle**
```
Her HTTP Request node'undan sonra IF node:
{{ $json.statusCode === 200 }}
TRUE → Devam et
FALSE → Error log + Fallback value
```

2. **Retry Logic**
```
HTTP Request Settings:
- Retry on Fail: Yes
- Max Retries: 3
- Retry Wait Time: 1000ms
```

3. **Timeout Ayarları**
```
HTTP Request Settings:
- Timeout: 10000ms (10 saniye)
```

4. **Data Validation**
```
Edit Fields'den önce IF node:
{{ $json.body && $json.body.ip }}
TRUE → Devam et
FALSE → Skip veya Default value
```

---

## 🎯 SONUÇ

Bu rehberi takip ederek:
- ✅ 2 ayrı webhook ile temiz yapı
- ✅ Otomatik IP geolocation
- ✅ Smart VIP detection
- ✅ Google Sheets otomasyonu
- ✅ Error handling
- ✅ Kolay bakım ve genişletme

**Kurulum Süresi:** 30-40 dakika  
**Bakım:** Minimal  
**Ölçeklenebilirlik:** Yüksek

---

*Son Güncelleme: 13 Ekim 2025, 20:20*  
*Hazırlayan: AI Assistant*
