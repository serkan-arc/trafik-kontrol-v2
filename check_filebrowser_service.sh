#!/bin/bash

echo "🔍 File Browser servisini detaylı kontrol ediyorum..."
echo ""

# Check what's running on port 8082 and 9000
echo "📊 Port 8082 ve 9000 kontrol:"
echo "================================"
netstat -tlnp | grep -E ":(8082|9000)" 

echo ""
echo "🐳 Docker container'ları:"
echo "================================"
docker ps | grep -E "(filebrowser|file|8082|9000)"

echo ""
echo "📋 Systemd servisleri:"
echo "================================"
systemctl status filebrowser --no-pager 2>/dev/null || echo "Systemd servisi yok"

echo ""
echo "🔧 File Browser prosesleri:"
echo "================================"
ps aux | grep -i filebrowser | grep -v grep

echo ""
echo "📁 File Browser config dosyası var mı:"
echo "================================"
find /root /home -name "*filebrowser*" -type f 2>/dev/null | head -10

# Let's check if there's a wildcard DNS or proxy setting
echo ""
echo "🌐 File Browser'ın dinlediği host/domain:"
echo "================================"
# Check filebrowser database for settings
if [ -f /root/filebrowser.db ]; then
    echo "Filebrowser database bulundu: /root/filebrowser.db"
    # Try to read settings
    sqlite3 /root/filebrowser.db "SELECT * FROM settings;" 2>/dev/null || echo "Database okunamadı"
fi

echo ""
echo "🔧 ÇÖZÜM ÖNERİSİ:"
echo "================================"
echo "File Browser'ı tamamen durdurup sadece dosya subdomain'de çalıştıralım mı?"
echo "1. File Browser'ı durdur"
echo "2. Sadece dosya.dtektracking.com için yeniden başlat"
echo "3. Monitor subdomain'i tamamen izole et"
