# 🌐 Site Yönetimi Rehberi

## Web Panel'den Site Silme

### 📍 Adres
```
https://garantor360.com/dashboard/sites/manage
```

### 🎯 Nasıl Kullanılır?

#### 1️⃣ Site Yönetimi Sayfasına Gidin

Dashboard yan menüsünden:
```
Site Deployment → Site Yönetimi
```

Veya doğrudan:
```
https://garantor360.com/dashboard/sites/manage
```

#### 2️⃣ Silmek İstediğiniz Siteyi Bulun

Sayfa size tüm siteleri gösterir:
- 🌐 Domain adı
- 🟢 Durum (Aktif/Durduruldu)
- 🔢 Port numarası
- 🔒 SSL durumu
- 📅 Yayın tarihi

#### 3️⃣ 🗑️ "Sil" Butonuna Tıklayın

Her sitenin sağında bulunan kırmızı "🗑️ Sil" butonuna tıklayın.

#### 4️⃣ Silme Seçeneklerini İşaretleyin

Popup açılır ve size şu seçenekleri sunar:

**✅ Varsayılan Seçililer:**
- ☑️ **PM2 Process'i Durdur** - Site çalışmayı durduracak
- ☑️ **Nginx Konfigürasyonunu Sil** - Domain yönlendirmesi kaldırılacak
- ☑️ **SSL Sertifikasını Kaldır** - Let's Encrypt sertifikası silinecek
- ☑️ **Veritabanı Kaydını Sil** - Site kaydı veritabanından silinecek

**⚠️  Opsiyonel (Dikkat!):**
- ☐ **Site Dosyalarını Sil** - Tüm dosyalar kalıcı olarak silinecek!
  - Varsayılan olarak KAPALI
  - Açarsanız önce otomatik yedek alınır
  - Yedek konumu: `/root/backups/`

#### 5️⃣ "✅ Eminim, Sil" Butonuna Tıklayın

İşlem başlar ve ekranda gerçek zamanlı progress gösterir:

```
🔄 Site silme işlemi başlatılıyor...
🔍 Site bulundu: panel.dtektracking.com
✅ PM2 process durduruldu: server-control-panel
✅ Nginx symlink silindi
✅ Nginx config silindi
✅ Nginx yeniden yüklendi
✅ SSL sertifikası kaldırıldı
✅ Veritabanı kaydı silindi
🎉 Site başarıyla kaldırıldı!
```

#### 6️⃣ Sayfa Otomatik Yenilenir

İşlem tamamlandıktan 2 saniye sonra:
- Modal kapanır
- Site listesi yenilenir
- Silinen site artık görünmez

---

## 🎨 Ekran Görüntüsü Taslağı

```
┌─────────────────────────────────────────────────────────┐
│  🌐 Site Yönetimi                        [➕ Yeni Site]  │
├─────────────────────────────────────────────────────────┤
│                                                           │
│  📊 İstatistikler                                        │
│  ┌────────┬────────┬────────┬────────┐                  │
│  │Toplam  │ Aktif  │SSL Etkin│Durdur.│                  │
│  │  13    │  12    │   8     │  1    │                  │
│  └────────┴────────┴────────┴────────┘                  │
│                                                           │
│  🌐 Siteler                                              │
│  ┌───────────────────────────────────────────────────┐  │
│  │ 🌐 panel.dtektracking.com          🟢 Aktif       │  │
│  │ Port: 3100 | SSL: ✅ | Tip: Node.js | 2024-11-01  │  │
│  │                                                     │  │
│  │ [📊 Detay]  [🗑️ Sil]                              │  │
│  └───────────────────────────────────────────────────┘  │
│                                                           │
└─────────────────────────────────────────────────────────┘

TIKLAMA: [🗑️ Sil]
        ↓
┌──────────────────────────────────────────────────────┐
│  ⚠️  Site Silinecek                                   │
│  Bu işlem geri alınamaz!                              │
│                                                        │
│  📍 Silinecek Site:                                   │
│  panel.dtektracking.com                               │
│  Port: 3100 | SSL: Aktif                              │
│                                                        │
│  🔧 Yapılacak İşlemler:                               │
│                                                        │
│  ☑️ PM2 Process'i Durdur                              │
│     Site çalışmayı durduracak                         │
│                                                        │
│  ☑️ Nginx Konfigürasyonunu Sil                        │
│     Domain yönlendirmesi kaldırılacak                 │
│                                                        │
│  ☑️ SSL Sertifikasını Kaldır                          │
│     Let's Encrypt sertifikası silinecek               │
│                                                        │
│  ☑️ Veritabanı Kaydını Sil                            │
│     Site kaydı veritabanından silinecek               │
│                                                        │
│  ⚠️  ☐ Site Dosyalarını Sil                           │
│     Dikkat: Tüm dosyalar kalıcı olarak silinecek!    │
│                                                        │
│  [❌ İptal]  [✅ Eminim, Sil]                         │
└──────────────────────────────────────────────────────┘

TIKLAMA: [✅ Eminim, Sil]
        ↓
┌──────────────────────────────────────────────────────┐
│  🔄 İşlem Durumu:                                     │
│                                                        │
│  ✅ PM2 process durduruldu                            │
│  ✅ Nginx config silindi                              │
│  ✅ Nginx yeniden yüklendi                            │
│  ✅ SSL sertifikası kaldırıldı                        │
│  ✅ Veritabanı kaydı silindi                          │
│  🎉 Site başarıyla kaldırıldı!                        │
│                                                        │
│  (2 saniye sonra otomatik kapanacak...)              │
└──────────────────────────────────────────────────────┘
```

---

## ✅ Güvenlik Özellikleri

### 🔒 Onay Mekanizması
- Her silme işlemi için manuel onay gerekir
- Seçenekleri kendiniz işaretlersiniz
- "Eminim, Sil" butonuna basana kadar hiçbir şey olmaz

### 📦 Otomatik Yedekleme
- Site dosyalarını silerseniz, önce otomatik yedek alınır
- Yedek konumu: `/root/backups/domain-timestamp.tar.gz`
- Yedekten geri yükleme yapabilirsiniz

### 🛡️ Hata Yönetimi
- Her adım ayrı ayrı kontrol edilir
- Bir adım başarısız olsa bile diğerleri çalışır
- Detaylı hata mesajları gösterilir

### ⚠️  Tehlikeli İşlemler
- "Site dosyalarını sil" seçeneği varsayılan olarak kapalıdır
- Kırmızı renkle vurgulanmıştır
- Açıkça uyarı verilir

---

## 🔍 Doğrulama

Silme işleminden sonra kontrol edin:

### Panel'den
1. Site listesinde görünmüyor mu? ✅
2. SSL sayfasında yok mu? ✅

### Terminal'den (Opsiyonel)
```bash
# PM2
pm2 list | grep panel

# Nginx
ls /etc/nginx/sites-enabled/ | grep panel

# Port
sudo lsof -i :3100

# Domain erişimi
curl -I https://panel.dtektracking.com
```

Hepsi boş/hata veriyorsa ✅ başarılı!

---

## 🆚 Web Panel vs Terminal

| Özellik | Web Panel | Terminal |
|---------|-----------|----------|
| Kullanım | 🖱️ Tıkla | ⌨️ Komut |
| Hız | Orta | Hızlı |
| Güvenlik | ⚠️ Onaylı | 🚨 Dikkatli |
| Görsellik | ✅ Modern UI | ❌ Sadece text |
| Hata Mesajları | ✅ Açık | ⚠️ Teknik |
| Progress | ✅ Gerçek zamanlı | ⚠️ Logs |
| Rollback | ✅ Kolay | ⚠️ Manuel |

**Önerimiz:** Normal kullanım için **Web Panel** 👍

---

## 🚀 Gelecek Özellikler

- [ ] Toplu silme (birden fazla site seç)
- [ ] Silme öncesi yedek alma zorunluluğu
- [ ] Silinen siteleri geri yükleme (restore)
- [ ] Site durdurma/başlatma (delete olmadan)
- [ ] Silme işlemi için 2FA onayı
- [ ] Email bildirimi (silme yapıldı)
- [ ] Audit log (kim ne zaman sildi)

---

## 📞 Destek

Sorun yaşarsanız:
1. Progress mesajlarını ekran görüntüsü alın
2. Browser console'u kontrol edin (F12)
3. `/home/root/webapp/traffic-control-system/SITE_REMOVAL_LOG.md` dosyasını kontrol edin

---

## 🎓 Öğretici Video (Yapılacak)

Yakında eklenecek:
- 🎥 Web panelden site silme demo
- 🎥 Seçenekleri açıklama
- 🎥 Hata durumları ve çözümleri

---

**Artık web panel'den güvenle site silebilirsiniz!** 🎉
