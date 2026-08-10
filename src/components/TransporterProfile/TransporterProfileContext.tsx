import React, { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TransporterType } from '../../api/services/transporterProfileService';
import { TransporterProfileModal } from './TransporterProfileModal';

export interface TransporterProfileTarget {
  id: number;
  type: TransporterType;
  name?: string;
}

interface TransporterProfileContextValue {
  openTransporterProfile: (target: TransporterProfileTarget | null) => void;
}

const TransporterProfileContext = createContext<TransporterProfileContextValue | null>(null);

export function TransporterProfileProvider({ children }: { children: React.ReactNode }) {
  const { t } = useTranslation();
  const [target, setTarget] = useState<TransporterProfileTarget | null>(null);

  const openTransporterProfile = useCallback((next: TransporterProfileTarget | null) => {
    if (next?.id && next?.type) {
      setTarget(next);
    }
  }, []);

  const close = useCallback(() => setTarget(null), []);

  const value = useMemo(
    () => ({ openTransporterProfile }),
    [openTransporterProfile]
  );

  return (
    <TransporterProfileContext.Provider value={value}>
      {children}
      <TransporterProfileModal
        open={target != null}
        target={target}
        onClose={close}
        t={t}
      />
    </TransporterProfileContext.Provider>
  );
}

export function useTransporterProfile(): TransporterProfileContextValue {
  const ctx = useContext(TransporterProfileContext);
  if (!ctx) {
    throw new Error('useTransporterProfile must be used within TransporterProfileProvider');
  }
  return ctx;
}

/** Safe hook when provider may be absent (returns no-op). */
export function useTransporterProfileOptional(): TransporterProfileContextValue {
  const ctx = useContext(TransporterProfileContext);
  return ctx ?? { openTransporterProfile: () => {} };
}

interface TransporterNameLinkProps {
  id?: number | null;
  type?: TransporterType | string | null;
  name: string;
  className?: string;
  disabled?: boolean;
}

export function TransporterNameLink({
  id,
  type,
  name,
  className = 'tp-name-link',
  disabled = false,
}: TransporterNameLinkProps) {
  const { openTransporterProfile } = useTransporterProfileOptional();
  const canOpen =
    !disabled &&
    id != null &&
    id > 0 &&
    (type === 'carrier' || type === 'driver');

  if (!canOpen) {
    return <span className={className}>{name}</span>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={(e) => {
        e.stopPropagation();
        openTransporterProfile({ id, type: type as TransporterType, name });
      }}
    >
      {name}
    </button>
  );
}
