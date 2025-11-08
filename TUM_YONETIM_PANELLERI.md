# 🎯 TRAFİK YÖNETİM SİSTEMİ - TÜM PANEL BİLGİLERİ

*Son Güncelleme: 8 Kasım 2024*

## ✅ TÜM PANELLERİNİZ HAZIR VE GÜVENLİ!

Tüm yönetim panelleriniz **SSL/HTTPS** ile güvenli şekilde çalışıyor.

---

## 🔐 YÖNETİM PANELLERİ ERİŞİM BİLGİLERİ

### 1️⃣ **PostgreSQL Veritabanı Yönetimi (pgAdmin)**
```
URL: https://postgres.dtektracking.com
Email: admin@dtektracking.com
Şifre: DTek2024Tracking!
```
**Kullanım Alanı:**
- Veritabanı tablolarını görüntüleme
- SQL sorguları çalıştırma
- Veri ekleme/güncelleme/silme
- Backup alma ve geri yükleme

### 2️⃣ **Redis Cache Yönetimi (Redis Commander)**
```
URL: https://redis.dtektracking.com
Şifre: Yok (açık erişim)
```
**Kullanım Alanı:**
- Cache verilerini görüntüleme
- Key-value çiftlerini yönetme
- Redis performans metrikleri
- Cache temizleme işlemleri

### 3️⃣ **Sistem İzleme (Netdata)**
```
URL: https://monitor.dtektracking.com
Kullanıcı: admin
Şifre: Dtektracking2024!
```
**Kullanım Alanı:**
- CPU, RAM, Disk kullanımı
- Network trafiği izleme
- Uygulama performans metrikleri
- Gerçek zamanlı sistem durumu

### 4️⃣ **Dosya Yöneticisi (File Browser)**
```
URL: https://dosya.dtektracking.com
Kullanıcı: admin
Şifre: admin
```
**Kullanım Alanı:**
- Sunucu dosyalarını yönetme
- Log dosyalarını görüntüleme
- Backup dosyaları indirme
- Kod dosyalarını düzenleme

---

## 📊 SİSTEM DURUMU

| Panel | Durum | SSL | Port | Servis |
|-------|--------|-----|------|---------|
| pgAdmin | ✅ Aktif | ✅ HTTPS | 5050 | Docker |
| Redis Commander | ✅ Aktif | ✅ HTTPS | 8081 | Docker |
| Netdata | ✅ Aktif | ✅ HTTPS | 19999 | Systemd |
| File Browser | ✅ Aktif | ✅ HTTPS | 9001 | Process |

---

## 🔒 GÜVENLİK ÖZELLİKLERİ

✅ **SSL/TLS Şifreleme:** Tüm paneller Let's Encrypt SSL ile korunuyor
✅ **HTTP→HTTPS Yönlendirme:** Otomatik güvenli bağlantıya yönlendirme
✅ **Şifre Koruması:** Netdata ve pgAdmin şifre ile korunuyor
✅ **Güvenlik Başlıkları:** XSS, Clickjacking koruması aktif
✅ **İzole Servisler:** Her servis sadece kendi subdomain'inde çalışıyor

---

## 🚀 HIZLI ERİŞİM LİNKLERİ

| Panel | Link |
|-------|------|
| 📊 Veritabanı | [https://postgres.dtektracking.com](https://postgres.dtektracking.com) |
| 🔴 Redis | [https://redis.dtektracking.com](https://redis.dtektracking.com) |
| 📈 Monitoring | [https://monitor.dtektracking.com](https://monitor.dtektracking.com) |
| 📁 Dosyalar | [https://dosya.dtektracking.com](https://dosya.dtektracking.com) |

---

## 🛠️ BAKIM VE YÖNETİM

### SSL Sertifika Yenileme (Otomatik)
```bash
# Sertifikalar 90 gün geçerli, otomatik yenilenir
certbot renew --dry-run  # Test
certbot renew            # Yenile
```

### Servis Yönetimi
```bash
# pgAdmin (Docker)
docker restart pgadmin

# Redis Commander (Docker)  
docker restart redis-commander

# Netdata (Systemd)
systemctl restart netdata

# File Browser (Process)
pkill filebrowser && filebrowser -a 127.0.0.1 -p 9001 -r / &
```

### Log Dosyaları
```
/var/log/nginx/postgres.dtektracking.com.access.log
/var/log/nginx/redis.dtektracking.com.access.log
/var/log/nginx/monitor.dtektracking.com.access.log
/var/log/nginx/dosya.dtektracking.com.access.log
```

---

## 📝 NOTLAR

1. **Tarayıcı Önbelleği:** Yeni SSL ayarları için tarayıcı önbelleğini temizleyin
2. **Firewall:** 443 portu (HTTPS) açık olmalı
3. **DNS:** Tüm subdomain'ler 207.180.204.60 IP'sine işaret ediyor
4. **Backup:** pgAdmin üzerinden düzenli veritabanı yedeği alın
5. **Monitoring:** Netdata ile sistem kaynaklarını sürekli izleyin

---

## 🔄 GÜNCELLEME GEÇMİŞİ

- **8 Kasım 2024:** Tüm paneller kuruldu ve SSL eklendi
- **Monitor Panel:** HTTP→HTTPS güncellendi
- **Redis Commander:** SSL sertifikası eklendi
- **File Browser:** İzole edildi, sadece dosya subdomain'de çalışıyor

---

**Tüm yönetim panelleriniz profesyonel ve güvenli şekilde çalışıyor!** 🎉