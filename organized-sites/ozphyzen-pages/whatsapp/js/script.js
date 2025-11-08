// Hürriyet Gazetesi - JavaScript Fonksiyonelliği

const BACKEND_API_URL = "/api/submit-order";

document.addEventListener('DOMContentLoaded', function() {
    initializePageFeatures();
});

function initializePageFeatures() {
    // Sipariş formunu başlat
    initializeOrderForm();
    
    // Stok sayacını başlat
    initializeStockCounter();
    
    // Smooth scrolling
    initializeSmoothScrolling();
    
    // Sosyal medya paylaşımları
    initializeSocialSharing();
    
    // Sayfa yüklenme animasyonları
    initializeAnimations();
    
    // Responsive navigation
    initializeResponsiveNav();
}

// Sipariş Formu İşlemleri
function initializeOrderForm() {
    const orderForm = document.getElementById('orderForm');
    
    if (orderForm) {
        orderForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const firstName = document.getElementById('firstName').value.trim();
            const lastName = document.getElementById('lastName').value.trim();
            const phone = document.getElementById('phone').value.trim();
            
            // Form validasyonu
            if (!validateForm(firstName, lastName, phone)) {
                return;
            }
            // Sipariş verme işlemini başlat
            submitOrder(firstName, lastName, phone);
        });
        

        
        // Telefon formatı
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('input', function(e) {
                formatPhoneNumber(e.target);
            });
        }
    }
}

function validateForm(firstName, lastName, phone) {
    // Ad kontrolü
    if (firstName.length < 2) {
        showError('Lütfen geçerli bir ad giriniz (en az 2 karakter)');
        document.getElementById('firstName').focus();
        return false;
    }
    
    // Soyad kontrolü
    if (lastName.length < 2) {
        showError('Lütfen geçerli bir soyad giriniz (en az 2 karakter)');
        document.getElementById('lastName').focus();
        return false;
    }
    
    // Telefon kontrolü
    const phonePattern = /^[0-9\s\-\(\)]{10,}$/;
    if (!phonePattern.test(phone)) {
        showError('Lütfen geçerli bir telefon numarası giriniz');
        document.getElementById('phone').focus();
        return false;
    }
    
    return true;
}

function formatPhoneNumber(input) {
    let value = input.value.replace(/\D/g, '');
    
    if (value.length > 0) {
        if (value.length <= 3) {
            value = value;
        } else if (value.length <= 6) {
            value = value.slice(0, 4) + ' ' + value.slice(4);
        } else if (value.length <= 8) {
            value = value.slice(0, 4) + ' ' + value.slice(4, 7) + ' ' + value.slice(7);
        } else {
            value = value.slice(0, 4) + ' ' + value.slice(4, 7) + ' ' + value.slice(7, 9) + ' ' + value.slice(9, 11);
        }
    }
    
    input.value = value;
}

function showError(message) {
    // Mevcut hata mesajını kaldır
    const existingError = document.querySelector('.error-message');
    if (existingError) {
        existingError.remove();
    }
    
    // Yeni hata mesajı oluştur
    const errorDiv = document.createElement('div');
    errorDiv.className = 'error-message';
    errorDiv.style.cssText = `
        background: linear-gradient(135deg, #ffebee, #ffcdd2);
        color: #c62828;
        padding: 15px;
        border-radius: 8px;
        margin: 15px 0;
        border: 2px solid #f44336;
        font-weight: 500;
        animation: shake 0.5s ease-in-out;
    `;
    errorDiv.innerHTML = `UYARI: ${message}`;
    
    const form = document.getElementById('orderForm');
    form.insertBefore(errorDiv, form.firstChild);
    
    // 5 saniye sonra otomatik kaldır
    setTimeout(() => {
        if (errorDiv && errorDiv.parentNode) {
            errorDiv.remove();
        }
    }, 5000);
}

function showSuccessMessage(firstName, lastName, phone) {
    const orderFormSection = document.querySelector('.order-form-section');
    
    orderFormSection.innerHTML = `
        <div class="success-container">
            <div class="success-icon">✓</div>
            <h3>TEBRİKLER! Başvurunuz Alındı</h3>
            <div class="success-details">
                <p><strong>Sayın ${firstName} ${lastName}</strong> - 350'inci sıradasınız</p>
                <p>OZPHYZEN özel programına başvurunuz <strong style="color: #4caf50;">BAŞARILI</strong> bir şekilde alınmıştır.</p>
                
                <div>
                    <h4>Sıradaki Adımlar:</h4>
                    <ul>
                        <li>✅ <strong>Prof. Dr. Mehmet Öz'ün eğittiği sağlık asistanımız</strong> bugün içinde <strong>${phone}</strong> numaralı telefonunuzdan size ulaşacaktır.</li>
                        <li>Size <strong>kişisel sağlık durumunuza göre</strong> özel kullanım planı hazırlanacaktır.</li>
                        <li>Siparişiniz danışmanınız tarafından bilgilendirme yapılarak onaylandıktan sonra <strong>24 saat içinde kapıda ödeme seçeneğiyle ücretsiz kargoya</strong> verilecektir.</li>


                    </ul>
                </div>


            </div>
        </div>
    `;
    
    // Başarı animasyonu
    orderFormSection.style.animation = 'fadeInUp 0.6s ease-out';
    
    // Sayfayı forma kaydır
    orderFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}



// Sipariş Gönderme Fonksiyonu
async function submitOrder(firstName, lastName, phone) {
    // Loading durumunu göster
    showLoadingMessage();
    
    try {
        // Sipariş verilerini hazırla
        const orderData = {
            name: firstName,
            surname: lastName,
            phone: phone,
            address: "Telefon görüşmesinde alınacak", // Adres bilgisi telefon görüşmesinde alınacak
            quantity: 1,
            product: 'OZPHYZEN Ağrı Kremi',
            source: 'hurriyet_interview',
            doctor_reference: 'Prof. Dr. Mehmet Öz',
            timestamp: new Date().toISOString(),
            user_agent: navigator.userAgent,
            page_url: window.location.href
        };
        
        // API çağrısı yap

        
        // Modern API çağrısı yap
        const response = await fetch(BACKEND_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderData)
        });
        
        const result = await response.json();
        
        if (result.success === true) {
            // Başarılı sipariş
            showSuccessMessage(firstName, lastName, phone);
        } else {
            // API hatası
            throw new Error(result.message || 'Sipariş işlenirken bir hata oluştu');
        }
        
    } catch (error) {
        console.error('Sipariş hatası:', error);
        showErrorMessage(error.message);
    }
}

// Loading Mesajı
function showLoadingMessage() {
    const orderFormSection = document.querySelector('.order-form-section');
    orderFormSection.innerHTML = `
        <div class="loading-container">
            <div class="loading-spinner"></div>
            <h3>Siparişiniz İşleniyor...</h3>
            <p>Lütfen bekleyiniz, siparişinizi Prof. Dr. Mehmet Öz'ün özel sistemine gönderiyoruz.</p>
        </div>
    `;
    
    // Sayfayı forma kaydır
    orderFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Hata Mesajı
function showErrorMessage(errorMessage) {
    const orderFormSection = document.querySelector('.order-form-section');
    orderFormSection.innerHTML = `
        <div class="error-container">
            <h3>Sipariş İşlenirken Hata Oluştu</h3>
            <div class="error-details">
                <p>Üzgünüz, siparişinizi şu anda işleyemedik.</p>
                <p class="error-message">${errorMessage}</p>
                
                <div class="retry-options">
                    <h4>Ne yapabilirsiniz?</h4>
                    <ul>
                        <li><strong>Tekrar deneyin:</strong> Sayfayı yenileyin ve formu tekrar doldurun</li>
                        <li><strong>Daha sonra deneyin:</strong> Birkaç dakika sonra tekrar deneyiniz</li>
                    </ul>
                </div>
                
                <div class="retry-button-container">
                    <button onclick="location.reload()" class="retry-button">
                        Sayfayı Yenile ve Tekrar Dene
                    </button>
                </div>

            </div>
        </div>
    `;
    
    // Sayfayı forma kaydır
    orderFormSection.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Stok Sayacı
function initializeStockCounter() {
    const stockNumber = document.querySelector('.stock-number');
    if (stockNumber) {
        let currentStock = 420;
        
        // Her 15-30 saniyede bir stok azalt (gerçekçi görünmesi için)
        setInterval(() => {
            if (currentStock > 350 && Math.random() > 0.7) { // %30 şans ile azalt
                currentStock--;
                stockNumber.textContent = currentStock;
                
                // Stok kritik seviyeye gelirse renk değiştir
                if (currentStock <= 380) {
                    stockNumber.style.color = '#dc3545';
                    stockNumber.style.background = 'rgba(220, 53, 69, 0.15)';
                }
            }
        }, Math.random() * 15000 + 15000); // 15-30 saniye arası
    }
}

// Smooth Scrolling
function initializeSmoothScrolling() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            const targetId = this.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
            }
        });
    });
}

// Sosyal Medya Paylaşımı
function initializeSocialSharing() {
    document.querySelectorAll('.share-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const platform = this.classList[1]; // facebook, twitter, whatsapp
            const url = encodeURIComponent(window.location.href);
            const title = encodeURIComponent(document.title);
            const text = encodeURIComponent('Prof. Dr. Mehmet Öz\'den çok önemli açıklama!');
            
            let shareUrl = '';
            
            switch(platform) {
                case 'facebook':
                    shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
                    break;
                case 'twitter':
                    shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
                    break;
                case 'whatsapp':
                    shareUrl = `https://wa.me/?text=${text}%20${url}`;
                    break;
            }
            
            if (shareUrl) {
                window.open(shareUrl, '_blank', 'width=600,height=400');
            }
        });
    });
}

// Sayfa Animasyonları
function initializeAnimations() {
    // Intersection Observer ile animate-on-scroll
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };
    
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = '1';
                entry.target.style.transform = 'translateY(0)';
            }
        });
    }, observerOptions);
    
    // Animasyon için elementleri seç
    document.querySelectorAll('.stage-item, .testimonial, .ingredient-item, .method-item').forEach(el => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(30px)';
        el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
        observer.observe(el);
    });
}

// Responsive Navigation
function initializeResponsiveNav() {
    const nav = document.querySelector('.main-nav');
    const navToggle = document.createElement('button');
    
    // Mobil hamburger menü butonu oluştur
    navToggle.innerHTML = '☰';
    navToggle.className = 'nav-toggle';
    navToggle.style.cssText = `
        display: none;
        background: none;
        border: none;
        font-size: 24px;
        color: #d41f2c;
        cursor: pointer;
        padding: 10px;
    `;
    
    // Butonu header'a ekle
    const headerMain = document.querySelector('.header-main .container');
    headerMain.insertBefore(navToggle, nav);
    
    // Mobil görünümde hamburger menüyü göster
    function checkScreenSize() {
        if (window.innerWidth <= 768) {
            navToggle.style.display = 'block';
            nav.style.display = nav.classList.contains('active') ? 'block' : 'none';
        } else {
            navToggle.style.display = 'none';
            nav.style.display = 'block';
            nav.classList.remove('active');
        }
    }
    
    navToggle.addEventListener('click', () => {
        nav.classList.toggle('active');
        nav.style.display = nav.classList.contains('active') ? 'block' : 'none';
    });
    
    window.addEventListener('resize', checkScreenSize);
    checkScreenSize(); // İlk yüklemede kontrol et
}

// Geri Sayım (Kampanya için)
function initializeCountdown() {
    // Kampanya bitiş tarihi - bugünden 2 gün sonra gece yarısı
    const campaignDeadline = new Date();
    campaignDeadline.setDate(campaignDeadline.getDate() + 2);
    campaignDeadline.setHours(23, 59, 59, 999);
    const deadline = campaignDeadline.getTime();
    
    function updateCountdown() {
        const now = new Date().getTime();
        const distance = deadline - now;
        
        if (distance < 0) {
            document.querySelectorAll('.countdown').forEach(el => {
                el.innerHTML = '<span class="expired">KAMPANYA SONA ERDİ!</span>';
            });
            return;
        }
        
        const days = Math.floor(distance / (1000 * 60 * 60 * 24));
        const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        
        const countdownHTML = `
            <div class="countdown-timer">
                <div class="time-unit">
                    <span class="number">${days}</span>
                    <span class="label">GÜN</span>
                </div>
                <div class="time-unit">
                    <span class="number">${hours}</span>
                    <span class="label">SAAT</span>
                </div>
                <div class="time-unit">
                    <span class="number">${minutes}</span>
                    <span class="label">DAKİKA</span>
                </div>
                <div class="time-unit">
                    <span class="number">${seconds}</span>
                    <span class="label">SANİYE</span>
                </div>
            </div>
        `;
        
        document.querySelectorAll('.countdown').forEach(el => {
            el.innerHTML = countdownHTML;
        });
    }
    
    // Her saniye güncelle
    setInterval(updateCountdown, 1000);
    updateCountdown(); // İlk çalıştırma
}

// Dinamik tarih güncelleme
function updateDynamicDates() {
    const istanbulTime = new Date().toLocaleString('tr-TR', { 
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: 'long', 
        day: 'numeric',
        weekday: 'long'
    });
    
    const today = new Date().toLocaleString('tr-TR', { 
        timeZone: 'Europe/Istanbul'
    });
    
    const todayShort = new Date().toLocaleString('tr-TR', { 
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    });
    
    // Kampanya bitiş tarihi (bugünden 2 gün sonra)
    const campaignEnd = new Date();
    campaignEnd.setDate(campaignEnd.getDate() + 2);
    const campaignEndStr = campaignEnd.toLocaleString('tr-TR', { 
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Dün, bugün, yarın tarihleri (sidebar için)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toLocaleString('tr-TR', { 
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const twoDaysAgoStr = twoDaysAgo.toLocaleString('tr-TR', { 
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    // Güncelleme zamanı (şu anki saat)
    const updateTime = new Date().toLocaleString('tr-TR', { 
        timeZone: 'Europe/Istanbul',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
    
    // DOM elementlerini güncelle
    updateElementText('.header-date', istanbulTime);
    updateElementText('.date', `Yayınlanma Tarihi: ${todayShort}`);
    updateElementText('.highlight-date', `${campaignEndStr}!`);
    
    // Güncelleme metnindeki tarihleri değiştir
    const updateElement = document.querySelector('.urgent-update-container h4');
    if (updateElement) {
        updateElement.innerHTML = `GÜNCELLEME (${updateTime}):`;
    }
    
    const updateText = document.querySelector('.urgent-update-container p');
    if (updateText) {
        updateText.innerHTML = updateText.innerHTML.replace(
            /\d{1,2} Eylül \d{4}/g, 
            campaignEndStr
        );
    }
    
    // Sidebar tarihlerini güncelle
    const newsDateElements = document.querySelectorAll('.news-date');
    if (newsDateElements.length >= 5) {
        newsDateElements[0].textContent = yesterdayStr;
        newsDateElements[1].textContent = twoDaysAgoStr;
        newsDateElements[2].textContent = twoDaysAgo.toLocaleString('tr-TR', { 
            timeZone: 'Europe/Istanbul',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        newsDateElements[3].textContent = istanbulTime.split(' ').slice(0, 3).join(' ');
        newsDateElements[4].textContent = istanbulTime.split(' ').slice(0, 3).join(' ');
    }
}

function updateElementText(selector, text) {
    const element = document.querySelector(selector);
    if (element) {
        element.textContent = text;
    }
}

// Sayfa yüklendiğinde geri sayımı başlat
document.addEventListener('DOMContentLoaded', function() {
    updateDynamicDates();
    initializeCountdown();
    
    // Her 30 saniyede bir tarihleri güncelle
    setInterval(updateDynamicDates, 30000);
});

// CSS animasyonları (JavaScript ile eklenen)
const additionalCSS = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-5px); }
        75% { transform: translateX(5px); }
    }
    
    @keyframes confettiFall {
        0% {
            transform: translateY(-10px) rotate(0deg);
            opacity: 1;
        }
        100% {
            transform: translateY(100vh) rotate(360deg);
            opacity: 0;
        }
    }
    
    .success-container {
        text-align: center;
        padding: 40px;
        background: linear-gradient(135deg, #e8f5e8, #f1f8e9);
        border-radius: 15px;
        border: 3px solid #4caf50;
    }
    
    .success-icon {
        font-size: 60px;
        margin-bottom: 20px;
        animation: bounce 1s ease infinite alternate;
    }
    
    @keyframes bounce {
        from { transform: translateY(0); }
        to { transform: translateY(-10px); }
    }
    
    .success-container h3 {
        color: #2e7d32;
        font-size: 28px;
        margin-bottom: 25px;
    }
    
    .success-details {
        text-align: left;
        max-width: 600px;
        margin: 0 auto;
    }
    
    .next-steps, .important-note {
        background: white;
        padding: 20px;
        border-radius: 10px;
        margin: 20px 0;
        border-left: 5px solid #4caf50;
    }
    
    .important-note {
        border-left-color: #ff9800;
    }
    
    .next-steps h4, .important-note h4 {
        color: #2e7d32;
        margin-bottom: 15px;
    }
    
    .important-note h4 {
        color: #f57c00;
    }
    
    .next-steps ul {
        padding-left: 20px;
    }
    
    .next-steps li {
        margin-bottom: 10px;
        line-height: 1.5;
    }
    
    .contact-info {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        margin-top: 20px;
        text-align: center;
        border: 1px solid #ddd;
    }
    
    .countdown-timer {
        display: flex;
        justify-content: center;
        gap: 15px;
        margin: 20px 0;
    }
    
    .time-unit {
        background: linear-gradient(135deg, #d41f2c, #b91c28);
        color: white;
        padding: 15px;
        border-radius: 10px;
        text-align: center;
        min-width: 60px;
        box-shadow: 0 4px 15px rgba(212, 31, 44, 0.3);
    }
    
    .time-unit .number {
        display: block;
        font-size: 24px;
        font-weight: bold;
        line-height: 1;
    }
    
    .time-unit .label {
        display: block;
        font-size: 10px;
        margin-top: 5px;
        opacity: 0.9;
    }
    
    .expired {
        color: #d41f2c;
        font-weight: bold;
        font-size: 18px;
        padding: 15px;
        background: #ffebee;
        border-radius: 8px;
        border: 2px solid #d41f2c;
    }
    
    @media (max-width: 768px) {
        .nav-toggle {
            display: block !important;
        }
        
        .main-nav {
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            box-shadow: 0 5px 15px rgba(0,0,0,0.1);
            z-index: 1000;
        }
        
        .main-nav ul {
            flex-direction: column;
            padding: 20px;
        }
        
        .main-nav a {
            padding: 15px;
            border-bottom: 1px solid #eee;
        }
        
        .countdown-timer {
            flex-wrap: wrap;
            gap: 10px;
        }
        
        .time-unit {
            min-width: 50px;
            padding: 10px;
        }
        
        .time-unit .number {
            font-size: 18px;
        }
    }
`;

// CSS'i head'e ekle
const style = document.createElement('style');
style.textContent = additionalCSS;
document.head.appendChild(style);