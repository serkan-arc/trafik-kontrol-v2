import { NextRequest, NextResponse } from 'next/server'

// Predefined rate limiting templates
const templates = [
  {
    id: 'api_endpoint',
    name: 'API Endpoint Protection',
    description: 'Standard rate limiting for API endpoints',
    icon: '🔌',
    rule: {
      rule_name: 'API Rate Limit',
      path_pattern: '/api/*',
      method: 'ALL',
      rate_limit: 100,
      time_window: 60, // 1 minute
      algorithm: 'fixed_window',
      action: 'block',
      response_code: 429,
      custom_message: 'API rate limit exceeded. Please wait before making more requests.',
      priority: 50,
      enabled: true
    }
  },
  {
    id: 'login_protection',
    name: 'Login Protection',
    description: 'Prevent brute force attacks on login endpoints',
    icon: '🔐',
    rule: {
      rule_name: 'Login Rate Limit',
      path_pattern: '/api/auth/login',
      method: 'POST',
      rate_limit: 5,
      time_window: 300, // 5 minutes
      algorithm: 'fixed_window',
      action: 'block',
      response_code: 429,
      custom_message: 'Too many login attempts. Please try again later.',
      priority: 10,
      enabled: true
    }
  },
  {
    id: 'contact_form',
    name: 'Contact Form',
    description: 'Limit contact form submissions',
    icon: '📧',
    rule: {
      rule_name: 'Contact Form Rate Limit',
      path_pattern: '/api/contact',
      method: 'POST',
      rate_limit: 3,
      time_window: 3600, // 1 hour
      algorithm: 'fixed_window',
      action: 'block',
      response_code: 429,
      custom_message: 'You have exceeded the maximum number of submissions. Please try again later.',
      priority: 30,
      enabled: true
    }
  },
  {
    id: 'search',
    name: 'Search Rate Limit',
    description: 'Control search query frequency',
    icon: '🔍',
    rule: {
      rule_name: 'Search Rate Limit',
      path_pattern: '/api/search',
      method: 'GET',
      rate_limit: 30,
      time_window: 60, // 1 minute
      algorithm: 'token_bucket',
      action: 'throttle',
      response_code: 429,
      custom_message: 'Search rate limit exceeded. Please slow down your queries.',
      priority: 40,
      enabled: true
    }
  },
  {
    id: 'file_upload',
    name: 'File Upload Limit',
    description: 'Restrict file upload frequency',
    icon: '📤',
    rule: {
      rule_name: 'File Upload Rate Limit',
      path_pattern: '/api/upload',
      method: 'POST',
      rate_limit: 10,
      time_window: 600, // 10 minutes
      algorithm: 'fixed_window',
      action: 'block',
      response_code: 429,
      custom_message: 'Upload limit reached. Please wait before uploading more files.',
      priority: 20,
      enabled: true
    }
  },
  {
    id: 'webhook',
    name: 'Webhook Endpoint',
    description: 'Rate limit for webhook receivers',
    icon: '🪝',
    rule: {
      rule_name: 'Webhook Rate Limit',
      path_pattern: '/api/webhooks/*',
      method: 'POST',
      rate_limit: 1000,
      time_window: 60, // 1 minute
      algorithm: 'token_bucket',
      action: 'throttle',
      response_code: 429,
      custom_message: 'Webhook rate limit exceeded. Please distribute your requests.',
      priority: 60,
      enabled: true
    }
  },
  {
    id: 'password_reset',
    name: 'Password Reset',
    description: 'Limit password reset requests',
    icon: '🔑',
    rule: {
      rule_name: 'Password Reset Rate Limit',
      path_pattern: '/api/auth/reset-password',
      method: 'POST',
      rate_limit: 3,
      time_window: 3600, // 1 hour
      algorithm: 'fixed_window',
      action: 'block',
      response_code: 429,
      custom_message: 'Too many password reset requests. Please check your email or try again later.',
      priority: 15,
      enabled: true
    }
  },
  {
    id: 'registration',
    name: 'User Registration',
    description: 'Control new user registrations',
    icon: '👤',
    rule: {
      rule_name: 'Registration Rate Limit',
      path_pattern: '/api/auth/register',
      method: 'POST',
      rate_limit: 2,
      time_window: 3600, // 1 hour
      algorithm: 'fixed_window',
      action: 'block',
      response_code: 429,
      custom_message: 'Registration limit exceeded. Please try again later.',
      priority: 25,
      enabled: true
    }
  },
  {
    id: 'graphql',
    name: 'GraphQL Endpoint',
    description: 'Rate limiting for GraphQL queries',
    icon: '📊',
    rule: {
      rule_name: 'GraphQL Rate Limit',
      path_pattern: '/graphql',
      method: 'POST',
      rate_limit: 50,
      time_window: 60, // 1 minute
      algorithm: 'token_bucket',
      action: 'throttle',
      response_code: 429,
      custom_message: 'GraphQL query limit exceeded. Please reduce your request rate.',
      priority: 45,
      enabled: true
    }
  },
  {
    id: 'public_api',
    name: 'Public API Access',
    description: 'Generous limits for public API access',
    icon: '🌐',
    rule: {
      rule_name: 'Public API Rate Limit',
      path_pattern: '/api/v1/*',
      method: 'ALL',
      rate_limit: 1000,
      time_window: 3600, // 1 hour
      algorithm: 'token_bucket',
      action: 'throttle',
      response_code: 429,
      custom_message: 'Public API rate limit exceeded. Consider upgrading for higher limits.',
      priority: 70,
      enabled: true
    }
  }
]

// GET - Get available rate limiting templates
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ domain: string }> }
) {
  try {
    const { searchParams } = new URL(request.url)
    const category = searchParams.get('category')
    
    let filteredTemplates = templates
    
    // Filter by category if provided
    if (category) {
      // You can extend this to categorize templates
      // For now, return all templates
      filteredTemplates = templates
    }
    
    return NextResponse.json({
      success: true,
      templates: filteredTemplates,
      categories: [
        { id: 'authentication', name: 'Authentication', count: 3 },
        { id: 'api', name: 'API Protection', count: 4 },
        { id: 'forms', name: 'Form Submission', count: 2 },
        { id: 'general', name: 'General', count: 1 }
      ]
    })
    
  } catch (error: any) {
    console.error('Error fetching rate limit templates:', error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}