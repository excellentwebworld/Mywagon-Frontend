import React from 'react';
import { Link } from 'react-router-dom';

export const MarketingHome: React.FC = () => {
  return (
    <div style={{ fontFamily: 'var(--font-sans)', minHeight: '100vh', background: '#fff' }}>
      {/* Navigation */}
      <nav style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', height: '60px', padding: '0 32px', borderBottom: '1px solid var(--border)' }}>
        <span style={{ fontSize: '20px', fontWeight: 800, letterSpacing: '-0.4px', color: 'var(--accent)' }}>
          MY<span style={{ color: 'var(--text-primary)' }}>VAGON</span>
        </span>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
          <Link to="/about" style={{ fontSize: '14px', color: 'var(--text-secondary)', textDecoration: 'none' }}>About</Link>
          <Link to="/dashboard" className="btn btn-primary btn-sm">Go to Panel</Link>
        </div>
      </nav>

      {/* Hero Section */}
      <div style={{ maxWidth: '800px', margin: '80px auto', textAlign: 'center', padding: '0 20px' }}>
        <h1 style={{ fontSize: '48px', fontWeight: 800, letterSpacing: '-1.5px', color: 'var(--text-primary)', lineHeight: 1.1 }}>
          Ship Smarter. Move Greece Forward.
        </h1>
        <p style={{ margin: '24px 0', fontSize: '18px', color: 'var(--text-secondary)', lineHeight: 1.6 }}>
          Connect with 2,400+ verified carriers across Greece. Post a shipment in 60 seconds, negotiate rates directly, and track deliveries in real time.
        </p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <Link to="/dashboard" className="btn btn-primary" style={{ padding: '12px 24px' }}>
            Go to Panel
          </Link>
          <Link to="/about" className="btn btn-secondary" style={{ padding: '12px 24px' }}>
            Learn More
          </Link>
        </div>
      </div>
    </div>
  );
};
