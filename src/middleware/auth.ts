import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'unauthorized', msg: 'missing or invalid auth header' });
  }

  const token = authHeader.split(' ')[1];

  // Mock validation: normally we'd verify the signature with a secret/public key
  try {
    const decoded = jwt.decode(token);
    if (!decoded) {
      throw new Error('invalid token structure');
    }
    // attach to request
    (req as any).user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: 'forbidden', msg: 'failed to validate token' });
  }
};
