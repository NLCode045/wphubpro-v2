/**
 * Item family detail — two columns (main + blue gradient sidebar), members with source/version, potential matches.
 */
import React, { useMemo, useState, useEffect, useCallback } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import TextField from '@mui/material/TextField';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableRow from '@mui/material/TableRow';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import Icon from '@mui/material/Icon';
import Card from '@mui/material/Card';
import CircularProgress from '@mui/material/CircularProgress';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';

import SoftBox from 'components/SoftBox';
import SoftTypography from 'components/SoftTypography';
import SoftButton from 'components/SoftButton';
import ScrollableTableWrapper from 'components/ScrollableTableWrapper';
import DataTableHeadCell from 'examples/Tables/DataTable/DataTableHeadCell';
import DataTableBodyCell from 'examples/Tables/DataTable/DataTableBodyCell';
import Footer from 'examples/Footer';
import LibraryFamilyDetailSidebar from 'components/library/LibraryFamilyDetailSidebar';

import {
  libraryContentPaperSx,
  libraryDetailGridSx,
  libraryDetailMainColumnSx,
  libraryDetailSidebarColumnSx,
} from '../theme/libraryLayout';
import { contentPageShellFlexSx, contentPageShellSx, contentPaperPageDescriptionSx, contentPaperPageTitleSx } from '../theme/contentPaper';
import { ROUTE_PATHS } from '../config/routePaths';
import { usePageBreadcrumb } from '../contexts/PageBreadcrumbContext';
import { useLibraryItems } from '../hooks/useLibrary';
import {
  useDeleteLibraryFamily,
  useLibraryFamilyById,
  useUpdateLibraryFamily,
} from '../hooks/useLibraryFamiliesAndCollections';
import { getWpPluginInfo } from '../services/wordpress';
import { useQueries } from '@tanstack/react-query';
import { LibraryItemType } from '../types';
import {
  getLibraryItemSlug,
  libraryQueryForMemberSlug,
  listPotentialFamilyMembers,
  pruneFamilyMemberPreferences,
} from '../domains/library';
import {
  dedupeInstallOptionsByKey,
  defaultVersionKeyForFamilyMember,
  familyMemberSelectValue,
  getInstallOptionsForFamilyMemberSlug,
} from '../domains/library';
import { iconButtonOnLightSurfaceSx } from '../theme/detailPageStyles';

function decodeHtmlEntities(text: string): string {
  if (!text) return '';
  const el = document.createElement('div');
  el.innerHTML = text;
  return el.textContent || el.innerText || text;
}

const LibraryFamilyDetailPage: React.FC = () => {
  const { familyId = '' } = useParams<{ familyId: string }>();
  const navigate = useNavigate();
  const { setBreadcrumbTitle } = usePageBreadcrumb();
  const { family, isLoading: familyLoading } = useLibraryFamilyById(familyId);
  const { data: libraryItems = [] } = useLibraryItems();
  const updateFamily = useUpdateLibraryFamily();
  const deleteFamily = useDeleteLibraryFamily();

  const [nameDraft, setNameDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (family?.name) setNameDraft(family.name);
    else if (family && !family.name) setNameDraft('');
  }, [family?.$id, family?.name]);

  useEffect(() => {
    const t = family?.name?.trim() || 'Item family';
    setBreadcrumbTitle(t);
    return () => setBreadcrumbTitle(null);
  }, [family?.name, setBreadcrumbTitle]);

  const memberSet = useMemo(() => new Set((family?.memberSlugs ?? []).map((s) => s.toLowerCase())), [family?.memberSlugs]);

  const pluginMemberSlugs = useMemo(() => {
    if (!family) return [];
    const out: string[] = [];
    const seen = new Set<string>();
    for (const slug of family.memberSlugs) {
      const items = libraryItems.filter((i) => getLibraryItemSlug(i) === slug.toLowerCase());
      if (items[0]?.type !== LibraryItemType.Plugin) continue;
      if (seen.has(slug.toLowerCase())) continue;
      seen.add(slug.toLowerCase());
      out.push(slug);
    }
    return out;
  }, [family, libraryItems]);

  const wpQueries = useQueries({
    queries: pluginMemberSlugs.map((slug) => ({
      queryKey: ['wpPluginInfo', slug],
      queryFn: () => getWpPluginInfo(slug),
      staleTime: 1000 * 60 * 10,
    })),
  });

  const wpVersionBySlug = useMemo(() => {
    const m = new Map<string, string | undefined>();
    pluginMemberSlugs.forEach((slug, i) => {
      m.set(slug, wpQueries[i]?.data?.version);
    });
    return m;
  }, [pluginMemberSlugs, wpQueries]);

  const searchMatches = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    const out: { slug: string; label: string }[] = [];
    const seen = new Set<string>();
    for (const item of libraryItems) {
      const slug = getLibraryItemSlug(item);
      if (memberSet.has(slug)) continue;
      if (seen.has(slug)) continue;
      const name = decodeHtmlEntities(item.name || '').toLowerCase();
      if (!slug.includes(q) && !name.includes(q)) continue;
      seen.add(slug);
      out.push({ slug, label: `${decodeHtmlEntities(item.name)} (${slug})` });
    }
    out.sort((a, b) => a.label.localeCompare(b.label));
    return out.slice(0, 24);
  }, [libraryItems, searchQuery, memberSet]);

  const potentialRows = useMemo(() => {
    const n = family?.name ?? nameDraft;
    return listPotentialFamilyMembers(n, libraryItems, family?.memberSlugs ?? []);
  }, [family?.name, family?.memberSlugs, nameDraft, libraryItems]);

  const addSlug = useCallback(
    (slug: string) => {
      if (!family) return;
      const s = slug.trim().toLowerCase();
      if (!s || memberSet.has(s)) return;
      updateFamily.mutate({
        familyId: family.$id,
        memberSlugs: [...family.memberSlugs, s],
      });
      setSearchQuery('');
    },
    [family, memberSet, updateFamily],
  );

  const removeSlug = (slug: string) => {
    if (!family) return;
    const newSlugs = family.memberSlugs.filter((x) => x.toLowerCase() !== slug.toLowerCase());
    const pruned = pruneFamilyMemberPreferences(family.memberPreferences, newSlugs);
    updateFamily.mutate({
      familyId: family.$id,
      memberSlugs: newSlugs,
      memberPreferences: pruned,
    });
  };

  const saveName = () => {
    if (!family) return;
    const next = nameDraft.trim();
    if (!next || next === (family.name ?? '').trim()) return;
    updateFamily.mutate({ familyId: family.$id, name: next });
  };

  const saveVersionKey = (slug: string, versionKey: string) => {
    if (!family) return;
    const key = slug.trim().toLowerCase();
    const next = { ...(family.memberPreferences ?? {}), [key]: { versionKey } };
    updateFamily.mutate({ familyId: family.$id, memberPreferences: next });
  };

  const openMemberInLibrary = (slug: string) => {
    const q = libraryQueryForMemberSlug(slug, libraryItems);
    if (q) navigate(`${ROUTE_PATHS.LIBRARY}?${q}`);
    else navigate(`${ROUTE_PATHS.LIBRARY}?plugin=${encodeURIComponent(slug)}`);
  };

  const onSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (searchMatches.length === 0) return;
    addSlug(searchMatches[0].slug);
  };

  const handleDeleteFamily = () => {
    if (!family) return;
    if (window.confirm('Delete this family?')) {
      deleteFamily.mutate(family.$id, {
        onSuccess: () => navigate(ROUTE_PATHS.LIBRARY_FAMILIES),
      });
    }
  };

  const displayTitle = family?.name?.trim() || 'Untitled family';
  const nameDirty =
    !!family &&
    nameDraft.trim().length > 0 &&
    nameDraft.trim() !== (family.name ?? '').trim();

  if (familyLoading) {
    return (
      <SoftBox display="flex" justifyContent="center" alignItems="center" minHeight={240}>
        <CircularProgress size={36} />
      </SoftBox>
    );
  }

  if (!family) {
    return (
      <SoftBox sx={contentPageShellSx}>
        <SoftTypography color="secondary">Family not found.</SoftTypography>
        <SoftButton component={Link} to={ROUTE_PATHS.LIBRARY_FAMILIES} sx={{ mt: 2 }}>
          Back to families
        </SoftButton>
      </SoftBox>
    );
  }

  return (
    <>
      <SoftBox sx={contentPageShellFlexSx}>
        <SoftBox sx={{ flex: 1, minHeight: 0, overflow: 'hidden', ...libraryDetailGridSx }}>
          {/* Main column */}
          <SoftBox sx={libraryDetailMainColumnSx}>
            <SoftTypography sx={contentPaperPageTitleSx}>
              {displayTitle}
            </SoftTypography>
            <SoftTypography sx={{ ...contentPaperPageDescriptionSx, display: 'block', mt: 0.5, mb: 0 }}>
              Add members from your library (sidebar), then choose which source and version to use for each slug (stored
              with this family).
            </SoftTypography>

            <Card
              sx={{
                flex: 1,
                display: 'flex',
                flexDirection: 'column',
                minHeight: 0,
                p: 0,
                overflow: 'hidden',
                ...libraryContentPaperSx,
              }}
            >
              <SoftBox p={2} pb={1}>
                <SoftTypography variant="button" fontWeight="bold">
                  Members
                </SoftTypography>
                <SoftTypography variant="caption" color="secondary" display="block">
                  Choose source and version per slug (WordPress.org, upload, or remote when available).
                </SoftTypography>
              </SoftBox>
              {family.memberSlugs.length === 0 ? (
                <SoftBox p={3}>
                  <SoftTypography variant="caption" color="secondary">
                    No members yet. Use potential matches or search in the sidebar to add slugs.
                  </SoftTypography>
                </SoftBox>
              ) : (
                <ScrollableTableWrapper flexFill sx={{ flex: 1, minHeight: 0 }}>
                  <Table size="small">
                    <SoftBox component="thead">
                      <TableRow>
                        <DataTableHeadCell width="22%" pl={undefined} color="#4F5482">
                          Slug
                        </DataTableHeadCell>
                        <DataTableHeadCell width="58%" pl={undefined} color="#4F5482">
                          Source &amp; version
                        </DataTableHeadCell>
                        <DataTableHeadCell width="20%" align="right" pl={undefined} color="#4F5482">
                          Actions
                        </DataTableHeadCell>
                      </TableRow>
                    </SoftBox>
                    <TableBody>
                      {family.memberSlugs.map((slug) => {
                        const wpV = wpVersionBySlug.get(slug);
                        const rawOptions = getInstallOptionsForFamilyMemberSlug(slug, libraryItems, wpV);
                        const options = dedupeInstallOptionsByKey(rawOptions);
                        const resolved = defaultVersionKeyForFamilyMember(
                          slug,
                          libraryItems,
                          family.memberPreferences,
                          rawOptions,
                        );
                        const value = familyMemberSelectValue(options, resolved);
                        return (
                          <TableRow
                            key={slug}
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' } }}
                            onClick={() => openMemberInLibrary(slug)}
                          >
                            <DataTableBodyCell>
                              <SoftTypography variant="button" fontWeight="medium">
                                {slug}
                              </SoftTypography>
                            </DataTableBodyCell>
                            <DataTableBodyCell onClick={(e) => e.stopPropagation()}>
                              {options.length === 0 ? (
                                <SoftTypography variant="caption" color="secondary">
                                  Not in library — add this slug to your library first.
                                </SoftTypography>
                              ) : (
                                <Select
                                  size="small"
                                  fullWidth
                                  sx={{ minWidth: 200 }}
                                  value={value}
                                  onChange={(e) => saveVersionKey(slug, String(e.target.value))}
                                  disabled={updateFamily.isPending}
                                  inputProps={{ 'aria-label': `Version for ${slug}` }}
                                >
                                  {options.map((o) => (
                                    <MenuItem key={o.key} value={o.key}>
                                      {o.label}
                                    </MenuItem>
                                  ))}
                                </Select>
                              )}
                            </DataTableBodyCell>
                            <DataTableBodyCell align="right" onClick={(e) => e.stopPropagation()}>
                              <SoftBox display="inline-flex" gap={0.5}>
                                <Tooltip title="Open in library">
                                  <span>
                                    <IconButton
                                      size="small"
                                      onClick={() => openMemberInLibrary(slug)}
                                      sx={iconButtonOnLightSurfaceSx}
                                      aria-label={`Open ${slug} in library`}
                                    >
                                      <Icon sx={{ fontSize: 18 }}>open_in_new</Icon>
                                    </IconButton>
                                  </span>
                                </Tooltip>
                                <Tooltip title="Remove from family">
                                  <IconButton
                                    size="small"
                                    onClick={() => removeSlug(slug)}
                                    sx={iconButtonOnLightSurfaceSx}
                                    aria-label={`Remove ${slug}`}
                                  >
                                    <Icon sx={{ fontSize: 18 }}>link_off</Icon>
                                  </IconButton>
                                </Tooltip>
                              </SoftBox>
                            </DataTableBodyCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </ScrollableTableWrapper>
              )}
            </Card>
          </SoftBox>

          {/* Sidebar */}
          <SoftBox sx={libraryDetailSidebarColumnSx}>
            <LibraryFamilyDetailSidebar
              displayName={displayTitle}
              nameDraft={nameDraft}
              onNameDraftChange={setNameDraft}
              onSaveName={saveName}
              saveNameDisabled={!nameDirty || updateFamily.isPending}
              onDeleteFamily={handleDeleteFamily}
              deletePending={deleteFamily.isPending}
            />
            {potentialRows.length > 0 && (
              <Card
                sx={{
                  p: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  minHeight: 0,
                  overflow: 'hidden',
                  ...libraryContentPaperSx,
                }}
              >
                <SoftBox p={2} pb={1}>
                  <SoftTypography variant="button" fontWeight="bold">
                    Potential members
                  </SoftTypography>
                  <SoftTypography variant="caption" color="secondary" display="block" mt={0.5}>
                    Plugins and themes whose name or slug matches the family name.
                  </SoftTypography>
                </SoftBox>
                <ScrollableTableWrapper flexFill sx={{ maxHeight: { xs: 280, md: 320 } }}>
                  <Table size="small" stickyHeader>
                    <SoftBox component="thead">
                      <TableRow>
                        <DataTableHeadCell width="32%" pl={undefined} color="#4F5482">
                          Name
                        </DataTableHeadCell>
                        <DataTableHeadCell width="28%" pl={undefined} color="#4F5482">
                          Slug
                        </DataTableHeadCell>
                        <DataTableHeadCell width="30%" pl={undefined} color="#4F5482">
                          Match
                        </DataTableHeadCell>
                        <DataTableHeadCell width="10%" align="right" pl={undefined} color="#4F5482">
                          {' '}
                        </DataTableHeadCell>
                      </TableRow>
                    </SoftBox>
                    <TableBody>
                      {potentialRows.map((row) => (
                        <TableRow
                          key={row.slug}
                          hover
                          sx={{ cursor: 'pointer' }}
                          onClick={() => addSlug(row.slug)}
                        >
                          <DataTableBodyCell>
                            <SoftTypography variant="button" fontWeight="medium">
                              {decodeHtmlEntities(row.displayName)}
                            </SoftTypography>
                          </DataTableBodyCell>
                          <DataTableBodyCell>
                            <SoftTypography variant="caption" color="secondary">
                              {row.slug}
                            </SoftTypography>
                          </DataTableBodyCell>
                          <DataTableBodyCell>
                            <SoftTypography variant="caption" color="secondary">
                              {row.matchHint}
                            </SoftTypography>
                          </DataTableBodyCell>
                          <DataTableBodyCell align="right" onClick={(e) => e.stopPropagation()}>
                            <Tooltip title="Add to family">
                              <IconButton
                                size="small"
                                color="info"
                                onClick={() => addSlug(row.slug)}
                                aria-label={`Add ${row.slug}`}
                              >
                                <Icon sx={{ fontSize: 20 }}>add_circle</Icon>
                              </IconButton>
                            </Tooltip>
                          </DataTableBodyCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollableTableWrapper>
              </Card>
            )}
            <Card sx={{ p: 2, ...libraryContentPaperSx }}>
              <SoftTypography variant="button" fontWeight="bold" display="block" mb={0.5}>
                Search library
              </SoftTypography>
              <SoftTypography variant="caption" color="secondary" display="block" mb={1}>
                Filter by name or slug. Press Enter to add the first result.
              </SoftTypography>
              <TextField
                fullWidth
                size="small"
                placeholder="Search by name or slug…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={onSearchKeyDown}
              />
              {searchQuery.trim() && searchMatches.length > 0 && (
                <SoftBox mt={1} display="flex" flexDirection="column" gap={0.5}>
                  {searchMatches.slice(0, 8).map((m) => (
                    <SoftBox key={m.slug} display="flex" alignItems="center" gap={1}>
                      <Tooltip title={m.label}>
                        <IconButton size="small" color="info" onClick={() => addSlug(m.slug)} aria-label={`Add ${m.slug}`}>
                          <Icon sx={{ fontSize: 20 }}>add_circle</Icon>
                        </IconButton>
                      </Tooltip>
                      <SoftTypography variant="caption" color="text" sx={{ flex: 1, minWidth: 0 }} noWrap title={m.label}>
                        {m.label}
                      </SoftTypography>
                    </SoftBox>
                  ))}
                </SoftBox>
              )}
            </Card>
          </SoftBox>
        </SoftBox>
      </SoftBox>
      <Footer company={{ href: 'https://wphub.pro', name: 'WPHub.PRO' }} links={[]} />
    </>
  );
};

export default LibraryFamilyDetailPage;
