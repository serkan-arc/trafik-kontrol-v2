# 🎛️ YÖNETİM PANELLERİ ERİŞİM BİLGİLERİ (GÜNCEL)
*Son Güncelleme: 8 Kasım 2024*

## 🗄️ 1. PostgreSQL Web Paneli (pgAdmin)

### ✅ Erişim Yöntemleri:
| Yöntem | URL | Durum |
|--------|-----|-------|
| **Direkt IP** | http://207.180.204.60:5050 | ✅ Aktif |
| **Subdomain** | http://postgres.dtektracking.com | ⏳ DNS ayarı bekliyor |
| **SSL (İleride)** | https://postgres.dtektracking.com | ⏳ DNS sonrası |

### 📌 Giriş Bilgileri:
- **Email:** serkandogan@aiteldtek.com  
- **Şifre:** Esvella2025136326

### 🔌 Database Bağlantı (pgAdmin içinde eklenecek):
```sql
Host: postgres.dtekai.com
Port: 5432
Database: dtektracking
Username: postgres
Password: I4z9eP2aD5sQ3wL1
```

### 💡 İlk Kurulum Adımları:
1. pgAdmin'e giriş yapın
2. Sol menüde sağ tık → "Register" → "Server"
3. **General Tab:**
   - Name: `Trafik Manager DB`
4. **Connection Tab:**
   - Host: `postgres.dtekai.com`
   - Port: `5432`
   - Database: `dtektracking`
   - Username: `postgres`
   - Password: `I4z9eP2aD5sQ3wL1`
   - Save password: ✅
5. **Save** tıklayın

---

## 🔴 2. Redis Web Paneli (RedisInsight)

### ✅ Erişim Yöntemleri:
| Yöntem | URL | Durum |
|--------|-----|-------|
| **Direkt IP** | http://207.180.204.60:5540 | ✅ Aktif |
| **Subdomain** | http://redis.dtektracking.com | ⏳ DNS ayarı bekliyor |
| **SSL (İleride)** | https://redis.dtektracking.com | ⏳ DNS sonrası |

### 💡 İlk Kurulum Adımları:
1. RedisInsight'a girin
2. "I have read..." checkbox'ı işaretle → **Submit**
3. **Add Redis Database** tıklayın
4. **Connection Details:**
   - Host: `localhost`
   - Port: `6379`
   - Database Alias: `Trafik Manager Cache`
   - Password: (boş bırakın)
5. **Test Connection** → **Add Redis Database**

---

## 📊 3. Sistem İzleme Paneli (Netdata)

### ✅ Erişim Yöntemleri:
| Yöntem | URL | Durum |
|--------|-----|-------|
| **Direkt IP** | http://207.180.204.60:19999 | ✅ Aktif |
| **Subdomain** | http://monitor.dtektracking.com | ⏳ DNS ayarı bekliyor |
| **SSL (İleride)** | https://monitor.dtektracking.com | ⏳ DNS sonrası |

### 📈 İzlenen Metrikler:
- **System Overview:** CPU, RAM, Swap, Load Average
- **Disks:** I/O, kullanım, hız
- **Network:** Trafik, paket kaybı, bağlantılar
- **Applications:**
  - PM2 (Node.js process'leri)
  - Docker containers
  - Nginx
  - PostgreSQL
  - Redis
- **Alerts:** Otomatik uyarılar

---

## 🚀 DNS AYARLARI (YAPILMASI GEREKEN)

### Cloudflare veya DNS Provider'ınızda Ekleyin:

```dns
postgres.dtektracking.com    A    207.180.204.60
redis.dtektracking.com       A    207.180.204.60  
monitor.dtektracking.com     A    207.180.204.60
```

### DNS Eklendikten Sonra SSL Kurulumu:
```bash
# Otomatik SSL sertifikası alımı (DNS eklendikten sonra çalıştırın)
certbot --nginx -d postgres.dtektracking.com --redirect
certbot --nginx -d redis.dtektracking.com --redirect
certbot --nginx -d monitor.dtektracking.com --redirect
```

---

## 🔐 GÜVENLİK ÖNERİLERİ

### 1. IP Kısıtlaması (Production için önerilir):
```bash
# Sadece sizin IP'niz erişebilsin
ufw allow from SIZIN_IP_ADRESINIZ to any port 5050
ufw allow from SIZIN_IP_ADRESINIZ to any port 5540
ufw allow from SIZIN_IP_ADRESINIZ to any port 19999
```

### 2. Basic Auth Ekleme (Nginx):
```bash
# Şifre dosyası oluştur
htpasswd -c /etc/nginx/.htpasswd admin

# Nginx config'e ekle (location bloğu içine)
auth_basic "Admin Panel";
auth_basic_user_file /etc/nginx/.htpasswd;
```

---

## 📋 ÖZET TABLO

| Panel | Direkt IP | Subdomain (DNS gerekli) | Kullanıcı | Şifre |
|-------|-----------|-------------------------|-----------|-------|
| **pgAdmin** | http://207.180.204.60:5050 | postgres.dtektracking.com | serkandogan@aiteldtek.com | Esvella2025136326 |
| **RedisInsight** | http://207.180.204.60:5540 | redis.dtektracking.com | - | - |
| **Netdata** | http://207.180.204.60:19999 | monitor.dtektracking.com | - | - |
| **Ana Site** | - | https://dtektracking.com | admin | Esvella2025136326 |
| **Dosya Yönetici** | - | https://dosya.dtektracking.com | - | - |

---

## 🛠️ DOCKER KOMUTLARI

### Container Durumu:
```bash
docker ps
```

### Container Yeniden Başlatma:
```bash
docker restart pgadmin
docker restart redis-insight
docker restart netdata
```

### Container Logları:
```bash
docker logs pgadmin
docker logs redis-insight
docker logs netdata
```

### Container Durdurma/Başlatma:
```bash
docker stop pgadmin
docker start pgadmin
```

---

## 📝 NOTLAR

1. **pgAdmin:** İlk girişte sunucu eklemeniz gerekiyor
2. **RedisInsight:** İlk girişte database eklemeniz gerekiyor
3. **Netdata:** Doğrudan çalışır, kurulum gerektirmez
4. **DNS:** Subdomain'ler için DNS A kayıtları eklenmelidir
5. **SSL:** DNS kayıtları eklendikten sonra Let's Encrypt kurulabilir

---

*Bu dokümantasyon tüm panel erişim bilgilerini içerir. Güvenli saklayın.*