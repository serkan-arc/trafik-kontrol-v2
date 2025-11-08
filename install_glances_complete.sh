#!/bin/bash

echo "📊 GLANCES - Basit ve Stabil Monitoring Kurulumu"
echo "================================================"
echo ""

# 1. Install Python3 pip if not exists
echo "📦 Python pip yükleniyor..."
apt-get update > /dev/null 2>&1
apt-get install -y python3-pip > /dev/null 2>&1

# 2. Install Glances
echo "📦 Glances yükleniyor..."
pip3 install glances bottle --upgrade --quiet

# 3. Kill any existing Glances process
pkill -f "glances" 2>/dev/null

# 4. Start Glances web server
echo "🚀 Glances web server başlatılıyor..."
nohup glances -w -B 0.0.0.0 -p 61208 --disable-plugin docker --password "" > /home/root/webapp/glances.log 2>&1 &
GLANCES_PID=$!
echo "Glances PID: $GLANCES_PID"
sleep 3

# 5. Create systemd service for auto-start
echo "📝 Systemd servisi oluşturuluyor..."
cat > /etc/systemd/system/glances.service << 'SERVICE'
[Unit]
Description=Glances Web Server
After=network.target

[Service]
Type=simple
User=root
ExecStart=/usr/local/bin/glances -w -B 0.0.0.0 -p 61208 --disable-plugin docker --password ""
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
SERVICE

systemctl daemon-reload
systemctl enable glances
systemctl restart glances

# 6. Create Nginx config with SSL
echo "🔐 SSL ile Nginx config oluşturuluyor..."

# Get SSL certificate
certbot certonly --nginx -d glances.dtektracking.com \
    --non-interactive \
    --agree-tos \
    --email admin@dtektracking.com \
    --redirect \
    --keep-until-expiring 2>/dev/null || echo "SSL sertifikası mevcut"

cat > /etc/nginx/sites-available/glances.dtektracking.com << 'NGINX'
# HTTP to HTTPS redirect
server {
    listen 80;
    server_name glances.dtektracking.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS server
server {
    listen 443 ssl;
    server_name glances.dtektracking.com;
    
    # SSL certificates
    ssl_certificate /etc/letsencrypt/live/glances.dtektracking.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/glances.dtektracking.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    
    # Glances proxy
    location / {
        proxy_pass http://127.0.0.1:61208;
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

# Enable site
ln -sf /etc/nginx/sites-available/glances.dtektracking.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# 7. Test if Glances is running
echo ""
echo "✅ Servis kontrolü..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:61208 | grep -q "200"; then
    echo "✅ Glances çalışıyor!"
else
    echo "⚠️ Glances başlatılıyor..."
    systemctl restart glances
    sleep 2
fi

# 8. Stop Netdata to save resources
echo ""
echo "🛑 Netdata durduruluyor (kaynak tasarrufu için)..."
systemctl stop netdata
systemctl disable netdata

echo ""
echo "================================================"
echo "✅ GLANCES KURULUMU TAMAMLANDI!"
echo "================================================"
echo ""
echo "📊 ERİŞİM BİLGİLERİ:"
echo ""
echo "🌐 HTTPS (Önerilen):"
echo "   https://glances.dtektracking.com"
echo ""
echo "🌐 Alternatif (Direkt IP):"
echo "   http://207.180.204.60:61208"
echo ""
echo "✅ ÖZELLİKLER:"
echo "• Şifre yok, direkt erişim"
echo "• Basit ve temiz arayüz"
echo "• Hata vermiyor, stabil"
echo "• Hafif, az kaynak kullanır"
echo "• Otomatik yenileme"
echo ""
echo "📊 GLANCES'DA NELER VAR:"
echo "• CPU kullanımı (core bazında)"
echo "• RAM ve Swap durumu"
echo "• Disk I/O ve kullanımı"
echo "• Network trafiği"
echo "• Process listesi (CPU/RAM sıralamalı)"
echo "• Sistem yükü ve uptime"
echo "• Sensörler (sıcaklık vb.)"
echo ""
echo "⌨️ KLAVYE KISAYOLLARI:"
echo "• a: Otomatik sıralama"
echo "• c: CPU'ya göre sırala"
echo "• m: Memory'ye göre sırala"
echo "• i: I/O'ya göre sırala"
echo "• p: Process adına göre sırala"
echo "• d: Disk I/O göster/gizle"
echo "• n: Network göster/gizle"
echo "• q: Çıkış"
echo ""
echo "================================================"
