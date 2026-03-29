import type { IconType } from 'react-icons';
import { TbBell, TbCreditCard, TbSettings, TbShieldLock } from 'react-icons/tb';

export const USER_PROFILE_TAB_CONFIG: Record<
  'subscription' | 'security' | 'account' | 'notifications',
  { label: string; Icon: IconType }
> = {
  subscription: { label: 'Subscription', Icon: TbCreditCard },
  security: { label: 'Security', Icon: TbShieldLock },
  account: { label: 'Account settings', Icon: TbSettings },
  notifications: { label: 'Notifications', Icon: TbBell },
};
