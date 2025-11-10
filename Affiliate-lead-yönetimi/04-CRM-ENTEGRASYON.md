# 📞 CallCenter CRM Entegrasyon Detayları

**Tarih:** 2025-11-09  
**CRM Firma:** Esvella (veya başka CallCenter CRM)  
**Durum:** CRM ekibinden bekleniyor ⏳

---

## 🎯 CRM'den Beklediğimiz Servisler

### ✅ **ONAYLANMIŞ: CRM Ekibi Bunları Sağlayacak**

#### **1. Webhook Endpoint'leri (CRM → DTEK)**

Bizim sistemimize POST request atacaklar:

```
✅ POST https://dtektracking.com/webhook/crm-status
   → Müşteri durumu değiştiğinde (contacted, interested, sold, rejected)

✅ POST https://dtektracking.com/webhook/crm-order
   → Sipariş oluşturulduğunda (order_id, amount, products)

✅ POST https://dtektracking.com/webhook/crm-call
   → Arama yapıldığında (call started, ended, duration)
```

---

## 📋 Webhook Payload Detayları

### **1. Durum Güncellemesi (Status Update)**

#### **Endpoint:**
```
POST https://dtektracking.com/webhook/crm-status
```

#### **Headers:**
```http
Content-Type: application/json
X-Signature: sha256=HMAC_SIGNATURE_HERE
```

#### **Request Body (Örnek):**
```json
{
  "tracking_id": "DTK_2024_11_08_ABC123",
  "status": "contacted",
  "timestamp": "2024-11-08T14:30:00Z",
  "details": {
    "agent_id": "AGENT-015",
    "agent_name": "Ahmet Yılmaz",
    "agent_notes": "Müşteri ürünle ilgilendi, fiyat bilgisi verildi",
    "call_duration": 180
  }
}
```

#### **Response (Bizden dönecek):**
```json
{
  "success": true,
  "tracking_id": "DTK_2024_11_08_ABC123",
  "message": "Durum başarıyla güncellendi",
  "timestamp": "2024-11-08T14:30:01Z"
}
```

#### **Hata Response:**
```json
{
  "success": false,
  "error": "Invalid tracking_id",
  "message": "Tracking ID sistemde bulunamadı",
  "timestamp": "2024-11-08T14:30:01Z"
}
```

---

### **2. Sipariş Bildirimi (Order Notification)**

#### **Endpoint:**
```
POST https://dtektracking.com/webhook/crm-order
```

#### **Headers:**
```http
Content-Type: application/json
X-Signature: sha256=HMAC_SIGNATURE_HERE
```

#### **Request Body (Örnek):**
```json
{
  "tracking_id": "DTK_2024_11_08_ABC123",
  "order_status": "created",
  "timestamp": "2024-11-08T15:00:00Z",
  "order_details": {
    "order_id": "ORD-2024-1234",
    "amount": 2500.00,
    "currency": "TRY",
    "products": [
      {
        "name": "Ağrı Kesici Krem",
        "quantity": 2,
        "price": 1250.00
      }
    ],
    "shipping_address": {
      "full_name": "Ahmet Yılmaz",
      "phone": "+905321234567",
      "address_line": "Atatürk Cad. No:123 Daire:5",
      "city": "İstanbul",
      "district": "Kadıköy",
      "postal_code": "34710",
      "country": "TR"
    }
  }
}
```

#### **Response:**
```json
{
  "success": true,
  "tracking_id": "DTK_2024_11_08_ABC123",
  "order_id": "ORD-2024-1234",
  "message": "Sipariş kaydedildi",
  "timestamp": "2024-11-08T15:00:01Z"
}
```

---

### **3. Çağrı Bildirimi (Call Notification)**

#### **Endpoint:**
```
POST https://dtektracking.com/webhook/crm-call
```

#### **Headers:**
```http
Content-Type: application/json
X-Signature: sha256=HMAC_SIGNATURE_HERE
```

#### **Request Body - Arama Başladı:**
```json
{
  "tracking_id": "DTK_2024_11_08_ABC123",
  "event": "call.started",
  "timestamp": "2024-11-08T15:00:00Z",
  "call_details": {
    "call_id": "CALL-789",
    "agent_id": "AGENT-015",
    "agent_name": "Ahmet Yılmaz",
    "customer_phone": "+905321234567"
  }
}
```

#### **Request Body - Arama Bitti:**
```json
{
  "tracking_id": "DTK_2024_11_08_ABC123",
  "event": "call.ended",
  "timestamp": "2024-11-08T15:07:00Z",
  "call_details": {
    "call_id": "CALL-789",
    "duration_seconds": 420,
    "result": "interested",
    "agent_notes": "Müşteri fiyat bilgisi istedi",
    "recording_url": "https://crm.esvella.com/recordings/CALL-789.mp3"
  }
}
```

---

## 🔐 Güvenlik (Security)

### **1. IP Whitelist**

CRM sunucusundan gelecek IP'ler:
```
✅ 109.123.247.201  (dtekapp production)
✅ [TEST_IP]        (dtekapp test sunucusu)
```

Nginx'te IP kontrolü:
```nginx
location /webhook/crm-status {
    allow 109.123.247.201;
    deny all;
    
    proxy_pass http://localhost:3000;
}
```

---

### **2. Signature Validation (HMAC)**

#### **CRM Tarafı (Gönderirken):**
```php
// PHP Örnek
$payload = json_encode($data);
$secret = 'DTEKTRACKING_WEBHOOK_SECRET';
$signature = 'sha256=' . hash_hmac('sha256', $payload, $secret);

// Header'a ekle
$headers = [
    'Content-Type: application/json',
    'X-Signature: ' . $signature
];
```

#### **Bizim Taraf (Doğrularken):**
```javascript
// Node.js / Next.js Örnek
import crypto from 'crypto';

export async function POST(request) {
  const payload = await request.text();
  const signature = request.headers.get('x-signature');
  const secret = process.env.WEBHOOK_SECRET;
  
  const expectedSignature = 'sha256=' + 
    crypto.createHmac('sha256', secret)
          .update(payload)
          .digest('hex');
  
  if (signature !== expectedSignature) {
    return Response.json(
      { success: false, error: 'Invalid signature' },
      { status: 401 }
    );
  }
  
  // Signature geçerli, işleme devam et
  const data = JSON.parse(payload);
  // ...
}
```

---

### **3. Rate Limiting**

```
✅ Maksimum 100 webhook/dakika per tracking_id
✅ Maksimum 1000 webhook/dakika toplam
```

Nginx rate limit:
```nginx
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=100r/m;

location /webhook/ {
    limit_req zone=webhook_limit burst=20 nodelay;
    proxy_pass http://localhost:3000;
}
```

---

## 📊 Tracking ID Formatı

### **Format:**
```
DTK_YYYY_MM_DD_XXXXXX
```

### **Örnekler:**
```
DTK_2024_11_08_ABC123
DTK_2024_11_08_XYZ789
DTK_2024_11_09_QWE456
```

### **Özellikleri:**
- ✅ **Benzersiz (Unique):** Her lead için farklı
- ✅ **Tarih İçerir:** Kolayca tarihe göre filtreleme
- ✅ **Random Kod:** 6 haneli alphanumeric (A-Z, 0-9)
- ✅ **Buyer/Kampanya Bilgisi:** Tracking panelde saklanır
- ✅ **Sadece ID Gönderilir:** CRM'e sadece bu ID gönderilir

### **Generator Fonksiyon:**
```javascript
function generateTrackingId() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // 6 haneli random alphanumeric
  const random = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();
  
  return `DTK_${year}_${month}_${day}_${random}`;
}

// Örnek kullanım:
const trackingId = generateTrackingId();
// Output: DTK_2024_11_08_A7B2C9
```

---

## 📋 Durum Kodları Referansı

### **Müşteri Durumları**

| Kod | Açıklama | Komisyon Etkisi | CRM'den Gelecek mi? |
|-----|----------|-----------------|---------------------|
| `new` | Yeni kayıt | - | Hayır |
| `sent_to_crm` | CRM'e gönderildi | - | Hayır |
| `queued` | Kuyrukta bekliyor | - | Evet ✅ |
| `assigned` | Agent'a atandı | - | Evet ✅ |
| `calling` | Aranıyor | - | Evet ✅ |
| `contacted` | İletişim kuruldu | - | Evet ✅ |
| `interested` | İlgileniyor | - | Evet ✅ |
| `sold` | Satış yapıldı | **✅ Komisyon** | Evet ✅ |
| `cancelled` | İptal edildi | - | Evet ✅ |
| `rejected` | Reddedildi | - | Evet ✅ |
| `no_answer` | Ulaşılamadı | - | Evet ✅ |
| `wrong_number` | Yanlış numara | - | Evet ✅ |
| `callback_requested` | Tekrar aranacak | - | Evet ✅ |

### **Kargo Durumları**

| Kod | Açıklama | CRM'den Gelecek mi? |
|-----|----------|---------------------|
| `cargo_preparing` | Kargo hazırlanıyor | Evet ✅ |
| `cargo_shipped` | Kargoya verildi | Evet ✅ |
| `cargo_in_transit` | Yolda | Evet ✅ |
| `cargo_out_for_delivery` | Dağıtımda | Evet ✅ |
| `cargo_delivered` | Teslim edildi | Evet ✅ |
| `cargo_failed` | Teslim edilemedi | Evet ✅ |
| `cargo_returned` | İade edildi | Evet ✅ |

---

## 🧪 Test Curl Komutları

### **Test 1: Müşteri İletişimi**
```bash
curl -X POST https://dtektracking.com/webhook/crm-status \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=test_signature" \
  -d '{
    "tracking_id": "DTK_2024_11_08_TEST001",
    "status": "contacted",
    "timestamp": "2024-11-08T14:30:00Z",
    "details": {
      "agent_name": "Test Agent",
      "agent_notes": "Test webhook çalışıyor",
      "call_duration": 120
    }
  }'
```

### **Test 2: Satış Bildirimi**
```bash
curl -X POST https://dtektracking.com/webhook/crm-status \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=test_signature" \
  -d '{
    "tracking_id": "DTK_2024_11_08_TEST001",
    "status": "sold",
    "timestamp": "2024-11-08T15:00:00Z",
    "details": {
      "agent_notes": "Satış tamamlandı",
      "order_id": "ORD-TEST-001"
    }
  }'
```

### **Test 3: Sipariş Bildirimi**
```bash
curl -X POST https://dtektracking.com/webhook/crm-order \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=test_signature" \
  -d '{
    "tracking_id": "DTK_2024_11_08_TEST001",
    "order_status": "created",
    "timestamp": "2024-11-08T15:00:00Z",
    "order_details": {
      "order_id": "ORD-TEST-001",
      "amount": 2500,
      "currency": "TRY",
      "products": ["Test Ürün"]
    }
  }'
```

---

## 🎁 Bonus Özellikler (CRM'den İsteyebiliriz)

### ✅ **ONAYLANMIŞ - CRM Ekibi Sağlayacak:**

#### **1. GraphQL API**
REST API'ye ek olarak GraphQL desteği (daha esnek sorgulama)

#### **2. WebSocket Real-time Updates**
Webhook yerine veya webhook ile birlikte WebSocket bağlantısı

#### **3. SDK (JavaScript, Python)**
Hazır kütüphaneler:
```bash
npm install @esvella/crm-sdk
pip install esvella-crm-sdk
```

#### **4. Webhook Retry Mechanism**
Webhook başarısız olursa otomatik tekrar deneme:
- 1. deneme: Hemen
- 2. deneme: 1 dakika sonra
- 3. deneme: 5 dakika sonra
- 4. deneme: 15 dakika sonra
- 5. deneme: 1 saat sonra

#### **5. Custom Fields**
Kendi özel alanlarımızı ekleyebilme:
```json
{
  "tracking_id": "DTK_2024_11_08_ABC123",
  "custom_fields": {
    "affiliate_name": "John Doe",
    "campaign_type": "facebook_ads",
    "landing_page": "newsalesozphyzenid2.shop",
    "pain_region": "Bel ağrısı"
  }
}
```

---

## 📝 CRM Ekibine Gönderilen Email Template

### **Konu:** API Entegrasyon Gereksinimleri - DTEK Platform

**Merhaba Esvella CRM Ekibi,**

DTEK platformumuzdan sizin CallCenter CRM sisteminize lead göndermek ve sizden canlı durum bilgilerini çekmek için API entegrasyonu yapmamız gerekiyor.

#### **İHTİYAÇLARIMIZ:**

**1. LEAD GÖNDERME API'LERİ (Bizden Size):**
- POST /api/leads/single → Tek lead gönderimi (real-time)
- POST /api/leads/bulk-import → Toplu lead gönderimi (günde 100-500 lead)

**2. WEBHOOK SİSTEMİ (Sizden Bize - ÇOK ÖNEMLİ!):**
- Lead durumu değiştiğinde → `POST https://dtektracking.com/webhook/crm-status`
- Satış gerçekleştiğinde → `POST https://dtektracking.com/webhook/crm-order`
- Arama yapıldığında → `POST https://dtektracking.com/webhook/crm-call`

**3. GÜVENLİK:**
- API Key veya OAuth 2.0 authentication
- Webhook HMAC signature
- IP whitelisting: `31.97.125.184`

**4. DOKÜMANTASYON:**
- API documentation (Swagger/Postman)
- Webhook event types listesi
- Örnek request/response'lar
- Code examples (JavaScript tercih)

Detaylı teknik döküman ektedir. Geri dönüşünüzü bekliyoruz.

**Saygılarımızla,**  
DTEK Platform Team

---

## ✅ Sonraki Adımlar

1. ✅ **CRM entegrasyon dökümanı hazırlandı**
2. ⏳ **CRM ekibinden onay bekliyoruz**
3. ⏳ **Test environment kurulumu**
4. ⏳ **Webhook endpoint'lerini geliştir**
5. ⏳ **n8n workflow'ları kur**

---

**Not:** CRM ekibinden gelen cevaplara göre bu döküman güncellenecek! 📧
