import { Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config';
import { circuitBreaker } from '../middleware/circuitBreaker';

export const proxyHandler = async (req: Request, res: Response) => {
  if (!circuitBreaker.allowRequest()) {
    return res.status(503).json({ error: 'service unavailable', msg: 'circuit breaker is OPEN' });
  }

  // Ensure trailing slash isn't an issue
  const baseUrl = config.downstreamBaseUrl.replace(/\/$/, '');

  // Here we reconstruct the service routing part
  // Extracting from dynamic routing params if present or defaulting
  const service = req.params.service || 'default';

  // The originalUrl starts with /api/:service/..., but we want to forward
  // just the remainder to the respective service. If downstreams are unique hosts per service,
  // we would route based on the `service` string. Since the spec asks for a simple implementation
  // with a single downstream environment variable, we'll prefix the service path.
  const pathPart = req.params[0] ? `/${req.params[0]}` : '';
  const url = `${baseUrl}/${service}${pathPart}`;

  try {
    const upstreamRes = await axios({
      method: req.method,
      url,
      data: req.body,
      headers: {
        ...req.headers,
        host: undefined, // let axios manage the host header for the downstream
      },
      timeout: 1500, // Strict timeout per spec
      // Prevent axios from throwing on 4xx/5xx - we handle it manually
      validateStatus: () => true,
    });

    // Check if the downstream threw a 5xx
    if (upstreamRes.status >= 500) {
      circuitBreaker.recordFailure();
    } else {
      circuitBreaker.recordSuccess();
    }

    res.status(upstreamRes.status);
    Object.entries(upstreamRes.headers).forEach(([key, value]) => {
      if (value) res.setHeader(key, value as string | string[]);
    });

    return res.send(upstreamRes.data);
  } catch (err: any) {
    circuitBreaker.recordFailure();

    if (err.code === 'ECONNABORTED') {
      return res.status(504).json({ error: 'gateway timeout', msg: 'downstream service took too long' });
    }

    // Other errors (e.g. connection refused)
    return res.status(502).json({ error: 'bad gateway', msg: 'unable to reach downstream service' });
  }
};
