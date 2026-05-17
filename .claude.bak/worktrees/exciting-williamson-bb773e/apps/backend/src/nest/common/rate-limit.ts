import IORedis from 'ioredis';
import { getRedisUrl, isRedisDisabled } from '../../config/redis';

type Counter = { count: number; expiresAt: number };

const memoryStore = new Map<string, Counter>();

let redisClient: IORedis | null = null;

function getRedisClient(): IORedis | null {
  if (isRedisDisabled()) return null;
  if (!redisClient) {
    redisClient = new IORedis(getRedisUrl(), {
      maxRetriesPerRequest: 2,
    });
  }
  return redisClient;
}

/**
 * Basit rate-limit sayacı. Her çağrıda sayacı 1 arttırır ve TTL dolunca sıfırlar.
 * Redis varsa Redis, yoksa in-memory fallback kullanır.
 */
export async function incrWithTtl(key: string, ttlSeconds: number): Promise<number> {
  const ttl = Math.max(1, ttlSeconds | 0);
  const client = getRedisClient();
  if (client) {
    const count = await client.incr(key);
    if (count === 1) {
      await client.expire(key, ttl);
    }
    return count;
  }

  const now = Date.now();
  const existing = memoryStore.get(key);
  if (!existing || existing.expiresAt <= now) {
    const counter: Counter = { count: 1, expiresAt: now + ttl * 1000 };
    memoryStore.set(key, counter);
    return 1;
  }
  existing.count += 1;
  return existing.count;
}

