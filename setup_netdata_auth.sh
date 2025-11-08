#!/bin/bash

echo "🔐 Netdata için kullanıcı/şifre ayarlanıyor..."

# Generate password hash for Netdata
NETDATA_USER="admin"
NETDATA_PASS="Dtektracking2024!"

# Install apache2-utils for htpasswd
apt-get update && apt-get install -y apache2-utils

# Create htpasswd file
htpasswd -bc /etc/netdata/.htpasswd "$NETDATA_USER" "$NETDATA_PASS"

# Update Nginx config for basic auth
cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'NGINX'
server {
    listen 80;
    server_name monitor.dtektracking.com;
    
    # Basic Authentication
    auth_basic "Netdata Monitoring Panel";
    auth_basic_user_file /etc/netdata/.htpasswd;
    
    location / {
        proxy_pass http://localhost:19999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Netdata specific
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_cache off;
        proxy_redirect off;
    }
}
NGINX

# Enable the site
ln -sf /etc/nginx/sites-available/monitor.dtektracking.com /etc/nginx/sites-enabled/

# Test and reload Nginx
nginx -t && systemctl reload nginx

echo "✅ Netdata authentication ayarlandı!"
echo ""
echo "📊 NETDATA ERİŞİM BİLGİLERİ:"
echo "================================"
echo "URL: https://monitor.dtektracking.com"
echo "Kullanıcı: $NETDATA_USER"
echo "Şifre: $NETDATA_PASS"
echo "================================"
