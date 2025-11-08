# 🚀 DTEK SYSTEM - QUICK REFERENCE
## Last Updated: 2025-11-08 23:23 CET

## 📍 CRITICAL FILE LOCATIONS

### Primary Reference Files
1. **SYSTEM_CONFIG.json** (This directory) - Single Source of Truth
2. **archive/SON_DURUM_RAPORU_2025-11-08_FINAL.md** - Complete System Status

### Key Directories
```
/home/root/webapp/SYSTEM_CONFIG.json              # ⭐ MAIN CONFIG
/home/root/webapp/trafik-manager-v3/archive/      # ⭐ ALL REPORTS
/home/root/Trafic-manager-uretim-dosyasi/         # Dashboard App
/home/root/webapp/n8n-deployment/                 # n8n Setup
/etc/nginx/sites-available/                       # Nginx Configs
/etc/letsencrypt/live/                            # SSL Certificates
```

## 🎯 ACTIVE SERVICES (7)

| # | Service | Port | Domain | Status |
|---|---------|------|--------|--------|
| 1 | Traffic Dashboard | 3001 | dtektracking.com | 🟢 Online |
| 2 | PostgreSQL + pgAdmin | 5432/5050 | postgres.dtektracking.com | 🟢 Active |
| 3 | Redis + Commander | 6379/8081 | redis.dtektracking.com | 🟢 Active |
| 4 | File Browser | 9001 | dosya.dtektracking.com | 🟢 Running |
| 5 | System Monitor | 61209 | monitor.dtektracking.com | 🟢 Running |
| 6 | **n8n Automation** | 5678 | n8n.dtektracking.com | 🟢 Running |
| 7 | Nginx Proxy Manager | 81/8088/4443 | - | 🟢 Running |

## 🔐 SSL CERTIFICATES (7)

All valid until 2026-02-03 or 2026-02-06, auto-renew enabled ✅

1. dtektracking.com
2. postgres.dtektracking.com
3. redis.dtektracking.com
4. dosya.dtektracking.com
5. monitor.dtektracking.com
6. **n8n.dtektracking.com** ⭐ NEW
7. newsalesozphyzenid2.shop

## 🐳 DOCKER CONTAINERS (11)

- n8n-main, n8n-worker-1 to 5 (6 containers)
- pgadmin
- redis-commander, redis-insight
- nginx-proxy-manager, nginx-proxy-manager-db

## 🔗 QUICK ACCESS URLS

| Service | URL | Credentials |
|---------|-----|-------------|
| Dashboard | https://dtektracking.com | - |
| pgAdmin | https://postgres.dtektracking.com | admin@dtektracking.com / AdminDtek2024! |
| Redis | https://redis.dtektracking.com | DtekRedis2024! |
| Files | https://dosya.dtektracking.com | admin / FileBrowser2024! |
| Monitor | https://monitor.dtektracking.com | - |
| **n8n** | https://n8n.dtektracking.com | Create owner on first access |

## 🛠️ EMERGENCY COMMANDS

### Restart All Services
```bash
systemctl restart postgresql@16-main redis-server
pm2 restart all
cd /home/root/webapp/n8n-deployment && docker-compose -f docker-compose-production.yml restart
```

### Check Service Health
```bash
curl -f http://localhost:3001 || echo "Dashboard DOWN"
curl -f http://localhost:5678 || echo "n8n DOWN"
redis-cli -a DtekRedis2024! PING || echo "Redis DOWN"
sudo -u postgres psql -c "SELECT 1;" || echo "PostgreSQL DOWN"
```

### View Logs
```bash
pm2 logs traffic-control-prod --lines 50
journalctl -u postgresql@16-main -n 50
journalctl -u redis-server -n 50
docker logs -f n8n-main
```

## 📊 DASHBOARD STATUS

- SSL Page: 7/7 certificates ✅
- Debug Page: 8/8 port mappings ✅
- PM2 Monitor: 2/2 processes ✅

## 💾 LAST BACKUP

- Date: 2025-11-08 22:01:46
- File: infrastructure_backup_20251108_220146.tar.gz
- Size: 3.0 GB
- Location: /home/root/

## 📝 DETAILED DOCUMENTATION

For complete system documentation, see:
- **Main Report**: `/home/root/webapp/trafik-manager-v3/archive/SON_DURUM_RAPORU_2025-11-08_FINAL.md`
- **n8n Setup**: `/home/root/webapp/n8n-deployment/N8N_KURULUM_BASARILI.md`
- **System Config**: `/home/root/webapp/SYSTEM_CONFIG.json`

---

**System Version**: 3.1.0  
**Last Check**: 2025-11-08 23:23 CET  
**Status**: ✅ ALL SYSTEMS OPERATIONAL
