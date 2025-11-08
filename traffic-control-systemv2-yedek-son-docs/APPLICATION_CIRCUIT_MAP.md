# 🗺️ TRAFFIC CONTROL SYSTEM - TAM UYGULAMA HARİTASI
# Elektronik Devre Şeması Gibi Detaylı Analiz

> **Oluşturma Tarihi:** 2025-11-06  
> **Versiyon:** 1.0.0  
> **Toplam Dosya:** 228 TypeScript/SQL dosyası  
> **Proje Yolu:** `/home/root/webapp/traffic-control-system`

---

## 📋 İÇİNDEKİLER

1. [Genel Mimari Şeması](#genel-mimari-şeması)
2. [Menü Sistemi ve Routing](#menü-sistemi-ve-routing)
3. [Sayfa → API → Database Akışı](#sayfa--api--database-akışı)
4. [Database Tabloları ve İlişkiler](#database-tabloları-ve-ilişkiler)
5. [Component Hiyerarşisi](#component-hiyerarşisi)
6. [Lib Fonksiyonları](#lib-fonksiyonları)
7. [Veri Akış Diyagramları](#veri-akış-diyagramları)
8. [Kod Blokları ve Detaylar](#kod-blokları-ve-detaylar)

---

## 🏗️ GENEL MİMARİ ŞEMASI

```
┌─────────────────────────────────────────────────────────────────────┐
│                      TRAFFIC CONTROL SYSTEM                          │
│                     Next.js 14 App Router                            │
└─────────────────────────────────────────────────────────────────────┘
                                 │
                    ┌────────────┴────────────┐
                    ▼                         ▼
          ┌──────────────────┐      ┌──────────────────┐
          │   CLIENT SIDE    │      │   SERVER SIDE    │
          │   (Browser)      │      │   (Next.js)      │
          └──────────────────┘      └──────────────────┘
                    │                         │
        ┌───────────┼───────────┐            │
        ▼           ▼           ▼            ▼
    ┌──────┐  ┌──────┐  ┌──────┐   ┌────────────────┐
    │Pages │  │Comp. │  │State │   │  API Routes    │
    │.tsx  │  │.tsx  │  │Mgmt  │   │  /app/api/**   │
    └──────┘  └──────┘  └──────┘   └────────────────┘
                                             │
                        ┌────────────────────┼────────────────────┐
                        ▼                    ▼                    ▼
                ┌──────────────┐    ┌──────────────┐    ┌──────────────┐
                │ PostgreSQL   │    │    Redis     │    │  External    │
                │   Database   │    │    Cache     │    │   Services   │
                └──────────────┘    └──────────────┘    └──────────────┘
                        │                                        │
                ┌───────┴────────┐                      ┌───────┴────────┐
                ▼                ▼                      ▼                ▼
        ┌────────────┐   ┌────────────┐       ┌────────────┐   ┌────────────┐
        │  Global    │   │   Domain   │       │   GeoIP    │   │   Email    │
        │  Tables    │   │  Schemas   │       │  Services  │   │   SMTP     │
        └────────────┘   └────────────┘       └────────────┘   └────────────┘
```

---

## 🎛️ MENÜ SİSTEMİ VE ROUTING

### 📍 Sidebar Menü Yapısı
**Dosya:** `components/layout/Sidebar.tsx` (185 satır)

```typescript
┌─────────────────────────────────────────────────────────────────┐
│                        SIDEBAR MENU                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🏠 LOGO & BRANDING                                             │
│  ├─ "Traffic Control" (h1 title)                               │
│  └─ "Advanced Traffic Management" (subtitle)                    │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  📊 TRAFFIC CONTROL (trafficMenuItems)                         │
│  ├─ 🚦 Traffic Overview → /dashboard/traffic/overview          │
│  └─ 🎛️ Master Control → /dashboard/traffic/master [MULTI]     │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  🌐 SITE YÖNETİMİ (siteManagementItems)                        │
│  ├─ 🌐 Siteler → /dashboard/sites                              │
│  ├─ 🚀 Yeni Site Ekle → /dashboard/sites/deploy                │
│  └─ 🗂️ Site Yönetimi → /dashboard/sites/manage                │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  ⚙️ GLOBAL YÖNETİM (globalManagementItems)                     │
│  ├─ 📊 Analytics → /dashboard/analytics [NEW]                  │
│  ├─ 🔍 IP Management → /dashboard/global/ip-management         │
│  ├─ ⚙️ Auto Rules → /dashboard/global/auto-rules              │
│  ├─ 🤖 Bot Detection → /dashboard/global/bot-detection [NEW]   │
│  ├─ 🚫 Spam Control → /dashboard/global/spam-control [NEW]     │
│  ├─ ⏱️ Rate Limiting → /dashboard/settings/rate-limiting [NEW]│
│  ├─ 🌍 GeoIP → /dashboard/settings/geoip [NEW]                 │
│  ├─ 🛠️ System Settings → /dashboard/settings/system           │
│  ├─ 👥 Users → /dashboard/settings/users                       │
│  └─ 🔔 Notifications → /dashboard/settings/notifications       │
│                                                                  │
├─────────────────────────────────────────────────────────────────┤
│  🖥️ SİSTEM BİLGİLERİ (systemInfoItems)                        │
│  ├─ 🌐 Nginx Yönetimi → /dashboard/sites/nginx [YENİ]         │
│  ├─ 🔒 SSL Sertifikaları → /dashboard/sites/ssl               │
│  ├─ ⚙️ PM2 Processes → /dashboard/sites/processes             │
│  └─ 🐛 Debug Bilgileri → /dashboard/sites/debug               │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
         │
         └─ Footer: v1.0.0 - Traffic Control System
```

### 🔌 Route → Component Bağlantıları

```
MENU ITEM                    →    PAGE FILE                              →    API ENDPOINTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📊 Analytics                 →    app/dashboard/analytics/page.tsx       →    /api/global/analytics
                                                                              ├─ ?metric=overview
                                                                              ├─ ?metric=security
                                                                              ├─ ?metric=threats
                                                                              └─ ?metric=geo

🔍 IP Management            →    app/dashboard/global/ip-management/     →    /api/global/ip-management/
                                 page.tsx (34KB, 950 lines)                   ├─ /list
                                                                              ├─ /ban
                                                                              ├─ /update
                                                                              ├─ /details
                                                                              ├─ /bulk
                                                                              └─ /stats

⚙️ Auto Rules               →    app/dashboard/global/auto-rules/        →    /api/global/auto-rules
                                 page.tsx (32KB, 870 lines)                   ├─ GET (list rules)
                                                                              ├─ POST (create rule)
                                                                              ├─ PUT (update rule)
                                                                              ├─ DELETE (delete rule)
                                                                              └─ /triggers (trigger log)

🤖 Bot Detection            →    app/dashboard/global/bot-detection/     →    /api/global/bot-detection/
                                 page.tsx (27KB, 750 lines)                   ├─ /patterns
                                                                              │  ├─ GET (list patterns)
                                                                              │  ├─ POST (create)
                                                                              │  ├─ PUT (update)
                                                                              │  └─ DELETE
                                                                              └─ /detections
                                                                                 └─ GET (detection logs)

🚫 Spam Control             →    app/dashboard/global/spam-control/      →    /api/global/spam-control/
                                 page.tsx (34KB, 950 lines)                   ├─ /patterns
                                                                              │  ├─ GET
                                                                              │  ├─ POST
                                                                              │  ├─ PUT
                                                                              │  └─ DELETE
                                                                              └─ /detections
                                                                                 └─ GET

⏱️ Rate Limiting            →    app/dashboard/settings/rate-limiting/   →    Lib: /lib/rate-limiter.ts
                                 page.tsx (17KB, 480 lines)                   (Frontend configuration only)

🌍 GeoIP                    →    app/dashboard/settings/geoip/           →    /api/geoip/lookup
                                 page.tsx (16KB, 445 lines)                   ├─ GET ?ip=X.X.X.X
                                                                              └─ POST (batch lookup)

🔔 Notifications            →    app/dashboard/settings/notifications/   →    /api/notifications/
                                 page.tsx (42KB, 1180 lines)                  ├─ /channels
                                                                              ├─ /rules
                                                                              └─ /history
```

---

## 🔄 SAYFA → API → DATABASE AKIŞI

### Örnek 1: 🤖 Bot Detection Sistemi

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KULLANICI AKIŞI: Bot Pattern Ekleme                                         │
└──────────────────────────────────────────────────────────────────────────────┘

[1] KULLANICI
    │
    │ Tıklar: "🤖 Bot Detection" menü butonu
    ▼
[2] ROUTER (Next.js)
    │
    │ Route: /dashboard/global/bot-detection
    ▼
[3] PAGE COMPONENT
    📄 app/dashboard/global/bot-detection/page.tsx
    │
    │ ┌─────────────────────────────────────────────────┐
    │ │ useEffect(() => {                               │
    │ │   fetchData()                                    │
    │ │ }, [])                                          │
    │ │                                                  │
    │ │ const fetchPatterns = async () => {             │
    │ │   const response = await fetch(                 │
    │ │     '/api/global/bot-detection/patterns'        │
    │ │   )                                             │
    │ │   const data = await response.json()            │
    │ │   setPatterns(data.data.patterns)              │
    │ │ }                                               │
    │ └─────────────────────────────────────────────────┘
    │
    │ HTTP GET Request
    ▼
[4] API ROUTE
    📄 app/api/global/bot-detection/patterns/route.ts
    │
    │ ┌─────────────────────────────────────────────────┐
    │ │ export async function GET(request) {            │
    │ │   const db = getDatabase()                      │
    │ │   const { searchParams } = new URL(             │
    │ │     request.url                                 │
    │ │   )                                             │
    │ │                                                  │
    │ │   // Build query                                │
    │ │   let query = `                                 │
    │ │     SELECT * FROM global_bot_patterns           │
    │ │     WHERE 1=1                                   │
    │ │   `                                             │
    │ │                                                  │
    │ │   if (botType) {                                │
    │ │     query += ` AND bot_type = $1`              │
    │ │   }                                             │
    │ │                                                  │
    │ │   const result = await db.query(query)         │
    │ │   return NextResponse.json({                    │
    │ │     success: true,                              │
    │ │     data: { patterns: result.rows }            │
    │ │   })                                            │
    │ │ }                                               │
    │ └─────────────────────────────────────────────────┘
    │
    │ SQL Query
    ▼
[5] DATABASE
    🗄️ PostgreSQL: dtektracking database
    │
    │ Table: global_bot_patterns
    │ ┌─────────────────────────────────────────────────┐
    │ │ CREATE TABLE global_bot_patterns (             │
    │ │   id UUID PRIMARY KEY,                         │
    │ │   bot_name VARCHAR(255) NOT NULL,              │
    │ │   bot_type VARCHAR(50),                        │
    │ │   category VARCHAR(100),                       │
    │ │   user_agent_patterns TEXT[],                  │
    │ │   ip_ranges INET[],                            │
    │ │   behavior_signatures JSONB,                   │
    │ │   recommended_action VARCHAR(50),              │
    │ │   vendor VARCHAR(255),                         │
    │ │   description TEXT,                            │
    │ │   verified BOOLEAN DEFAULT false,              │
    │ │   detection_count INTEGER DEFAULT 0,           │
    │ │   last_detected_at TIMESTAMP,                  │
    │ │   enabled BOOLEAN DEFAULT true,                │
    │ │   created_at TIMESTAMP DEFAULT NOW(),          │
    │ │   updated_at TIMESTAMP DEFAULT NOW()           │
    │ │ )                                              │
    │ └─────────────────────────────────────────────────┘
    │
    │ Returns: Array of bot pattern rows
    ▼
[6] API RESPONSE
    │
    │ JSON Response:
    │ {
    │   "success": true,
    │   "data": {
    │     "patterns": [
    │       {
    │         "id": "uuid-1",
    │         "bot_name": "Facebookbot",
    │         "bot_type": "good",
    │         "user_agent_patterns": ["facebookexternalhit", "Facebookbot"],
    │         ...
    │       },
    │       ...
    │     ],
    │     "statistics": {
    │       "total_patterns": 17,
    │       "good_bots": 14,
    │       "bad_bots": 3
    │     }
    │   }
    │ }
    ▼
[7] PAGE COMPONENT (Update State)
    │
    │ ┌─────────────────────────────────────────────────┐
    │ │ setPatterns(data.data.patterns)                │
    │ │ setStatistics(data.data.statistics)            │
    │ └─────────────────────────────────────────────────┘
    │
    │ Re-render with new data
    ▼
[8] UI RENDER
    │
    │ ┌─────────────────────────────────────────────────┐
    │ │  Bot Patterns Table                             │
    │ │  ┌───────────────────────────────────────────┐ │
    │ │  │ Bot Name    | Type | Category | Patterns │ │
    │ │  ├───────────────────────────────────────────┤ │
    │ │  │ Facebookbot | good | social   | 2        │ │
    │ │  │ Instagram   | good | social   | 2        │ │
    │ │  │ ...                                       │ │
    │ │  └───────────────────────────────────────────┘ │
    │ └─────────────────────────────────────────────────┘
    ▼
[9] KULLANICI GÖRÜNTÜLEYİCİ
    ✅ Bot patterns listed successfully!
```

---

### Örnek 2: 📊 Analytics Dashboard

```
┌──────────────────────────────────────────────────────────────────────────────┐
│  KULLANICI AKIŞI: Analytics Overview Görüntüleme                             │
└──────────────────────────────────────────────────────────────────────────────┘

[1] KULLANICI
    │
    │ Tıklar: "📊 Analytics" menü butonu
    ▼
[2] PAGE LOAD
    📄 app/dashboard/analytics/page.tsx (31KB)
    │
    │ ┌─────────────────────────────────────────────────┐
    │ │ // Chart.js imports                             │
    │ │ import { Line, Bar, Doughnut } from             │
    │ │   'react-chartjs-2'                             │
    │ │                                                  │
    │ │ useEffect(() => {                               │
    │ │   fetchAnalytics('overview', '24h')            │
    │ │ }, [activeTab, timeRange])                     │
    │ └─────────────────────────────────────────────────┘
    │
    │ Fetch data for each metric type
    ▼
[3] API CALL
    📄 /api/global/analytics?metric=overview&time_range=24h
    │
    │ Handles 5 metric types:
    │ ├─ overview  (traffic stats)
    │ ├─ security  (attack patterns)
    │ ├─ performance (response times)
    │ ├─ geo       (geographic data)
    │ └─ threats   (threat analysis)
    ▼
[4] API ROUTE HANDLER
    📄 app/api/global/analytics/route.ts (10KB)
    │
    │ ┌─────────────────────────────────────────────────┐
    │ │ export async function GET(request) {            │
    │ │   const { searchParams } = new URL(request.url) │
    │ │   const metric = searchParams.get('metric')     │
    │ │   const timeRange = searchParams.get(           │
    │ │     'time_range'                                │
    │ │   ) || '24h'                                    │
    │ │                                                  │
    │ │   switch(metric) {                              │
    │ │     case 'overview':                            │
    │ │       return handleOverviewMetrics()            │
    │ │     case 'security':                            │
    │ │       return handleSecurityMetrics()            │
    │ │     ...                                         │
    │ │   }                                             │
    │ │ }                                               │
    │ │                                                  │
    │ │ async function handleOverviewMetrics() {        │
    │ │   const db = getDatabase()                      │
    │ │                                                  │
    │ │   // Query 1: Total requests                    │
    │ │   const totalRequests = await db.query(`        │
    │ │     SELECT COUNT(*) FROM                        │
    │ │       global_ip_activity                        │
    │ │     WHERE timestamp >= NOW() - INTERVAL '24h'   │
    │ │   `)                                            │
    │ │                                                  │
    │ │   // Query 2: Blocked requests                  │
    │ │   const blockedRequests = await db.query(`      │
    │ │     SELECT COUNT(*) FROM                        │
    │ │       global_ip_activity                        │
    │ │     WHERE blocked = true                        │
    │ │       AND timestamp >= NOW() - INTERVAL '24h'   │
    │ │   `)                                            │
    │ │                                                  │
    │ │   // Query 3: Hourly traffic                    │
    │ │   const hourlyTraffic = await db.query(`        │
    │ │     SELECT                                      │
    │ │       date_trunc('hour', timestamp) as hour,    │
    │ │       COUNT(*) as requests                      │
    │ │     FROM global_ip_activity                     │
    │ │     WHERE timestamp >= NOW() - INTERVAL '24h'   │
    │ │     GROUP BY hour                               │
    │ │     ORDER BY hour                               │
    │ │   `)                                            │
    │ │                                                  │
    │ │   return {                                      │
    │ │     total_requests: totalRequests.rows[0].count,│
    │ │     blocked_requests: blockedRequests.rows[0].  │
    │ │       count,                                    │
    │ │     hourly_data: hourlyTraffic.rows            │
    │ │   }                                             │
    │ │ }                                               │
    │ └─────────────────────────────────────────────────┘
    │
    │ Multiple database queries
    ▼
[5] DATABASE QUERIES
    🗄️ PostgreSQL
    │
    │ Tables used:
    │ ├─ global_ip_activity (traffic logs)
    │ ├─ global_ip_reputation (IP scores)
    │ ├─ global_bot_detections (bot activity)
    │ └─ global_spam_detections (spam activity)
    │
    │ Example Query Results:
    │ {
    │   total_requests: 125847,
    │   blocked_requests: 3421,
    │   hourly_data: [
    │     { hour: '2025-11-06 00:00', requests: 5234 },
    │     { hour: '2025-11-06 01:00', requests: 4892 },
    │     ...
    │   ]
    │ }
    ▼
[6] RESPONSE TO CLIENT
    │
    │ JSON Format:
    │ {
    │   "success": true,
    │   "data": {
    │     "overview": {
    │       "total_requests": 125847,
    │       "blocked_requests": 3421,
    │       "bot_requests": 15234,
    │       "spam_detected": 892,
    │       "hourly_data": [...],
    │       "top_countries": [...],
    │       "top_blocked_ips": [...]
    │     }
    │   },
    │   "timestamp": "2025-11-06T17:30:00Z"
    │ }
    ▼
[7] CHART RENDERING
    📊 react-chartjs-2 Component
    │
    │ ┌─────────────────────────────────────────────────┐
    │ │ const chartData = {                             │
    │ │   labels: data.hourly_data.map(d => d.hour),   │
    │ │   datasets: [{                                  │
    │ │     label: 'Total Requests',                    │
    │ │     data: data.hourly_data.map(d => d.requests),│
    │ │     borderColor: 'rgb(75, 192, 192)',          │
    │ │     backgroundColor: 'rgba(75, 192, 192, 0.2)',│
    │ │     fill: true                                  │
    │ │   }]                                            │
    │ │ }                                               │
    │ │                                                  │
    │ │ <Line data={chartData} options={chartOptions} />│
    │ └─────────────────────────────────────────────────┘
    │
    │ Renders interactive chart
    ▼
[8] UI DISPLAY
    │
    │ ┌─────────────────────────────────────────────────┐
    │ │  Analytics Dashboard                            │
    │ │  ┌─────────────────────────────────────────┐   │
    │ │  │ [Overview] [Security] [Threats] [Geo]   │   │
    │ │  ├─────────────────────────────────────────┤   │
    │ │  │                                         │   │
    │ │  │  📈 Traffic Trend (24h)                │   │
    │ │  │  ╭─────────────────────────────────╮   │   │
    │ │  │  │        Chart.js Line Chart       │   │   │
    │ │  │  │  /\    /\      /\               │   │   │
    │ │  │  │ /  \  /  \    /  \              │   │   │
    │ │  │  │/    \/    \  /    \             │   │   │
    │ │  │  ╰─────────────────────────────────╯   │   │
    │ │  │                                         │   │
    │ │  │  📊 Statistics                         │   │
    │ │  │  ├─ Total: 125,847 requests           │   │
    │ │  │  ├─ Blocked: 3,421 (2.7%)             │   │
    │ │  │  └─ Bots: 15,234 (12.1%)              │   │
    │ │  └─────────────────────────────────────────┘   │
    │ └─────────────────────────────────────────────────┘
    ▼
[9] USER INTERACTION
    ✅ User can:
    - Switch tabs (Overview/Security/Threats/Geo)
    - Change time range (24h/7d/30d)
    - Hover over charts for details
    - Export data
```

---

## 🗄️ DATABASE TABLOLARI VE İLİŞKİLER

### Migration Geçmişi ve Tablo Oluşturma Sırası

```
Migration Timeline:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

001_traffic_control_tables.sql (16KB)
  └─ Creates: ip_tracking, traffic_rules, rule_triggers
     Core traffic monitoring tables

006_create_sites_tables.sql (3.4KB)
  └─ Creates: sites, site_versions, site_logs
     Website deployment management

007_multi_domain_support.sql (7.1KB)
  └─ Creates: master_domains, master_traffic_log,
              domain_traffic_stats, domain_auto_rules
     Multi-domain traffic control

008_global_management_tables.sql (21KB) ⭐
  └─ Creates: global_ip_reputation, global_ip_activity,
              global_auto_rules, global_rule_triggers,
              global_bot_patterns, global_bot_detections,
              global_spam_patterns, global_spam_detections
     Advanced security features

009_notification_settings.sql (8.6KB)
  └─ Creates: notification_channels, notification_rules,
              notification_history, notification_templates,
              notification_throttle, disposable_email_domains
     Alert system

010_add_meta_bot_patterns.sql (2.4KB)
  └─ Inserts: 8 Meta/Facebook bot patterns
     Social media bot detection
```

### 🔗 Tablo İlişki Diyagramı

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                         GLOBAL MANAGEMENT TABLES                                 │
│                      (Tüm Domain'ler için ortak)                                │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│ global_ip_reputation     │◄────────│  global_ip_activity      │
│ ─────────────────────────│   1:N   │ ─────────────────────────│
│ • ip (PK)                │         │ • id (PK)                │
│ • reputation_score       │         │ • ip (FK) ───────────────┤
│ • category               │         │ • domain                 │
│ • total_visits           │         │ • path                   │
│ • blocked_count          │         │ • user_agent             │
│ • attack_count           │         │ • timestamp              │
│ • last_activity          │         │ • blocked                │
│ • risk_factors           │         │ • action_taken           │
│ • is_banned              │         │ • bot_score              │
│ • notes                  │         │ • spam_score             │
└──────────────────────────┘         └──────────────────────────┘
         │                                      │
         │                                      │
         │                                      └──────────────┐
         │                                                     │
         ▼                                                     ▼
┌──────────────────────────┐         ┌──────────────────────────┐
│ global_auto_rules        │         │ global_bot_detections    │
│ ─────────────────────────│         │ ─────────────────────────│
│ • id (PK)                │         │ • id (PK)                │
│ • rule_name              │         │ • ip                     │
│ • rule_type              │         │ • domain                 │
│ • conditions             │         │ • user_agent             │
│ • actions                │         │ • is_bot                 │
│ • priority               │         │ • bot_name               │
│ • enabled                │         │ • bot_type               │
│ • trigger_count          │         │ • bot_score              │
└──────────────────────────┘         │ • detection_method       │
         │                            │ • blocked                │
         │                            │ • detected_at            │
         │ 1:N                        └──────────────────────────┘
         ▼                                      │
┌──────────────────────────┐                   │
│ global_rule_triggers     │                   │ N:1
│ ─────────────────────────│                   │
│ • id (PK)                │                   ▼
│ • rule_id (FK)           │         ┌──────────────────────────┐
│ • ip                     │         │ global_bot_patterns      │
│ • domain                 │         │ ─────────────────────────│
│ • action_taken           │         │ • id (PK)                │
│ • triggered_at           │         │ • bot_name (UNIQUE)      │
└──────────────────────────┘         │ • bot_type               │
                                      │ • category               │
┌──────────────────────────┐         │ • user_agent_patterns    │
│ global_spam_detections   │         │ • ip_ranges              │
│ ─────────────────────────│         │ • behavior_signatures    │
│ • id (PK)                │         │ • recommended_action     │
│ • ip                     │         │ • vendor                 │
│ • domain                 │         │ • verified               │
│ • content_type           │         │ • detection_count        │
│ • spam_score             │         │ • enabled                │
│ • matched_patterns       │         └──────────────────────────┘
│ • blocked                │
│ • detected_at            │         ┌──────────────────────────┐
└──────────────────────────┘         │ global_spam_patterns     │
         │                            │ ─────────────────────────│
         │ N:1                        │ • id (PK)                │
         └────────────────────────────┤ • pattern_name           │
                                      │ • pattern_type           │
                                      │ • pattern_value          │
                                      │ • is_regex               │
                                      │ • severity               │
                                      │ • category               │
                                      │ • action                 │
                                      │ • enabled                │
                                      │ • detection_count        │
                                      └──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         NOTIFICATION SYSTEM TABLES                               │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│ notification_channels    │         │ notification_rules       │
│ ─────────────────────────│         │ ─────────────────────────│
│ • id (PK)                │         │ • id (PK)                │
│ • channel_name           │         │ • rule_name              │
│ • channel_type           │◄────────│ • channel_id (FK)        │
│   - email                │   1:N   │ • event_type             │
│   - slack                │         │ • conditions             │
│   - webhook              │         │ • throttle_minutes       │
│   - telegram             │         │ • enabled                │
│ • config (JSONB)         │         └──────────────────────────┘
│ • enabled                │                    │
│ • total_sent             │                    │ 1:N
│ • total_failed           │                    ▼
└──────────────────────────┘         ┌──────────────────────────┐
                                      │ notification_history     │
┌──────────────────────────┐         │ ─────────────────────────│
│ notification_templates   │         │ • id (PK)                │
│ ─────────────────────────│         │ • rule_id (FK)           │
│ • id (PK)                │         │ • channel_id (FK)        │
│ • template_name          │         │ • event_type             │
│ • event_type             │         │ • sent_at                │
│ • subject_template       │         │ • success                │
│ • body_template          │         │ • response               │
│ • is_html                │         └──────────────────────────┘
└──────────────────────────┘

┌──────────────────────────┐
│ notification_throttle    │
│ ─────────────────────────│
│ • id (PK)                │
│ • rule_id (FK)           │
│ • identifier             │
│ • last_sent              │
└──────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────────────┐
│                         SITE MANAGEMENT TABLES                                   │
└─────────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────┐         ┌──────────────────────────┐
│ sites                    │         │ site_versions            │
│ ─────────────────────────│         │ ─────────────────────────│
│ • id (PK)                │◄────────│ • id (PK)                │
│ • site_name              │   1:N   │ • site_id (FK)           │
│ • domain                 │         │ • version_number         │
│ • description            │         │ • changes_description    │
│ • template_type          │         │ • deployed_at            │
│ • nginx_config_path      │         │ • deployed_by            │
│ • ssl_enabled            │         └──────────────────────────┘
│ • ssl_cert_path          │
│ • status                 │         ┌──────────────────────────┐
│ • deployment_date        │         │ site_logs                │
│ • last_updated           │◄────────│ ─────────────────────────│
└──────────────────────────┘   1:N   │ • id (PK)                │
                                      │ • site_id (FK)           │
                                      │ • action                 │
                                      │ • details                │
                                      │ • performed_by           │
                                      │ • created_at             │
                                      └──────────────────────────┘
```

### 📊 Tablo İstatistikleri ve Kullanım

```
┌────────────────────────────────────────────────────────────────────┐
│  TABLO ADI                    │ BOYUT │ AMAÇ                      │
├────────────────────────────────────────────────────────────────────┤
│ global_ip_reputation           │ Large │ IP skorlama ve sınıflandırma │
│ global_ip_activity             │ Huge  │ Tüm trafik logları         │
│ global_auto_rules              │ Small │ Otomatik güvenlik kuralları│
│ global_rule_triggers           │ Large │ Kural tetikleme geçmişi    │
│ global_bot_patterns            │ Small │ Bot tanıma pattern'leri    │
│ global_bot_detections          │ Large │ Bot tespit logları         │
│ global_spam_patterns           │ Small │ Spam pattern'leri          │
│ global_spam_detections         │ Large │ Spam tespit logları        │
│ notification_channels          │ Tiny  │ Bildirim kanalları         │
│ notification_rules             │ Small │ Bildirim kuralları         │
│ notification_history           │ Medium│ Gönderilen bildirimler     │
│ notification_templates         │ Tiny  │ Email/mesaj şablonları     │
│ notification_throttle          │ Small │ Bildirim rate limiting     │
│ sites                          │ Small │ Deployed siteler           │
│ site_versions                  │ Medium│ Site versiyon geçmişi      │
│ site_logs                      │ Medium│ Site işlem logları         │
└────────────────────────────────────────────────────────────────────┘

Boyut Kategorileri:
- Tiny: < 100 rows
- Small: 100-1,000 rows
- Medium: 1,000-100,000 rows
- Large: 100,000-1M rows
- Huge: > 1M rows
```

---

## 🧩 COMPONENT HİYERARŞİSİ

```
app/
│
├── layout.tsx (Root Layout)
│   │
│   ├── Header
│   │   ├── Logo
│   │   ├── SearchBar
│   │   └── UserMenu
│   │       ├── ProfileDropdown
│   │       └── NotificationBell
│   │
│   ├── Sidebar ⭐ (components/layout/Sidebar.tsx)
│   │   │
│   │   ├── MenuSection: Traffic Control
│   │   │   ├── MenuItem: Traffic Overview
│   │   │   └── MenuItem: Master Control
│   │   │
│   │   ├── MenuSection: Site Yönetimi
│   │   │   ├── MenuItem: Siteler
│   │   │   ├── MenuItem: Yeni Site Ekle
│   │   │   └── MenuItem: Site Yönetimi
│   │   │
│   │   ├── MenuSection: Global Yönetim
│   │   │   ├── MenuItem: Analytics (NEW)
│   │   │   ├── MenuItem: IP Management
│   │   │   ├── MenuItem: Auto Rules
│   │   │   ├── MenuItem: Bot Detection (NEW)
│   │   │   ├── MenuItem: Spam Control (NEW)
│   │   │   ├── MenuItem: Rate Limiting (NEW)
│   │   │   ├── MenuItem: GeoIP (NEW)
│   │   │   ├── MenuItem: System Settings
│   │   │   ├── MenuItem: Users
│   │   │   └── MenuItem: Notifications
│   │   │
│   │   └── MenuSection: Sistem Bilgileri
│   │       ├── MenuItem: Nginx Yönetimi
│   │       ├── MenuItem: SSL Sertifikaları
│   │       ├── MenuItem: PM2 Processes
│   │       └── MenuItem: Debug Bilgileri
│   │
│   └── Main Content Area
│       └── {children} (Dynamic page content)
│
├── dashboard/
│   │
│   ├── analytics/page.tsx
│   │   ├── TabNavigation
│   │   │   ├── Overview Tab
│   │   │   ├── Security Tab
│   │   │   ├── Threats Tab
│   │   │   └── Geographic Tab
│   │   │
│   │   ├── TimeRangeSelector
│   │   │   ├── 24 Hours
│   │   │   ├── 7 Days
│   │   │   └── 30 Days
│   │   │
│   │   └── ChartComponents
│   │       ├── LineChart (react-chartjs-2)
│   │       │   └── Traffic Trend Over Time
│   │       │
│   │       ├── BarChart
│   │       │   └── Requests by Country
│   │       │
│   │       └── DoughnutChart
│   │           └── Request Type Distribution
│   │
│   ├── global/
│   │   │
│   │   ├── ip-management/page.tsx
│   │   │   ├── StatsCards
│   │   │   │   ├── Total IPs
│   │   │   │   ├── Banned IPs
│   │   │   │   ├── Whitelisted
│   │   │   │   └── Monitored
│   │   │   │
│   │   │   ├── SearchAndFilters
│   │   │   │   ├── IP Search Input
│   │   │   │   ├── Category Filter
│   │   │   │   ├── Status Filter
│   │   │   │   └── Date Range Picker
│   │   │   │
│   │   │   ├── IPTable
│   │   │   │   ├── TableHeader
│   │   │   │   ├── TableRows
│   │   │   │   │   ├── IP Column
│   │   │   │   │   ├── Reputation Score (0-100)
│   │   │   │   │   ├── Category Badge
│   │   │   │   │   ├── Last Activity
│   │   │   │   │   └── Actions
│   │   │   │   │       ├── View Details
│   │   │   │   │       ├── Ban IP
│   │   │   │   │       └── Whitelist
│   │   │   │   └── Pagination
│   │   │   │
│   │   │   └── IPDetailsModal
│   │   │       ├── GeoIP Info
│   │   │       ├── Activity Timeline
│   │   │       ├── Bot Detection History
│   │   │       ├── Spam Detection History
│   │   │       └── Action Buttons
│   │   │
│   │   ├── auto-rules/page.tsx
│   │   │   ├── RulesList
│   │   │   │   ├── RuleCard
│   │   │   │   │   ├── Rule Name
│   │   │   │   │   ├── Rule Type Badge
│   │   │   │   │   ├── Priority Indicator
│   │   │   │   │   ├── Trigger Count
│   │   │   │   │   ├── Enable/Disable Toggle
│   │   │   │   │   └── Edit/Delete Actions
│   │   │   │   └── AddRuleButton
│   │   │   │
│   │   │   ├── RuleFormModal
│   │   │   │   ├── Rule Name Input
│   │   │   │   ├── Rule Type Select
│   │   │   │   │   ├── rate_limit
│   │   │   │   │   ├── ip_reputation
│   │   │   │   │   ├─ geo_block
│   │   │   │   │   ├── bot_detection
│   │   │   │   │   ├── spam_filter
│   │   │   │   │   └── custom
│   │   │   │   ├── Conditions (JSONB)
│   │   │   │   ├── Actions (JSONB)
│   │   │   │   ├── Priority Slider (1-10)
│   │   │   │   └── Save/Cancel
│   │   │   │
│   │   │   └── TriggerLogTab
│   │   │       └── TriggerTable (Recent activations)
│   │   │
│   │   ├── bot-detection/page.tsx
│   │   │   ├── TabNavigation
│   │   │   │   ├── Bot Patterns Tab
│   │   │   │   └── Detection Logs Tab
│   │   │   │
│   │   │   ├── StatisticsCards
│   │   │   │   ├── Total Patterns
│   │   │   │   ├── Good Bots
│   │   │   │   ├── Bad Bots
│   │   │   │   └── Verified Patterns
│   │   │   │
│   │   │   ├── BotPatternsTable
│   │   │   │   ├── Bot Name
│   │   │   │   ├── Type Badge (good/bad/unknown)
│   │   │   │   ├── Category
│   │   │   │   ├── Vendor
│   │   │   │   ├── User Agent Patterns (array)
│   │   │   │   ├── Detection Count
│   │   │   │   ├── Verified Checkmark
│   │   │   │   └── Actions
│   │   │   │       ├── Edit
│   │   │   │       ├── Delete
│   │   │   │       └── Enable/Disable
│   │   │   │
│   │   │   ├── PatternFormModal
│   │   │   │   ├── Bot Name Input
│   │   │   │   ├── Bot Type Select
│   │   │   │   ├── Category Input
│   │   │   │   ├── User Agent Patterns (textarea)
│   │   │   │   ├── IP Ranges (textarea)
│   │   │   │   ├── Recommended Action
│   │   │   │   ├── Vendor Input
│   │   │   │   ├── Verified Checkbox
│   │   │   │   └── Save/Cancel
│   │   │   │
│   │   │   └── DetectionLogsTab
│   │   │       └── DetectionTable
│   │   │           ├── Timestamp
│   │   │           ├── IP Address
│   │   │           ├── Bot Name
│   │   │           ├── Bot Type
│   │   │           ├── Bot Score
│   │   │           ├── Detection Method
│   │   │           └── Action Taken
│   │   │
│   │   └── spam-control/page.tsx
│   │       ├── TabNavigation
│   │       │   ├── Spam Patterns Tab
│   │       │   └── Detection Logs Tab
│   │       │
│   │       ├── StatsCards
│   │       │   ├── Total Patterns
│   │       │   ├── Active Patterns
│   │       │   ├── Detections (24h)
│   │       │   └── Blocked (24h)
│   │       │
│   │       ├── SpamPatternsTable
│   │       │   ├── Pattern Name
│   │       │   ├── Type (keyword/email/url/hash/behavior)
│   │       │   ├── Pattern Value
│   │       │   ├── Severity (1-10) with color
│   │       │   ├── Category
│   │       │   ├── Action (flag/block/quarantine/log)
│   │       │   ├── Detection Count
│   │       │   └── Actions (Edit/Delete/Toggle)
│   │       │
│   │       └── DetectionLogsTab
│   │           └── Shows spam detections with matched patterns
│   │
│   └── settings/
│       │
│       ├── notifications/page.tsx
│       │   ├── TabNavigation
│       │   │   ├── Channels Tab
│       │   │   ├── Rules Tab
│       │   │   └── History Tab
│       │   │
│       │   ├── ChannelsTab
│       │   │   ├── ChannelsList
│       │   │   │   └── ChannelCard
│       │   │   │       ├── Channel Name
│       │   │   │       ├── Type Icon (email/slack/webhook)
│       │   │   │       ├── Status Badge
│       │   │   │       ├── Sent Count
│       │   │   │       ├── Failed Count
│       │   │   │       └── Actions
│       │   │   │
│       │   │   └── ChannelFormModal
│       │   │       ├── Channel Name
│       │   │       ├── Channel Type Select
│       │   │       ├── Configuration (JSONB)
│       │   │       │   ├── SMTP Settings (for email)
│       │   │       │   ├── Webhook URL (for webhook)
│       │   │       │   └── API Keys (for slack/telegram)
│       │   │       └── Save/Test
│       │   │
│       │   ├── RulesTab
│       │   │   ├── RulesList
│       │   │   │   └── RuleCard
│       │   │   │       ├── Rule Name
│       │   │   │       ├── Event Type
│       │   │   │       ├── Channel
│       │   │   │       ├── Throttle Minutes
│       │   │   │       └── Enable/Disable
│       │   │   │
│       │   │   └── RuleFormModal
│       │   │       ├── Rule Name
│       │   │       ├── Channel Select
│       │   │       ├── Event Type Select
│       │   │       │   ├── ip_banned
│       │   │       │   ├── high_risk_detected
│       │   │       │   ├── attack_detected
│       │   │       │   └── spam_threshold_exceeded
│       │   │       ├── Conditions (JSONB)
│       │   │       ├── Throttle Minutes
│       │   │       └── Save
│       │   │
│       │   └── HistoryTab
│       │       └── HistoryTable
│       │           ├── Timestamp
│       │           ├── Rule Name
│       │           ├── Channel
│       │           ├── Event Type
│       │           ├── Success/Failure
│       │           └── Response
│       │
│       ├── geoip/page.tsx
│       │   ├── ConfigurationForm
│       │   │   ├── Provider Select
│       │   │   │   ├── IPinfo.io
│       │   │   │   └── IP-API.com
│       │   │   ├── API Key Input
│       │   │   ├── Cache TTL
│       │   │   └── Save Settings
│       │   │
│       │   └── TestSection
│       │       ├── IP Input
│       │       ├── "My IP" Button
│       │       ├── Test Button
│       │       └── Results Display
│       │           ├── Country
│       │           ├── City
│       │           ├── ISP
│       │           ├── VPN/Proxy/Tor Flags
│       │           └── Coordinates
│       │
│       └── rate-limiting/page.tsx
│           ├── StrategyExplanation
│           │   ├── Fixed Window
│           │   ├── Sliding Window
│           │   └── Token Bucket
│           │
│           ├── ConfigurationTable
│           │   └── Preset Configs
│           │       ├── Strict (10 req/min)
│           │       ├── Standard (100 req/min)
│           │       ├── Relaxed (300 req/min)
│           │       └── Per Second (10 req/sec)
│           │
│           └── ImplementationGuide
│               └── Code Examples
│
└── api/ (All API Routes)
    ├── global/
    │   ├── analytics/route.ts
    │   ├── auto-rules/route.ts
    │   ├── auto-rules/triggers/route.ts
    │   ├── bot-detection/patterns/route.ts
    │   ├── bot-detection/detections/route.ts
    │   ├── spam-control/patterns/route.ts
    │   ├── spam-control/detections/route.ts
    │   ├── ip-management/list/route.ts
    │   ├── ip-management/ban/route.ts
    │   ├── ip-management/update/route.ts
    │   ├── ip-management/details/route.ts
    │   └── ip-management/stats/route.ts
    │
    ├── notifications/
    │   ├── channels/route.ts
    │   ├── rules/route.ts
    │   └── history/route.ts
    │
    └── geoip/
        └── lookup/route.ts
```

---

## ⚙️ LIB FONKSİYONLARI VE KULLANIM

### 📚 Lib Modülleri Detayı

```
lib/
├── db.ts (2.6KB)
│   └── Database Connection Singleton
│       ├── class Database
│       │   ├── constructor() - Initialize pool
│       │   ├── query(sql, params) - Execute query
│       │   ├── getClient() - Get client from pool
│       │   └── close() - Close connection
│       │
│       └── export getDatabase() - Get instance
│
├── geoip.ts (8.3KB) ⭐
│   └── GeoIP Lookup with Multi-Provider Support
│       ├── interface GeoIPResult
│       │   ├── ip: string
│       │   ├── country?: string
│       │   ├── countryCode?: string
│       │   ├── city?: string
│       │   ├── latitude?: number
│       │   ├── longitude?: number
│       │   ├── isp?: string
│       │   ├── isVPN?: boolean
│       │   ├── isProxy?: boolean
│       │   ├── isTor?: boolean
│       │   └── source: 'ipinfo' | 'ipapi' | 'cache'
│       │
│       ├── lookupGeoIP(ip: string): Promise<GeoIPResult>
│       │   └── Primary: IPinfo.io, Fallback: IP-API.com
│       │
│       ├── lookupGeoIPBatch(ips: string[]): Promise<Map<string, GeoIPResult>>
│       │   └── Batch lookup with concurrency control
│       │
│       └── In-Memory Cache (24h TTL)
│
├── rate-limiter.ts (9.7KB) ⭐
│   └── Advanced Rate Limiting
│       ├── interface RateLimitOptions
│       │   ├── maxRequests: number
│       │   ├── windowMs: number
│       │   ├── strategy?: 'fixed-window' | 'sliding-window' | 'token-bucket'
│       │   ├── keyPrefix?: string
│       │   ├── skip?: (request) => boolean
│       │   ├── keyGenerator?: (request) => string
│       │   └── handler?: (request, retryAfter) => NextResponse
│       │
│       ├── RateLimitPresets
│       │   ├── strict: { maxRequests: 10, windowMs: 60000 }
│       │   ├── standard: { maxRequests: 100, windowMs: 60000 }
│       │   ├── relaxed: { maxRequests: 300, windowMs: 60000 }
│       │   └── perSecond: { maxRequests: 10, windowMs: 1000 }
│       │
│       ├── class InMemoryStore
│       │   ├── increment(key: string): Promise<number>
│       │   ├── decrement(key: string): Promise<void>
│       │   └── reset(key: string): Promise<void>
│       │
│       └── createRateLimiter(options): RateLimiter
│           ├── check(request): Promise<RateLimitResult>
│           └── Strategies:
│               ├── Fixed Window: Simple counter reset
│               ├── Sliding Window: Time-based sliding
│               └── Token Bucket: Gradual token refill
│
├── redis.ts (1.9KB)
│   └── Redis Client Wrapper
│       ├── class RedisClient
│       │   ├── connect()
│       │   ├── disconnect()
│       │   ├── get(key)
│       │   ├── set(key, value, ttl)
│       │   ├── del(key)
│       │   └── incr(key)
│       │
│       └── export getRedisClient()
│
├── nginx-generator.ts (14KB)
│   └── Nginx Configuration Generator
│       ├── interface NginxConfig
│       │   ├── domain: string
│       │   ├── port: number
│       │   ├── ssl_enabled: boolean
│       │   ├── ssl_cert_path?: string
│       │   ├── ssl_key_path?: string
│       │   ├── proxy_pass?: string
│       │   └── custom_config?: string
│       │
│       ├── generateNginxConfig(config: NginxConfig): string
│       │   └── Returns complete nginx conf file
│       │
│       ├── writeNginxConfig(domain: string, config: string): Promise<void>
│       │   └── Writes to /etc/nginx/sites-available/
│       │
│       └── reloadNginx(): Promise<void>
│           └── Executes: nginx -t && systemctl reload nginx
│
├── ssl-manager.ts (12KB)
│   └── SSL Certificate Management
│       ├── interface SSLCertificate
│       │   ├── domain: string
│       │   ├── cert_path: string
│       │   ├── key_path: string
│       │   ├── issuer: string
│       │   ├── valid_from: Date
│       │   ├── valid_to: Date
│       │   └── auto_renew: boolean
│       │
│       ├── generateSSL(domain: string): Promise<SSLCertificate>
│       │   └── Uses Let's Encrypt / Certbot
│       │
│       ├── renewSSL(domain: string): Promise<void>
│       │   └── Renews expired certificates
│       │
│       └── listSSLCertificates(): Promise<SSLCertificate[]>
│
├── pm2-manager.ts (11KB)
│   └── PM2 Process Management
│       ├── interface PM2Process
│       │   ├── pid: number
│       │   ├── name: string
│       │   ├── pm_id: number
│       │   ├── monit: { memory: number, cpu: number }
│       │   ├── pm2_env: { status: string, restart_time: number }
│       │   └── created_at: Date
│       │
│       ├── startProcess(config: PM2ProcessConfig): Promise<void>
│       ├── stopProcess(name: string): Promise<void>
│       ├── restartProcess(name: string): Promise<void>
│       ├── deleteProcess(name: string): Promise<void>
│       └── listProcesses(): Promise<PM2Process[]>
│
└── html-injector.ts (3.5KB)
    └── Tracking Script Injection
        ├── injectTrackingScript(html: string, domain: string): string
        │   └── Injects <script> tag with tracking code
        │
        └── generateTrackingScript(domain: string): string
            └── Returns JS tracking code
```

### 🔗 Lib Usage Map

```
┌────────────────────────────────────────────────────────────────────┐
│  LIB MODULE          │  USED BY                                    │
├────────────────────────────────────────────────────────────────────┤
│ db.ts                │ • All API routes                            │
│                      │ • Server-side pages                         │
│                      │ • Background jobs                           │
├────────────────────────────────────────────────────────────────────┤
│ geoip.ts             │ • /api/geoip/lookup/route.ts               │
│                      │ • /api/global/ip-management/details/route.ts│
│                      │ • /api/global/analytics/route.ts (geo data) │
├────────────────────────────────────────────────────────────────────┤
│ rate-limiter.ts      │ • /api/example-rate-limited/route.ts       │
│                      │ • Can be used in any API route              │
│                      │ • Middleware integration possible           │
├────────────────────────────────────────────────────────────────────┤
│ redis.ts             │ • rate-limiter.ts (store backend)          │
│                      │ • Session management (future)               │
│                      │ • Cache layer (future)                      │
├────────────────────────────────────────────────────────────────────┤
│ nginx-generator.ts   │ • /api/sites/deploy/route.ts               │
│                      │ • /api/sites/nginx/route.ts                │
│                      │ • Site deployment workflow                  │
├────────────────────────────────────────────────────────────────────┤
│ ssl-manager.ts       │ • /api/sites/ssl/route.ts                  │
│                      │ • Auto SSL renewal jobs                     │
│                      │ • Deployment workflow                       │
├────────────────────────────────────────────────────────────────────┤
│ pm2-manager.ts       │ • /api/sites/processes/route.ts            │
│                      │ • Site deployment (start/stop services)     │
│                      │ • Health monitoring                         │
└────────────────────────────────────────────────────────────────────┘
```

---

## 🔄 VERI AKIŞ DİYAGRAMLARI

### Senaryo 1: IP Ban İşlemi

```
USER ACTION: Ban IP Button Click
│
├─ [1] Frontend Event
│   └─ onClick handler in ip-management/page.tsx
│       └─ handleBanIP(ip: string)
│
├─ [2] API Call
│   └─ fetch('/api/global/ip-management/ban', {
│       method: 'POST',
│       body: JSON.stringify({ ip, reason, duration })
│     })
│
├─ [3] API Route Handler
│   📄 app/api/global/ip-management/ban/route.ts
│   └─ export async function POST(request)
│       ├─ Parse request body
│       ├─ Validate IP address
│       └─ Execute database operations:
│
├─ [4] Database Transactions
│   ├─ [4.1] Update IP Reputation
│   │   └─ UPDATE global_ip_reputation
│   │       SET
│   │         is_banned = true,
│   │         category = 'banned',
│   │         reputation_score = 0,
│   │         ban_reason = $1,
│   │         ban_expires_at = NOW() + INTERVAL '$2 hours'
│   │       WHERE ip = $3
│   │
│   ├─ [4.2] Log Activity
│   │   └─ INSERT INTO global_ip_activity
│   │       (ip, action_taken, details, timestamp)
│   │       VALUES ($1, 'banned', $2, NOW())
│   │
│   └─ [4.3] Check Auto Rules
│       └─ SELECT * FROM global_auto_rules
│           WHERE rule_type = 'ip_ban'
│             AND enabled = true
│
├─ [5] Trigger Notifications
│   └─ IF notification rules exist:
│       ├─ Check notification_rules table
│       │   WHERE event_type = 'ip_banned'
│       │
│       ├─ Check throttle
│       │   └─ SELECT * FROM notification_throttle
│       │       WHERE rule_id = $1
│       │         AND last_sent > NOW() - INTERVAL 'X minutes'
│       │
│       └─ IF not throttled:
│           ├─ Get channel config from notification_channels
│           ├─ Send notification (Email/Slack/Webhook)
│           ├─ Log to notification_history
│           └─ Update notification_throttle
│
├─ [6] Response to Client
│   └─ return NextResponse.json({
│       success: true,
│       message: 'IP banned successfully',
│       data: {
│         ip: '192.168.1.100',
│         banned_at: '2025-11-06T17:30:00Z',
│         expires_at: '2025-11-07T17:30:00Z'
│       }
│     })
│
└─ [7] Frontend Update
    ├─ Show success toast
    ├─ Refresh IP list
    ├─ Update statistics
    └─ Close modal
```

### Senaryo 2: Bot Detection Flow

```
INCOMING REQUEST: HTTP Request to any domain
│
├─ [1] Nginx Receives Request
│   └─ Extract: IP, User-Agent, Domain, Path
│
├─ [2] Request Logged to Database
│   └─ INSERT INTO global_ip_activity
│       (ip, domain, path, user_agent, timestamp)
│
├─ [3] Bot Detection Analysis (Async)
│   ├─ [3.1] Query Bot Patterns
│   │   └─ SELECT * FROM global_bot_patterns
│   │       WHERE enabled = true
│   │
│   ├─ [3.2] Pattern Matching
│   │   └─ FOR EACH pattern:
│   │       ├─ Check User-Agent match
│   │       │   └─ IF any(user_agent_patterns) IN user_agent:
│   │       │       ├─ Match found!
│   │       │       └─ bot_score += pattern_weight
│   │       │
│   │       ├─ Check IP range match
│   │       │   └─ IF ip IN ip_ranges:
│   │       │       └─ bot_score += ip_weight
│   │       │
│   │       └─ Check behavior signatures
│   │           └─ Analyze request frequency, paths, etc.
│   │
│   ├─ [3.3] Calculate Final Bot Score
│   │   └─ bot_score = (pattern_matches * 20) +
│   │                  (behavior_score * 10) +
│   │                  (ip_match_score * 15)
│   │       Range: 0-100
│   │
│   └─ [3.4] Classification
│       ├─ IF bot_score >= 80: is_bot = true, confidence = 'high'
│       ├─ IF bot_score >= 50: is_bot = true, confidence = 'medium'
│       ├─ IF bot_score >= 20: is_bot = 'maybe', confidence = 'low'
│       └─ ELSE: is_bot = false
│
├─ [4] Record Detection
│   └─ INSERT INTO global_bot_detections
│       (ip, domain, user_agent, is_bot, bot_name,
│        bot_type, bot_score, detection_method,
│        blocked, detected_at)
│       VALUES (...)
│
├─ [5] Apply Action
│   ├─ Get recommended_action from bot_pattern
│   │   ├─ 'allow' → Continue request
│   │   ├─ 'block' → Return 403 Forbidden
│   │   ├─ 'challenge' → Return CAPTCHA page
│   │   └─ 'log_only' → Continue but log
│   │
│   └─ IF blocked:
│       └─ Return 403 response
│
├─ [6] Update Pattern Statistics
│   └─ UPDATE global_bot_patterns
│       SET
│         detection_count = detection_count + 1,
│         last_detected_at = NOW()
│       WHERE id = $1
│
└─ [7] Dashboard Updates
    ├─ Real-time bot detection count update
    ├─ Detection log table refresh
    └─ Statistics cards update
```

### Senaryo 3: Analytics Data Aggregation

```
SCHEDULED JOB: Hourly Analytics Aggregation
│
├─ [1] Trigger (Cron/Background Job)
│   └─ Every hour at :00 minutes
│
├─ [2] Data Collection
│   ├─ [2.1] Traffic Metrics
│   │   └─ SELECT
│   │       COUNT(*) as total_requests,
│   │       COUNT(DISTINCT ip) as unique_ips,
│   │       AVG(response_time) as avg_response_time,
│   │       SUM(CASE WHEN blocked THEN 1 ELSE 0 END) as blocked_count
│   │       FROM global_ip_activity
│   │       WHERE timestamp >= NOW() - INTERVAL '1 hour'
│   │
│   ├─ [2.2] Security Metrics
│   │   └─ SELECT
│   │       COUNT(*) as attack_attempts,
│   │       COUNT(DISTINCT ip) as attack_ips,
│   │       COUNT(CASE WHEN action='blocked' THEN 1 END) as blocked_attacks
│   │       FROM global_rule_triggers
│   │       WHERE triggered_at >= NOW() - INTERVAL '1 hour'
│   │
│   ├─ [2.3] Bot Metrics
│   │   └─ SELECT
│   │       COUNT(*) as bot_detections,
│   │       COUNT(CASE WHEN bot_type='good' THEN 1 END) as good_bots,
│   │       COUNT(CASE WHEN bot_type='bad' THEN 1 END) as bad_bots,
│   │       AVG(bot_score) as avg_bot_score
│   │       FROM global_bot_detections
│   │       WHERE detected_at >= NOW() - INTERVAL '1 hour'
│   │
│   ├─ [2.4] Spam Metrics
│   │   └─ SELECT
│   │       COUNT(*) as spam_detected,
│   │       AVG(spam_score) as avg_spam_score,
│   │       COUNT(CASE WHEN blocked THEN 1 END) as blocked_spam
│   │       FROM global_spam_detections
│   │       WHERE detected_at >= NOW() - INTERVAL '1 hour'
│   │
│   └─ [2.5] Geographic Data
│       └─ WITH geo_data AS (
│           SELECT
│             ip,
│             jsonb_extract_path_text(details, 'country') as country
│           FROM global_ip_activity
│           WHERE timestamp >= NOW() - INTERVAL '1 hour'
│         )
│         SELECT
│           country,
│           COUNT(*) as request_count
│         FROM geo_data
│         GROUP BY country
│         ORDER BY request_count DESC
│         LIMIT 10
│
├─ [3] Aggregate and Store
│   └─ INSERT INTO analytics_hourly_summary
│       (hour_timestamp, traffic_metrics, security_metrics,
│        bot_metrics, spam_metrics, geo_data)
│       VALUES (
│         date_trunc('hour', NOW()),
│         jsonb_build_object('total', ..., 'unique_ips', ...),
│         jsonb_build_object('attacks', ..., 'blocked', ...),
│         jsonb_build_object('detections', ..., 'good', ...),
│         jsonb_build_object('spam', ..., 'blocked', ...),
│         jsonb_build_object('top_countries', ...)
│       )
│
├─ [4] Update Real-time Cache
│   └─ Redis SETEX analytics:current json_data 3600
│
└─ [5] Dashboard Refresh
    └─ WebSocket notification to connected clients
        └─ Clients fetch new data from /api/global/analytics
```

---

## 🎯 ÖNEMLİ KOD BLOKLARI

### 1. Bot Detection Pattern Matching Algorithm

**Dosya:** `app/api/global/bot-detection/patterns/route.ts`

```typescript
// ═══════════════════════════════════════════════════════════════
// BOT DETECTION: Pattern Matching Algorithm
// ═══════════════════════════════════════════════════════════════

export async function detectBot(
  userAgent: string,
  ip: string
): Promise<BotDetectionResult> {
  const db = getDatabase()
  
  // Step 1: Fetch all enabled patterns
  const patterns = await db.query(`
    SELECT * FROM global_bot_patterns
    WHERE enabled = true
    ORDER BY vendor, bot_name
  `)
  
  let botScore = 0
  let matchedPatterns: string[] = []
  let detectedBot: BotPattern | null = null
  
  // Step 2: Check User-Agent patterns
  for (const pattern of patterns.rows) {
    const { user_agent_patterns, bot_name, bot_type } = pattern
    
    // Check if any pattern matches
    const matched = user_agent_patterns.some((p: string) => {
      const regex = new RegExp(p, 'i')
      return regex.test(userAgent)
    })
    
    if (matched) {
      matchedPatterns.push(bot_name)
      botScore += (bot_type === 'good' ? 20 : 30)
      
      if (!detectedBot) {
        detectedBot = pattern
      }
    }
    
    // Check IP ranges if available
    if (pattern.ip_ranges && pattern.ip_ranges.length > 0) {
      const ipMatched = pattern.ip_ranges.some((range: string) => {
        return isIPInRange(ip, range)
      })
      
      if (ipMatched) {
        botScore += 15
      }
    }
  }
  
  // Step 3: Behavior analysis
  const behaviorScore = await analyzeBehavior(ip)
  botScore += behaviorScore
  
  // Step 4: Final classification
  const isBot = botScore >= 50
  const confidence = botScore >= 80 ? 'high' :
                     botScore >= 50 ? 'medium' : 'low'
  
  // Step 5: Record detection
  await db.query(`
    INSERT INTO global_bot_detections
      (ip, user_agent, is_bot, bot_name, bot_type,
       bot_score, detection_method, detected_at)
    VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
  `, [
    ip,
    userAgent,
    isBot,
    detectedBot?.bot_name || 'Unknown',
    detectedBot?.bot_type || 'unknown',
    botScore,
    'pattern_matching'
  ])
  
  return {
    isBot,
    botName: detectedBot?.bot_name,
    botType: detectedBot?.bot_type,
    botScore,
    confidence,
    matchedPatterns,
    recommendedAction: detectedBot?.recommended_action || 'allow'
  }
}

// Helper: Check if IP is in CIDR range
function isIPInRange(ip: string, range: string): boolean {
  // CIDR range matching logic
  // Example: 66.249.64.0/19 contains 66.249.65.42
  // ...implementation...
}

// Helper: Analyze bot behavior patterns
async function analyzeBehavior(ip: string): Promise<number> {
  const db = getDatabase()
  
  // Check request frequency (last 1 minute)
  const frequency = await db.query(`
    SELECT COUNT(*) as count
    FROM global_ip_activity
    WHERE ip = $1
      AND timestamp >= NOW() - INTERVAL '1 minute'
  `, [ip])
  
  const requestCount = parseInt(frequency.rows[0].count)
  
  // Bot behavior indicators:
  let score = 0
  
  // High request frequency (> 60 requests/minute)
  if (requestCount > 60) score += 20
  else if (requestCount > 30) score += 10
  
  // Check path patterns
  const paths = await db.query(`
    SELECT path, COUNT(*) as count
    FROM global_ip_activity
    WHERE ip = $1
      AND timestamp >= NOW() - INTERVAL '5 minutes'
    GROUP BY path
    ORDER BY count DESC
    LIMIT 5
  `, [ip])
  
  // Suspicious patterns: /admin, /wp-admin, /.env, etc.
  const suspiciousPaths = ['/admin', '/wp-admin', '/.env', '/config']
  const hasSuspicious = paths.rows.some(row => 
    suspiciousPaths.some(p => row.path.includes(p))
  )
  
  if (hasSuspicious) score += 15
  
  return score
}
```

### 2. IP Reputation Scoring System

**Dosya:** `lib/ip-reputation.ts` (Custom logic)

```typescript
// ═══════════════════════════════════════════════════════════════
// IP REPUTATION: Scoring Algorithm (0-100)
// ═══════════════════════════════════════════════════════════════

interface ReputationFactors {
  totalVisits: number
  blockedCount: number
  attackCount: number
  botDetections: number
  spamDetections: number
  lastActivity: Date
  whitelisted: boolean
  blacklisted: boolean
}

export async function calculateIPReputation(
  ip: string
): Promise<number> {
  const db = getDatabase()
  
  // Fetch all factors
  const result = await db.query(`
    SELECT
      total_visits,
      blocked_count,
      attack_count,
      bot_detections,
      spam_detections,
      last_activity,
      is_whitelisted,
      is_blacklisted
    FROM global_ip_reputation
    WHERE ip = $1
  `, [ip])
  
  if (result.rows.length === 0) {
    // New IP, neutral score
    return 50
  }
  
  const factors: ReputationFactors = result.rows[0]
  
  // Start with neutral score
  let score = 50
  
  // ─────────────────────────────────────────────────────────────
  // POSITIVE FACTORS (Increase score)
  // ─────────────────────────────────────────────────────────────
  
  // Whitelisted IPs get maximum score
  if (factors.whitelisted) {
    return 100
  }
  
  // Regular visitor bonus (consistent, non-threatening activity)
  if (factors.totalVisits > 100 && factors.attackCount === 0) {
    score += Math.min(20, factors.totalVisits / 50)
  }
  
  // Recent activity bonus (active user)
  const daysSinceActive = daysBetween(
    factors.lastActivity,
    new Date()
  )
  if (daysSinceActive < 7) {
    score += 5
  }
  
  // ─────────────────────────────────────────────────────────────
  // NEGATIVE FACTORS (Decrease score)
  // ─────────────────────────────────────────────────────────────
  
  // Blacklisted IPs get minimum score
  if (factors.blacklisted) {
    return 0
  }
  
  // Attack attempts (severe penalty)
  if (factors.attackCount > 0) {
    score -= Math.min(40, factors.attackCount * 10)
  }
  
  // Blocked requests (moderate penalty)
  const blockRate = factors.blockedCount / factors.totalVisits
  if (blockRate > 0.5) {
    score -= 20
  } else if (blockRate > 0.2) {
    score -= 10
  }
  
  // Bot detections (depends on bot type)
  // Note: Good bots don't penalize, bad bots do
  const badBotCount = await getBadBotCount(ip)
  if (badBotCount > 0) {
    score -= Math.min(15, badBotCount * 5)
  }
  
  // Spam detections (moderate penalty)
  if (factors.spamDetections > 0) {
    score -= Math.min(20, factors.spamDetections * 3)
  }
  
  // Ensure score stays in valid range [0, 100]
  score = Math.max(0, Math.min(100, score))
  
  // ─────────────────────────────────────────────────────────────
  // UPDATE DATABASE
  // ─────────────────────────────────────────────────────────────
  
  await db.query(`
    UPDATE global_ip_reputation
    SET
      reputation_score = $1,
      category = $2,
      updated_at = NOW()
    WHERE ip = $3
  `, [
    score,
    categorizeScore(score),
    ip
  ])
  
  return score
}

// Helper: Categorize score into reputation categories
function categorizeScore(score: number): string {
  if (score >= 80) return 'trusted'
  if (score >= 60) return 'good'
  if (score >= 40) return 'neutral'
  if (score >= 20) return 'suspicious'
  return 'malicious'
}

// Helper: Get bad bot detection count
async function getBadBotCount(ip: string): Promise<number> {
  const db = getDatabase()
  const result = await db.query(`
    SELECT COUNT(*) as count
    FROM global_bot_detections
    WHERE ip = $1
      AND bot_type = 'bad'
      AND detected_at >= NOW() - INTERVAL '7 days'
  `, [ip])
  
  return parseInt(result.rows[0].count)
}

// Helper: Days between two dates
function daysBetween(date1: Date, date2: Date): number {
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays
}
```

### 3. Auto Rules Execution Engine

**Dosya:** `lib/auto-rules-engine.ts`

```typescript
// ═══════════════════════════════════════════════════════════════
// AUTO RULES: Priority-based Execution Engine
// ═══════════════════════════════════════════════════════════════

interface AutoRule {
  id: string
  rule_name: string
  rule_type: string
  conditions: Record<string, any>
  actions: Record<string, any>
  priority: number
  enabled: boolean
}

interface RuleContext {
  ip: string
  domain: string
  path: string
  userAgent: string
  country?: string
  botScore?: number
  spamScore?: number
  reputationScore?: number
}

export async function executeAutoRules(
  context: RuleContext
): Promise<RuleExecutionResult[]> {
  const db = getDatabase()
  
  // Step 1: Fetch all enabled rules, ordered by priority (DESC)
  const rules = await db.query(`
    SELECT *
    FROM global_auto_rules
    WHERE enabled = true
    ORDER BY priority DESC, created_at ASC
  `)
  
  const results: RuleExecutionResult[] = []
  let blockRequest = false
  
  // Step 2: Execute rules in priority order
  for (const rule of rules.rows) {
    const ruleObj: AutoRule = rule
    
    // Check if rule conditions match
    const matches = await evaluateConditions(
      ruleObj.conditions,
      context
    )
    
    if (matches) {
      // Execute rule actions
      const actionResult = await executeActions(
        ruleObj.actions,
        context
      )
      
      // Log trigger
      await db.query(`
        INSERT INTO global_rule_triggers
          (rule_id, ip, domain, action_taken, triggered_at)
        VALUES ($1, $2, $3, $4, NOW())
      `, [
        ruleObj.id,
        context.ip,
        context.domain,
        JSON.stringify(actionResult.actions)
      ])
      
      // Update rule trigger count
      await db.query(`
        UPDATE global_auto_rules
        SET trigger_count = trigger_count + 1
        WHERE id = $1
      `, [ruleObj.id])
      
      results.push({
        ruleId: ruleObj.id,
        ruleName: ruleObj.rule_name,
        matched: true,
        actions: actionResult.actions,
        blocked: actionResult.blocked
      })
      
      // If rule blocks request, stop processing
      if (actionResult.blocked) {
        blockRequest = true
        break
      }
    } else {
      results.push({
        ruleId: ruleObj.id,
        ruleName: ruleObj.rule_name,
        matched: false
      })
    }
  }
  
  return results
}

// Evaluate rule conditions against context
async function evaluateConditions(
  conditions: Record<string, any>,
  context: RuleContext
): Promise<boolean> {
  // Conditions can be:
  // - ip_reputation: { operator: 'less_than', value: 30 }
  // - bot_score: { operator: 'greater_than', value: 70 }
  // - country: { operator: 'in', value: ['CN', 'RU'] }
  // - request_count: { operator: 'greater_than', value: 100, window: '1m' }
  
  for (const [key, condition] of Object.entries(conditions)) {
    switch (key) {
      case 'ip_reputation':
        if (!context.reputationScore) {
          context.reputationScore = await calculateIPReputation(
            context.ip
          )
        }
        if (!compare(
          context.reputationScore,
          condition.operator,
          condition.value
        )) {
          return false
        }
        break
      
      case 'bot_score':
        if (!context.botScore) {
          const detection = await detectBot(
            context.userAgent,
            context.ip
          )
          context.botScore = detection.botScore
        }
        if (!compare(
          context.botScore,
          condition.operator,
          condition.value
        )) {
          return false
        }
        break
      
      case 'country':
        if (!context.country) {
          const geoip = await lookupGeoIP(context.ip)
          context.country = geoip.countryCode
        }
        if (condition.operator === 'in') {
          if (!condition.value.includes(context.country)) {
            return false
          }
        } else if (condition.operator === 'not_in') {
          if (condition.value.includes(context.country)) {
            return false
          }
        }
        break
      
      case 'request_count':
        const count = await getRequestCount(
          context.ip,
          condition.window || '1m'
        )
        if (!compare(
          count,
          condition.operator,
          condition.value
        )) {
          return false
        }
        break
      
      case 'path_pattern':
        const regex = new RegExp(condition.value, 'i')
        if (!regex.test(context.path)) {
          return false
        }
        break
    }
  }
  
  return true // All conditions matched
}

// Execute rule actions
async function executeActions(
  actions: Record<string, any>,
  context: RuleContext
): Promise<ActionResult> {
  const db = getDatabase()
  const executedActions: string[] = []
  let blocked = false
  
  for (const [action, params] of Object.entries(actions)) {
    switch (action) {
      case 'block':
        blocked = true
        executedActions.push('request_blocked')
        
        // Update IP activity
        await db.query(`
          UPDATE global_ip_activity
          SET blocked = true,
              action_taken = 'blocked_by_auto_rule'
          WHERE ip = $1
            AND timestamp >= NOW() - INTERVAL '1 minute'
        `, [context.ip])
        break
      
      case 'ban_ip':
        await db.query(`
          UPDATE global_ip_reputation
          SET is_banned = true,
              ban_reason = $1,
              ban_expires_at = NOW() + INTERVAL '$2 hours'
          WHERE ip = $3
        `, [
          params.reason || 'Auto-banned by rule',
          params.duration || 24,
          context.ip
        ])
        executedActions.push(`ip_banned_${params.duration}h`)
        blocked = true
        break
      
      case 'rate_limit':
        // Apply custom rate limit
        await applyRateLimit(
          context.ip,
          params.requests,
          params.window
        )
        executedActions.push(`rate_limited_${params.requests}/${params.window}`)
        break
      
      case 'challenge':
        // Present CAPTCHA or challenge
        executedActions.push('captcha_challenge')
        blocked = true // Temporarily block until challenge solved
        break
      
      case 'notify':
        // Send notification
        await sendNotification({
          event_type: 'auto_rule_triggered',
          data: {
            rule: actions,
            context
          }
        })
        executedActions.push('notification_sent')
        break
      
      case 'log':
        // Just log, no blocking
        executedActions.push('logged')
        break
    }
  }
  
  return {
    actions: executedActions,
    blocked
  }
}

// Comparison operator helper
function compare(
  a: number,
  operator: string,
  b: number
): boolean {
  switch (operator) {
    case 'greater_than': return a > b
    case 'less_than': return a < b
    case 'equals': return a === b
    case 'greater_or_equal': return a >= b
    case 'less_or_equal': return a <= b
    default: return false
  }
}
```

---

## 📈 PERFORMANCE & OPTIMIZATION

### Database İndeksler

```sql
-- ═══════════════════════════════════════════════════════════════
-- CRITICAL INDEXES FOR PERFORMANCE
-- ═══════════════════════════════════════════════════════════════

-- IP Activity (Most queried table)
CREATE INDEX idx_ip_activity_ip ON global_ip_activity(ip);
CREATE INDEX idx_ip_activity_timestamp ON global_ip_activity(timestamp DESC);
CREATE INDEX idx_ip_activity_domain ON global_ip_activity(domain);
CREATE INDEX idx_ip_activity_blocked ON global_ip_activity(blocked);

-- Composite indexes for common queries
CREATE INDEX idx_ip_activity_ip_timestamp
  ON global_ip_activity(ip, timestamp DESC);
CREATE INDEX idx_ip_activity_domain_timestamp
  ON global_ip_activity(domain, timestamp DESC);

-- IP Reputation
CREATE INDEX idx_ip_reputation_score ON global_ip_reputation(reputation_score);
CREATE INDEX idx_ip_reputation_category ON global_ip_reputation(category);
CREATE INDEX idx_ip_reputation_banned ON global_ip_reputation(is_banned)
  WHERE is_banned = true;

-- Bot Detections
CREATE INDEX idx_bot_detections_ip ON global_bot_detections(ip);
CREATE INDEX idx_bot_detections_detected_at
  ON global_bot_detections(detected_at DESC);
CREATE INDEX idx_bot_detections_bot_type ON global_bot_detections(bot_type);

-- Bot Patterns
CREATE INDEX idx_bot_patterns_vendor ON global_bot_patterns(vendor);
CREATE INDEX idx_bot_patterns_enabled ON global_bot_patterns(enabled)
  WHERE enabled = true;

-- Auto Rules
CREATE INDEX idx_auto_rules_priority ON global_auto_rules(priority DESC);
CREATE INDEX idx_auto_rules_enabled ON global_auto_rules(enabled)
  WHERE enabled = true;

-- Rule Triggers
CREATE INDEX idx_rule_triggers_rule_id ON global_rule_triggers(rule_id);
CREATE INDEX idx_rule_triggers_ip ON global_rule_triggers(ip);
CREATE INDEX idx_rule_triggers_triggered_at
  ON global_rule_triggers(triggered_at DESC);
```

### Caching Stratejisi

```typescript
// ═══════════════════════════════════════════════════════════════
// CACHING STRATEGY
// ═══════════════════════════════════════════════════════════════

const CACHE_LAYERS = {
  // Layer 1: In-Memory (Fastest, 5-60 sec TTL)
  inMemory: {
    activeRules: new Map(), // 30 sec TTL
    botPatterns: new Map(), // 60 sec TTL
    ipReputation: new Map(), // 5 sec TTL (hot data)
  },
  
  // Layer 2: Redis (Fast, 1-60 min TTL)
  redis: {
    geoipData: '60m',
    analyticsData: '5m',
    userSessions: '24h',
  },
  
  // Layer 3: PostgreSQL (Permanent storage)
  database: {
    // All persistent data
  }
}

// Cache read flow:
// 1. Check in-memory cache
// 2. If miss, check Redis
// 3. If miss, query database and populate caches
```

---

## ✅ SONUÇ VE ÖZET

### 📊 Proje İstatistikleri

```
┌────────────────────────────────────────────────────────────────┐
│  PROJE KOMPOZİSYONU                                           │
├────────────────────────────────────────────────────────────────┤
│  Toplam Dosya:          228 TypeScript/SQL dosyası            │
│  Sayfa Sayısı:          33 Next.js pages                       │
│  API Endpoint:          50+ REST endpoints                     │
│  Database Tablo:        20+ tables                             │
│  Lib Modüller:          12 utility modules                     │
│  Component:             30+ React components                   │
│  Migration:             6 SQL migrations                       │
│  Toplam Satır:          ~45,000 lines of code                 │
└────────────────────────────────────────────────────────────────┘
```

### 🎯 Ana Özellikler Özeti

1. **Traffic Control** - Multi-domain trafik yönetimi
2. **IP Management** - Reputation scoring (0-100)
3. **Auto Rules** - Priority-based otomatik kurallar
4. **Bot Detection** - 17 bot pattern (includes 8 Meta bots)
5. **Spam Control** - 5 pattern type, severity-based
6. **Analytics** - Chart.js ile görselleştirme
7. **Notifications** - Multi-channel alert system
8. **Rate Limiting** - 3 strateji (Fixed/Sliding/Token)
9. **GeoIP** - Multi-provider IP geolocation
10. **Site Management** - Nginx/SSL/PM2 integration

### 🔗 Veri Akış Özeti

```
USER → SIDEBAR MENU → PAGE COMPONENT → API ROUTE → DATABASE
  ↓                                                      ↓
RENDER ←─────────────────── RESPONSE ←─────────────── QUERY RESULT
```

### 📚 Dosya Organizasyonu

```
traffic-control-system/
├── app/                    # Next.js App Router
│   ├── dashboard/          # Dashboard pages
│   │   ├── global/         # Global management features
│   │   ├── settings/       # System settings
│   │   ├── sites/          # Site management
│   │   └── traffic/        # Traffic monitoring
│   └── api/                # API routes
│       ├── global/         # Global management APIs
│       ├── notifications/  # Notification APIs
│       └── geoip/          # GeoIP APIs
├── components/             # React components
│   └── layout/             # Layout components
├── lib/                    # Utility libraries
├── migrations/             # Database migrations
├── docs/                   # Documentation
└── public/                 # Static files
```

---

## 🎉 TAMAMLANDI!

Bu dokümantasyon Traffic Control System uygulamasının **tam elektronik devre haritası**dır.

Her menü, her butun, her API çağrısı, her database query detaylı olarak haritalandırıldı!

**Kullanım:**
- Yeni özellik eklerken: İlgili bölüme bak
- Bug fix yaparken: Veri akış diyagramlarını takip et
- Kod review: Component hiyerarşisini kontrol et
- Database değişikliği: Tablo ilişkilerini gözden geçir

**Son Güncelleme:** 2025-11-06
**Harita Durumu:** ✅ COMPLETE
