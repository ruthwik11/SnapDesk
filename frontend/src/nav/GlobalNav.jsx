import React from 'react';
import { useScroll } from '@/motion/SmoothScrollProvider';
import CardNav from './CardNav';

export function GlobalNav({
  currentUser,
  currentBusiness,
  onOpenAuth,
  onLogout,
  onSelectPortalView,
  activePortalView,
  slatColor = '#38bdf8',
  onToggleSlatColor,
}) {
  const { scrollTo } = useScroll();

  const handleNav = (target, portalMode = null) => {
    if (portalMode && onSelectPortalView) {
      onSelectPortalView(portalMode);
    }
    scrollTo(target);
  };

  const navItems = [
    {
      label: 'Portals',
      description: 'Customer intake and enterprise business operations hub.',
      links: [
        {
          label: 'Customer Intake',
          onClick: () => handleNav('#customer-intake', 'customer'),
        },
        {
          label: 'Business Hub',
          onClick: () => handleNav('#business-hub', 'business'),
        },
      ],
    },
    {
      label: 'AI Deliberation',
      description: 'Computer vision segmentation & multimodal policy reasoning.',
      links: [
        {
          label: 'Vision Pipeline (SAM 3.1)',
          onClick: () => handleNav('#vision-pipeline'),
        },
        {
          label: 'Decision Engine (Muse Spark)',
          onClick: () => handleNav('#decision-engine'),
        },
      ],
    },
    {
      label: 'Governance',
      description: 'Multi-tenant policy versioning and audit telemetry.',
      links: [
        {
          label: 'Company Policies',
          onClick: () => handleNav('#business-hub', 'business'),
        },
        {
          label: 'Ops & Accuracy',
          onClick: () => handleNav('#business-hub', 'business'),
        },
      ],
    },
  ];

  const logoElement = (
    <span className="font-comfortaa font-bold text-2xl tracking-wide text-light select-none">
      SnapDesk
    </span>
  );

  const ctaConfig = currentUser
    ? {
        label: `${currentUser.name?.split(' ')[0] || 'User'} • Sign Out`,
        onClick: onLogout,
      }
    : {
        label: 'Sign In',
        onClick: () => onOpenAuth('customer', 'login'),
      };

  return (
    <header className="sticky top-4 z-40 w-full px-4 sm:px-6 pointer-events-auto">
      <CardNav
        logo={logoElement}
        logoAlt="SnapDesk"
        logoHref="#hero"
        items={navItems}
        cta={ctaConfig}
        theme="dark"
        surface="glass"
        cardEffect="rise"
        openOn="click"
        maxWidth={880}
        accentColor="#ede6db"
        onLinkClick={(link) => link.onClick?.()}
      />
    </header>
  );
}

export default GlobalNav;
