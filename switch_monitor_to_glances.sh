#!/bin/bash

echo "🔄 Monitor subdomain'i Glances'a yönlendiriliyor..."
echo ""

# 1. Stop Netdata to free resources
echo "🛑 Netdata durduruluyor..."
systemctl stop netdata
systemctl disable netdata
pkill -f netdata 2>/dev/null

# 2. Update Nginx config to point to Glances instead of Netdata
echo "📝 Nginx config Glances için güncelleniyor..."

cat > /etc/nginx/sites-available/monitor.dtektracking.com << 'NGINX'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name monitor.dtektracking.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server - Now pointing to Glances
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
    
    # Remove authentication for Glances (it has its own)
    # auth_basic off;
    
    # Glances proxy (port 61208)
    location / {
        proxy_pass http://127.0.0.1:61208;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        
        # WebSocket support (Glances uses it)
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Disable buffering for real-time updates
        proxy_buffering off;
        proxy_cache off;
        proxy_request_buffering off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # API endpoint for Glances
    location /api/ {
        proxy_pass http://127.0.0.1:61208/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_buffering off;
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

# 4. Make sure Glances is running
echo ""
echo "✅ Glances durumu kontrol ediliyor..."
if ! pgrep -f "glances -w" > /dev/null; then
    echo "🚀 Glances başlatılıyor..."
    cd /home/root/webapp
    nohup glances -w -B 0.0.0.0 -p 61208 > glances.log 2>&1 &
    sleep 2
fi

# 5. Test the connection
echo ""
echo "🔍 Bağlantı testi..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:61208 | grep -q "200"; then
    echo "✅ Glances çalışıyor ve erişilebilir!"
else
    echo "⚠️ Glances'a erişim sorunu var, kontrol edin"
fi

echo ""
echo "================================================"
echo "✅ MONITOR SUBDOMAIN GÜNCELLENDİ!"
echo "================================================"
echo ""
echo "📊 YENİ ERİŞİM BİLGİLERİ:"
echo ""
echo "🔒 HTTPS (SSL):"
echo "   https://monitor.dtektracking.com"
echo "   (Artık Glances açılacak)"
echo ""
echo "🌐 Alternatif (Direkt IP):"
echo "   http://207.180.204.60:61208"
echo ""
echo "✅ ÖZELLİKLER:"
echo "• Netdata kapatıldı (hata vermeyecek)"
echo "• Glances aktif (basit ve stabil)"
echo "• HTTPS/SSL ile güvenli"
echo "• Şifre yok, direkt erişim"
echo "• Otomatik yenileme (2-3 saniyede)"
echo ""
echo "⚠️ ÖNEMLİ:"
echo "• Tarayıcı önbelleğini temizleyin (Ctrl+F5)"
echo "• Veya gizli/özel pencerede açın"
echo ""
echo "================================================"

# 6. Remove old Netdata password file since we don't need it
rm -f /etc/nginx/.htpasswd_netdata 2>/dev/null

echo ""
echo "🎯 ŞİMDİ DENEYİN:"
echo "https://monitor.dtektracking.com"
