#!/bin/bash

echo "🔧 File Browser'ı izole ediyorum..."
echo ""

# 1. Kill existing filebrowser process
echo "📛 Mevcut File Browser prosesini durduruyorum..."
pkill -f filebrowser
sleep 2

# 2. Update Nginx config for file manager (use port 9000)
echo "📝 Nginx config güncelleniyor..."
cat > /etc/nginx/sites-available/dosya.dtektracking.com << 'NGINX_CONFIG'
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
        proxy_pass http://127.0.0.1:9000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        client_max_body_size 2G;
    }
}
NGINX_CONFIG

# 3. Ensure monitor config doesn't have any file paths
echo "📝 Monitor config temizleniyor..."
cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'MONITOR_CONFIG'
server {
    listen 80;
    server_name monitor.dtektracking.com;
    
    # Authentication
    auth_basic "Netdata System Monitor";
    auth_basic_user_file /etc/nginx/.htpasswd_netdata;
    
    # Main proxy to Netdata
    location / {
        proxy_pass http://127.0.0.1:19999;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_buffering off;
        proxy_cache off;
    }
}
MONITOR_CONFIG

# 4. Remove any 00- prefix links
rm -f /etc/nginx/sites-enabled/00-monitor.dtektracking.com

# 5. Ensure proper symlinks
ln -sf /etc/nginx/sites-available/monitor.dtektracking.com /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/dosya.dtektracking.com /etc/nginx/sites-enabled/

# 6. Test and reload Nginx
echo ""
echo "🔄 Nginx test ve reload..."
nginx -t && systemctl reload nginx

# 7. Restart filebrowser on localhost only
echo ""
echo "🚀 File Browser'ı localhost-only modda başlatıyorum..."
cd /home/root/webapp
nohup filebrowser --address 127.0.0.1 --port 9000 --root / > filebrowser.log 2>&1 &
sleep 2

# 8. Check if services are running correctly
echo ""
echo "✅ Servis kontrolleri:"
echo "================================"
echo "File Browser (port 9000):"
netstat -tlnp | grep 9000 || echo "❌ Çalışmıyor"

echo ""
echo "Netdata (port 19999):"
netstat -tlnp | grep 19999 || echo "❌ Çalışmıyor"

echo ""
echo "================================"
echo "✅ DÜZELTME TAMAMLANDI!"
echo "================================"
echo ""
echo "📊 MONITOR PANELİ:"
echo "URL: http://monitor.dtektracking.com"
echo "Kullanıcı: admin"
echo "Şifre: Dtektracking2024!"
echo ""
echo "📁 DOSYA YÖNETİCİSİ:"
echo "URL: https://dosya.dtektracking.com"
echo ""
echo "⚠️ ÖNEMLİ: Tarayıcınızı tamamen kapatıp açın!"
echo "================================"
