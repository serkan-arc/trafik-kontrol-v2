# 🚀 Traffic Tracking Kurulum Rehberi

## Multi-Domain Traffic Tracking Sistemi

Bu rehber, domain bazlı traffic tracking sisteminin nasıl kurulacağını açıklar.

## 📊 Test Sayfası

Test sayfasına erişmek için:
**URL**: http://207.180.204.60:3001/test-tracking.html

## 🔧 Sitenize Tracking Kodu Ekleme

### Yöntem 1: Basit Script Tag (Önerilen)

HTML sayfanızın `</body>` tag'inden hemen önce şu kodu ekleyin:

```html
<!-- Traffic Tracking Script -->
<script src="http://207.180.204.60:3001/tracking/multi-domain-track.js" 
        data-domain="newsalesozphyzenid2.shop" 
        data-api-url="http://207.180.204.60:3001"></script>
```

**NOT**: `data-domain` değerini kendi domain'iniz ile değiştirin.

### Yöntem 2: Async Script Yükleme

Daha hızlı sayfa yükleme için async versiyonu:

```html
<!-- Async Traffic Tracking -->
<script async>
(function() {
    var script = document.createElement('script');
    script.src = 'http://207.180.204.60:3001/tracking/multi-domain-track.js';
    script.setAttribute('data-domain', 'newsalesozphyzenid2.shop');
    script.setAttribute('data-api-url', 'http://207.180.204.60:3001');
    script.async = true;
    document.body.appendChild(script);
})();
</script>
```

### Yöntem 3: WordPress için

WordPress siteniz varsa, `functions.php` dosyanıza şu kodu ekleyin:

```php
// Traffic Tracking Script
function add_traffic_tracking_script() {
    $domain = $_SERVER['HTTP_HOST'];
    ?>
    <script src="http://207.180.204.60:3001/tracking/multi-domain-track.js" 
            data-domain="<?php echo esc_attr($domain); ?>" 
            data-api-url="http://207.180.204.60:3001"></script>
    <?php
}
add_action('wp_footer', 'add_traffic_tracking_script');
```

## 📈 Tracking Özellikleri

Sistem otomatik olarak şunları takip eder:

1. **Page Views**: Her sayfa görüntülemesi
2. **Visitor Info**: 
   - IP adresi
   - User Agent
   - Referrer
   - Ülke/Şehir (eğer tespit edilebilirse)
3. **Session Tracking**: Oturum ve visitor ID'leri
4. **Form Submissions**: Form gönderimlerini otomatik yakalar
5. **Button/Link Clicks**: `data-track` veya `cta` class'ı olan elementler

## 🔍 Tracking'i Test Etme

1. Test sayfasını açın: http://207.180.204.60:3001/test-tracking.html
2. Browser console'unu açın (F12)
3. Sayfada gezinin ve butonlara tıklayın
4. Console'da tracking log'larını görmelisiniz

## 📊 Traffic Verilerini Görüntüleme

Dashboard'da traffic verilerini görmek için:
1. http://207.180.204.60:3001 adresine gidin
2. Domain Management bölümüne tıklayın
3. Domain'inizi seçin
4. Traffic istatistiklerini görüntüleyin

## 🛠️ Özel Event Tracking

JavaScript ile özel event'ler gönderebilirsiniz:

```javascript
// Özel event gönderme
if (window.trackEvent) {
    window.trackEvent('custom', {
        action: 'button_click',
        category: 'engagement',
        label: 'header_cta',
        value: 100
    });
}

// Satın alma tracking
window.trackEvent('purchase', {
    product_id: '12345',
    product_name: 'Ürün Adı',
    price: 299.99,
    currency: 'TRY'
});

// Video izleme tracking
window.trackEvent('video_play', {
    video_id: 'abc123',
    video_title: 'Video Başlığı',
    duration: 120
});
```

## ⚠️ Önemli Notlar

1. **CORS**: Script cross-domain çalışacak şekilde yapılandırılmıştır
2. **IP Tespiti**: Gerçek IP adresi CloudFlare, proxy headers'larından alınır
3. **Privacy**: Visitor ID'ler localStorage'da saklanır (GDPR uyumlu kullanın)
4. **Performance**: Script async yüklenir ve sayfa performansını etkilemez

## 🐛 Sorun Giderme

### Traffic görünmüyor
1. Browser console'da hata var mı kontrol edin
2. Network tab'ında `/api/track/` isteklerini kontrol edin
3. Domain'in master_domains tablosunda aktif olduğunu doğrulayın

### CORS hatası alıyorum
- API endpoint'i CORS headers ile yapılandırılmıştır
- Eğer hala sorun varsa, browser cache'ini temizleyin

### Form tracking çalışmıyor
- Form'da `submit` event'i engellenmiyor olmalı
- Form input'larında `name` attribute olmalı

## 📞 Destek

Sorunlar için:
- Console log'larını kontrol edin
- Network tab'ında failed request'leri inceleyin
- Database'de domain tabloları oluşturulmuş mı kontrol edin

## 🔄 Güncelleme Notları

- **v1.0**: İlk versiyon - Basit pageview tracking
- **v1.1**: Form submission tracking eklendi
- **v1.2**: Bot detection eklendi
- **v1.3**: Multi-domain support eklendi