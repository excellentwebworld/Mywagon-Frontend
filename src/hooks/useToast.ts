/**
 * Adapter matching MV_Web_Panel useToast API for ported Settings sections.
 */
import { useMemo } from 'react';
import { useApp } from '../context/AppContext';

type ToastFn = (message: string) => void;

export function useToast() {
  const { showToast } = useApp();

  const toast = useMemo(
    () => ({
      success: ((message: string) => showToast(message, 'success')) as ToastFn,
      error: ((message: string) => showToast(message, 'error')) as ToastFn,
      info: ((message: string) => showToast(message, 'info')) as ToastFn,
      warning: ((message: string) => showToast(message, 'warning')) as ToastFn,
    }),
    [showToast],
  );

  return { toast };
}
