#!/bin/bash

echo "🔧 Monitor ve Dosya yöneticisi tamamen ayrılıyor..."
echo ""

# 1. Update monitor config - ONLY Netdata
cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'NGINX'
server {
    listen 80;
    server_name monitor.dtektracking.com;
    
    # Force basic auth
    auth_basic "Netdata Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd_netdata;
    
    location / {
        proxy_pass http://127.0.0.1:19999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_buffering off;
        proxy_cache off;
    }
}
NGINX

# 2. Update file manager config - ONLY File Browser
cat > /etc/nginx/sites-available/dosya.dtektracking.com << 'NGINX'
server {
    listen 80;
    server_name dosya.dtektracking.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name dosya.dtektracking.com;
    
    ssl_certificate /etc/letsencrypt/live/dosya.dtektracking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dosya.dtektracking.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    location / {
        proxy_pass http://127.0.0.1:9001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 2G;
    }
}
NGINX

# 3. Clean up symlinks
rm -f /etc/nginx/sites-enabled/00-monitor.dtektracking.com
ln -sf /etc/nginx/sites-available/monitor.dtektracking.com /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/dosya.dtektracking.com /etc/nginx/sites-enabled/

# 4. Test and reload Nginx
echo "📝 Nginx test..."
nginx -t && systemctl reload nginx

# 5. Start File Browser on a different port (9001) with localhost binding
echo ""
echo "🚀 File Browser başlatılıyor (port 9001, sadece localhost)..."
cd /home/root/webapp
filebrowser -a 127.0.0.1 -p 9001 -r / > /dev/null 2>&1 &
FB_PID=$!
echo "File Browser PID: $FB_PID"
sleep 2

# 6. Verify services
echo ""
echo "✅ Servis Kontrolleri:"
echo "================================"
echo "📊 Netdata (19999):"
ss -tlnp | grep 19999 | head -1

echo ""
echo "📁 File Browser (9001):"
ss -tlnp | grep 9001 | head -1

echo ""
echo "🌐 Nginx Sites:"
ls -la /etc/nginx/sites-enabled/*.dtektracking.com

echo ""
echo "================================"
echo "✅ TAMAMLANDI!"
echo "================================"
echo ""
echo "📊 NETDATA MONITOR:"
echo "http://monitor.dtektracking.com"
echo "Kullanıcı: admin"
echo "Şifre: Dtektracking2024!"
echo ""
echo "📁 DOSYA YÖNETİCİSİ:"
echo "https://dosya.dtektracking.com"
echo ""
echo "⚠️ Tarayıcıyı tamamen kapatıp açın!"
echo "   veya Gizli/Özel pencere kullanın"
echo "================================"
