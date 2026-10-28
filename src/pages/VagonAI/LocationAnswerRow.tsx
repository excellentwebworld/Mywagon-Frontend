/**
 * A location code nothing matched (MS3-369), answered on its own row in the
 * import card's Locations section: map it to a saved site, create a site from
 * a Places search, or skip it. A pickup maps to the account's own sites; a
 * drop-off to the receiver's saved addresses. Nothing is written until Import -
 * the run creates the site and remembers the code for the next file - and an
 * open or skipped code never blocks the import: those orders go in without
 * that stop, flagged.
 */
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { GoogleMapAddressField, type ParsedPlaceAddress } from '../../components/AddressBook/GoogleMapAddressField';
import type { ImportReviewLocation, ImportView, LocationAnswerBody } from './api/orderImportService';
import { SmallSelect } from './importCardKit';

type Question = NonNullable<ImportReviewLocation['question']>;

export function LocationAnswerRow({
  T, item, sites, busy, onAnswer,
}: {
  T: ThemeTokens;
  item: ImportReviewLocation;
  /** The account's own sites - what a pickup code maps to. */
  sites: ImportView['sites'];
  busy: boolean;
  onAnswer: (body: LocationAnswerBody) => void;
}) {
  const { t } = useTranslation();
  const q = item.question as Question;
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [place, setPlace] = useState<ParsedPlaceAddress | null>(null);

  const options =
    q.role === 'pickup'
      ? sites.map((s) => ({ id: s.id, label: [s.name, s.code ? `(${s.code})` : null, s.city ? `- ${s.city}` : null].filter(Boolean).join(' ') }))
      : q.candidates.map((c) => ({ id: c.id, label: [c.name, c.code ? `(${c.code})` : null].filter(Boolean).join(' ') }));
  const state =
    q.answer === 'map' ? t('vagonai.erpImport.location.mapped', { name: item.name })
      : q.answer === 'create' ? t('vagonai.erpImport.location.willCreate', { name: item.name, address: item.detail ?? '' })
        : q.answer === 'skip' ? t(`vagonai.erpImport.location.skipped.${q.role}`)
          : t(`vagonai.erpImport.location.open.${q.role}`, { code: q.code, count: item.orders });

  const save = () => {
    if (!place) return;
    onAnswer({
      key: q.key,
      action: 'create',
      site: {
        name: name.trim() || place.placeName || q.code,
        address: place.formattedAddress || place.address,
        city: place.city,
        postcode: place.postalCode,
        country: place.country || null,
        lat: Number(place.lat),
        lng: Number(place.lng),
      },
    });
    setCreating(false);
  };
  const button = (label: string, on: boolean, onClick: () => void, testId: string) => (
    <button
      type="button"
      aria-pressed={on}
      disabled={busy}
      onClick={onClick}
      className="rounded-md px-2.5 py-1 text-[12px] font-semibold"
      style={{
        border: `1px solid ${on ? T.ac : T.bd}`,
        background: on ? `color-mix(in srgb, ${T.ac} 12%, transparent)` : 'transparent',
        color: on ? T.ac : T.t2,
        cursor: busy ? 'not-allowed' : 'pointer',
      }}
      data-testid={testId}
    >
      {label}
    </button>
  );

  return (
    <div className="mt-1.5" data-testid="erp-import-location-question" data-answer={q.answer ?? 'open'}>
      <p className="m-0 text-[12px]" style={{ color: T.t2 }}>{state}</p>
      <div className="flex flex-wrap items-center gap-1.5 mt-1.5" role="group" aria-label={t('vagonai.erpImport.location.question', { code: q.code })}>
        {options.length ? (
          <SmallSelect
            T={T}
            label={t(`vagonai.erpImport.location.mapTo.${q.role}`, { code: q.code })}
            value=""
            disabled={busy}
            onChange={(id) => {
              if (Number(id)) onAnswer({ key: q.key, action: 'map', siteId: Number(id) });
            }}
            testId="erp-import-location-map"
          >
            <option value="">{t(`vagonai.erpImport.location.mapTo.${q.role}`, { code: q.code })}</option>
            {options.map((o) => <option key={o.id} value={String(o.id)}>{o.label}</option>)}
          </SmallSelect>
        ) : null}
        {button(t('vagonai.erpImport.location.create'), q.answer === 'create' || creating, () => setCreating((v) => !v), 'erp-import-location-create')}
        {button(t('vagonai.erpImport.location.skip'), q.answer === 'skip', () => onAnswer({ key: q.key, action: 'skip' }), 'erp-import-location-skip')}
        {busy ? <Loader2 size={14} className="animate-spin" style={{ color: T.t3 }} aria-hidden="true" /> : null}
      </div>
      {creating ? (
        <div className="mt-2 rounded-lg border p-2.5 space-y-2" style={{ borderColor: T.bd }} data-testid="erp-import-location-form">
          <label className="block text-[12px]" style={{ color: T.t2 }}>
            {t('vagonai.erpImport.location.name')}
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={q.role === 'pickup' ? q.code : (item.detail ?? q.code)}
              className="mt-1 w-full rounded-lg border px-2.5 py-1.5 text-[12.5px] outline-none"
              style={{ borderColor: T.bd, background: T.sf, color: T.t1 }}
            />
          </label>
          <GoogleMapAddressField
            address={address}
            lat={place?.lat ?? ''}
            lng={place?.lng ?? ''}
            onAddressChange={(a) => {
              setAddress(a);
              setPlace(null);
            }}
            onLatLngChange={() => undefined}
            onPlaceSelected={(p) => {
              setPlace(p);
              setAddress(p.formattedAddress || p.address);
            }}
            hideHint
            inputId={`erp-import-location-address-${q.key}`}
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={!place || busy}
              onClick={save}
              className="rounded-md px-3 py-1 text-[12px] font-semibold"
              style={{ background: place ? T.ac : T.sa, color: place ? '#fff' : T.t3, cursor: place ? 'pointer' : 'not-allowed' }}
              data-testid="erp-import-location-save"
            >
              {t('vagonai.erpImport.location.save')}
            </button>
            <span className="text-[11.5px]" style={{ color: T.t3 }}>{t('vagonai.erpImport.location.pickHint')}</span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
