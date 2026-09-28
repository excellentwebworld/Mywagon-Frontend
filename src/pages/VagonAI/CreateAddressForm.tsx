/**
 * CreateAddressForm — the guided add-address form.
 *
 * Opens on a `flow_context` event with `flow: "create_location"`, or from the
 * **Add new address** button on the shipment wizard's stop pickers. Runs entirely
 * on the client off the bundle it was handed.
 *
 * ## The map picker is the whole reason this exists
 *
 * `POST /address-book/locations` requires a latitude and a longitude, and nothing
 * in the shipper API geocodes. So the conversational path has to ask a human to
 * read out two decimal numbers or paste a Maps URL — then cope with the shortened
 * link that does not contain them. That exchange is the worst moment in the
 * product, and one Places pick replaces it: address, city, postcode, region and
 * both coordinates, from a single search.
 *
 * `GoogleMapAddressField` already existed for the Address Book page and is reused
 * verbatim. Its `onPlaceSelected` is what fills the rest of the form in, and
 * `lat`/`lng` staying null is what blocks Save — a shipper who typed a street
 * without picking a suggestion has given us no coordinates, and a guessed one
 * saves cleanly while silently distorting the route distance the carrier is priced
 * against.
 *
 * ## The VAT field is conditional, and that is a feature
 *
 * `company_vat` is required to save a site, but every company already in the
 * shipper's Address Book arrives in the bundle with its VAT. So the field only
 * appears when they type a company the book does not know — or knows without a VAT
 * on file, which is a different state and not the same as known.
 */
import { useMemo, useState } from 'react';
import { MapPin, Save, CircleCheck, ChevronDown, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { GoogleMapAddressField } from '../../components/AddressBook/GoogleMapAddressField';
import type { FlowContextEvent, LocationFlowBundle } from '../../hooks/useChat';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { Button, Field, Heading, Notes, Shell } from './flowPrimitives';
import { inputStyle } from './flowHelpers';
import { useTr } from './i18n';
import {
  DIRECTORIES, SITE_ROLES, SITE_TYPES,
  directoryLabel, dockTypeLabel, duplicateOf, emptyLocationDraft, knownCompany, locationIssues, locationWarnings,
  needsVat, roleLabel, serializeLocationDraft, siteTypeLabel,
  type Directory, type LocationDraft, type SiteRole, type SiteType,
} from './createLocationDraft';

export interface AddressSubmitResult {
  ok: boolean;
  missing?: string[];
  reason?: string;
  done?: {
    locationId: string;
    name: string;
    company: string | null;
    city: string | null;
    usableFor: string;
    defaultsMessage?: string;
  };
}

/**
 * What a caller needs to slot the new site into a list it already has.
 *
 * `lat`/`lng` are included because the save response does not carry them — the
 * gateway's projection reduces coordinates to a `geo_verified` flag — and the
 * shipment wizard cannot measure a route without them. The form knows what it
 * submitted, so it passes them up rather than making the caller re-read the site.
 */
export interface SavedAddress {
  id: string;
  name: string;
  city: string | null;
  region: string | null;
  role: SiteRole;
  lat: number;
  lng: number;
}

interface Props {
  event: Extract<FlowContextEvent, { flow: 'create_location' }>;
  T: ThemeTokens;
  onSubmit: (draft: Record<string, unknown>) => Promise<AddressSubmitResult>;
  onSaved?: (site: SavedAddress) => void;
  /** Rendered when the form is a sub-step of another flow rather than its own card. */
  onCancel?: () => void;
  disabled?: boolean;
}

/** A segmented choice — used for the directory and the site's role. */
function Choice<V extends string>({
  T, label, value, options, onChange, disabled,
}: {
  T: ThemeTokens; label: string; value: V;
  options: { value: V; label: string }[]; onChange: (next: V) => void; disabled?: boolean;
}) {
  return (
    <div className="flex flex-col" style={{ gap: 4, flex: '1 1 100%' }}>
      <span style={{ fontSize: 11, color: T.t3, fontWeight: 600 }}>{label}</span>
      <div className="flex flex-wrap" style={{ gap: 5 }}>
        {options.map((option) => {
          const on = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              onClick={() => onChange(option.value)}
              className="rounded-lg"
              style={{
                height: 30, padding: '0 11px', fontSize: 12, fontWeight: 600,
                border: `1px solid ${on ? T.ac : T.bd}`,
                background: on ? T.al : 'transparent',
                color: on ? T.ac : T.t2,
                opacity: disabled ? 0.45 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer',
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default function CreateAddressForm({ event, T, onSubmit, onSaved, onCancel, disabled }: Props) {
  const { t } = useTranslation();
  const tr = useTr();
  const bundle: LocationFlowBundle = event.bundle;
  const [draft, setDraft] = useState<LocationDraft>(emptyLocationDraft);
  const [more, setMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [refusal, setRefusal] = useState<{ reason: string; missing: string[] } | null>(null);
  const [saved, setSaved] = useState<AddressSubmitResult['done'] | null>(null);
  const [tagText, setTagText] = useState('');

  const locked = disabled || busy || saved !== null;
  const patch = (next: Partial<LocationDraft>) => {
    setDraft((current) => ({ ...current, ...next }));
    setRefusal(null);
  };

  const issues = locationIssues(draft, bundle, tr);
  const clash = duplicateOf(draft, bundle);
  const warnings = locationWarnings(draft, bundle, tr);
  const vatNeeded = needsVat(draft, bundle);
  const known = knownCompany(draft, bundle);
  const cannotSave = issues.length > 0 || clash !== null;

  const companyNames = useMemo(() => bundle.companies.map((company) => company.name), [bundle.companies]);

  const save = async () => {
    setBusy(true);
    setRefusal(null);
    try {
      const result = await onSubmit(serializeLocationDraft(draft));
      if (!result.ok) {
        setRefusal({
          reason: result.reason ?? t('vagonai.addressForm.refusalFallback', 'This address could not be saved yet.'),
          missing: result.missing ?? [],
        });
        return;
      }
      setSaved(result.done ?? null);
      if (result.done && draft.lat !== null && draft.lng !== null) {
        onSaved?.({
          id: result.done.locationId,
          name: result.done.name,
          city: result.done.city,
          region: draft.region,
          role: draft.role,
          lat: draft.lat,
          lng: draft.lng,
        });
      }
    } finally {
      setBusy(false);
    }
  };

  if (saved) {
    return (
      <Shell T={T}>
        <Heading T={T} icon={<CircleCheck size={15} />} title={t('vagonai.addressForm.savedTitle', 'Address saved')} />
        <div className="flex flex-col" style={{ gap: 3, fontSize: 13, color: T.t1 }}>
          <span style={{ fontWeight: 650 }}>{saved.name}</span>
          <span style={{ fontSize: 12, color: T.t3 }}>
            {[saved.company, saved.city].filter(Boolean).join(' · ')}
          </span>
        </div>
        <Notes T={T} notes={saved.defaultsMessage ? [saved.defaultsMessage] : []} />
      </Shell>
    );
  }

  const windows = draft.receivingWindows ?? [];
  const contacts = draft.contacts ?? [];

  return (
    <Shell T={T}>
      <Heading
        T={T}
        icon={<MapPin size={15} />}
        title={t('vagonai.addressForm.title', 'Add an address')}
        hint={t(
          'vagonai.addressForm.hint',
          'Search for the address and pick it from the list — that is what places it on the map.',
        )}
      />

      <div className="flex flex-wrap" style={{ gap: 8 }}>
        <Field T={T} label={t('vagonai.addressForm.fields.name', 'Site name')}>
          <input
            value={draft.name}
            disabled={locked}
            placeholder={t('vagonai.addressForm.placeholders.name', 'Athens DC')}
            onChange={(e) => patch({ name: e.target.value })}
            style={{
              ...inputStyle(T),
              borderColor: clash ? '#B45309' : refusal?.missing.includes('name') ? '#DC2626' : T.bd,
            }}
          />
        </Field>
        <Field T={T} label={t('vagonai.addressForm.fields.company', 'Company')}>
          <input
            value={draft.companyName}
            disabled={locked}
            list="vai-companies"
            placeholder={t('vagonai.addressForm.placeholders.company', 'Acme Foods')}
            onChange={(e) => patch({ companyName: e.target.value })}
            style={{
              ...inputStyle(T),
              borderColor: refusal?.missing.includes('companyName') ? '#DC2626' : T.bd,
            }}
          />
        </Field>
        <datalist id="vai-companies">
          {companyNames.map((name) => (
            <option key={name} value={name} />
          ))}
        </datalist>
      </div>

      {clash && (
        <Notes
          T={T}
          tone="warn"
          notes={[
            clash.city
              ? t(
                'vagonai.addressForm.clashWithCity',
                'You already have a site called "{{name}}" for this company in {{city}}. Use that one, or give this site a different name.',
                { name: clash.name, city: clash.city },
              )
              : t(
                'vagonai.addressForm.clash',
                'You already have a site called "{{name}}" for this company. Use that one, or give this site a different name.',
                { name: clash.name },
              ),
          ]}
        />
      )}

      {/* Only for a company the Address Book cannot supply a VAT for. A company it
          knows brings its own, which is the round trip this flow removes. */}
      {vatNeeded && (
        <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
          <Field T={T} label={t('vagonai.addressForm.fields.companyVat', 'Company VAT number')}>
            <input
              value={draft.companyVat ?? ''}
              disabled={locked}
              placeholder="EL123456789"
              onChange={(e) => patch({ companyVat: e.target.value })}
              style={{
                ...inputStyle(T),
                borderColor: refusal?.missing.includes('companyVat') ? '#DC2626' : T.bd,
              }}
            />
          </Field>
        </div>
      )}
      {vatNeeded && (
        <Notes
          T={T}
          notes={[
            known
              ? t(
                'vagonai.addressForm.vatKnownNoVat',
                '{{name}} is in your Address Book but has no VAT number on file, so it is needed here.',
                { name: known.name },
              )
              : t(
                'vagonai.addressForm.vatNewCompany',
                'This company is new to your Address Book, so its VAT number is needed once. Next time it will be filled in for you.',
              ),
          ]}
        />
      )}

      {/* The address row. One search box, and everything else it fills in. */}
      <div style={{ marginTop: 10 }}>
        <GoogleMapAddressField
          address={draft.address}
          lat={draft.lat === null ? '' : String(draft.lat)}
          lng={draft.lng === null ? '' : String(draft.lng)}
          onAddressChange={(address) =>
            // Typing by hand invalidates the coordinates that came with the last
            // pick: they belong to a different place. Cleared rather than left
            // behind, which would save a site pinned somewhere the shipper never
            // chose.
            setDraft((current) => ({
              ...current,
              address,
              ...(address.trim() !== current.address.trim() ? { lat: null, lng: null } : {}),
            }))
          }
          onLatLngChange={(lat, lng) =>
            patch({ lat: Number(lat) || null, lng: Number(lng) || null })
          }
          onPlaceSelected={(place) =>
            patch({
              address: place.address || place.formattedAddress,
              city: place.city,
              postalCode: place.postalCode || null,
              region: place.region || null,
              lat: Number(place.lat) || null,
              lng: Number(place.lng) || null,
            })
          }
          error={
            refusal?.missing.includes('lat')
              ? t('vagonai.addressForm.pickFromSuggestions', 'Pick the address from the suggestions.')
              : undefined
          }
          inputId="vai-address-input"
        />
      </div>

      <div className="flex flex-wrap" style={{ gap: 8, marginTop: 8 }}>
        <Field T={T} label={t('vagonai.addressForm.fields.city', 'City')}>
          <input
            value={draft.city}
            disabled={locked}
            onChange={(e) => patch({ city: e.target.value })}
            style={{ ...inputStyle(T), borderColor: refusal?.missing.includes('city') ? '#DC2626' : T.bd }}
          />
        </Field>
        <Field T={T} label={t('vagonai.addressForm.fields.postalCode', 'Postcode')}>
          <input
            value={draft.postalCode ?? ''}
            disabled={locked}
            onChange={(e) => patch({ postalCode: e.target.value })}
            style={inputStyle(T)}
          />
        </Field>
      </div>

      <div className="flex flex-col" style={{ gap: 9, marginTop: 11 }}>
        <Choice<Directory>
          T={T}
          label={t('vagonai.addressForm.fields.directory', 'Whose site is it?')}
          value={draft.directory}
          disabled={locked}
          options={DIRECTORIES.map((value) => ({ value, label: directoryLabel(value, tr) }))}
          onChange={(directory) => patch({ directory })}
        />
        <Choice<SiteRole>
          T={T}
          label={t('vagonai.addressForm.fields.role', 'What can it be used for?')}
          value={draft.role}
          disabled={locked}
          options={SITE_ROLES.map((value) => ({ value, label: roleLabel(value, tr) }))}
          onChange={(role) => patch({ role })}
        />
      </div>

      <button
        type="button"
        onClick={() => setMore((open) => !open)}
        className="inline-flex items-center"
        style={{ gap: 5, marginTop: 12, fontSize: 12, fontWeight: 600, color: T.t2, background: 'none', border: 0, cursor: 'pointer', padding: 0 }}
      >
        {more ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        {t('vagonai.addressForm.moreDetails', 'More details (all optional)')}
      </button>

      {more && (
        <>
          <div className="flex flex-wrap" style={{ gap: 8, marginTop: 9 }}>
            <Field T={T} label={t('vagonai.addressForm.fields.siteType', 'Kind of site')}>
              <select
                value={draft.siteType ?? ''}
                disabled={locked}
                onChange={(e) => patch({ siteType: (e.target.value || null) as SiteType | null })}
                style={inputStyle(T)}
              >
                <option value="">{t('vagonai.addressForm.notSpecified', 'Not specified')}</option>
                {SITE_TYPES.map((type) => (
                  <option key={type} value={type}>{siteTypeLabel(type, tr)}</option>
                ))}
              </select>
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.region', 'Region')}>
              <input
                value={draft.region ?? ''}
                disabled={locked}
                onChange={(e) => patch({ region: e.target.value })}
                style={inputStyle(T)}
              />
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.phone', 'Site phone')}>
              <input value={draft.phone ?? ''} disabled={locked} onChange={(e) => patch({ phone: e.target.value })} style={inputStyle(T)} />
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.email', 'Site email')}>
              <input value={draft.email ?? ''} disabled={locked} onChange={(e) => patch({ email: e.target.value })} style={inputStyle(T)} />
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.locationCode', 'Your own code')}>
              <input value={draft.locationCode ?? ''} disabled={locked} onChange={(e) => patch({ locationCode: e.target.value })} style={inputStyle(T)} />
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.dockType', 'Loading method')}>
              <input
                value={draft.dockType ?? ''}
                disabled={locked}
                list="vai-docks"
                placeholder={dockTypeLabel(bundle.defaults.dockType, tr)}
                onChange={(e) => patch({ dockType: e.target.value })}
                style={inputStyle(T)}
              />
            </Field>
            <datalist id="vai-docks">
              {['Dock leveler', 'Ground level', 'Ramp', 'Side loading'].map((option) => {
                // The value is what gets saved and stays English; the label is only
                // set when it reads differently, so English shows each option once.
                const label = dockTypeLabel(option, tr);
                return <option key={option} value={option} label={label !== option ? label : undefined} />;
              })}
            </datalist>
            <Field T={T} label={t('vagonai.addressForm.fields.maxTruckLength', 'Max truck length')}>
              <input
                value={draft.maxTruckLength ?? ''}
                disabled={locked}
                placeholder={bundle.defaults.maxTruckLength}
                onChange={(e) => patch({ maxTruckLength: e.target.value })}
                style={inputStyle(T)}
              />
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.maxWeight', 'Max weight')}>
              <input
                value={draft.maxWeight ?? ''}
                disabled={locked}
                placeholder={bundle.defaults.maxWeight}
                onChange={(e) => patch({ maxWeight: e.target.value })}
                style={inputStyle(T)}
              />
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.loadTime', 'Loading time (min)')}>
              <input
                type="number"
                min={1}
                value={draft.loadTimeMinutes ?? ''}
                disabled={locked}
                placeholder={String(bundle.defaults.loadTimeMinutes)}
                onChange={(e) => patch({ loadTimeMinutes: e.target.value === '' ? null : Number(e.target.value) })}
                style={inputStyle(T)}
              />
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.receivingHours', 'Opening hours (free text)')}>
              <input
                value={draft.receivingHours ?? ''}
                disabled={locked}
                placeholder="08:00-16:00"
                onChange={(e) => patch({ receivingHours: e.target.value })}
                style={inputStyle(T)}
              />
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.tags', 'Tags')}>
              <input
                value={tagText}
                disabled={locked}
                placeholder={t('vagonai.addressForm.placeholders.tags', 'cross-dock, bonded')}
                onChange={(e) => {
                  setTagText(e.target.value);
                  const tags = e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean);
                  patch({ tags: tags.length > 0 ? tags : null });
                }}
                style={inputStyle(T)}
              />
            </Field>
          </div>

          {/* Appointment and its windows. The API refuses an appointment site with
              no window, so the toggle opens one straight away rather than leaving
              the shipper to discover the requirement on Save. */}
          <label className="flex items-center" style={{ gap: 7, marginTop: 11, fontSize: 12, color: T.t2 }}>
            <input
              type="checkbox"
              checked={draft.appointmentRequired === true}
              disabled={locked}
              onChange={(e) =>
                patch({
                  appointmentRequired: e.target.checked,
                  receivingWindows: e.target.checked && windows.length === 0
                    ? [{ start: '08:00', end: '16:00' }]
                    : draft.receivingWindows,
                })
              }
            />
            {t('vagonai.addressForm.appointmentRequired', 'Carriers must book a slot')}
          </label>

          {windows.map((window, index) => (
            <div key={index} className="flex flex-wrap items-end" style={{ gap: 8, marginTop: 7 }}>
              <Field T={T} label={t('vagonai.addressForm.fields.windowOpens', 'Window {{n}} opens', { n: index + 1 })}>
                <input
                  type="time"
                  value={window.start}
                  disabled={locked}
                  onChange={(e) =>
                    patch({ receivingWindows: windows.map((w, i) => (i === index ? { ...w, start: e.target.value } : w)) })
                  }
                  style={inputStyle(T)}
                />
              </Field>
              <Field T={T} label={t('vagonai.addressForm.fields.windowCloses', 'Closes')}>
                <input
                  type="time"
                  value={window.end}
                  disabled={locked}
                  onChange={(e) =>
                    patch({ receivingWindows: windows.map((w, i) => (i === index ? { ...w, end: e.target.value } : w)) })
                  }
                  style={inputStyle(T)}
                />
              </Field>
              <Button
                T={T}
                variant="danger"
                disabled={locked}
                icon={<Trash2 size={13} />}
                onClick={() => {
                  const next = windows.filter((_, i) => i !== index);
                  patch({ receivingWindows: next.length > 0 ? next : null });
                }}
              >
                {t('vagonai.addressForm.remove', 'Remove')}
              </Button>
            </div>
          ))}
          {draft.appointmentRequired && (
            <Button
              T={T}
              variant="ghost"
              disabled={locked}
              icon={<Plus size={13} />}
              onClick={() => patch({ receivingWindows: [...windows, { start: '08:00', end: '16:00' }] })}
            >
              {t('vagonai.addressForm.addWindow', 'Add a window')}
            </Button>
          )}

          <div className="flex flex-wrap" style={{ gap: 8, marginTop: 11 }}>
            <Field T={T} label={t('vagonai.addressForm.fields.carrierNote', 'Note the carrier sees')}>
              <input
                value={draft.carrierNote ?? ''}
                disabled={locked}
                placeholder={t('vagonai.addressForm.placeholders.carrierNote', 'Call 30 min before arrival.')}
                onChange={(e) => patch({ carrierNote: e.target.value })}
                style={inputStyle(T)}
              />
            </Field>
            <Field T={T} label={t('vagonai.addressForm.fields.internalNote', 'Internal note')}>
              <input
                value={draft.internalNote ?? ''}
                disabled={locked}
                onChange={(e) => patch({ internalNote: e.target.value })}
                style={inputStyle(T)}
              />
            </Field>
          </div>

          {contacts.map((contact, index) => (
            <div key={index} className="flex flex-wrap items-end" style={{ gap: 8, marginTop: 7 }}>
              <Field T={T} label={t('vagonai.addressForm.fields.contact', 'Contact {{n}}', { n: index + 1 })}>
                <input
                  value={contact.name}
                  disabled={locked}
                  placeholder={t('vagonai.addressForm.placeholders.contactName', 'Name')}
                  onChange={(e) =>
                    patch({ contacts: contacts.map((c, i) => (i === index ? { ...c, name: e.target.value } : c)) })
                  }
                  style={inputStyle(T)}
                />
              </Field>
              <Field T={T} label={t('vagonai.addressForm.fields.contactPhone', 'Phone')}>
                <input
                  value={contact.phone ?? ''}
                  disabled={locked}
                  onChange={(e) =>
                    patch({ contacts: contacts.map((c, i) => (i === index ? { ...c, phone: e.target.value } : c)) })
                  }
                  style={inputStyle(T)}
                />
              </Field>
              <Button
                T={T}
                variant="danger"
                disabled={locked}
                icon={<Trash2 size={13} />}
                onClick={() => {
                  const next = contacts.filter((_, i) => i !== index);
                  patch({ contacts: next.length > 0 ? next : null });
                }}
              >
                {t('vagonai.addressForm.remove', 'Remove')}
              </Button>
            </div>
          ))}
          <Button
            T={T}
            variant="ghost"
            disabled={locked}
            icon={<Plus size={13} />}
            onClick={() => patch({ contacts: [...contacts, { name: '', role: null, phone: null, email: null }] })}
          >
            {t('vagonai.addressForm.addContact', 'Add a contact')}
          </Button>
        </>
      )}

      <Notes T={T} notes={bundle.notes} />
      <Notes T={T} notes={warnings} />
      {refusal && <Notes T={T} tone="warn" notes={[refusal.reason]} />}

      <div className="flex items-center justify-end" style={{ gap: 7, marginTop: 13 }}>
        {onCancel && (
          <Button T={T} variant="ghost" onClick={onCancel} disabled={busy}>
            {t('vagonai.addressForm.cancel', 'Cancel')}
          </Button>
        )}
        <Button T={T} onClick={save} disabled={locked || cannotSave} icon={busy ? undefined : <Save size={14} />}>
          {busy ? t('vagonai.addressForm.saving', 'Saving…') : t('vagonai.addressForm.save', 'Save address')}
        </Button>
      </div>
      {cannotSave && issues.length > 0 && (
        <p style={{ fontSize: 11, color: T.t3, textAlign: 'right', marginTop: 5 }}>{issues[0]!.message}</p>
      )}
    </Shell>
  );
}
