import Redis from 'ioredis';
import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const redis = new Redis({
  host: config.redis.host,
  port: config.redis.port,
  // ensure good retry strategy
  retryStrategy: (times) => Math.min(times * 50, 2000),
});

// Redis Lua script for Token Bucket
const luaScript = `
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refillRate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])
local requested = 1

local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
local tokens = tonumber(bucket[1])
local lastRefill = tonumber(bucket[2])

if tokens == nil then
  tokens = capacity
  lastRefill = now
else
  local timeElapsed = math.max(0, now - lastRefill)
  local tokensToAdd = math.floor(timeElapsed * refillRate)

  if tokensToAdd > 0 then
    tokens = math.min(capacity, tokens + tokensToAdd)
    lastRefill = now
  end
end

if tokens >= requested then
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', lastRefill)
  redis.call('EXPIRE', key, math.ceil(capacity / refillRate) + 10)
  return 1
else
  return 0
end
`;

// Define a custom command to make it easier to call
redis.defineCommand('consumeToken', {
  numberOfKeys: 1,
  lua: luaScript,
});

export const rateLimiter = async (req: Request, res: Response, next: NextFunction) => {
  const ip = req.ip || 'unknown';
  const key = `rate_limit:${ip}`;

  // in seconds
  const now = Math.floor(Date.now() / 1000);

  try {
    // @ts-ignore - custom command
    const allowed = await redis.consumeToken(
      key,
      config.rateLimit.capacity,
      config.rateLimit.refillRate,
      now
    );

    if (allowed === 1) {
      return next();
    }

    return res.status(429).json({ error: 'rate limited', msg: 'Too many requests, slow down.' });
  } catch (err) {
    console.error('rate limiter err', err);
    // fallback open in case of redis failure
    next();
  }
};
