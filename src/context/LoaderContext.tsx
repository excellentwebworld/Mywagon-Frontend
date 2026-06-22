import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';

type LoaderContextValue = {
  visible: boolean;
  showLoader: () => void;
  hideLoader: () => void;
  setLoader: (active: boolean) => void;
};

const LoaderContext = createContext<LoaderContextValue | null>(null);

export const LoaderProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const countRef = useRef(0);
  const [visible, setVisible] = useState(false);

  const syncVisible = useCallback(() => {
    setVisible(countRef.current > 0);
  }, []);

  const showLoader = useCallback(() => {
    countRef.current += 1;
    syncVisible();
  }, [syncVisible]);

  const hideLoader = useCallback(() => {
    countRef.current = Math.max(0, countRef.current - 1);
    syncVisible();
  }, [syncVisible]);

  const setLoader = useCallback(
    (active: boolean) => {
      if (active) showLoader();
      else hideLoader();
    },
    [hideLoader, showLoader]
  );

  const value = useMemo(
    () => ({ visible, showLoader, hideLoader, setLoader }),
    [visible, showLoader, hideLoader, setLoader]
  );

  return <LoaderContext.Provider value={value}>{children}</LoaderContext.Provider>;
};

export function useLoader(): LoaderContextValue {
  const ctx = useContext(LoaderContext);
  if (!ctx) {
    throw new Error('useLoader must be used within LoaderProvider');
  }
  return ctx;
}
