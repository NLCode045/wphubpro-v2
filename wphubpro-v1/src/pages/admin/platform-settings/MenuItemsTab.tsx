/**
 * Menu Items tab - enable/disable nav items, custom redirects, add custom items
 */
import React, { useState, useEffect } from 'react';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import SoftBox from 'components/SoftBox';
import SoftButton from 'components/SoftButton';
import SoftInput from 'components/SoftInput';
import SoftTypography from 'components/SoftTypography';
import Icon from '@mui/material/Icon';
import { userRoutes, adminRoutes } from '../../../config/sidenavRoutes';
import { usePlatformSettings, useUpdatePlatformSettings } from '../../../hooks/usePlatformSettings';
import { useToast } from '../../../contexts/ToastContext';
import { iconButtonOnLightSurfaceSx } from '../../../theme/detailPageStyles';

export interface MenuItemConfig {
  key: string;
  enabled: boolean;
  redirect?: string | null;
  name?: string;
  icon?: string;
  route?: string;
}

export interface CustomMenuItem {
  icon: string;
  title: string;
  link: string;
}

function flattenRoutes(routes: any[]): { key: string; name: string; icon: string; route: string }[] {
  const out: { key: string; name: string; icon: string; route: string }[] = [];
  for (const r of routes) {
    if (r.type === 'collapse' && r.key) {
      if (r.route) {
        out.push({ key: r.key, name: r.name, icon: r.icon || 'circle', route: r.route });
      }
      if (r.collapse && Array.isArray(r.collapse)) {
        for (const c of r.collapse) {
          if (c.key && c.route) out.push({ key: c.key, name: c.name, icon: r.icon || 'circle', route: c.route });
        }
      }
    }
  }
  return out;
}

const MenuItemsTab: React.FC = () => {
  const { toast } = useToast();
  const { data, isLoading } = usePlatformSettings('menu');
  const updateMutation = useUpdatePlatformSettings();

  const defaultUserItems = flattenRoutes(userRoutes);
  const defaultAdminItems = flattenRoutes(adminRoutes);

  const [userItems, setUserItems] = useState<Record<string, MenuItemConfig>>({});
  const [adminItems, setAdminItems] = useState<Record<string, MenuItemConfig>>({});
  const [customItems, setCustomItems] = useState<CustomMenuItem[]>([]);
  const [newCustom, setNewCustom] = useState({ icon: '', title: '', link: '' });

  useEffect(() => {
    const u: Record<string, MenuItemConfig> = {};
    for (const r of defaultUserItems) {
      u[r.key] = {
        key: r.key,
        name: r.name,
        icon: r.icon,
        route: r.route,
        enabled: data?.userItems?.[r.key]?.enabled ?? true,
        redirect: data?.userItems?.[r.key]?.redirect ?? null,
      };
    }
    setUserItems(u);

    const a: Record<string, MenuItemConfig> = {};
    for (const r of defaultAdminItems) {
      a[r.key] = {
        key: r.key,
        name: r.name,
        icon: r.icon,
        route: r.route,
        enabled: data?.adminItems?.[r.key]?.enabled ?? true,
        redirect: data?.adminItems?.[r.key]?.redirect ?? null,
      };
    }
    setAdminItems(a);
    setCustomItems(data?.customItems ?? []);
  }, [data]);

  // Sync when default routes change (e.g. first load)
  useEffect(() => {
    setUserItems((prev) => {
      const next = { ...prev };
      for (const r of defaultUserItems) {
        if (!(r.key in next)) {
          next[r.key] = {
            key: r.key,
            name: r.name,
            icon: r.icon,
            route: r.route,
            enabled: true,
            redirect: null,
          };
        } else {
          next[r.key] = { ...next[r.key], name: r.name, icon: r.icon, route: r.route };
        }
      }
      return next;
    });
    setAdminItems((prev) => {
      const next = { ...prev };
      for (const r of defaultAdminItems) {
        if (!(r.key in next)) {
          next[r.key] = {
            key: r.key,
            name: r.name,
            icon: r.icon,
            route: r.route,
            enabled: true,
            redirect: null,
          };
        } else {
          next[r.key] = { ...next[r.key], name: r.name, icon: r.icon, route: r.route };
        }
      }
      return next;
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      userItems: Object.fromEntries(Object.entries(userItems).map(([k, v]) => [k, { enabled: v.enabled, redirect: v.redirect || null }])),
      adminItems: Object.fromEntries(Object.entries(adminItems).map(([k, v]) => [k, { enabled: v.enabled, redirect: v.redirect || null }])),
      customItems,
    };
    try {
      await updateMutation.mutateAsync({ category: 'menu', settings: payload });
      toast({ title: 'Menu-instellingen opgeslagen', variant: 'success' });
    } catch (err) {
      toast({
        title: 'Error',
        description: err instanceof Error ? err.message : 'Could not save',
        variant: 'destructive',
      });
    }
  };

  const addCustomItem = () => {
    if (!newCustom.title.trim() || !newCustom.link.trim()) return;
    setCustomItems((prev) => [...prev, { ...newCustom, icon: newCustom.icon || 'link' }]);
    setNewCustom({ icon: '', title: '', link: '' });
  };

  const removeCustomItem = (i: number) => {
    setCustomItems((prev) => prev.filter((_, idx) => idx !== i));
  };

  if (isLoading) {
    return (
      <SoftBox display="flex" justifyContent="center" alignItems="center" py={6}>
        <CircularProgress size={32} />
      </SoftBox>
    );
  }

  const inputSx = { '& .MuiInputBase-root': { borderRadius: 1.5 } };
  const menuRowSx = {
    display: 'flex',
    alignItems: 'center',
    gap: 2,
    flexWrap: 'wrap',
    py: 1.5,
    px: 2,
    borderRadius: 1,
    '&:hover': { bgcolor: 'action.hover' },
  };

  return (
    <SoftBox sx={{ p: 3, borderRadius: 2, border: '1px solid', borderColor: 'divider' }}>
      <SoftBox component="form" onSubmit={handleSave} display="flex" flexDirection="column" gap={4}>
        <SoftBox>
          <SoftTypography variant="h6" fontWeight="bold" mb={0.5}>
            Navigation menu
          </SoftTypography>
          <SoftTypography variant="body2" color="secondary">
            Enable or disable menu items and set optional redirects.
          </SoftTypography>
        </SoftBox>

        <SoftBox>
          <SoftTypography variant="subtitle2" fontWeight="bold" mb={1.5} color="secondary">
            User menu
          </SoftTypography>
          <SoftBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {defaultUserItems.map((r) => (
              <SoftBox key={r.key} sx={menuRowSx}>
                <Switch
                  checked={userItems[r.key]?.enabled ?? true}
                  onChange={(e) => setUserItems((p) => ({ ...p, [r.key]: { ...p[r.key], enabled: e.target.checked } }))}
                  size="small"
                />
                <Icon sx={{ fontSize: 20, color: 'text.secondary' }}>{r.icon}</Icon>
                <SoftTypography variant="body2" sx={{ minWidth: 140 }}>{r.name}</SoftTypography>
                <SoftInput
                  size="small"
                  placeholder="Custom redirect (optional)"
                  value={userItems[r.key]?.redirect ?? ''}
                  onChange={(e) => setUserItems((p) => ({ ...p, [r.key]: { ...p[r.key], redirect: e.target.value || null } }))}
                  sx={{ flex: 1, minWidth: 220, ...inputSx }}
                />
              </SoftBox>
            ))}
          </SoftBox>
        </SoftBox>

        <Divider />

        <SoftBox>
          <SoftTypography variant="subtitle2" fontWeight="bold" mb={1.5} color="secondary">
            Adminmenu
          </SoftTypography>
          <SoftBox sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {defaultAdminItems.map((r) => (
              <SoftBox key={r.key} sx={menuRowSx}>
                <Switch
                  checked={adminItems[r.key]?.enabled ?? true}
                  onChange={(e) => setAdminItems((p) => ({ ...p, [r.key]: { ...p[r.key], enabled: e.target.checked } }))}
                  size="small"
                />
                <Icon sx={{ fontSize: 20, color: 'text.secondary' }}>{r.icon}</Icon>
                <SoftTypography variant="body2" sx={{ minWidth: 140 }}>{r.name}</SoftTypography>
                <SoftInput
                  size="small"
                  placeholder="Custom redirect (optional)"
                  value={adminItems[r.key]?.redirect ?? ''}
                  onChange={(e) => setAdminItems((p) => ({ ...p, [r.key]: { ...p[r.key], redirect: e.target.value || null } }))}
                  sx={{ flex: 1, minWidth: 220, ...inputSx }}
                />
              </SoftBox>
            ))}
          </SoftBox>
        </SoftBox>

        <Divider />

        <SoftBox>
          <SoftTypography variant="subtitle2" fontWeight="bold" mb={1.5} color="secondary">
            Custom menu items
          </SoftTypography>
          <SoftBox display="flex" gap={2} flexWrap="wrap" alignItems="flex-end" mb={2}>
            <SoftInput
              size="small"
              placeholder="link"
              value={newCustom.icon}
              onChange={(e) => setNewCustom((p) => ({ ...p, icon: e.target.value }))}
              sx={{ width: 140, ...inputSx }}
            />
            <SoftInput
              size="small"
              placeholder="Menu-item"
              value={newCustom.title}
              onChange={(e) => setNewCustom((p) => ({ ...p, title: e.target.value }))}
              sx={{ width: 160, ...inputSx }}
            />
            <SoftInput
              size="small"
              placeholder="/#/account"
              value={newCustom.link}
              onChange={(e) => setNewCustom((p) => ({ ...p, link: e.target.value }))}
              sx={{ width: 200, ...inputSx }}
            />
            <SoftButton variant="outlined" color="primary" size="small" onClick={addCustomItem}>
              Add
            </SoftButton>
          </SoftBox>
          {customItems.length > 0 && (
            <SoftBox sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {customItems.map((item, i) => (
                <SoftBox
                  key={i}
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 2,
                    py: 1,
                    px: 2,
                    borderRadius: 1,
                    bgcolor: 'action.hover',
                  }}
                >
                  <Icon sx={{ fontSize: 20, color: 'text.secondary' }}>{item.icon || 'link'}</Icon>
                  <SoftTypography variant="body2" fontWeight="medium">{item.title}</SoftTypography>
                  <SoftTypography variant="caption" color="secondary">{item.link}</SoftTypography>
                  <SoftBox sx={{ flex: 1 }} />
                  <IconButton size="small" onClick={() => removeCustomItem(i)} aria-label="Remove" sx={iconButtonOnLightSurfaceSx}>
                    <Icon fontSize="small">delete</Icon>
                  </IconButton>
                </SoftBox>
              ))}
            </SoftBox>
          )}
        </SoftBox>

        <SoftBox pt={1}>
          <SoftButton type="submit" variant="contained" color="primary" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'Saving...' : 'Save menu'}
          </SoftButton>
        </SoftBox>
      </SoftBox>
    </SoftBox>
  );
};

export default MenuItemsTab;
