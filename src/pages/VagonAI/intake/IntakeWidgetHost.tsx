/**
 * IntakeWidgetHost — the page-facing wrapper: reads the theme and the translator, then renders the view.
 * All rendering lives in `IntakeWidgetHostView` (which takes both as props, so it is testable without a provider).
 */
import { useCallback } from 'react';
import { useTheme } from '../../../hooks/useTheme';
import { useTranslation } from '../../../hooks/useTranslation';
import i18n from '../../../utils/i18n';
import type { ExistsFn, TFn } from './intakeCopy';
import { createKitOf, type CreateKitDeps } from './createKit';
import { IntakeWidgetHostView, type IntakeHostProps } from './IntakeWidgetHostView';

export type { IntakeActions, IntakeHostProps } from './IntakeWidgetHostView';

/** The page's own submit handlers (the ones the old wizard's forms use). Both given ⇒ the pickers offer "Add new" (§8.10). */
export type IntakeWidgetHostProps = Omit<IntakeHostProps, 'create'> & {
  onSubmitAddress?: CreateKitDeps['onSubmitAddress'];
  onSubmitProduct?: CreateKitDeps['onSubmitProduct'];
  /** Dev preview: no real writes, so no create forms. */
  createDisabled?: boolean;
};

export function IntakeWidgetHost({ onSubmitAddress, onSubmitProduct, createDisabled, ...props }: IntakeWidgetHostProps) {
  const { T } = useTheme();
  const { t } = useTranslation();
  const exists = useCallback<ExistsFn>((key) => i18n.exists(key), []);
  const create = onSubmitAddress && onSubmitProduct && !createDisabled
    ? createKitOf({ T, onSubmitAddress, onSubmitProduct, locale: i18n.language })
    : undefined;
  return <IntakeWidgetHostView {...props} create={create} ui={{ T, t: t as TFn }} exists={exists} />;
}
