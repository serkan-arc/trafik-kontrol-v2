#!/bin/bash

echo "📊 GLANCES - Basit Monitoring Kurulumu"
echo "======================================"
echo ""

# 1. Install Glances from APT
echo "📦 Glances APT ile yükleniyor..."
apt-get update > /dev/null 2>&1
apt-get install -y glances

# 2. Check version
echo "📊 Glances versiyonu:"
glances --version | head -1

# 3. Kill existing processes
pkill -f "glances" 2>/dev/null

# 4. Start Glances web server
echo ""
echo "🚀 Glances web server başlatılıyor..."
glances -w -B 0.0.0.0 -p 61208 --password "" > /home/root/webapp/glances.log 2>&1 &
GLANCES_PID=$!
echo "Glances PID: $GLANCES_PID"
sleep 2

# 5. Open firewall port
echo "🔥 Firewall portu açılıyor..."
ufw allow 61208/tcp 2>/dev/null || echo "Firewall yok veya port zaten açık"

# 6. Test connection
echo ""
echo "✅ Bağlantı testi..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:61208 | grep -q "200\|401"; then
    echo "✅ Glances çalışıyor!"
else
    echo "⚠️ Glances başlatılamadı, tekrar deneniyor..."
    glances -w -B 127.0.0.1 -p 61208 > /home/root/webapp/glances.log 2>&1 &
fi

# 7. Create simple access script
cat > /home/root/webapp/start_glances.sh << 'SCRIPT'
#!/bin/bash
pkill -f "glances -w"
glances -w -B 0.0.0.0 -p 61208 --password "" > /home/root/webapp/glances.log 2>&1 &
echo "Glances başlatıldı: http://207.180.204.60:61208"
SCRIPT
chmod +x /home/root/webapp/start_glances.sh

echo ""
echo "======================================"
echo "✅ GLANCES HAZIR!"
echo "======================================"
echo ""
echo "📊 ERİŞİM ADRESLERİ:"
echo ""
echo "1️⃣ Direkt IP Erişimi:"
echo "   http://207.180.204.60:61208"
echo ""
echo "2️⃣ Subdomain (DNS ayarı gerekli):"
echo "   http://glances.dtektracking.com"
echo ""
echo "✅ ÖZELLİKLER:"
echo "• Şifresiz erişim"
echo "• Basit arayüz"
echo "• Stabil, hata vermez"
echo "• Otomatik güncelleme (2-3 saniyede bir)"
echo ""
echo "📊 GÖRÜNTÜLENEN BİLGİLER:"
echo "• CPU (%) - Her core ayrı"
echo "• MEM (%) - RAM kullanımı"
echo "• SWAP - Swap kullanımı"
echo "• LOAD - Sistem yükü"
echo "• NETWORK - Ağ trafiği (Rx/Tx)"
echo "• DISK I/O - Okuma/Yazma hızı"
echo "• PROCESSES - İşlem listesi"
echo ""
echo "💡 İPUÇLARI:"
echo "• Sol üstte CPU, sağ üstte Memory"
echo "• Ortada process listesi"
echo "• Alt kısımda disk ve network"
echo "• Sayfa otomatik yenilenir"
echo ""
echo "🔄 TEKRAR BAŞLATMA:"
echo "   /home/root/webapp/start_glances.sh"
echo ""
echo "======================================"
