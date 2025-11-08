# Site Kaldırma İşlemi - panel.dtektracking.com

## Tarih: 2025-11-03 04:30

### Kaldırılan Site
- **Domain**: panel.dtektracking.com
- **Port**: 3100
- **PM2 Process İsmi**: server-control-panel (aynı port)

### Yapılan İşlemler

1. ✅ **Veritabanı**: deployed_sites tablosundan kayıt silindi
2. ✅ **Nginx Config**: sites-enabled ve sites-available'dan kaldırıldı
3. ✅ **Nginx**: Test edildi ve reload edildi
4. ℹ️  **PM2**: server-control-panel process'i korundu (port 3100'de çalışıyor)

### Sonuç

**panel.dtektracking.com artık erişilemez:**
- ❌ Nginx üzerinden yönlendirme yok
- ❌ DNS çözümlense bile 404/502 alır
- ✅ Veritabanında kayıt yok
- ✅ SSL sayfasında görünmeyecek

**server-control-panel hala çalışıyor:**
- ✅ PM2'de aktif (port 3100)
- ✅ Direkt IP:port ile erişilebilir (http://207.180.204.60:3100)
- ℹ️  Bu başka bir control panel servisi

### Notlar

- panel.dtektracking.com ile server-control-panel aynı portu kullanıyordu
- Domain kaldırıldı ama altındaki servis korundu
- İleride server-control-panel'i tamamen kaldırmak için:
  ```bash
  pm2 delete server-control-panel
  pm2 save
  ```
