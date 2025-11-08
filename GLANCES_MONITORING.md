# 📊 GLANCES - SİSTEM İZLEME PANELİ

## ✅ KURULUM BAŞARILI!

Glances sistem izleme aracı başarıyla kuruldu ve çalışıyor.

---

## 🌐 ERİŞİM BİLGİLERİ

### Ana Erişim:
```
URL: http://207.180.204.60:61208
Şifre: YOK (Direkt erişim)
```

### Alternatif (Subdomain eklenirse):
```
URL: http://glances.dtektracking.com
(DNS A kaydı eklenmeli: glances → 207.180.204.60)
```

---

## 📊 GLANCES'DA NELER GÖRÜNTÜLENİR?

### Üst Bölüm:
- **HOSTNAME** - Sunucu adı ve IP
- **UPTIME** - Sistem çalışma süresi
- **CPU** - İşlemci kullanımı (%)
- **MEM** - RAM kullanımı (%)
- **SWAP** - Swap kullanımı

### Sol Panel:
- **CPU Detay** - Her core için ayrı kullanım
- **Load Average** - 1, 5, 15 dakikalık yük ortalaması
- **Memory** - Detaylı RAM bilgisi (used/free/cached)
- **Network** - Ağ arayüzleri ve trafik (Rx/Tx)

### Orta Bölüm:
- **Process List** - Çalışan işlemler
  - CPU kullanımına göre sıralı
  - Memory kullanımı
  - Process adı ve PID

### Sağ Panel:
- **Disk I/O** - Disk okuma/yazma hızları
- **File System** - Disk kullanımı (%)
- **Sensors** - Sıcaklık sensörleri (varsa)
- **Docker** - Container'lar (varsa)

---

## ⌨️ KLAVYE KISAYOLLARI

| Tuş | İşlev |
|-----|-------|
| `a` | Otomatik sıralama (CPU/MEM) |
| `c` | CPU'ya göre sırala |
| `m` | Memory'ye göre sırala |
| `i` | I/O'ya göre sırala |
| `p` | Process adına göre sırala |
| `d` | Disk I/O göster/gizle |
| `n` | Network göster/gizle |
| `f` | File system göster/gizle |
| `s` | Sensors göster/gizle |
| `h` | Yardım |
| `q` | Çıkış |

---

## 🔄 YÖNETİM KOMUTLARI

### Glances'ı Yeniden Başlatma:
```bash
# Durdur
pkill -f "glances -w"

# Başlat
cd /home/root/webapp
nohup glances -w -B 0.0.0.0 -p 61208 > glances.log 2>&1 &
```

### Log Kontrolü:
```bash
tail -f /home/root/webapp/glances.log
```

### Port Kontrolü:
```bash
netstat -tlnp | grep 61208
```

---

## ✅ AVANTAJLARI

1. **Basit ve Temiz Arayüz** - Karmaşık değil, anlaşılır
2. **Hata Vermez** - Stabil, JavaScript hataları yok
3. **Hafif** - Çok az kaynak kullanır
4. **Otomatik Güncelleme** - Her 2-3 saniyede yenilenir
5. **Şifresiz Erişim** - Login gerektirmez
6. **Responsive** - Mobil cihazlarda da çalışır

---

## 📝 NOTLAR

- Glances APT paketi olarak kuruldu (v3.4.0.3)
- Port 61208'de çalışıyor
- Web arayüzü Bottle framework kullanıyor
- JSON API desteği var (`/api/3/...`)
- Export özellikleri (InfluxDB, CSV, vs.) kullanılabilir

---

## 🆚 NETDATA vs GLANCES

| Özellik | Netdata | Glances |
|---------|---------|---------|
| Arayüz | Karmaşık, modern | Basit, klasik |
| Grafikler | Detaylı, real-time | Basit, tablo bazlı |
| Kaynak Kullanımı | Orta | Düşük |
| Stabilite | Bazen hata | Çok stabil |
| Öğrenme Eğrisi | Yüksek | Düşük |
| Veri Saklama | 1 saat | Anlık |

**Sonuç:** Basit monitoring için Glances, detaylı analiz için Netdata

---

## 🚀 HEMEN KULLANIN!

Tarayıcınızda açın: **http://207.180.204.60:61208**

Sistem durumunuzu canlı olarak izleyin! 🎯