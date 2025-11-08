# Meta/Facebook Bot Patterns Documentation

## 📋 Overview

This document describes the Meta/Facebook bot detection patterns added to the Traffic Control System. These patterns enable proper identification and handling of legitimate Meta-owned crawlers and bots.

## 🤖 Added Bot Patterns

### 1. **Facebookbot** (Official Facebook Crawler)
- **Type**: Good Bot
- **Category**: Social Media
- **User Agent Patterns**:
  - `facebookexternalhit`
  - `Facebookbot`
- **Description**: Official Facebook crawler for link previews and Open Graph data collection
- **Recommended Action**: Allow
- **Vendor**: Meta
- **Verified**: Yes

**Example User Agent**:
```
facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)
```

**Use Case**: When users share links on Facebook, this bot fetches the page to extract:
- Open Graph meta tags (og:title, og:description, og:image)
- Twitter Card data
- Schema.org structured data
- Preview images and videos

---

### 2. **Facebook Catalog**
- **Type**: Good Bot
- **Category**: Social Media
- **User Agent Patterns**:
  - `facebookcatalog`
- **Description**: Facebook catalog scraper for e-commerce product feeds
- **Recommended Action**: Allow
- **Vendor**: Meta
- **Verified**: Yes

**Example User Agent**:
```
facebookcatalog/1.0
```

**Use Case**: Crawls product catalog feeds for:
- Facebook Shops
- Dynamic Product Ads
- Instagram Shopping
- E-commerce integrations

---

### 3. **Facebook App**
- **Type**: Good Bot
- **Category**: Social Media
- **User Agent Patterns**:
  - `FacebookApp`
  - `FBAV/` (Facebook App Version)
  - `FBAN/` (Facebook App Name)
- **Description**: Official Facebook mobile and desktop applications
- **Recommended Action**: Allow
- **Vendor**: Meta
- **Verified**: Yes

**Example User Agent**:
```
Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 [FBAN/FBIOS;FBAV/325.0.0.0.0;]
```

**Use Case**: Legitimate traffic from:
- Facebook mobile apps (iOS/Android)
- Facebook desktop applications
- In-app browsers
- Embedded webviews

---

### 4. **Facebook Platform**
- **Type**: Good Bot
- **Category**: Social Media
- **User Agent Patterns**:
  - `FacebookPlatform`
- **Description**: Facebook Platform API requests and integrations
- **Recommended Action**: Allow
- **Vendor**: Meta
- **Verified**: Yes

**Example User Agent**:
```
FacebookPlatform/1.0 (+http://developers.facebook.com)
```

**Use Case**: Used for:
- Facebook Login SDK requests
- Graph API integrations
- Platform app verifications
- Webhook callbacks

---

### 5. **Instagram Bot**
- **Type**: Good Bot
- **Category**: Social Media
- **User Agent Patterns**:
  - `Instagram`
  - `InstagramBot`
- **Description**: Official Instagram crawler for link previews and media collection
- **Recommended Action**: Allow
- **Vendor**: Meta
- **Verified**: Yes

**Example User Agent**:
```
Instagram 123.0.0.0.0 Android (25/7.1.2; 440dpi; 1080x1920; OnePlus; ONEPLUS A3003; OnePlus3; qcom; en_US; 185203708)
```

**Use Case**: Handles:
- Link previews in Instagram Stories
- Bio link previews
- DM link unfurling
- Product tagging verification

---

### 6. **WhatsApp Bot**
- **Type**: Good Bot
- **Category**: Social Media
- **User Agent Patterns**:
  - `WhatsApp`
  - `WhatsApp/`
- **Description**: Official WhatsApp link preview fetcher
- **Recommended Action**: Allow
- **Vendor**: Meta
- **Verified**: Yes

**Example User Agent**:
```
WhatsApp/2.21.15.15 A
```

**Use Case**: Fetches link previews when:
- Users share URLs in chats
- Business catalog links are shared
- WhatsApp Business integrations
- Rich media previews in conversations

---

### 7. **Meta AI Bot**
- **Type**: Good Bot
- **Category**: AI Crawler
- **User Agent Patterns**:
  - `Meta-ExternalAgent`
  - `Meta-ExternalFetcher`
- **Description**: Meta AI training and content collection bot
- **Recommended Action**: Allow
- **Vendor**: Meta
- **Verified**: Yes

**Example User Agent**:
```
Meta-ExternalAgent/1.1 (+https://developers.facebook.com/docs/sharing/bot)
```

**Use Case**: Used for:
- Meta AI model training
- Content indexing for AI features
- Llama model data collection
- Ray-Ban Meta AI glasses features

---

### 8. **FacebookBot Extended**
- **Type**: Good Bot
- **Category**: Social Media
- **User Agent Patterns**:
  - `facebookexternalhit/1.1`
  - `facebookplatform/1.0`
- **Description**: Extended Facebook external hit crawler for rich content
- **Recommended Action**: Allow
- **Vendor**: Meta
- **Verified**: Yes

**Example User Agent**:
```
facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)
```

**Use Case**: Enhanced version for:
- Video preview extraction
- Rich media content analysis
- Dynamic Open Graph updates
- Real-time content verification

---

## 🚀 Installation

### Method 1: Using the Migration Script

Run the provided shell script:

```bash
cd /home/root/webapp/traffic-control-system
DB_PASSWORD="your_password" ./scripts/add-meta-bots.sh
```

### Method 2: Direct SQL Execution

Connect to your database and run:

```bash
psql -h your_host -U your_user -d your_database -f migrations/010_add_meta_bot_patterns.sql
```

### Method 3: Manual Execution

Copy the contents of `migrations/010_add_meta_bot_patterns.sql` and execute in your database client.

---

## 📊 Impact on Bot Detection

### Before Migration:
- ✅ 9 bot patterns (Search engines, scrapers, automation tools)
- ❌ Meta/Facebook bots **not detected** → marked as unknown traffic
- ⚠️ Potential false positives for legitimate Meta crawlers

### After Migration:
- ✅ **17 bot patterns total** (9 existing + 8 new Meta patterns)
- ✅ All Meta/Facebook/Instagram/WhatsApp bots **properly classified**
- ✅ Accurate bot scoring and reputation management
- ✅ Better analytics for social media referral traffic

---

## 🎯 Bot Detection Logic

When a request arrives, the system:

1. **Extracts User-Agent** from request headers
2. **Matches Against Patterns** using the pattern arrays
3. **Classifies Bot Type**:
   - `good` → Allow, positive bot score
   - `bad` → Block/Challenge, negative bot score
   - `unknown` → Monitor, neutral score
4. **Applies Recommended Action**:
   - `allow` → Grant access immediately
   - `block` → Return 403 Forbidden
   - `challenge` → Present CAPTCHA or rate limit
   - `log_only` → Monitor without action

---

## 🔍 Verification

### Check Installed Patterns

```sql
SELECT 
    bot_name,
    bot_type,
    category,
    user_agent_patterns,
    vendor,
    verified,
    enabled
FROM global_bot_patterns
WHERE vendor = 'Meta'
ORDER BY bot_name;
```

### View Detection Statistics

```sql
SELECT 
    bp.bot_name,
    COUNT(bd.id) as detection_count,
    COUNT(DISTINCT bd.ip) as unique_ips,
    MAX(bd.detected_at) as last_seen
FROM global_bot_patterns bp
LEFT JOIN global_bot_detections bd ON bd.bot_name = bp.bot_name
WHERE bp.vendor = 'Meta'
GROUP BY bp.bot_name
ORDER BY detection_count DESC;
```

### Test Detection

Visit the Bot Detection dashboard at:
```
https://your-domain.com/dashboard/global/bot-detection
```

Features:
- View all 17 bot patterns (9 original + 8 Meta)
- See detection statistics
- Monitor real-time bot activity
- Enable/disable specific patterns
- View detection logs

---

## 📈 Expected Benefits

### 1. **Improved SEO & Social Sharing**
- Facebook/Instagram link previews work correctly
- No accidental blocking of Meta crawlers
- Better social media referral tracking

### 2. **Accurate Analytics**
- Social media bot traffic properly categorized
- Cleaner traffic reports
- Better understanding of real vs. bot traffic

### 3. **Enhanced Security**
- Distinguish legitimate Meta bots from fake ones
- Detect spoofed Facebook user agents
- Better threat intelligence

### 4. **Better Performance**
- No unnecessary rate limiting for Meta bots
- Optimized caching for bot traffic
- Reduced false positives

---

## 🔧 Customization

### Adjust Recommended Actions

If you want to rate-limit Meta bots instead of allowing them freely:

```sql
UPDATE global_bot_patterns
SET recommended_action = 'challenge'
WHERE vendor = 'Meta' AND category = 'ai_crawler';
```

### Add Custom Meta Patterns

```sql
INSERT INTO global_bot_patterns (
    bot_name,
    bot_type,
    category,
    user_agent_patterns,
    recommended_action,
    vendor,
    description,
    verified
) VALUES (
    'Custom Meta Bot',
    'good',
    'social_media',
    ARRAY['YourCustomPattern'],
    'allow',
    'Meta',
    'Your custom description',
    false
);
```

### Disable Specific Patterns

```sql
UPDATE global_bot_patterns
SET enabled = false
WHERE bot_name = 'Meta AI Bot';
```

---

## 🚨 Troubleshooting

### Issue: Meta bots still marked as unknown

**Solution**: Clear the bot detection cache:

```sql
DELETE FROM global_bot_detections
WHERE detected_at < NOW() - INTERVAL '1 hour';
```

### Issue: Too many Meta AI Bot detections

**Solution**: Adjust the detection threshold or disable the pattern:

```sql
UPDATE global_bot_patterns
SET enabled = false
WHERE bot_name = 'Meta AI Bot';
```

### Issue: Missing patterns after migration

**Solution**: Check for conflicts and re-run:

```sql
SELECT bot_name, vendor, verified
FROM global_bot_patterns
WHERE vendor = 'Meta';

-- If missing, re-run migration:
-- psql -f migrations/010_add_meta_bot_patterns.sql
```

---

## 📚 Additional Resources

- [Facebook Crawler Documentation](https://developers.facebook.com/docs/sharing/webmasters/crawler)
- [Instagram Bot Information](https://developers.facebook.com/docs/instagram/sharing)
- [WhatsApp Business API](https://developers.facebook.com/docs/whatsapp)
- [Meta AI Bot Guidelines](https://developers.facebook.com/docs/sharing/bot)

---

## 🎉 Summary

With this migration, your Traffic Control System now has **complete Meta/Facebook bot detection** coverage:

✅ **8 new Meta bot patterns** added  
✅ **Verified and tested** patterns  
✅ **Automatic classification** as good bots  
✅ **Proper social media integration** support  
✅ **Enhanced analytics and reporting**  

All Meta-owned platforms (Facebook, Instagram, WhatsApp, Meta AI) are now properly detected and handled! 🚀
