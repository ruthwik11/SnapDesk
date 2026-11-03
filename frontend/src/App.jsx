import React, { useState, useEffect } from 'react';
import { SmoothScrollProvider, useScroll } from '@/motion/SmoothScrollProvider';
import { CurtainOverlay } from '@/story/CurtainOverlay';
import MagicRings from '@/fx/MagicRings';
import { DaVinciGeometry } from '@/fx/DaVinciGeometry';
import { BrushstrokeTransition } from '@/fx/BrushstrokeTransition';
import { GlobalNav } from '@/nav/GlobalNav';
import { SearchModal } from '@/gates/SearchModal';
import { HeroSection } from '@/story/HeroSection';
import { AccountCardsSection } from '@/story/AccountCardsSection';
import { AuthModal } from '@/gates/AuthModal';
import { CustomerPortal } from '@/intake/CustomerPortal';
import { BusinessPortal } from '@/hub/BusinessPortal';
import { useSearch } from '@/hooks/useSearch';
import { api, getStoredToken } from '@/services/api';
import { Eye, Shield, Scale, ArrowDown, Sparkles } from 'lucide-react';

function MainApp() {
  const { scrollTo } = useScroll();

  // Authentication & Session State
  const [currentUser, setCurrentUser] = useState(null);
  const [currentBusiness, setCurrentBusiness] = useState(null);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authRole, setAuthRole] = useState('business');
  const [authMode, setAuthMode] = useState('login');

  // Active View: 'landing' | 'customer' | 'business'
  const [activePortalView, setActivePortalView] = useState('landing');
  const [selectedMerchantId, setSelectedMerchantId] = useState(null);

  // MagicRings Blue Background Theme
  const [ringColorPrimary, setRingColorPrimary] = useState('#38BDF8');
  const [ringColorSecondary, setRingColorSecondary] = useState('#1D4ED8');

  // Public Registered Merchants List (for Customer Intake provider dropdown)
  const [businesses, setBusinesses] = useState([]);

  // Search hook
  const search = useSearch(businesses);

  // Restore session on mount
  useEffect(() => {
    restoreSession();
    loadPublicBusinesses();
  }, []);

  const restoreSession = async () => {
    const token = getStoredToken();
    if (!token) return;

    try {
      const res = await api.getSession();
      if (res.success && res.session) {
        setCurrentUser(res.session);
        setCurrentBusiness(res.business);
        if (res.session.role === 'customer') {
          setActivePortalView('customer');
        } else if (res.session.role === 'business_admin' || res.session.role === 'business_staff') {
          setActivePortalView('business');
        }
      }
    } catch (err) {
      console.warn('Could not restore session:', err);
    }
  };

  const loadPublicBusinesses = async () => {
    try {
      const res = await api.getPublicBusinesses();
      if (res.success && res.businesses) {
        setBusinesses(res.businesses);
      }
    } catch (err) {
      console.warn('Could not load public businesses:', err);
    }
  };

  const handleOpenAuth = (role = 'business', mode = 'login') => {
    setAuthRole(role);
    setAuthMode(mode);
    setAuthModalOpen(true);
  };

  const handleAuthSuccess = (user, business) => {
    setCurrentUser(user);
    setCurrentBusiness(business);
    if (user.role === 'customer') {
      setActivePortalView('customer');
    } else {
      setActivePortalView('business');
    }
  };

  const handleLogout = async () => {
    await api.logout();
    setCurrentUser(null);
    setCurrentBusiness(null);
    setActivePortalView('landing');
    scrollTo('#hero');
  };

  const handleSelectPortalView = (view) => {
    if (view === 'business') {
      if (!currentUser || currentUser.role === 'customer') {
        // Need business credentials
        handleOpenAuth('business', 'login');
        return;
      }
    }
    setActivePortalView(view);
  };

  return (
    <div className="relative min-h-screen bg-[#07152e] text-light transition-colors duration-700 selection:bg-cyan-500 selection:text-black">
      
      {/* 1. Japanese Curtain Roll-Up Opening Overlay */}
      <CurtainOverlay />

      {/* 2. React Bits MagicRings Interactive WebGL2 Portal Background in Blue */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden bg-gradient-to-b from-[#0a1a36] via-[#07152e] to-[#040d1f]" aria-hidden="true">
        <MagicRings
          color={ringColorPrimary}
          colorTwo={ringColorSecondary}
          ringCount={7}
          motion="pulse"
          speed={1}
          lineThickness={2}
          glow={1.4}
          hoverScale={1.18}
          clickBurst={true}
          followMouse={true}
          mouseInfluence={0.15}
          theme="dark"
          opacity={0.92}
          className="w-full h-full"
        />
      </div>

      {/* 3. Leonardo Da Vinci Golden Ratio & Vitruvian Construction Grid */}
      <DaVinciGeometry active={true} />

      {/* 4. Global Header & Navigation */}
      <GlobalNav
        currentUser={currentUser}
        currentBusiness={currentBusiness}
        onOpenSearch={search.openSearch}
        onOpenAuth={handleOpenAuth}
        onLogout={handleLogout}
        onSelectPortalView={handleSelectPortalView}
        activePortalView={activePortalView}
        slatColor={ringColorPrimary}
        onToggleSlatColor={() => {
          setRingColorPrimary((prev) =>
            prev === '#38BDF8' ? '#60A5FA' : prev === '#60A5FA' ? '#818CF8' : '#38BDF8'
          );
          setRingColorSecondary((prev) =>
            prev === '#1D4ED8' ? '#2563EB' : prev === '#2563EB' ? '#4338CA' : '#1D4ED8'
          );
        }}
      />

      {/* 5. Global Search Modal Dialog (Cmd+K / Ctrl+K) */}
      <SearchModal
        isOpen={search.isOpen}
        onClose={search.closeSearch}
        searchTerm={search.searchTerm}
        setSearchTerm={search.setSearchTerm}
        filteredResults={search.filteredResults}
        selectedIndex={search.selectedIndex}
        setSelectedIndex={search.setSelectedIndex}
        clearSearch={search.clearSearch}
        onSelectMerchant={(bizId) => {
          setSelectedMerchantId(bizId);
          setActivePortalView('customer');
        }}
      />

      {/* 6. Authentication Modal (Separate Business vs Customer) */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialRole={authRole}
        initialMode={authMode}
        onAuthSuccess={handleAuthSuccess}
      />

      {/* 7. Main Scrollable Container */}
      <main id="main-content" className="relative z-20">
        
        {/* VIEW 1: LANDING & HERO STORYTELLING */}
        {activePortalView === 'landing' && (
          <>
            {/* Hero Section */}
            <HeroSection
              onSelectPortal={(portal) => {
                if (portal === 'business' && (!currentUser || currentUser.role === 'customer')) {
                  handleOpenAuth('business', 'login');
                } else {
                  setActivePortalView(portal);
                }
              }}
            />

            {/* Brushstroke Transition */}
            <BrushstrokeTransition height="120px" />

            {/* Account Portals Selection */}
            <AccountCardsSection
              onOpenAuth={handleOpenAuth}
              onSelectPortal={handleSelectPortalView}
            />

            {/* Brushstroke Transition (Flipped) */}
            <BrushstrokeTransition height="100px" flip={true} />

            {/* Renaissance Platform Overview Highlights */}
            <section className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
              <div className="text-center space-y-3">
                <span className="font-mono text-xs uppercase tracking-widest text-gold bg-gold/10 border border-gold/30 px-3 py-1 rounded-full">
                  Unified AI Architecture
                </span>
                <h2 className="font-serif font-bold text-3xl sm:text-4xl text-light">
                  How SnapDesk Resolves Disputes
                </h2>
                <p className="text-g6 text-xs sm:text-sm max-w-xl mx-auto">
                  End-to-end multi-tenant pipeline connecting customer evidence to verified enterprise policy.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
                
                <div className="bg-g1 border border-g3 hover:border-gold/50 rounded-2xl p-6 space-y-3 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
                    <Eye className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-light">1. Visual Damage Triage</h3>
                  <p className="text-g6 leading-relaxed">
                    Meta SAM 3.1 inspects submitted parcel and item photos. Pixel-accurate polygon masks calculate visible-area damage ratios and confirm contents fractures.
                  </p>
                </div>

                <div className="bg-g1 border border-g3 hover:border-gold/50 rounded-2xl p-6 space-y-3 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
                    <Scale className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-light">2. Tenant Policy Binding</h3>
                  <p className="text-g6 leading-relaxed">
                    Claims are bound strictly to the selected merchant's published rules. No cross-tenant bleeding. Deterministic financial limits override AI hallucinations.
                  </p>
                </div>

                <div className="bg-g1 border border-g3 hover:border-gold/50 rounded-2xl p-6 space-y-3 transition-colors">
                  <div className="w-10 h-10 rounded-xl bg-gold/15 border border-gold/30 flex items-center justify-center text-gold">
                    <Shield className="w-5 h-5" />
                  </div>
                  <h3 className="font-serif font-bold text-lg text-light">3. Model Decision Formulated</h3>
                  <p className="text-g6 leading-relaxed">
                    Muse Spark synthesizes visual measurements with policy clauses, returning instant refunds, replacements, or escalating uncertain cases to human specialists.
                  </p>
                </div>

              </div>
            </section>
          </>
        )}

        {/* VIEW 2: CUSTOMER PORTAL (INTAKE -> SAM 3.1 VISION -> DECISION ENGINE) */}
        {activePortalView === 'customer' && (
          <CustomerPortal
            businesses={businesses}
            currentUser={currentUser}
            selectedBusinessId={selectedMerchantId}
            onReturnToLanding={() => setActivePortalView('landing')}
          />
        )}

        {/* VIEW 3: BUSINESS PORTAL (OVERVIEW, INBOX, ANALYTICS, POLICY, THRESHOLDS, HUMAN REVIEW, OPS) */}
        {activePortalView === 'business' && (
          <BusinessPortal
            currentUser={currentUser}
            currentBusiness={currentBusiness}
            onReturnToLanding={() => setActivePortalView('landing')}
            onLogout={handleLogout}
          />
        )}

      </main>

      {/* Global Renaissance Footer */}
      <footer className="bg-g1 border-t border-g3/60 py-12 px-4 sm:px-6 lg:px-8 text-g6 text-xs relative z-30">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3 text-light font-serif">
            <span className="text-xl">⚜️</span>
            <span className="font-bold text-sm tracking-wide">
              SnapDesk — The RenAIssance Edition
            </span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-6 text-g7 text-xs">
            <button
              onClick={() => {
                setActivePortalView('landing');
                scrollTo('#hero');
              }}
              className="hover:text-gold transition-colors"
            >
              Back to top
            </button>
            <button
              onClick={() => handleSelectPortalView('customer')}
              className="hover:text-gold transition-colors"
            >
              Customer Intake
            </button>
            <button
              onClick={() => handleSelectPortalView('business')}
              className="hover:text-gold transition-colors"
            >
              Business Tenant Portal
            </button>
            <span className="text-g6 font-mono">SAM 3.1 &amp; Muse Spark Powered</span>
          </div>
        </div>
      </footer>

    </div>
  );
}

export default function App() {
  return (
    <SmoothScrollProvider>
      <MainApp />
    </SmoothScrollProvider>
  );
}

