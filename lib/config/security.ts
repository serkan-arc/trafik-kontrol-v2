import crypto from 'crypto';

// Güvenli JWT secret üretici
export function generateSecureSecret(): string {
  return crypto.randomBytes(64).toString('hex');
}

// Environment-based configuration
export const securityConfig = {
  jwt: {
    secret: process.env.JWT_SECRET || generateSecureSecret(),
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    algorithm: 'HS256' as const,
  },
  bcrypt: {
    saltRounds: 12,
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 dakika
    maxRequests: 100, // maksimum istek sayısı
  },
  cors: {
    origin: process.env.NODE_ENV === 'production' 
      ? process.env.ALLOWED_ORIGINS?.split(',') || ['https://dtektracking.com']
      : ['http://localhost:3000', 'http://localhost:3001'],
    credentials: true,
  },
};

// Production güvenlik kontrolleri
export function validateProductionConfig(): void {
  if (process.env.NODE_ENV === 'production') {
    // JWT Secret kontrolü
    if (!process.env.JWT_SECRET || process.env.JWT_SECRET.includes('change_this')) {
      throw new Error('Production JWT_SECRET is not properly configured!');
    }
    
    // JWT Secret uzunluk kontrolü
    if (process.env.JWT_SECRET.length < 32) {
      throw new Error('JWT_SECRET must be at least 32 characters long in production!');
    }
    
    // Database password kontrolü
    if (!process.env.DB_PASSWORD || process.env.DB_PASSWORD.length < 20) {
      throw new Error('Database password is not secure enough for production!');
    }
  }
}