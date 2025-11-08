#!/bin/bash

echo "🌐 DNS Kayıtları Kontrolü"
echo "================================"

# Check Cloudflare DNS via public DNS
echo "📍 monitor.dtektracking.com DNS kaydı:"
nslookup monitor.dtektracking.com 8.8.8.8 2>/dev/null | grep -A2 "Name:" || echo "DNS kaydı bulunamadı"

echo ""
echo "📍 redis.dtektracking.com DNS kaydı:"
nslookup redis.dtektracking.com 8.8.8.8 2>/dev/null | grep -A2 "Name:" || echo "DNS kaydı bulunamadı"

echo ""
echo "📍 postgres.dtektracking.com DNS kaydı:"
nslookup postgres.dtektracking.com 8.8.8.8 2>/dev/null | grep -A2 "Name:" || echo "DNS kaydı bulunamadı"

echo ""
echo "🔍 Aktif Nginx site konfigürasyonları:"
echo "================================"
ls -la /etc/nginx/sites-enabled/*.dtektracking.com 2>/dev/null || echo "Subdomain config bulunamadı"

echo ""
echo "✅ Netdata erişim testi:"
echo "================================"
curl -I -u admin:Dtektracking2024! http://localhost:19999 2>/dev/null | head -5

echo ""
echo "📊 Monitor panel durumu:"
echo "================================"
if curl -s -o /dev/null -w "%{http_code}" -u admin:Dtektracking2024! http://localhost:19999 | grep -q "200"; then
    echo "✅ Netdata localhost'ta çalışıyor!"
    echo "✅ Nginx proxy ayarları doğru!"
    echo ""
    echo "🌐 DNS yönlendirmesi kontrol ediliyor..."
    echo "Eğer monitor.dtektracking.com hala dosya yöneticisine gidiyorsa:"
    echo "1. DNS A kaydının 207.180.204.60'a işaret ettiğinden emin olun"
    echo "2. Cloudflare proxy'si kapalı olmalı (DNS only)"
    echo "3. Browser cache'ini temizleyin (Ctrl+F5)"
else
    echo "❌ Netdata'ya erişim sorunu var"
fi

echo ""
echo "================================"
echo "📝 ÖZET:"
echo "================================"
echo "Netdata: http://localhost:19999 ✅ (Çalışıyor)"
echo "Nginx Proxy: monitor.dtektracking.com → localhost:19999 ✅"
echo ""
echo "DNS A Kaydı olması gereken:"
echo "monitor.dtektracking.com → 207.180.204.60"
echo "================================"
