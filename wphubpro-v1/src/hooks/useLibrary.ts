import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, functions, ID } from '../services/appwrite';
import { Query } from 'appwrite';
import { searchWpPlugins } from '../services/wordpress';
import { LibraryItem, LibraryItemSource, LibraryItemType, LibraryVersionEntry } from '../types';
import { useToast } from '../contexts/ToastContext';
import { useAuth } from '../domains/auth';
import {
  expandLibraryDocumentToItems,
  getOrBuildVersionsMap,
  mapLibraryDocumentToItem,
  mirrorLegacyFieldsFromVersions,
  normalizeWpSlug,
  parseCompositeLibraryItemId,
  serializeVersionsJson,
  setDefaultVersionInMap,
} from '../domains/library';

const DATABASE_ID = 'platform_db';
const LIBRARY_COLLECTION_ID = 'library';
const ZIP_PARSER_FUNCTION_ID = 'zip-parser';

function docToFirstItem(doc: Record<string, unknown>): LibraryItem {
  return mapLibraryDocumentToItem(doc as any);
}

async function fetchLibraryPluginByWpSlug(
  userId: string,
  wpSlug: string,
): Promise<Record<string, unknown> | null> {
  const normalized = normalizeWpSlug(wpSlug);
  const res = await databases.listDocuments(DATABASE_ID, LIBRARY_COLLECTION_ID, [
    Query.equal('user_id', userId),
    Query.equal('wpSlug', normalized),
    Query.equal('type', LibraryItemType.Plugin),
  ]);
  return (res.documents[0] as Record<string, unknown>) ?? null;
}

export const useLibraryItems = () => {
  const { user } = useAuth();
  return useQuery<LibraryItem[], Error>({
    queryKey: ['libraryItems', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      const response = await databases.listDocuments(
        DATABASE_ID,
        LIBRARY_COLLECTION_ID,
        [Query.equal('user_id', user.$id)],
      );
      return response.documents.flatMap((doc) => expandLibraryDocumentToItems(doc as any));
    },
    enabled: !!user,
  });
};

export const useSearchWpPlugins = (searchTerm: string) => {
  return useQuery({
    queryKey: ['wpPluginsSearch', searchTerm],
    queryFn: () => searchWpPlugins(searchTerm),
    enabled: !!searchTerm && searchTerm.length > 2,
    staleTime: 1000 * 60 * 10,
  });
};

export const useAddOfficialPlugin = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<LibraryItem, Error, any>({
    mutationFn: async (plugin) => {
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
        map[version] = { source: LibraryItemSource.Official, isDefault: true };
        map = setDefaultVersionInMap(map, version);
        const mirror = mirrorLegacyFieldsFromVersions(map);
        const response = await databases.updateDocument(
          DATABASE_ID,
          LIBRARY_COLLECTION_ID,
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
        return docToFirstItem(response as any);
      }

      const versions = { [version]: { source: LibraryItemSource.Official, isDefault: true } };
      const mirror = mirrorLegacyFieldsFromVersions(versions);
      const docData: Record<string, unknown> = {
        name,
        type: LibraryItemType.Plugin,
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
        LIBRARY_COLLECTION_ID,
        ID.unique(),
        docData,
      );
      return docToFirstItem(response as any);
    },
    onSuccess: (data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['usage', user?.$id] });
      if (!variables?.__silent) {
        toast({
          title: 'Plugin Added',
          description: `${data.name} has been successfully added to your library.`,
          variant: 'success',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add plugin: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useSetLibraryPluginDefaultItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<void, Error, { defaultItemId: string; itemIds: string[] }>({
    mutationFn: async ({ defaultItemId, itemIds }) => {
      if (!itemIds.length) return;
      const composite = parseCompositeLibraryItemId(defaultItemId);
      if (composite) {
        const doc = await databases.getDocument(
          DATABASE_ID,
          LIBRARY_COLLECTION_ID,
          composite.libraryDocumentId,
        );
        const map = getOrBuildVersionsMap(doc as any);
        const next = setDefaultVersionInMap(map, composite.versionKey);
        const mirror = mirrorLegacyFieldsFromVersions(next);
        await databases.updateDocument(
          DATABASE_ID,
          LIBRARY_COLLECTION_ID,
          composite.libraryDocumentId,
          {
            versions_json: serializeVersionsJson(next),
            version: mirror.version,
            source: mirror.source,
            is_default: mirror.is_default,
          },
        );
        return;
      }
      for (const id of itemIds) {
        await databases.updateDocument(DATABASE_ID, LIBRARY_COLLECTION_ID, id, {
          is_default: id === defaultItemId,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to set default: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useAddRemotePlugin = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<
    LibraryItem,
    Error,
    { name: string; wpSlug: string; version: string; remoteUrl: string; author?: string; description?: string }
  >({
    mutationFn: async ({ name, wpSlug, version, remoteUrl, author = '', description = '' }) => {
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
        map[ver] = { source: LibraryItemSource.Remote, location: url, isDefault: true };
        map = setDefaultVersionInMap(map, ver);
        const mirror = mirrorLegacyFieldsFromVersions(map);
        const response = await databases.updateDocument(
          DATABASE_ID,
          LIBRARY_COLLECTION_ID,
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
        return docToFirstItem(response as any);
      }

      const versions = {
        [ver]: { source: LibraryItemSource.Remote, location: url, isDefault: true },
      };
      const mirror = mirrorLegacyFieldsFromVersions(versions);
      const response = await databases.createDocument(DATABASE_ID, LIBRARY_COLLECTION_ID, ID.unique(), {
        name: name.trim() || slug,
        type: LibraryItemType.Plugin,
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
      return docToFirstItem(response as any);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['usage', user?.$id] });
      toast({
        title: 'Remote plugin added',
        description: `${data.name} has been added to your library.`,
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to add: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useUploadLocalItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<{ success: boolean; message: string; item?: LibraryItem }, Error, { file: File; type: LibraryItemType; wpSlug?: string }>({
    mutationFn: async ({ file, type, wpSlug }) => {
      if (!user) {
        throw new Error('User not authenticated.');
      }

      const readAsBase64 = (f: File) =>
        new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result);
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
        const errorBody = JSON.parse(execution.responseBody);
        throw new Error(errorBody.message || 'Failed to process file.');
      }

      const parsed = JSON.parse(execution.responseBody);
      return {
        ...parsed,
        item: parsed?.item ? mapLibraryDocumentToItem(parsed.item) : undefined,
      };
    },
    onSuccess: (data) => {
      if (data.success) {
        queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
        queryClient.invalidateQueries({ queryKey: ['usage', user?.$id] });
        toast({
          title: 'Upload Successful',
          description: `${data.item?.name} has been added to your library.`,
          variant: 'success',
        });
      } else {
        toast({
          title: 'Upload Processing Failed',
          description: data.message,
          variant: 'destructive',
        });
      }
    },
    onError: (error) => {
      toast({
        title: 'Upload Failed',
        description: error.message,
        variant: 'destructive',
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
};

export const usePatchLibraryItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<LibraryItem, Error, PatchLibraryItemInput>({
    mutationFn: async ({ itemId, version, tags, name, wpSlug, isDefault }) => {
      const composite = parseCompositeLibraryItemId(itemId);
      const targetDocId = composite?.libraryDocumentId ?? itemId;
      const patch: Record<string, unknown> = {};
      if (version !== undefined) patch.version = version;
      if (tags !== undefined) patch.tags = tags;
      if (name !== undefined) patch.name = name;
      if (wpSlug !== undefined) patch.wpSlug = wpSlug;
      if (isDefault !== undefined) patch.is_default = isDefault;
      if (Object.keys(patch).length === 0) {
        throw new Error('Nothing to update');
      }
      const response = await databases.updateDocument(
        DATABASE_ID,
        LIBRARY_COLLECTION_ID,
        targetDocId,
        patch,
      );
      return docToFirstItem(response as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to save: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useUpdateLibraryItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<LibraryItem, Error, { itemId: string; version: string }>({
    mutationFn: async ({ itemId, version }) => {
      const composite = parseCompositeLibraryItemId(itemId);
      if (composite) {
        const doc = await databases.getDocument(
          DATABASE_ID,
          LIBRARY_COLLECTION_ID,
          composite.libraryDocumentId,
        );
        const map = getOrBuildVersionsMap(doc as any);
        const oldEntry = map[composite.versionKey];
        if (!oldEntry) throw new Error('Version not found');
        delete map[composite.versionKey];
        map[version] = { ...oldEntry, source: LibraryItemSource.Official };
        const next = setDefaultVersionInMap(map, version);
        const mirror = mirrorLegacyFieldsFromVersions(next);
        const response = await databases.updateDocument(
          DATABASE_ID,
          LIBRARY_COLLECTION_ID,
          composite.libraryDocumentId,
          {
            versions_json: serializeVersionsJson(next),
            version: mirror.version,
            source: mirror.source,
            is_default: mirror.is_default,
          },
        );
        return docToFirstItem(response as any);
      }
      const response = await databases.updateDocument(DATABASE_ID, LIBRARY_COLLECTION_ID, itemId, {
        version,
      });
      return docToFirstItem(response as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      toast({
        title: 'Saved',
        description: 'Default version has been saved.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to save: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};

export const useMergeLibraryPluginItems = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<void, Error, { itemIds: string[]; wpSlug: string; name?: string }>({
    mutationFn: async ({ itemIds, wpSlug, name }) => {
      const slug = wpSlug.trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
      if (!slug) throw new Error('Invalid slug');
      const docIds = new Set<string>();
      for (const id of itemIds) {
        const c = parseCompositeLibraryItemId(id);
        if (c) docIds.add(c.libraryDocumentId);
        else docIds.add(id);
      }
      const ids = [...docIds];
      if (ids.length === 0) return;
      const docs = await Promise.all(
        ids.map((id) => databases.getDocument(DATABASE_ID, LIBRARY_COLLECTION_ID, id)),
      );
      let combined: Record<string, LibraryVersionEntry> = {};
      for (const d of docs) {
        combined = { ...combined, ...getOrBuildVersionsMap(d as any) };
      }
      const mirror = mirrorLegacyFieldsFromVersions(combined);
      const [keep, ...rest] = ids;
      await databases.updateDocument(DATABASE_ID, LIBRARY_COLLECTION_ID, keep, {
        wpSlug: slug,
        versions_json: serializeVersionsJson(combined),
        version: mirror.version,
        source: mirror.source,
        is_default: mirror.is_default,
        ...(name !== undefined ? { name: name.trim() } : {}),
      });
      for (const id of rest) {
        await databases.deleteDocument(DATABASE_ID, LIBRARY_COLLECTION_ID, id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      toast({
        title: 'Merged',
        description: 'Selected plugins are combined into one library plugin.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Merge failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });
};

export const useDeleteLibraryItem = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<void, Error, string>({
    mutationFn: async (itemId) => {
      const composite = parseCompositeLibraryItemId(itemId);
      if (composite) {
        const execution = await functions.createExecution(
          'library-delete-version',
          JSON.stringify({
            libraryDocumentId: composite.libraryDocumentId,
            versionKey: composite.versionKey,
          }),
          false,
        );
        if (execution.responseStatusCode >= 400) {
          const body = JSON.parse(execution.responseBody || '{}');
          throw new Error(body.message || 'Delete failed');
        }
        return;
      }
      try {
        const execution = await functions.createExecution(
          'library-delete-version',
          JSON.stringify({ libraryItemId: itemId }),
          false,
        );
        if (execution.responseStatusCode >= 400) {
          const body = JSON.parse(execution.responseBody || '{}');
          throw new Error(body.message || 'Delete failed');
        }
      } catch (e) {
        const msg = (e instanceof Error ? e.message : String(e)).toLowerCase();
        const isFunctionNotFound =
          (msg.includes('function') && (msg.includes('not found') || msg.includes('could not be found'))) ||
          msg.includes('404');
        if (isFunctionNotFound) {
          await databases.deleteDocument(DATABASE_ID, LIBRARY_COLLECTION_ID, itemId);
        } else {
          throw e;
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['usage', user?.$id] });
      toast({
        title: 'Removed',
        description: 'Item has been removed from your library.',
        variant: 'success',
      });
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: `Failed to remove: ${error.message}`,
        variant: 'destructive',
      });
    },
  });
};
