import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  redis: {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  downstreamBaseUrl: process.env.DOWNSTREAM_BASE_URL || 'http://localhost:4000',
  rateLimit: {
    capacity: parseInt(process.env.RATE_LIMIT_CAPACITY || '10', 10),
    refillRate: parseInt(process.env.RATE_LIMIT_REFILL_RATE || '5', 10),
  },
};
