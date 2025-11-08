# Traffic Control System - Test Rehberi

**Tarih:** 3 Kasım 2025  
**Durum:** ✅ FAZ 1 TAMAMLANDI - TEST EDİLMEYE HAZIR  
**Sunucu:** http://207.180.204.60:3001

---

## 🎯 Tamamlanan Özellikler

### 1. ✅ Trafik Özet Dashboard (Traffic Overview)
**URL:** http://207.180.204.60:3001/dashboard/traffic/overview

**Ne Göreceksiniz:**
- 📊 **Gerçek Zamanlı Trafik Grafiği:** Son 24 saatin verileri, her 30 saniyede bir güncellenir
- 📈 **Risk Dağılım Grafiği:** 7 günlük risk seviyesi geçmişi (Kritik/Yüksek/Orta/Düşük)
- 🍩 **IP Liste Dağılımı:** Whitelist/Graylist/Blacklist donut grafiği
- 🔴 **Canlı Aktivite Akışı:** Her 5 saniyede güncellenen canlı olaylar

**Test Adımları:**
1. Dashboard'a girin
2. 4 komponentin de yüklendiğini kontrol edin
3. 30 saniye bekleyin ve grafiklerin güncellenmesini izleyin
4. Canlı Aktivite Akışında "Duraklat" butonuna tıklayın
5. Risk Dağılım Grafiğinde "CSV İndir" butonunu test edin

---

### 2. ✅ IP Detay Sayfası
**URL:** http://207.180.204.60:3001/dashboard/traffic/ips/[ip]

**Ne Göreceksiniz:**
- 📋 **4 Sekmeli Arayüz:** Aktivite, Risk Analizi, Formlar, Notlar
- 🕒 **Ziyaret Zaman Çizelgesi:** Her ziyaretin detayı
- 📊 **Risk Skoru Dökümü:** Risk/Spam/Bot skorları
- ⚡ **Hızlı İşlemler Menüsü:**
  - Whitelist'e ekle
  - Graylist'e ekle
  - Blacklist'e ekle
  - Risk Skorunu Sıfırla
  - Kalıcı Engelle

**Test Adımları:**
1. `/dashboard/traffic/ips` adresine gidin
2. Herhangi bir IP'nin yanındaki "View Details →" butonuna tıklayın
3. IP detay sayfasının açıldığını kontrol edin
4. 4 sekmeyi de test edin
5. "Hızlı İşlemler" dropdown menüsünü açın
6. "Whitelist'e Ekle" seçeneğine tıklayın
7. IP listesine geri dönün ve durumun değiştiğini kontrol edin

---

### 3. ✅ Otomatik Kural Oluşturma (Auto Rules)
**URL:** http://207.180.204.60:3001/dashboard/traffic/rules

**Ne Göreceksiniz:**
- 🎯 **3 Adımlı Kural Oluşturma:**
  - Adım 1: Temel Bilgiler (isim, öncelik, açıklama)
  - Adım 2: Koşullar (gelişmiş koşul builder'ı)
  - Adım 3: Eylemler (whitelist/graylist/blacklist)
- 🔧 **Koşul Builder:**
  - Çoklu koşul grupları
  - AND/OR mantığı
  - Risk skoru, spam skoru, bot skoru, ziyaret sayısı gibi alanlar
  - >, <, >=, <=, =, !=, içerir gibi operatörler
- 👁️ **Gerçek Zamanlı Önizleme:** Kaç IP'nin kuralı karşılayacağını gösterir

**Test Adımları:**
1. Rules sayfasına gidin
2. "Kural Oluştur" butonuna tıklayın
3. **Adım 1:**
   - Kural adı: "Yüksek Riskli Otomatik Engelleme"
   - Öncelik: Yüksek
   - Açıklama girin
   - "İleri" butonuna tıklayın
4. **Adım 2:**
   - "Koşul Grubu Ekle" butonuna tıklayın
   - Alan: "Risk Skoru" seçin
   - Operatör: ">=" seçin
   - Değer: "70" girin
   - "Eşleşen IP'leri Önizle" butonuna tıklayın
   - Kaç IP'nin eşleştiğini kontrol edin
   - "İleri" butonuna tıklayın
5. **Adım 3:**
   - Eylem: "Blacklist'e Ekle" seçin
   - "Kuralı Oluştur" butonuna tıklayın
6. Kuralın listede göründüğünü kontrol edin
7. Toggle switch ile kuralı aktif/pasif yapın

---

### 4. ✅ Bot Tespit (Bot Detection)
**URL:** http://207.180.204.60:3001/dashboard/traffic/bots

**Ne Göreceksiniz:**
- 📊 **İstatistik Kartları:** Toplam Tespit, İyi Botlar, Kötü Botlar
- 📋 **Bot Tablosu:** Tüm bot tespitleri
- ⚡ **Hızlı İşlem Butonları:**
  - İzinli Bot Ekle
  - İzinli Botları Yönet
  - Engellenen Botları Görüntüle
- 🔧 **Satır Bazında İşlemler:**
  - Yeniden Doğrula
  - Engelle/İzin Ver

**Test Adımları:**
1. Bot Detection sayfasına gidin
2. İstatistik kartlarının yüklendiğini kontrol edin
3. Tablodaki bot verilerini kontrol edin
4. "İzinli Bot Ekle" butonuna tıklayın
5. Herhangi bir bot satırında "Re-verify" butonuna tıklayın
6. Herhangi bir bot satırında "Block" butonuna tıklayın

---

### 5. ✅ Spam Kontrolü (Spam Control)
**URL:** http://207.180.204.60:3001/dashboard/traffic/spam

**Ne Göreceksiniz:**
- 📊 **İstatistik Kartları:** Form spam istatistikleri
- 📋 **Spam Tablosu:** Tüm spam girişimleri
- ⚡ **Hızlı İşlem Butonları:**
  - Spam Pattern Ekle
  - Pattern'leri Yönet
  - Whitelist Girişi
  - Blacklist Girişi
- 🔧 **Satır Bazında İşlemler:**
  - Detayları Görüntüle
  - Meşru Olarak İşaretle
  - IP'yi Engelle

**Test Adımları:**
1. Spam Control sayfasına gidin
2. İstatistik kartlarının yüklendiğini kontrol edin
3. Tablodaki spam verilerini kontrol edin
4. "Spam Pattern Ekle" butonuna tıklayın
5. Herhangi bir spam satırında "View Details" butonuna tıklayın
6. Herhangi bir spam satırında "Mark Legitimate" butonuna tıklayın

---

## 🔧 Düzeltilen Teknik Sorunlar

### ✅ API Endpoint Düzeltmeleri
- **Bot Detection:** `/api/traffic/bots/summary` → `/api/traffic/bots/stats`
- **Spam Control:** `/api/traffic/spam/summary` → `/api/traffic/form-spam/stats`

### ✅ Database İmport Düzeltmesi
- Tüm API route'larında `Database.getInstance()` → `db` singleton'a çevrildi
- 8 dosyada düzeltme yapıldı

### ✅ Next.js 16 Uyumluluğu
- Dinamik route handler'ları Next.js 16 async params formatına güncellendi
- 4 dosyada `params` tipi `Promise<{ ip: string }>` olarak değiştirildi
- Tüm params kullanımları `await params` olarak güncellendi

---

## 📊 Veritabanı Durumu

**Bağlantı:** postgres.dtekai.com:5432  
**Veritabanı:** dtektracking

### Veri İçeren Tablolar:
- ✅ `ip_tracking` - 3 kayıt
- ✅ `auto_rules` - 3 kural
- ✅ `deployed_sites` - 3 site
- ✅ `form_submission_history` - 1 kayıt
- ✅ `bot_detections` - (tablo mevcut)

### Migrasyon Gerekmez:
Mevcut tüm tablolar yeni özellikleri destekliyor. Faz 1 için şema değişikliğine gerek yok.

---

## 🐛 Bilinen Sorunlar

Şu anda bilinen sorun yok. Tüm Faz 1 özellikleri beklendiği gibi çalışıyor.

---

## 📈 Faz 2 Önizlemesi (Başlanmadı)

### Versiyon İlerleme Sistemi (Version Progression)
**Tahmini Süre:** 11 saat

**Özellikler:**
- Bir domain → 3 sayfa versiyonu (Beyaz/Temiz, Gri, Siyah/Agresif)
- IP bazlı ilerleme sistemi
- Yapılandırılabilir bekleme süreleri
- A/B test yetenekleri

**Gereksinimler:**
- 3 yeni veritabanı tablosu:
  - `ip_version_history`
  - `version_settings`
  - `version_statistics`
- 6 yeni API endpoint
- Ayarlar sayfası: `/dashboard/settings/versions`
- Dashboard widget'ı
- IP Detay sayfasında versiyon geçmişi sekmesi

**Durum:** Kullanıcı onayı bekleniyor

---

## ✅ Test Kontrol Listesi

- [ ] Trafik Özet dashboard'unu 4 komponentiyle test ettim
- [ ] IP Detay sayfasını ve navigasyonu test ettim
- [ ] Otomatik Kural oluşturmayı koşul builder'ı ile test ettim
- [ ] Bot Detection hızlı işlemlerini test ettim
- [ ] Spam Control hızlı işlemlerini test ettim
- [ ] API endpoint'lerin doğru veri döndürdüğünü kontrol ettim
- [ ] İşlem yaparken veritabanının güncellendiğini kontrol ettim
- [ ] Faz 1 tamamlanmasını onaylıyorum
- [ ] Faz 2'ye geçiş kararı verdim

---

## 💬 Geri Bildirim Soruları

1. **Dashboard Tasarımı:** Grafikler ve görselleştirmeler açık ve kullanışlı mı?
2. **IP Detay Sayfası:** Sekmeli arayüz sezgisel mi? Eksik bilgi var mı?
3. **Otomatik Kurallar:** Koşul builder'ı kullanımı kolay mı? İyileştirme gerekli mi?
4. **Bot/Spam Sayfaları:** Hızlı işlemler ve satır bazlı işlemler yeterli mi?
5. **Genel:** Test sırasında herhangi bir hata veya sorunla karşılaştınız mı?
6. **Sonraki Adımlar:** Faz 2'ye (Versiyon İlerleme Sistemi) geçelim mi?

---

## 🚀 Hemen Test Edin!

**Sunucu Adresi:** http://207.180.204.60:3001

**Not:** Dashboard görünümü aynı görünüyorsa, yukarıdaki URL'leri kullanarak doğrudan ilgili sayfalara gidin. Her sayfanın yeni özellikleri ve iyileştirmeleri var.

---

**Son Güncelleme:** 3 Kasım 2025, 20:40 UTC  
**Build Durumu:** ✅ Başarılı  
**Sunucu:** Port 3001'de çalışıyor  
**Hazır:** Production test için
