-- =====================================================
-- PARTNER YÖNETIM SİSTEMİ - DATABASE TABLES
-- =====================================================
-- Oluşturulma Tarihi: 9 Kasım 2024
-- Versiyon: 1.0
-- =====================================================

-- =====================================================
-- 1. BUYERS (PARTNERS) TABLOSU
-- =====================================================
-- Partner/Alıcı bilgilerini tutar
-- Portal erişim bilgilerini içerir

CREATE TABLE IF NOT EXISTS buyers (
  id SERIAL PRIMARY KEY,
  buyer_code VARCHAR(50) UNIQUE NOT NULL,
  buyer_name VARCHAR(255) NOT NULL,
  company_name VARCHAR(255),
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  
  -- Portal Access
  dashboard_username VARCHAR(100) UNIQUE,
  dashboard_password TEXT, -- bcrypt hash
  portal_active BOOLEAN DEFAULT false,
  portal_last_login TIMESTAMP,
  portal_login_attempts INTEGER DEFAULT 0,
  portal_locked_until TIMESTAMP,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  
  -- Contact & Notes
  contact_person VARCHAR(255),
  address TEXT,
  country VARCHAR(100),
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_by VARCHAR(100)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_buyers_buyer_code ON buyers(buyer_code);
CREATE INDEX IF NOT EXISTS idx_buyers_status ON buyers(status);
CREATE INDEX IF NOT EXISTS idx_buyers_username ON buyers(dashboard_username);
CREATE INDEX IF NOT EXISTS idx_buyers_portal_active ON buyers(portal_active);

-- Comments
COMMENT ON TABLE buyers IS 'Partner/Alıcı bilgileri ve portal erişim yönetimi';
COMMENT ON COLUMN buyers.buyer_code IS 'Unique partner kodu (BUYER_X, BUYER_Y)';
COMMENT ON COLUMN buyers.dashboard_password IS 'bcrypt hash - partner portal giriş şifresi';
COMMENT ON COLUMN buyers.portal_active IS 'Partner portal erişimi aktif mi?';

-- =====================================================
-- 2. OFFERS (PRODUCTS) TABLOSU
-- =====================================================
-- Ürün kataloğu (Feroxil, Ozphyzen)

CREATE TABLE IF NOT EXISTS offers (
  id SERIAL PRIMARY KEY,
  offer_id VARCHAR(50) UNIQUE NOT NULL,
  offer_name VARCHAR(255) NOT NULL,
  product_type VARCHAR(100),
  
  -- Pricing
  base_price DECIMAL(10,2),
  currency VARCHAR(10) DEFAULT 'EUR',
  
  -- Details
  description TEXT,
  image_url TEXT,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'discontinued')),
  
  -- Metadata
  tags TEXT[],
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_offers_offer_id ON offers(offer_id);
CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- Comments
COMMENT ON TABLE offers IS 'Ürün kataloğu (Feroxil, Ozphyzen, vb.)';
COMMENT ON COLUMN offers.offer_id IS 'Unique ürün kodu (ESV-FRX-2025, ESV-OZP-2025)';

-- Varsayılan ürünleri ekle
INSERT INTO offers (offer_id, offer_name, product_type, base_price, currency, description, status)
VALUES 
  ('ESV-FRX-2025', 'Feroxil', 'health_supplement', 99.00, 'EUR', 'Feroxil health supplement product', 'active'),
  ('ESV-OZP-2025', 'Ozphyzen', 'health_supplement', 89.00, 'EUR', 'Ozphyzen health supplement product', 'active')
ON CONFLICT (offer_id) DO NOTHING;

-- =====================================================
-- 3. DEAL_TYPES (ANLAŞMA TİPLERİ) TABLOSU
-- =====================================================
-- Komisyon modellerini tanımlar

CREATE TABLE IF NOT EXISTS deal_types (
  id SERIAL PRIMARY KEY,
  deal_code VARCHAR(20) UNIQUE NOT NULL,
  deal_name VARCHAR(100) NOT NULL,
  description TEXT,
  calculation_method TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index
CREATE INDEX IF NOT EXISTS idx_deal_types_code ON deal_types(deal_code);

-- Comments
COMMENT ON TABLE deal_types IS 'Komisyon anlaşma tipleri (CPA, CPL, CPS, HYBRID, REVSHARE)';
COMMENT ON COLUMN deal_types.deal_code IS 'Anlaşma tipi kodu';

-- Anlaşma tiplerini ekle
INSERT INTO deal_types (deal_code, deal_name, description, calculation_method)
VALUES 
  ('CPA', 'Cost Per Acquisition', 'Satış başına sabit komisyon', 'fixed_per_sale'),
  ('CPL', 'Cost Per Lead', 'Lead başına sabit komisyon', 'fixed_per_lead'),
  ('CPS', 'Cost Per Sale', 'Satış tutarının yüzdesi', 'percentage_of_sale'),
  ('HYBRID', 'Hybrid Model', 'Lead + Satış karma komisyon', 'fixed_per_lead + fixed_per_sale'),
  ('REVSHARE', 'Revenue Share', 'Aylık gelir paylaşımı', 'percentage_of_revenue')
ON CONFLICT (deal_code) DO NOTHING;

-- =====================================================
-- 4. BUYER_DEALS (ALICI ANLAŞMALARI) TABLOSU
-- =====================================================
-- Her buyer için ürün bazlı anlaşmaları tutar

CREATE TABLE IF NOT EXISTS buyer_deals (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  buyer_code VARCHAR(50) REFERENCES buyers(buyer_code) ON DELETE CASCADE,
  offer_id VARCHAR(50) REFERENCES offers(offer_id) ON DELETE CASCADE,
  deal_type VARCHAR(20) REFERENCES deal_types(deal_code),
  
  -- Commission Amounts
  fixed_amount DECIMAL(10,2), -- CPA/CPL için
  percentage DECIMAL(5,2), -- CPS/REVSHARE için (%)
  lead_commission DECIMAL(10,2), -- HYBRID için lead komisyonu
  sale_commission DECIMAL(10,2), -- HYBRID için satış komisyonu
  
  currency VARCHAR(10) DEFAULT 'EUR',
  
  -- Contract Details
  contract_start_date DATE,
  contract_end_date DATE,
  auto_renew BOOLEAN DEFAULT false,
  
  -- Status
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired', 'terminated')),
  
  -- Notes
  terms_and_conditions TEXT,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100),
  updated_by VARCHAR(100),
  
  -- Constraint: Unique deal per buyer-offer combo
  UNIQUE(buyer_code, offer_id)
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_buyer_deals_buyer_code ON buyer_deals(buyer_code);
CREATE INDEX IF NOT EXISTS idx_buyer_deals_offer_id ON buyer_deals(offer_id);
CREATE INDEX IF NOT EXISTS idx_buyer_deals_deal_type ON buyer_deals(deal_type);
CREATE INDEX IF NOT EXISTS idx_buyer_deals_status ON buyer_deals(status);

-- Comments
COMMENT ON TABLE buyer_deals IS 'Partner-Ürün anlaşmaları ve komisyon detayları';
COMMENT ON COLUMN buyer_deals.fixed_amount IS 'CPA/CPL için sabit tutar';
COMMENT ON COLUMN buyer_deals.percentage IS 'CPS/REVSHARE için yüzde (5.00 = %5)';
COMMENT ON COLUMN buyer_deals.lead_commission IS 'HYBRID model için lead başına komisyon';
COMMENT ON COLUMN buyer_deals.sale_commission IS 'HYBRID model için satış başına komisyon';

-- =====================================================
-- 5. BUYER_COMMISSIONS (KOMİSYON TAKİBİ) TABLOSU
-- =====================================================
-- Lead bazlı komisyon hesaplama ve takip

CREATE TABLE IF NOT EXISTS buyer_commissions (
  id SERIAL PRIMARY KEY,
  
  -- Relations
  buyer_code VARCHAR(50) REFERENCES buyers(buyer_code),
  tracking_id VARCHAR(100) UNIQUE NOT NULL,
  deal_id INTEGER REFERENCES buyer_deals(id),
  
  -- Commission Details
  commission_type VARCHAR(20) CHECK (commission_type IN ('lead', 'sale', 'revenue_share')),
  commission_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  
  -- Calculation Details
  calculation_base DECIMAL(10,2), -- Hesaplama tabanı (satış tutarı, revenue vb.)
  calculation_rate DECIMAL(5,2), -- Oran (%)
  calculation_method VARCHAR(50), -- 'fixed', 'percentage', 'hybrid'
  
  -- Status & Payment
  commission_status VARCHAR(20) DEFAULT 'pending' 
    CHECK (commission_status IN ('pending', 'approved', 'rejected', 'paid', 'cancelled')),
  
  approved_by VARCHAR(100),
  approved_at TIMESTAMP,
  rejected_reason TEXT,
  
  payment_date DATE,
  payment_reference VARCHAR(100),
  payment_notes TEXT,
  
  -- Period
  period_month INTEGER, -- 1-12
  period_year INTEGER, -- 2024, 2025
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Index'ler
CREATE INDEX IF NOT EXISTS idx_buyer_commissions_buyer_code ON buyer_commissions(buyer_code);
CREATE INDEX IF NOT EXISTS idx_buyer_commissions_tracking_id ON buyer_commissions(tracking_id);
CREATE INDEX IF NOT EXISTS idx_buyer_commissions_status ON buyer_commissions(commission_status);
CREATE INDEX IF NOT EXISTS idx_buyer_commissions_period ON buyer_commissions(period_year, period_month);
CREATE INDEX IF NOT EXISTS idx_buyer_commissions_payment_date ON buyer_commissions(payment_date);

-- Comments
COMMENT ON TABLE buyer_commissions IS 'Lead bazlı komisyon hesaplama ve ödeme takibi';
COMMENT ON COLUMN buyer_commissions.tracking_id IS 'n8n_leads.tracking_id ile ilişkili';
COMMENT ON COLUMN buyer_commissions.commission_status IS 'pending → approved → paid flow';

-- =====================================================
-- 6. n8n_leads TABLOSUNA YENİ KOLONLAR EKLE
-- =====================================================
-- Mevcut tabloya partner yönetimi için gerekli kolonları ekle

DO $$ 
BEGIN
  -- offer_id kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'n8n_leads' AND column_name = 'offer_id'
  ) THEN
    ALTER TABLE n8n_leads ADD COLUMN offer_id VARCHAR(50);
    CREATE INDEX idx_n8n_leads_offer_id ON n8n_leads(offer_id);
  END IF;
  
  -- deal_id kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'n8n_leads' AND column_name = 'deal_id'
  ) THEN
    ALTER TABLE n8n_leads ADD COLUMN deal_id INTEGER;
  END IF;
  
  -- commission_calculated kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'n8n_leads' AND column_name = 'commission_calculated'
  ) THEN
    ALTER TABLE n8n_leads ADD COLUMN commission_calculated BOOLEAN DEFAULT false;
  END IF;
  
  -- commission_id kolonu
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'n8n_leads' AND column_name = 'commission_id'
  ) THEN
    ALTER TABLE n8n_leads ADD COLUMN commission_id INTEGER;
  END IF;
END $$;

-- =====================================================
-- 7. VIEWS (HELPER VIEWS)
-- =====================================================

-- Partner özet istatistikleri
CREATE OR REPLACE VIEW vw_partner_stats AS
SELECT 
  b.buyer_code,
  b.buyer_name,
  b.company_name,
  b.status,
  
  -- Lead Stats
  COUNT(DISTINCT l.id) as total_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'pending') as pending_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'approved_for_crm') as approved_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'sent_to_crm') as sent_leads,
  COUNT(DISTINCT l.id) FILTER (WHERE l.status = 'rejected') as rejected_leads,
  
  -- Commission Stats
  COUNT(DISTINCT c.id) as total_commissions,
  SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'approved') as approved_commission,
  SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'paid') as paid_commission,
  SUM(c.commission_amount) FILTER (WHERE c.commission_status = 'pending') as pending_commission,
  
  -- Deal Stats
  COUNT(DISTINCT bd.id) as active_deals,
  
  -- Dates
  MAX(l.created_at) as last_lead_date,
  MAX(b.portal_last_login) as last_portal_login
  
FROM buyers b
LEFT JOIN n8n_leads l ON b.buyer_code = l.buyer_code
LEFT JOIN buyer_commissions c ON b.buyer_code = c.buyer_code
LEFT JOIN buyer_deals bd ON b.buyer_code = bd.buyer_code AND bd.status = 'active'
GROUP BY b.buyer_code, b.buyer_name, b.company_name, b.status;

COMMENT ON VIEW vw_partner_stats IS 'Partner özet istatistikleri (dashboard için)';

-- =====================================================
-- 8. TRIGGERS (AUTO UPDATE)
-- =====================================================

-- updated_at otomatik güncelleme fonksiyonu
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger'ları ekle
DROP TRIGGER IF EXISTS update_buyers_updated_at ON buyers;
CREATE TRIGGER update_buyers_updated_at
  BEFORE UPDATE ON buyers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_offers_updated_at ON offers;
CREATE TRIGGER update_offers_updated_at
  BEFORE UPDATE ON offers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_buyer_deals_updated_at ON buyer_deals;
CREATE TRIGGER update_buyer_deals_updated_at
  BEFORE UPDATE ON buyer_deals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_buyer_commissions_updated_at ON buyer_commissions;
CREATE TRIGGER update_buyer_commissions_updated_at
  BEFORE UPDATE ON buyer_commissions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 9. SAMPLE DATA (OPTIONAL - TEST İÇİN)
-- =====================================================

-- Test partner'ı ekle
INSERT INTO buyers (
  buyer_code, 
  buyer_name, 
  company_name, 
  email, 
  phone,
  status,
  notes
)
VALUES (
  'BUYER_TEST',
  'Test Partner',
  'Test Company Ltd.',
  'test@partner.com',
  '+90 555 000 0001',
  'active',
  'Test partner - development purposes only'
)
ON CONFLICT (buyer_code) DO NOTHING;

-- Test anlaşması ekle
INSERT INTO buyer_deals (
  buyer_code,
  offer_id,
  deal_type,
  fixed_amount,
  currency,
  status,
  notes
)
VALUES (
  'BUYER_TEST',
  'ESV-FRX-2025',
  'CPL',
  25.00,
  'EUR',
  'active',
  'Test deal - €25 per lead'
)
ON CONFLICT (buyer_code, offer_id) DO NOTHING;

-- =====================================================
-- MIGRATION TAMAMLANDI
-- =====================================================

SELECT 'Partner yönetim tabloları başarıyla oluşturuldu!' as message;
