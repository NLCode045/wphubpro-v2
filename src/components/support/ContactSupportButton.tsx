import { ROUTE_PATHS } from '@/config/routePaths';
import type { SupportTicketCreateLocationState } from '@/config/supportTicketNavigation';
import type { SupportTicketCategory, SupportTicketContext } from '@/types';
import { type ButtonProps } from 'react-bootstrap';
import Button from 'react-bootstrap/Button';
import { useLocation, useNavigate } from 'react-router';
import { TbLifebuoy } from 'react-icons/tb';

type Props = {
  category: SupportTicketCategory;
  /** Extra context merged into the ticket (e.g. site id, subscription id). */
  context?: Partial<SupportTicketContext>;
  label?: string;
  variant?: ButtonProps['variant'];
  size?: ButtonProps['size'];
  className?: string;
};

/**
 * Opens the support ticket form with category and page context prefilled.
 */
export function ContactSupportButton({
  category,
  context = {},
  label = 'Contact support',
  variant = 'outline-secondary',
  size = 'sm',
  className,
}: Props) {
  const navigate = useNavigate();
  const loc = useLocation();

  const open = () => {
    const merged: SupportTicketCreateLocationState = {
      category,
      context: {
        sourcePath: `${loc.pathname}${loc.search}`,
        ...context,
      },
    };
    navigate(ROUTE_PATHS.SUPPORT_NEW, { state: merged });
  };

  return (
    <Button type="button" variant={variant} size={size} className={className} onClick={open}>
      <TbLifebuoy className="me-1" />
      {label}
    </Button>
  );
}
