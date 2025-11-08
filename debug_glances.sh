#!/bin/bash

echo "🔍 Glances durumu kontrol ediliyor..."
echo ""

# 1. Check if Glances is running
echo "📊 Glances process kontrol:"
ps aux | grep -E "glances.*-w" | grep -v grep

echo ""
echo "📊 Port 61208 dinleniyor mu:"
netstat -tlnp | grep 61208

echo ""
echo "🔍 Glances log kontrolü:"
tail -20 /home/root/webapp/glances.log

echo ""
echo "🔄 Glances'ı yeniden başlatalım..."
pkill -f "glances.*-w"
sleep 1

# Start with more verbose output
echo ""
echo "🚀 Glances web server yeniden başlatılıyor (verbose mode)..."
cd /home/root/webapp
glances -w -B 0.0.0.0 -p 61208 --disable-plugin docker --debug > glances_debug.log 2>&1 &
GPID=$!
echo "Glances PID: $GPID"
sleep 3

echo ""
echo "📊 Yeni log kontrolü:"
tail -10 glances_debug.log

echo ""
echo "🔍 Direkt erişim testi:"
curl -I http://localhost:61208 2>/dev/null | head -10

echo ""
echo "🌐 Web arayüzü testi:"
curl -s http://localhost:61208 | head -20

echo ""
echo "================================================"
echo "SORUN TESPİTİ:"
echo "================================================"
if curl -s http://localhost:61208 | grep -q "Glances"; then
    echo "✅ Glances çalışıyor ama Nginx proxy sorunu olabilir"
    echo "🔧 Nginx error log kontrolü:"
    tail -5 /var/log/nginx/monitor.dtektracking.com.error.log
else
    echo "❌ Glances web arayüzü yüklenmiyor"
    echo "🔧 Bottle framework eksik olabilir"
fi
