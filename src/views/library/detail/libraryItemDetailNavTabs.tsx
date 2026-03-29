import type { IconType } from 'react-icons';
import { TbLayoutDashboard, TbLayersSubtract, TbServer } from 'react-icons/tb';

export const LIBRARY_ITEM_DETAIL_TAB_CONFIG: Record<
  'overview' | 'versions' | 'sites',
  { label: string; Icon: IconType }
> = {
  overview: { label: 'Overview', Icon: TbLayoutDashboard },
  versions: { label: 'Versions', Icon: TbLayersSubtract },
  sites: { label: 'Sites', Icon: TbServer },
};
