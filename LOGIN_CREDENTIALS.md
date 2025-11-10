# 🔐 SİSTEM GİRİŞ BİLGİLERİ

**Güncelleme:** 10 Kasım 2024, 00:40

---

## 🖥️ ADMIN PANEL - TRAFFIC CONTROL

### URL
```
http://207.180.204.60:3001/login
```

### Giriş Bilgileri
```
Email:    admin@dtek.com
Password: Admin2024!
```

### Detaylar
- **Tablo:** `users`
- **Role:** admin
- **Database:** dtektracking @ postgres.dtekai.com
- **Oluşturulma:** 10 Kasım 2024
- **User ID:** bf28c468-f7ac-4735-b698-decaf1473944

### Özellikler
- Partner yönetimi
- Lead havuzu
- Paket yönetimi
- Anlaşma yönetimi
- Komisyon hesaplama
- N8N entegrasyonu
- Traffic overview
- Site yönetimi

---

## 👥 PARTNER PORTAL

### URL
```
http://207.180.204.60:3002
```

### Test Giriş Bilgileri
```
Username: testpartner
Password: test123
```

### Detaylar
- **Tablo:** `buyers`
- **Buyer Code:** BUYER_TEST
- **Buyer Name:** Test Partner
- **Database:** dtektracking @ postgres.dtekai.com
- **Portal Active:** true

### Özellikler
- Dashboard (stats)
- Lead listesi (PII-filtered)
- Komisyon takibi
- Performance analytics
- Profile yönetimi
- Multi-language (EN/TR)
- Dark/Light theme

---

## 🆕 YENİ KULLANICI OLUŞTURMA

### Admin User (Traffic Control)
```bash
cd /home/root/webapp
DB_PASSWORD="..." node create-admin-user.js email@example.com Password123 FirstName LastName admin
```

### Partner User (Partner Portal)
```bash
cd /home/root/webapp
DB_PASSWORD="..." node create-portal-user.js BUYER_CODE username password
```

---

## 📊 DATABASE ERİŞİMİ

### Connection Details
```
Host:     postgres.dtekai.com
Port:     5432
Database: dtektracking
User:     postgres
Password: T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s
```

### pgAdmin URL
```
URL: (port bilgisi dokümanlarda mevcut)
```

---

## 🔧 USEFUL QUERIES

### Admin Users Listesi
```sql
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  status,
  last_login_at,
  created_at
FROM users
ORDER BY created_at DESC;
```

### Partner Portal Users Listesi
```sql
SELECT 
  buyer_code,
  buyer_name,
  dashboard_username,
  portal_active,
  status,
  created_at
FROM buyers
WHERE dashboard_username IS NOT NULL
ORDER BY buyer_name;
```

### Password Reset (Admin)
```bash
# Generate new hash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('NewPassword123', 10));"

# Update in database
# UPDATE users SET password_hash = '...' WHERE email = 'admin@dtek.com';
```

### Password Reset (Partner)
```bash
# Generate new hash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('NewPassword123', 10));"

# Update in database
# UPDATE buyers SET dashboard_password = '...' WHERE dashboard_username = 'testpartner';
```

---

## ⚠️ GÜVENLİK NOTALARI

1. **ASLA** bu şifreleri production'da kullanmayın
2. İlk girişten sonra şifreleri değiştirin
3. Güçlü şifreler kullanın (min 8 karakter, büyük/küçük harf, rakam, özel karakter)
4. Bu dosyayı güvenli tutun
5. Database password'ü asla paylaşmayın

---

## 📝 DEĞİŞİKLİK GEÇMİŞİ

**10 Kasım 2024, 00:40**
- Admin user oluşturuldu (admin@dtek.com)
- Partner test user doğrulandı (testpartner)
- Dokümantasyon güncellendi

---

## 🆘 SORUN GİDERME

### Problem: Login çalışmıyor

**Admin Panel (3001):**
1. Email ve password doğru mu?
2. `users` tablosu var mı?
3. User status 'active' mi?
4. PM2 servisi çalışıyor mu?

**Partner Portal (3002):**
1. Username ve password doğru mu?
2. `portal_active = true` mi?
3. Buyer `status = 'active'` mi?
4. PM2 servisi çalışıyor mu?

### PM2 Status Check
```bash
pm2 status
pm2 logs traffic-control-prod --lines 50
pm2 logs partner-portal --lines 50
```

### Database Connection Test
```bash
psql -h postgres.dtekai.com -U postgres -d dtektracking -c "SELECT version();"
```

---

## 📞 İLETİŞİM

Bu giriş bilgileri sisteminizin yönetimi için kritiktir. Lütfen güvenli saklayın.

**Dosya Konumu:** `/home/root/webapp/LOGIN_CREDENTIALS.md`
