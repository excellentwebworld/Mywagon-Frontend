import React from 'react';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';

export const RightPanel: React.FC = () => {
  const { showToast } = useApp();
  const { t } = useTranslation();

  const handleAction = (area: string, detail: string) => {
    showToast(t('actionTriggered', { area, detail }), 'success');
  };

  return (
    <div className="r4-right">
      {/* AI COPILOT — 3 INSIGHTS */}
      <div className="ai-section">
        {/* Insight 1: Cost */}
        <div className="ai-card">
          <div className="ai-badge">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {t('aiCopilot')} <span className="ai-type cost">COST</span>
          </div>
          <div className="ai-title">
            {t('aiCostTitle')}
          </div>
          <div className="ai-body">
            {t('aiCostBody')}
          </div>
          <a className="ai-action" href="#" onClick={(e) => { e.preventDefault(); handleAction("AI Copilot Cost", "Negotiate"); }}>
            {t('aiNegotiateRate')}
          </a>
        </div>

        {/* Insight 2: Operations */}
        <div className="ai-card" style={{ background: 'linear-gradient(135deg, #FFFBEB, #FEF3C7)', borderColor: '#FDE68A' }}>
          <div className="ai-badge" style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#B45309' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {t('aiCopilot')} <span className="ai-type ops">OPS</span>
          </div>
          <div className="ai-title" style={{ color: '#B45309' }}>
            {t('aiOpsTitle')}
          </div>
          <div className="ai-body" style={{ color: '#92400E' }}>
            {t('aiOpsBody')}
          </div>
          <a className="ai-action" href="#" style={{ color: '#B45309' }} onClick={(e) => { e.preventDefault(); handleAction("AI Copilot Ops", "Post Marketplace"); }}>
            {t('aiPostMarketplace')}
          </a>
        </div>

        {/* Insight 3: Performance */}
        <div className="ai-card" style={{ background: 'linear-gradient(135deg, #FFF1F2, #FCE7F3)', borderColor: '#FBCFE8' }}>
          <div className="ai-badge" style={{ background: 'rgba(236, 72, 153, 0.12)', color: '#9D174D' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
            </svg>
            {t('aiCopilot')} <span className="ai-type perf">ALERT</span>
          </div>
          <div className="ai-title" style={{ color: '#9D174D' }}>
            {t('aiAlertTitle')}
          </div>
          <div className="ai-body" style={{ color: '#BE185D' }}>
            {t('aiAlertBody')}
          </div>
          <a className="ai-action" href="#" style={{ color: '#9D174D' }} onClick={(e) => { e.preventDefault(); handleAction("AI Copilot Alert", "Review Carrier"); }}>
            {t('aiReviewCarrier')}
          </a>
        </div>
      </div>

      {/* Published Loads */}
      <div className="pub-strip">
        <div className="pub-strip-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <line x1="2" y1="12" x2="22" y2="12" />
            <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
          </svg>
        </div>
        <div style={{ flex: 1 }}>
          <div className="pub-strip-text">
            <strong>{t('publishedLoads')}</strong>
            <span style={{ fontSize: '10px', fontWeight: 700, background: 'var(--accent)', color: '#fff', padding: '1px 6px', borderRadius: '99px', marginLeft: '4px' }}>
              BETA
            </span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-tertiary)', marginTop: '2px' }}>
            {t('noPubLoads')}
          </div>
        </div>
        <a className="card-link" href="#" onClick={(e) => { e.preventDefault(); handleAction("Published Loads", "Publish"); }}>
          {t('publishCta')}
        </a>
      </div>

      {/* Performance KPIs */}
      <div className="perf-card">
        <div className="perf-hd">
          <h4>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10M12 20V4M6 20v-8" />
            </svg>
            <span>{t('perfTitle')}</span>
          </h4>
          <span className="perf-period" id="perfPeriod">
            {t('today')}
          </span>
        </div>
        <div className="perf-grid">
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfTotalCost')}</div>
            <div className="perf-cell-value">€ 48,230</div>
            <div className="perf-cell-delta up">↑ 6%</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfTotalLoads')}</div>
            <div className="perf-cell-value">189</div>
            <div className="perf-cell-delta up">↑ 12%</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfOnTimePickup')}</div>
            <div className="perf-cell-value">94.2%</div>
            <div className="perf-cell-delta up">↑ 1.3%</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfOnTimeDelivery')}</div>
            <div className="perf-cell-value">91.7%</div>
            <div className="perf-cell-delta down">↓ 2.1%</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfAvgCostKm')}</div>
            <div className="perf-cell-value">€ 1.61</div>
            <div className="perf-cell-delta up" style={{ color: 'var(--success-text)', background: 'var(--success-bg)' }}>
              ↓ 3%
            </div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfTopLane')}</div>
            <div className="perf-cell-value text">
              Ioannina → Attica <span style={{ fontWeight: 400, color: 'var(--text-tertiary)' }}>· 47</span>
            </div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfAvgCostLoad')}</div>
            <div className="perf-cell-value">€ 255</div>
          </div>
          <div className="perf-cell">
            <div className="perf-cell-label">{t('perfCarrierAcceptance')}</div>
            <div className="perf-cell-value">87%</div>
            <div className="perf-cell-delta down">↓ 4%</div>
          </div>
        </div>
        <div className="perf-footer">
          <a href="#" onClick={(e) => { e.preventDefault(); handleAction("Performance", "View Full Analytics"); }}>
            {t('viewFullAnalytics')}
          </a>
        </div>
      </div>

      {/* Carrier Leaderboard */}
      <div className="lb-card">
        <div className="lb-hd">
          <h4>🏆 {t('topCarriers')}</h4>
          <a className="card-link" href="#" onClick={(e) => { e.preventDefault(); handleAction("Top Carriers", "View All Clicked"); }}>
            {t('viewAll')}
          </a>
        </div>
        {/* Leaderboard Item 1 */}
        <div className="lb-item">
          <div className="lb-rank gold">1</div>
          <div className="lb-av" style={{ background: '#FEF3C7', color: '#D97706' }}>KR</div>
          <div className="lb-name">KRP Transport S.A</div>
          <div className="lb-bar-wrap">
            <div className="lb-bar" style={{ width: '96%', background: 'var(--success)' }}></div>
          </div>
          <div className="lb-pct" style={{ color: 'var(--success)' }}>96%</div>
          <div className="lb-loads">47 {t('loadsWord')}</div>
        </div>
        {/* Leaderboard Item 2 */}
        <div className="lb-item">
          <div className="lb-rank silver">2</div>
          <div className="lb-av">GP</div>
          <div className="lb-name">G. Pantazis</div>
          <div className="lb-bar-wrap">
            <div className="lb-bar" style={{ width: '88%', background: 'var(--info)' }}></div>
          </div>
          <div className="lb-pct" style={{ color: 'var(--info)' }}>88%</div>
          <div className="lb-loads">12 {t('loadsWord')}</div>
        </div>
        {/* Leaderboard Item 3 */}
        <div className="lb-item">
          <div className="lb-rank bronze">3</div>
          <div className="lb-av">DN</div>
          <div className="lb-name">D. Ntinos</div>
          <div className="lb-bar-wrap">
            <div className="lb-bar" style={{ width: '82%', background: 'var(--warning)' }}></div>
          </div>
          <div className="lb-pct" style={{ color: 'var(--warning)' }}>82%</div>
          <div className="lb-loads">8 {t('loadsWord')}</div>
        </div>
        {/* Leaderboard Item 4 */}
        <div className="lb-item">
          <div className="lb-rank">4</div>
          <div className="lb-av">MT</div>
          <div className="lb-name">M. Tsoukalas</div>
          <div className="lb-bar-wrap">
            <div className="lb-bar" style={{ width: '79%', background: 'var(--text-tertiary)' }}></div>
          </div>
          <div className="lb-pct">79%</div>
          <div className="lb-loads">5 {t('loadsWord')}</div>
        </div>
        <div className="lb-footer">
          <a href="#" onClick={(e) => { e.preventDefault(); handleAction("Top Carriers", "View All Footer"); }}>
            {t('viewAllCarriers')}
          </a>
        </div>
      </div>
    </div>
  );
};
