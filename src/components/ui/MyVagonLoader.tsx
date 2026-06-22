import React from 'react';
import Logo from '../../assets/logo/fullLogo.svg';

export type MyVagonLoaderTheme = 'light' | 'dark';

type ContentProps = {
  theme?: MyVagonLoaderTheme;
  compact?: boolean;
  className?: string;
};


/** Blade `preloader-content`: premium spinner + MYVAGON logo (loader_show parity). */
export const MyVagonLoaderContent: React.FC<ContentProps> = ({
  theme = 'dark',
  compact = false,
  className = '',
}) => {
  const isLight = theme === 'light';
  const rootClass = [
    'preloader-content',
    compact ? 'preloader-content--compact' : '',
    className,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClass}>
      <div
        className={[
          'premium-spinner',
          isLight ? 'premium-spinner--table' : '',
          !isLight && compact ? 'premium-spinner--boot' : '',
        ]
          .filter(Boolean)
          .join(' ')}
        aria-hidden="true"
      />
      <div className="preloader-logo">
        <img
          src={Logo}
          alt=""
          className={['preloader-logo-img', compact ? 'preloader-logo-img--compact' : '']
            .filter(Boolean)
            .join(' ')}
          aria-hidden="true"
        />
      </div>
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
    return <MyVagonLoaderContent theme="light" compact className={className} />;
  }
  if (mode === 'boot') {
    return <MyVagonLoaderContent theme="dark" compact className={className} />;
  }
  return <MyVagonLoaderContent theme="dark" className={className} />;
};

type BootScreenProps = {
  children?: React.ReactNode;
};

export const MyVagonBootScreen: React.FC<BootScreenProps> = ({ children }) => (
  <div className="mv-boot-screen" role="status" aria-live="polite" aria-busy="true" aria-label="Loading">
    {children ?? <MyVagonLoader mode="boot" />}
  </div>
);
