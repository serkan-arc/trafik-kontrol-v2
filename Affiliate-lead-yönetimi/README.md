# 📁 Affiliate Lead Yönetim Sistemi - Dokümantasyon

**Proje Başlangıç:** 2025-11-09  
**Durum:** Planlama ve Tasarım Aşaması  
**Versiyon:** 1.0.0

---

## 📚 Dokümantasyon İndeksi

### **Temel Dökümanlar**

1. **[00-PROJE-YOL-HARITASI.md](./00-PROJE-YOL-HARITASI.md)** 🗺️ **YENİ!**
   - Detaylı implementasyon planı
   - Faze faze yapılacaklar listesi
   - Database yapılanması
   - Süre tahminleri
   - Öncelik sıralaması
   - Güvenlik kuralları

2. **[PARTNER-PORTAL-PLAN.md](./PARTNER-PORTAL-PLAN.md)** 🚀 **YENİ! (9 Kasım 2024)**
   - Partner Portal ayrı proje planı
   - Mimari tasarım (Admin Panel + Partner Portal)
   - Güvenlik öncelikleri (PII koruması, GDPR)
   - API Bridge yapısı
   - Auth sistemi (JWT)
   - 5 geliştirme fazı
   - Deployment stratejisi
   - Test senaryoları

3. **[SESSION-2024-11-09.md](./SESSION-2024-11-09.md)** 📅 **YENİ! (9 Kasım 2024)**
   - Bugünkü çalışma oturumu özeti
   - ADIM 1, 2, 3 tamamlanma detayları
   - Oluşturulan dosyalar (15 dosya)
   - İstatistikler (kod satırı, süre)
   - Kalan işler ve öncelikler
   - Sonraki oturum için hazırlık

4. **[01-SISTEM-GENEL-BAKIS.md](./01-SISTEM-GENEL-BAKIS.md)**
   - Sistem amacı ve hedefleri
   - Temel iş akışı
   - Sistem bileşenleri
   - Veri modeli
   - Tracking ID formatı
   - Lead durumları

5. **[04-CRM-ENTEGRASYON.md](./04-CRM-ENTEGRASYON.md)**
   - CallCenter CRM entegrasyon detayları
   - Webhook endpoint'leri
   - Payload örnekleri
   - Güvenlik (IP whitelist, HMAC signature)
   - Tracking ID formatı
   - Durum kodları referansı
   - Test curl komutları
   - CRM ekibine gönderilen email template

6. **[05-WEBHOOK-DETAYLARI.md](./05-WEBHOOK-DETAYLARI.md)**
   - Webhook sistemi genel bakış
   - n8n webhook URL'leri
   - Webhook akış diyagramı
   - Detaylı payload örnekleri
   - Güvenlik implementasyonu
   - Webhook logging
   - Retry mekanizması
   - Test komutları

7. **[99-NOTLAR-FIKIRLER.md](./99-NOTLAR-FIKIRLER.md)**
   - Gelişim fikirleri
   - Bilinen sorunlar
   - Uzun vadeli vizyonlar
   - CRM ekibinden beklenenler
   - Action items
   - Design fikirleri

---

## 🚀 Hızlı Başlangıç

### **1. Projeyi Anlamak İçin:**
```bash
# Önce bugünkü çalışmayı oku (9 Kasım 2024)
cat SESSION-2024-11-09.md

# Sonra yol haritasını oku (implementasyon planı)
cat 00-PROJE-YOL-HARITASI.md

# Partner Portal planını incele
cat PARTNER-PORTAL-PLAN.md

# Genel bakış
cat 01-SISTEM-GENEL-BAKIS.md
```

### **2. CRM Ekibi İçin:**
```bash
# CRM entegrasyon gereksinimlerini gör
cat 04-CRM-ENTEGRASYON.md

# Webhook detaylarını öğren
cat 05-WEBHOOK-DETAYLARI.md
```

### **3. Developer İçin:**
```bash
# Tüm dökümanları oku
ls -la *.md

# Notlar ve fikirlere göz at
cat 99-NOTLAR-FIKIRLER.md
```

---

## 🎯 Proje Durumu

### ✅ **Tamamlanan**
- [x] Sistem genel bakış dökümanı
- [x] CRM entegrasyon detayları
- [x] Webhook payload tasarımı
- [x] Güvenlik mekanizmaları planı
- [x] Tracking ID formatı belirlendi
- [x] **Detaylı proje yol haritası oluşturuldu** 🗺️
- [x] Lead Havuzu sayfası (90% tamamlandı)
- [x] Temel database tabloları

### ✅ **Tamamlanan** (9 Kasım 2024)
- [x] **ADIM 1: Sidebar menü yapılandırması** ✅
  - Aktif menü highlight (mavi background)
  - Görsel hiyerarşi (bold + indent)
  - Partner Yönetimi (Alıcı + Komisyon birleştirildi)
  - Ürün Yönetimi → Raporlama'ya entegre
  
- [x] **ADIM 2: n8n Modülü** ✅
  - n8n Dashboard, Workflows, Webhooks, Errors sayfaları
  - API routes (stats, workflows, webhooks, executions)
  - Build & Deploy başarılı
  
- [x] **ADIM 3: Partner Yönetimi (30%)** ⏳
  - Database migration hazır (14KB SQL - 9 tablo)
  - Partner listesi sayfası
  - Partners API (GET, POST)
  - **Bekleyen:** Migration execute + kalan sayfalar

### ⏳ **Devam Eden**
- [ ] **Database migration çalıştır** (kritik - 5 dk)
- [ ] Partner ekleme formu
- [ ] Partner detay sayfası
- [ ] Portal erişim yönetimi
- [ ] Anlaşmalar yönetimi
- [ ] Komisyon takibi
- [ ] Lead Yönetimi (Paketleme)
- [ ] Raporlama modülü

### 🔮 **Planlanan (Ayrı Proje)**
- [ ] **Partner Portal** (4-5 saat - Admin panel bittikten sonra)
  - Ayrı Next.js projesi
  - JWT authentication
  - PII koruması (GDPR)
  - API Bridge
  - Domain: partner.dtektracking.com
  - Port: 3002
- [ ] Real-time dashboard (WebSocket)
- [ ] Automated payment system
- [ ] Multi-currency support
- [ ] Advanced analytics

---

## 📊 Temel Kavramlar

### **Tracking ID Formatı:**
```
DTK_YYYY_MM_DD_XXXXXX

Örnek: DTK_2024_11_08_ABC123
```

### **Lead Durumları:**
- `pending` → `sent_to_crm` → `calling` → `contacted` → `sold` ✅ (Komisyon kazanıldı!)
- `pending` → `sent_to_crm` → `calling` → `rejected` ❌

### **Webhook Endpoint'leri:**
```
POST https://dtektracking.com/webhook/crm-status   (Durum güncellemesi)
POST https://dtektracking.com/webhook/crm-order    (Sipariş bildirimi)
POST https://dtektracking.com/webhook/crm-call     (Çağrı bildirimi)
```

---

## 🔐 Güvenlik

### **HMAC Signature:**
```javascript
const signature = 'sha256=' + 
  crypto.createHmac('sha256', secret)
        .update(payload)
        .digest('hex');
```

### **IP Whitelist:**
```
109.123.247.201  (Esvella Production)
88.235.100.50    (Esvella Test)
```

---

## 🌐 Environment'lar

### **Production:**
```
Dashboard: https://dtektracking.com
API: https://dtektracking.com/api
n8n: https://n8n.dtektracking.com
Webhooks: https://dtektracking.com/webhook/
```

### **Staging:**
```
n8n: https://staging-n8n.dtektracking.com
Webhooks: https://staging.dtektracking.com/webhook/
```

### **Development:**
```
n8n: https://dev-n8n.dtektracking.com
Webhooks: http://localhost:3000/webhook/
```

---

## 📞 İletişim

### **CRM Ekibi (Esvella):**
- Email: [CRM Contact Email]
- Technical Lead: [Name]

### **DTEK Platform:**
- Email: [Your Email]
- Developer: [Your Name]

---

## 🔄 Döküman Güncelleme

Bu dökümanlar **canlı** dokümanlardır ve sürekli güncellenir:
- Her yeni özellik eklendiğinde
- CRM ekibinden yeni bilgi geldiğinde
- Test sonuçları çıktığında
- İlham geldikçe 💡

---

## 📝 Katkıda Bulunma

Yeni fikirler, geliştirmeler için:
1. `99-NOTLAR-FIKIRLER.md` dosyasına ekle
2. Varsa kod örnekleri ekle
3. Use case'leri açıkla

---

**Son Güncelleme:** 2025-11-09  
**Sonraki Toplantı:** TBD  
**Deadline:** TBD

---

## 🎨 Bonus: Emoji Guide

Dokümanlarda kullanılan emoji'ler:

- ✅ Tamamlandı / Onaylandı
- ⏳ Devam ediyor / Bekleniyor
- 🔮 Gelecek planı
- 💡 Fikir / Öneri
- 🐛 Bug / Sorun
- 🎯 Hedef / Amaç
- 🚀 Launch / Deploy
- 📊 İstatistik / Analytics
- 🔐 Güvenlik
- 📞 İletişim / CRM
- ⚡ Webhook / Real-time
- 💰 Para / Komisyon
- 🎨 Design / UI
- 📝 Döküman / Not

---

**Happy Coding!** 🚀
