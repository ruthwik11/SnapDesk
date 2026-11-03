/**
 * SnapDesk Unified API Service
 * Connects frontend components to the authoritative SnapDesk backend.
 */

const TOKEN_KEY = 'snapdesk_token';

export function getStoredToken() {
  return localStorage.getItem(TOKEN_KEY) || '';
}

export function setStoredToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token);
  } else {
    localStorage.removeItem(TOKEN_KEY);
  }
}

async function request(url, options = {}) {
  const headers = options.headers ? { ...options.headers } : {};
  const token = getStoredToken();
  if (token && !headers['Authorization']) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  // If body is not FormData, ensure Content-Type is set
  if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  // --- AUTHENTICATION ---
  async login(email, password, expectedRole) {
    const data = await request('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, expectedRole }),
    });
    if (data.session?.token) {
      setStoredToken(data.session.token);
    }
    return data;
  },

  async register(payload) {
    const data = await request('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    if (data.session?.token) {
      setStoredToken(data.session.token);
    }
    return data;
  },

  async getSession() {
    return request('/api/auth/session');
  },

  async logout() {
    try {
      await request('/api/auth/logout', { method: 'POST' });
    } finally {
      setStoredToken(null);
    }
  },

  // --- PUBLIC DATA ---
  async getPublicBusinesses() {
    return request('/api/businesses/public');
  },

  async getSystemInfo() {
    return request('/api/system');
  },

  // --- CUSTOMER INTAKE & CASE PIPELINE ---
  async submitTicket(formData) {
    return request('/api/cases', {
      method: 'POST',
      body: formData,
    });
  },

  async getCase(caseId) {
    return request(`/api/cases/${caseId}`);
  },

  async analyzeVision(caseId) {
    return request(`/api/cases/${caseId}/analyze-vision`, {
      method: 'POST',
    });
  },

  async getDamageReport(caseId) {
    return request(`/api/cases/${caseId}/damage-report`);
  },

  async runDecision(caseId) {
    return request(`/api/cases/${caseId}/decide`, {
      method: 'POST',
    });
  },

  // --- BUSINESS DASHBOARD ---
  async getBusinessOverview() {
    return request('/api/business/overview');
  },

  async getBusinessInbox(params = {}) {
    const query = new URLSearchParams();
    if (params.status) query.append('status', params.status);
    if (params.handling) query.append('handling', params.handling);
    if (params.search) query.append('search', params.search);
    return request(`/api/business/inbox?${query.toString()}`);
  },

  async getProductAnalytics() {
    return request('/api/business/analytics/products');
  },

  async getResolutionAnalytics() {
    return request('/api/business/analytics/resolutions');
  },

  async getPolicy() {
    return request('/api/business/policy');
  },

  async savePolicy(payload) {
    return request('/api/business/policy', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getThresholds() {
    return request('/api/business/thresholds');
  },

  async saveThresholds(payload) {
    return request('/api/business/thresholds', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getHumanReviewQueue() {
    return request('/api/business/human-review');
  },

  async submitHumanReview(caseId, payload) {
    return request(`/api/business/human-review/${caseId}`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async getCaseInvestigation(caseId) {
    return request(`/api/business/cases/${caseId}`);
  },

  async getOpsAccuracy() {
    return request('/api/business/ops-accuracy');
  },

  async runEvaluation() {
    return request('/api/eval', { method: 'POST' });
  },
};

