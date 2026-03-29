import type { ReactNode } from 'react';
import type { IconType } from 'react-icons';

export function TabNavLabel({ Icon, children }: { Icon: IconType; children: ReactNode }) {
  return (
    <span className="d-inline-flex align-items-center gap-1">
      <Icon className="fs-lg flex-shrink-0" aria-hidden />
      <span>{children}</span>
    </span>
  );
}
