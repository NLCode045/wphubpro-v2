import type { LibraryCategory, LibraryCategoryScope } from '@/types';

/** Option / group shape for UBold `react-select` (grouped single select). */
export type LibraryCategoryOption = { label: string; value: string };
export type LibraryCategorySelectGroup = { label: string; options: LibraryCategoryOption[] };

/** Deepest allowed category depth (root = 0). Prevents unbounded nesting. */
export const MAX_LIBRARY_CATEGORY_DEPTH = 8;

function categoryByIdMap(categories: LibraryCategory[]): Map<string, LibraryCategory> {
  return new Map(categories.map((c) => [c.$id, c]));
}

function compareLibraryCategoriesRootOrder(a: LibraryCategory, b: LibraryCategory): number {
  return (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name);
}

/** Top-level folders only (invalid or missing parent → treat as root). Legacy children are omitted from UI. */
export function topLevelLibraryCategories(categories: LibraryCategory[]): LibraryCategory[] {
  const validIds = new Set(categories.map((c) => c.$id));
  return categories.filter((c) => !c.parentId || !validIds.has(c.parentId));
}

/** Which categories appear in the folder grid / sidebar for the current items tab. */
export type LibraryCategoryItemsView =
  | 'all'
  | 'plugins'
  | 'themes'
  | 'local'
  | 'favourites'
  | 'families'
  | 'collections';

export function libraryCategoriesForItemsView(
  view: LibraryCategoryItemsView,
  categories: LibraryCategory[],
): LibraryCategory[] {
  const roots = [...topLevelLibraryCategories(categories)].sort(compareLibraryCategoriesRootOrder);
  if (view === 'families' || view === 'collections') return [];
  if (view === 'themes') {
    return roots.filter((c) => c.scope === 'general' || c.scope === 'theme');
  }
  if (view === 'plugins') {
    return roots.filter((c) => c.scope === 'general' || c.scope === 'plugin');
  }
  return roots;
}

/** Options for assigning a plugin vs theme row to a category. */
export function libraryCategoriesForItemKind(
  kind: 'plugin' | 'theme',
  categories: LibraryCategory[],
): LibraryCategory[] {
  const roots = [...topLevelLibraryCategories(categories)].sort(compareLibraryCategoriesRootOrder);
  if (kind === 'theme') {
    return roots.filter((c) => c.scope === 'general' || c.scope === 'theme');
  }
  return roots.filter((c) => c.scope === 'general' || c.scope === 'plugin');
}

/**
 * Same as {@link libraryCategoriesForItemKind}, but keeps the row’s current category visible in the
 * control even if its scope no longer matches (until the user picks another).
 */
export function libraryCategoriesForLibraryItemRow(
  row: { kind: 'plugin' | 'theme'; categoryId?: string | null },
  categories: LibraryCategory[],
): LibraryCategory[] {
  const base = libraryCategoriesForItemKind(row.kind, categories);
  const cid = row.categoryId?.trim();
  if (!cid) return base;
  if (base.some((c) => c.$id === cid)) return base;
  const cur = topLevelLibraryCategories(categories).find((c) => c.$id === cid);
  return cur ? [...base, cur] : base;
}

/** Selectable categories for multi-assign, including any current ids outside the default kind list. */
export function libraryCategoriesForLibraryItemRowMulti(
  row: { kind: 'plugin' | 'theme'; categoryIds?: string[] | null },
  categories: LibraryCategory[],
): LibraryCategory[] {
  const ids = (row.categoryIds ?? []).map((id) => id.trim()).filter(Boolean);
  const base = libraryCategoriesForLibraryItemRow({ kind: row.kind, categoryId: ids[0] ?? null }, categories);
  const inBase = new Set(base.map((c) => c.$id));
  const byId = categoryByIdMap(categories);
  const extra: LibraryCategory[] = [];
  for (const id of ids) {
    if (inBase.has(id)) continue;
    const c = byId.get(id);
    if (c) extra.push(c);
  }
  return [...base, ...extra];
}

/**
 * After reordering a filtered subset of roots, merge back into full root order for persisted `sort_order`.
 */
export function mergeVisibleOrderIntoRoots(
  allRootsSorted: LibraryCategory[],
  visibleReordered: LibraryCategory[],
): LibraryCategory[] {
  const visibleSet = new Set(visibleReordered.map((c) => c.$id));
  let vi = 0;
  return allRootsSorted.map((c) => (visibleSet.has(c.$id) ? visibleReordered[vi++]! : c));
}

export function sortedTopLevelLibraryCategories(categories: LibraryCategory[]): LibraryCategory[] {
  return [...topLevelLibraryCategories(categories)].sort(compareLibraryCategoriesRootOrder);
}

export function targetLibraryViewForCategoryScope(scope: LibraryCategoryScope): 'all' | 'plugins' | 'themes' {
  if (scope === 'theme') return 'themes';
  if (scope === 'plugin') return 'plugins';
  return 'all';
}

/** Depth from root: root = 0. Breaks on missing parent or cycles. */
export function categoryDepth(categories: LibraryCategory[], id: string): number {
  const byId = categoryByIdMap(categories);
  let d = 0;
  let cur: string | undefined = id;
  const seen = new Set<string>();
  while (cur) {
    if (seen.has(cur)) break;
    seen.add(cur);
    const c = byId.get(cur);
    if (!c?.parentId || !byId.has(c.parentId)) break;
    d++;
    cur = c.parentId;
  }
  return d;
}

/** Full path labels for table breadcrumbs and selects (`Parent › Child`). */
export function buildCategoryPathById(categories: LibraryCategory[]): Record<string, string> {
  const byId = categoryByIdMap(categories);
  const memo = new Map<string, string>();

  function path(id: string, visiting: Set<string>): string {
    if (memo.has(id)) return memo.get(id)!;
    if (visiting.has(id)) return byId.get(id)?.name ?? id;
    visiting.add(id);
    const c = byId.get(id);
    if (!c) return id;
    let label = c.name;
    if (c.parentId && byId.has(c.parentId)) {
      label = `${path(c.parentId, visiting)} › ${c.name}`;
    }
    memo.set(id, label);
    visiting.delete(id);
    return label;
  }

  const out: Record<string, string> = {};
  for (const c of categories) {
    out[c.$id] = path(c.$id, new Set());
  }
  return out;
}

/**
 * Per-category totals: direct item counts plus every descendant category’s items
 * (each library item is counted once, at its assigned category).
 */
export function rollupLibraryCategoryItemCounts(
  categories: LibraryCategory[],
  directByCategoryId: Record<string, number>,
): Record<string, number> {
  const validIds = new Set(categories.map((c) => c.$id));
  const childrenOf = new Map<string, LibraryCategory[]>();
  for (const c of categories) {
    const p = c.parentId && validIds.has(c.parentId) ? c.parentId : '__root__';
    if (!childrenOf.has(p)) childrenOf.set(p, []);
    childrenOf.get(p)!.push(c);
  }
  const memo = new Map<string, number>();
  function dfs(id: string): number {
    if (memo.has(id)) return memo.get(id)!;
    let n = directByCategoryId[id] ?? 0;
    for (const ch of childrenOf.get(id) ?? []) {
      n += dfs(ch.$id);
    }
    memo.set(id, n);
    return n;
  }
  const out: Record<string, number> = {};
  for (const c of categories) {
    out[c.$id] = dfs(c.$id);
  }
  return out;
}

/** Pre-order tree walk: roots first, then each subtree sorted by `sortOrder` then name. */
export function sortCategoriesHierarchical(categories: LibraryCategory[]): LibraryCategory[] {
  const validIds = new Set(categories.map((c) => c.$id));
  const byParent = new Map<string | null, LibraryCategory[]>();
  for (const c of categories) {
    const p = c.parentId && validIds.has(c.parentId) ? c.parentId : null;
    if (!byParent.has(p)) byParent.set(p, []);
    byParent.get(p)!.push(c);
  }
  for (const arr of byParent.values()) {
    arr.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
  }
  const out: LibraryCategory[] = [];
  function walk(parent: string | null) {
    for (const c of byParent.get(parent) ?? []) {
      out.push(c);
      walk(c.$id);
    }
  }
  walk(null);
  return out;
}

/** Direct children of `parentId` (`null` = roots), sorted by `sortOrder` then name. */
export function getCategoryChildrenSorted(
  categories: LibraryCategory[],
  parentId: string | null,
): LibraryCategory[] {
  const validIds = new Set(categories.map((c) => c.$id));
  return categories
    .filter((c) => {
      if (parentId == null) {
        return !c.parentId || !validIds.has(c.parentId);
      }
      return c.parentId === parentId;
    })
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name));
}

/** Parent key within the loaded category set (`null` = top-level). */
export function normalizedCategoryParentKey(
  categories: LibraryCategory[],
  c: LibraryCategory,
): string | null {
  const validIds = new Set(categories.map((x) => x.$id));
  if (!c.parentId || !validIds.has(c.parentId)) return null;
  return c.parentId;
}

/** True if both sit under the same parent bucket (including both roots). */
export function sameCategoryParentBucket(
  categories: LibraryCategory[],
  a: LibraryCategory,
  b: LibraryCategory,
): boolean {
  return normalizedCategoryParentKey(categories, a) === normalizedCategoryParentKey(categories, b);
}

/** Parents allowed when creating a new child (stay within `MAX_LIBRARY_CATEGORY_DEPTH`). */
export function canCreateChildUnder(categories: LibraryCategory[], parentId: string | null): boolean {
  if (parentId == null) return true;
  return categoryDepth(categories, parentId) < MAX_LIBRARY_CATEGORY_DEPTH;
}

/** True if `nodeId` is `rootId` or a descendant of `rootId` in the tree. */
export function isCategoryUnderRoot(categories: LibraryCategory[], rootId: string, nodeId: string): boolean {
  if (nodeId === rootId) return true;
  const byId = categoryByIdMap(categories);
  let cur: string | undefined = nodeId;
  const seen = new Set<string>();
  while (cur) {
    if (cur === rootId) return true;
    if (seen.has(cur)) break;
    seen.add(cur);
    const c = byId.get(cur);
    cur = c?.parentId ?? undefined;
  }
  return false;
}

/** Max distance from `rootId` down to a descendant (0 = leaf chain of only the root). */
export function subtreeHeightFrom(categories: LibraryCategory[], rootId: string): number {
  let max = 0;
  const walk = (id: string, depth: number) => {
    max = Math.max(max, depth);
    for (const c of categories) {
      if (c.parentId === id) walk(c.$id, depth + 1);
    }
  };
  walk(rootId, 0);
  return max;
}

/**
 * Whether `movingId` may be placed under `newParentId` (null = top level) without cycles
 * or exceeding `MAX_LIBRARY_CATEGORY_DEPTH` for any node in the moved subtree.
 */
export function canReparentCategory(
  categories: LibraryCategory[],
  movingId: string,
  newParentId: string | null,
): boolean {
  if (newParentId != null) {
    if (newParentId === movingId) return false;
    if (isCategoryUnderRoot(categories, movingId, newParentId)) return false;
  }
  const pDepth = newParentId == null ? -1 : categoryDepth(categories, newParentId);
  const h = subtreeHeightFrom(categories, movingId);
  return pDepth + 1 + h <= MAX_LIBRARY_CATEGORY_DEPTH;
}

/**
 * Builds grouped options for UBold-style react-select: one group for the “none” row, then one group
 * per top-level folder containing that folder and its descendants (in tree order).
 */
export function buildLibraryCategorySelectGroups(
  categories: LibraryCategory[],
  pathById: Record<string, string>,
  config?: {
    noneOption?: LibraryCategoryOption;
    /** Group heading for the none row (default `Category`). */
    noneGroupLabel?: string;
    /** Restrict options (e.g. valid parent folders only). */
    includeOnlyIds?: Set<string>;
  },
): LibraryCategorySelectGroup[] {
  const byId = categoryByIdMap(categories);
  const sortedAll = sortCategoriesHierarchical(categories);
  const orderIdx = new Map(sortedAll.map((c, i) => [c.$id, i]));

  const pool =
    config?.includeOnlyIds != null
      ? sortedAll.filter((c) => config.includeOnlyIds!.has(c.$id))
      : [...sortedAll];

  const poolIds = new Set(pool.map((c) => c.$id));

  const hasHierarchyInPool = pool.some((c) => c.parentId && poolIds.has(c.parentId));

  if (!hasHierarchyInPool) {
    if (pool.length === 0) {
      return config?.noneOption
        ? [
            {
              label: config.noneGroupLabel ?? 'Category',
              options: [config.noneOption],
            },
          ]
        : [];
    }
    const sortedPool = [...pool].sort(
      (a, b) => (orderIdx.get(a.$id) ?? 0) - (orderIdx.get(b.$id) ?? 0),
    );
    const resultFlat: LibraryCategorySelectGroup[] = [];
    if (config?.noneOption) {
      resultFlat.push({
        label: config.noneGroupLabel ?? 'Category',
        options: [config.noneOption],
      });
    }
    resultFlat.push({
      label: 'Categories',
      options: sortedPool.map((c) => ({
        value: c.$id,
        label: pathById[c.$id] ?? c.name,
      })),
    });
    return resultFlat;
  }

  function rootInPool(id: string): string {
    let cur = id;
    const seen = new Set<string>();
    while (true) {
      if (seen.has(cur)) return id;
      seen.add(cur);
      const c = byId.get(cur);
      if (!c?.parentId || !poolIds.has(c.parentId)) return cur;
      cur = c.parentId;
    }
  }

  const byRoot = new Map<string, LibraryCategory[]>();
  for (const c of pool) {
    const r = rootInPool(c.$id);
    if (!byRoot.has(r)) byRoot.set(r, []);
    byRoot.get(r)!.push(c);
  }
  for (const arr of byRoot.values()) {
    arr.sort((a, b) => (orderIdx.get(a.$id) ?? 0) - (orderIdx.get(b.$id) ?? 0));
  }

  const sortedRootIds = [...byRoot.keys()].sort(
    (a, b) => (orderIdx.get(a) ?? 0) - (orderIdx.get(b) ?? 0),
  );

  const result: LibraryCategorySelectGroup[] = [];
  if (config?.noneOption) {
    result.push({
      label: config.noneGroupLabel ?? 'Category',
      options: [config.noneOption],
    });
  }
  for (const rootId of sortedRootIds) {
    const list = byRoot.get(rootId);
    if (!list?.length) continue;
    const rootCat = byId.get(rootId);
    result.push({
      label: rootCat?.name ?? pathById[rootId] ?? rootId,
      options: list.map((c) => ({
        value: c.$id,
        label: pathById[c.$id] ?? c.name,
      })),
    });
  }
  return result;
}

export function findLibraryCategorySelectValue(
  groups: LibraryCategorySelectGroup[],
  categoryId: string | null | undefined,
): LibraryCategoryOption | null {
  const want = categoryId?.trim() ?? '';
  for (const g of groups) {
    const hit = g.options.find((o) => o.value === want);
    if (hit) return hit;
  }
  return null;
}
