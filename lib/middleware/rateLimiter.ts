import rateLimit from 'express-rate-limit';
import Redis from 'ioredis';
import { NextApiRequest, NextApiResponse } from 'next';

// Redis client for distributed rate limiting
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

// Rate limiter store using Redis
class RedisStore {
  private prefix: string;
  private client: Redis;
  
  constructor(client: Redis, prefix = 'rl:') {
    this.client = client;
    this.prefix = prefix;
  }
  
  async incr(key: string): Promise<{ totalHits: number; resetTime?: Date }> {
    const multi = this.client.multi();
    const redisKey = `${this.prefix}${key}`;
    const ttl = Math.round(15 * 60); // 15 minutes in seconds
    
    multi.incr(redisKey);
    multi.expire(redisKey, ttl);
    
    const results = await multi.exec();
    if (!results) {
      throw new Error('Redis operation failed');
    }
    
    const totalHits = results[0][1] as number;
    const expireTime = Date.now() + (ttl * 1000);
    
    return {
      totalHits,
      resetTime: new Date(expireTime),
    };
  }
  
  async decrement(key: string): Promise<void> {
    await this.client.decr(`${this.prefix}${key}`);
  }
  
  async resetKey(key: string): Promise<void> {
    await this.client.del(`${this.prefix}${key}`);
  }
}

// Rate limiter configurations
export const rateLimiters = {
  // API genel rate limiter
  api: rateLimit({
    windowMs: 15 * 60 * 1000, // 15 dakika
    max: 100, // maksimum 100 istek
    message: 'Too many requests from this IP, please try again later.',
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore(redis) as any,
  }),
  
  // Auth endpoints için daha sıkı limit
  auth: rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // 15 dakikada maksimum 5 deneme
    message: 'Too many authentication attempts, please try again later.',
    skipSuccessfulRequests: true, // Başarılı istekleri sayma
    store: new RedisStore(redis) as any,
  }),
  
  // Data endpoints için orta seviye limit
  data: rateLimit({
    windowMs: 1 * 60 * 1000, // 1 dakika
    max: 30, // dakikada 30 istek
    message: 'Rate limit exceeded for data requests.',
    store: new RedisStore(redis) as any,
  }),
  
  // Heavy operations için düşük limit
  heavy: rateLimit({
    windowMs: 60 * 60 * 1000, // 1 saat
    max: 10, // saatte 10 istek
    message: 'Heavy operation rate limit exceeded.',
    store: new RedisStore(redis) as any,
  }),
};

// Next.js API route wrapper
export function withRateLimit(
  handler: (req: NextApiRequest, res: NextApiResponse) => Promise<void>,
  limiterType: keyof typeof rateLimiters = 'api'
) {
  return async (req: NextApiRequest, res: NextApiResponse) => {
    // IP adresini al
    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || 
                req.socket.remoteAddress || 
                'unknown';
    
    try {
      // Rate limiting kontrolü
      const limiter = rateLimiters[limiterType];
      const key = `${limiterType}:${ip}`;
      const { totalHits, resetTime } = await new RedisStore(redis).incr(key);
      
      const limit = limiterType === 'auth' ? 5 : 
                   limiterType === 'data' ? 30 : 
                   limiterType === 'heavy' ? 10 : 100;
      
      // Headers'ı set et
      res.setHeader('X-RateLimit-Limit', limit.toString());
      res.setHeader('X-RateLimit-Remaining', Math.max(0, limit - totalHits).toString());
      res.setHeader('X-RateLimit-Reset', resetTime?.toISOString() || '');
      
      if (totalHits > limit) {
        return res.status(429).json({
          error: 'Too many requests',
          message: `Rate limit exceeded. Please try again at ${resetTime?.toISOString()}`,
        });
      }
      
      // Ana handler'ı çalıştır
      await handler(req, res);
    } catch (error) {
      console.error('Rate limiting error:', error);
      // Rate limiting hatası durumunda isteği geçir
      await handler(req, res);
    }
  };
}

// Cleanup on process exit
process.on('SIGTERM', () => {
  redis.disconnect();
});

process.on('SIGINT', () => {
  redis.disconnect();
});