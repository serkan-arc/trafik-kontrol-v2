#!/bin/bash

echo "🔧 Glances web arayüzü düzeltiliyor..."
echo ""

# 1. Fix Nginx configuration for proper static file serving
echo "📝 Nginx config düzeltiliyor..."

cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'NGINX'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name monitor.dtektracking.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server - Glances
server {
    listen 443 ssl;
    server_name monitor.dtektracking.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/monitor.dtektracking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.dtektracking.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers - Modified for Glances
    add_header X-Frame-Options "SAMEORIGIN" always;
    # Remove X-Content-Type-Options for JS/CSS to load properly
    
    # Main proxy to Glances
    location / {
        proxy_pass http://127.0.0.1:61208/;
        proxy_redirect off;
        
        # Important headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-Forwarded-Host $host;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # No buffering
        proxy_buffering off;
        proxy_cache off;
        
        # CORS headers for API
        proxy_hide_header Access-Control-Allow-Origin;
        add_header Access-Control-Allow-Origin * always;
    }
    
    # Static files (JS, CSS, etc)
    location ~ \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot|map)$ {
        proxy_pass http://127.0.0.1:61208;
        proxy_set_header Host $host;
        proxy_cache off;
        add_header Cache-Control "no-cache, must-revalidate";
    }
    
    # API endpoints
    location /api/ {
        proxy_pass http://127.0.0.1:61208/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
    }
    
    # Access and error logs
    access_log /var/log/nginx/monitor.dtektracking.com.access.log;
    error_log /var/log/nginx/monitor.dtektracking.com.error.log debug;
}
NGINX

# 2. Reload Nginx
echo "🔄 Nginx yeniden yükleniyor..."
nginx -t && systemctl reload nginx

# 3. Restart Glances with proper settings
echo ""
echo "🔄 Glances yeniden başlatılıyor..."
pkill -f "glances.*-w"
sleep 1

cd /home/root/webapp
glances -w -B 0.0.0.0 -p 61208 --refresh 2 > glances.log 2>&1 &
echo "Glances PID: $!"

sleep 2

# 4. Test access
echo ""
echo "🔍 Test ediliyor..."
echo ""
echo "Direkt IP testi:"
curl -s http://localhost:61208 | grep -o "<title>.*</title>" || echo "Başlık bulunamadı"

echo ""
echo "JavaScript dosyası kontrolü:"
curl -I http://localhost:61208/glances.js 2>/dev/null | head -3

echo ""
echo "================================================"
echo "🌐 ALTERNATİF ÇÖZÜM:"
echo "================================================"
echo ""
echo "Eğer hala beyaz sayfa görüyorsanız:"
echo ""
echo "1️⃣ ÖNCE ŞU ADRESİ DENEYİN (Direkt IP):"
echo "   http://207.180.204.60:61208"
echo "   (Bu çalışıyorsa Nginx proxy sorunu var)"
echo ""
echo "2️⃣ TARAYICI ÖNBELLEĞİ:"
echo "   • Ctrl+Shift+Delete"
echo "   • Tüm önbelleği temizleyin"
echo "   • Tarayıcıyı kapatıp açın"
echo ""
echo "3️⃣ FARKLI TARAYICI:"
echo "   • Chrome, Firefox veya Edge deneyin"
echo "   • Gizli/Özel pencerede açın"
echo ""
echo "4️⃣ KONSOL HATASI:"
echo "   • F12 ile Developer Tools açın"
echo "   • Console sekmesinde hata var mı bakın"
echo ""
echo "================================================"
