import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';

export const MarketingAbout: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div style={{ fontFamily: 'var(--font-sans)', minHeight: '100vh', background: '#fff' }}>
      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', padding: '0 32px', borderBottom: '1px solid var(--border)' }}>
        <Link to="/" style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--accent)', textDecoration: 'none' }}>
          MY<span style={{ color: 'var(--text-primary)' }}>VAGON</span>
        </Link>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link to="/" style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none' }}>
            {t('MarketingAbout.tsx.home', 'Home')}
          </Link>
          <Link to="/dashboard" className="btn btn-primary btn-sm">
            {t('MarketingAbout.tsx.go_to_panel', 'Go to Panel')}
          </Link>
        </div>
      </nav>

      {/* About Section */}
      <div style={{ maxWidth: '800px', margin: '80px auto', padding: '0 20px' }}>
        <h1 style={{ fontSize: '36px', fontWeight: 800, color: 'var(--text-primary)', marginBottom: '16px' }}>
          {t('MarketingAbout.tsx.title', 'About MYVAGON')}
        </h1>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7, marginBottom: '16px' }}>
          {t(
            'MarketingAbout.tsx.p1',
            "MYVAGON is Greece's leading freight logistics platform, connecting shippers directly with verified transport professionals."
          )}
        </p>
        <p style={{ fontSize: '16px', color: 'var(--text-secondary)', lineHeight: 1.7 }}>
          {t(
            'MarketingAbout.tsx.p2',
            'Our mission is to eliminate friction in domestic logistics, reducing empty runs and providing full transparent tracking at every step.'
          )}
        </p>
        <div style={{ marginTop: '24px' }}>
          <Link to="/" className="btn btn-secondary">
            {t('MarketingAbout.tsx.back_home', '← Back Home')}
          </Link>
        </div>
      </div>
    </div>
  );
};
