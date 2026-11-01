/**
 * SnapDesk Authentication Routes
 * Implements strict separation of Business Accounts and Customer Accounts.
 */

import express from 'express';
import crypto from 'node:crypto';
import { authService } from '../services/auth.js';
import { tenantStore } from '../models/tenant_store.js';

const router = express.Router();

/**
 * Register account (Business or Customer)
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role, businessName, businessCategory } = req.body;

    if (!email || !password || !name || !role) {
      return res.status(400).json({ success: false, error: 'Email, password, name, and role are required.' });
    }

    if (role !== 'business' && role !== 'customer') {
      return res.status(400).json({ success: false, error: 'Invalid role. Must be "business" or "customer".' });
    }

    const existingUser = tenantStore.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ success: false, error: 'An account with this email already exists.' });
    }

    let businessId = null;
    let userRole = 'customer';

    if (role === 'business') {
      if (!businessName) {
        return res.status(400).json({ success: false, error: 'Business name is required for business accounts.' });
      }

      businessId = `biz_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      tenantStore.addBusiness({
        id: businessId,
        name: businessName,
        category: businessCategory || 'General Merchandise',
        displayDescription: `Registered partner business: ${businessName}`,
        contactEmail: email,
        contactPhone: '+1-800-555-0100',
        active: true,
        createdAt: new Date().toISOString(),
      });

      // Initialize default published policy and threshold
      const polVer = `pol_${businessId}_v1`;
      tenantStore.savePolicyVersion({
        versionId: polVer,
        businessId,
        versionNumber: 1,
        name: `${businessName} Standard Policy v1.0`,
        rawText: `1. COVERAGE: Claims must be reported within 14 calendar days.\n2. CRITICAL DAMAGE: Verified item contents fracture qualifies for full refund under Clause 4.1.\n3. SUPERFICIAL PACKAGING: Outer transit wear <= 30% qualifies for repackaging credit under Clause 4.2.\n4. SEVERE PACKAGING: Outer packaging crush > 30% qualifies for item replacement under Clause 4.3.\n5. HIGH VALUE: Orders exceeding $200.00 require human inspection.`,
        rules: {
          refund_if_contents_damaged: true,
          packaging_replace_max_ratio: 0.30,
          handoff_order_value: 200,
          min_confidence: 0.70,
          reporting_window_days: 14,
        },
        prompts: {
          product: 'product',
          damage: ['crushed packaging', 'torn surface', 'dent'],
          contents: ['broken item', 'leak'],
        },
        clauses: {
          refund: 'Clause 4.1: Direct item/contents damage confirmed by visual evidence qualifies for immediate refund.',
          replace_packaging: 'Clause 4.2: Superficial outer packaging damage (<=30% surface area) qualifies for packaging replacement.',
          replace_item: 'Clause 4.3: Severe packaging deformation (>30% surface area) qualifies for complete item replacement.',
          handoff_high_value: 'Clause 8.2: High-value orders exceeding $200.00 threshold must be routed to human review.',
          handoff_uncertain: 'Clause 9.1: Insufficient visual confidence requires specialist escalation.',
        },
        status: 'published',
        effectiveDate: new Date().toISOString(),
        createdAt: new Date().toISOString(),
        createdBy: name,
      });

      tenantStore.saveThresholdVersion({
        versionId: `thresh_${businessId}_v1`,
        businessId,
        policyVersionId: polVer,
        versionNumber: 1,
        rules: {
          packaging_replace_max_ratio: 0.30,
          handoff_order_value: 200.0,
          min_confidence: 0.70,
          auto_refund_enabled: true,
          auto_replacement_enabled: true,
        },
        createdAt: new Date().toISOString(),
      });

      userRole = 'business_admin';
    }

    const { salt, hash } = authService.hashPassword(password);
    const userId = `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const newUser = {
      id: userId,
      email,
      salt,
      hash,
      name,
      role: userRole,
      businessId,
      createdAt: new Date().toISOString(),
    };

    tenantStore.addUser(newUser);

    const session = authService.createSession(newUser);
    res.setHeader('Set-Cookie', `snapdesk_session=${session.token}; Path=/; HttpOnly; SameSite=Lax`);

    res.status(201).json({
      success: true,
      message: `${role === 'business' ? 'Business' : 'Customer'} account created successfully.`,
      session,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        businessId: newUser.businessId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Login account (Validates expected role to prevent cross-portal access)
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password, expectedRole } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required.' });
    }

    const user = tenantStore.getUserByEmail(email);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isValid = authService.verifyPassword(password, user.salt, user.hash);
    if (!isValid) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    // Role verification: Prevent customer logging in through business portal and vice versa
    if (expectedRole === 'business' && user.role === 'customer') {
      return res.status(403).json({
        success: false,
        error: 'This account is registered as a Customer. Please use Customer Login.',
      });
    }

    if (expectedRole === 'customer' && (user.role === 'business_admin' || user.role === 'business_staff')) {
      return res.status(403).json({
        success: false,
        error: 'This account is registered as a Business. Please use Business Login.',
      });
    }

    const session = authService.createSession(user);
    res.setHeader('Set-Cookie', `snapdesk_session=${session.token}; Path=/; HttpOnly; SameSite=Lax`);

    res.json({
      success: true,
      session,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        businessId: user.businessId,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * Check active session
 */
router.get('/session', (req, res) => {
  const authHeader = req.headers.authorization || req.headers['x-session-token'];
  const session = authService.getSession(authHeader);

  if (!session) {
    return res.status(401).json({ success: false, error: 'No active session.' });
  }

  let business = null;
  if (session.businessId) {
    business = tenantStore.getBusiness(session.businessId);
  }

  res.json({
    success: true,
    session,
    business,
  });
});

/**
 * Logout
 */
router.post('/logout', (req, res) => {
  const authHeader = req.headers.authorization || req.headers['x-session-token'];
  authService.revokeSession(authHeader);
  res.json({ success: true, message: 'Logged out successfully.' });
});

export default router;
