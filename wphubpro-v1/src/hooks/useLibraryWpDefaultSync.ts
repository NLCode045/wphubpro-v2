import { useEffect, useMemo, useRef } from 'react';
import { useQueries } from '@tanstack/react-query';

import { getWpPluginInfo, type WpPluginInfo } from '../services/wordpress';
import { LibraryItem, LibraryItemSource } from '../types';
import {
  findOfficialItemsForPluginGroup,
  pluginDefaultIsBehindWpOrg,
  pluginGroupSlugsWithOfficial,
} from '../domains/library';
import { useAddOfficialPlugin, useSetLibraryPluginDefaultItem } from './useLibrary';

function resolveOfficialRowVersion(item: LibraryItem, wpLatest: string): string {
  if (item.source !== LibraryItemSource.Official) return item.version;
  return item.version === 'latest' ? wpLatest : item.version;
}

/**
 * Keeps the library default for WordPress.org plugins on the latest stable:
 * if a pin for that version exists, marks it `is_default`; otherwise creates a new official pin
 * and sets it as default (older pins stay in the library).
 */
export function useLibraryWpDefaultSync(
  pluginGroups: { slug: string; displayName: string; items: LibraryItem[] }[],
) {
  const addOfficial = useAddOfficialPlugin();
  const setDefault = useSetLibraryPluginDefaultItem();
  const inFlight = useRef<Set<string>>(new Set());

  const slugsWithOfficial = useMemo(() => pluginGroupSlugsWithOfficial(pluginGroups), [pluginGroups]);

  const wpQueries = useQueries({
    queries: slugsWithOfficial.map((slug) => ({
      queryKey: ['wpPluginInfo', slug],
      queryFn: () => getWpPluginInfo(slug),
      staleTime: 1000 * 60 * 10,
    })),
  });

  const wpBySlug = useMemo(() => {
    const m = new Map<string, WpPluginInfo | null>();
    slugsWithOfficial.forEach((slug, i) => {
      m.set(slug.toLowerCase(), wpQueries[i]?.data ?? null);
    });
    return m;
  }, [slugsWithOfficial, wpQueries]);

  const wpFingerprint = wpQueries.map((q) => `${q.dataUpdatedAt}:${q.data?.version ?? ''}`).join('|');

  const wpLoading = wpQueries.some((q) => q.isLoading);

  useEffect(() => {
    if (!pluginGroups.length) return;

    const run = async () => {
      for (const group of pluginGroups) {
        const officialItems = findOfficialItemsForPluginGroup(group.items);
        if (officialItems.length === 0) continue;

        const explicitDefault = group.items.find((i) => i.isDefault === true);
        if (explicitDefault && explicitDefault.source !== LibraryItemSource.Official) continue;

        const wp = wpBySlug.get(group.slug.toLowerCase()) ?? null;
        const wpLatest = (wp?.version ?? '').trim();
        if (!wpLatest) continue;

        if (!pluginDefaultIsBehindWpOrg(group.items, wp)) continue;

        const slugKey = group.slug.toLowerCase();
        if (inFlight.current.has(slugKey)) continue;
        inFlight.current.add(slugKey);

        try {
          const match = officialItems.find((i) => resolveOfficialRowVersion(i, wpLatest) === wpLatest);
          const allIds = group.items.map((i) => i.$id);

          if (match) {
            await setDefault.mutateAsync({ defaultItemId: match.$id, itemIds: allIds });
          } else {
            const newItem = await addOfficial.mutateAsync({
              slug: group.slug,
              name: wp?.name ?? group.displayName,
              version: wpLatest,
              author: (wp?.author ?? '').replace(/<[^>]*>/g, '').trim() || 'Unknown',
              short_description: typeof wp?.description === 'string' ? wp.description.slice(0, 10000) : '',
              __silent: true,
            });
            await setDefault.mutateAsync({
              defaultItemId: newItem.$id,
              itemIds: [...allIds, newItem.$id],
            });
          }
        } catch {
          /* errors toasts from mutations */
        } finally {
          inFlight.current.delete(slugKey);
        }
      }
    };

    void run();
  }, [pluginGroups, wpBySlug, wpFingerprint, addOfficial, setDefault]);

  return { wpBySlug, wpLoading };
}
