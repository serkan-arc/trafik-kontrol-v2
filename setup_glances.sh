#!/bin/bash

echo "🔧 Alternatif monitoring aracı Glances kuruluyor..."
echo ""

# Install Glances
echo "📦 Glances yükleniyor..."
pip3 install glances bottle --upgrade

# Start Glances web server
echo ""
echo "🚀 Glances web server başlatılıyor..."
pkill -f "glances -w" 2>/dev/null
nohup glances -w -B 127.0.0.1 -p 61208 --disable-plugin docker > /dev/null 2>&1 &
sleep 2

# Create Nginx config for Glances
echo ""
echo "📝 Glances için basit erişim oluşturuluyor..."
cat > /etc/nginx/sites-available/glances.dtektracking.com << 'NGINX'
server {
    listen 80;
    server_name glances.dtektracking.com;
    
    location / {
        proxy_pass http://127.0.0.1:61208;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
NGINX

ln -sf /etc/nginx/sites-available/glances.dtektracking.com /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

echo ""
echo "✅ GLANCES HAZIR!"
echo "================================"
echo ""
echo "📊 BASİT MONITORING (Glances):"
echo "http://207.180.204.60:61208"
echo "(Direkt IP üzerinden erişim)"
echo ""
echo "📊 VEYA NETDATA (Düzeltildi):"
echo "https://monitor.dtektracking.com"
echo "Kullanıcı: admin"
echo "Şifre: Dtektracking2024!"
echo ""
echo "🌐 TAVSİYE:"
echo "1. Önce tarayıcı önbelleğini temizleyin"
echo "2. Gizli pencerede açın"
echo "3. Chrome veya Firefox kullanın"
echo ""
echo "Eğer Netdata hala hata veriyorsa,"
echo "Glances'ı kullanabilirsiniz (daha basit)"
echo "================================"
