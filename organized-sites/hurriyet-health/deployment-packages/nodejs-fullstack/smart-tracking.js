/**
 * SMART TRACKING SYSTEM
 * Akıllı Kullanıcı Davranış Analizi ve VIP Detection
 * 
 * Özellikler:
 * 1. Akıllı Geri Dönüş Sistemi (Smart Retargeting)
 * 2. Premium Müşteri Yakalama (VIP Detection)
 * 3. Gerçek Zamanlı Agent Dashboard Data
 */

class SmartTrackingSystem {
    constructor() {
        this.sessionData = {
            sessionId: this.generateSessionId(),
            startTime: Date.now(),
            pageViews: [],
            scrollEvents: [],
            interactions: [],
            exitIntent: null,
            deviceInfo: this.getDeviceInfo(),
            locationInfo: this.getLocationInfo(),
            behaviorScore: 0,
            vipScore: 0,
            formSubmitted: false // Form gönderildi mi?
        };
        
        // Abandonment tracking kontrolü (class seviyesinde)
        this.abandonmentSent = false;
        
        this.config = {
            scrollThreshold: 90, // %90 scroll = ciddi ilgi
            timeThresholds: {
                quick_bounce: 30,      // 30 saniyeden az = bounce
                interested: 60,        // 60+ saniye = ilgili
                deep_engagement: 120,  // 120+ saniye = çok ilgili
                vip_threshold: 180     // 180+ saniye = VIP adayı
            },
            vipDevices: ['iPhone 15', 'iPhone 14', 'iPhone 13', 'Samsung Galaxy S24', 'Samsung Galaxy S23'],
            wealthyDistricts: ['Bebek', 'Etiler', 'Nişantaşı', 'Emirgan', 'Arnavutköy', 'Zekeriyaköy']
        };
        
        this.init();
    }
    
    generateSessionId() {
        return 'SESSION_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async init() {
        console.log('🚀 Smart Tracking System Başlatıldı');
        
        // Kullanıcının gerçek IP'sini al
        await this.fetchUserIP();
        
        // Event listeners
        this.trackPageView();
        this.trackScrollBehavior();
        this.trackInteractions();
        this.trackExitIntent();
        this.trackTimeOnPage();
        this.trackFormFocus();
        
        // VIP Detection
        this.calculateVIPScore();
        
        // Periyodik güncellemeler
        setInterval(() => this.updateBehaviorAnalysis(), 10000); // Her 10 saniye
    }
    
    async fetchUserIP() {
        try {
            const response = await fetch('/api/get-user-ip');
            const data = await response.json();
            this.sessionData.userIP = data.ip;
            console.log('🌐 User IP:', data.ip);
        } catch (error) {
            console.error('❌ IP fetch error:', error);
            this.sessionData.userIP = 'unknown';
        }
    }
    
    // ============================================
    // 1. CİHAZ VE LOKASYON BİLGİLERİ
    // ============================================
    
    getDeviceInfo() {
        const ua = navigator.userAgent;
        const screenWidth = window.screen.width;
        const screenHeight = window.screen.height;
        const devicePixelRatio = window.devicePixelRatio || 1;
        
        // Cihaz tespiti
        let deviceModel = 'Unknown';
        let deviceValue = 0;
        let deviceType = 'desktop';
        
        // iPhone Detection
        if (/iPhone/.test(ua)) {
            deviceType = 'mobile';
            if (screenHeight >= 2796) {
                deviceModel = 'iPhone 15 Pro Max';
                deviceValue = 52000;
            } else if (screenHeight >= 2556) {
                deviceModel = 'iPhone 15 Pro';
                deviceValue = 46000;
            } else if (screenHeight >= 2532) {
                deviceModel = 'iPhone 14 Pro';
                deviceValue = 40000;
            } else if (screenHeight >= 2436) {
                deviceModel = 'iPhone 13 Pro';
                deviceValue = 35000;
            } else {
                deviceModel = 'iPhone';
                deviceValue = 25000;
            }
        }
        
        // Samsung Detection
        else if (/Samsung/.test(ua) || /SM-/.test(ua)) {
            deviceType = 'mobile';
            if (screenWidth >= 1440) {
                deviceModel = 'Samsung Galaxy S24 Ultra';
                deviceValue = 45000;
            } else if (screenWidth >= 1080) {
                deviceModel = 'Samsung Galaxy S23';
                deviceValue = 35000;
            } else {
                deviceModel = 'Samsung';
                deviceValue = 20000;
            }
        }
        
        // iPad Detection
        else if (/iPad/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) {
            deviceType = 'tablet';
            deviceModel = 'iPad Pro';
            deviceValue = 30000;
        }
        
        // Android Tablet
        else if (/Android/.test(ua) && !/Mobile/.test(ua)) {
            deviceType = 'tablet';
            deviceModel = 'Android Tablet';
            deviceValue = 15000;
        }
        
        // Desktop/Laptop
        else {
            deviceType = 'desktop';
            deviceModel = 'Desktop/Laptop';
            deviceValue = 20000;
        }
        
        return {
            type: deviceType,
            model: deviceModel,
            value: deviceValue,
            screen: `${screenWidth}x${screenHeight}`,
            pixelRatio: devicePixelRatio,
            userAgent: ua,
            isHighEnd: deviceValue >= 35000,
            isPremium: deviceValue >= 40000
        };
    }
    
    getLocationInfo() {
        // IP-based location (backend'den alınabilir)
        // Şimdilik tarayıcı timezone ve language kullanıyoruz
        return {
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            country: 'TR', // Default Türkiye
            city: 'Unknown', // Backend'den gelecek
            isWealthyArea: false // Backend'den gelecek
        };
    }
    
    // ============================================
    // 2. DAVRANIŞSAL TAKİP
    // ============================================
    
    trackPageView() {
        const pageData = {
            url: window.location.href,
            title: document.title,
            timestamp: Date.now(),
            referrer: document.referrer
        };
        
        this.sessionData.pageViews.push(pageData);
        console.log('📄 Page View:', pageData);
    }
    
    trackScrollBehavior() {
        let maxScroll = 0;
        let scrollStartTime = Date.now();
        let currentSection = null;
        let sectionTimes = {};
        
        const scrollHandler = () => {
            const scrollPercent = Math.round(
                (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
            );
            
            if (scrollPercent > maxScroll) {
                maxScroll = scrollPercent;
            }
            
            // Hangi bölümde?
            const section = this.detectCurrentSection();
            
            if (section !== currentSection) {
                // Bölüm değişti
                if (currentSection) {
                    const timeSpent = Date.now() - scrollStartTime;
                    sectionTimes[currentSection] = (sectionTimes[currentSection] || 0) + timeSpent;
                }
                currentSection = section;
                scrollStartTime = Date.now();
            }
            
            this.sessionData.scrollEvents.push({
                percent: scrollPercent,
                section: section,
                timestamp: Date.now()
            });
        };
        
        // Throttle scroll events
        let scrollTimeout;
        window.addEventListener('scroll', () => {
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(scrollHandler, 200);
        });
        
        // Final scroll data
        window.addEventListener('beforeunload', () => {
            this.sessionData.maxScrollDepth = maxScroll;
            this.sessionData.sectionTimes = sectionTimes;
        });
    }
    
    detectCurrentSection() {
        const sections = [
            { name: 'başlık', selector: '.article-header' },
            { name: 'hikaye', selector: '.story-section' },
            { name: 'bileşenler', selector: '.ingredients-section' },
            { name: 'kullanım', selector: '.usage-guide' },
            { name: 'fiyat', selector: '.price-info' },
            { name: 'form', selector: '.order-form-section' }
        ];
        
        for (const section of sections) {
            const element = document.querySelector(section.selector);
            if (element) {
                const rect = element.getBoundingClientRect();
                if (rect.top >= 0 && rect.top <= window.innerHeight / 2) {
                    return section.name;
                }
            }
        }
        
        return 'unknown';
    }
    
    trackInteractions() {
        // Click tracking
        document.addEventListener('click', (e) => {
            const interaction = {
                type: 'click',
                target: e.target.tagName,
                className: e.target.className,
                text: e.target.innerText?.substring(0, 50),
                timestamp: Date.now()
            };
            
            this.sessionData.interactions.push(interaction);
            console.log('👆 Interaction:', interaction);
        });
        
        // Form field focus
        document.querySelectorAll('input, textarea').forEach(field => {
            field.addEventListener('focus', (e) => {
                const interaction = {
                    type: 'form_focus',
                    field: e.target.name || e.target.id,
                    timestamp: Date.now()
                };
                
                this.sessionData.interactions.push(interaction);
                console.log('📝 Form Focus:', interaction);
            });
        });
    }
    
    trackExitIntent() {
        // SADECE sayfa tamamen kapanırken terketme kaydet
        // beforeunload: Kullanıcı sayfadan ayrılmadan önce (sekme/tarayıcı kapatma, yeni URL)
        window.addEventListener('beforeunload', (e) => {
            if (!this.abandonmentSent) {
                console.log('🚪 Page unloading - Abandonment check');
                this.handleAbandonment();
                this.abandonmentSent = true;
            }
        });
        
        // pagehide: Backup event (bazı tarayıcılarda beforeunload çalışmayabilir)
        window.addEventListener('pagehide', (e) => {
            if (!this.abandonmentSent) {
                console.log('🚪 Page hiding - Abandonment check (backup)');
                this.handleAbandonment();
                this.abandonmentSent = true;
            }
        });
    }
    
    // Terketme işleme fonksiyonu
    handleAbandonment() {
        // Form başarıyla gönderildiyse terketme kaydı YAPMA
        if (this.sessionData.formSubmitted) {
            console.log('✅ Form submitted successfully - No abandonment tracking');
            return;
        }
        
        const timeOnPage = Math.round((Date.now() - this.sessionData.startTime) / 1000);
        
        // Minimum 5 saniye kontrolü (yanlışlıkla yenileme, hızlı geçiş vs.)
        if (timeOnPage < 5) {
            console.log('⚠️ Time on page too short (<5s) - Skipping abandonment tracking');
            return;
        }
        
        const exitData = {
            timestamp: Date.now(),
            timeOnPage: timeOnPage,
            currentSection: this.detectCurrentSection(),
            scrollDepth: this.getMaxScrollDepth(),
            lastInteraction: this.getLastInteraction(),
            formFilled: this.isFormFilled()
        };
        
        console.log('📊 Abandonment Data:', exitData);
        
        // Backend'e senkron gönder (sayfa kapanmadan önce)
        this.sendAbandonmentDataSync(exitData);
    }
    
    // Form doldurulmuş mu kontrol et
    isFormFilled() {
        const firstName = document.getElementById('firstName')?.value?.trim() || '';
        const lastName = document.getElementById('lastName')?.value?.trim() || '';
        const phone = document.getElementById('phone')?.value?.trim() || '';
        
        // Herhangi bir alan doluysa true döndür
        const isFilled = firstName.length > 0 || lastName.length > 0 || phone.length > 0;
        
        console.log('🔍 Form Fill Check:', {
            firstName: firstName.length > 0,
            lastName: lastName.length > 0,
            phone: phone.length > 0,
            isFilled: isFilled
        });
        
        return isFilled;
    }
    
    trackTimeOnPage() {
        setInterval(() => {
            const timeOnPage = Math.round((Date.now() - this.sessionData.startTime) / 1000);
            this.sessionData.currentTimeOnPage = timeOnPage;
        }, 1000);
    }
    
    trackFormFocus() {
        const formFields = ['firstName', 'lastName', 'phone'];
        let formInteractionStart = null;
        
        formFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.addEventListener('focus', () => {
                    if (!formInteractionStart) {
                        formInteractionStart = Date.now();
                        console.log('📋 Form Etkileşimi Başladı');
                    }
                });
            }
        });
        
        this.sessionData.formInteractionStart = formInteractionStart;
    }
    
    // ============================================
    // 3. VIP DETECTION
    // ============================================
    
    calculateVIPScore() {
        let vipScore = 0;
        const reasons = [];
        
        // 1. Cihaz Değeri (Max 30 puan)
        const deviceValue = this.sessionData.deviceInfo.value;
        if (deviceValue >= 40000) {
            vipScore += 30;
            reasons.push('Premium cihaz (40K+)');
        } else if (deviceValue >= 30000) {
            vipScore += 20;
            reasons.push('Yüksek değerli cihaz (30K+)');
        } else if (deviceValue >= 20000) {
            vipScore += 10;
            reasons.push('Orta-üst segment cihaz');
        }
        
        // 2. Sayfa Etkileşimi (Max 30 puan)
        const timeOnPage = this.getTimeOnPage();
        if (timeOnPage > 180) {
            vipScore += 30;
            reasons.push('Derin inceleme (3+ dakika)');
        } else if (timeOnPage > 120) {
            vipScore += 20;
            reasons.push('İyi inceleme (2+ dakika)');
        } else if (timeOnPage > 60) {
            vipScore += 10;
            reasons.push('Normal inceleme (1+ dakika)');
        }
        
        // 3. Scroll Derinliği (Max 20 puan)
        const scrollDepth = this.getMaxScrollDepth();
        if (scrollDepth >= 90) {
            vipScore += 20;
            reasons.push('Tam sayfa incelemesi (%90+)');
        } else if (scrollDepth >= 70) {
            vipScore += 15;
            reasons.push('İyi scroll (%70+)');
        } else if (scrollDepth >= 50) {
            vipScore += 10;
            reasons.push('Orta scroll (%50+)');
        }
        
        // 4. İş Saati Dışı (Max 10 puan)
        const hour = new Date().getHours();
        if (hour < 9 || hour > 18) {
            vipScore += 10;
            reasons.push('İş saati dışı (zamanı var)');
        }
        
        // 5. Etkileşim Kalitesi (Max 10 puan)
        const interactions = this.sessionData.interactions.length;
        if (interactions > 10) {
            vipScore += 10;
            reasons.push('Yüksek etkileşim');
        } else if (interactions > 5) {
            vipScore += 5;
            reasons.push('Orta etkileşim');
        }
        
        // VIP Kategorisi Belirleme
        let vipTier = 'NORMAL';
        let priority = 1;
        let action = 'standard_followup';
        
        if (vipScore >= 85) {
            vipTier = 'PLATINUM';
            priority = 10;
            action = 'immediate_executive_call';
        } else if (vipScore >= 70) {
            vipTier = 'GOLD';
            priority = 8;
            action = 'priority_agent';
        } else if (vipScore >= 50) {
            vipTier = 'SILVER';
            priority = 5;
            action = 'expedited_followup';
        } else if (vipScore >= 30) {
            vipTier = 'BRONZE';
            priority = 3;
            action = 'standard_followup';
        } else {
            vipTier = 'NORMAL';
            priority = 1;
            action = 'standard_followup';
        }
        
        this.sessionData.vipScore = vipScore;
        this.sessionData.vipTier = vipTier;
        this.sessionData.vipPriority = priority;
        this.sessionData.vipAction = action;
        this.sessionData.vipReasons = reasons;
        
        console.log('💎 VIP Score Calculated:', {
            score: vipScore,
            tier: vipTier,
            priority: priority,
            reasons: reasons
        });
        
        return {
            score: vipScore,
            tier: vipTier,
            priority: priority,
            action: action,
            reasons: reasons
        };
    }
    
    // ============================================
    // 4. AKILLI GERİ DÖNÜŞ STRATEJİSİ
    // ============================================
    
    analyzeAbandonmentReason() {
        const exitSection = this.sessionData.exitIntent?.currentSection;
        const timeOnPage = this.getTimeOnPage();
        const scrollDepth = this.getMaxScrollDepth();
        const lastInteraction = this.getLastInteraction();
        
        let abandonmentReason = 'unknown';
        let retargetStrategy = 'generic';
        let retargetMessage = 'Tekrar ziyaret edin';
        let retargetTiming = '24 hours';
        let retargetPriority = 'low';
        
        // Quick Bounce
        if (timeOnPage < 30) {
            abandonmentReason = 'quick_bounce';
            retargetStrategy = 'attention_grabber';
            retargetMessage = 'Önemli fırsatı kaçırmayın!';
            retargetTiming = '1 day';
            retargetPriority = 'low';
        }
        
        // Fiyat İtirazı
        else if (exitSection === 'fiyat' && timeOnPage > 30) {
            abandonmentReason = 'price_objection';
            retargetStrategy = 'price_incentive';
            retargetMessage = 'Sizin için özel indirim hazırladık';
            retargetTiming = '2 hours';
            retargetPriority = 'high';
        }
        
        // Form Başlayıp Bıraktı
        else if (lastInteraction?.type === 'form_focus') {
            abandonmentReason = 'form_abandonment';
            retargetStrategy = 'form_recovery';
            retargetMessage = 'Siparişinizi tamamlamak ister misiniz?';
            retargetTiming = '1 hour';
            retargetPriority = 'very_high';
        }
        
        // Testimonial'da Durdu
        else if (exitSection === 'testimonial' || lastInteraction?.target === 'testimonial') {
            abandonmentReason = 'social_proof_needed';
            retargetStrategy = 'trust_building';
            retargetMessage = 'Daha fazla müşteri yorumu';
            retargetTiming = '4 hours';
            retargetPriority = 'medium';
        }
        
        // Uzun İnceleme Ama Alım Yok
        else if (timeOnPage > 120 && scrollDepth > 80) {
            abandonmentReason = 'consideration_phase';
            retargetStrategy = 'urgency_scarcity';
            retargetMessage = 'Son fırsat! Stoklar tükenmeden';
            retargetTiming = '6 hours';
            retargetPriority = 'high';
        }
        
        return {
            reason: abandonmentReason,
            strategy: retargetStrategy,
            message: retargetMessage,
            timing: retargetTiming,
            priority: retargetPriority,
            exitData: {
                section: exitSection,
                timeOnPage: timeOnPage,
                scrollDepth: scrollDepth,
                lastInteraction: lastInteraction
            }
        };
    }
    
    // ============================================
    // 5. BACKEND'E VERİ GÖNDERİMİ
    // ============================================
    
    async sendAbandonmentData(exitData) {
        const abandonmentAnalysis = this.analyzeAbandonmentReason();
        const vipAnalysis = this.calculateVIPScore();
        
        const fullReport = {
            session: {
                sessionId: this.sessionData.sessionId,
                startTime: this.sessionData.startTime,
                endTime: Date.now(),
                duration: this.getTimeOnPage(),
                userIP: this.sessionData.userIP // Kullanıcı IP'si
            },
            device: this.sessionData.deviceInfo,
            location: this.sessionData.locationInfo,
            behavior: {
                pageViews: this.sessionData.pageViews.length,
                interactions: this.sessionData.interactions.length,
                maxScrollDepth: this.getMaxScrollDepth(),
                timeOnPage: this.getTimeOnPage(),
                sectionTimes: this.sessionData.sectionTimes
            },
            abandonment: {
                ...exitData,
                analysis: abandonmentAnalysis
            },
            vip: vipAnalysis,
            userIP: this.sessionData.userIP, // Root level'da da ekle
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Full Analytics Report:', fullReport);
        
        // Backend'e gönder
        try {
            const response = await fetch('/api/track-abandonment', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(fullReport)
            });
            
            if (response.ok) {
                console.log('✅ Abandonment data sent to backend');
            }
        } catch (error) {
            console.error('❌ Error sending abandonment data:', error);
        }
    }
    
    // Senkron terketme gönderimi (sayfa kapanırken)
    sendAbandonmentDataSync(exitData) {
        const abandonmentAnalysis = this.analyzeAbandonmentReason();
        const vipAnalysis = this.calculateVIPScore();
        
        const fullReport = {
            session: {
                sessionId: this.sessionData.sessionId,
                startTime: this.sessionData.startTime,
                endTime: Date.now(),
                duration: this.getTimeOnPage(),
                userIP: this.sessionData.userIP
            },
            device: this.sessionData.deviceInfo,
            location: this.sessionData.locationInfo,
            behavior: {
                pageViews: this.sessionData.pageViews.length,
                interactions: this.sessionData.interactions.length,
                maxScrollDepth: this.getMaxScrollDepth(),
                timeOnPage: this.getTimeOnPage(),
                sectionTimes: this.sessionData.sectionTimes
            },
            abandonment: {
                ...exitData,
                analysis: abandonmentAnalysis
            },
            vip: vipAnalysis,
            userIP: this.sessionData.userIP,
            timestamp: new Date().toISOString()
        };
        
        console.log('📊 Sending abandonment sync:', fullReport);
        
        // sendBeacon ile senkron gönder (sayfa kapanmadan önce çalışır)
        try {
            const blob = new Blob([JSON.stringify(fullReport)], { type: 'application/json' });
            navigator.sendBeacon('/api/track-abandonment', blob);
            console.log('✅ Abandonment data sent via sendBeacon');
        } catch (error) {
            console.error('❌ Error sending abandonment via sendBeacon:', error);
        }
    }
    
    async sendFormSubmission(formData) {
        const vipAnalysis = this.calculateVIPScore();
        
        const enrichedData = {
            ...formData,
            analytics: {
                sessionId: this.sessionData.sessionId,
                device: this.sessionData.deviceInfo,
                behavior: {
                    timeOnPage: this.getTimeOnPage(),
                    scrollDepth: this.getMaxScrollDepth(),
                    interactions: this.sessionData.interactions.length
                },
                vip: vipAnalysis
            },
            timestamp: new Date().toISOString()
        };
        
        console.log('📤 Enriched Form Submission:', enrichedData);
        
        return enrichedData;
    }
    
    // ============================================
    // 6. YARDIMCI FONKS İYONLAR
    // ============================================
    
    getTimeOnPage() {
        return Math.round((Date.now() - this.sessionData.startTime) / 1000);
    }
    
    getMaxScrollDepth() {
        if (this.sessionData.scrollEvents.length === 0) return 0;
        return Math.max(...this.sessionData.scrollEvents.map(e => e.percent));
    }
    
    getLastInteraction() {
        if (this.sessionData.interactions.length === 0) return null;
        return this.sessionData.interactions[this.sessionData.interactions.length - 1];
    }
    
    updateBehaviorAnalysis() {
        const timeOnPage = this.getTimeOnPage();
        const scrollDepth = this.getMaxScrollDepth();
        
        // Periyodik VIP score güncelle
        this.calculateVIPScore();
        
        console.log('🔄 Behavior Update:', {
            timeOnPage: timeOnPage,
            scrollDepth: scrollDepth,
            vipScore: this.sessionData.vipScore,
            vipTier: this.sessionData.vipTier
        });
    }
    
    // ============================================
    // 7. PUBLIC API
    // ============================================
    
    getAnalyticsData() {
        // VIP score'u güncelle
        const vipData = this.calculateVIPScore();
        
        return {
            session: {
                sessionId: this.sessionData.sessionId,
                userIP: this.sessionData.userIP
            },
            device: {
                type: this.sessionData.deviceInfo.type,
                model: this.sessionData.deviceInfo.model,
                value: this.sessionData.deviceInfo.value,
                screen: this.sessionData.deviceInfo.screen,
                userAgent: this.sessionData.deviceInfo.userAgent,
                isHighEnd: this.sessionData.deviceInfo.isHighEnd,
                isPremium: this.sessionData.deviceInfo.isPremium
            },
            behavior: {
                timeOnPage: this.getTimeOnPage(),
                scrollDepth: this.getMaxScrollDepth(),
                interactions: this.sessionData.interactions.length
            },
            vip: {
                score: vipData.score,
                tier: vipData.tier,
                priority: vipData.priority,
                action: vipData.action
            }
        };
    }
    
    // Form başarıyla gönderildiğinde çağrılacak
    markFormSubmitted() {
        this.sessionData.formSubmitted = true;
        console.log('✅ Form marked as submitted - Abandonment tracking disabled');
    }
}

// Global instance
window.smartTracker = new SmartTrackingSystem();

// Form submit hook
window.enrichFormDataWithAnalytics = function(formData) {
    return window.smartTracker.sendFormSubmission(formData);
};

console.log('✅ Smart Tracking System Ready');
