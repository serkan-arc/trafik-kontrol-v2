#!/bin/bash

echo "🔧 Glances web modu aktifleştiriliyor..."
echo ""

# 1. Update Glances systemd service to enable web mode
echo "📝 Systemd servisi güncelleniyor..."

cat > /etc/systemd/system/glances-web.service << 'SERVICE'
[Unit]
Description=Glances Web Server
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/bin/glances -w -B 0.0.0.0 -p 61209
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
SERVICE

# 2. Stop old service and start new
echo "🔄 Servis yeniden başlatılıyor..."
systemctl stop glances
systemctl disable glances
systemctl daemon-reload
systemctl enable glances-web
systemctl start glances-web

sleep 3

# 3. Check status
echo ""
echo "✅ Servis durumu:"
systemctl status glances-web --no-pager | head -10

echo ""
echo "📊 Port kontrolü:"
netstat -tlnp | grep 61209

# 4. Test web interface
echo ""
echo "🔍 Web arayüzü testi:"
curl -s http://localhost:61209 2>/dev/null | head -5 | grep -E "(Glances|<title>)"

echo ""
echo "================================================"
echo "✅ GLANCES WEB MODU AKTİF!"
echo "================================================"
echo ""
echo "📊 ERİŞİM:"
echo "https://monitor.dtektracking.com"
echo ""
echo "⚠️ NOT: Tarayıcı önbelleğini temizleyin!"
echo "================================================"
