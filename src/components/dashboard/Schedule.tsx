import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export const Schedule: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  return (
    <div className="card">
      <div className="card-hd">
        <h3>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>{t('todaysSchedule')}</span>
          <span className="cnt">8</span>
          <span className="sched-density" style={{ marginLeft: '8px' }}>
            <span className="sched-density-dot" style={{ background: 'var(--pickup)' }}></span><span>5P</span>
            <span className="sched-density-dot" style={{ background: 'var(--delivery)' }}></span><span>3D</span>
          </span>
        </h3>
        <Link to="/shipments" className="card-link">
          <span>{t('viewAll')}</span> →
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
              <span className="sched-type pickup">{t('pickupUpper')}</span>
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
            <span className="sched-status sts-transit">
              <span className="sts-dot"></span> {t('inTransit')}
            </span>
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
              <span className="sched-type pickup">{t('pickupUpper')}</span>
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
            <span className="sched-status sts-ok">
              <span className="sts-dot"></span> {t('onSchedule')}
            </span>
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
              <span className="sched-type pickup">{t('pickupUpper')}</span>
              <span className="sched-sid">#SID-79998</span>
              <span className="sched-lane">Ioannina → Kifissos (THE MART)</span>
            </div>
            <div className="sched-row2">
              <span className="sched-carrier">
                <span className="sched-carrier-av">GP</span> Giorgos Pantazis
              </span>
              <span style={{ color: 'var(--warning)', fontWeight: 600 }}>
                · {t('noCheckIn')}
              </span>
            </div>
          </div>
          <div className="sched-right">
            <span className="sched-price">€ 580</span>
            <span className="sched-status sts-warn">
              <span className="sts-dot"></span> {t('pending')}
            </span>
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
              <span className="sched-type pickup">{t('pickupUpper')}</span>
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
            <span className="sched-status sts-ok">
              <span className="sts-dot"></span> {t('onSchedule')}
            </span>
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
              <span className="sched-type pickup">{t('pickupUpper')}</span>
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
            <span className="sched-status sts-ok">
              <span className="sts-dot"></span> {t('onSchedule')}
            </span>
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
              <span className="sched-type delivery">{t('deliveryUpper')}</span>
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
            <span className="sched-status sts-transit">
              <span className="sts-dot"></span> {t('inTransit')}
            </span>
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
              <span className="sched-type delivery">{t('deliveryUpper')}</span>
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
            <span className="sched-status sts-pending">
              <span className="sts-dot"></span> {t('upcoming')}
            </span>
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
              <span className="sched-type delivery">{t('deliveryUpper')}</span>
              <span className="sched-sid">#SID-13997</span>
              <span className="sched-lane">→ Trikala</span>
            </div>
            <div className="sched-row2">
              <span className="sched-carrier">
                <span className="sched-carrier-av">KR</span> KRP Transport S.A
              </span>
              <span style={{ color: 'var(--danger)', fontWeight: 600 }}>
                · {t('delayed45Min')}
              </span>
            </div>
          </div>
          <div className="sched-right">
            <span className="sched-price">€ 320</span>
            <span className="sched-status sts-risk">
              <span className="sts-dot"></span> {t('delayed')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
