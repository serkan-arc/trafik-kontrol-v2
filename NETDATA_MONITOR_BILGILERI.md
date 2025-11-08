# 📊 NETDATA SİSTEM İZLEME PANELİ

## ✅ KURULUM TAMAMLANDI!

Netdata başarıyla kuruldu ve şifre koruması eklendi.

## 🔐 ERİŞİM BİLGİLERİ:

```
URL: http://monitor.dtektracking.com
Kullanıcı Adı: admin
Şifre: Dtektracking2024!
```

## 📈 NETDATA İLE NELER İZLEYEBİLİRSİNİZ:

### Sistem Performansı:
- CPU kullanımı (gerçek zamanlı)
- RAM kullanımı ve detayları
- Disk I/O performansı
- Network trafiği (gelen/giden)
- Sistem yükü (load average)

### Uygulama İzleme:
- PostgreSQL performansı
- Redis metrikleri
- Nginx istatistikleri
- Node.js/PM2 prosesleri
- Docker container'ları

### Ağ İzleme:
- Bağlantı sayıları
- Port durumları
- Firewall istatistikleri
- Bandwidth kullanımı

### Loglar ve Uyarılar:
- Sistem logları
- Kritik uyarılar
- Performance anomalileri

## 🚀 KULLANIM:

1. Tarayıcıda `http://monitor.dtektracking.com` adresine gidin
2. Kullanıcı adı ve şifre ile giriş yapın
3. Dashboard'da tüm sistem metriklerini göreceksiniz
4. Grafikler gerçek zamanlı güncellenir (her saniye)

## 📝 ÖNEMLİ ÖZELLİKLER:

- **Gerçek Zamanlı:** Tüm metrikler canlı güncellenir
- **Geçmiş Veriler:** Son 1 saatlik detaylı veri saklanır
- **Alarm Sistemi:** Kritik durumlar için otomatik uyarı
- **Hafif:** Çok az kaynak kullanır (%1-2 CPU)
- **Web Tabanlı:** Ek yazılım kurulumu gerektirmez

## 🔧 YAPILANDIRMA:

### Nginx Proxy:
- `/etc/nginx/sites-available/monitor.dtektracking.com`
- Basic authentication aktif
- WebSocket desteği var (gerçek zamanlı güncellemeler için)

### Netdata Config:
- `/etc/netdata/netdata.conf`
- Port: 19999 (localhost)
- Auto-update aktif (günlük kontrol)

### Şifre Dosyası:
- `/etc/nginx/.htpasswd_netdata`
- Apache htpasswd formatında

## 📊 PANELDEKİ ANA BÖLÜMLER:

1. **System Overview:** CPU, RAM, Disk, Network özeti
2. **Applications:** Çalışan uygulamaların detayları
3. **Network:** Ağ trafiği ve bağlantılar
4. **Disks:** Disk kullanımı ve performansı
5. **Processes:** Çalışan prosesler ve kaynak kullanımları

## 🔄 GÜNCELLEME:

Netdata otomatik güncelleme için ayarlandı:
- Her gün kontrol eder
- Yeni versiyon varsa otomatik günceller
- `/etc/cron.daily/netdata-updater` ile

## 📝 NOT:

- SSL sertifikası eklendiğinde `https://` olacak
- pgAdmin ve Redis Commander ile birlikte tam bir izleme paketi
- Tüm sistem metriklerini tek yerden görebilirsiniz

---

**Sisteminiz artık profesyonel şekilde izleniyor!** 🎯