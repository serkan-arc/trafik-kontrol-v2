# Traffic Control System - UI/UX Design Plan

**Document Created**: November 3, 2025  
**Approach**: Dashboard-First Design → Code Implementation  
**Goal**: Define all UI/UX specifications before writing any code

---

## 📐 Design Philosophy

### Core Principles
1. **Data Visualization First**: Charts, graphs, and visual indicators prioritized
2. **Progressive Disclosure**: Show overview first, details on demand
3. **Action-Oriented**: Quick access to common actions (block, whitelist, test)
4. **Real-Time Updates**: Live data feeds and instant refresh capabilities
5. **Responsive Layout**: Desktop-first, mobile-friendly
6. **Consistent Design Language**: Reusable components across all dashboards

### Color System
```
Risk Levels:
- Critical (80-100): Red (#DC2626, bg-red-50, border-red-300)
- High (50-79): Orange (#EA580C, bg-orange-50, border-orange-300)
- Medium (30-49): Yellow (#CA8A04, bg-yellow-50, border-yellow-300)
- Low (0-29): Green (#16A34A, bg-green-50, border-green-300)

List Status:
- Whitelist: Green (#16A34A, bg-green-100, text-green-800)
- Graylist: Yellow (#CA8A04, bg-yellow-100, text-yellow-800)
- Blacklist: Red (#DC2626, bg-red-100, text-red-800)
- Unknown: Gray (#6B7280, bg-gray-100, text-gray-800)

Bot Status:
- Verified: Green (#16A34A, bg-green-50)
- Fake: Red (#DC2626, bg-red-50)
- Unknown: Blue (#2563EB, bg-blue-50)

Actions:
- Primary: Indigo (#4F46E5, hover: #4338CA)
- Danger: Red (#DC2626, hover: #B91C1C)
- Success: Green (#16A34A, hover: #15803D)
- Secondary: Gray (#6B7280, hover: #4B5563)
```

---

## 🎨 Dashboard Designs

---

## 1. Traffic Overview Dashboard

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header                                     [Time Range ▼]│
├─────────────────────────────────────────────────────────┤
│ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐        │
│ │ Total   │ │ Total   │ │ Form    │ │ Spam    │        │
│ │ IPs     │ │ Visits  │ │ Submis- │ │ Detected│        │
│ │ (stat)  │ │ (stat)  │ │ sions   │ │ (stat)  │        │
│ └─────────┘ └─────────┘ └─────────┘ └─────────┘        │
├──────────────────────────────────────────────────────────│
│ ┌────────────────────┐ ┌──────────────────────────────┐ │
│ │ Real-Time Traffic  │ │ Risk Distribution Over Time  │ │
│ │ Line Chart         │ │ Stacked Area Chart           │ │
│ │ (last 24h)         │ │ (last 7 days)                │ │
│ └────────────────────┘ └──────────────────────────────┘ │
├──────────────────────────────────────────────────────────│
│ ┌────────────────────┐ ┌──────────────────────────────┐ │
│ │ IP Lists           │ │ Risk Levels                  │ │
│ │ Distribution       │ │ (Critical/High/Medium/Low)   │ │
│ │ (Donut Chart)      │ │ (Bar Chart with avg scores)  │ │
│ └────────────────────┘ └──────────────────────────────┘ │
├──────────────────────────────────────────────────────────│
│ ┌────────────────────┐ ┌──────────────────────────────┐ │
│ │ Bot Detection      │ │ Country Distribution         │ │
│ │ Summary (3 cards)  │ │ (World Map or Bar Chart)     │ │
│ └────────────────────┘ └──────────────────────────────┘ │
├──────────────────────────────────────────────────────────│
│ Live Feed: Recent Activities (last 20 actions)           │
│ ┌─────────────────────────────────────────────────────┐  │
│ │ [Time] [IP] [Action] [Risk] [Details...]           │  │
│ │ Auto-refresh every 5 seconds                        │  │
│ └─────────────────────────────────────────────────────┘  │
├──────────────────────────────────────────────────────────│
│ Quick Actions: [Manage IPs] [Auto Rules] [Analytics]    │
└──────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 1.1 Stat Cards (Top Row)
```typescript
Component: StatCard
- Layout: 4 columns grid (responsive: 1 col on mobile, 2 on tablet)
- Card Design:
  * Border: 2px solid (color-coded by type)
  * Background: Light tint matching border color
  * Icon: Large emoji/icon (4xl text size)
  * Main Value: 3xl font, bold, color-coded
  * Subtitle: xs font, gray-500
  * Hover Effect: Slight shadow increase

Cards:
1. Total IPs
   - Icon: 🌐
   - Color: Blue
   - Main: Total IP count
   - Subtitle: "X new today"
   
2. Total Visits
   - Icon: 👁️
   - Color: Green
   - Main: Visit count
   - Subtitle: "X unique visitors"
   
3. Form Submissions
   - Icon: 📝
   - Color: Purple
   - Main: Submission count
   - Subtitle: "X% spam rate"
   
4. Spam Detected
   - Icon: 🚫
   - Color: Red
   - Main: Spam count
   - Subtitle: "Auto-blocked"
```

#### 1.2 Real-Time Traffic Chart
```typescript
Component: RealTimeTrafficChart
Library: Recharts or Chart.js
Type: Line Chart

Features:
- X-Axis: Time (last 24 hours, auto-scroll)
- Y-Axis: Visit count
- Lines:
  * Total Visits (blue line)
  * Unique IPs (green line)
  * Spam Attempts (red dashed line)
- Tooltips: Show exact values on hover
- Legend: Top-right position
- Auto-refresh: Every 30 seconds
- Loading State: Skeleton loader

Data Points: Hourly aggregation for 24h view
```

#### 1.3 Risk Distribution Chart
```typescript
Component: RiskDistributionChart
Library: Recharts
Type: Stacked Area Chart

Features:
- X-Axis: Date (last 7 days default)
- Y-Axis: IP count
- Areas (stacked):
  * Critical (red, top)
  * High (orange)
  * Medium (yellow)
  * Low (green, bottom)
- Smooth curves
- Hover: Show breakdown for that day
- Export Button: Download as PNG/CSV
```

#### 1.4 IP Lists Distribution
```typescript
Component: ListsDistributionChart
Library: Recharts
Type: Donut Chart

Features:
- Segments:
  * Whitelist (green)
  * Graylist (yellow)
  * Blacklist (red)
  * Unknown (gray)
- Center: Total IP count
- Hover: Show percentage + count
- Click: Navigate to filtered IP list
```

#### 1.5 Live Feed
```typescript
Component: LiveActivityFeed
Type: Scrollable list with auto-refresh

Layout:
- Height: 300px fixed, scrollable
- Auto-refresh: 5 seconds
- Max Items: 20 (rolling window)

Item Structure:
┌─────────────────────────────────────────────┐
│ [14:32:15] 203.0.113.42                     │
│ Action: Auto-blacklisted (Risk: 87)         │
│ Reason: 5+ spam submissions in 1 hour       │
│ [View Details →]                            │
└─────────────────────────────────────────────┘

Color Coding:
- Blacklist Action: Red border-left (4px)
- Whitelist Action: Green border-left
- Graylist Action: Yellow border-left
- Form Submit: Blue border-left
```

---

## 2. IP Management Dashboard

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header: IP Management                                    │
├─────────────────────────────────────────────────────────┤
│ Filters Panel (collapsible)                             │
│ [Status ▼] [Risk ▼] [Country] [Device] [Date Range]    │
│ [Apply Filters] [Clear] [Export CSV]                    │
├─────────────────────────────────────────────────────────┤
│ Summary Cards (4 columns)                               │
│ [Total] [High Risk] [Critical] [Blacklisted]            │
├─────────────────────────────────────────────────────────┤
│ IP Table (sortable, filterable, paginated)              │
│ ┌───────────────────────────────────────────────────┐   │
│ │ IP | Country | Device | Visits | Risk | Status   │   │
│ │ Actions: [View Details] [Quick Actions ▼]        │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Pagination: ← [1] 2 3 ... 10 →  [20 per page ▼]        │
└─────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 2.1 Filters Panel
```typescript
Component: IPFiltersPanel
State: Collapsible (expand/collapse toggle)

Filters:
1. List Status (multi-select dropdown)
   - Options: All, Whitelist, Graylist, Blacklist, Unknown
   
2. Risk Score (range slider)
   - Min: 0, Max: 100
   - Visual: Two-thumb slider
   - Quick Presets: [Low 0-29] [Medium 30-49] [High 50-79] [Critical 80+]
   
3. Country (searchable dropdown)
   - Auto-complete with flag icons
   - Multi-select support
   
4. Device Type (multi-select)
   - Options: Desktop, Mobile, Tablet, Unknown
   
5. Date Range (date picker)
   - Presets: Today, Last 7 days, Last 30 days, Custom
   
Buttons:
- Apply Filters (Primary button, indigo)
- Clear All (Secondary, gray)
- Export CSV (Secondary, with download icon)
```

#### 2.2 IP Table
```typescript
Component: IPDataTable
Features: Sortable, Filterable, Row Actions

Columns:
1. IP Address (sortable)
   - Font: Monospace
   - Format: XXX.XXX.XXX.XXX
   - Sub-text: Last seen date
   
2. Country (sortable)
   - Flag icon + Country code
   
3. Device Type (filterable)
   - Icon + Type name
   
4. Visit Count (sortable)
   - Number with thousand separators
   
5. Form Submissions (sortable)
   - Number (click to view submissions)
   
6. Risk Score (sortable)
   - Color-coded badge
   - Hover: Show risk breakdown
   
7. Status (filterable)
   - Color-coded badge
   - Whitelist/Graylist/Blacklist/Unknown
   
8. Actions
   - Primary: [View Details] button
   - Dropdown: [Quick Actions ▼]
     * Move to Whitelist
     * Move to Graylist
     * Move to Blacklist
     * Reset Risk Score
     * Add Note
     * Block All Traffic

Row Hover: Light background highlight
Click Row: Navigate to detail page
```

---

## 3. IP Detail Page

### URL Structure
```
/dashboard/traffic/ips/[ip]/page.tsx
Example: /dashboard/traffic/ips/203.0.113.42
```

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ ← Back to IPs                                           │
├─────────────────────────────────────────────────────────┤
│ IP Header Card                                          │
│ ┌───────────────────────────────────────────────────┐   │
│ │ 203.0.113.42           [Quick Actions Dropdown ▼] │   │
│ │ 🇺🇸 United States | Desktop | ISP: Example ISP    │   │
│ │                                                    │   │
│ │ Risk: [87] Critical | Status: [Blacklist]         │   │
│ │ First Seen: Jan 1, 2024 | Last Seen: 5 min ago   │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Tabs: [Activity] [Risk Analysis] [Forms] [Notes]       │
├─────────────────────────────────────────────────────────┤
│ Activity Tab Content:                                   │
│ ┌─────────────────────┐ ┌───────────────────────────┐  │
│ │ Visit Timeline      │ │ Risk Score History        │  │
│ │ (Vertical Timeline) │ │ (Line Chart)              │  │
│ └─────────────────────┘ └───────────────────────────┘  │
│                                                         │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Recent Actions Log (Table)                          │ │
│ │ Date | Action | Details | Triggered By             │ │
│ └─────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────┤
│ Version Progression History (if applicable)             │
│ ┌─────────────────────────────────────────────────────┐ │
│ │ Clean → Gray → Aggressive → Forbidden               │ │
│ │ Timeline visualization with dates                    │ │
│ └─────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 3.1 IP Header Card
```typescript
Component: IPHeaderCard

Layout:
- Large IP display (2xl font, monospace)
- Country flag + name + device icon
- ISP information (if available)
- Risk score badge (large, prominent)
- Status badge (large, prominent)
- Date information
- Action dropdown (top-right)

Quick Actions Menu:
- Move to Whitelist
- Move to Graylist
- Move to Blacklist
- Reset Risk Score
- Reset Version Progression (if enabled)
- Bypass Version Control (24h)
- Block All Traffic
- Export IP Data
- Delete IP Record (with confirmation)
```

#### 3.2 Activity Tab
```typescript
Component: IPActivityTab

Visit Timeline (Vertical):
- Chronological list (newest first)
- Each visit shows:
  * Timestamp
  * Page visited
  * Referrer
  * User Agent (truncated, expandable)
  * Actions taken during visit
  * Version shown (if version system enabled)
- Infinite scroll (lazy load)
- Filter by date range

Risk Score History Chart:
- Line chart showing risk score over time
- X-Axis: Date
- Y-Axis: Risk Score (0-100)
- Color zones (background):
  * 0-29: Light green
  * 30-49: Light yellow
  * 50-79: Light orange
  * 80-100: Light red
- Markers: Show events that changed score
- Hover: Show exact score + reason for change
```

#### 3.3 Risk Analysis Tab
```typescript
Component: RiskAnalysisTab

Layout:
┌─────────────────────────────────────────────────┐
│ Risk Score Breakdown                            │
│ ┌──────────────┬──────────────┬──────────────┐  │
│ │ Base Score   │ Bot Score    │ Spam Score   │  │
│ │ 45 (Medium)  │ 32 (Medium)  │ 87 (Critical)│  │
│ └──────────────┴──────────────┴──────────────┘  │
├─────────────────────────────────────────────────┤
│ Risk Factors (List with scores)                 │
│ ✓ Multiple form submissions (15%)               │
│ ✓ High spam score (25%)                         │
│ ✓ Blacklist matches (20%)                       │
│ ✓ Suspicious behavior patterns (15%)            │
│ ✓ Geographic risk (5%)                          │
├─────────────────────────────────────────────────┤
│ Triggered Rules (List)                          │
│ - "High Risk Auto-Blacklist" (Priority 10)      │
│ - "Spam Pattern Detection" (Priority 5)         │
├─────────────────────────────────────────────────┤
│ Manual Override                                 │
│ [Set Custom Risk Score] [Add Note] [Override]   │
└─────────────────────────────────────────────────┘
```

#### 3.4 Forms Tab
```typescript
Component: FormSubmissionsTab

Table:
- All form submissions from this IP
- Columns:
  * Date/Time
  * Form Name
  * Fields Count
  * Spam Score
  * Status (Accepted/Blocked)
  * Action Taken
- Row Actions:
  * View Full Submission (modal)
  * Mark as Spam (if not already)
  * Mark as Legitimate (if spam)
  * Report False Positive
```

#### 3.5 Notes Tab
```typescript
Component: IPNotesTab

Features:
- Add new note (text area + submit)
- Notes list (chronological, newest first)
- Each note shows:
  * Timestamp
  * Author (admin user)
  * Content
  * Edit/Delete buttons (own notes only)
- Rich text support (basic formatting)
- @mentions (tag other admins)
```

---

## 4. Auto Rules Dashboard

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header                           [+ Yeni Kural Oluştur] │
├─────────────────────────────────────────────────────────┤
│ Rules List (sortable by priority)                       │
│ ┌───────────────────────────────────────────────────┐   │
│ │ [Toggle] Rule Name                  [Priority: 10]│   │
│ │ Description                                        │   │
│ │ Conditions: IF (risk_score > 80) AND (...)        │   │
│ │ Action: Blacklist                                  │   │
│ │ Stats: 45 matches today | 1,234 total             │   │
│ │ [Edit] [Test] [Duplicate] [Delete]                │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Rule Performance Stats                                  │
│ [Chart showing rule matches over time]                  │
└─────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 4.1 Rule Card
```typescript
Component: RuleCard

Layout:
- Toggle switch (active/inactive) - left side
- Rule name (large, bold)
- Priority badge (right side)
- Description (gray text, smaller)
- Conditions section:
  * Human-readable format
  * Syntax-highlighted
  * Collapsible if long
- Action badge (color-coded)
- Statistics (small cards):
  * Matches today
  * Total matches
  * Last triggered
- Action buttons (bottom right):
  * Edit (opens modal)
  * Test (opens test modal)
  * Duplicate (creates copy)
  * Delete (with confirmation)

Hover Effect: Slight shadow, border color change
```

#### 4.2 Create/Edit Rule Modal

**Modal Size**: Large (80% viewport width, max 1200px)

**Layout**:
```
┌──────────────────────────────────────────────────────┐
│ Yeni Kural Oluştur                          [X Close]│
├──────────────────────────────────────────────────────┤
│ Step Indicator: [1 Basic] → [2 Conditions] → [3 Action]│
├──────────────────────────────────────────────────────┤
│ STEP 1: Basic Information                            │
│ ┌────────────────────────────────────────────────┐   │
│ │ Rule Name: [_____________________________]    │   │
│ │ Description: [____________________________]    │   │
│ │                                                │   │
│ │ Priority: [Slider: 1 ────●──── 10]            │   │
│ │ Status: (○) Active  (○) Inactive              │   │
│ └────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────┤
│ STEP 2: Condition Builder                            │
│ ┌────────────────────────────────────────────────┐   │
│ │ IF [ Condition Group 1 ]                       │   │
│ │    ┌────────────────────────────────────────┐  │   │
│ │    │ risk_score [>] [80]           [Remove] │  │   │
│ │    └────────────────────────────────────────┘  │   │
│ │    [AND/OR ▼]                                  │   │
│ │    ┌────────────────────────────────────────┐  │   │
│ │    │ spam_score [>] [70]           [Remove] │  │   │
│ │    └────────────────────────────────────────┘  │   │
│ │    [+ Add Condition]                           │   │
│ │                                                │   │
│ │ [+ Add Condition Group]                        │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ Available Conditions (Drag & Drop or Click to Add): │
│ [risk_score] [spam_score] [bot_score] [visit_count]│
│ [form_submissions] [country] [device_type]          │
│ [list_status] [custom_field]                        │
├──────────────────────────────────────────────────────┤
│ STEP 3: Action Configuration                         │
│ ┌────────────────────────────────────────────────┐   │
│ │ Action Type: [Dropdown: Blacklist ▼]          │   │
│ │ Options:                                       │   │
│ │ - Whitelist                                    │   │
│ │ - Graylist                                     │   │
│ │ - Blacklist                                    │   │
│ │ - Increment Risk Score                         │   │
│ │ - Send Alert                                   │   │
│ │ - Block Access                                 │   │
│ │ - Custom Script                                │   │
│ │                                                │   │
│ │ Additional Options:                            │   │
│ │ ☑ Send Email Notification                     │   │
│ │ ☐ Log to External System                      │   │
│ │ ☐ Trigger Webhook                             │   │
│ └────────────────────────────────────────────────┘   │
├──────────────────────────────────────────────────────┤
│ [Cancel] [← Previous] [Next →] [Test Rule] [Save]   │
└──────────────────────────────────────────────────────┘
```

**Condition Builder Details**:
```typescript
Component: ConditionBuilder

Features:
- Drag-and-drop interface (optional)
- Click-to-add conditions
- Nested condition groups (AND/OR logic)
- Visual parentheses display
- Condition templates (common patterns)
- Real-time validation
- Preview of matching IPs count

Condition Types:
1. Numeric Comparisons
   - Fields: risk_score, spam_score, bot_score, visit_count, form_submissions
   - Operators: >, <, >=, <=, =, !=
   - Value: Number input
   
2. String Comparisons
   - Fields: country, device_type, ip, user_agent
   - Operators: equals, not equals, contains, starts with, ends with, regex
   - Value: Text input
   
3. List Comparisons
   - Fields: list_status
   - Operators: is, is not, in, not in
   - Value: Multi-select dropdown
   
4. Boolean
   - Fields: is_bot, is_verified_bot, is_spam
   - Value: True/False toggle

Visual Representation:
IF ( condition1 AND condition2 )
   OR ( condition3 AND condition4 )
THEN action

Color Coding:
- AND: Blue connector
- OR: Orange connector
- Condition groups: Light gray boxes
- Active conditions: White background
- Invalid conditions: Red border + error message
```

#### 4.3 Test Rule Modal
```typescript
Component: RuleTestModal

Layout:
┌──────────────────────────────────────────────────────┐
│ Test Rule: "High Risk Auto-Blacklist"      [X Close] │
├──────────────────────────────────────────────────────┤
│ Test Against:                                        │
│ (○) Single IP: [Enter IP _____________] [Test]      │
│ (○) All IPs in database                  [Test All] │
│ (○) Random Sample (100 IPs)              [Test]     │
├──────────────────────────────────────────────────────┤
│ Test Results:                                        │
│ ┌────────────────────────────────────────────────┐   │
│ │ Total IPs Tested: 1,234                        │   │
│ │ Matches: 45 (3.6%)                             │   │
│ │ False Positives: 2 (4.4% of matches)           │   │
│ │ Performance: 23ms avg                          │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ Matched IPs (preview):                               │
│ ┌────────────────────────────────────────────────┐   │
│ │ IP            Risk  Action      Reason         │   │
│ │ 203.0.113.42  87   Blacklist   risk>80        │   │
│ │ 198.51.100.5  92   Blacklist   risk>80        │   │
│ └────────────────────────────────────────────────┘   │
│                                                      │
│ [Export Results] [Apply to Matched IPs] [Close]     │
└──────────────────────────────────────────────────────┘
```

---

## 5. Bot Detection Dashboard

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header: Bot Detection                                    │
├─────────────────────────────────────────────────────────┤
│ Stats Cards (4 columns)                                 │
│ [Total Bots] [Verified] [Fake] [Detection Rate]        │
├─────────────────────────────────────────────────────────┤
│ ┌──────────────────────┐ ┌──────────────────────────┐  │
│ │ Bot Type Distribution│ │ Verification Status      │  │
│ │ (Pie Chart)          │ │ (Donut Chart)            │  │
│ └──────────────────────┘ └──────────────────────────┘  │
├─────────────────────────────────────────────────────────┤
│ Tabs: [Recent Bots] [Allowed Bots] [Blocked Bots]      │
├─────────────────────────────────────────────────────────┤
│ Recent Bots Table                                       │
│ ┌───────────────────────────────────────────────────┐   │
│ │ IP | Bot Type | Verified | Hostname | Actions    │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Manual Actions Panel                                    │
│ [Add to Allowed Bots] [Report False Positive]          │
└─────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 5.1 Bot Stats Cards
```typescript
Component: BotStatsCards

Cards:
1. Total Bot Visits
   - Icon: 🤖
   - Color: Blue
   - Value: Count
   - Subtitle: "Last 7 days"
   
2. Verified Bots
   - Icon: ✅
   - Color: Green
   - Value: Count
   - Subtitle: "DNS validated"
   - Percentage: (verified / total)
   
3. Fake Bots
   - Icon: ❌
   - Color: Red
   - Value: Count
   - Subtitle: "DNS validation failed"
   - Percentage: (fake / total)
   
4. Detection Rate
   - Icon: 📊
   - Color: Purple
   - Value: Percentage
   - Subtitle: "Accuracy score"
```

#### 5.2 Recent Bots Table
```typescript
Component: BotDetectionTable

Columns:
1. IP Address (monospace, clickable → IP detail page)
2. Bot Type (badge with icon)
   - Googlebot
   - Bingbot
   - YandexBot
   - etc.
3. Verified Status
   - ✅ Verified (green)
   - ❌ Fake (red)
   - ⏳ Pending (yellow)
4. Hostname (if available)
5. Last Seen (relative time)
6. Visit Count (sortable)
7. Actions
   - [View Details]
   - [Re-verify DNS]
   - [Add to Allowed] (if verified)
   - [Block] (if fake)

Filters:
- Bot Type (multi-select)
- Verification Status (multi-select)
- Date Range

Bulk Actions:
- Select multiple bots
- Bulk verify
- Bulk allow
- Bulk block
```

#### 5.3 Allowed Bots Management
```typescript
Component: AllowedBotsTab

Features:
- List of pre-approved bot patterns
- Add custom bot patterns
- Each entry shows:
  * Bot name
  * User-Agent pattern (regex)
  * DNS verification required (toggle)
  * Hostname pattern
  * Match count (statistics)
  * Actions: Edit, Delete

Common Bots (Pre-configured):
- Googlebot (crawl-*.googlebot.com)
- Bingbot (*.search.msn.com)
- YandexBot (*.yandex.ru)
- etc.

Add Custom Bot Form:
┌────────────────────────────────────────┐
│ Bot Name: [_____________________]      │
│ User-Agent Pattern: [____________]     │
│ ☑ Require DNS Verification            │
│ Hostname Pattern: [_________________]  │
│ [Cancel] [Add]                         │
└────────────────────────────────────────┘
```

---

## 6. Spam Control Dashboard

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header: Spam Control                                     │
├─────────────────────────────────────────────────────────┤
│ Stats Cards (4 columns)                                 │
│ [Total Submissions] [Spam] [Legitimate] [Spam Rate]     │
├─────────────────────────────────────────────────────────┤
│ Detection Methods Cards (3 columns)                     │
│ [Time-based] [Duplicate Data] [Frequency Analysis]      │
├─────────────────────────────────────────────────────────┤
│ Tabs: [Recent Spam] [Patterns] [Whitelist/Blacklist]   │
├─────────────────────────────────────────────────────────┤
│ Recent Spam Table                                       │
│ ┌───────────────────────────────────────────────────┐   │
│ │ IP | Form | Score | Action | Date | Actions      │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Manual Actions Panel                                    │
│ [Report Spam] [Mark False Positive] [Update Patterns]  │
└─────────────────────────────────────────────────────────┘
```

### Component Specifications

#### 6.1 Spam Patterns Management
```typescript
Component: SpamPatternsTab

Layout:
┌──────────────────────────────────────────────────┐
│ Spam Detection Patterns                          │
├──────────────────────────────────────────────────┤
│ [+ Add New Pattern]                              │
│                                                  │
│ Pattern 1: Email Regex                           │
│ ┌────────────────────────────────────────────┐   │
│ │ Type: Email Pattern                        │   │
│ │ Regex: ^[a-z0-9]+@[a-z0-9]+\.[a-z]+$      │   │
│ │ Score: 15 (if matches)                     │   │
│ │ Status: Active                             │   │
│ │ Matches: 234 total                         │   │
│ │ [Edit] [Delete] [Test]                     │   │
│ └────────────────────────────────────────────┘   │
│                                                  │
│ Pattern 2: Suspicious Keywords                   │
│ ┌────────────────────────────────────────────┐   │
│ │ Type: Keyword Blacklist                    │   │
│ │ Keywords: viagra, cialis, casino, etc.     │   │
│ │ Score: 50 (if matches)                     │   │
│ │ Status: Active                             │   │
│ │ Matches: 1,045 total                       │   │
│ │ [Edit] [Delete] [Test]                     │   │
│ └────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────┘

Add Pattern Modal:
┌──────────────────────────────────────────────────┐
│ Add Spam Detection Pattern            [X Close] │
├──────────────────────────────────────────────────┤
│ Pattern Name: [_____________________]           │
│                                                  │
│ Pattern Type: [Dropdown ▼]                      │
│ - Email Pattern (regex)                         │
│ - Keyword Blacklist                             │
│ - Phone Number Pattern                          │
│ - URL Pattern                                   │
│ - Custom Regex                                  │
│                                                  │
│ Pattern Content: [_____________________]         │
│                                                  │
│ Spam Score: [Slider: 0 ────●──── 100]          │
│                                                  │
│ Test Pattern:                                    │
│ Input: [_____________________]                   │
│ [Test] → Result: Match / No Match               │
│                                                  │
│ [Cancel] [Save]                                  │
└──────────────────────────────────────────────────┘
```

#### 6.2 Whitelist/Blacklist Management
```typescript
Component: SpamListsTab

Two Columns Layout:
┌─────────────────────┬─────────────────────┐
│ Email Whitelist     │ Email Blacklist     │
├─────────────────────┼─────────────────────┤
│ [+ Add Email]       │ [+ Add Email]       │
│                     │                     │
│ user@example.com    │ spam@bad.com        │
│ [Remove]            │ [Remove]            │
│                     │                     │
│ *@trusted.com       │ *@spam.ru           │
│ [Remove]            │ [Remove]            │
│                     │                     │
└─────────────────────┴─────────────────────┘

Domain Patterns:
┌─────────────────────┬─────────────────────┐
│ Trusted Domains     │ Blocked Domains     │
├─────────────────────┼─────────────────────┤
│ [+ Add Domain]      │ [+ Add Domain]      │
│                     │                     │
│ trusted.com         │ spam-domain.ru      │
│ [Remove]            │ [Remove]            │
│                     │                     │
└─────────────────────┴─────────────────────┘

IP Patterns:
┌─────────────────────┬─────────────────────┐
│ Trusted IPs         │ Blocked IPs         │
├─────────────────────┼─────────────────────┤
│ [+ Add IP/Range]    │ [+ Add IP/Range]    │
│                     │                     │
│ 203.0.113.0/24      │ 198.51.100.0/24     │
│ [Remove]            │ [Remove]            │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

---

## 7. Version Progression System (NEW FEATURE)

### Settings Page: `/dashboard/settings/versions`

### Layout Structure
```
┌─────────────────────────────────────────────────────────┐
│ Header: Version Progression Settings                    │
├─────────────────────────────────────────────────────────┤
│ Global Settings (Master Toggle)                         │
│ ┌───────────────────────────────────────────────────┐   │
│ │ [Toggle ON/OFF] Enable Version Progression System │   │
│ │                                                    │   │
│ │ When enabled, visitors will see different page    │   │
│ │ versions based on their behavior and risk profile. │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Version Sequence Configuration                          │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Default Sequence: [Drag to Reorder]               │   │
│ │                                                    │   │
│ │ 1. [Clean/White] ────→ 2. [Gray] ────→           │   │
│ │    3. [Aggressive/Black] ────→ 4. [Forbidden]     │   │
│ │                                                    │   │
│ │ [+ Add Custom Version] [Reset to Default]         │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Version Settings (Expandable Sections)                  │
├─────────────────────────────────────────────────────────┤
│ ▼ Clean/White Version                                   │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Cooldown Period: [Dropdown ▼] or [Custom Input]  │   │
│ │ Presets:                                          │   │
│ │ - 5 minutes                                       │   │
│ │ - 30 minutes                                      │   │
│ │ - 1 hour                                          │   │
│ │ - 6 hours                                         │   │
│ │ - 12 hours                                        │   │
│ │ - 24 hours                                        │   │
│ │ - Infinite (never progress)                       │   │
│ │ - Custom: [__] hours [__] minutes                │   │
│ │                                                   │   │
│ │ Max Views Before Progression: [__] (0 = unlimited)│   │
│ │                                                   │   │
│ │ Auto-Progress Conditions:                         │   │
│ │ ☑ High risk score (>50)                          │   │
│ │ ☑ Multiple spam attempts                         │   │
│ │ ☐ Fake bot detection                             │   │
│ │ ☐ Custom rule trigger                            │   │
│ └───────────────────────────────────────────────────┘   │
│                                                         │
│ ▼ Gray Version (Same structure as above)                │
│ ▼ Aggressive/Black Version (Same structure)             │
├─────────────────────────────────────────────────────────┤
│ End-of-Sequence Action                                  │
│ ┌───────────────────────────────────────────────────┐   │
│ │ When visitor reaches end of sequence:             │   │
│ │ (○) Block all access (403 Forbidden)              │   │
│ │ (○) Redirect to URL: [__________________]         │   │
│ │ (○) Show custom message                           │   │
│ │ (○) Reset to Clean version                        │   │
│ │ (○) Continue showing Aggressive version           │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Advanced Filters (Optional)                             │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Time-Based Filtering:                             │   │
│ │ ☐ Apply different rules by time of day           │   │
│ │   Business Hours: [Clean], Others: [Gray]        │   │
│ │                                                   │   │
│ │ Country-Based Filtering:                          │   │
│ │ ☐ Apply different rules by country               │   │
│ │   Trusted Countries: [US, UK] → Clean            │   │
│ │   Others → Gray                                   │   │
│ │                                                   │   │
│ │ Device-Based Filtering:                           │   │
│ │ ☐ Apply different rules by device type           │   │
│ │   Mobile: [Clean], Desktop: [Gray]               │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ Manual Controls                                         │
│ ┌───────────────────────────────────────────────────┐   │
│ │ Reset All IPs: [Reset]                            │   │
│ │ (Clears version history for all IPs)              │   │
│ │                                                   │   │
│ │ Bypass List:                                      │   │
│ │ [+ Add IP to Bypass]                              │   │
│ │ IPs in bypass list always see Clean version      │   │
│ └───────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────┤
│ [Cancel] [Save Settings] [Save & Test]                  │
└─────────────────────────────────────────────────────────┘
```

### Dashboard Widget: Version Statistics

**Location**: Add to Traffic Overview Dashboard

```typescript
Component: VersionProgressionWidget

Layout:
┌──────────────────────────────────────────────────┐
│ Version Progression Summary (Last 7 Days)        │
├──────────────────────────────────────────────────┤
│ ┌────────────┬────────────┬────────────────────┐ │
│ │ Clean      │ Gray       │ Aggressive         │ │
│ │ 1,234 IPs  │ 456 IPs    │ 78 IPs             │ │
│ │ (70%)      │ (26%)      │ (4%)               │ │
│ └────────────┴────────────┴────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Progression Flow (Sankey Diagram or Bar Chart)   │
│                                                  │
│ Clean ─────→ Gray (15%)                          │
│       ─────→ Stay (85%)                          │
│                                                  │
│ Gray ─────→ Aggressive (20%)                     │
│      ─────→ Stay (80%)                           │
├──────────────────────────────────────────────────┤
│ Recent Progressions (Last 10)                    │
│ [IP] [Clean→Gray] [Reason] [Time]               │
│ [IP] [Gray→Aggr] [Reason] [Time]                │
├──────────────────────────────────────────────────┤
│ [View Full Statistics] [Manage Settings]         │
└──────────────────────────────────────────────────┘
```

### IP Detail Page: Version History Tab

```typescript
Component: VersionHistoryTab

Layout:
┌──────────────────────────────────────────────────┐
│ Version Progression Timeline                     │
├──────────────────────────────────────────────────┤
│ ┌──────────────────────────────────────────────┐ │
│ │                   Current                    │ │
│ │ [Aggressive] ← Currently Showing             │ │
│ │     ↑                                        │ │
│ │     │ Progressed: 2 hours ago                │ │
│ │     │ Reason: Risk score increased (75)      │ │
│ │     │ Cooldown: 6 hours                      │ │
│ │                                              │ │
│ │ [Gray]                                       │ │
│ │     ↑                                        │ │
│ │     │ Progressed: 1 day ago                  │ │
│ │     │ Reason: Multiple spam submissions      │ │
│ │     │ Duration: 22 hours                     │ │
│ │                                              │ │
│ │ [Clean] (Initial)                            │ │
│ │     First seen: 2 days ago                   │ │
│ │     Duration: 1 day, 2 hours                 │ │
│ └──────────────────────────────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Version Statistics                               │
│ ┌────────────┬────────────┬────────────────────┐ │
│ │ Clean      │ Gray       │ Aggressive         │ │
│ │ 48 views   │ 15 views   │ 3 views            │ │
│ │ 1d 2h      │ 22h        │ 2h                 │ │
│ └────────────┴────────────┴────────────────────┘ │
├──────────────────────────────────────────────────┤
│ Manual Actions                                   │
│ [Reset to Clean] [Bypass (24h)] [Block]         │
└──────────────────────────────────────────────────┘
```

---

## 📋 Component Library Specifications

### Reusable Components

#### 1. StatCard
```typescript
interface StatCardProps {
  title: string;
  value: string | number;
  subtitle: string;
  color: 'blue' | 'green' | 'purple' | 'red' | 'yellow' | 'orange';
  icon: string;
  trend?: {
    value: number;
    direction: 'up' | 'down';
  };
  onClick?: () => void;
}
```

#### 2. DataTable
```typescript
interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationConfig;
  filters?: FilterConfig[];
  sortable?: boolean;
  selectable?: boolean;
  actions?: RowAction<T>[];
  onRowClick?: (row: T) => void;
}
```

#### 3. Modal
```typescript
interface ModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  size?: 'small' | 'medium' | 'large' | 'full';
  children: React.ReactNode;
  footer?: React.ReactNode;
}
```

#### 4. Badge
```typescript
interface BadgeProps {
  text: string;
  color: 'green' | 'yellow' | 'red' | 'gray' | 'blue' | 'purple';
  size?: 'small' | 'medium' | 'large';
  icon?: string;
}
```

#### 5. TimelineItem
```typescript
interface TimelineItemProps {
  timestamp: string;
  title: string;
  description?: string;
  icon?: string;
  color?: string;
  expanded?: boolean;
}
```

#### 6. ConditionBuilder
```typescript
interface ConditionBuilderProps {
  conditions: ConditionGroup[];
  onChange: (conditions: ConditionGroup[]) => void;
  availableFields: Field[];
  operators: Operator[];
}
```

---

## 🎯 Implementation Priority

### Phase 1: Quick Fixes (UI-Only Changes)
1. Fix Bot Detection API endpoint call (`/summary` → `/stats`)
2. Fix Spam Control API endpoint call (`/summary` → `/form-spam/stats`)

### Phase 2: Dashboard Enhancements (High Impact, Medium Effort)
1. Traffic Overview: Add charts (Real-Time, Risk Distribution)
2. Traffic Overview: Add live feed component
3. IP Management: Make "View Details" functional

### Phase 3: New Pages (High Impact, High Effort)
1. IP Detail Page (complete design above)
2. Auto Rules Builder Modal (complete design above)

### Phase 4: Feature Improvements (Medium Impact, Medium Effort)
1. Bot Detection: Add manual verification
2. Spam Control: Add pattern management
3. Add export functionality to all tables

### Phase 5: New Feature (High Impact, High Effort)
1. Version Progression Settings Page
2. Version Progression Dashboard Widget
3. Version History in IP Detail Page

---

## 📊 Chart Library Recommendations

### Recharts (Recommended)
- **Pros**: React-native, TypeScript support, easy customization
- **Usage**: Line charts, area charts, bar charts, pie/donut charts
- **Install**: `npm install recharts`

### Chart.js with react-chartjs-2
- **Pros**: Mature library, extensive options
- **Usage**: Complex charts, real-time updates
- **Install**: `npm install chart.js react-chartjs-2`

### D3.js (Advanced)
- **Pros**: Maximum flexibility, custom visualizations
- **Usage**: Sankey diagrams, complex network graphs
- **Install**: `npm install d3 @types/d3`

---

## 🎨 Design System Tokens

### Spacing
```
xs: 4px
sm: 8px
md: 16px
lg: 24px
xl: 32px
2xl: 48px
```

### Border Radius
```
sm: 4px
md: 8px
lg: 12px
xl: 16px
full: 9999px
```

### Shadows
```
sm: 0 1px 2px rgba(0,0,0,0.05)
md: 0 4px 6px rgba(0,0,0,0.1)
lg: 0 10px 15px rgba(0,0,0,0.1)
xl: 0 20px 25px rgba(0,0,0,0.1)
```

### Typography
```
Headings:
- h1: 3xl (30px), bold
- h2: 2xl (24px), bold
- h3: xl (20px), semibold

Body:
- Default: base (16px), normal
- Small: sm (14px), normal
- Tiny: xs (12px), normal

Monospace: 'Monaco', 'Courier New', monospace
```

---

## ✅ User Approval Checklist

Before implementation, please review and approve:

- [ ] Overall design philosophy and approach
- [ ] Color system and visual language
- [ ] Traffic Overview Dashboard design
- [ ] IP Management Dashboard design
- [ ] IP Detail Page design
- [ ] Auto Rules Dashboard and Modal design
- [ ] Bot Detection Dashboard design
- [ ] Spam Control Dashboard design
- [ ] Version Progression System design
- [ ] Component library specifications
- [ ] Implementation priority order
- [ ] Chart library choice

---

## 🤔 Questions for User

1. **Chart Library**: Do you prefer Recharts (easier) or Chart.js (more powerful)?

2. **Real-Time Updates**: Should dashboards auto-refresh? If yes, what interval (5s, 10s, 30s)?

3. **Version Progression Priority**: Should this be in Phase 5 or moved earlier?

4. **Design Preferences**: Any specific design inspiration or examples you like?

5. **Mobile Responsiveness**: How important is mobile view? (We can adjust priorities)

6. **Accessibility**: Should we add ARIA labels and keyboard navigation?

7. **Animations**: Do you want smooth transitions and loading animations?

---

## 📝 Next Steps

Once you approve this design plan:

1. I will create detailed component specifications
2. Implement UI components one by one
3. Connect to existing APIs (fix endpoint mismatches)
4. Add new API endpoints for Version Progression
5. Test each component thoroughly
6. Deploy incrementally (dashboard by dashboard)

**Estimated Total Time**: 19.5 hours (as previously calculated)
- Phase 1-4: 8.5 hours
- Phase 5 (Version System): 11 hours

---

**Document Status**: ✅ Ready for Review  
**Next Action**: Awaiting user approval and answers to questions above
