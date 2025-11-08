#!/bin/bash

echo "🔍 Monitor subdomain kontrolü..."
echo ""

# Check Nginx configs
echo "📋 Nginx konfigürasyonları:"
echo "================================"
ls -la /etc/nginx/sites-enabled/ | grep -E "(monitor|file)"

echo ""
echo "📄 Monitor.dtektracking.com config içeriği:"
echo "================================"
cat /etc/nginx/sites-available/monitor.dtektracking.com

echo ""
echo "🔍 Port 19999 kontrolü (Netdata):"
echo "================================"
netstat -tlnp | grep 19999

echo ""
echo "✅ Netdata servis durumu:"
echo "================================"
systemctl status netdata --no-pager | head -10

echo ""
echo "🔧 Nginx config test:"
nginx -t
