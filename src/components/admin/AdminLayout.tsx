import { ROUTE_PATHS } from '@/config/routePaths';
import { NavLink } from 'react-router';

const linkClass = ({ isActive }: { isActive: boolean }) =>
  `d-block rounded px-3 py-2 text-decoration-none small ${isActive ? 'bg-primary text-white fw-semibold' : 'text-body hover-bg-light'}`;

/**
 * Vertical navigation for Stripe admin / finance section (assumes admin-only route guard).
 */
export function AdminStripeSidebar() {
  return (
    <nav className="d-flex flex-column gap-1" aria-label="Finance admin">
      <NavLink to={ROUTE_PATHS.ADMIN_FINANCE_DASHBOARD} className={linkClass} end>
        Dashboard
      </NavLink>
      <NavLink to={ROUTE_PATHS.ADMIN_FINANCE_SUBSCRIPTIONS} className={linkClass}>
        Subscriptions
      </NavLink>
      <NavLink to={ROUTE_PATHS.ADMIN_FINANCE_PLANS} className={linkClass}>
        Plans
      </NavLink>
      <NavLink to={ROUTE_PATHS.ADMIN_FINANCE_BILLING} className={linkClass}>
        Billing
      </NavLink>
      <NavLink to={ROUTE_PATHS.ADMIN_FINANCE_PAYMENTS} className={linkClass}>
        Payment intents
      </NavLink>
    </nav>
  );
}
