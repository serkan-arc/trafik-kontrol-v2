#!/bin/bash

echo "🔐 Redis Commander için SSL sertifikası oluşturuluyor..."
echo ""

# 1. Get SSL certificate
echo "📋 Let's Encrypt SSL sertifikası alınıyor..."
certbot certonly --nginx -d redis.dtektracking.com \
    --non-interactive \
    --agree-tos \
    --email admin@dtektracking.com \
    --redirect \
    --keep-until-expiring

# 2. Update Redis Commander Nginx config
echo ""
echo "📝 Redis Commander Nginx config güncelleniyor..."

cat > /etc/nginx/sites-available/redis.dtektracking.com << 'NGINX'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name redis.dtektracking.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name redis.dtektracking.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/redis.dtektracking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/redis.dtektracking.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Redis Commander proxy
    location / {
        proxy_pass http://localhost:8081;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_cache_bypass $http_upgrade;
    }
    
    # Access and error logs
    access_log /var/log/nginx/redis.dtektracking.com.access.log;
    error_log /var/log/nginx/redis.dtektracking.com.error.log;
}
NGINX

# 3. Test and reload
echo ""
echo "🔄 Nginx test ve reload..."
nginx -t && systemctl reload nginx

echo ""
echo "================================"
echo "✅ TÜM PANELLERİNİZ HAZIR!"
echo "================================"
echo ""
echo "🔒 SECURE PANEL URLLERİ:"
echo ""
echo "1️⃣ PostgreSQL Yönetimi (pgAdmin):"
echo "   https://postgres.dtektracking.com"
echo "   Email: admin@dtektracking.com"
echo "   Şifre: DTek2024Tracking!"
echo ""
echo "2️⃣ Redis Yönetimi (Redis Commander):"
echo "   https://redis.dtektracking.com"
echo "   (Şifre koruması yok)"
echo ""
echo "3️⃣ Sistem İzleme (Netdata):"
echo "   https://monitor.dtektracking.com"
echo "   Kullanıcı: admin"
echo "   Şifre: Dtektracking2024!"
echo ""
echo "4️⃣ Dosya Yöneticisi (File Browser):"
echo "   https://dosya.dtektracking.com"
echo "   (Login ekranında bilgiler)"
echo ""
echo "✅ Tüm paneller SSL/HTTPS ile güvenli!"
echo "================================"
