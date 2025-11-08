#!/bin/bash

echo "🔧 Glances sistem servisi olarak başlatılıyor..."
echo ""

# Kill any existing Glances
pkill -f glances 2>/dev/null

# Check if systemd service exists
echo "📊 Glances servisi kontrolü:"
systemctl status glances --no-pager | head -5

echo ""
echo "🚀 Glances servisi başlatılıyor..."
systemctl restart glances

sleep 2

echo ""
echo "✅ Servis durumu:"
systemctl status glances --no-pager | head -10

echo ""
echo "📊 Port kontrolü:"
netstat -tlnp | grep -E "(61209|61208)"

echo ""
echo "🔍 Glances config dosyası:"
cat /etc/glances/glances.conf 2>/dev/null | head -20 || echo "Config dosyası yok"

echo ""
echo "================================================"
echo "ℹ️ BİLGİ:"
echo "================================================"
echo ""
echo "Glances sistem servisi port 61209'da çalışıyor olabilir."
echo ""
echo "🌐 DENEMEK İÇİN:"
echo "1. http://207.180.204.60:61209"
echo "2. http://207.180.204.60:61208" 
echo ""
echo "Eğer bunlar da çalışmazsa basit HTTP server kuralım."
echo "================================================"
