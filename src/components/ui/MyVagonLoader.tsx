import React from 'react';
import LoaderGif from '../../assets/loader.gif';

export type MyVagonLoaderTheme = 'light' | 'dark';

type ContentProps = {
  theme?: MyVagonLoaderTheme;
  compact?: boolean;
  className?: string;
};


/** Blade `preloader-content`: animated truck loader (`loader.gif`). */
export const MyVagonLoaderContent: React.FC<ContentProps> = ({
  className = '',
}) => {
  const size = 500;

  return (
    <div
      className={['preloader-content', className].filter(Boolean).join(' ')}
      style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
    >
      <img
        src={LoaderGif}
        alt="Loading…"
        width={size}
        height={size}
        style={{ objectFit: 'cover', display: 'block' }}
        aria-label="Loading"
      />
    </div>
  );
};

export type MyVagonLoaderMode = 'global' | 'table' | 'boot';

type Props = {
  mode: MyVagonLoaderMode;
  className?: string;
};

export const MyVagonLoader: React.FC<Props> = ({ mode, className }) => {
  if (mode === 'table') {
    return <MyVagonLoaderContent className={className} />;
  }
  if (mode === 'boot') {
    return <MyVagonLoaderContent className={className} />;
  }
  return <MyVagonLoaderContent className={className} />;
};

type BootScreenProps = {
  children?: React.ReactNode;
};

export const MyVagonBootScreen: React.FC<BootScreenProps> = ({ children }) => (
  <div className="mv-boot-screen" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
    {children ?? <MyVagonLoader mode="boot" />}
  </div>
);
