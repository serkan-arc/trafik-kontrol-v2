#!/bin/bash

echo "🔧 Netdata frontend hatası düzeltiliyor..."
echo ""

# 1. Check Netdata version
echo "📊 Netdata versiyonu kontrol ediliyor:"
netdata -v

echo ""
echo "🔄 Netdata cache temizleniyor..."
# Clear Netdata web cache
rm -rf /var/cache/netdata/
mkdir -p /var/cache/netdata/
chown netdata:netdata /var/cache/netdata/

# 2. Update Netdata configuration for better compatibility
echo ""
echo "📝 Netdata web config güncelleniyor..."
cat > /etc/netdata/netdata.conf << 'CONFIG'
[global]
    run as user = netdata
    web files owner = root
    web files group = root
    bind socket to IP = 127.0.0.1
    default port = 19999
    disconnect idle web clients after seconds = 3600
    enable gzip compression = yes
    gzip compression level = 3

[web]
    mode = static-threaded
    accept a streaming request every seconds = 1
    enable gzip compression = yes
    ssl key = 
    ssl certificate = 
    bind to = 127.0.0.1:19999
    
[registry]
    enabled = no
CONFIG

# 3. Fix CORS and headers in Nginx
echo ""
echo "📝 Nginx CORS ve headers düzeltiliyor..."
cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'NGINX'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name monitor.dtektracking.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name monitor.dtektracking.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/monitor.dtektracking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.dtektracking.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers - Modified for Netdata compatibility
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Basic Authentication
    auth_basic "Netdata System Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd_netdata;
    
    # Netdata proxy with proper headers
    location / {
        proxy_pass http://127.0.0.1:19999;
        proxy_http_version 1.1;
        
        # Important headers for Netdata
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        proxy_set_header X-Forwarded-Server $host;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Disable buffering for real-time data
        proxy_buffering off;
        proxy_request_buffering off;
        proxy_cache off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Static files cache control
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        proxy_pass http://127.0.0.1:19999;
        proxy_cache_bypass $http_pragma $http_authorization;
        add_header Cache-Control "public, max-age=3600";
    }
}
NGINX

# 4. Restart services
echo ""
echo "🔄 Servisler yeniden başlatılıyor..."
systemctl restart netdata
sleep 3
nginx -t && systemctl reload nginx

echo ""
echo "✅ DÜZELTME TAMAMLANDI!"
echo "================================"
echo ""
echo "🌐 TARAYICI TALİMATLARI:"
echo ""
echo "1. Tarayıcı önbelleğini tamamen temizleyin:"
echo "   • Chrome: Ctrl+Shift+Delete → Tüm zamanlar → Önbellek"
echo "   • Firefox: Ctrl+Shift+Delete → Her şey → Önbellek"
echo ""
echo "2. Tarayıcıyı tamamen kapatıp açın"
echo ""
echo "3. Gizli/Özel pencerede deneyin:"
echo "   • Chrome: Ctrl+Shift+N"
echo "   • Firefox: Ctrl+Shift+P"
echo ""
echo "4. Farklı bir tarayıcı deneyin (Chrome, Firefox, Edge)"
echo ""
echo "5. Şu URL'ye gidin:"
echo "   https://monitor.dtektracking.com"
echo "   Kullanıcı: admin"
echo "   Şifre: Dtektracking2024!"
echo ""
echo "================================"
echo "📝 ALTERNATIF ERİŞİM:"
echo ""
echo "Eğer hala sorun yaşıyorsanız, direkt IP ile deneyin:"
echo "https://207.180.204.60:19999"
echo "(SSL uyarısını kabul edin)"
echo "================================"
