-- Migration: Add Meta/Facebook Bot Patterns
-- Description: Add comprehensive Meta/Facebook bot detection patterns
-- Date: 2025-11-06

-- Insert Meta/Facebook Bot Patterns
INSERT INTO global_bot_patterns (
    bot_name, 
    bot_type, 
    category, 
    user_agent_patterns, 
    recommended_action, 
    vendor, 
    description,
    verified
) VALUES
-- Official Facebook Crawlers (Good Bots)
(
    'Facebookbot',
    'good',
    'social_media',
    ARRAY['facebookexternalhit', 'Facebookbot'],
    'allow',
    'Meta',
    'Official Facebook crawler for link previews and Open Graph data collection',
    true
),
(
    'Facebook Catalog',
    'good',
    'social_media',
    ARRAY['facebookcatalog'],
    'allow',
    'Meta',
    'Facebook catalog scraper for e-commerce product feeds',
    true
),
(
    'Facebook App',
    'good',
    'social_media',
    ARRAY['FacebookApp', 'FBAV/', 'FBAN/'],
    'allow',
    'Meta',
    'Official Facebook mobile and desktop applications',
    true
),
(
    'Facebook Platform',
    'good',
    'social_media',
    ARRAY['FacebookPlatform'],
    'allow',
    'Meta',
    'Facebook Platform API requests and integrations',
    true
),

-- Instagram Bots (Good Bots)
(
    'Instagram Bot',
    'good',
    'social_media',
    ARRAY['Instagram', 'InstagramBot'],
    'allow',
    'Meta',
    'Official Instagram crawler for link previews and media collection',
    true
),

-- WhatsApp Bots (Good Bots)
(
    'WhatsApp Bot',
    'good',
    'social_media',
    ARRAY['WhatsApp', 'WhatsApp/'],
    'allow',
    'Meta',
    'Official WhatsApp link preview fetcher',
    true
),

-- Meta AI Bots (Good Bots)
(
    'Meta AI Bot',
    'good',
    'ai_crawler',
    ARRAY['Meta-ExternalAgent', 'Meta-ExternalFetcher'],
    'allow',
    'Meta',
    'Meta AI training and content collection bot',
    true
),
(
    'FacebookBot Extended',
    'good',
    'social_media',
    ARRAY['facebookexternalhit/1.1', 'facebookplatform/1.0'],
    'allow',
    'Meta',
    'Extended Facebook external hit crawler for rich content',
    true
)

ON CONFLICT DO NOTHING;

-- Add index for faster Meta bot detection
CREATE INDEX IF NOT EXISTS idx_bot_patterns_meta_vendor 
ON global_bot_patterns(vendor) 
WHERE vendor = 'Meta';

-- Add comment for documentation
COMMENT ON TABLE global_bot_patterns IS 'Bot detection patterns including Meta/Facebook, Instagram, WhatsApp, and other social media crawlers';
