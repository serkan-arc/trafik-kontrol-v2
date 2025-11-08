import { NextApiRequest, NextApiResponse } from 'next';
import { withRateLimit } from './rateLimiter';

// API Güvenlik Middleware'i
export interface ApiSecurityOptions {
  rateLimit?: 'api' | 'auth' | 'data' | 'heavy';
  requireAuth?: boolean;
  allowedMethods?: string[];
  validateInput?: boolean;
}

// Input validation helper
function validateRequestInput(req: NextApiRequest): boolean {
  // SQL Injection patterns
  const sqlInjectionPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER)\b)/gi,
    /(--|#|\/\*|\*\/|;|\||\\)/g,
    /(\bOR\b\s*\d+\s*=\s*\d+)/gi,
    /(\bAND\b\s*\d+\s*=\s*\d+)/gi,
  ];
  
  // XSS patterns
  const xssPatterns = [
    /<script[^>]*>.*?<\/script>/gi,
    /<iframe[^>]*>.*?<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];
  
  // Request body'yi string'e çevir
  const bodyStr = JSON.stringify(req.body || {});
  const queryStr = JSON.stringify(req.query || {});
  const combinedStr = bodyStr + queryStr;
  
  // SQL Injection kontrolü
  for (const pattern of sqlInjectionPatterns) {
    if (pattern.test(combinedStr)) {
      console.warn('Potential SQL injection detected:', pattern);
      return false;
    }
  }
  
  // XSS kontrolü
  for (const pattern of xssPatterns) {
    if (pattern.test(combinedStr)) {
      console.warn('Potential XSS attack detected:', pattern);
      return false;
    }
  }
  
  return true;
}

// CORS headers
function setCorsHeaders(res: NextApiResponse) {
  const allowedOrigins = process.env.NODE_ENV === 'production'
    ? ['https://dtektracking.com', 'https://www.dtektracking.com']
    : ['http://localhost:3000', 'http://localhost:3001'];
  
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', allowedOrigins[0]); // Dynamic based on request
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}

// Auth validation
async function validateAuth(req: NextApiRequest): Promise<boolean> {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return false;
  }
  
  try {
    // JWT validation burada yapılacak
    // Şimdilik basit bir kontrol
    return token.length > 20;
  } catch (error) {
    console.error('Auth validation error:', error);
    return false;
  }
}

// Ana güvenlik wrapper
export function withApiProtection(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  options: ApiSecurityOptions = {}
) {
  const {
    rateLimit = 'api',
    requireAuth = false,
    allowedMethods = ['GET', 'POST', 'PUT', 'DELETE'],
    validateInput = true,
  } = options;
  
  // Rate limiting uygula
  const rateLimitedHandler = withRateLimit(handler, rateLimit);
  
  return async (req: NextApiRequest, res: NextApiResponse) => {
    try {
      // CORS headers'ı set et
      setCorsHeaders(res);
      
      // OPTIONS request'leri için hemen dön
      if (req.method === 'OPTIONS') {
        return res.status(200).end();
      }
      
      // Method kontrolü
      if (!allowedMethods.includes(req.method || '')) {
        return res.status(405).json({
          error: 'Method not allowed',
          allowed: allowedMethods,
        });
      }
      
      // Input validation
      if (validateInput && !validateRequestInput(req)) {
        return res.status(400).json({
          error: 'Invalid input detected',
          message: 'Request contains potentially malicious content',
        });
      }
      
      // Auth kontrolü
      if (requireAuth) {
        const isAuthenticated = await validateAuth(req);
        if (!isAuthenticated) {
          return res.status(401).json({
            error: 'Unauthorized',
            message: 'Valid authentication required',
          });
        }
      }
      
      // Rate limited handler'ı çalıştır
      await rateLimitedHandler(req, res);
      
    } catch (error) {
      console.error('API Protection error:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: process.env.NODE_ENV === 'development' ? error : 'An error occurred',
      });
    }
  };
}