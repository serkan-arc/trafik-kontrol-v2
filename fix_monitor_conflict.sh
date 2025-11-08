#!/bin/bash

echo "🔧 Monitor subdomain çakışması düzeltiliyor..."

# Check what's on port 19999
echo "📊 Port 19999'da çalışan servis:"
docker ps | grep 19999 || echo "Docker container yok"

# Check if file manager is using this
echo ""
echo "📁 Dosya yöneticisi kontrol:"
docker ps --format "table {{.Names}}\t{{.Ports}}" | grep -E "(19999|filebrowser)"

# Kill the docker proxy on 19999 if it's file browser
CONTAINER_ID=$(docker ps -q --filter "publish=19999")
if [ ! -z "$CONTAINER_ID" ]; then
    echo "Docker container durduruluyor: $CONTAINER_ID"
    docker stop $CONTAINER_ID
    docker rm $CONTAINER_ID
fi

# Restart Netdata on the correct port
echo ""
echo "🚀 Netdata yeniden başlatılıyor..."
systemctl restart netdata
sleep 3

# Check if Netdata is running
if systemctl is-active --quiet netdata; then
    echo "✅ Netdata çalışıyor!"
    
    # Check actual listening port
    echo ""
    echo "📊 Netdata dinlediği portlar:"
    ss -tlnp | grep netdata || ss -tlnp | grep 19999
else
    echo "❌ Netdata başlatılamadı. Log kontrol ediliyor..."
    journalctl -u netdata -n 20 --no-pager
fi

# Ensure Nginx is configured correctly
echo ""
echo "🔄 Nginx yeniden yükleniyor..."
systemctl reload nginx

echo ""
echo "================================"
echo "📊 SONUÇ:"
echo "================================"
echo "Monitor URL: http://monitor.dtektracking.com"
echo "Kullanıcı: admin"
echo "Şifre: Dtektracking2024!"
echo ""
echo "Eğer hala dosya yöneticisine yönlendiriyorsa,"
echo "birkaç dakika bekleyin (DNS cache temizlenmesi için)"
echo "================================"
