/**
 * The product type a new product will be created with, and the pencil that
 * changes it (MS3-370). The model proposes a type while the file is analysed;
 * the shipper can pick another before importing - the category follows from
 * the type. The list is the Product Master's own (localised, cached under the
 * same query key), loaded only when the pencil is first pressed.
 */
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, Pencil } from 'lucide-react';
import type { ThemeTokens } from '../../utils/themes';
import { useTranslation } from '../../hooks/useTranslation';
import { productMasterService } from '../../api/services/productMasterService';
import type { ImportReviewItem } from './api/orderImportService';
import { Chip, SmallSelect } from './importCardKit';

export function ProductTypeRow({
  T, item, busy, onPick,
}: {
  T: ThemeTokens;
  item: ImportReviewItem;
  busy: boolean;
  onPick: (ref: string, typeId: number) => void;
}) {
  const { t } = useTranslation();
  const [editing, setEditing] = useState(false);
  const categories = useQuery({
    queryKey: ['product-master', 'reference', 'all'],
    queryFn: () => productMasterService.getAllReferenceCategories(),
    enabled: editing,
    staleTime: 10 * 60_000,
  });
  if (item.status !== 'new' || !item.productRef) return null;
  const type = item.productType ?? null;
  const ref = item.productRef;
  // The catalogue's names are English on the gateway; prefer the localised ones once loaded.
  const localName = (() => {
    if (!type || !categories.data) return null;
    for (const c of categories.data) {
      const hit = c.types.find((x) => Number(x.id) === type.id);
      if (hit) return `${c.name} › ${hit.name}`;
    }
    return null;
  })();
  const label = type ? (localName ?? `${type.category} › ${type.name}`) : t('vagonai.erpImport.productType.none');
  const source = type?.source;

  return (
    <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[12px]" data-testid="erp-import-product-type">
      <span style={{ color: T.t3 }}>{t('vagonai.erpImport.productType.label')}</span>
      {editing ? (
        <>
          <SmallSelect
            T={T}
            label={t('vagonai.erpImport.productType.pick', { name: item.name })}
            value={type ? String(type.id) : ''}
            disabled={busy || categories.isLoading}
            onChange={(id) => {
              if (Number(id) && Number(id) !== type?.id) onPick(ref, Number(id));
              setEditing(false);
            }}
            testId="erp-import-product-type-select"
          >
            <option value="">{categories.isLoading ? t('vagonai.erpImport.productType.loading') : t('vagonai.erpImport.productType.choose')}</option>
            {(categories.data ?? []).map((c) => (
              <optgroup key={c.id} label={c.name}>
                {c.types.map((x) => <option key={x.id} value={String(Number(x.id))}>{x.name}</option>)}
              </optgroup>
            ))}
          </SmallSelect>
          {categories.isError ? <span style={{ color: T.t3 }}>{t('vagonai.erpImport.productType.loadFailed')}</span> : null}
          <button type="button" className="underline" style={{ color: T.t2 }} onClick={() => setEditing(false)}>
            {t('vagonai.erpImport.productType.cancel')}
          </button>
        </>
      ) : (
        <>
          <span className="min-w-0" style={{ color: type ? T.t1 : T.t3 }}>{label}</span>
          {source === 'fallback' ? (
            <Chip T={T} tone="warn" title={t('vagonai.erpImport.productType.fallbackHint')}>{t('vagonai.erpImport.productType.fallback')}</Chip>
          ) : source === 'user' ? (
            <Chip T={T} tone="neutral">{t('vagonai.erpImport.productType.user')}</Chip>
          ) : source === 'ai' ? (
            <Chip T={T} tone="neutral" title={t('vagonai.erpImport.productType.aiHint')}>{t('vagonai.erpImport.productType.ai')}</Chip>
          ) : null}
          <button
            type="button"
            disabled={busy}
            onClick={() => setEditing(true)}
            className="inline-flex items-center justify-center rounded-md"
            style={{ width: 24, height: 24, color: T.t2, border: `1px solid ${T.bd}`, cursor: busy ? 'not-allowed' : 'pointer' }}
            aria-label={t('vagonai.erpImport.productType.change', { name: item.name })}
            title={t('vagonai.erpImport.productType.change', { name: item.name })}
            data-testid="erp-import-product-type-edit"
          >
            {busy ? <Loader2 size={12} className="animate-spin" aria-hidden="true" /> : <Pencil size={12} aria-hidden="true" />}
          </button>
        </>
      )}
    </div>
  );
}
