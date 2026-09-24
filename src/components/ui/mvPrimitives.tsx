import type { CSSProperties, ReactElement, ReactNode } from 'react';
import {
  Money as MoneyBase,
  Tag as TagBase,
  Toggle as ToggleBase,
  UsageMeter as UsageMeterBase,
  StatusBadge as RecordStatusBadgeBase,
  Button as ButtonBase,
  StopTag as StopTagBase,
} from './mv-ui.jsx';

export type MoneyProps = {
  value: number;
  overdue?: boolean;
  currency?: string;
  className?: string;
  style?: CSSProperties;
};

export function Money(props: MoneyProps): ReactElement {
  const Comp = MoneyBase as unknown as (p: MoneyProps) => ReactElement;
  return <Comp {...props} />;
}

export type TagVariant = 'outline' | 'brand' | 'blue' | 'navy';
export type TagProps = { children: ReactNode; variant?: TagVariant };

export function Tag(props: TagProps): ReactElement {
  const Comp = TagBase as unknown as (p: TagProps) => ReactElement;
  return <Comp {...props} />;
}

export type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  label?: ReactNode;
  disabled?: boolean;
};

export function Toggle(props: ToggleProps): ReactElement {
  const Comp = ToggleBase as unknown as (p: ToggleProps) => ReactElement;
  return <Comp {...props} />;
}

export type UsageMeterProps = {
  label: ReactNode;
  used: number;
  limit?: number | null;
};

export function UsageMeter(props: UsageMeterProps): ReactElement {
  const Comp = UsageMeterBase as unknown as (p: UsageMeterProps) => ReactElement;
  return <Comp {...props} />;
}

export type RecordStatusBadgeProps = {
  status: string;
  tone?: 'success' | 'warning' | 'danger' | 'info' | 'neutral' | 'accent';
};

export function RecordStatusBadge(props: RecordStatusBadgeProps): ReactElement {
  const Comp = RecordStatusBadgeBase as unknown as (p: RecordStatusBadgeProps) => ReactElement;
  return <Comp {...props} />;
}

export type MvButtonProps = {
  children?: ReactNode;
  variant?: 'gradient' | 'primary' | 'navy' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  disabled?: boolean;
  onClick?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  type?: 'button' | 'submit' | 'reset';
  className?: string;
  style?: React.CSSProperties;
  icon?: ReactNode;
};

export function MvButton(props: MvButtonProps): ReactElement {
  const Comp = ButtonBase as unknown as (p: MvButtonProps) => ReactElement;
  return <Comp {...props} />;
}

export type StopTagProps = { type: 'pickup' | 'dropoff' | string };

export function StopTag(props: StopTagProps): ReactElement {
  const Comp = StopTagBase as unknown as (p: StopTagProps) => ReactElement;
  return <Comp {...props} />;
}
