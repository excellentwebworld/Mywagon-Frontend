import type { ReactElement, ReactNode } from 'react';
import { LoadStatus as LoadStatusBase } from './mv-ui.jsx';

export type LoadStatusProps = {
  status: string;
  bids?: number;
  sub?: ReactNode;
  label?: string;
};

/** Typed wrapper around handoff LoadStatus primitive. */
export function LoadStatus(props: LoadStatusProps): ReactElement {
  const Comp = LoadStatusBase as unknown as (p: LoadStatusProps) => ReactElement;
  return <Comp {...props} />;
}
