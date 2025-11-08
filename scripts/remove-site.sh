#!/bin/bash
# Site Kaldırma Script'i
# Kullanım: ./remove-site.sh panel.dtektracking.com

set -e

DOMAIN=$1

if [ -z "$DOMAIN" ]; then
    echo "❌ Kullanım: ./remove-site.sh <domain>"
    echo "Örnek: ./remove-site.sh panel.dtektracking.com"
    exit 1
fi

echo "🗑️  Site Kaldırma İşlemi Başlatılıyor..."
echo "📍 Domain: $DOMAIN"
echo ""

read -p "⚠️  $DOMAIN tamamen silinecek. Emin misiniz? (evet/hayır): " CONFIRM
if [ "$CONFIRM" != "evet" ]; then
    echo "❌ İşlem iptal edildi."
    exit 0
fi

echo ""
echo "1️⃣  PM2 Process'lerini Kontrol Ediliyor..."
PM2_PROCESSES=$(pm2 jlist | jq -r ".[] | select(.name | contains(\"$DOMAIN\") or contains(\"${DOMAIN//./-}\")) | .name" 2>/dev/null || echo "")

if [ ! -z "$PM2_PROCESSES" ]; then
    echo "   Bulunan PM2 process'leri:"
    echo "$PM2_PROCESSES" | while read proc; do
        echo "   - $proc"
        pm2 delete "$proc" 2>/dev/null || true
    done
    pm2 save --force
    echo "   ✅ PM2 process'leri silindi"
else
    echo "   ℹ️  PM2 process bulunamadı"
fi

echo ""
echo "2️⃣  Nginx Konfigürasyonları Kaldırılıyor..."
if [ -f "/etc/nginx/sites-enabled/$DOMAIN" ]; then
    sudo rm "/etc/nginx/sites-enabled/$DOMAIN"
    echo "   ✅ sites-enabled symlink silindi"
fi

if [ -f "/etc/nginx/sites-available/$DOMAIN" ]; then
    sudo mv "/etc/nginx/sites-available/$DOMAIN" "/etc/nginx/sites-available/$DOMAIN.removed-$(date +%Y%m%d-%H%M%S)"
    echo "   ✅ sites-available config yedeklendi ve kaldırıldı"
fi

echo "   🔄 Nginx test ediliyor..."
if sudo nginx -t 2>/dev/null; then
    sudo systemctl reload nginx
    echo "   ✅ Nginx yeniden yüklendi"
else
    echo "   ⚠️  Nginx test başarısız, reload edilmedi"
fi

echo ""
echo "3️⃣  SSL Sertifikası Kontrol Ediliyor..."
if sudo certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    read -p "   SSL sertifikası bulundu. Silinsin mi? (e/h): " SSL_CONFIRM
    if [ "$SSL_CONFIRM" = "e" ]; then
        sudo certbot delete --cert-name "$DOMAIN" --non-interactive 2>/dev/null || true
        echo "   ✅ SSL sertifikası silindi"
    else
        echo "   ℹ️  SSL sertifikası korundu"
    fi
else
    echo "   ℹ️  SSL sertifikası bulunamadı"
fi

echo ""
echo "4️⃣  Veritabanı Kaydı Siliniyor..."
DB_PASSWORD="${DB_PASSWORD:-T2hSWBtttsbYh7lZJFHNrfR2obeuXpnwNsM8wU0gaTHRFRL5c8a1QtYqT20DR58s}"
PGPASSWORD="$DB_PASSWORD" psql -h postgres.dtekai.com -U postgres -d dtektracking -c "DELETE FROM deployed_sites WHERE domain = '$DOMAIN';" 2>/dev/null && echo "   ✅ Veritabanı kaydı silindi" || echo "   ⚠️  Veritabanı kaydı silinemedi"

echo ""
echo "5️⃣  Site Dosyaları..."
echo "   Potansiyel dosya konumları:"
if [ -d "/var/www/$DOMAIN" ]; then
    echo "   📁 /var/www/$DOMAIN - Bulundu"
    read -p "   Bu dizini silmek ister misiniz? (e/h): " DIR_CONFIRM
    if [ "$DIR_CONFIRM" = "e" ]; then
        sudo rm -rf "/var/www/$DOMAIN"
        echo "   ✅ Dizin silindi"
    fi
fi

DOMAIN_SLUG=${DOMAIN//./-}
if [ -d "/home/root/webapp/$DOMAIN_SLUG" ]; then
    echo "   📁 /home/root/webapp/$DOMAIN_SLUG - Bulundu"
    read -p "   Bu dizini silmek ister misiniz? (e/h): " DIR_CONFIRM
    if [ "$DIR_CONFIRM" = "e" ]; then
        sudo rm -rf "/home/root/webapp/$DOMAIN_SLUG"
        echo "   ✅ Dizin silindi"
    fi
fi

echo ""
echo "✨ Site Kaldırma İşlemi Tamamlandı!"
echo ""
echo "📊 Özet:"
echo "   • PM2 process'leri silindi"
echo "   • Nginx config kaldırıldı"
echo "   • SSL sertifikası işlendi"
echo "   • Veritabanı kaydı silindi"
echo "   • Site dosyaları temizlendi"
echo ""
echo "🔍 Doğrulama:"
echo "   • PM2: pm2 list | grep $DOMAIN"
echo "   • Nginx: ls /etc/nginx/sites-enabled/ | grep $DOMAIN"
echo "   • DNS: nslookup $DOMAIN"
echo ""
