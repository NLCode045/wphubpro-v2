import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { databases, functions, ID, DATABASE_ID, COLLECTIONS } from '@/services/appwrite';
import { searchWpPlugins, searchWpThemes } from '@/services/wordpress';
import type { LibraryItem } from '@/types';
import { useNotificationContext } from '@/context/useNotificationContext';
import { useAuth } from '@/domains/auth';
import {
  expandLibraryDocumentToItems,
  getOrBuildVersionsMap,
  mapLibraryDocumentToItem,
  mirrorLegacyFieldsFromVersions,
  normalizeWpSlug,
  parseCompositeLibraryItemId,
  serializeVersionsJson,
  setDefaultVersionInMap,
} from '@/domains/library';

const LIBRARY_COLLECTION = COLLECTIONS.LIBRARY;
const ZIP_PARSER_FUNCTION_ID = import.meta.env.VITE_APPWRITE_FUNCTION_ZIP_PARSER ?? 'zip-parser';
const LIBRARY_DELETE_FUNCTION_ID = import.meta.env.VITE_APPWRITE_FUNCTION_LIBRARY_DELETE ?? 'library-delete-version';

function docToFirstItem(doc: Record<string, unknown>): LibraryItem {
  return mapLibraryDocumentToItem(doc);
}

async function fetchLibraryDocByWpSlugAndType(
  userId: string,
  wpSlug: string,
  type: 'plugin' | 'theme',
): Promise<Record<string, unknown> | null> {
  const normalized = normalizeWpSlug(wpSlug);
  const res = await databases.listDocuments(DATABASE_ID, LIBRARY_COLLECTION, [
    Query.equal('user_id', userId),
    Query.equal('wpSlug', normalized),
    Query.equal('type', type),
  ]);
  return (res.documents[0] as Record<string, unknown>) ?? null;
}

async function fetchLibraryPluginByWpSlug(
  userId: string,
  wpSlug: string,
): Promise<Record<string, unknown> | null> {
  return fetchLibraryDocByWpSlugAndType(userId, wpSlug, 'plugin');
}

export const useLibraryItems = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['libraryItems', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      const response = await databases.listDocuments(DATABASE_ID, LIBRARY_COLLECTION, [
        Query.equal('user_id', user.$id),
      ]);
      return response.documents.flatMap((doc) =>
        expandLibraryDocumentToItems(doc as Record<string, unknown>),
      );
    },
    enabled: !!user,
  });
};

export const useSearchWpPlugins = (searchTerm: string, queryEnabled = true) => {
  return useQuery({
    queryKey: ['wpPluginsSearch', searchTerm],
    queryFn: () => searchWpPlugins(searchTerm),
    enabled: queryEnabled && !!searchTerm && searchTerm.length > 2,
    staleTime: 1000 * 60 * 10,
  });
};

export const useSearchWpThemes = (searchTerm: string, queryEnabled = true) => {
  return useQuery({
    queryKey: ['wpThemesSearch', searchTerm],
    queryFn: () => searchWpThemes(searchTerm),
    enabled: queryEnabled && !!searchTerm && searchTerm.length > 2,
    staleTime: 1000 * 60 * 10,
  });
};

export const useAddOfficialPlugin = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotificationContext();
  const { user } = useAuth();

  type AddOfficialVars = {
    name: string;
    slug: string;
    version: string;
    author: string;
    short_description?: string;
    prefillPluginSlug?: string;
    prefillPluginName?: string;
    __silent?: boolean;
  };

  return useMutation<LibraryItem, Error, AddOfficialVars>({
    mutationFn: async (plugin: AddOfficialVars) => {
      if (!user) throw new Error('User not authenticated.');
      const wpSlugRaw = plugin.prefillPluginSlug ?? plugin.slug;
      const wpSlug = normalizeWpSlug(wpSlugRaw);
      const name = plugin.prefillPluginName ?? plugin.name;
      const author = (plugin.author ?? '').replace(/<[^>]*>/g, '').trim();
      const description = (plugin.short_description ?? '')?.slice(0, 10000) || undefined;
      const version = plugin.version ?? 'latest';

      const existing = await fetchLibraryPluginByWpSlug(user.$id, wpSlug);

      if (existing) {
        let map = getOrBuildVersionsMap(existing);
        map[version] = { source: 'official', isDefault: true };
        map = setDefaultVersionInMap(map, version);
        const mirror = mirrorLegacyFieldsFromVersions(map);
        const response = await databases.updateDocument(
          DATABASE_ID,
          LIBRARY_COLLECTION,
          String(existing.$id),
          {
            versions_json: serializeVersionsJson(map),
            version: mirror.version,
            source: mirror.source,
            is_default: mirror.is_default,
            name,
            author: author || 'Unknown',
            ...(description ? { description } : {}),
            wpSlug,
          },
        );
        return docToFirstItem(response as Record<string, unknown>);
      }

      const versions = { [version]: { source: 'official' as const, isDefault: true } };
      const mirror = mirrorLegacyFieldsFromVersions(versions);
      const docData: Record<string, unknown> = {
        name,
        type: 'plugin',
        source: mirror.source,
        version: mirror.version,
        author: author || 'Unknown',
        user_id: user.$id,
        wpSlug,
        versions_json: serializeVersionsJson(versions),
        is_default: mirror.is_default,
        ...(description ? { description } : {}),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        LIBRARY_COLLECTION,
        ID.unique(),
        docData,
      );
      return docToFirstItem(response as Record<string, unknown>);
    },
    onSuccess: (data: LibraryItem, variables: AddOfficialVars) => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      if (!variables?.__silent) {
        showNotification({
          title: 'Plugin added',
          message: `${data.name} has been added to your library.`,
          variant: 'success',
        });
      }
    },
    onError: (error: Error) => {
      showNotification({
        title: 'Error',
        message: `Failed to add plugin: ${error.message}`,
        variant: 'danger',
      });
    },
  });
};

export const useAddOfficialTheme = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotificationContext();
  const { user } = useAuth();

  type AddOfficialThemeVars = {
    name: string;
    slug: string;
    version: string;
    author: string;
    short_description?: string;
    prefillThemeSlug?: string;
    prefillThemeName?: string;
    __silent?: boolean;
  };

  return useMutation<LibraryItem, Error, AddOfficialThemeVars>({
    mutationFn: async (theme: AddOfficialThemeVars) => {
      if (!user) throw new Error('User not authenticated.');
      const wpSlugRaw = theme.prefillThemeSlug ?? theme.slug;
      const wpSlug = normalizeWpSlug(wpSlugRaw);
      const name = theme.prefillThemeName ?? theme.name;
      const author = (theme.author ?? '').replace(/<[^>]*>/g, '').trim();
      const description = (theme.short_description ?? '')?.slice(0, 10000) || undefined;
      const version = theme.version ?? 'latest';

      const existing = await fetchLibraryDocByWpSlugAndType(user.$id, wpSlug, 'theme');

      if (existing) {
        let map = getOrBuildVersionsMap(existing);
        map[version] = { source: 'official', isDefault: true };
        map = setDefaultVersionInMap(map, version);
        const mirror = mirrorLegacyFieldsFromVersions(map);
        const response = await databases.updateDocument(
          DATABASE_ID,
          LIBRARY_COLLECTION,
          String(existing.$id),
          {
            versions_json: serializeVersionsJson(map),
            version: mirror.version,
            source: mirror.source,
            is_default: mirror.is_default,
            name,
            author: author || 'Unknown',
            ...(description ? { description } : {}),
            wpSlug,
          },
        );
        return docToFirstItem(response as Record<string, unknown>);
      }

      const versions = { [version]: { source: 'official' as const, isDefault: true } };
      const mirror = mirrorLegacyFieldsFromVersions(versions);
      const docData: Record<string, unknown> = {
        name,
        type: 'theme',
        source: mirror.source,
        version: mirror.version,
        author: author || 'Unknown',
        user_id: user.$id,
        wpSlug,
        versions_json: serializeVersionsJson(versions),
        is_default: mirror.is_default,
        ...(description ? { description } : {}),
      };

      const response = await databases.createDocument(
        DATABASE_ID,
        LIBRARY_COLLECTION,
        ID.unique(),
        docData,
      );
      return docToFirstItem(response as Record<string, unknown>);
    },
    onSuccess: (data: LibraryItem, variables: AddOfficialThemeVars) => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      if (!variables?.__silent) {
        showNotification({
          title: 'Theme added',
          message: `${data.name} has been added to your library.`,
          variant: 'success',
        });
      }
    },
    onError: (error: Error) => {
      showNotification({
        title: 'Error',
        message: `Failed to add theme: ${error.message}`,
        variant: 'danger',
      });
    },
  });
};

export const useAddRemotePlugin = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotificationContext();
  const { user } = useAuth();

  type RemoteVars = {
    name: string;
    wpSlug: string;
    version: string;
    remoteUrl: string;
    author?: string;
    description?: string;
  };

  return useMutation<LibraryItem, Error, RemoteVars>({
    mutationFn: async ({
      name,
      wpSlug,
      version,
      remoteUrl,
      author = '',
      description = '',
    }: RemoteVars) => {
      if (!user) throw new Error('User not authenticated.');
      const url = remoteUrl.trim();
      if (!url.startsWith('https://')) {
        throw new Error('Remote URL must use HTTPS.');
      }
      const slug = normalizeWpSlug(wpSlug);
      const ver = version.trim() || '1.0.0';
      const existing = await fetchLibraryPluginByWpSlug(user.$id, slug);

      if (existing) {
        let map = getOrBuildVersionsMap(existing);
        map[ver] = { source: 'remote', location: url, isDefault: true };
        map = setDefaultVersionInMap(map, ver);
        const mirror = mirrorLegacyFieldsFromVersions(map);
        const response = await databases.updateDocument(
          DATABASE_ID,
          LIBRARY_COLLECTION,
          String(existing.$id),
          {
            versions_json: serializeVersionsJson(map),
            version: mirror.version,
            source: mirror.source,
            is_default: mirror.is_default,
            name: name.trim() || slug,
            author: author.replace(/<[^>]*>/g, '').trim() || 'Unknown',
            description: description.trim() || undefined,
            wpSlug: slug,
            remoteUrl: url,
          },
        );
        return docToFirstItem(response as Record<string, unknown>);
      }

      const versions = {
        [ver]: { source: 'remote' as const, location: url, isDefault: true },
      };
      const mirror = mirrorLegacyFieldsFromVersions(versions);
      const response = await databases.createDocument(DATABASE_ID, LIBRARY_COLLECTION, ID.unique(), {
        name: name.trim() || slug,
        type: 'plugin',
        source: mirror.source,
        version: mirror.version,
        author: author.replace(/<[^>]*>/g, '').trim() || 'Unknown',
        description: description.trim() || undefined,
        wpSlug: slug,
        remoteUrl: url,
        user_id: user.$id,
        versions_json: serializeVersionsJson(versions),
        is_default: mirror.is_default,
      });
      return docToFirstItem(response as Record<string, unknown>);
    },
    onSuccess: (data: LibraryItem) => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      showNotification({
        title: 'Remote plugin added',
        message: `${data.name} has been added to your library.`,
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      showNotification({
        title: 'Error',
        message: `Failed to add: ${error.message}`,
        variant: 'danger',
      });
    },
  });
};

type UploadLocalVars = { file: File; type: 'plugin' | 'theme'; wpSlug?: string };

export const useUploadLocalItem = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotificationContext();
  const { user } = useAuth();

  return useMutation<{ success: boolean; message: string; item?: LibraryItem }, Error, UploadLocalVars>({
    mutationFn: async ({ file, type, wpSlug }: UploadLocalVars) => {
      if (!user) {
        throw new Error('User not authenticated.');
      }

      const readAsBase64 = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            resolve(reader.result as string);
          };
          reader.onerror = reject;
          reader.readAsDataURL(f);
        });

      const base64 = await readAsBase64(file);

      const execution = await functions.createExecution(
        ZIP_PARSER_FUNCTION_ID,
        JSON.stringify({
          type,
          fileBase64: base64,
          fileName: file.name,
          userId: user.$id,
          ...(wpSlug && { wpSlug }),
        }),
        false,
      );

      if (execution.responseStatusCode >= 400) {
        const errorBody = JSON.parse(execution.responseBody) as { message?: string };
        throw new Error(errorBody.message || 'Failed to process file.');
      }

      const parsed = JSON.parse(execution.responseBody) as {
        success?: boolean;
        message?: string;
        item?: Record<string, unknown>;
      };
      return {
        ...parsed,
        item: parsed?.item ? mapLibraryDocumentToItem(parsed.item) : undefined,
        success: !!parsed.success,
        message: String(parsed.message ?? ''),
      };
    },
    onSuccess: (data: { success: boolean; message: string; item?: LibraryItem }) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
        showNotification({
          title: 'Upload successful',
          message: `${data.item?.name ?? 'Item'} has been added to your library.`,
          variant: 'success',
        });
      } else {
        showNotification({
          title: 'Upload failed',
          message: data.message,
          variant: 'danger',
        });
      }
    },
    onError: (error: Error) => {
      showNotification({
        title: 'Upload failed',
        message: error.message,
        variant: 'danger',
      });
    },
  });
};

export type PatchLibraryItemInput = {
  itemId: string;
  version?: string;
  tags?: string[];
  name?: string;
  wpSlug?: string;
  isDefault?: boolean;
  categoryId?: string | null;
  isFavourite?: boolean;
};

export const usePatchLibraryItem = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotificationContext();
  const { user } = useAuth();

  return useMutation<LibraryItem, Error, PatchLibraryItemInput>({
    mutationFn: async ({
      itemId,
      version,
      tags,
      name,
      wpSlug,
      isDefault,
      categoryId,
      isFavourite,
    }: PatchLibraryItemInput) => {
      const composite = parseCompositeLibraryItemId(itemId);
      const targetDocId = composite?.libraryDocumentId ?? itemId;
      const patch: Record<string, unknown> = {};
      if (version !== undefined) patch.version = version;
      if (tags !== undefined) patch.tags = tags;
      if (name !== undefined) patch.name = name;
      if (wpSlug !== undefined) patch.wpSlug = wpSlug;
      if (isDefault !== undefined) patch.is_default = isDefault;
      if (categoryId !== undefined) {
        patch.category_id = categoryId === null || categoryId === '' ? null : categoryId;
      }
      if (isFavourite !== undefined) patch.is_favourite = isFavourite;
      if (Object.keys(patch).length === 0) {
        throw new Error('Nothing to update');
      }
      const response = await databases.updateDocument(
        DATABASE_ID,
        LIBRARY_COLLECTION,
        targetDocId,
        patch,
      );
      return docToFirstItem(response as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
    },
    onError: (error: Error) => {
      showNotification({
        title: 'Error',
        message: `Failed to save: ${error.message}`,
        variant: 'danger',
      });
    },
  });
};

export const useDeleteLibraryItem = () => {
  const queryClient = useQueryClient();
  const { showNotification } = useNotificationContext();
  const { user } = useAuth();

  return useMutation<void, Error, string>({
    mutationFn: async (itemId: string) => {
      const composite = parseCompositeLibraryItemId(itemId);
      if (composite) {
        const execution = await functions.createExecution(
          LIBRARY_DELETE_FUNCTION_ID,
          JSON.stringify({
            libraryDocumentId: composite.libraryDocumentId,
            versionKey: composite.versionKey,
          }),
          false,
        );
        if (execution.responseStatusCode >= 400) {
          const body = JSON.parse(execution.responseBody || '{}') as { message?: string };
          throw new Error(body.message || 'Delete failed');
        }
        return;
      }
      try {
        const execution = await functions.createExecution(
          LIBRARY_DELETE_FUNCTION_ID,
          JSON.stringify({ libraryItemId: itemId }),
          false,
        );
        if (execution.responseStatusCode >= 400) {
          const body = JSON.parse(execution.responseBody || '{}') as { message?: string };
          throw new Error(body.message || 'Delete failed');
        }
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
        const isFunctionNotFound =
          (msg.includes('function') && (msg.includes('not found') || msg.includes('could not be found'))) ||
          msg.includes('404');
        if (isFunctionNotFound) {
          await databases.deleteDocument(DATABASE_ID, LIBRARY_COLLECTION, itemId);
        } else {
          throw e;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      showNotification({
        title: 'Removed',
        message: 'Item has been removed from your library.',
        variant: 'success',
      });
    },
    onError: (error: Error) => {
      showNotification({
        title: 'Error',
        message: `Failed to remove: ${error.message}`,
        variant: 'danger',
      });
    },
  });
};
