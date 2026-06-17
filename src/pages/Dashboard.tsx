import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

export const Dashboard: React.FC = () => {
  const { shipments, lang, t, showToast } = useApp();
  const navigate = useNavigate();

  // Tab state for Recent Shipments
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'in_progress' | 'delivered'>('all');

  // Calculate dynamic KPIs from shipments state
  const pendingBids = shipments.filter(s => s.status === 'pending').length;
  const inTransit = shipments.filter(s => s.status === 'in_progress').length;
  const deliveredCount = shipments.filter(s => s.status === 'delivered').length;
  const upcomingCount = shipments.filter(s => s.status === 'upcoming').length;
  const activeLoads = shipments.filter(s => s.status === 'pending' || s.status === 'in_progress' || s.status === 'upcoming').length;

  // Filter shipments for the table
  const filteredShipments = shipments.filter((s) => {
    if (activeTab === 'all') return true;
    return s.status === activeTab;
  });

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    showToast(lang === 'el' ? `Αντιγράφηκε: ${id}` : `Copied ID: ${id}`, 'success');
  };

  return (
    <div className="animate-fade-in">
      {/* Greeting Header */}
      <div style={{ marginBottom: '20px' }}>
        <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '2px' }}>
          {lang === 'el' ? 'Καλώς ορίσατε,' : 'Welcome back,'}
        </p>
        <h1 className="company" style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.5px' }}>
          {lang === 'el' ? 'ΗΠΕΙΡΩΤΙΚΗ ΒΙΟΜΗΧΑΝΙΑ ΕΜΦΙΑΛΩΣΕΩΝ' : 'EPIRUS BOTTLING INDUSTRY'}
        </h1>
      </div>

      {/* Quick Actions Bar */}
      <div className="quick-actions" style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
        <div className="qa-card primary" onClick={() => navigate('/shipments/create')} style={{ flex: 1, cursor: 'pointer' }}>
          <div className="qa-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>📦</div>
          <div>
            <div className="qa-label" style={{ fontWeight: 600 }}>{t('qaNewShipment')}</div>
            <div className="qa-sub" style={{ fontSize: '11px', opacity: 0.8 }}>{t('qaNewShipmentSub')}</div>
          </div>
        </div>

        <div className="qa-card warn" onClick={() => navigate('/shipments')} style={{ flex: 1, cursor: 'pointer' }}>
          <div className="qa-icon" style={{ background: 'var(--warning-bg)' }}>⚠️</div>
          <div>
            <div className="qa-label" style={{ fontWeight: 600 }}>
              {pendingBids} {t('qaNeedsAction')}
            </div>
            <div className="qa-sub" style={{ fontSize: '11px', opacity: 0.6 }}>{t('qaNeedsActionSub')}</div>
          </div>
        </div>

        <div className="qa-card" onClick={() => navigate('/shipments')} style={{ flex: 1, cursor: 'pointer' }}>
          <div className="qa-icon" style={{ background: 'var(--info-bg)' }}>🔍</div>
          <div>
            <div className="qa-label" style={{ fontWeight: 600 }}>{t('qaSearchTrucks')}</div>
            <div className="qa-sub" style={{ fontSize: '11px', opacity: 0.6 }}>{t('qaSearchTrucksSub')}</div>
          </div>
        </div>

        <div
          className="qa-card"
          onClick={() => showToast(lang === 'el' ? 'Έναρξη εισαγωγής από ERP...' : 'Triggering ERP import...', 'info')}
          style={{ flex: 1, cursor: 'pointer' }}
        >
          <div className="qa-icon" style={{ background: 'var(--success-bg)' }}>📋</div>
          <div>
            <div className="qa-label" style={{ fontWeight: 600 }}>{t('qaImportErp')}</div>
            <div className="qa-sub" style={{ fontSize: '11px', opacity: 0.6 }}>{t('qaImportErpSub')}</div>
          </div>
        </div>
      </div>

      {/* KPI Sections */}
      <div className="kpi-section" style={{ display: 'block', marginBottom: '20px' }}>
        {/* Operational Section */}
        <div className="kpi-section-label">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
          </svg>
          <span>{t('kpiOpLabel')}</span>
        </div>
        <div className="kpi-strip">
          {/* Active Loads */}
          <div className={`kpi c-accent ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            <div className="kpi-top">
              <div className="kpi-val">{activeLoads}</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,18 8,14 16,16 24,10 32,12 40,8 48,6 56,9" stroke="#6C3AED" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiActive')}</span>
              <span className="kpi-delta up">↑ 12%</span>
            </div>
          </div>

          {/* Needs Action */}
          <div className={`kpi c-warning ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
            <div className="kpi-top">
              <div className="kpi-val">{pendingBids}</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,12 8,14 16,10 24,16 32,18 40,14 48,20 56,16" stroke="#F59E0B" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiAction')}</span>
              <span className="kpi-delta down">↑ 2</span>
            </div>
          </div>

          {/* In Transit */}
          <div className={`kpi c-info ${activeTab === 'in_progress' ? 'active' : ''}`} onClick={() => setActiveTab('in_progress')}>
            <div className="kpi-top">
              <div className="kpi-val">{inTransit}</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,16 8,12 16,14 24,8 32,10 40,6 48,8 56,4" stroke="#0EA5E9" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiTransit')}</span>
              <span className="kpi-delta neutral">— 0</span>
            </div>
          </div>

          {/* Upcoming */}
          <div className="kpi" onClick={() => setActiveTab('all')}>
            <div className="kpi-top">
              <div className="kpi-val">{upcomingCount}</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,20 8,18 16,16 24,12 32,14 40,10 48,8 56,6" stroke="#8E8E9A" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiUpcoming')}</span>
              <span className="kpi-delta up">↑ 3</span>
            </div>
          </div>

          {/* Completed */}
          <div className={`kpi c-success ${activeTab === 'delivered' ? 'active' : ''}`} onClick={() => setActiveTab('delivered')}>
            <div className="kpi-top">
              <div className="kpi-val">{deliveredCount}</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,20 8,18 16,16 24,14 32,12 40,10 48,8 56,6" stroke="#10B981" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiCompleted')}</span>
              <span className="kpi-delta up">↑ 8%</span>
            </div>
          </div>
        </div>

        {/* Financial Section */}
        <div className="kpi-section-label" style={{ marginTop: '4px' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="1" x2="12" y2="23" />
            <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
          </svg>
          <span>{t('kpiFinLabel')}</span>
        </div>
        <div className="kpi-strip">
          {/* Total Spend */}
          <div className="kpi c-money">
            <div className="kpi-top">
              <div className="kpi-val" style={{ fontSize: '24px' }}>€48.2K</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,20 8,18 16,17 24,15 32,14 40,11 48,10 56,8" stroke="#7C3AED" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiTotalSpend')}</span>
              <span className="kpi-delta up" style={{ color: '#991B1B', background: '#FEF2F2' }}>↑ 6%</span>
            </div>
            <div className="kpi-target">
              <span>{t('kpiBudget')}</span>
              <div className="kpi-target-bar">
                <div className="kpi-target-fill" style={{ width: '87%', background: 'var(--accent)' }}></div>
              </div>
              <span>87%</span>
            </div>
          </div>

          {/* Avg Cost / km */}
          <div className="kpi c-teal">
            <div className="kpi-top">
              <div className="kpi-val" style={{ fontSize: '24px' }}>€1.61</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,8 8,10 16,9 24,12 32,11 40,10 48,9 56,8" stroke="#0D9488" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiCostKm')}</span>
              <span className="kpi-delta down" style={{ color: '#065F46', background: '#ECFDF5' }}>↓ 3%</span>
            </div>
            <div className="kpi-target">
              <span>{t('kpiMarketAvg')}</span>
              <div className="kpi-target-bar">
                <div className="kpi-target-fill" style={{ width: '92%', background: 'var(--success)' }}></div>
              </div>
              <span style={{ color: 'var(--success)' }}>✓</span>
            </div>
          </div>

          {/* Avg Cost / Load */}
          <div className="kpi c-orange">
            <div className="kpi-top">
              <div className="kpi-val" style={{ fontSize: '24px' }}>€255</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,12 8,14 16,11 24,13 32,10 40,12 48,9 56,10" stroke="#EA580C" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiCostLoad')}</span>
              <span className="kpi-delta neutral">→ 0%</span>
            </div>
          </div>

          {/* Unpaid Invoices */}
          <div className="kpi c-rose">
            <div className="kpi-top">
              <div className="kpi-val" style={{ fontSize: '24px' }}>€3.2K</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,14 8,12 16,16 24,10 32,14 40,8 48,12 56,6" stroke="#E11D48" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiUnpaid')}</span>
              <span className="kpi-delta down">↑ €800</span>
            </div>
          </div>

          {/* Commission Rate */}
          <div className="kpi c-purple">
            <div className="kpi-top">
              <div className="kpi-val" style={{ fontSize: '24px' }}>12.4%</div>
              <div className="kpi-spark">
                <svg viewBox="0 0 56 24" fill="none">
                  <polyline points="0,14 8,13 16,12 24,11 32,12 40,11 48,10 56,9" stroke="#8B5CF6" strokeWidth="1.8" fill="none" />
                </svg>
              </div>
            </div>
            <div className="kpi-bottom">
              <span className="kpi-label">{t('kpiMargin')}</span>
              <span className="kpi-delta neutral">— fixed</span>
            </div>
          </div>
        </div>
      </div>


      {/* Schedule & Live Map Column Layout */}
      <div className="row-2col">
        {/* Today's Schedule Card */}
        <div className="card">
          <div className="card-hd">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 16 14" />
              </svg>
              <span>{lang === 'el' ? 'Πρόγραμμα σήμερα' : "Today's Schedule"}</span>
              <span className="cnt">8</span>
              <span className="sched-density" style={{ marginLeft: '8px' }}>
                <span className="sched-density-dot" style={{ background: 'var(--pickup)' }}></span><span>5P</span>
                <span className="sched-density-dot" style={{ background: 'var(--delivery)' }}></span><span>3D</span>
              </span>
            </h3>
            <Link to="/shipments" className="card-link">
              <span>{lang === 'el' ? 'Προβολή όλων' : 'View all'}</span> →
            </Link>
          </div>

          <div className="sched-scroll" id="schedScroll">
            {/* 07:00 */}
            <div className="sched-item" onClick={() => navigate('/shipments/SHP-5012')}>
              <div className="sched-time">07:00</div>
              <div className="sched-dot-col">
                <div className="sched-dot pickup"></div>
                <div className="sched-line"></div>
              </div>
              <div className="sched-body">
                <div className="sched-row1">
                  <span className="sched-type pickup">{lang === 'el' ? 'ΠΑΡΑΛΑΒΗ' : 'PICKUP'}</span>
                  <span className="sched-sid">#SID-90969</span>
                  <span className="sched-lane">Ioannina → Livadeia</span>
                </div>
                <div className="sched-row2">
                  <span className="sched-carrier">
                    <span className="sched-carrier-av">KR</span> KRP Transport S.A
                  </span>
                  <span>· 11PAP-1031772</span>
                </div>
              </div>
              <div className="sched-right">
                <span className="sched-price">€ 920</span>
                <span className="sched-status sts-transit"><span className="sts-dot"></span> {lang === 'el' ? 'Σε μεταφορά' : 'In transit'}</span>
              </div>
            </div>

            {/* 08:30 */}
            <div className="sched-item" onClick={() => navigate('/shipments/SHP-5008')}>
              <div className="sched-time">08:30</div>
              <div className="sched-dot-col">
                <div className="sched-dot pickup"></div>
                <div className="sched-line"></div>
              </div>
              <div className="sched-body">
                <div className="sched-row1">
                  <span className="sched-type pickup">{lang === 'el' ? 'ΠΑΡΑΛΑΒΗ' : 'PICKUP'}</span>
                  <span className="sched-sid">#SID-84512</span>
                  <span className="sched-lane">Ioannina → Patras</span>
                </div>
                <div className="sched-row2">
                  <span className="sched-carrier">
                    <span className="sched-carrier-av">MT</span> M. Tsoukalas
                  </span>
                  <span>· EMET-1048820</span>
                </div>
              </div>
              <div className="sched-right">
                <span className="sched-price">€ 720</span>
                <span className="sched-status sts-ok"><span className="sts-dot"></span> {lang === 'el' ? 'Εντός προγράμματος' : 'On schedule'}</span>
              </div>
            </div>

            {/* 09:00 at-risk */}
            <div className="sched-item at-risk" onClick={() => navigate('/shipments/SHP-5007')}>
              <div className="sched-time">09:00</div>
              <div className="sched-dot-col">
                <div className="sched-dot pickup"></div>
                <div className="sched-line"></div>
              </div>
              <div className="sched-body">
                <div className="sched-row1">
                  <span className="sched-type pickup">{lang === 'el' ? 'ΠΑΡΑΛΑΒΗ' : 'PICKUP'}</span>
                  <span className="sched-sid">#SID-79998</span>
                  <span className="sched-lane">Ioannina → Kifissos (THE MART)</span>
                </div>
                <div className="sched-row2">
                  <span className="sched-carrier">
                    <span className="sched-carrier-av">GP</span> Giorgos Pantazis
                  </span>
                  <span style={{ color: 'var(--warning)', fontWeight: 600 }}>· {lang === 'el' ? 'Χωρίς check-in' : 'No check-in'}</span>
                </div>
              </div>
              <div className="sched-right">
                <span className="sched-price">€ 580</span>
                <span className="sched-status sts-warn"><span className="sts-dot"></span> {lang === 'el' ? 'Εκκρεμεί' : 'Pending'}</span>
              </div>
            </div>

            {/* 09:30 */}
            <div className="sched-item" onClick={() => navigate('/shipments/SHP-5009')}>
              <div className="sched-time">09:30</div>
              <div className="sched-dot-col">
                <div className="sched-dot pickup"></div>
                <div className="sched-line"></div>
              </div>
              <div className="sched-body">
                <div className="sched-row1">
                  <span className="sched-type pickup">{lang === 'el' ? 'ΠΑΡΑΛΑΒΗ' : 'PICKUP'}</span>
                  <span className="sched-sid">#SID-51222</span>
                  <span className="sched-lane">Ioannina → Acharnes</span>
                </div>
                <div className="sched-row2">
                  <span className="sched-carrier">
                    <span className="sched-carrier-av">KR</span> KRP Transport S.A
                  </span>
                  <span>· EMET-1047743</span>
                </div>
              </div>
              <div className="sched-right">
                <span className="sched-price">€ 580</span>
                <span className="sched-status sts-ok"><span className="sts-dot"></span> {lang === 'el' ? 'Εντός προγράμματος' : 'On schedule'}</span>
              </div>
            </div>

            {/* NOW LINE */}
            <div className="now-line">
              <div className="now-line-inner">
                <div className="now-line-dot"></div>
                <div className="now-line-bar"></div>
                <div className="now-line-label">NOW · 10:14</div>
              </div>
            </div>

            {/* 10:00 */}
            <div className="sched-item" onClick={() => navigate('/shipments/SHP-5005')}>
              <div className="sched-time">10:00</div>
              <div className="sched-dot-col">
                <div className="sched-dot pickup"></div>
                <div className="sched-line"></div>
              </div>
              <div className="sched-body">
                <div className="sched-row1">
                  <span className="sched-type pickup">{lang === 'el' ? 'ΠΑΡΑΛΑΒΗ' : 'PICKUP'}</span>
                  <span className="sched-sid">#SID-102245</span>
                  <span className="sched-lane">Ioannina → Acharnes</span>
                </div>
                <div className="sched-row2">
                  <span className="sched-carrier">
                    <span className="sched-carrier-av">KR</span> KRP Transport S.A
                  </span>
                  <span>· EMET-1047709</span>
                </div>
              </div>
              <div className="sched-right">
                <span className="sched-price">€ 580</span>
                <span className="sched-status sts-ok"><span className="sts-dot"></span> {lang === 'el' ? 'Εντός προγράμματος' : 'On schedule'}</span>
              </div>
            </div>

            {/* 14:00 delivery */}
            <div className="sched-item" onClick={() => navigate('/shipments/SHP-5004')}>
              <div className="sched-time">14:00</div>
              <div className="sched-dot-col">
                <div className="sched-dot delivery"></div>
                <div className="sched-line"></div>
              </div>
              <div className="sched-body">
                <div className="sched-row1">
                  <span className="sched-type delivery">{lang === 'el' ? 'ΠΑΡΑΔΟΣΗ' : 'DELIVERY'}</span>
                  <span className="sched-sid">#SID-77478</span>
                  <span className="sched-lane">→ Keratea (POLYZOS)</span>
                </div>
                <div className="sched-row2">
                  <span className="sched-carrier">
                    <span className="sched-carrier-av">DN</span> Dimitris Ntinos
                  </span>
                  <span>· 11PAP-1031753</span>
                </div>
              </div>
              <div className="sched-right">
                <span className="sched-price">€ 600</span>
                <span className="sched-status sts-transit"><span className="sts-dot"></span> {lang === 'el' ? 'Σε μεταφορά' : 'In transit'}</span>
              </div>
            </div>

            {/* 15:30 delivery */}
            <div className="sched-item" onClick={() => navigate('/shipments/SHP-5003')}>
              <div className="sched-time">15:30</div>
              <div className="sched-dot-col">
                <div className="sched-dot delivery"></div>
                <div className="sched-line"></div>
              </div>
              <div className="sched-body">
                <div className="sched-row1">
                  <span className="sched-type delivery">{lang === 'el' ? 'ΠΑΡΑΔΟΣΗ' : 'DELIVERY'}</span>
                  <span className="sched-sid">#SID-88103</span>
                  <span className="sched-lane">→ Volos (METRO C&C)</span>
                </div>
                <div className="sched-row2">
                  <span className="sched-carrier">
                    <span className="sched-carrier-av">KR</span> KRP Transport S.A
                  </span>
                  <span>· 11PAP-1031801</span>
                </div>
              </div>
              <div className="sched-right">
                <span className="sched-price">€ 440</span>
                <span className="sched-status sts-pending"><span className="sts-dot"></span> {lang === 'el' ? 'Προσεχές' : 'Upcoming'}</span>
              </div>
            </div>

            {/* 16:00 at-risk delivery */}
            <div className="sched-item at-risk" onClick={() => navigate('/shipments')}>
              <div className="sched-time">16:00</div>
              <div className="sched-dot-col">
                <div className="sched-dot delivery"></div>
              </div>
              <div className="sched-body">
                <div className="sched-row1">
                  <span className="sched-type delivery">{lang === 'el' ? 'ΠΑΡΑΔΟΣΗ' : 'DELIVERY'}</span>
                  <span className="sched-sid">#SID-13997</span>
                  <span className="sched-lane">→ Trikala</span>
                </div>
                <div className="sched-row2">
                  <span className="sched-carrier">
                    <span className="sched-carrier-av">KR</span> KRP Transport S.A
                  </span>
                  <span style={{ color: 'var(--danger)', fontWeight: 600 }}>· {lang === 'el' ? 'Καθυστέρηση 45 λεπτά' : 'Delayed 45 min'}</span>
                </div>
              </div>
              <div className="sched-right">
                <span className="sched-price">€ 320</span>
                <span className="sched-status sts-risk"><span className="sts-dot"></span> {lang === 'el' ? 'Καθυστέρηση' : 'Delayed'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Map Panel */}
        <div className="card map-wrap">
          <div className="map-hd">
            <h3>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
                <line x1="8" y1="2" x2="8" y2="18" />
                <line x1="16" y1="6" x2="16" y2="22" />
              </svg>
              <span>{lang === 'el' ? 'Ζωντανός Χάρτης' : 'Live Map'}</span>
            </h3>
            <div className="map-toggle">
              <button className="map-tog-btn active">{lang === 'el' ? 'Όλα' : 'All'}</button>
              <button className="map-tog-btn">{lang === 'el' ? 'Σε κίνδυνο' : 'At risk'}</button>
              <button className="map-tog-btn">{lang === 'el' ? 'Καθυστέρηση' : 'Delayed'}</button>
            </div>
          </div>
          <div className="map-body" style={{ minHeight: '340px' }}>
            {/* Map Svg lines */}
            {/* <div style={{ position: 'absolute', inset: 0 }}>
              <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} viewBox="0 0 360 280" fill="none" aria-hidden="true">
                <path d="M 80 80 Q 180 140 290 100" stroke="#6C3AED" strokeWidth="2" strokeDasharray="6 4" opacity=".4" />
                <path d="M 60 200 Q 160 160 260 190" stroke="#0EA5E9" strokeWidth="2" strokeDasharray="6 4" opacity=".35" />
                <circle cx="80" cy="80" r="6" fill="#6C3AED" opacity=".7" />
                <circle cx="290" cy="100" r="6" fill="#10B981" opacity=".7" />
                <circle cx="60" cy="200" r="6" fill="#0EA5E9" opacity=".7" />
                <circle cx="260" cy="190" r="6" fill="#10B981" opacity=".7" />
                <circle cx="185" cy="138" r="10" fill="#6C3AED" opacity=".9" />
                <text x="185" y="143" textAnchor="middle" fill="#fff" fontSize="9">
                  🚛
                </text>
              </svg>
            </div> */}

            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="1.5"
              strokeLinecap="round"
              style={{ zIndex: 1, opacity: 0.8 }}
            >
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
            <span style={{ fontWeight: 500, zIndex: 1 }}>{lang === 'el' ? '3 ενεργές αποστολές στο χάρτη' : '3 active shipments on map'}</span>
            <span style={{ fontSize: '11px', opacity: 0.5, zIndex: 1 }}>{lang === 'el' ? 'Ενσωμάτωση Google Maps / Mapbox' : 'Google Maps / Mapbox embed'}</span>

            <div className="map-stats" style={{ zIndex: 1 }}>
              <div className="map-stat">
                <div className="map-stat-val" style={{ color: 'var(--info)' }}>3</div>
                {lang === 'el' ? 'Σε μεταφορά' : 'In transit'}
              </div>
              <div className="map-stat">
                <div className="map-stat-val" style={{ color: 'var(--danger)' }}>1</div>
                {lang === 'el' ? 'Σε κίνδυνο' : 'At risk'}
              </div>
              <div className="map-stat">
                <div className="map-stat-val" style={{ color: 'var(--text-primary)' }}>2.4h</div>
                {lang === 'el' ? 'Μ.Ο. ETA' : 'Avg ETA'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Shipments Card */}
      <div className="card" style={{ overflow: 'hidden' }}>
        <div className="card-header">
          <h3>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
              <rect x="9" y="3" width="6" height="4" rx="1" />
            </svg>
            {lang === 'el' ? 'Πρόσφατα Φορτία' : 'Recent Shipments'}
          </h3>
          <Link to="/shipments" className="card-link" style={{ fontSize: '12px' }}>
            {lang === 'el' ? 'Προβολή όλων' : 'View all'}{' '}
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Filter Tabs */}
        <div className="tabs" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)' }}>
          <button className={`tab ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            {lang === 'el' ? 'Όλα' : 'All'} <span className="tab-count">{shipments.length}</span>
          </button>
          <button className={`tab ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
            {lang === 'el' ? 'Εκκρεμή' : 'Bidding'} <span className="tab-count">{shipments.filter(s => s.status === 'pending').length}</span>
          </button>
          <button className={`tab ${activeTab === 'in_progress' ? 'active' : ''}`} onClick={() => setActiveTab('in_progress')}>
            {lang === 'el' ? 'Σε Εξέλιξη' : 'In Transit'} <span className="tab-count">{shipments.filter(s => s.status === 'in_progress').length}</span>
          </button>
          <button className={`tab ${activeTab === 'delivered' ? 'active' : ''}`} onClick={() => setActiveTab('delivered')}>
            {lang === 'el' ? 'Παραδοθέντα' : 'Delivered'} <span className="tab-count">{shipments.filter(s => s.status === 'delivered').length}</span>
          </button>
        </div>

        {/* Data Table */}
        <div className="table-wrap" style={{ border: 'none', borderRadius: 0 }}>
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '36px', padding: '10px 12px' }}>
                  <input
                    type="checkbox"
                    style={{ width: '15px', height: '15px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                  />
                </th>
                <th>{lang === 'el' ? 'ID Φορτίου' : 'Shipment ID'}</th>
                <th>{lang === 'el' ? 'Διαδρομή' : 'Route'}</th>
                <th>{lang === 'el' ? 'Μεταφορέας' : 'Carrier'}</th>
                <th>{lang === 'el' ? 'Όχημα' : 'Vehicle'}</th>
                <th>ETA</th>
                <th>{lang === 'el' ? 'Τιμή' : 'Price'}</th>
                <th>{lang === 'el' ? 'Κατάσταση' : 'Status'}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filteredShipments.map((shp) => (
                <tr key={shp.id} onClick={() => navigate(`/shipments/${shp.id}`)}>
                  <td style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      style={{ width: '15px', height: '15px', accentColor: 'var(--accent)', cursor: 'pointer' }}
                    />
                  </td>
                  <td>
                    <span className="mono" onClick={(e) => handleCopyId(shp.id, e)} title="Click to copy">
                      {shp.id}
                    </span>
                  </td>
                  <td>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{shp.origin}</span>
                    <span style={{ color: 'var(--text-tertiary)', margin: '0 3px' }}>→</span>
                    <span style={{ fontSize: '13px', fontWeight: 500 }}>{shp.dest}</span>
                  </td>
                  <td>
                    {shp.carrier ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div className="avatar avatar-xs" style={{ fontSize: '7px' }}>
                          {shp.carrier_init || shp.carrier.substring(0, 2).toUpperCase()}
                        </div>
                        <span>{shp.carrier}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td style={{ color: 'var(--text-secondary)' }}>
                    {shp.carrier ? '18t · Full' : 'Any'}
                  </td>
                  <td>
                    <span style={{ fontSize: '12px' }}>{shp.date}, 14:00</span>
                  </td>
                  <td>
                    {shp.price ? (
                      <span className="mono" style={{ fontWeight: 700 }}>
                        €{shp.price}
                      </span>
                    ) : shp.best_bid ? (
                      <span className="mono" style={{ fontWeight: 700, color: 'var(--success)' }}>
                        €{shp.best_bid} (Bid)
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-tertiary)', fontSize: '12px' }}>—</span>
                    )}
                  </td>
                  <td>
                    <span
                      className={`badge ${shp.status === 'in_progress'
                        ? 'badge-info'
                        : shp.status === 'upcoming'
                          ? 'badge-gray'
                          : shp.status === 'pending'
                            ? 'badge-warning'
                            : shp.status === 'delivered'
                              ? 'badge-success'
                              : 'badge-danger'
                        }`}
                    >
                      <span className="bdot"></span>
                      {t(shp.status)}
                    </span>
                    {shp.at_risk && (
                      <span className="badge badge-warning" style={{ marginLeft: '4px', fontSize: '10px' }}>
                        ⚠ At Risk
                      </span>
                    )}
                  </td>
                  <td onClick={(e) => e.stopPropagation()}>
                    <button className="btn btn-ghost btn-icon btn-sm" onClick={() => navigate(`/shipments/${shp.id}`)}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <path d="M5 12h14M12 5l7 7-7 7" />
                      </svg>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
