# ⚡ Webhook Detayları ve n8n Entegrasyonu

**Tarih:** 2025-11-09  
**Versiyon:** 1.0.0  
**Durum:** Tasarım Aşaması

---

## 🎯 Webhook Sistemi Genel Bakış

Webhook sistemi **iki yönlü** çalışacak:

1. **BİZDEN CRM'E:** Lead oluştuğunda n8n workflow tetikleniyor
2. **CRM'DEN BİZE:** Lead durumu değiştiğinde webhook callback alıyoruz

---

## 📋 n8n Webhook URL'leri

### **Production:**
```
https://n8n.dtektracking.com/webhook/crm-status
https://n8n.dtektracking.com/webhook/crm-order
https://n8n.dtektracking.com/webhook/crm-call
```

### **Staging:**
```
https://staging-n8n.dtektracking.com/webhook/crm-status
https://staging-n8n.dtektracking.com/webhook/crm-order
https://staging-n8n.dtektracking.com/webhook/crm-call
```

### **Development:**
```
https://dev-n8n.dtektracking.com/webhook/crm-status
https://dev-n8n.dtektracking.com/webhook/crm-order
https://dev-n8n.dtektracking.com/webhook/crm-call
```

---

## 🔄 Webhook Akış Diyagramı

```
┌──────────────────────────────────────────────────────┐
│ CallCenter CRM                                       │
│ • Agent lead'i aradı                                 │
│ • Durum "contacted" olarak değişti                   │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ CRM System                                           │
│ • Event trigger: lead.status.changed                 │
│ • Webhook payload hazırla                            │
│ • HMAC signature oluştur                             │
└────────────────────┬─────────────────────────────────┘
                     │ HTTP POST
                     ▼
┌──────────────────────────────────────────────────────┐
│ Nginx Reverse Proxy (dtektracking.com)              │
│ • IP whitelist kontrolü                              │
│ • Rate limiting                                      │
│ • SSL termination                                    │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ Next.js API Route                                    │
│ /app/api/webhook/crm-status/route.ts                │
│ • Signature validation                               │
│ • Request logging                                    │
│ • Forward to n8n                                     │
└────────────────────┬─────────────────────────────────┘
                     │
                     ▼
┌──────────────────────────────────────────────────────┐
│ n8n Webhook Node                                     │
│ https://n8n.dtektracking.com/webhook/crm-status     │
│ • Payload parsing                                    │
│ • Database update (PostgreSQL)                       │
│ • Commission calculation                             │
│ • Notification (optional)                            │
└──────────────────────────────────────────────────────┘
```

---

## 📨 Webhook Payload Detayları

### **1. Status Update Webhook**

#### **URL:**
```
POST https://dtektracking.com/webhook/crm-status
```

#### **Headers:**
```http
Content-Type: application/json
X-Signature: sha256=abc123def456...
X-Timestamp: 1699459200
X-CRM-Source: esvella
```

#### **Payload (Full Example):**
```json
{
  "webhook_id": "WH-2024-11-08-001",
  "event": "lead.status.changed",
  "timestamp": "2024-11-08T14:30:00Z",
  "data": {
    "tracking_id": "DTK_2024_11_08_ABC123",
    "crm_lead_id": "CRM-LEAD-123456",
    "old_status": "calling",
    "new_status": "contacted",
    "changed_by": {
      "agent_id": "AGENT-015",
      "agent_name": "Ahmet Yılmaz",
      "agent_email": "ahmet@callcenter.com"
    },
    "details": {
      "call_id": "CALL-789",
      "call_duration_seconds": 180,
      "call_started_at": "2024-11-08T14:27:00Z",
      "call_ended_at": "2024-11-08T14:30:00Z",
      "agent_notes": "Müşteri ürünle ilgilendi, fiyat bilgisi verildi",
      "next_action": "callback_requested",
      "callback_date": "2024-11-09T10:00:00Z"
    }
  }
}
```

#### **Response (Success):**
```json
{
  "success": true,
  "webhook_id": "WH-2024-11-08-001",
  "tracking_id": "DTK_2024_11_08_ABC123",
  "message": "Status updated successfully",
  "processed_at": "2024-11-08T14:30:01Z"
}
```

#### **Response (Error):**
```json
{
  "success": false,
  "webhook_id": "WH-2024-11-08-001",
  "error": {
    "code": "TRACKING_ID_NOT_FOUND",
    "message": "Tracking ID sistemde bulunamadı",
    "tracking_id": "DTK_2024_11_08_ABC123"
  },
  "timestamp": "2024-11-08T14:30:01Z"
}
```

---

### **2. Order Created Webhook**

#### **URL:**
```
POST https://dtektracking.com/webhook/crm-order
```

#### **Payload (Full Example):**
```json
{
  "webhook_id": "WH-2024-11-08-002",
  "event": "order.created",
  "timestamp": "2024-11-08T15:00:00Z",
  "data": {
    "tracking_id": "DTK_2024_11_08_ABC123",
    "crm_lead_id": "CRM-LEAD-123456",
    "order": {
      "order_id": "ORD-2024-1234",
      "status": "created",
      "created_at": "2024-11-08T15:00:00Z",
      "payment_status": "pending",
      "total_amount": 2500.00,
      "currency": "TRY",
      "items": [
        {
          "product_id": "PROD-001",
          "product_name": "Ağrı Kesici Krem",
          "quantity": 2,
          "unit_price": 1250.00,
          "total_price": 2500.00
        }
      ],
      "customer": {
        "name": "Ahmet Yılmaz",
        "phone": "+905321234567",
        "email": "ahmet@example.com"
      },
      "shipping_address": {
        "full_name": "Ahmet Yılmaz",
        "phone": "+905321234567",
        "address_line_1": "Atatürk Cad. No:123",
        "address_line_2": "Daire:5",
        "city": "İstanbul",
        "district": "Kadıköy",
        "postal_code": "34710",
        "country": "TR"
      },
      "notes": "Kapıya bırakılsın"
    },
    "agent": {
      "agent_id": "AGENT-015",
      "agent_name": "Ahmet Yılmaz"
    }
  }
}
```

---

### **3. Call Event Webhook**

#### **URL:**
```
POST https://dtektracking.com/webhook/crm-call
```

#### **Payload - Call Started:**
```json
{
  "webhook_id": "WH-2024-11-08-003",
  "event": "call.started",
  "timestamp": "2024-11-08T15:00:00Z",
  "data": {
    "tracking_id": "DTK_2024_11_08_ABC123",
    "call_id": "CALL-789",
    "agent": {
      "agent_id": "AGENT-015",
      "agent_name": "Ahmet Yılmaz"
    },
    "customer_phone": "+905321234567",
    "call_type": "outbound"
  }
}
```

#### **Payload - Call Ended:**
```json
{
  "webhook_id": "WH-2024-11-08-004",
  "event": "call.ended",
  "timestamp": "2024-11-08T15:07:00Z",
  "data": {
    "tracking_id": "DTK_2024_11_08_ABC123",
    "call_id": "CALL-789",
    "duration_seconds": 420,
    "result": "interested",
    "agent_notes": "Müşteri fiyat bilgisi istedi, callback talep etti",
    "recording_url": "https://crm.esvella.com/recordings/CALL-789.mp3",
    "transcription": "Müşteri: Merhaba...\nAgent: Merhaba, ben Ahmet..."
  }
}
```

---

## 🔐 Güvenlik İmplementasyonu

### **1. HMAC Signature Validation**

#### **Backend (Next.js API Route):**
```typescript
// /app/api/webhook/crm-status/route.ts

import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // 1. Get raw payload
    const payload = await request.text();
    
    // 2. Get signature from header
    const signature = request.headers.get('x-signature');
    if (!signature) {
      return NextResponse.json(
        { success: false, error: 'Missing signature' },
        { status: 401 }
      );
    }
    
    // 3. Calculate expected signature
    const secret = process.env.WEBHOOK_SECRET!;
    const expectedSignature = 'sha256=' + 
      crypto.createHmac('sha256', secret)
            .update(payload)
            .digest('hex');
    
    // 4. Validate signature (timing-safe comparison)
    if (!crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    )) {
      console.error('[WEBHOOK] Invalid signature');
      return NextResponse.json(
        { success: false, error: 'Invalid signature' },
        { status: 401 }
      );
    }
    
    // 5. Parse JSON
    const data = JSON.parse(payload);
    
    // 6. Validate tracking_id exists
    const { tracking_id } = data.data;
    if (!tracking_id || !tracking_id.startsWith('DTK_')) {
      return NextResponse.json(
        { success: false, error: 'Invalid tracking_id format' },
        { status: 400 }
      );
    }
    
    // 7. Forward to n8n
    const n8nResponse = await fetch(
      'https://n8n.dtektracking.com/webhook/crm-status',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      }
    );
    
    if (!n8nResponse.ok) {
      throw new Error('n8n webhook failed');
    }
    
    // 8. Log to database
    await logWebhook({
      webhook_id: data.webhook_id,
      tracking_id,
      event: data.event,
      status: 'success',
      received_at: new Date()
    });
    
    // 9. Return success
    return NextResponse.json({
      success: true,
      webhook_id: data.webhook_id,
      tracking_id,
      message: 'Status updated successfully',
      processed_at: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error('[WEBHOOK] Error:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: error.message || 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
```

---

### **2. Nginx IP Whitelist**

```nginx
# /etc/nginx/sites-available/dtektracking.com

# CRM IP whitelist
geo $crm_ip_allowed {
    default 0;
    109.123.247.201 1;  # Esvella Production
    88.235.100.50 1;    # Esvella Test
}

server {
    listen 443 ssl http2;
    server_name dtektracking.com;
    
    # Webhook endpoints
    location /webhook/crm-status {
        if ($crm_ip_allowed = 0) {
            return 403;
        }
        
        limit_req zone=webhook_limit burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
    
    location /webhook/crm-order {
        if ($crm_ip_allowed = 0) {
            return 403;
        }
        
        limit_req zone=webhook_limit burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
    }
    
    location /webhook/crm-call {
        if ($crm_ip_allowed = 0) {
            return 403;
        }
        
        limit_req zone=webhook_limit burst=20 nodelay;
        
        proxy_pass http://localhost:3000;
    }
}

# Rate limiting
limit_req_zone $binary_remote_addr zone=webhook_limit:10m rate=100r/m;
```

---

### **3. Rate Limiting**

```javascript
// Middleware: Rate limit per tracking_id
const webhookRateLimits = new Map();

function checkRateLimit(trackingId: string): boolean {
  const now = Date.now();
  const limit = webhookRateLimits.get(trackingId) || { count: 0, reset: now + 60000 };
  
  // Reset if expired
  if (now > limit.reset) {
    limit.count = 0;
    limit.reset = now + 60000;
  }
  
  // Check limit (100 per minute)
  if (limit.count >= 100) {
    return false;
  }
  
  limit.count++;
  webhookRateLimits.set(trackingId, limit);
  return true;
}
```

---

## 📊 Webhook Logging

### **Database Table: webhook_logs**
```sql
CREATE TABLE webhook_logs (
  id SERIAL PRIMARY KEY,
  webhook_id VARCHAR(100),
  tracking_id VARCHAR(50),
  event VARCHAR(100),
  payload JSONB,
  status VARCHAR(20), -- success, failed, invalid_signature
  error_message TEXT,
  ip_address VARCHAR(50),
  user_agent TEXT,
  received_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  processing_time_ms INTEGER
);

CREATE INDEX idx_webhook_logs_tracking_id ON webhook_logs(tracking_id);
CREATE INDEX idx_webhook_logs_webhook_id ON webhook_logs(webhook_id);
CREATE INDEX idx_webhook_logs_received_at ON webhook_logs(received_at DESC);
```

### **Logging Function:**
```typescript
async function logWebhook(data: {
  webhook_id: string;
  tracking_id: string;
  event: string;
  payload?: any;
  status: 'success' | 'failed' | 'invalid_signature';
  error_message?: string;
  ip_address?: string;
  processing_time_ms?: number;
}) {
  await db.query(`
    INSERT INTO webhook_logs (
      webhook_id, tracking_id, event, payload, 
      status, error_message, ip_address, 
      received_at, processed_at, processing_time_ms
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW(), $8)
  `, [
    data.webhook_id,
    data.tracking_id,
    data.event,
    JSON.stringify(data.payload || {}),
    data.status,
    data.error_message || null,
    data.ip_address || null,
    data.processing_time_ms || null
  ]);
}
```

---

## 🔄 Webhook Retry Mechanism (CRM Tarafında)

CRM ekibinden istediğimiz retry mekanizması:

```
Başarısız webhook için:
├─ 1. deneme: Hemen (0 saniye)
├─ 2. deneme: 1 dakika sonra
├─ 3. deneme: 5 dakika sonra
├─ 4. deneme: 15 dakika sonra
├─ 5. deneme: 1 saat sonra
└─ 6. deneme: Manual retry (admin panel)

Başarı kriterleri:
✅ HTTP 200-299 status code
✅ Response JSON: { "success": true }

Başarısız sayılır:
❌ HTTP 400-599 status code
❌ Timeout (30 saniye)
❌ Connection error
```

---

## 🧪 Webhook Test Komutları

### **Test 1: Valid Webhook (Success)**
```bash
# Generate signature
PAYLOAD='{"tracking_id":"DTK_2024_11_08_TEST001","status":"contacted","timestamp":"2024-11-08T14:30:00Z","details":{"agent_notes":"Test"}}'
SECRET='your_webhook_secret'
SIGNATURE="sha256=$(echo -n "$PAYLOAD" | openssl dgst -sha256 -hmac "$SECRET" | cut -d' ' -f2)"

# Send webhook
curl -X POST https://dtektracking.com/webhook/crm-status \
  -H "Content-Type: application/json" \
  -H "X-Signature: $SIGNATURE" \
  -d "$PAYLOAD"
```

### **Test 2: Invalid Signature (401 Error)**
```bash
curl -X POST https://dtektracking.com/webhook/crm-status \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=invalid_signature" \
  -d '{"tracking_id":"DTK_2024_11_08_TEST001","status":"contacted"}'

# Expected response:
# {
#   "success": false,
#   "error": "Invalid signature"
# }
```

### **Test 3: Missing Tracking ID (400 Error)**
```bash
curl -X POST https://dtektracking.com/webhook/crm-status \
  -H "Content-Type: application/json" \
  -H "X-Signature: sha256=valid_signature" \
  -d '{"status":"contacted"}'

# Expected response:
# {
#   "success": false,
#   "error": "Invalid tracking_id format"
# }
```

---

## ✅ Sonraki Adımlar

1. ✅ **Webhook detayları dökümanı hazırlandı**
2. ⏳ **Next.js API route'larını yaz**
3. ⏳ **n8n webhook node'larını kur**
4. ⏳ **Nginx konfigürasyonu güncelle**
5. ⏳ **Webhook logging sistemi kur**
6. ⏳ **Test environment'ta dene**

---

**Not:** CRM ekibi webhook göndermeye başladığında bu döküman test sonuçlarıyla güncellenecek! 🚀
