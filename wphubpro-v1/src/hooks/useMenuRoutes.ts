/**
 * Merges platform_settings menu config with default sidenav routes.
 * Applies enable/disable, custom redirects, and custom items.
 */
import { useMemo } from 'react';
import { usePlatformSettings } from './usePlatformSettings';
import { userRoutes, adminRoutes } from '../config/sidenavRoutes';

export function useMenuRoutes(isAdmin: boolean) {
  const { data: menuConfig } = usePlatformSettings('menu');

  return useMemo(() => {
    const applyConfig = (routes: any[], configKey: 'userItems' | 'adminItems') => {
      const overrides = menuConfig?.[configKey] || {};
      return routes
        .map((r) => {
          const override = overrides[r.key];
          if (override?.enabled === false) return null;
          const route = override?.redirect || r.route;
          if (r.collapse) {
            const filteredCollapse = r.collapse
              .map((c: any) => {
                const co = overrides[c.key];
                if (co?.enabled === false) return null;
                return { ...c, route: co?.redirect || c.route };
              })
              .filter(Boolean);
            return { ...r, route, collapse: filteredCollapse };
          }
          return { ...r, route };
        })
        .filter(Boolean);
    };

    let user = applyConfig(userRoutes, 'userItems');
    let admin = isAdmin ? applyConfig(adminRoutes, 'adminItems') : [];

    const customItems = menuConfig?.customItems || [];
    if (customItems.length > 0) {
      const customRoutes = customItems.map((item: { icon: string; title: string; link: string }) => ({
        type: 'collapse',
        name: item.title,
        key: `custom-${item.link}`,
        icon: item.icon || 'link',
        route: item.link.startsWith('/') ? item.link : `/${item.link}`,
        noCollapse: true,
        href: item.link.startsWith('http') ? item.link : undefined,
      }));
      user = [...user, ...customRoutes];
    }

    return { userRoutes: user, adminRoutes: admin };
  }, [menuConfig, isAdmin]);
}
