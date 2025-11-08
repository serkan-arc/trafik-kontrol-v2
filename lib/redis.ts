/**
 * Redis Connection Module
 * Redis client for caching and session management
 */

import { createClient, RedisClientType } from 'redis';

class RedisClient {
  private static instance: RedisClient;
  private client: RedisClientType;
  private isConnected: boolean = false;

  private constructor() {
    this.client = createClient({
      url: `redis://${process.env.REDIS_HOST || 'localhost'}:${process.env.REDIS_PORT || 6379}`,
    });

    this.client.on('error', (err) => {
      console.error('Redis Client Error:', err);
      this.isConnected = false;
    });

    this.client.on('connect', () => {
      console.log('Redis Client Connected');
      this.isConnected = true;
    });
  }

  public static getInstance(): RedisClient {
    if (!RedisClient.instance) {
      RedisClient.instance = new RedisClient();
    }
    return RedisClient.instance;
  }

  public async connect(): Promise<void> {
    if (!this.isConnected) {
      await this.client.connect();
    }
  }

  public async get(key: string): Promise<string | null> {
    await this.connect();
    return await this.client.get(key);
  }

  public async set(key: string, value: string, expirationSeconds?: number): Promise<void> {
    await this.connect();
    if (expirationSeconds) {
      await this.client.setEx(key, expirationSeconds, value);
    } else {
      await this.client.set(key, value);
    }
  }

  public async del(key: string): Promise<void> {
    await this.connect();
    await this.client.del(key);
  }

  public async exists(key: string): Promise<boolean> {
    await this.connect();
    const result = await this.client.exists(key);
    return result === 1;
  }

  public async incr(key: string): Promise<number> {
    await this.connect();
    return await this.client.incr(key);
  }

  public async expire(key: string, seconds: number): Promise<boolean> {
    await this.connect();
    const result = await this.client.expire(key, seconds);
    return result === 1;
  }

  public async ttl(key: string): Promise<number> {
    await this.connect();
    return await this.client.ttl(key);
  }

  public async info(section?: string): Promise<string> {
    await this.connect();
    return await this.client.info(section);
  }

  public async close(): Promise<void> {
    if (this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
    }
  }
}

// Export singleton instance
export const redis = RedisClient.getInstance();
