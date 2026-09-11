import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { shipmentsService } from '../../api';
import type { Shipment } from '../../context/AppContext';
import { useTranslation } from '../../hooks/useTranslation';
import {
  formatEuro,
  formatStatValue,
  isShipmentEditable,
} from '../../pages/ManageShipments/utils/listingUtils';
import { formatUtcToDisplayDateTime } from '../../utils/timezone';
import { translateDashMessage, formatDashError } from './dashErrorUtils';
import { DashExpandSkeleton } from './DashboardSkeletons';

interface BoardRowExpandProps {
  shipmentId: string;
  listShipment: Shipment;
  cached?: Shipment | null;
  onCached: (shipment: Shipment) => void;
}

export interface ParsedNote {
  id: string;
  author: string;
  timestamp: string | null;
  visibility: 'internal' | 'carrier';
  body: string;
}

function collectOrders(shipment: Shipment): string[] {
  const fromIds = (shipment.orderIds ?? []).filter(Boolean);
  if (fromIds.length > 0) return Array.from(new Set(fromIds));

  const fromCustomers: string[] = [];
  for (const c of shipment.customer ?? []) {
    for (const o of (c.orders ?? []) as Array<string | { id?: string | number }>) {
      if (typeof o === 'string' && o) fromCustomers.push(o);
      else if (o && typeof o === 'object' && o.id) fromCustomers.push(String(o.id));
    }
  }
  for (const stop of shipment.stops ?? []) {
    for (const c of stop.customers ?? []) {
      for (const o of (c.orders ?? []) as Array<string | { id?: string | number }>) {
        if (typeof o === 'string' && o) fromCustomers.push(o);
        else if (o && typeof o === 'object' && o.id) fromCustomers.push(String(o.id));
      }
    }
  }
  return Array.from(new Set(fromCustomers));
}

function collectVehicles(shipment: Shipment): string[] {
  const carrierVehicle = shipment.assignedDriverVehicleType?.trim();
  if (carrierVehicle) return [carrierVehicle];

  const plates = (shipment.assignedDriverPlates ?? []).filter(Boolean);
  if (plates.length > 0) return plates;

  const fromSummary = shipment.loadSummary?.vehicleTypes?.filter(Boolean) ?? [];
  if (fromSummary.length > 0) return fromSummary;

  return (shipment.truckTypes ?? []).filter(Boolean);
}

function collectCargo(shipment: Shipment): string[] {
  const fromSpecs = shipment.loadSummary?.cargoSpecs?.filter(Boolean) ?? [];
  if (fromSpecs.length > 0) return Array.from(new Set(fromSpecs));

  const products: string[] = [];
  for (const stop of shipment.stops ?? []) {
    for (const c of stop.customers ?? []) {
      for (const o of c.orders ?? []) {
        if (o.products && o.products !== '—') products.push(o.products);
      }
    }
  }
  return Array.from(new Set(products));
}

function parseNoteBlob(raw?: string | null): ParsedNote[] {
  if (!raw) return [];
  const trimmed = raw.trim();
  if (!trimmed) return [];

  const chunks = trimmed.split(/(?:\r\n|\r|\n)+|(?=\[(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})[^\]]*\]:?)/u);
  const notes: ParsedNote[] = [];

  chunks.forEach((chunk, index) => {
    const text = chunk.trim();
    if (!text) return;

    const match = text.match(/^\[([\d\/:\sT\-Z+.]+)\s*(?:·|:)\s*([^()]+?)\s*(?:\((internal|carrier)\))?\]:?\s*(.+)$/s);
    if (match) {
      notes.push({
        id: `note-${index}`,
        timestamp: match[1].trim(),
        author: match[2].trim() || 'Shipper',
        visibility: match[3]?.toLowerCase() === 'carrier' ? 'carrier' : 'internal',
        body: match[4].trim(),
      });
    } else {
      notes.push({
        id: `note-${index}`,
        timestamp: null,
        author: 'Shipper',
        visibility: 'internal',
        body: text,
      });
    }
  });

  return notes;
}

function collectStructuredNotes(shipment: Shipment): ParsedNote[] {
  if (shipment.notesList && shipment.notesList.length > 0) {
    const results: ParsedNote[] = [];
    shipment.notesList.forEach((n, idx) => {
      const body = (n.body || '').trim();
      if (body.startsWith('[')) {
        results.push(...parseNoteBlob(body));
      } else if (body) {
        results.push({
          id: n.id || `nl-${idx}`,
          author: n.author || 'Shipper',
          timestamp: n.timestamp || null,
          visibility: n.visibility === 'carrier' ? 'carrier' : 'internal',
          body,
        });
      }
    });
    if (results.length > 0) return results;
  }

  const rawNote = (shipment as any).note || shipment.driverNotes || shipment.loadSummary?.specialInstructions;
  if (rawNote) {
    return parseNoteBlob(rawNote);
  }

  return [];
}

function displayRate(shipment: Shipment): { value: number | null; label: string } {
  if (shipment.agreedPrice != null && !Number.isNaN(shipment.agreedPrice)) {
    return { value: shipment.agreedPrice, label: 'agreed' };
  }
  if (shipment.quotedPrice != null && !Number.isNaN(shipment.quotedPrice)) {
    return { value: shipment.quotedPrice, label: 'quoted' };
  }
  if (shipment.price != null && !Number.isNaN(shipment.price)) {
    return { value: shipment.price, label: 'price' };
  }
  return { value: null, label: 'none' };
}

export const BoardRowExpand: React.FC<BoardRowExpandProps> = ({
  shipmentId,
  listShipment,
  cached,
  onCached,
}) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<Shipment | null>(cached ?? null);
  const [loading, setLoading] = useState(!cached);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cached) {
      setDetail(cached);
      setLoading(false);
      setError(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    shipmentsService
      .getMapped(shipmentId)
      .then((data) => {
        if (cancelled) return;
        setDetail(data);
        onCached(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(formatDashError(err, 'loadShipmentFailed').key);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [shipmentId, cached, onCached, t]);

  const shipment = detail ?? listShipment;

  const orders = useMemo(() => collectOrders(shipment), [shipment]);
  const vehicles = useMemo(() => collectVehicles(shipment), [shipment]);
  const cargo = useMemo(() => collectCargo(shipment), [shipment]);
  const structuredNotes = useMemo(() => collectStructuredNotes(shipment), [shipment]);
  const rateInfo = displayRate(shipment);
  const rateLabel = formatEuro(rateInfo.value) ?? '—';
  const distanceKm = shipment.journeyDistanceKm;
  const distanceLabel =
    distanceKm != null && !Number.isNaN(distanceKm) ? `${distanceKm} ${t('unitKm')}` : '—';
  const costPerKm =
    rateInfo.value != null && distanceKm != null && distanceKm > 0
      ? formatEuro(rateInfo.value / distanceKm)
      : null;
  const weightLabel = formatStatValue(shipment.totalWeight, shipment.weightUnit) || '—';
  const transporter = shipment.carrier?.trim() || shipment.assignedDriverName?.trim() || '—';
  const canEdit = isShipmentEditable(shipment.status);

  const goDetails = () => navigate(`/shipments/${shipment.id}`);
  const goTrack = () => navigate(`/shipments/${shipment.id}?focus=tracking`);
  const goEdit = () => {
    if (!canEdit) return;
    if (shipment.status === 'draft') {
      navigate(`/shipments/create/step/1?id=${shipment.id}`);
      return;
    }
    navigate(`/shipments/create/step/1?editId=${shipment.id}`);
  };

  if (loading && !detail) {
    return <DashExpandSkeleton />;
  }

  if (error && !detail) {
    return (
      <div className="expand-content">
        <div className="board-expand-empty">{translateDashMessage(t, error)}</div>
      </div>
    );
  }

  return (
    <div className="expand-content">
      <div className="expand-grid">
        <div className="expand-section">
          <div className="expand-section-title">{t('boardShipmentDetails')}</div>
          <div className="expand-field">
            <span className="expand-field-label">{t('boardOrders')}</span>
            <span className="expand-field-value mono">
              {orders.length > 0 ? orders.join(', ') : '—'}
            </span>
          </div>
          <div className="expand-field">
            <span className="expand-field-label">{t('boardVehicle')}</span>
            <span className="expand-field-value">
              {vehicles.length > 0 ? vehicles.join(', ') : '—'}
            </span>
          </div>
          <div className="expand-field">
            <span className="expand-field-label">{t('boardCargo')}</span>
            <span className="expand-field-value">
              {cargo.length > 0 ? cargo.join(', ') : '—'}
            </span>
          </div>
          <div className="expand-field">
            <span className="expand-field-label">{t('weight')}</span>
            <span className="expand-field-value">{weightLabel}</span>
          </div>
          <div className="expand-field">
            <span className="expand-field-label">{t('boardTransporter')}</span>
            <span className="expand-field-value">{transporter}</span>
          </div>
        </div>

        <div className="expand-section">
          <div className="expand-section-title">{t('boardRoutePrice')}</div>
          <div className="expand-field">
            <span className="expand-field-label">{t('boardDistance')}</span>
            <span className="expand-field-value mono">{distanceLabel}</span>
          </div>
          <div className="expand-field">
            <span className="expand-field-label">{t('boardRate')}</span>
            <span className="expand-field-value mono">{rateLabel}</span>
          </div>
          <div className="expand-field">
            <span className="expand-field-label">{t('boardCostKm')}</span>
            <span className="expand-field-value mono">{costPerKm ?? '—'}</span>
          </div>
        </div>

        <div className="expand-section">
          <div className="expand-section-title">{t('boardNotes')}</div>
          {structuredNotes.length > 0 ? (
            <div className="expand-notes-list">
              {structuredNotes.map((note) => (
                <div key={note.id} className="expand-note-item">
                  <div className="expand-note-header">
                    <div className="expand-note-meta">
                      <span className="expand-note-author">{note.author}</span>
                      {note.timestamp && (
                        <span className="expand-note-time">
                          {formatUtcToDisplayDateTime(note.timestamp)}
                        </span>
                      )}
                    </div>
                    <span className={`expand-note-vis ${note.visibility}`}>
                      {note.visibility === 'carrier' ? t('carrier', 'Carrier') : t('internal', 'Internal')}
                    </span>
                  </div>
                  <div className="expand-note-body">{note.body}</div>
                </div>
              ))}
            </div>
          ) : (
            <div className="expand-notes muted">{t('boardNoNotes')}</div>
          )}
        </div>
      </div>

      <div className="expand-actions">
        <button type="button" className="expand-btn primary" onClick={goDetails}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {t('loadDetails')}
        </button>
        {/* Consistent pin icon with Load Details for location/tracking actions */}
        <button type="button" className="expand-btn" onClick={goTrack}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {t('boardTrack', 'Track')}
        </button>
        {canEdit && (
          <button type="button" className="expand-btn" onClick={goEdit}>
            {t('edit')}
          </button>
        )}
      </div>
    </div>
  );
};
