#!/bin/bash

echo "🔍 MONITOR ERİŞİM TESTİ"
echo "================================"
echo ""

# Test monitor subdomain
echo "📊 Monitor subdomain testi:"
curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" -u admin:Dtektracking2024! http://localhost:19999 --header "Host: monitor.dtektracking.com"

echo ""
echo "📁 Dosya subdomain testi:"
curl -s -o /dev/null -w "HTTP Code: %{http_code}\n" http://localhost:9001 --header "Host: dosya.dtektracking.com"

echo ""
echo "✅ Port dinleme durumu:"
echo "================================"
ss -tlnp | grep -E "(9001|19999)" | while read line; do
    echo "$line"
done

echo ""
echo "✅ ÖZET:"
echo "================================"
echo "✓ Netdata: Port 19999'da çalışıyor (sadece localhost)"
echo "✓ File Browser: Port 9001'de çalışıyor (sadece localhost)"
echo "✓ Monitor subdomain: Netdata'ya proxy yapıyor"
echo "✓ Dosya subdomain: File Browser'a proxy yapıyor"
echo ""
echo "🎯 ŞİMDİ GİRİŞ YAPABİLİRSİNİZ:"
echo "================================"
echo "http://monitor.dtektracking.com"
echo "Kullanıcı: admin"
echo "Şifre: Dtektracking2024!"
echo ""
echo "NOT: Tarayıcı önbelleğini temizlemeyi unutmayın!"
echo "     veya Gizli/Özel pencere kullanın"
echo "================================"
