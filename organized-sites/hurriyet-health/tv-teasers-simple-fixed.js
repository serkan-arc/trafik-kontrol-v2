// 📺 TV TEASER SIMPLE - TÜM TEASER'LAR TUTARLI KIRMIZI OKLU
class TVTeasersSimpleFixed {
    constructor() {
        this.teasers = [
            {
                insertAfter: '.article-intro',
                teaser: 'Hemen ardından: Prof. Dr. Mehmet Öz\'den özel açıklama...'
            },
            {
                insertAfter: '.quote-box',
                teaser: 'Devamında: Eklem ağrılarının sizi nasıl adım adım yok ettiğinin 5 korkunç aşamasını göreceksiniz...'
            },
            {
                insertAfter: '.freedom-stolen-section',
                teaser: 'İlerleyen bölümlerde: Eklem ağrılarının gerçek nedeni açıklanıyor...'
            },
            {
                insertAfter: '.body-betrayal-section',
                teaser: 'Yakında: Prof. Dr. Öz\'den kritik uyarılar...'
            },
            {
                insertAfter: '.medicine-poisoning-section',
                teaser: 'Bundan sonra: Türkiye\'de ilk kez paylaşılan tedavi yöntemi...'
            },
            {
                insertAfter: '.mental-collapse-section',
                teaser: 'Kısa süre sonra: Ağrı kesicilerin neden zararlı olduğu...'
            },
            {
                insertAfter: '.stage-container',
                teaser: 'Birazdan: Bu formülle hayatları değişen insanların şaşırtıcı hikayelerini okuyacaksınız...'
            },
            {
                insertAfter: '.testimonial-grid',
                teaser: 'Önümüzdeki satırlarda: %90 başarı oranıyla kanıtlanmış çözüm...'
            },
            {
                insertAfter: '.story-section',
                teaser: 'Devamında: Eklem yenileme sürecinin detayları...'
            },
            {
                insertAfter: '.ingredients-section',
                teaser: 'Hemen altında: Binlerce hastanın kurtulduğu doğal formülün bilimsel kanıtları...'
            },
            {
                insertAfter: '.scientific-results',
                teaser: 'Son olarak: Bu fırsatı kaçırmamanız için bilmeniz gereken kritik bilgiler ve son şansınız...'
            }
        ];
        
        this.init();
    }
    
    init() {
        // Eski stilleri kaldır
        const oldStyle = document.getElementById('tv-teaser-simple-styles-fixed');
        if (oldStyle) {
            oldStyle.remove();
        }
        
        this.addTeaserStyles();
        this.insertTeasers();
    }
    
    // 📺 YENİ TUTARLI TEASER STİLLERİ
    addTeaserStyles() {
        const style = document.createElement('style');
        style.id = 'tv-teaser-simple-styles-fixed';
        style.textContent = `
            /* ESKİ OKLARI KAPAT */
            .tv-teaser-simple::before,
            .tv-teaser-simple::after,
            .tv-teaser-fullscreen::before,
            .tv-teaser-fullscreen::after {
                display: none !important;
                content: none !important;
                visibility: hidden !important;
            }
            
            /* OK YOK ARTIK - TEMİZ TEASER'LAR */
            
            /* TÜM TEASER'LAR İÇİN ORTAK STİL - 800PX SINIRI */
            .tv-teaser-simple-new {
                background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%) !important;
                color: white !important;
                padding: 0 25px !important;
                margin: 40px auto !important;
                height: 50px !important;
                width: 100% !important;
                max-width: 100% !important;
                display: flex !important;
                align-items: center !important;
                justify-content: center !important;
                position: relative !important;
                overflow: hidden !important;
                box-shadow: 0 3px 12px rgba(0,0,0,0.4) !important;
                border-radius: 0 !important;
            }
            
            /* TEASER METNİ */
            .tv-teaser-text-new {
                color: #ffffff !important;
                font-style: italic !important;
                font-size: 15px !important;
                font-weight: 500 !important;
                text-align: center !important;
                width: 100% !important;
                line-height: 1.3 !important;
                position: relative !important;
                padding: 0 35px !important;
                margin: 0 !important;
            }
            
            /* SOL SARI AŞAĞI OK - HAREKET ETTİRİLMİŞ */
            .tv-teaser-text-new::before,
            .tv-teaser-simple-new .tv-teaser-text-new::before,
            .tv-teaser-fullscreen-new .tv-teaser-text-new::before {
                content: '▼' !important;
                position: absolute !important;
                left: 8px !important;
                top: 50% !important;
                transform: translateY(-50%);
                color: #ffffff !important;
                font-size: 14px !important;
                font-weight: bold !important;
                animation: yellowArrowBounceLeft 2.5s ease-in-out infinite !important;
                z-index: 999 !important;
                display: block !important;
                width: auto !important;
                height: auto !important;
            }
            
            /* SAĞ SARI AŞAĞI OK - HAREKET ETTİRİLMİŞ */
            .tv-teaser-text-new::after,
            .tv-teaser-simple-new .tv-teaser-text-new::after,
            .tv-teaser-fullscreen-new .tv-teaser-text-new::after {
                content: '▼' !important;
                position: absolute !important;
                right: 8px !important;
                top: 50% !important;
                transform: translateY(-50%);
                color: #ffffff !important;
                font-size: 14px !important;
                font-weight: bold !important;
                animation: yellowArrowBounceRight 2.5s ease-in-out infinite 0.4s !important;
                z-index: 999 !important;
                display: block !important;
                width: auto !important;
                height: auto !important;
            }
            
            /* SOL OK ANİMASYONU - YUKARI AŞAĞI GÜÇLÜ HAREKET */
            @keyframes yellowArrowBounceLeft {
                0% {
                    transform: translateY(-50%);
                    opacity: 0.7 !important;
                    color: #ffffff !important;
                }
                25% {
                    transform: translateY(-10%);
                    opacity: 0.9 !important;
                    color: #ffffff !important;
                }
                50% {
                    transform: translateY(-90%);
                    opacity: 1 !important;
                    color: #ffffff !important;
                }
                75% {
                    transform: translateY(-10%);
                    opacity: 0.9 !important;
                    color: #ffffff !important;
                }
                100% {
                    transform: translateY(-50%);
                    opacity: 0.7 !important;
                    color: #ffffff !important;
                }
            }
            
            /* SAĞ OK ANİMASYONU - YUKARI AŞAĞI GÜÇLÜ HAREKET */
            @keyframes yellowArrowBounceRight {
                0% {
                    transform: translateY(-50%);
                    opacity: 0.7 !important;
                    color: #ffffff !important;
                }
                25% {
                    transform: translateY(-10%);
                    opacity: 0.9 !important;
                    color: #ffffff !important;
                }
                50% {
                    transform: translateY(-90%);
                    opacity: 1 !important;
                    color: #ffffff !important;
                }
                75% {
                    transform: translateY(-10%);
                    opacity: 0.9 !important;
                    color: #ffffff !important;
                }
                100% {
                    transform: translateY(-50%);
                    opacity: 0.7 !important;
                    color: #ffffff !important;
                }
            }
            
            /* TV GLOW EFFECT */
            .tv-teaser-simple-new::after {
                content: '' !important;
                position: absolute !important;
                top: 0 !important;
                left: -100% !important;
                width: 100% !important;
                height: 100% !important;
                background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent) !important;
                animation: tvGlow 4s linear infinite !important;
                z-index: 1 !important;
            }
            
            @keyframes tvGlow {
                0% { left: -100%; }
                100% { left: 100%; }
            }
            
            /* TAM EKRAN TEASER'LAR - 800PX SINIRI */
            .tv-teaser-fullscreen-new {
                width: 100% !important;
                max-width: 100% !important;
                height: 50px !important;
                margin: 40px auto !important;
                box-shadow: 0 3px 12px rgba(0,0,0,0.4) !important;
            }
            
            .tv-teaser-fullscreen-new .tv-teaser-text-new {
                font-size: 15px !important;
                font-weight: 500 !important;
                text-transform: none !important;
                letter-spacing: 0px !important;
                padding: 0 35px !important;
            }
            
            .tv-teaser-fullscreen-new .tv-teaser-text-new::before {
                left: 10px !important;
                font-size: 16px !important;
                animation: yellowArrowBounceLeft 2.5s ease-in-out infinite !important;
            }
            
            .tv-teaser-fullscreen-new .tv-teaser-text-new::after {
                right: 10px !important;
                font-size: 16px !important;
                animation: yellowArrowBounceRight 2.5s ease-in-out infinite 0.4s !important;
            }
            
            /* MOBILE RESPONSIVE */
            @media (max-width: 768px) {
                .tv-teaser-simple-new {
                    margin: 45px 0 !important;
                    padding: 0 30px !important;
                    height: 58px !important;
                }
                
                .tv-teaser-text-new {
                    font-size: 18px !important;
                    line-height: 1.6 !important;
                    padding: 0 20px !important;
                    font-weight: 600 !important;
                }
                
                .tv-teaser-text-new::before,
                .tv-teaser-simple-new .tv-teaser-text-new::before,
                .tv-teaser-fullscreen-new .tv-teaser-text-new::before {
                    left: 10px !important;
                    font-size: 18px !important;
                    animation: yellowArrowBounceLeft 2.5s ease-in-out infinite !important;
                }
                
                .tv-teaser-text-new::after,
                .tv-teaser-simple-new .tv-teaser-text-new::after,
                .tv-teaser-fullscreen-new .tv-teaser-text-new::after {
                    right: 10px !important;
                    font-size: 18px !important;
                    animation: yellowArrowBounceRight 2.5s ease-in-out infinite 0.4s !important;
                }
                
                .tv-teaser-fullscreen-new {
                    height: 65px !important;
                    width: 95% !important;
                }
                
                .tv-teaser-fullscreen-new .tv-teaser-text-new {
                    font-size: 19px !important;
                    letter-spacing: 0.8px !important;
                    padding: 0 55px !important;
                    font-weight: 700 !important;
                }
            }
            
            /* EXTRA SMALL MOBILE */
            @media (max-width: 480px) {
                .tv-teaser-simple-new {
                    height: 50px !important;
                    padding: 0 10px !important;
                }
                
                .tv-teaser-text-new {
                    font-size: 13px !important;
                    line-height: 1.4 !important;
                    padding: 0 23px !important;
                }
                
                .tv-teaser-text-new::before,
                .tv-teaser-simple-new .tv-teaser-text-new::before,
                .tv-teaser-fullscreen-new .tv-teaser-text-new::before {
                    left: 5px !important;
                    font-size: 11px !important;
                    animation: yellowArrowBounceLeft 2.5s ease-in-out infinite !important;
                }
                
                .tv-teaser-text-new::after,
                .tv-teaser-simple-new .tv-teaser-text-new::after,
                .tv-teaser-fullscreen-new .tv-teaser-text-new::after {
                    right: 5px !important;
                    font-size: 11px !important;
                    animation: yellowArrowBounceRight 2.5s ease-in-out infinite 0.4s !important;
                }
                
                .tv-teaser-fullscreen-new {
                    height: 50px !important;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // 📺 TEASER'LARI EKLE
    insertTeasers() {
        // TÜM eski teaser'ları kaldır
        document.querySelectorAll('.tv-teaser-simple').forEach(el => el.remove());
        document.querySelectorAll('.tv-teaser-simple-new').forEach(el => el.remove());
        document.querySelectorAll('.tv-teaser-fullscreen').forEach(el => el.remove());
        document.querySelectorAll('.tv-teaser-fullscreen-new').forEach(el => el.remove());
        
        this.teasers.forEach((teaser, index) => {
            const targetElement = document.querySelector(teaser.insertAfter);
            
            if (targetElement) {
                const teaserDiv = document.createElement('div');
                
                // HİÇBİR TEASER TAM EKRAN OLMASIN
                const isFullScreen = false;
                
                // Yeni sınıf isimleri kullan
                teaserDiv.className = isFullScreen ? 
                    'tv-teaser-simple-new tv-teaser-fullscreen-new' : 
                    'tv-teaser-simple-new';
                
                teaserDiv.innerHTML = `
                    <div class="tv-teaser-text-new" style="position: relative; padding: 0 20px;">
                        ${teaser.teaser}
                    </div>
                `;
                
                // Element'ten sonra ekle
                targetElement.parentNode.insertBefore(teaserDiv, targetElement.nextSibling);
                
                console.log(`📺 YENİ Teaser ${index + 1} eklendi - ${isFullScreen ? 'TAM EKRAN' : 'NORMAL'} - KIRMIZI OKLU`);
            }
        });
    }
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        // Eski teaser sistemini devre dışı bırak
        const oldScript = document.querySelector('script[src*="tv-teasers-simple.js"]');
        if (oldScript) {
            console.log('📺 Eski teaser sistemi devre dışı bırakıldı');
        }
        
        const tvTeasersFixed = new TVTeasersSimpleFixed();
        console.log('📺 YENİ TV Teasers sistemi aktif - TUTARLI KIRMIZI OKLU!');
    }, 1000);
});