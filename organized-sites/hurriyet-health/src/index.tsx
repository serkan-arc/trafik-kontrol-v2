import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for API routes
app.use('/api/*', cors())

// API route for form submissions
app.post('/api/submit-order', async (c) => {
  try {
    const formData = await c.req.json()
    
    // Basic validation
    const { name, surname, phone, address, quantity = 1 } = formData
    
    if (!name || !surname || !phone || !address) {
      return c.json({ 
        success: false, 
        message: 'Lütfen tüm alanları doldurun.' 
      }, 400)
    }
    
    // Phone validation (Turkish format)
    const phoneRegex = /^0[0-9]{3}\s?[0-9]{3}\s?[0-9]{2}\s?[0-9]{2}$/
    if (!phoneRegex.test(phone.replace(/\s/g, ''))) {
      return c.json({ 
        success: false, 
        message: 'Geçerli bir telefon numarası girin.' 
      }, 400)
    }
    
    // Simulate order processing
    console.log('Order received:', {
      name,
      surname,
      phone,
      address,
      quantity,
      timestamp: new Date().toISOString()
    })
    
    // Return success response
    return c.json({
      success: true,
      message: 'Siparişiniz başarıyla alındı! En kısa sürede sizinle iletişime geçeceğiz.',
      orderNumber: `HS${Date.now()}`,
      estimatedDelivery: '2-3 iş günü'
    })
    
  } catch (error) {
    console.error('Order submission error:', error)
    return c.json({ 
      success: false, 
      message: 'Bir hata oluştu. Lütfen tekrar deneyin.' 
    }, 500)
  }
})

// API route for newsletter subscription
app.post('/api/subscribe-newsletter', async (c) => {
  try {
    const { email } = await c.req.json()
    
    if (!email) {
      return c.json({ 
        success: false, 
        message: 'E-posta adresi gerekli.' 
      }, 400)
    }
    
    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return c.json({ 
        success: false, 
        message: 'Geçerli bir e-posta adresi girin.' 
      }, 400)
    }
    
    console.log('Newsletter subscription:', { email, timestamp: new Date().toISOString() })
    
    return c.json({
      success: true,
      message: 'Bültenimize başarıyla kaydoldunuz!'
    })
    
  } catch (error) {
    console.error('Newsletter subscription error:', error)
    return c.json({ 
      success: false, 
      message: 'Bir hata oluştu. Lütfen tekrar deneyin.' 
    }, 500)
  }
})

// API route for contact form
app.post('/api/contact', async (c) => {
  try {
    const { name, email, message } = await c.req.json()
    
    if (!name || !email || !message) {
      return c.json({ 
        success: false, 
        message: 'Lütfen tüm alanları doldurun.' 
      }, 400)
    }
    
    console.log('Contact form submission:', { name, email, message, timestamp: new Date().toISOString() })
    
    return c.json({
      success: true,
      message: 'Mesajınız başarıyla gönderildi. En kısa sürede size dönüş yapacağız.'
    })
    
  } catch (error) {
    console.error('Contact form error:', error)
    return c.json({ 
      success: false, 
      message: 'Bir hata oluştu. Lütfen tekrar deneyin.' 
    }, 500)
  }
})

// Serve all static files from root
app.use('*', serveStatic({ root: './' }))

export default app