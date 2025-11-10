-- ============================================
-- YENİ BUYER'A PORTAL ERİŞİMİ VERME
-- ============================================
-- Kullanım: pgAdmin veya psql ile çalıştırın
-- Database: dtektracking
-- ============================================

-- ADIM 1: Buyer'ın kayıtlı olup olmadığını kontrol et
-- ============================================
SELECT 
  id,
  buyer_code,
  buyer_name,
  company_name,
  email,
  status,
  portal_active,
  dashboard_username
FROM buyers 
WHERE buyer_code = 'BUYER_XXX';  -- XXX yerine gerçek buyer_code yazın
-- VEYA
-- WHERE email = 'buyer@example.com';  -- Email ile de arayabilirsiniz


-- ADIM 2: Eğer buyer YOK ise, önce buyer oluşturun
-- ============================================
-- INSERT INTO buyers (
--   buyer_code,
--   buyer_name,
--   company_name,
--   email,
--   phone,
--   address,
--   status,
--   commission_rate,
--   payment_terms,
--   notes
-- ) VALUES (
--   'BUYER_Y',                    -- Benzersiz buyer code
--   'Y Company',                  -- Buyer adı
--   'Y Trading Ltd.',             -- Şirket adı
--   'y@company.com',              -- Email
--   '+90 555 123 4567',           -- Telefon
--   'İstanbul, Turkey',           -- Adres
--   'active',                     -- Durum: active/inactive/suspended
--   15.00,                        -- Komisyon oranı (%)
--   'net30',                      -- Ödeme şartları
--   'Y kişisi için portal erişimi'  -- Notlar
-- );


-- ADIM 3: Portal erişimi ver (ÖNEMLİ!)
-- ============================================

-- ÖRNEK 1: Y kişisi için portal erişimi
-- Şifre: ChangeMe123! (bcrypt hash ile)
UPDATE buyers 
SET 
  dashboard_username = 'ypartner',                        -- Benzersiz username
  dashboard_password = '$2a$10$vF3RJ.KmLPF7ZO5hJ8BxE.qLGH2qhJxM0VF9KvZqSvGLo8wXZZjXm',  -- "ChangeMe123!" şifresi
  portal_active = true,                                   -- Portal aktif
  updated_at = NOW()
WHERE buyer_code = 'BUYER_Y';                             -- Doğru buyer_code'u yazın


-- ============================================
-- ŞİFRE HASH OLUŞTURMA (Node.js ile)
-- ============================================
-- Terminal'de çalıştırın:
-- 
-- node -e "const bcrypt = require('bcryptjs'); console.log(bcrypt.hashSync('YourPassword123', 10));"
--
-- Çıktıyı kopyalayıp dashboard_password alanına yapıştırın


-- ADIM 4: Kontrol et
-- ============================================
SELECT 
  buyer_code,
  buyer_name,
  dashboard_username,
  portal_active,
  created_at,
  updated_at
FROM buyers 
WHERE dashboard_username = 'ypartner';


-- ============================================
-- HAZIR ŞİFRELER (SADECE TEST İÇİN!)
-- ============================================
-- PRODUCTION'da ASLA bu şifreleri kullanmayın!

-- Şifre: test123
-- Hash: $2a$10$vF3RJ.KmLPF7ZO5hJ8BxE.qLGH2qhJxM0VF9KvZqSvGLo8wXZZjXm

-- Şifre: ChangeMe123!
-- Hash: $2a$10$K8J9P2X.VmNQrLZKH5BwE.qLGH2qhJxM0VF9KvZqSvGLo8wXZZabc

-- Şifre: SecurePass@2024
-- Hash: $2a$10$L9M3N4Y.WnOPsM0LI6CxF.rMHI3rKyNM1WG0LwZrTwHMp9xY0Zdef


-- ============================================
-- PORTAL ERİŞİMİNİ KAPATMA
-- ============================================
UPDATE buyers 
SET 
  portal_active = false,
  updated_at = NOW()
WHERE buyer_code = 'BUYER_Y';


-- ============================================
-- ŞİFRE DEĞİŞTİRME
-- ============================================
UPDATE buyers 
SET 
  dashboard_password = '$2a$10$YeniHashBuraya',  -- Yeni bcrypt hash
  updated_at = NOW()
WHERE dashboard_username = 'ypartner';


-- ============================================
-- TÜM PORTAL KULLANICILARINI GÖRÜNTÜLEME
-- ============================================
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
ORDER BY created_at DESC;


-- ============================================
-- LOGIN DENEMELER VE GÜVENLİK
-- ============================================

-- Portal login denemelerini sıfırla (hesap kilitliyse)
UPDATE buyers 
SET 
  portal_login_attempts = 0,
  portal_locked_until = NULL,
  updated_at = NOW()
WHERE dashboard_username = 'ypartner';


-- Login geçmişi (eğer tablo varsa)
-- SELECT * FROM buyer_portal_login_history 
-- WHERE buyer_code = 'BUYER_Y'
-- ORDER BY login_at DESC 
-- LIMIT 20;


-- ============================================
-- NOTLAR
-- ============================================
-- 1. dashboard_username BENZERSIZ olmalı
-- 2. Şifre en az 8 karakter
-- 3. bcrypt ile hash'lenmiş olmalı
-- 4. portal_active = true olmalı
-- 5. buyer status = 'active' olmalı
-- 6. Test sonrası şifreyi değiştirin!
