import helmet from 'helmet';
import { env } from '../config/env.js';

export function enforceHttps(req, res, next) {
  if ((env.isProd || env.forceHttps) && req.headers['x-forwarded-proto'] !== 'https' && !req.secure) {
    return res.redirect(301, `https://${req.headers.host}${req.originalUrl}`);
  }
  return next();
}

export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://checkout.razorpay.com'],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", env.frontendUrl, 'https://api.razorpay.com', 'https://lumberjack.razorpay.com'],
      frameSrc: ["'self'", 'https://api.razorpay.com'],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: env.isProd ? [] : null,
    },
  },
  hsts: env.isProd
    ? {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      }
    : false,
  noSniff: true,
  frameguard: { action: 'deny' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
});
