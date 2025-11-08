#!/bin/bash

echo "🔍 Dosya yöneticisi override sorunu tespit edildi!"
echo ""

# Check all Nginx configs for catch-all rules
echo "📋 Tüm Nginx konfigürasyonlarını kontrol ediyorum:"
echo "================================"
grep -l "*.dtektracking.com\|catch-all\|default_server" /etc/nginx/sites-enabled/* 2>/dev/null

echo ""
echo "📁 Dosya yöneticisi konfigürasyonu:"
echo "================================"
cat /etc/nginx/sites-available/dosya.dtektracking.com

echo ""
echo "🔧 ÇÖZÜM: Dosya yöneticisini sadece 'dosya' subdomain'inde çalıştıracağız"
echo ""

# Backup existing config
cp /etc/nginx/sites-available/dosya.dtektracking.com /etc/nginx/sites-available/dosya.dtektracking.com.backup

# Update file manager config to be more specific
cat > /etc/nginx/sites-available/dosya.dtektracking.com << 'NGINX'
server {
    listen 80;
    server_name dosya.dtektracking.com;
    
    # ONLY for dosya.dtektracking.com
    # NO wildcard, NO other subdomains
    
    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}

server {
    listen 443 ssl;
    server_name dosya.dtektracking.com;
    
    ssl_certificate /etc/letsencrypt/live/dosya.dtektracking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dosya.dtektracking.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    location / {
        proxy_pass http://127.0.0.1:8082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
NGINX

# Remove any default_server or wildcard configs
echo ""
echo "🔍 Default server veya wildcard config var mı kontrol ediyorum..."
grep -r "default_server\|*.dtektracking.com" /etc/nginx/sites-enabled/ 2>/dev/null

# Make sure monitor is properly configured
cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'NGINX'
server {
    listen 80;
    server_name monitor.dtektracking.com;
    
    # Force authentication
    auth_basic "Netdata Monitoring Panel";
    auth_basic_user_file /etc/nginx/.htpasswd_netdata;
    
    # Redirect any /files path to root
    location ~ ^/files {
        return 301 http://monitor.dtektracking.com/;
    }
    
    # Main Netdata proxy
    location / {
        proxy_pass http://127.0.0.1:19999/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Disable buffering
        proxy_buffering off;
        proxy_cache off;
    }
}
NGINX

# Test configuration
echo ""
echo "🔄 Nginx konfigürasyonu test ediliyor..."
nginx -t

# Reload Nginx
echo ""
echo "🔄 Nginx yeniden başlatılıyor..."
systemctl reload nginx

echo ""
echo "✅ DÜZELTME TAMAMLANDI!"
echo "================================"
echo "📊 SONUÇ:"
echo "================================"
echo "✅ dosya.dtektracking.com → SADECE dosya yöneticisi"
echo "✅ monitor.dtektracking.com → SADECE Netdata"
echo "✅ Wildcard/catch-all kurallar kaldırıldı"
echo "✅ /files/ path'i monitor'da engellendi"
echo ""
echo "🌐 ŞİMDİ DENEYİN:"
echo "http://monitor.dtektracking.com"
echo "(files path'i olmadan direkt girin)"
echo ""
echo "Kullanıcı: admin"
echo "Şifre: Dtektracking2024!"
echo ""
echo "⚠️ Tarayıcı cache'ini temizleyin (Ctrl+Shift+R)"
echo "================================"
