import type { IconType } from 'react-icons';
import { TbLayoutDashboard, TbServer } from 'react-icons/tb';

export const LIBRARY_ITEM_DETAIL_TAB_CONFIG: Record<
  'overview' | 'sites',
  { label: string; Icon: IconType }
> = {
  overview: { label: 'Overview', Icon: TbLayoutDashboard },
  sites: { label: 'Sites', Icon: TbServer },
};
