import { verifySession } from '../services/authService.js';
import { hasPermission } from '../config/permissions.js';
import { noStore } from './cacheControl.js';

export { noStore };

export const BACKGROUND_POLL_HEADER = 'X-Background-Poll';

export function getBearerToken(req) {
  const [scheme, token] = (req.get('Authorization') || '').split(' ');
  return scheme === 'Bearer' && token ? token : '';
}

export async function authenticate(req, res, next) {
  try {
    const token = getBearerToken(req);
    const background = req.get(BACKGROUND_POLL_HEADER) === '1';
    const context = token ? await verifySession(token, { touch: !background }) : null;

    if (!context) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. Please sign in.',
      });
    }

    req.user = context.user;
    req.authSession = { id: context.sessionId, expiresAt: context.expiresAt };
    return next();
  } catch (error) {
    return next(error);
  }
}

export function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user || !hasPermission(req.user.role, permission)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }

    return next();
  };
}

