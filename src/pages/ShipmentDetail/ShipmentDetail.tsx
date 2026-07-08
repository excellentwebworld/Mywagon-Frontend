import React, { useCallback, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ActivityLogModal,
  AuditLogCard,
  BillingCard,
  CarrierCard,
  CommandHeader,
  DocumentsCard,
  IncidentsCard,
  JumpNav,
  LoadSummaryCard,
  MilestonesBar,
  NotesCard,
  ShareTrackingModal,
  StopsCard,
  TrackingCard,
  TripSummaryCard,
} from '../../components/ShipmentDetail';
import { useApp } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import { useShipment } from '../../hooks/useShipments';
import { ShipmentDetailSkeleton } from '../../components/skeletons/ShipmentDetailSkeleton';
import { buildShipmentDetailViewModel } from './detailViewModel';
import '../../styles/load-details.css';

const DEFAULT_SECTIONS: Record<string, boolean> = {
  stops: true,
  load: true,
  notes: true,
  docs: true,
  tracking: true,
  trip: true,
  carrier: true,
  incidents: true,
  billing: true,
  audit: true,
};

export const ShipmentDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { showToast } = useApp();
  const { t } = useTranslation();
  const { shipment, loading, error } = useShipment(id);
  const [lang, setLang] = useState<'en' | 'el'>('en');
  const [activeNav, setActiveNav] = useState('stops');
  const [sections, setSections] = useState(DEFAULT_SECTIONS);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [isLogOpen, setIsLogOpen] = useState(false);

  const vm = useMemo(() => (shipment ? buildShipmentDetailViewModel(shipment) : null), [shipment]);

  const toggleSection = useCallback((key: string) => {
    setSections((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleJump = useCallback((targetId: string) => {
    setActiveNav(targetId);
    document.getElementById(targetId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, []);

  const handleCopy = useCallback(
    (text: string) => {
      navigator.clipboard.writeText(text);
      showToast(t('copied'), 'success');
    },
    [showToast, t]
  );

  if (loading) {
    return <ShipmentDetailSkeleton t={t} />;
  }

  if (!shipment || !vm) {
    return (
      <div style={{ padding: 40, textAlign: 'center' }}>
        <h2 style={{ fontSize: 20, fontWeight: 700 }}>{t('shipmentNotFound')}</h2>
        <p style={{ margin: '12px 0', color: 'var(--text-tertiary)' }}>{error || t('shipmentNotFoundDesc')}</p>
        <Link to="/shipments" className="btn btn-primary btn-sm">
          {t('backToShipments')}
        </Link>
      </div>
    );
  }

  return (
    <div className="ld-wrap">
      <div className="ld-bc">
        <Link to="/shipments">{t('manageShipments')}</Link> <span>›</span> <span>{t('loadDetails')}</span>
      </div>

      <CommandHeader
        vm={vm}
        lang={lang}
        onLangChange={setLang}
        onCopyId={() => handleCopy(vm.displayId)}
        onShare={() => setIsShareOpen(true)}
        onAuditLog={() => setIsLogOpen(true)}
        onToast={(msg) => showToast(msg, 'info')}
        t={t}
      />

      <JumpNav active={activeNav} onJump={handleJump} t={t} />

      <MilestonesBar vm={vm} lang={lang} onExceptionClick={handleJump} />

      <div className="ld-pg">
        <div className="ld-grid">
          <div className="ld-col">
            <StopsCard
              stops={vm.stops}
              expanded={sections.stops}
              onToggle={() => toggleSection('stops')}
              onCopy={handleCopy}
              onToast={(msg) => showToast(msg, 'info')}
              t={t}
            />
            <LoadSummaryCard
              loadSummary={vm.loadSummary}
              expanded={sections.load}
              onToggle={() => toggleSection('load')}
              onCopy={handleCopy}
              t={t}
            />
            <NotesCard
              notes={vm.notes}
              expanded={sections.notes}
              onToggle={() => toggleSection('notes')}
              onToast={(msg) => showToast(t('addNote'), 'info')}
              t={t}
            />
            <DocumentsCard
              documents={vm.documents}
              expanded={sections.docs}
              onToggle={() => toggleSection('docs')}
              onToast={(msg) => showToast(msg, 'info')}
              t={t}
            />
          </div>

          <div className="ld-col">
            <TrackingCard
              tracking={vm.tracking}
              expanded={sections.tracking}
              onToggle={() => toggleSection('tracking')}
              onShare={() => setIsShareOpen(true)}
              t={t}
            />
            <TripSummaryCard
              trip={vm.trip}
              expanded={sections.trip}
              onToggle={() => toggleSection('trip')}
              t={t}
            />
            <CarrierCard
              carrier={vm.carrier}
              expanded={sections.carrier}
              onToggle={() => toggleSection('carrier')}
              onToast={(msg) => showToast(msg, 'info')}
              t={t}
            />
            <IncidentsCard
              incidents={vm.incidents}
              expanded={sections.incidents}
              onToggle={() => toggleSection('incidents')}
              t={t}
            />
            <BillingCard
              billing={vm.billing}
              expanded={sections.billing}
              onToggle={() => toggleSection('billing')}
              t={t}
            />
          </div>
        </div>

        <AuditLogCard
          entries={vm.auditEntries}
          expanded={sections.audit}
          onToggle={() => toggleSection('audit')}
          t={t}
        />
      </div>

      <ShareTrackingModal
        open={isShareOpen}
        groups={vm.shareGroups}
        onClose={() => setIsShareOpen(false)}
        onSend={() => {
          showToast(t('trackingLinkShared'), 'success');
          setIsShareOpen(false);
        }}
        t={t}
      />

      <ActivityLogModal
        open={isLogOpen}
        entries={vm.auditEntries}
        onClose={() => setIsLogOpen(false)}
        t={t}
      />
    </div>
  );
};
