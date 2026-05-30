import { Injectable, Inject } from '@nestjs/common';
import type { Redis } from 'ioredis';

@Injectable()
export class RedisService {
  constructor(@Inject('REDIS_CLIENT') private readonly redis: Redis) {}

  /** Get remaining tokens for a user */
  async getQuota(userId: string): Promise<number> {
    const key = `quota:${userId}`;
    const val = await this.redis.get(key);
    return val ? parseInt(val, 10) : 0;
  }

  /** Set quota for a user (in tokens) */
  async setQuota(userId: string, tokens: number): Promise<void> {
    const key = `quota:${userId}`;
    await this.redis.set(key, tokens);
  }

  /** Atomically deduct tokens; returns false if insufficient */
  async deductTokens(userId: string, tokens: number): Promise<boolean> {
    const key = `quota:${userId}`;
    // Lua script for atomic check-and-deduct
    const script = `
      local current = tonumber(redis.call('GET', KEYS[1])) or 0
      if current < tonumber(ARGV[1]) then
        return 0
      end
      redis.call('DECRBY', KEYS[1], ARGV[1])
      return 1
    `;
    const result = await this.redis.eval(script, 1, key, tokens);
    return result === 1;
  }

  /** Get usage percentage for a user */
  async getUsagePercent(
    userId: string,
    allocated: number,
  ): Promise<number> {
    const remaining = await this.getQuota(userId);
    const used = allocated - remaining;
    return Math.round((used / allocated) * 100);
  }

  /** Cache a prompt response */
  async setCachedResponse(
    promptHash: string,
    response: string,
    ttlSeconds = 3600,
  ): Promise<void> {
    await this.redis.setex(`cache:${promptHash}`, ttlSeconds, response);
  }

  /** Get a cached response */
  async getCachedResponse(promptHash: string): Promise<string | null> {
    return this.redis.get(`cache:${promptHash}`);
  }

  /** Rate limiting: track requests per user per window */
  async incrementRateLimit(
    userId: string,
    windowSeconds = 60,
  ): Promise<number> {
    const key = `ratelimit:${userId}`;
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, windowSeconds);
    }
    return count;
  }
}
