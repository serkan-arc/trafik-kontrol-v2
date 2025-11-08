# 🎛️ YÖNETİM PANELLERİ ERİŞİM BİLGİLERİ
*Kurulum Tarihi: 8 Kasım 2024*

## 🗄️ 1. PostgreSQL Web Paneli (pgAdmin)

### Erişim Bilgileri:
- **URL:** http://207.180.204.60:5050
- **Alternatif:** http://panel.dtektracking.com/pgadmin/ (DNS ayarı gerekli)
- **Email:** serkandogan@aiteldtek.com  
- **Şifre:** Esvella2025136326

### Database Bağlantı Ayarları (pgAdmin içinde eklenecek):
```
Host: postgres.dtekai.com
Port: 5432
Database: dtektracking
Username: postgres
Password: I4z9eP2aD5sQ3wL1
```

### Özellikler:
- ✅ Tüm tabloları görüntüleme
- ✅ SQL sorguları çalıştırma
- ✅ Backup/Restore işlemleri
- ✅ Tablo yapısı düzenleme
- ✅ Veri import/export
- ✅ Query performans analizi

---

## 🔴 2. Redis Web Paneli (RedisInsight)

### Erişim Bilgileri:
- **URL:** http://207.180.204.60:5540
- **Alternatif:** http://panel.dtektracking.com/redis/ (DNS ayarı gerekli)
- **İlk Kurulum:** Agree & Setup tıklayın

### Redis Bağlantı Ayarları (Panel içinde eklenecek):
```
Host: localhost (veya 127.0.0.1)
Port: 6379
Name: Trafik Manager Redis
Password: (boş bırakın - şifresiz)
```

### Özellikler:
- ✅ Tüm key'leri görüntüleme
- ✅ Real-time monitoring
- ✅ Memory analizi
- ✅ Slow log takibi
- ✅ CLI desteği
- ✅ Data browser
- ✅ Pub/Sub monitoring

---

## 📊 3. Sistem İzleme Paneli (Netdata)

### Erişim Bilgileri:
- **URL:** http://207.180.204.60:19999
- **Alternatif:** http://panel.dtektracking.com/monitor/ (DNS ayarı gerekli)
- **Kullanıcı:** Giriş gerektirmez (açık erişim)

### İzlenen Metrikler:
- ✅ **CPU Kullanımı:** Real-time CPU yükü
- ✅ **RAM Kullanımı:** Memory detayları
- ✅ **Disk I/O:** Read/Write istatistikleri
- ✅ **Network Trafiği:** Gelen/Giden veri
- ✅ **Docker Containers:** Container metrikleri
- ✅ **PM2 Processes:** Node.js process'leri
- ✅ **Nginx:** Web server istatistikleri
- ✅ **PostgreSQL:** Database metrikleri
- ✅ **Redis:** Cache performansı

### Özellikler:
- **Real-time Monitoring:** Canlı sistem takibi
- **Historical Data:** Geçmiş veriler (1 saat)
- **Alerts:** Otomatik uyarılar
- **Dashboard:** Özelleştirilebilir gösterge paneli
- **Export:** Metrik dışa aktarımı

---

## 🔧 4. PM2 Process Monitoring

### Terminal Komutları:
```bash
# Process listesi
pm2 list

# Process detayları
pm2 show traffic-control-prod

# Logları izle
pm2 logs traffic-control-prod

# CPU/Memory monitör
pm2 monit

# Web dashboard (kurulu değil)
# pm2 plus veya pm2 web gerekli
```

---

## 🌐 5. Nginx Proxy Manager (Zaten kurulu)

### Erişim Bilgileri:
- **URL:** http://207.180.204.60:81
- **Email:** admin@example.com
- **Şifre:** changeme

---

## 🚀 HIZLI ERİŞİM LİNKLERİ

### Ana Sistemler:
- **Trafik Kontrol:** https://dtektracking.com
- **Dosya Yöneticisi:** https://dosya.dtektracking.com

### Yönetim Panelleri (Direkt IP):
- **pgAdmin:** http://207.180.204.60:5050
- **RedisInsight:** http://207.180.204.60:5540  
- **Netdata:** http://207.180.204.60:19999
- **Nginx Manager:** http://207.180.204.60:81

---

## 📝 NOTLAR

### pgAdmin İlk Kurulum:
1. Giriş yapın
2. Sol menüde "Add New Server" tıklayın
3. General sekmesinde isim verin
4. Connection sekmesinde yukarıdaki bilgileri girin
5. Save tıklayın

### RedisInsight İlk Kurulum:
1. Agree & Setup tıklayın
2. "Add Redis Database" seçin
3. Yukarıdaki bağlantı bilgilerini girin
4. Test Connection → Add Redis Database

### Güvenlik Önerisi:
Production'da bu portları firewall ile IP kısıtlaması yapın:
```bash
# Sadece sizin IP'nize izin ver
ufw allow from YOUR_IP to any port 5050
ufw allow from YOUR_IP to any port 5540
ufw allow from YOUR_IP to any port 19999
```

---

## 🎯 ÖZET

Artık sahip olduğunuz paneller:

1. **pgAdmin** → PostgreSQL veritabanı yönetimi
2. **RedisInsight** → Redis cache yönetimi  
3. **Netdata** → Sistem performans izleme
4. **FileBrowser** → Dosya yönetimi (zaten vardı)
5. **Nginx Proxy Manager** → Domain yönetimi (zaten vardı)

Tüm sistemlerinizi tek bir yerden yönetebilirsiniz! 🎉

---

*Bu dokümantasyon panellerin erişim bilgilerini içerir. Güvenli saklayın.*