#!/bin/bash

echo "🔧 Subdomain öncelik sorunu düzeltiliyor..."
echo ""

# Check file manager config
echo "📁 Dosya yöneticisi config kontrolü:"
echo "================================"
cat /etc/nginx/sites-available/dosya.dtektracking.com | grep -E "(server_name|listen|location /)"

echo ""
echo "📊 Monitor config kontrolü:"
echo "================================"
cat /etc/nginx/sites-available/monitor.dtektracking.com | grep -E "(server_name|listen|location /)"

# Make monitor config more specific
echo ""
echo "🔧 Monitor config güncelleniyor (öncelik artırılıyor)..."

cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'NGINX'
# Netdata Monitoring Panel - High Priority
server {
    listen 80;
    listen [::]:80;
    server_name monitor.dtektracking.com;
    
    # Basic Authentication
    auth_basic "Netdata System Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd_netdata;
    
    # Block file manager paths
    location = /files {
        return 404;
    }
    
    location = /filebrowser {
        return 404;
    }
    
    # Netdata proxy
    location / {
        proxy_pass http://127.0.0.1:19999;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # No buffering for real-time data
        proxy_buffering off;
        proxy_cache off;
        proxy_redirect off;
    }
}
NGINX

# Rename to ensure priority (00- prefix loads first)
ln -sf /etc/nginx/sites-available/monitor.dtektracking.com /etc/nginx/sites-enabled/00-monitor.dtektracking.com
rm -f /etc/nginx/sites-enabled/monitor.dtektracking.com

# Test and reload
echo ""
echo "🔄 Nginx test ve reload..."
nginx -t && systemctl reload nginx

echo ""
echo "✅ Güncelleme tamamlandı!"
echo ""
echo "================================"
echo "📊 ÇÖZÜM:"
echo "================================"
echo "1. Monitor config önceliği artırıldı (00- prefix)"
echo "2. IPv6 desteği eklendi"
echo "3. File manager path'leri engellendi"
echo ""
echo "🌐 Şimdi deneyin:"
echo "http://monitor.dtektracking.com"
echo ""
echo "Kullanıcı: admin"
echo "Şifre: Dtektracking2024!"
echo ""
echo "⚠️ NOT: Browser cache'ini temizleyin (Ctrl+F5)"
echo "================================"
