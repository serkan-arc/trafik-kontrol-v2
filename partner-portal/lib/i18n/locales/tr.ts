import { Translations } from './en'

export const tr: Translations = {
  // Navigation
  nav: {
    dashboard: 'Gösterge Paneli',
    leads: 'Leadler',
    commissions: 'Komisyonlar',
    performance: 'Performans',
    profile: 'Profil',
    logout: 'Çıkış',
    language: 'Dil'
  },

  // Auth
  auth: {
    login: 'Giriş Yap',
    username: 'Kullanıcı Adı',
    password: 'Şifre',
    rememberMe: 'Beni hatırla',
    forgotPassword: 'Şifremi unuttum?',
    loginButton: 'Giriş Yap',
    loggingIn: 'Giriş yapılıyor...',
    invalidCredentials: 'Geçersiz kullanıcı adı veya şifre',
    welcomeBack: 'Hoş geldiniz',
    partnerPortal: 'Partner Portalı'
  },

  // Dashboard
  dashboard: {
    title: 'Gösterge Paneli',
    welcome: 'Hoş geldiniz',
    overview: 'Genel Bakış',
    stats: {
      totalLeads: 'Toplam Lead',
      pendingCommissions: 'Bekleyen Komisyonlar',
      paidCommissions: 'Ödenen Komisyonlar',
      totalEarnings: 'Toplam Kazanç',
      thisMonth: 'Bu Ay',
      lastMonth: 'Geçen Ay',
      conversionRate: 'Dönüşüm Oranı',
      activeDeals: 'Aktif Anlaşmalar'
    },
    recentActivity: 'Son Aktiviteler',
    quickActions: 'Hızlı İşlemler',
    viewAllLeads: 'Tüm Leadleri Gör',
    viewCommissions: 'Komisyonları Gör',
    downloadReport: 'Rapor İndir'
  },

  // Leads
  leads: {
    title: 'Leadler',
    allLeads: 'Tüm Leadler',
    trackingId: 'Takip ID',
    offer: 'Ürün',
    status: 'Durum',
    commission: 'Komisyon',
    date: 'Tarih',
    actions: 'İşlemler',
    search: 'Takip ID ara...',
    filter: 'Filtrele',
    export: 'Dışa Aktar',
    noLeads: 'Lead bulunamadı',
    loadMore: 'Daha Fazla Yükle',
    showing: 'Gösterilen',
    of: '/',
    results: 'sonuç',
    
    // Statuses
    statuses: {
      pending: 'Beklemede',
      approved_for_crm: 'Onaylandı',
      in_package: 'Pakette',
      sent_to_crm: 'CRM\'e Gönderildi',
      contacted: 'İletişime Geçildi',
      approved: 'Onaylandı',
      shipped: 'Kargoya Verildi',
      delivered: 'Teslim Edildi',
      sold: 'Satıldı',
      rejected: 'Reddedildi',
      on_hold: 'Beklemede'
    },

    // Filters
    filters: {
      all: 'Tümü',
      thisWeek: 'Bu Hafta',
      thisMonth: 'Bu Ay',
      lastMonth: 'Geçen Ay',
      customRange: 'Özel Aralık',
      byOffer: 'Ürüne Göre',
      byStatus: 'Duruma Göre'
    }
  },

  // Commissions
  commissions: {
    title: 'Komisyonlar',
    pending: 'Bekleyen',
    approved: 'Onaylanan',
    paid: 'Ödenen',
    rejected: 'Reddedilen',
    total: 'Toplam',
    amount: 'Tutar',
    type: 'Tip',
    status: 'Durum',
    date: 'Tarih',
    details: 'Detaylar',
    noCommissions: 'Komisyon bulunamadı',
    
    types: {
      lead: 'Lead Komisyonu',
      sale: 'Satış Komisyonu',
      recurring: 'Tekrarlayan Komisyon'
    },

    summary: {
      totalEarned: 'Toplam Kazanç',
      pendingAmount: 'Bekleyen Tutar',
      paidThisMonth: 'Bu Ay Ödenen',
      nextPayment: 'Sonraki Ödeme'
    }
  },

  // Performance
  performance: {
    title: 'Performans',
    overview: 'Performans Genel Bakış',
    charts: {
      leadsOverTime: 'Zaman İçinde Leadler',
      conversionRate: 'Dönüşüm Oranı',
      commissionTrends: 'Komisyon Trendleri',
      offerPerformance: 'Ürün Performansı'
    },
    metrics: {
      totalLeads: 'Toplam Lead',
      convertedLeads: 'Dönüşen Leadler',
      conversionRate: 'Dönüşüm Oranı',
      avgCommission: 'Ort. Komisyon',
      topOffer: 'En İyi Ürün',
      bestMonth: 'En İyi Ay'
    },
    period: {
      today: 'Bugün',
      week: 'Bu Hafta',
      month: 'Bu Ay',
      year: 'Bu Yıl',
      custom: 'Özel'
    }
  },

  // Profile
  profile: {
    title: 'Profil',
    accountInfo: 'Hesap Bilgileri',
    buyerCode: 'Partner Kodu',
    companyName: 'Şirket Adı',
    email: 'E-posta',
    phone: 'Telefon',
    activeDeals: 'Aktif Anlaşmalar',
    memberSince: 'Üyelik Tarihi',
    lastLogin: 'Son Giriş',
    changePassword: 'Şifre Değiştir',
    currentPassword: 'Mevcut Şifre',
    newPassword: 'Yeni Şifre',
    confirmPassword: 'Şifre Tekrar',
    updateProfile: 'Profili Güncelle',
    updated: 'Profil başarıyla güncellendi'
  },

  // Common
  common: {
    loading: 'Yükleniyor...',
    error: 'Hata',
    success: 'Başarılı',
    save: 'Kaydet',
    cancel: 'İptal',
    delete: 'Sil',
    edit: 'Düzenle',
    view: 'Görüntüle',
    close: 'Kapat',
    back: 'Geri',
    next: 'İleri',
    previous: 'Önceki',
    confirm: 'Onayla',
    search: 'Ara',
    filter: 'Filtrele',
    export: 'Dışa Aktar',
    import: 'İçe Aktar',
    download: 'İndir',
    upload: 'Yükle',
    refresh: 'Yenile',
    settings: 'Ayarlar',
    help: 'Yardım',
    about: 'Hakkında',
    contact: 'İletişim',
    support: 'Destek',
    documentation: 'Dokümantasyon',
    privacyPolicy: 'Gizlilik Politikası',
    termsOfService: 'Kullanım Koşulları',
    copyright: '© 2024 DTEK. Tüm hakları saklıdır.'
  }
}
