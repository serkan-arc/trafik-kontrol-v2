#!/bin/bash

echo "🔐 Monitor subdomain için SSL sertifikası oluşturuluyor..."
echo ""

# 1. Get SSL certificate from Let's Encrypt
echo "📋 Let's Encrypt SSL sertifikası alınıyor..."
certbot certonly --nginx -d monitor.dtektracking.com \
    --non-interactive \
    --agree-tos \
    --email admin@dtektracking.com \
    --redirect \
    --keep-until-expiring

# 2. Update Nginx config with SSL
echo ""
echo "📝 Nginx config SSL ile güncelleniyor..."

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
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Basic Authentication
    auth_basic "Netdata System Monitoring";
    auth_basic_user_file /etc/nginx/.htpasswd_netdata;
    
    # Netdata proxy
    location / {
        proxy_pass http://127.0.0.1:19999;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_buffering off;
        proxy_cache off;
    }
    
    # Access and error logs
    access_log /var/log/nginx/monitor.dtektracking.com.access.log;
    error_log /var/log/nginx/monitor.dtektracking.com.error.log;
}
NGINX

# 3. Test and reload Nginx
echo ""
echo "🔄 Nginx test ve reload..."
nginx -t && systemctl reload nginx

echo ""
echo "✅ SSL SERTİFİKASI KURULDU!"
echo "================================"
echo ""
echo "🔒 GÜVENLI ERİŞİM:"
echo "URL: https://monitor.dtektracking.com"
echo "Kullanıcı: admin"
echo "Şifre: Dtektracking2024!"
echo ""
echo "✅ ÖZELLİKLER:"
echo "• SSL/TLS şifreleme aktif"
echo "• HTTP otomatik HTTPS'e yönlendiriliyor"
echo "• Güvenlik başlıkları eklendi"
echo "• Let's Encrypt sertifikası (90 gün geçerli)"
echo ""
echo "================================"
