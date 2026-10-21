import express from 'express';
import { config } from './config';
import { authMiddleware } from './middleware/auth';
import { rateLimiter } from './middleware/rateLimiter';
import { proxyHandler } from './proxy';

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Structured logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const elapsed = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} ${res.statusCode} ${elapsed}ms`);
  });
  next();
});

// Basic Request Validation / Schema Header Injection
app.use((req, res, next) => {
  req.headers['x-gateway-id'] = 'gatekeeper-1';
  next();
});

// Centralized routing for downstream services using regex for compatibility
app.all(/^\/api\/([^\/]+)(?:\/(.*))?$/, rateLimiter, authMiddleware, (req, res, next) => {
    req.params.service = req.params[0];
    // Reconstruct the remaining path if any
    const rest = req.params[1] ? `/${req.params[1]}` : '';
    // Store in req.params for proxyHandler to consume
    req.params[0] = rest;
    next();
}, proxyHandler);

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(config.port, () => {
  console.log(`Gatekeeper listening on port ${config.port}`);
});
