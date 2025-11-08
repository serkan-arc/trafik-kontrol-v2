#!/bin/bash

echo "🔐 Netdata authentication düzeltiliyor..."

# Create directory if not exists
mkdir -p /etc/netdata

# Create htpasswd file with correct permissions
NETDATA_USER="admin"
NETDATA_PASS="Dtektracking2024!"

# Create password file
htpasswd -bc /etc/nginx/.htpasswd_netdata "$NETDATA_USER" "$NETDATA_PASS"

# Check if Netdata is installed, if not install it
if ! command -v netdata &> /dev/null; then
    echo "📦 Netdata kuruluyor..."
    bash <(curl -Ss https://get.netdata.cloud/kickstart.sh) --dont-wait --disable-telemetry
fi

# Create proper Nginx config
cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'NGINX'
server {
    listen 80;
    server_name monitor.dtektracking.com;
    
    # Basic Authentication
    auth_basic "Netdata System Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd_netdata;
    
    location / {
        proxy_pass http://127.0.0.1:19999;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support for real-time updates
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Disable buffering for real-time data
        proxy_buffering off;
        proxy_cache off;
    }
}
NGINX

# Enable site
ln -sf /etc/nginx/sites-available/monitor.dtektracking.com /etc/nginx/sites-enabled/

# Test and reload
nginx -t && systemctl reload nginx

# Check if Netdata is running
if systemctl is-active --quiet netdata; then
    echo "✅ Netdata çalışıyor"
else
    echo "🚀 Netdata başlatılıyor..."
    systemctl start netdata
    systemctl enable netdata
fi

echo ""
echo "================================"
echo "📊 NETDATA ERİŞİM BİLGİLERİ:"
echo "================================"
echo "URL: http://monitor.dtektracking.com"
echo "Kullanıcı Adı: $NETDATA_USER"
echo "Şifre: $NETDATA_PASS"
echo "================================"
echo ""
echo "Not: SSL sertifikası eklendiğinde https olacak"
