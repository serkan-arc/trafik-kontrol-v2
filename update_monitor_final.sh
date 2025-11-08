#!/bin/bash

echo "🔧 Monitor panel son düzeltme..."
echo ""

# Update Nginx to point to correct port (61209)
cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'NGINX'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name monitor.dtektracking.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server - Glances on port 61209
server {
    listen 443 ssl;
    server_name monitor.dtektracking.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/monitor.dtektracking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/monitor.dtektracking.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Main proxy to Glances (port 61209)
    location / {
        proxy_pass http://127.0.0.1:61209;
        proxy_http_version 1.1;
        
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Disable buffering
        proxy_buffering off;
        proxy_cache off;
    }
}
NGINX

# Reload Nginx
nginx -t && systemctl reload nginx

# Test local connection
echo ""
echo "🔍 Test ediliyor..."
curl -s http://localhost:61209 | grep -o "<title>.*</title>" && echo "✅ Glances web arayüzü çalışıyor!" || echo "❌ Web arayüzü bulunamadı"

echo ""
echo "================================================"
echo "✅ DÜZELTME TAMAMLANDI!"
echo "================================================"
echo ""
echo "📊 ŞİMDİ DENEYİN:"
echo "https://monitor.dtektracking.com"
echo ""
echo "⚠️ Tarayıcı önbelleğini temizleyin (Ctrl+F5)"
echo "================================================"
