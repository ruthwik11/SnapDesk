/**
 * SnapDesk Authentication & Role-Based Access Control (RBAC)
 * Strictly separates Business Accounts from Customer Accounts.
 */

import crypto from 'node:crypto';

// Secret key for HMAC token signing
const AUTH_SECRET = process.env.AUTH_SECRET || 'snapdesk_secure_tenant_secret_key_2026';

class AuthService {
  constructor() {
    this.sessions = new Map(); // token -> session data
  }

  hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return { salt, hash };
  }

  verifyPassword(password, salt, storedHash) {
    const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(storedHash));
  }

  createSession(user) {
    const token = `stk_${crypto.randomBytes(24).toString('hex')}`;
    const sessionData = {
      token,
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role, // 'business_admin', 'business_staff', 'customer'
      businessId: user.businessId || null,
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };

    this.sessions.set(token, sessionData);
    return sessionData;
  }

  getSession(token) {
    if (!token) return null;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    const session = this.sessions.get(cleanToken);
    if (!session) return null;

    if (Date.now() > session.expiresAt) {
      this.sessions.delete(cleanToken);
      return null;
    }
    return session;
  }

  revokeSession(token) {
    if (!token) return;
    const cleanToken = token.replace(/^Bearer\s+/i, '').trim();
    this.sessions.delete(cleanToken);
  }
}

export const authService = new AuthService();

/**
 * Middleware: Requires a valid authenticated session.
 */
export function requireAuth(req, res, next) {
  let cookieToken = null;
  if (req.headers.cookie) {
    const match = req.headers.cookie.match(/(?:^|;\s*)snapdesk_session=([^;]+)/);
    if (match) cookieToken = match[1];
  }
  const authHeader = req.headers.authorization || req.headers['x-session-token'] || cookieToken || req.query.auth_token;
  const session = authService.getSession(authHeader);

  if (!session) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please log in to proceed.',
    });
  }

  req.user = session;
  req.businessId = session.businessId;
  next();
}

/**
 * Middleware: Strictly requires a Business Account.
 * Customers are rejected with 403 Forbidden.
 */
export function requireBusiness(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'business_admin' && req.user.role !== 'business_staff') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. The Business Dashboard is restricted to Business accounts only.',
      });
    }

    if (!req.user.businessId) {
      return res.status(403).json({
        success: false,
        error: 'No business tenant associated with this account.',
      });
    }

    next();
  });
}

/**
 * Middleware: Strictly requires a Customer Account.
 */
export function requireCustomer(req, res, next) {
  requireAuth(req, res, () => {
    if (req.user.role !== 'customer') {
      return res.status(403).json({
        success: false,
        error: 'Access denied. This section is restricted to Customer accounts.',
      });
    }
    next();
  });
}
