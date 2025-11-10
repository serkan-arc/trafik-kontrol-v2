# 🌐 ESVELLA Partner Portal

Multi-language partner portal for tracking leads and commissions.

## 🎯 Features

### ✅ Implemented (Phase 1)
- **Multi-Language Support**: English & Turkish with real-time switching
- **Secure Authentication**: JWT-based login system
- **Partner Dashboard**: Stats overview and quick actions
- **Responsive Design**: Mobile-friendly interface
- **Session Management**: Automatic token verification

### ⏳ To Be Implemented (Phase 2)
- **Leads Management**: PII-filtered lead tracking
- **Commissions Tracking**: Commission history and status
- **Performance Analytics**: Charts and metrics
- **Profile Management**: Partner settings

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- PostgreSQL database access
- PM2 (for production)

### Development

```bash
# Install dependencies
npm install

# Setup environment
cp .env.local.example .env.local
# Edit .env.local with your DB credentials

# Run development server
npm run dev

# Access at http://localhost:3002
```

### Production

```bash
# Build
npm run build

# Start with PM2
pm2 start ecosystem.config.js

# Or manual start
npm start
```

---

## 🌍 Multi-Language System

### Supported Languages
- **English** (en)
- **Turkish** (tr)

### How It Works

**Context Provider:**
```tsx
import { I18nProvider } from '@/lib/i18n'

<I18nProvider>
  {children}
</I18nProvider>
```

**Using Translations:**
```tsx
import { useI18n, useTranslation } from '@/lib/i18n'

// Full access to i18n
const { t, locale, setLocale } = useI18n()

// Or just translations
const t = useTranslation()

// Use translations
<h1>{t.dashboard.title}</h1>
```

**Language Switcher:**
```tsx
const { locale, setLocale } = useI18n()

<button onClick={() => setLocale(locale === 'en' ? 'tr' : 'en')}>
  {locale.toUpperCase()}
</button>
```

### Adding New Languages

1. Create translation file: `/lib/i18n/locales/[lang].ts`
2. Import in `/lib/i18n/index.tsx`
3. Add to translations Record
4. Update Locale type

```typescript
// 1. Create /lib/i18n/locales/de.ts
import { Translations } from './en'
export const de: Translations = { ... }

// 2. Update /lib/i18n/index.tsx
import { de } from './locales/de'

export type Locale = 'en' | 'tr' | 'de'

const translations: Record<Locale, Translations> = {
  en,
  tr,
  de  // Add new language
}
```

---

## 🔐 Authentication

### Login Flow

1. **User submits credentials**
   ```typescript
   POST /api/auth/login
   {
     "username": "partner_username",
     "password": "password"
   }
   ```

2. **Server validates partner**
   - Checks `buyers` table
   - Verifies password (bcrypt)
   - Checks `status = 'active'`
   - Checks `portal_active = true`

3. **JWT token generated**
   ```json
   {
     "success": true,
     "token": "jwt_token_here",
     "partner": {
       "buyer_code": "BUYER_001",
       "buyer_name": "Partner Name",
       "email": "partner@example.com"
     }
   }
   ```

4. **Client stores token**
   - localStorage: `partner_token`
   - localStorage: `partner_info`

5. **Protected routes use token**
   ```typescript
   headers: {
     'Authorization': `Bearer ${token}`
   }
   ```

### Token Verification

```typescript
GET /api/auth/verify
Authorization: Bearer jwt_token_here

Response:
{
  "success": true,
  "partner": { ... }
}
```

---

## 📁 Project Structure

```
partner-portal/
├── app/
│   ├── api/
│   │   └── auth/
│   │       ├── login/route.ts
│   │       └── verify/route.ts
│   ├── dashboard/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── layout.tsx
│   └── page.tsx (login)
├── components/
│   ├── layout/
│   │   ├── DashboardHeader.tsx
│   │   └── DashboardNav.tsx
│   └── ui/ (to be added)
├── lib/
│   ├── i18n/
│   │   ├── locales/
│   │   │   ├── en.ts
│   │   │   └── tr.ts
│   │   └── index.tsx
│   ├── auth.ts
│   └── db.ts
├── ecosystem.config.js
├── package.json
└── README.md
```

---

## 🗄️ Database Schema

### Required Tables

**buyers** (from main admin panel):
```sql
CREATE TABLE buyers (
  buyer_code VARCHAR(50) PRIMARY KEY,
  buyer_name VARCHAR(255),
  email VARCHAR(255),
  dashboard_username VARCHAR(100) UNIQUE,
  dashboard_password VARCHAR(255), -- bcrypt hashed
  status VARCHAR(20) DEFAULT 'active',
  portal_active BOOLEAN DEFAULT false,
  portal_last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

## 🔧 Configuration

### Environment Variables

```env
# Database
DB_HOST=postgres.dtekai.com
DB_PORT=5432
DB_NAME=dtektracking
DB_USER=your_user
DB_PASSWORD=your_password

# JWT Secret
JWT_SECRET=your-secret-key-change-in-production

# Next.js
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### PM2 Configuration

```javascript
module.exports = {
  apps: [{
    name: 'partner-portal',
    script: 'npm',
    args: 'start',
    cwd: '/home/root/webapp/partner-portal',
    env: {
      NODE_ENV: 'production',
      PORT: 3002
    }
  }]
}
```

---

## 🎨 Styling

- **Framework**: Tailwind CSS 3.4
- **Dark Mode**: Automatic based on system preference
- **Responsive**: Mobile-first design
- **Icons**: Lucide React

### Theme Colors

```css
/* Primary */
--blue-600: #2563eb
--blue-700: #1d4ed8

/* Status */
--green-600: #16a34a  /* Success */
--red-600: #dc2626     /* Error */
--yellow-600: #ca8a04  /* Warning */
--purple-600: #9333ea  /* Info */
```

---

## 📊 Dashboard Sections

### 1. Header
- Logo & title
- Language switcher (EN/TR)
- Partner info display
- Logout button

### 2. Navigation
- Dashboard
- Leads
- Commissions
- Performance
- Profile

### 3. Dashboard Stats (Mock Data)
- Total Leads: 1,234
- Pending Commissions: €2,450
- Paid Commissions: €15,890
- Conversion Rate: 24.5%

### 4. Quick Actions
- View All Leads
- View Commissions
- Download Report

---

## 🔒 Security Features

### Implemented
- ✅ JWT authentication
- ✅ Password hashing (bcrypt)
- ✅ Token expiration (7 days)
- ✅ Portal access control
- ✅ Protected routes
- ✅ Environment variables

### To Be Added
- Rate limiting
- CSRF protection
- IP whitelisting (optional)
- 2FA support
- Activity logging

---

## 📝 API Endpoints

### Authentication

**Login**
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "string",
  "password": "string"
}

Response 200:
{
  "success": true,
  "token": "jwt_token",
  "partner": { ... }
}

Response 401:
{
  "success": false,
  "error": "Invalid credentials"
}
```

**Verify Token**
```http
GET /api/auth/verify
Authorization: Bearer {token}

Response 200:
{
  "success": true,
  "partner": { ... }
}

Response 401:
{
  "success": false,
  "error": "Token expired"
}
```

---

## 🚦 Status

### Current: Phase 1 Complete ✅
- Multi-language system
- Authentication
- Dashboard layout
- Basic UI components

### Next: Phase 2 (To Be Implemented)
- Leads API & UI
- Commissions API & UI
- Performance analytics
- Profile management

---

## 📞 Support

For issues or questions, contact the development team.

---

## 📄 License

© 2024 ESVELLA. All rights reserved.
