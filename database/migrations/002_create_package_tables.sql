-- =====================================================
-- ESVELLA LEAD MANAGEMENT SYSTEM
-- Migration 002: Package Management Tables
-- Created: 2024-11-09
-- Description: Lead batch/package management system
-- =====================================================

-- Drop existing objects if any (for re-run safety)
DROP TABLE IF EXISTS lead_batch_items CASCADE;
DROP TABLE IF EXISTS lead_batches CASCADE;
DROP VIEW IF EXISTS vw_batch_stats CASCADE;

-- =====================================================
-- TABLE: lead_batches
-- Description: Package/batch management for CRM export
-- =====================================================
CREATE TABLE lead_batches (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(100) UNIQUE NOT NULL,
  batch_name VARCHAR(255) NOT NULL,
  
  -- Grouping
  buyer_code VARCHAR(50) REFERENCES buyers(buyer_code) ON DELETE SET NULL,
  offer_id VARCHAR(50) REFERENCES offers(offer_id) ON DELETE SET NULL,
  
  -- Statistics
  lead_count INT DEFAULT 0,
  approved_count INT DEFAULT 0,
  rejected_count INT DEFAULT 0,
  
  -- Status tracking
  status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'ready', 'sent', 'completed', 'cancelled')),
  
  -- User tracking
  created_by VARCHAR(100),
  sent_by VARCHAR(100),
  completed_by VARCHAR(100),
  cancelled_by VARCHAR(100),
  
  -- Timestamps
  sent_at TIMESTAMP,
  completed_at TIMESTAMP,
  cancelled_at TIMESTAMP,
  
  -- Export details
  export_format VARCHAR(20) DEFAULT 'excel' CHECK (export_format IN ('excel', 'csv', 'json')),
  export_path TEXT,
  export_url TEXT,
  
  -- CRM integration
  crm_batch_id VARCHAR(100),
  crm_status VARCHAR(50),
  crm_response TEXT,
  
  -- Notes
  notes TEXT,
  cancellation_reason TEXT,
  
  -- Metadata
  metadata JSONB,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- TABLE: lead_batch_items
-- Description: Individual leads in each batch
-- =====================================================
CREATE TABLE lead_batch_items (
  id SERIAL PRIMARY KEY,
  batch_id VARCHAR(100) REFERENCES lead_batches(batch_id) ON DELETE CASCADE,
  tracking_id VARCHAR(50) NOT NULL,
  
  -- Lead snapshot at time of addition
  buyer_code VARCHAR(50),
  offer_id VARCHAR(50),
  customer_name VARCHAR(255),
  customer_phone VARCHAR(50),
  customer_email VARCHAR(255),
  customer_address TEXT,
  customer_country VARCHAR(100),
  
  -- Status in batch
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'removed')),
  
  -- Processing
  processed_at TIMESTAMP,
  processed_by VARCHAR(100),
  rejection_reason TEXT,
  
  -- CRM sync
  crm_lead_id VARCHAR(100),
  crm_sync_status VARCHAR(50),
  crm_sync_at TIMESTAMP,
  
  -- Metadata
  lead_data JSONB,
  
  -- Timestamps
  added_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- INDEXES
-- =====================================================

-- lead_batches indexes
CREATE INDEX idx_lead_batches_batch_id ON lead_batches(batch_id);
CREATE INDEX idx_lead_batches_buyer_code ON lead_batches(buyer_code);
CREATE INDEX idx_lead_batches_offer_id ON lead_batches(offer_id);
CREATE INDEX idx_lead_batches_status ON lead_batches(status);
CREATE INDEX idx_lead_batches_created_at ON lead_batches(created_at DESC);
CREATE INDEX idx_lead_batches_sent_at ON lead_batches(sent_at DESC);

-- lead_batch_items indexes
CREATE INDEX idx_lead_batch_items_batch_id ON lead_batch_items(batch_id);
CREATE INDEX idx_lead_batch_items_tracking_id ON lead_batch_items(tracking_id);
CREATE INDEX idx_lead_batch_items_buyer_code ON lead_batch_items(buyer_code);
CREATE INDEX idx_lead_batch_items_status ON lead_batch_items(status);
CREATE INDEX idx_lead_batch_items_added_at ON lead_batch_items(added_at DESC);

-- =====================================================
-- VIEW: vw_batch_stats
-- Description: Batch statistics overview
-- =====================================================
CREATE VIEW vw_batch_stats AS
SELECT 
  lb.id,
  lb.batch_id,
  lb.batch_name,
  lb.buyer_code,
  b.buyer_name,
  lb.offer_id,
  o.offer_name,
  lb.lead_count,
  lb.status,
  lb.created_by,
  lb.created_at,
  lb.sent_at,
  lb.export_format,
  
  -- Counts from items
  COUNT(lbi.id) AS total_items,
  COUNT(CASE WHEN lbi.status = 'approved' THEN 1 END) AS approved_items,
  COUNT(CASE WHEN lbi.status = 'rejected' THEN 1 END) AS rejected_items,
  COUNT(CASE WHEN lbi.status = 'pending' THEN 1 END) AS pending_items,
  COUNT(CASE WHEN lbi.crm_lead_id IS NOT NULL THEN 1 END) AS synced_items
  
FROM lead_batches lb
LEFT JOIN buyers b ON lb.buyer_code = b.buyer_code
LEFT JOIN offers o ON lb.offer_id = o.offer_id
LEFT JOIN lead_batch_items lbi ON lb.batch_id = lbi.batch_id
GROUP BY 
  lb.id, lb.batch_id, lb.batch_name, lb.buyer_code, b.buyer_name,
  lb.offer_id, o.offer_name, lb.lead_count, lb.status, lb.created_by,
  lb.created_at, lb.sent_at, lb.export_format;

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Trigger to update lead_batches.updated_at
CREATE OR REPLACE FUNCTION update_batch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_updated_at
BEFORE UPDATE ON lead_batches
FOR EACH ROW
EXECUTE FUNCTION update_batch_updated_at();

-- Trigger to update lead_batch_items.updated_at
CREATE TRIGGER trigger_update_batch_item_updated_at
BEFORE UPDATE ON lead_batch_items
FOR EACH ROW
EXECUTE FUNCTION update_batch_updated_at();

-- Trigger to update lead_count when items added/removed
CREATE OR REPLACE FUNCTION update_batch_lead_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE lead_batches 
    SET lead_count = lead_count + 1 
    WHERE batch_id = NEW.batch_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE lead_batches 
    SET lead_count = GREATEST(0, lead_count - 1)
    WHERE batch_id = OLD.batch_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batch_lead_count_insert
AFTER INSERT ON lead_batch_items
FOR EACH ROW
EXECUTE FUNCTION update_batch_lead_count();

CREATE TRIGGER trigger_update_batch_lead_count_delete
AFTER DELETE ON lead_batch_items
FOR EACH ROW
EXECUTE FUNCTION update_batch_lead_count();

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE lead_batches IS 'Lead package/batch management for CRM export';
COMMENT ON COLUMN lead_batches.batch_id IS 'Unique batch identifier (e.g., BATCH_2024_11_09_001)';
COMMENT ON COLUMN lead_batches.status IS 'draft, ready, sent, completed, cancelled';
COMMENT ON COLUMN lead_batches.export_format IS 'excel, csv, json';

COMMENT ON TABLE lead_batch_items IS 'Individual leads within each batch';
COMMENT ON COLUMN lead_batch_items.status IS 'pending, approved, rejected, removed';

COMMENT ON VIEW vw_batch_stats IS 'Batch statistics with buyer/offer names and item counts';

-- =====================================================
-- SAMPLE DATA (for testing)
-- =====================================================

-- Sample batch (will be created via UI)
-- INSERT INTO lead_batches (batch_id, batch_name, buyer_code, offer_id, status, created_by)
-- VALUES ('BATCH_2024_11_09_001', 'November Test Batch', 'BUYER_TEST', 'ESV-FRX-2025', 'draft', 'admin')
-- ON CONFLICT (batch_id) DO NOTHING;

-- =====================================================
-- MIGRATION COMPLETE
-- =====================================================

SELECT 'Migration 002: Package tables created successfully' AS status;
