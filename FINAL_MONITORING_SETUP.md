# 🎯 TRAFİK YÖNETİM SİSTEMİ - MONITORING ÇÖZÜMÜ

*Son Güncelleme: 8 Kasım 2024*

## ✅ MONITOR PANELİ HAZIR!

Netdata yerine **Glances** monitoring aracına geçildi. Artık hata vermeyecek!

---

## 📊 SİSTEM İZLEME PANELİ

### Ana Erişim (HTTPS/SSL):
```
URL: https://monitor.dtektracking.com
Şifre: YOK (Açık erişim)
Araç: Glances v3.4.0.3
```

### Alternatif Erişim:
```
URL: http://207.180.204.60:61208
```

---

## 🔄 YAPILAN DEĞİŞİKLİKLER

1. ❌ **Netdata Kaldırıldı** - JavaScript hataları nedeniyle
2. ✅ **Glances Kuruldu** - Basit ve stabil
3. ✅ **Monitor subdomain güncellendi** - Artık Glances'a yönleniyor
4. ✅ **HTTPS/SSL aktif** - Güvenli bağlantı
5. ✅ **Şifre kaldırıldı** - Direkt erişim

---

## 📋 TÜM YÖNETİM PANELLERİ (GÜNCEL)

| Panel | URL | Şifre | Durum |
|-------|-----|-------|--------|
| 🗄️ **PostgreSQL** | https://postgres.dtektracking.com | admin@dtektracking.com / DTek2024Tracking! | ✅ Aktif |
| 🔴 **Redis** | https://redis.dtektracking.com | Yok | ✅ Aktif |
| 📊 **Monitoring** | https://monitor.dtektracking.com | Yok | ✅ Aktif (Glances) |
| 📁 **Dosya** | https://dosya.dtektracking.com | admin / admin | ✅ Aktif |

---

## 📊 GLANCES ÖZELLİKLERİ

### Görüntülenen Bilgiler:
- **CPU** - Her core için kullanım (%)
- **Memory** - RAM kullanımı (used/free/cached)
- **Swap** - Swap kullanımı
- **Load** - Sistem yükü (1/5/15 dk)
- **Network** - Ağ trafiği (Rx/Tx)
- **Disk I/O** - Okuma/Yazma hızları
- **Processes** - İşlem listesi (CPU/RAM sıralı)
- **File System** - Disk kullanımı (%)

### Klavye Kısayolları:
- `a` - Otomatik sıralama
- `c` - CPU'ya göre sırala
- `m` - Memory'ye göre sırala
- `i` - I/O'ya göre sırala
- `d` - Disk I/O göster/gizle
- `n` - Network göster/gizle
- `h` - Yardım

---

## 🔧 YÖNETİM KOMUTLARI

### Glances Kontrolü:
```bash
# Durum kontrol
ps aux | grep glances

# Yeniden başlat
pkill -f "glances -w"
cd /home/root/webapp
nohup glances -w -B 0.0.0.0 -p 61208 > glances.log 2>&1 &

# Log kontrol
tail -f /home/root/webapp/glances.log
```

### Servis Durumları:
```bash
# PostgreSQL (pgAdmin)
docker ps | grep pgadmin

# Redis Commander
docker ps | grep redis-commander

# Glances
netstat -tlnp | grep 61208

# File Browser
ps aux | grep filebrowser
```

---

## ✅ AVANTAJLAR (Netdata vs Glances)

### Glances:
- ✅ JavaScript hatası yok
- ✅ Basit ve temiz arayüz
- ✅ Düşük kaynak kullanımı
- ✅ Stabil, kesinti yok
- ✅ Mobil uyumlu
- ✅ API desteği

### Netdata (Kapatıldı):
- ❌ Sürekli JavaScript hataları
- ❌ Karmaşık arayüz
- ❌ Yüksek kaynak kullanımı
- ❌ Tarayıcı uyumsuzlukları

---

## 📝 NOTLAR

1. **Tarayıcı Önbelleği:** Eski Netdata sayfası açılıyorsa Ctrl+F5 yapın
2. **Gizli Pencere:** Cache sorunu için gizli/özel pencerede açın
3. **Otomatik Yenileme:** Glances 2-3 saniyede bir güncellenir
4. **API:** JSON API kullanılabilir: https://monitor.dtektracking.com/api/3/

---

## 🎯 HIZLI ERİŞİM

Tüm panelleriniz tek yerden:

1. 🗄️ [PostgreSQL Yönetimi](https://postgres.dtektracking.com)
2. 🔴 [Redis Yönetimi](https://redis.dtektracking.com)
3. 📊 [Sistem İzleme](https://monitor.dtektracking.com)
4. 📁 [Dosya Yönetimi](https://dosya.dtektracking.com)

---

**Artık tüm sistemlerinizi sorunsuz izleyebilir ve yönetebilirsiniz!** 🚀