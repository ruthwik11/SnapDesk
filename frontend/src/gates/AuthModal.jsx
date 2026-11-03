import React, { useState, useEffect } from 'react';
import { useEscapeKey } from '@/hooks/useKeyboard';
import { api } from '@/services/api';
import { X, Building2, User, AlertCircle, Loader2 } from 'lucide-react';

export function AuthModal({
  isOpen,
  onClose,
  initialRole = 'business',
  initialMode = 'login',
  onAuthSuccess,
}) {
  const [role, setRole] = useState(initialRole);
  const [mode, setMode] = useState(initialMode);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('Logistics & Freight');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEscapeKey(onClose, isOpen);

  useEffect(() => {
    setRole(initialRole);
    setMode(initialMode);
    setErrorMsg('');
  }, [initialRole, initialMode, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setLoading(true);

    try {
      if (mode === 'login') {
        const res = await api.login(email, password, role);
        if (res.success) {
          onAuthSuccess(res.user, res.business);
          onClose();
        }
      } else {
        // Register
        const payload = {
          role,
          email,
          password,
          name: name.trim(),
        };

        if (role === 'business') {
          payload.businessName = businessName.trim();
          payload.businessCategory = businessCategory;
        } else {
          payload.phone = phone.trim();
        }

        const res = await api.register(payload);
        if (res.success) {
          onAuthSuccess(res.user, res.business);
          onClose();
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-g1 border border-gold/40 rounded-2xl shadow-2xl overflow-hidden p-6 sm:p-8 relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-g6 hover:text-light transition-colors"
          title="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Role Switcher Tabs */}
        <div className="grid grid-cols-2 gap-2 bg-g2/80 p-1 rounded-xl mb-6 border border-g3/60">
          <button
            type="button"
            onClick={() => {
              setRole('business');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              role === 'business'
                ? 'bg-gold text-dark shadow-sm'
                : 'text-g6 hover:text-light'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Business Portal</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setRole('customer');
              setErrorMsg('');
            }}
            className={`py-2 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
              role === 'customer'
                ? 'bg-gold text-dark shadow-sm'
                : 'text-g6 hover:text-light'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Customer Portal</span>
          </button>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h3 className="font-serif font-bold text-2xl text-light">
            {mode === 'login' ? 'Sign in to SnapDesk' : `Register ${role === 'business' ? 'Company' : 'Customer Account'}`}
          </h3>
          <p className="text-xs text-g6 mt-1">
            {role === 'business'
              ? 'Access tenant settings, policy versions, and claim adjudications.'
              : 'File damage tickets, review SAM 3.1 reports, and track resolutions.'}
          </p>
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-lg bg-red-950/60 border border-red-500/40 text-red-200 text-xs flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {mode === 'register' && role === 'business' && (
            <>
              <div>
                <label className="block text-g7 font-medium mb-1">Company / Merchant Name *</label>
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  placeholder="e.g. Apex Global Logistics"
                  className="w-full bg-dark border border-g3 rounded-lg px-3 py-2 text-light placeholder-g6 focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-g7 font-medium mb-1">Business Category *</label>
                <select
                  value={businessCategory}
                  onChange={(e) => setBusinessCategory(e.target.value)}
                  className="w-full bg-dark border border-g3 rounded-lg px-3 py-2 text-light focus:outline-none focus:border-gold"
                >
                  <option value="Logistics & Freight">Logistics &amp; Freight</option>
                  <option value="Consumer Electronics">Consumer Electronics</option>
                  <option value="Home Appliances">Home Appliances</option>
                  <option value="Apparel & Footwear">Apparel &amp; Footwear</option>
                  <option value="General Merchandise">General Merchandise</option>
                </select>
              </div>
            </>
          )}

          {mode === 'register' && (
            <div>
              <label className="block text-g7 font-medium mb-1">
                {role === 'business' ? 'Administrator Name *' : 'Full Name *'}
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Sarah Jenkins"
                className="w-full bg-dark border border-g3 rounded-lg px-3 py-2 text-light placeholder-g6 focus:outline-none focus:border-gold"
              />
            </div>
          )}

          {mode === 'register' && role === 'customer' && (
            <div>
              <label className="block text-g7 font-medium mb-1">Contact Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +1 (555) 014-4900"
                className="w-full bg-dark border border-g3 rounded-lg px-3 py-2 text-light placeholder-g6 focus:outline-none focus:border-gold"
              />
            </div>
          )}

          <div>
            <label className="block text-g7 font-medium mb-1">Email Address *</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="name@company.com"
              className="w-full bg-dark border border-g3 rounded-lg px-3 py-2 text-light placeholder-g6 focus:outline-none focus:border-gold"
            />
          </div>

          <div>
            <label className="block text-g7 font-medium mb-1">Password *</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="w-full bg-dark border border-g3 rounded-lg px-3 py-2 text-light placeholder-g6 focus:outline-none focus:border-gold"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold hover:bg-white disabled:opacity-50 text-dark font-medium py-2.5 rounded-lg text-sm transition-all shadow-md shadow-gold/20 flex items-center justify-center space-x-2 mt-4"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>{mode === 'login' ? 'Sign In' : 'Create Account'}</span>
            )}
          </button>
        </form>

        {/* Toggle Mode */}
        <div className="mt-5 text-center text-xs text-g6">
          <span>{mode === 'login' ? "Don't have an account? " : 'Already registered? '}</span>
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'login' ? 'register' : 'login');
              setErrorMsg('');
            }}
            className="text-gold hover:underline font-semibold ml-1"
          >
            {mode === 'login' ? 'Register here' : 'Sign in here'}
          </button>
        </div>
      </div>
    </div>
  );
}

