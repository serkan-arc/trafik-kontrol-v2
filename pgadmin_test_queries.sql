-- =====================================================
-- TRAFİK YÖNETİM SİSTEMİ - TEST SORGULARI
-- Bu sorguları pgAdmin'de çalıştırarak verilerinizi görebilirsiniz
-- =====================================================

-- 1. KULLANICILAR LİSTESİ
-- Sistemdeki tüm kullanıcıları gösterir
SELECT * FROM users;

-- 2. IP TAKİP VERİLERİ
-- İzlenen IP adresleri ve risk skorları
SELECT 
    ip,
    country_name,
    city,
    visit_count,
    risk_score,
    bot_score,
    list_status,
    last_seen
FROM ip_tracking
ORDER BY last_seen DESC;

-- 3. GLOBAL IP AKTİVİTESİ (462 kayıt var!)
-- En aktif IP adresleri
SELECT 
    ip,
    total_visits,
    unique_domains,
    first_seen,
    last_seen,
    risk_score,
    is_blacklisted
FROM global_ip_activity
ORDER BY total_visits DESC
LIMIT 20;

-- 4. IP İTİBAR PUANLARI (152 kayıt var!)
-- IP itibar puanlaması sistemi
SELECT 
    ip,
    reputation_score,
    threat_level,
    last_activity,
    total_reports,
    is_trusted
FROM global_ip_reputation
WHERE reputation_score IS NOT NULL
ORDER BY reputation_score DESC
LIMIT 20;

-- 5. BOT TESPİTLERİ
-- Tespit edilen botlar
SELECT 
    ip,
    bot_type,
    detection_method,
    confidence_score,
    detected_at,
    action_taken
FROM global_bot_detections
ORDER BY detected_at DESC;

-- 6. SİSTEM AYARLARI
-- Mevcut sistem konfigürasyonu
SELECT 
    setting_key,
    setting_value,
    description
FROM global_system_settings;

-- 7. DEPLOY EDİLMİŞ SİTELER
SELECT * FROM deployed_sites;

-- 8. SSL SERTİFİKALARI
SELECT 
    domain,
    issuer,
    valid_from,
    valid_to,
    is_active
FROM ssl_certificates;

-- 9. FORM GÖNDERİMLERİ
SELECT * FROM form_submission_history;

-- 10. OTOMATİK KURALLAR
SELECT 
    rule_name,
    rule_type,
    condition,
    action,
    is_active
FROM auto_rules;

-- =====================================================
-- İSTATİSTİK SORGULARI
-- =====================================================

-- Toplam IP sayısı
SELECT 
    'Toplam İzlenen IP' as metric,
    COUNT(*) as value
FROM global_ip_activity

UNION ALL

-- Kara listedeki IP sayısı
SELECT 
    'Kara Listedeki IP' as metric,
    COUNT(*) as value
FROM global_ip_activity
WHERE is_blacklisted = true

UNION ALL

-- Toplam bot tespiti
SELECT 
    'Tespit Edilen Bot' as metric,
    COUNT(*) as value
FROM global_bot_detections

UNION ALL

-- Güvenilir IP sayısı
SELECT 
    'Güvenilir IP' as metric,
    COUNT(*) as value
FROM global_ip_reputation
WHERE is_trusted = true;

-- =====================================================
-- ESKİ SİSTEM VERİLERİ (newsalesozphyzenid2)
-- Bu veriler eski sistemden kalmadır
-- =====================================================

-- Eski sistemdeki trafik logları (2780 kayıt)
SELECT 
    COUNT(*) as "Eski Sistem Trafik Log Sayısı"
FROM newsalesozphyzenid2_shop_traffic_logs;

-- Eski sistemdeki IP adresleri (243 kayıt)
SELECT 
    COUNT(*) as "Eski Sistem IP Sayısı"
FROM newsalesozphyzenid2_shop_ip_addresses;

-- =====================================================
-- TABLO BOYUTLARI
-- Hangi tablo ne kadar yer kaplıyor?
-- =====================================================

SELECT 
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 20;