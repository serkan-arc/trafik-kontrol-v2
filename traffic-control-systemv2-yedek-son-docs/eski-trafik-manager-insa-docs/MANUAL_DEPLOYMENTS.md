# Manual Site Deployments - November 3, 2025

## Overview
Three OZPHYZEN sites were manually deployed using PM2 and added to the database.

## Deployed Sites

### 1. ozphyzen-3002
- **Port**: 3002
- **Path**: `/home/root/webapp/ozphyzen-v0-nextjs-BACKUP-3002`
- **PM2 Name**: `ozphyzen-3002`
- **PM2 ID**: 25
- **Type**: Next.js (server mode)
- **Title**: "OZPHYZEN - Eklem Ağrısı ve Kas Rahatlama Masaj Jeli"
- **URL**: http://207.180.204.60:3002
- **Database ID**: 5c334b5b-a214-450a-9c1a-d268692eced6

### 2. my-v0-project (ozphyzen-3004)
- **Port**: 3004
- **Path**: `/home/root/webapp/ozphyzen-3004`
- **PM2 Name**: `my-v0-project`
- **PM2 ID**: 22
- **Type**: Next.js (static export - using serve)
- **Command**: `npx serve@latest out -l 3004`
- **Title**: "OZPHYZEN - Eklem Ağrısı ve Kas Rahatlama Masaj Jeli"
- **URL**: http://207.180.204.60:3004
- **Database ID**: ba17e9c4-bb86-4a93-96c5-9533da12946c
- **Note**: Uses `output: 'export'` - must use serve instead of next start

### 3. ozphyzen-3007
- **Port**: 3007
- **Path**: `/home/root/webapp/ozphyzen-3000-clean`
- **PM2 Name**: `ozphyzen-3007`
- **PM2 ID**: 27
- **Type**: Next.js (server mode)
- **Title**: "OZPHYZEN - Eklem ve Kas Konfor Desteği Masaj Jeli"
- **URL**: http://207.180.204.60:3007
- **Database ID**: 74f5482f-7e12-4d5f-b986-db274dd54158
- **Port History**: Originally 3000 → 3001 (conflict) → 3005 (conflict) → 3007 (final)

## Deployment Steps Used

### For Next.js Server Mode (3002, 3007):
```bash
cd /path/to/project
PORT=XXXX pm2 start "npm" --name "site-name" -- start
```

### For Next.js Static Export (3004):
```bash
cd /path/to/project
pm2 start "npx" --name "site-name" -- serve@latest out -l PORT
```

### Database Entry:
```sql
INSERT INTO deployed_sites (name, file_path, site_type, clean_port, status, pm2_name, pm2_id, ssl_enabled) 
VALUES ('site-name', '/path/to/project', 'nextjs', PORT, 'active', 'pm2-name', PM2_ID, false);
```

## Issues Encountered & Resolutions

### Issue 1: Port Conflicts
- **3000**: Attempted but EADDRINUSE error
- **3001**: Already used by garantor360.com (traffic-control)
- **3005**: Already used by ozphyzenmarketingid1
- **Resolution**: Used ports 3002, 3004, 3007

### Issue 2: Static Export vs Server Mode
- **Problem**: Site with `output: 'export'` failed with `next start`
- **Error**: "next start" does not work with "output: export" configuration
- **Resolution**: Used `npx serve@latest out -l PORT` for static exports

### Issue 3: Sites Not Appearing in Panel
- **Problem**: Manually started PM2 processes weren't in database
- **Resolution**: Added entries to `deployed_sites` table with PM2 info

## PM2 Status
```
│ 22 │ my-v0-project     │ Port 3004 │ online │ Static Export  │
│ 25 │ ozphyzen-3002     │ Port 3002 │ online │ Server Mode    │
│ 27 │ ozphyzen-3007     │ Port 3007 │ online │ Server Mode    │
```

## Notes
- All three sites are OZPHYZEN projects with slightly different content/titles
- No domains assigned (IP:Port only)
- No SSL certificates (domain required for SSL)
- All sites now visible in traffic control panel
- User can add domains later through Site Management page

## Future Improvements
- Automate detection of static export mode in deploy API
- Add validation to prevent port conflicts before deployment
- Create "Import Existing PM2 Process" feature in panel
