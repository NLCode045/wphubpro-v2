import type { IconType } from 'react-icons';
import { TbActivity, TbLayoutDashboard, TbNotes, TbPalette, TbPlug } from 'react-icons/tb';

export const SITE_DETAIL_TAB_CONFIG: Record<
  'overview' | 'plugins' | 'themes' | 'health' | 'logs',
  { label: string; Icon: IconType }
> = {
  overview: { label: 'Overview', Icon: TbLayoutDashboard },
  plugins: { label: 'Plugins', Icon: TbPlug },
  themes: { label: 'Themes', Icon: TbPalette },
  health: { label: 'Health', Icon: TbActivity },
  logs: { label: 'Logs', Icon: TbNotes },
};
