export const en = {
  // Navigation
  nav: {
    dashboard: 'Dashboard',
    leads: 'Leads',
    commissions: 'Commissions',
    performance: 'Performance',
    profile: 'Profile',
    logout: 'Logout',
    language: 'Language'
  },

  // Auth
  auth: {
    login: 'Login',
    username: 'Username',
    password: 'Password',
    rememberMe: 'Remember me',
    forgotPassword: 'Forgot password?',
    loginButton: 'Sign In',
    loggingIn: 'Signing in...',
    invalidCredentials: 'Invalid username or password',
    welcomeBack: 'Welcome back',
    partnerPortal: 'Partner Portal'
  },

  // Dashboard
  dashboard: {
    title: 'Dashboard',
    welcome: 'Welcome',
    overview: 'Overview',
    stats: {
      totalLeads: 'Total Leads',
      pendingCommissions: 'Pending Commissions',
      paidCommissions: 'Paid Commissions',
      totalEarnings: 'Total Earnings',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      conversionRate: 'Conversion Rate',
      activeDeals: 'Active Deals'
    },
    recentActivity: 'Recent Activity',
    quickActions: 'Quick Actions',
    viewAllLeads: 'View All Leads',
    viewCommissions: 'View Commissions',
    downloadReport: 'Download Report'
  },

  // Leads
  leads: {
    title: 'Leads',
    allLeads: 'All Leads',
    trackingId: 'Tracking ID',
    offer: 'Offer',
    status: 'Status',
    commission: 'Commission',
    date: 'Date',
    actions: 'Actions',
    search: 'Search tracking ID...',
    filter: 'Filter',
    export: 'Export',
    noLeads: 'No leads found',
    loadMore: 'Load More',
    showing: 'Showing',
    of: 'of',
    results: 'results',
    
    // Statuses
    statuses: {
      pending: 'Pending',
      approved_for_crm: 'Approved',
      in_package: 'In Package',
      sent_to_crm: 'Sent to CRM',
      contacted: 'Contacted',
      approved: 'Approved',
      shipped: 'Shipped',
      delivered: 'Delivered',
      sold: 'Sold',
      rejected: 'Rejected',
      on_hold: 'On Hold'
    },

    // Filters
    filters: {
      all: 'All',
      thisWeek: 'This Week',
      thisMonth: 'This Month',
      lastMonth: 'Last Month',
      customRange: 'Custom Range',
      byOffer: 'By Offer',
      byStatus: 'By Status'
    }
  },

  // Commissions
  commissions: {
    title: 'Commissions',
    pending: 'Pending',
    approved: 'Approved',
    paid: 'Paid',
    rejected: 'Rejected',
    total: 'Total',
    amount: 'Amount',
    type: 'Type',
    status: 'Status',
    date: 'Date',
    details: 'Details',
    noCommissions: 'No commissions found',
    
    types: {
      lead: 'Lead Commission',
      sale: 'Sale Commission',
      recurring: 'Recurring Commission'
    },

    summary: {
      totalEarned: 'Total Earned',
      pendingAmount: 'Pending Amount',
      paidThisMonth: 'Paid This Month',
      nextPayment: 'Next Payment'
    }
  },

  // Performance
  performance: {
    title: 'Performance',
    overview: 'Performance Overview',
    charts: {
      leadsOverTime: 'Leads Over Time',
      conversionRate: 'Conversion Rate',
      commissionTrends: 'Commission Trends',
      offerPerformance: 'Offer Performance'
    },
    metrics: {
      totalLeads: 'Total Leads',
      convertedLeads: 'Converted Leads',
      conversionRate: 'Conversion Rate',
      avgCommission: 'Avg Commission',
      topOffer: 'Top Offer',
      bestMonth: 'Best Month'
    },
    period: {
      today: 'Today',
      week: 'This Week',
      month: 'This Month',
      year: 'This Year',
      custom: 'Custom'
    }
  },

  // Profile
  profile: {
    title: 'Profile',
    accountInfo: 'Account Information',
    buyerCode: 'Buyer Code',
    companyName: 'Company Name',
    email: 'Email',
    phone: 'Phone',
    activeDeals: 'Active Deals',
    memberSince: 'Member Since',
    lastLogin: 'Last Login',
    changePassword: 'Change Password',
    currentPassword: 'Current Password',
    newPassword: 'New Password',
    confirmPassword: 'Confirm Password',
    updateProfile: 'Update Profile',
    updated: 'Profile updated successfully'
  },

  // Common
  common: {
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    save: 'Save',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    view: 'View',
    close: 'Close',
    back: 'Back',
    next: 'Next',
    previous: 'Previous',
    confirm: 'Confirm',
    search: 'Search',
    filter: 'Filter',
    export: 'Export',
    import: 'Import',
    download: 'Download',
    upload: 'Upload',
    refresh: 'Refresh',
    settings: 'Settings',
    help: 'Help',
    about: 'About',
    contact: 'Contact',
    support: 'Support',
    documentation: 'Documentation',
    privacyPolicy: 'Privacy Policy',
    termsOfService: 'Terms of Service',
    copyright: '© 2024 DTEK. All rights reserved.'
  }
}

export type Translations = typeof en
