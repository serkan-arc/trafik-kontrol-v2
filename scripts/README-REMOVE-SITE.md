# 🗑️ Site Kaldırma Rehberi

## Otomatik Kaldırma (Önerilen)

### Tek Komutla Kaldırma

```bash
cd /home/root/webapp/traffic-control-system
./scripts/remove-site.sh panel.dtektracking.com
```

Script şunları yapar:
- ✅ PM2 process'lerini durdurur ve siler
- ✅ Nginx konfigürasyonlarını kaldırır
- ✅ SSL sertifikasını siler (isterseniz)
- ✅ Veritabanı kaydını siler
- ✅ Site dosyalarını temizler (onay alarak)

---

## Manuel Kaldırma Adımları

### 1. PM2 Process'i Kaldır

```bash
# Tüm PM2 process'leri listele
pm2 list

# panel.dtektracking ile ilgili process'i bul
pm2 list | grep panel

# Process'i durdur (isim veya ID ile)
pm2 stop panel-dtektracking
# veya
pm2 stop 10

# Kalıcı olarak sil
pm2 delete panel-dtektracking

# PM2 listesini kaydet
pm2 save

# Doğrulama
pm2 list
```

### 2. Nginx Konfigürasyonunu Kaldır

```bash
# Aktif config'i kaldır (sites-enabled)
sudo rm /etc/nginx/sites-enabled/panel.dtektracking.com

# Kaynak config'i sil veya yedekle (sites-available)
sudo mv /etc/nginx/sites-available/panel.dtektracking.com \
        /etc/nginx/sites-available/panel.dtektracking.com.backup

# Nginx test et
sudo nginx -t

# Nginx'i yeniden yükle
sudo systemctl reload nginx

# Doğrulama
ls /etc/nginx/sites-enabled/ | grep panel
curl -I https://panel.dtektracking.com  # 404 veya connection refused olmalı
```

### 3. SSL Sertifikasını Kaldır

```bash
# Mevcut sertifikaları listele
sudo certbot certificates

# Sertifikayı sil
sudo certbot delete --cert-name panel.dtektracking.com

# Doğrulama
sudo certbot certificates | grep panel
```

### 4. Veritabanı Kaydını Sil

```bash
# PostgreSQL'e bağlan
psql -h postgres.dtekai.com -U postgres -d dtektracking

# Veritabanında siteyi bul
SELECT id, name, domain, status FROM deployed_sites WHERE domain = 'panel.dtektracking.com';

# Kaydı sil
DELETE FROM deployed_sites WHERE domain = 'panel.dtektracking.com';

# Doğrulama
SELECT * FROM deployed_sites WHERE domain LIKE '%panel%';

# Çıkış
\q
```

### 5. Site Dosyalarını Temizle

```bash
# Olası site dosya konumları
ls -la /var/www/ | grep panel
ls -la /home/root/webapp/ | grep panel

# Dosyaları yedekle (opsiyonel)
sudo tar -czf /root/backups/panel-dtektracking-$(date +%Y%m%d).tar.gz \
    /var/www/panel.dtektracking.com

# Dosyaları sil
sudo rm -rf /var/www/panel.dtektracking.com
sudo rm -rf /home/root/webapp/panel-dtektracking

# Doğrulama
ls -la /var/www/ | grep panel
```

### 6. Port'u Kontrol Et ve Temizle

```bash
# Port 3100'ü kullanan process var mı?
sudo lsof -i :3100

# Netstat ile kontrol
sudo netstat -tulpn | grep 3100

# Eğer hala bir şey çalışıyorsa, zorla kapat
sudo kill -9 <PID>
```

---

## Doğrulama Checklist

Kaldırma işleminden sonra kontrol edin:

- [ ] `pm2 list` - Process listesinde yok
- [ ] `ls /etc/nginx/sites-enabled/` - Nginx config yok
- [ ] `sudo certbot certificates` - SSL sertifikası yok
- [ ] `curl -I https://panel.dtektracking.com` - Site erişilemez
- [ ] `sudo lsof -i :3100` - Port boş
- [ ] `psql` ile database - Kayıt yok
- [ ] Dashboard SSL sayfası - Site görünmüyor

---

## Dikkat Edilmesi Gerekenler

### ⚠️ Veri Kaybı Riski
- Site dosyalarını silmeden önce mutlaka yedek alın
- Veritabanı kaydını silmeden önce önemli veri var mı kontrol edin

### 🔄 DNS Kayıtları
- Subdomain DNS kayıtlarını sağlayıcınızdan (örn: Cloudflare) silin veya güncelleyin
- A/CNAME kayıtlarını kaldırın

### 📧 SSL Email Bildirimleri
- Let's Encrypt otomatik yenileme e-postalarını almamak için sertifikayı sildiğinizden emin olun

### 🔗 Bağlantılar
- Diğer sitelerden bu siteye yapılan internal linkler varsa güncelleyin
- API endpoint'leri varsa, bunları kullanan diğer servisleri kontrol edin

---

## Hata Durumları

### PM2 process silinmiyor
```bash
# Zorla durdur
pm2 kill
pm2 flush
pm2 resurrect
```

### Nginx reload başarısız
```bash
# Syntax hatası kontrolü
sudo nginx -t

# Detaylı log
sudo tail -f /var/log/nginx/error.log

# Nginx'i restart et
sudo systemctl restart nginx
```

### SSL sertifikası silinmiyor
```bash
# Manuel sertifika dosyalarını sil
sudo rm -rf /etc/letsencrypt/live/panel.dtektracking.com
sudo rm -rf /etc/letsencrypt/archive/panel.dtektracking.com
sudo rm -rf /etc/letsencrypt/renewal/panel.dtektracking.com.conf
```

---

## Örnek: Tam Kaldırma

```bash
# 1. Script'i çalıştır
cd /home/root/webapp/traffic-control-system
./scripts/remove-site.sh panel.dtektracking.com

# Sorulara cevap ver:
# - Emin misiniz? → evet
# - SSL silinsin mi? → e
# - Dosyalar silinsin mi? → e

# 2. Doğrulama
pm2 list | grep panel                    # Boş çıktı
curl -I https://panel.dtektracking.com   # Bağlantı hatası
sudo lsof -i :3100                       # Boş çıktı

# 3. DNS güncelle (Cloudflare/DNS sağlayıcısında)
# panel.dtektracking.com A/CNAME kaydını sil

# ✅ Tamamlandı!
```

---

## Web Panel'den Kaldırma (Gelecek Özellik)

**Yakında eklenecek:**
- 🖱️ Dashboard'dan tek tıkla site kaldırma
- 🗑️ "Delete Site" butonu her site detay sayfasında
- ✅ Otomatik cleanup ve doğrulama
- 📧 Email bildirimi
- 🔄 Rollback özelliği (yanlışlıkla silme durumunda geri yükleme)

---

## İletişim

Sorularınız için:
- 📧 System Admin: admin@garantor360.com
- 📚 Dokümantasyon: /docs
- 🐛 Bug Report: GitHub Issues
