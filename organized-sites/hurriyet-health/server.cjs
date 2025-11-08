const express = require('express');
const path = require('path');
const fetch = require('node-fetch');
const crypto = require('crypto');
const cookieParser = require('cookie-parser');
const app = express();
const PORT = process.env.PORT || 8080;

// Meta Conversions API Configuration
const META_PIXEL_ID = '1536997387317312';
const META_ACCESS_TOKEN = process.env.META_ACCESS_TOKEN || ''; // Environment variable'dan al
const META_API_VERSION = 'v18.0';
const META_CONVERSIONS_API_ENABLED = META_ACCESS_TOKEN !== '';

// Trust proxy - gerçek IP'yi al
app.set('trust proxy', true);

// JSON middleware for API requests
app.use(express.json());

// Cookie parser middleware (for Meta Pixel fbp/fbc cookies)
app.use(cookieParser());

// IPv4 zorlama fonksiyonu
function forceIPv4(ip) {
    if (!ip) return null;
    
    ip = ip.trim();
    
    // IPv6 wrapped IPv4 (::ffff:192.168.1.1)
    if (ip.startsWith('::ffff:')) {
        ip = ip.substring(7);
    }
    
    // IPv6 localhost
    if (ip === '::1') {
        ip = '127.0.0.1';
    }
    
    // IPv4 validation
    const ipv4Regex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    return ipv4Regex.test(ip) ? ip : null;
}

// IP forward middleware
app.use((req, res, next) => {
    // Gerçek kullanıcı IPv4'ünü tespit et
    const possibleIPs = [
        req.headers['cf-connecting-ip'],
        req.headers['x-forwarded-for'],
        req.headers['x-real-ip'],
        req.connection.remoteAddress,
        req.socket.remoteAddress
    ];
    
    let realIPv4 = null;
    
    for (const candidateIP of possibleIPs) {
        if (!candidateIP) continue;
        
        // Multiple IPs durumu
        if (candidateIP.includes(',')) {
            const ips = candidateIP.split(',').map(ip => ip.trim());
            for (const ip of ips) {
                const validIP = forceIPv4(ip);
                if (validIP && !validIP.startsWith('127.') && !validIP.startsWith('192.168.')) {
                    realIPv4 = validIP;
                    break;
                }
            }
            if (realIPv4) break;
        } else {
            const validIP = forceIPv4(candidateIP);
            if (validIP && !validIP.startsWith('127.') && !validIP.startsWith('192.168.')) {
                realIPv4 = validIP;
                break;
            }
        }
    }
    
    // Fallback: local IP'leri de kabul et
    if (!realIPv4) {
        for (const candidateIP of possibleIPs) {
            if (!candidateIP) continue;
            const validIP = forceIPv4(candidateIP);
            if (validIP) {
                realIPv4 = validIP;
                break;
            }
        }
    }
    
    req.realUserIPv4 = realIPv4 || '127.0.0.1';
    console.log('🔍 Detected IPv4:', req.realUserIPv4, 'from headers:', {
        'cf-connecting-ip': req.headers['cf-connecting-ip'],
        'x-forwarded-for': req.headers['x-forwarded-for'],
        'x-real-ip': req.headers['x-real-ip'],
        'remote': req.connection.remoteAddress
    });
    next();
});

// Serve static files
app.use(express.static('.'));

// API route for order submissions - webhook proxy
app.post('/api/submit-order', async (req, res) => {
    try {
        const { name, surname, phone, address, quantity = 1, analytics } = req.body;
        
        // Basic validation
        if (!name || !surname || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen tüm alanları doldurun.'
            });
        }
        
        // Analytics verisini logla
        if (analytics) {
            console.log('💎 CUSTOMER ANALYTICS:', {
                name: name,
                phone: phone,
                vipTier: analytics.vip?.tier,
                vipScore: analytics.vip?.score,
                vipPriority: analytics.vip?.priority,
                deviceValue: analytics.device?.value,
                deviceModel: analytics.device?.model,
                timeOnPage: analytics.behavior?.timeOnPage,
                scrollDepth: analytics.behavior?.scrollDepth,
                interactions: analytics.behavior?.interactions
            });
        }
        
        // Geldiği yer bilgisini detaylı al
        const referer = req.headers['referer'] || req.headers['referrer'] || '';
        const origin = req.headers['origin'] || '';
        const host = req.headers['host'] || '';
        const fbclid = req.query?.fbclid || ''; // Facebook Click ID (URL parameter)
        const utm_source = req.query?.utm_source || ''; // UTM Source
        
        // Eğer referer varsa onu kullan, yoksa origin, yoksa host, yoksa 'Direkt Erişim'
        let geldigiYer = 'Direkt Erişim';
        
        // Facebook reklamından mı geldi?
        if (fbclid && fbclid !== '') {
            geldigiYer = 'Facebook Reklamı (fbclid: ' + fbclid.substring(0, 20) + ')';
        } 
        // UTM source var mı?
        else if (utm_source && utm_source !== '') {
            geldigiYer = 'UTM Source: ' + utm_source;
        }
        // Referer var mı?
        else if (referer && referer !== '') {
            geldigiYer = referer;
        } 
        // Origin var mı?
        else if (origin && origin !== '') {
            geldigiYer = origin;
        } 
        // Host bilgisi
        else if (host && host !== '') {
            geldigiYer = 'https://' + host + ' (Direkt Erişim)';
        }
        
        console.log('🌐 Geldiği Yer Tespiti:', {
            referer: referer,
            origin: origin,
            host: host,
            sonuc: geldigiYer
        });
        
        // Prepare webhook data exactly like working site
        const webhookData = {
            siparisID: 'SIP-' + new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14),
            isim: name, // Webhook expects 'isim' not combined name
            soyisim: surname,
            telefon: phone,
            ip: req.realUserIPv4,
            cihazBilgisi: req.headers['user-agent'] || 'Bilinmeyen',
            gelenSite: geldigiYer, // Geldiği yer bilgisi - detaylı
            zamanDamgasi: new Date().toISOString(),
            webhookUrl: 'https://n8nwork.dtekai.com/webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31',
            yürütmeModu: 'üretme',
            
            // Analytics data (VIP Detection)
            vipSeviye: analytics?.vip?.tier || 'NORMAL',
            vipPuan: analytics?.vip?.score || 0,
            oncelik: analytics?.vip?.priority || 1,
            onerilenAksiyon: analytics?.vip?.action || 'standard_followup',
            cihazDegeri: analytics?.device?.value || 0,
            cihazModeli: analytics?.device?.model || 'Bilinmeyen',
            cihazTipi: analytics?.device?.type || 'desktop',
            sayfadaKalisSuresi: analytics?.behavior?.timeOnPage || 0,
            scrollDerinligi: analytics?.behavior?.scrollDepth || 0,
            etkilesimSayisi: analytics?.behavior?.interactions || 0
        };

        console.log('📤 Webhook Data:', webhookData);
        
        // Meta Conversions API: Send Purchase Event (Server-Side)
        if (META_CONVERSIONS_API_ENABLED) {
            try {
                await sendMetaConversionEvent({
                    eventName: 'Purchase',
                    email: '', // Email yoksa boş
                    phone: phone,
                    firstName: name,
                    lastName: surname,
                    ip: req.realUserIPv4,
                    userAgent: req.headers['user-agent'],
                    fbp: req.cookies?._fbp || '', // Facebook Browser ID (cookie'den)
                    fbc: req.cookies?._fbc || '', // Facebook Click ID
                    value: 799.00,
                    currency: 'TRY',
                    contentName: 'OZPHYZEN',
                    contentIds: ['OZPHYZEN-001']
                });
                console.log('✅ Meta Conversions API: Purchase event sent');
            } catch (metaError) {
                console.error('⚠️ Meta Conversions API Error (non-critical):', metaError.message);
            }
        } else {
            console.log('⚠️ Meta Conversions API disabled (no access token)');
        }

        // Forward to N8N webhook ONLY
        try {
            const webhookResponse = await fetch('https://n8nwork.dtekai.com/webhook/bc74f59e-54c2-4521-85a1-6e21a0438c31', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': req.headers['user-agent'] || 'Node.js',
                    'X-Forwarded-For': req.realUserIPv4,
                    'X-Real-IP': req.realUserIPv4
                },
                body: JSON.stringify(webhookData)
            });

            const webhookResult = await webhookResponse.text();
            console.log('📥 N8N Webhook Response:', webhookResult);
        } catch (webhookError) {
            console.error('⚠️ N8N Webhook Error (non-critical):', webhookError.message);
        }

        // Return success response
        res.json({
            success: true,
            message: 'Siparişiniz başarıyla alındı! En kısa sürede sizinle iletişime geçeceğiz.',
            orderNumber: webhookData.siparisID,
            estimatedDelivery: '2-3 iş günü'
        });
        
    } catch (error) {
        console.error('❌ Webhook Error:', error);
        res.status(500).json({
            success: false,
            message: 'Bir hata oluştu. Lütfen tekrar deneyin.'
        });
    }
});

// API endpoint to get user's real IP
app.get('/api/get-user-ip', (req, res) => {
    res.json({
        ip: req.realUserIPv4,
        headers: {
            'x-forwarded-for': req.headers['x-forwarded-for'],
            'x-real-ip': req.headers['x-real-ip'],
            'cf-connecting-ip': req.headers['cf-connecting-ip']
        }
    });
});

// API route for tracking abandonment
app.post('/api/track-abandonment', async (req, res) => {
    try {
        const analyticsData = req.body;
        
        console.log('📊 ABANDONMENT ANALYTICS:', {
            sessionId: analyticsData.session?.sessionId,
            vipTier: analyticsData.vip?.tier,
            vipScore: analyticsData.vip?.score,
            abandonReason: analyticsData.abandonment?.analysis?.reason,
            retargetStrategy: analyticsData.abandonment?.analysis?.strategy,
            deviceValue: analyticsData.device?.value,
            timeOnPage: analyticsData.behavior?.timeOnPage
        });
        
        // N8N Webhook'a gönder (Abandonment tracking için - AYRI WEBHOOK)
        try {
            const webhookData = {
                type: 'abandonment',
                sessionId: analyticsData.session?.sessionId,
                vip: analyticsData.vip,
                device: analyticsData.device,
                abandonment: analyticsData.abandonment,
                behavior: analyticsData.behavior,
                timestamp: new Date().toISOString(),
                ip: analyticsData.userIP || analyticsData.session?.userIP || req.realUserIPv4,
                userIP: analyticsData.userIP || analyticsData.session?.userIP || req.realUserIPv4
            };
            
            console.log('📊 Sending abandonment data to separate webhook');
            
            await fetch('https://n8nwork.dtekai.com/webhook/ef297f4c-c137-46aa-8f42-895253fff2c7', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(webhookData)
            });
            
            console.log('✅ Abandonment data sent to N8N (separate webhook)');
        } catch (webhookError) {
            console.error('⚠️ Abandonment webhook error (non-critical):', webhookError.message);
        }
        
        res.json({
            success: true,
            message: 'Analytics tracked successfully'
        });
        
    } catch (error) {
        console.error('❌ Track abandonment error:', error);
        res.status(500).json({
            success: false,
            message: 'Error tracking abandonment'
        });
    }
});

// API route for newsletter subscription
app.post('/api/subscribe-newsletter', (req, res) => {
    try {
        const { email } = req.body;
        
        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'E-posta adresi gerekli.'
            });
        }
        
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Geçerli bir e-posta adresi girin.'
            });
        }
        
        console.log('Newsletter subscription:', { email, timestamp: new Date().toISOString() });
        
        res.json({
            success: true,
            message: 'Bültenimize başarıyla kaydoldunuz!'
        });
        
    } catch (error) {
        console.error('Newsletter subscription error:', error);
        res.status(500).json({
            success: false,
            message: 'Bir hata oluştu. Lütfen tekrar deneyin.'
        });
    }
});

// API route for contact form
app.post('/api/contact', (req, res) => {
    try {
        const { name, email, message } = req.body;
        
        if (!name || !email || !message) {
            return res.status(400).json({
                success: false,
                message: 'Lütfen tüm alanları doldurun.'
            });
        }
        
        console.log('Contact form submission:', { name, email, message, timestamp: new Date().toISOString() });
        
        res.json({
            success: true,
            message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.'
        });
        
    } catch (error) {
        console.error('Contact form error:', error);
        res.status(500).json({
            success: false,
            message: 'Bir hata oluştu. Lütfen tekrar deneyin.'
        });
    }
});

// Serve index.html for root route
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Meta Conversions API: Send Event Function
async function sendMetaConversionEvent(eventData) {
    if (!META_CONVERSIONS_API_ENABLED) {
        return;
    }
    
    const {
        eventName,
        email,
        phone,
        firstName,
        lastName,
        ip,
        userAgent,
        fbp,
        fbc,
        value,
        currency,
        contentName,
        contentIds
    } = eventData;
    
    // Hash user data (Meta requires SHA256 hashing)
    const hashData = (data) => {
        if (!data) return null;
        return crypto.createHash('sha256').update(data.toLowerCase().trim()).digest('hex');
    };
    
    // Telefon numarasını temizle (sadece rakamlar)
    const cleanPhone = phone ? phone.replace(/\D/g, '') : '';
    
    const userData = {
        em: email ? [hashData(email)] : undefined,
        ph: cleanPhone ? [hashData(cleanPhone)] : undefined,
        fn: firstName ? [hashData(firstName)] : undefined,
        ln: lastName ? [hashData(lastName)] : undefined,
        client_ip_address: ip,
        client_user_agent: userAgent,
        fbp: fbp || undefined,
        fbc: fbc || undefined
    };
    
    // Remove undefined fields
    Object.keys(userData).forEach(key => userData[key] === undefined && delete userData[key]);
    
    const eventData_payload = {
        event_name: eventName,
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: 'http://207.180.204.60:8080/', // Your server URL
        action_source: 'website',
        user_data: userData,
        custom_data: {
            value: value,
            currency: currency,
            content_name: contentName,
            content_ids: contentIds,
            content_type: 'product',
            num_items: 1
        }
    };
    
    const payload = {
        data: [eventData_payload]
    };
    
    const url = `https://graph.facebook.com/${META_API_VERSION}/${META_PIXEL_ID}/events?access_token=${META_ACCESS_TOKEN}`;
    
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    const result = await response.json();
    
    if (result.error) {
        throw new Error(`Meta API Error: ${result.error.message}`);
    }
    
    console.log('📊 Meta Conversions API Response:', result);
    return result;
}

// Start server
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Hürriyet Sağlık server running at http://localhost:${PORT}`);
    console.log(`📱 Access from outside: http://0.0.0.0:${PORT}`);
    console.log(`📊 Meta Pixel ID: ${META_PIXEL_ID}`);
    console.log(`🔐 Meta Conversions API: ${META_CONVERSIONS_API_ENABLED ? 'ENABLED ✅' : 'DISABLED (Set META_ACCESS_TOKEN env var)'}`);
});