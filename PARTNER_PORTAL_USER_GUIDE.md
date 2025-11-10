# 🔐 PARTNER PORTAL ERİŞİM YÖNETİMİ

**Partner Portal URL:** http://207.180.204.60:3002  
**Güncelleme:** 10 Kasım 2024

---

## 📋 İÇİNDEKİLER

1. [Yeni Kullanıcı Ekleme](#yeni-kullanıcı-ekleme)
2. [Kullanıcı Yönetimi](#kullanıcı-yönetimi)
3. [Güvenlik Notları](#güvenlik-notları)
4. [Sorun Giderme](#sorun-giderme)

---

## 🆕 YENİ KULLANICI EKLEME

### YÖNTEM 1: NODE.JS SCRIPT (ÖNERİLEN) ⚡

En hızlı ve güvenli yöntem. Otomatik şifre hash'leme ve validasyon içerir.

#### Adım 1: Script'i Çalıştır

```bash
cd /home/root/webapp
node create-portal-user.js BUYER_CODE username password
```

#### Örnek:

```bash
# Y kişisi için portal erişimi oluştur
node create-portal-user.js BUYER_Y ypartner SecurePass123!
```

#### Çıktı:

```
🔍 Checking buyer...
✅ Buyer found: Y Company
🔍 Checking username availability...
✅ Username available
🔐 Hashing password...
✅ Password hashed
💾 Creating portal access...

✅ SUCCESS! Portal access created:
════════════════════════════════
Buyer Code: BUYER_Y
Buyer Name: Y Company
Username:   ypartner
Password:   SecurePass123!
Portal:     Active ✅
════════════════════════════════

🌐 Login URL: http://207.180.204.60:3002

⚠️  IMPORTANT: Save these credentials securely!
💡 Tell the partner to change their password after first login.
```

#### Gereksinimler:

- ✅ Buyer database'de kayıtlı olmalı
- ✅ Username benzersiz olmalı (min 4 karakter)
- ✅ Password en az 8 karakter

---

### YÖNTEM 2: SQL SORGUSU (DATABASE) 🗄️

pgAdmin veya psql ile doğrudan database'de işlem yapma.

#### Adım 1: Buyer Kontrol

```sql
-- Buyer'ın var olup olmadığını kontrol et
SELECT 
  buyer_code,
  buyer_name,
  email,
  status,
  portal_active,
  dashboard_username
FROM buyers 
WHERE buyer_code = 'BUYER_Y';
```

#### Adım 2: Şifre Hash Oluştur

Terminal'de:

```bash
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword123', 10));"
```

Çıktı örneği:
```
$2a$10$vF3RJ.KmLPF7ZO5hJ8BxE.qLGH2qhJxM0VF9KvZqSvGLo8wXZZjXm
```

#### Adım 3: Portal Erişimi Ver

```sql
-- Y kişisi için portal erişimi oluştur
UPDATE buyers 
SET 
  dashboard_username = 'ypartner',                        -- Benzersiz username
  dashboard_password = '$2a$10$vF3RJ...',                 -- Yukarıdaki hash'i yapıştır
  portal_active = true,
  updated_at = NOW()
WHERE buyer_code = 'BUYER_Y';
```

#### Adım 4: Kontrol Et

```sql
SELECT 
  buyer_code,
  buyer_name,
  dashboard_username,
  portal_active,
  updated_at
FROM buyers 
WHERE dashboard_username = 'ypartner';
```

---

### YÖNTEM 3: ADMIN PANEL (GELECEKTE) 🚧

**Durum:** Admin Panel'de portal erişim sayfası var ama API henüz aktif değil.

**Konum:** `/dashboard/partners/[id]/portal-access`

**Ne Zaman Hazır Olacak:** API entegrasyonu tamamlandığında.

---

## 👥 KULLANICI YÖNETİMİ

### Tüm Portal Kullanıcılarını Görüntüleme

```sql
SELECT 
  buyer_code,
  buyer_name,
  company_name,
  dashboard_username,
  portal_active,
  portal_last_login,
  created_at
FROM buyers 
WHERE dashboard_username IS NOT NULL
ORDER BY portal_active DESC, buyer_name ASC;
```

### Portal Erişimini Kapatma

```sql
UPDATE buyers 
SET 
  portal_active = false,
  updated_at = NOW()
WHERE buyer_code = 'BUYER_Y';
```

### Portal Erişimini Açma

```sql
UPDATE buyers 
SET 
  portal_active = true,
  updated_at = NOW()
WHERE buyer_code = 'BUYER_Y';
```

### Şifre Değiştirme

```bash
# 1. Yeni şifre hash'i oluştur
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('NewPassword456', 10));"

# 2. SQL ile güncelle
```

```sql
UPDATE buyers 
SET 
  dashboard_password = '$2a$10$YeniHashBuraya',
  updated_at = NOW()
WHERE dashboard_username = 'ypartner';
```

### Hesap Kilidini Açma

Eğer partner çok fazla başarısız login denemesi yapmışsa:

```sql
UPDATE buyers 
SET 
  portal_login_attempts = 0,
  portal_locked_until = NULL,
  updated_at = NOW()
WHERE dashboard_username = 'ypartner';
```

### Kullanıcıyı Silme

```sql
-- Portal erişimini kaldır (buyer kaydı kalır)
UPDATE buyers 
SET 
  dashboard_username = NULL,
  dashboard_password = NULL,
  portal_active = false,
  updated_at = NOW()
WHERE buyer_code = 'BUYER_Y';
```

---

## 🔒 GÜVENLİK NOTALARI

### ✅ Yapılması Gerekenler:

1. **Güçlü Şifreler Kullanın**
   - En az 8 karakter
   - Büyük/küçük harf, rakam ve özel karakter içermeli
   - Örnek: `Secure@Pass2024!`

2. **İlk Girişten Sonra Şifre Değiştirme**
   - Partner'a ilk şifreyi verin
   - İlk girişte değiştirmelerini isteyin
   - Portal'da "Change Password" özelliği var

3. **Benzersiz Username Kullanın**
   - Her partner için farklı username
   - Önerilen format: `partnerismi` veya `companyname`
   - Özel karakter kullanmayın

4. **Portal Erişimini Takip Edin**
   - Son login zamanını kontrol edin
   - Aktif olmayan hesapları kapatın
   - Login denemelerini izleyin

### ❌ Yapılmaması Gerekenler:

1. **ASLA plain text şifre kaydetmeyin**
   - Şifreler her zaman bcrypt hash ile saklanmalı
   - Plain text şifreler database'de görünmemeli

2. **ASLA basit şifreler kullanmayın**
   - `password`, `123456`, `test123` gibi
   - Production'da test şifrelerini kullanmayın

3. **ASLA aynı şifreyi birden fazla kullanıcıya vermeyin**

4. **ASLA şifreleri email veya mesaj ile göndermeyın**
   - Güvenli kanal kullanın (telefon, şifreli mesajlaşma)

---

## 🐛 SORUN GİDERME

### Problem 1: "Username already exists"

**Çözüm:** Farklı bir username seçin veya mevcut kullanıcıyı kontrol edin:

```sql
SELECT buyer_code, buyer_name 
FROM buyers 
WHERE dashboard_username = 'problemli_username';
```

### Problem 2: "Buyer not found"

**Çözüm:** Önce buyer'ı database'e ekleyin:

```sql
-- Mevcut buyer'ları listele
SELECT buyer_code, buyer_name 
FROM buyers 
ORDER BY buyer_code;

-- Yeni buyer ekle (gerekirse)
INSERT INTO buyers (
  buyer_code, buyer_name, company_name, email, status
) VALUES (
  'BUYER_NEW', 'New Partner', 'New Co.', 'new@company.com', 'active'
);
```

### Problem 3: Login çalışmıyor

**Kontrol Listesi:**

1. ✅ `portal_active = true` mi?
2. ✅ `status = 'active'` mi?
3. ✅ Username doğru mu?
4. ✅ Şifre doğru mu?
5. ✅ Hesap kilitli mi? (`portal_locked_until`)

```sql
SELECT 
  buyer_code,
  dashboard_username,
  portal_active,
  status,
  portal_login_attempts,
  portal_locked_until
FROM buyers 
WHERE dashboard_username = 'problemli_user';
```

### Problem 4: "Module not found" (Node.js script)

**Çözüm:**

```bash
cd /home/root/webapp
npm install bcryptjs pg
```

---

## 📊 ÖRNEK SENARYOLAR

### Senaryo 1: X kişisine portal verdim, şimdi Y kişisine vermem gerekiyor

```bash
# Kolay yol:
cd /home/root/webapp
node create-portal-user.js BUYER_Y ypartner NewPass2024!
```

### Senaryo 2: Partner şifresini unuttu

```bash
# 1. Yeni şifre oluştur
NEW_PASSWORD="TempPass123!"

# 2. Hash oluştur
node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('$NEW_PASSWORD', 10));"

# 3. SQL ile güncelle (çıkan hash'i kullan)
```

```sql
UPDATE buyers 
SET dashboard_password = '$2a$10$...'
WHERE dashboard_username = 'ypartner';
```

### Senaryo 3: Partner artık çalışmıyor, portal erişimini kapatmalıyım

```sql
UPDATE buyers 
SET 
  portal_active = false,
  updated_at = NOW()
WHERE buyer_code = 'BUYER_ESKI';
```

### Senaryo 4: Yeni partner ekliyorum (database'de yok)

```sql
-- 1. Partner ekle
INSERT INTO buyers (
  buyer_code, buyer_name, company_name, email, phone, status
) VALUES (
  'BUYER_NEW', 'New Partner', 'New Company', 'new@example.com', '+90 555 123 4567', 'active'
);

-- 2. Portal erişimi ver
-- Script ile:
```

```bash
node create-portal-user.js BUYER_NEW newpartner Pass2024!
```

---

## 📞 DESTEK

**Sorularınız için:**
- 📁 SQL dosyası: `/home/root/webapp/ADD_NEW_PARTNER_PORTAL_ACCESS.sql`
- 🔧 Script: `/home/root/webapp/create-portal-user.js`
- 📖 Bu rehber: `/home/root/webapp/PARTNER_PORTAL_USER_GUIDE.md`

**Test Hesabı (Örnek):**
- URL: http://207.180.204.60:3002
- Username: `testpartner`
- Password: `test123`
- Buyer: `BUYER_TEST`
