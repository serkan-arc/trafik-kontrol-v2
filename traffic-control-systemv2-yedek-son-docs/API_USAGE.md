# API Kullanım Rehberi

## Ortak API Endpoint'leri

Tüm sayfalar aşağıdaki ortak API'leri kullanır:

### 1. Sites API - `/api/sites`

**Ana site listesi endpoint'i. Tüm sayfalarda kullanılır.**

```typescript
// Default: deleted ve stopped siteleri otomatik filtreler
GET /api/sites
Response: {
  success: true,
  data: Site[],  // Sadece active, deploying, error
  pagination: { total, limit, offset, pages }
}

// Belirli status ile filtreleme
GET /api/sites?status=active
GET /api/sites?status=stopped  // Manuel stopped görmek için
```

**Otomatik Filtreleme:**
- ❌ `deleted` → Hiçbir zaman gösterilmez
- ❌ `stopped` → Hiçbir zaman gösterilmez
- ✅ `active` → Gösterilir
- ✅ `deploying` → Gösterilir
- ✅ `error` → Gösterilir

### 2. SSL API - `/api/ssl/scan`

**Certbot'tan otomatik SSL tarama.**

```typescript
GET /api/ssl/scan
Response: {
  success: true,
  certificates: Certificate[],
  stats: { total, valid, expiring_soon, expired }
}
```

**Özellikler:**
- ✅ Certbot'tan otomatik tarama
- ✅ Database'den bağımsız
- ✅ Gerçek SSL durumları
- ✅ Otomatik expiry hesaplama

### 3. Debug API - `/api/sites/debug`

**PM2 ve port mapping bilgileri.**

```typescript
GET /api/sites/debug
Response: {
  success: true,
  pm2_processes: Process[],
  port_mappings: PortMapping[],
  total_sites: number,
  total_pm2_processes: number
}
```

### 4. Port Check API - `/api/ports/check`

**Port availability kontrolü.**

```typescript
GET /api/ports/check?start=3000&end=3100
Response: {
  success: true,
  ports: PortInfo[],
  stats: { total, available, inUse, nextAvailable }
}
```

## Sayfa-API Mapping

| Sayfa | Kullanılan API | Amaç |
|-------|---------------|------|
| Sites Dashboard | `/api/sites` | Site listesi (active only) |
| Site Yönetimi | `/api/sites` | Site listesi + DELETE |
| Yeni Site Ekle | `/api/sites` (POST) | Site oluşturma |
| SSL Sertifikaları | `/api/ssl/scan` | Otomatik SSL tarama |
| PM2 Processes | `/api/sites` | Site-process mapping |
| Debug Bilgileri | `/api/sites/debug` | PM2 + Port debug |

## Site Silme İşlemi

**SADECE Site Yönetimi sayfasından yapılır!**

```typescript
DELETE /api/sites/:id
Body: {
  options: {
    stopPM2: boolean,      // PM2 process durdur
    removeNginx: boolean,  // Nginx config sil
    removeSSL: boolean,    // SSL sertifika sil
    removeDB: boolean,     // Database'den sil (hard delete)
    removeFiles: boolean   // Dosyaları sil
  }
}
```

**Silme Davranışı:**
- `removeDB: true` → Site database'den tamamen silinir
- API `/api/sites` otomatik filtreler, silinen site görünmez
- Tüm sayfalarda otomatik yansır

## Best Practices

### ✅ Yapılması Gerekenler:

1. **Ortak API Kullan**
   ```typescript
   // DOĞRU
   const res = await fetch('/api/sites');
   
   // YANLIŞ - Özel endpoint oluşturma
   const res = await fetch('/api/my-custom-sites');
   ```

2. **Otomatik Filtrelemeye Güven**
   ```typescript
   // API zaten deleted/stopped filtreliyor
   // Tekrar filtrelemeye gerek yok
   const sites = data.data;  // ✅ Direkt kullan
   ```

3. **Error Handling**
   ```typescript
   try {
     const res = await fetch('/api/sites');
     const data = await res.json();
     if (data.success) {
       setSites(data.data);
     }
   } catch (error) {
     console.error('Error:', error);
     setSites([]);
   }
   ```

### ❌ Yapılmaması Gerekenler:

1. **Manuel Filtreleme**
   ```typescript
   // YANLIŞ - API zaten filtreliyor
   const activeSites = data.data.filter(s => s.status !== 'deleted');
   ```

2. **Birden Fazla Silme Noktası**
   ```typescript
   // YANLIŞ - Sadece Site Yönetimi'nden silinmeli
   <button onClick={deleteSite}>Delete</button>
   ```

3. **Database'i Bypass Etme**
   ```typescript
   // YANLIŞ - Her zaman API kullan
   const sites = await db.query('SELECT * FROM deployed_sites');
   ```

## Senkronizasyon

Tüm sayfalar aynı API'yi kullandığı için:

- ✅ Site silindiğinde **tüm sayfalarda** kaybolur
- ✅ Yeni site eklendiğinde **tüm sayfalarda** görünür
- ✅ Status değiştiğinde **tüm sayfalarda** güncellenir
- ✅ Kafa karışıklığı yok, tutarlı veri

## Özet

```
┌─────────────────────────────────────────┐
│         /api/sites (Ana API)            │
│  Otomatik Filtreleme: deleted, stopped  │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┼─────────┐
        │         │         │
   Dashboard  Manage   Processes
        │         │         │
        └─────────┴─────────┘
     Hepsi aynı veriyi görür!
```

**Tek doğru kaynak, tutarlı sonuç! 🎯**
