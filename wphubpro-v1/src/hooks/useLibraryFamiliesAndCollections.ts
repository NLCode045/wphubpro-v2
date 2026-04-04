import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, ID, DATABASE_ID, COLLECTIONS } from '../services/appwrite';
import { Query } from 'appwrite';
import {
  LibraryCollection,
  LibraryCollectionMember,
  LibraryFamily,
  LibraryFamilyMemberPreference,
  LibraryItemType,
} from '../types';
import { useAuth } from '../domains/auth';
import { useToast } from '../contexts/ToastContext';
import {
  mapLibraryCollectionDocument,
  mapLibraryFamilyDocument,
  serializeLibraryCollectionItems,
} from '../domains/library/mappers';
import { filterFamiliesContainingSlug } from '../domains/library/libraryMembership';

const famCol = COLLECTIONS.LIBRARY_FAMILIES;
const collCol = COLLECTIONS.LIBRARY_COLLECTIONS;

export const useLibraryFamilies = () => {
  const { user } = useAuth();
  return useQuery<LibraryFamily[], Error>({
    queryKey: ['libraryFamilies', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      const response = await databases.listDocuments(DATABASE_ID, famCol, [Query.equal('user_id', user.$id)]);
      return response.documents.map((doc) => mapLibraryFamilyDocument(doc as Record<string, unknown>));
    },
    enabled: !!user,
  });
};

export const useLibraryFamilyById = (familyId: string | undefined) => {
  const { data: families = [], isLoading, isError, error } = useLibraryFamilies();
  const family = familyId ? families.find((f) => f.$id === familyId) : undefined;
  return { family, isLoading, isError, error };
};

export type CreateLibraryFamilyInput = { name: string; memberSlugs?: string[] };

export const useCreateLibraryFamily = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<LibraryFamily, Error, CreateLibraryFamilyInput>({
    mutationFn: async ({ name, memberSlugs = [] }) => {
      if (!user?.$id) throw new Error('Not authenticated');
      const n = name.trim();
      if (!n) throw new Error('Family name is required.');
      const slugs = [...new Set(memberSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
      const doc = await databases.createDocument(DATABASE_ID, famCol, ID.unique(), {
        user_id: user.$id,
        member_slugs: slugs,
        name: n,
      });
      return mapLibraryFamilyDocument(doc as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryFamilies', user?.$id] });
      toast({ title: 'Family created', variant: 'success' });
    },
    onError: (e) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
};

export const useUpdateLibraryFamily = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<
    LibraryFamily,
    Error,
    {
      familyId: string;
      name?: string;
      memberSlugs?: string[];
      memberPreferences?: Record<string, LibraryFamilyMemberPreference>;
    }
  >({
    mutationFn: async ({ familyId, name, memberSlugs, memberPreferences }) => {
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = name.trim() || null;
      if (memberSlugs !== undefined) {
        const slugs = [...new Set(memberSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
        patch.member_slugs = slugs;
      }
      if (memberPreferences !== undefined) {
        patch.member_preferences_json = JSON.stringify(memberPreferences);
      }
      if (Object.keys(patch).length === 0) throw new Error('Nothing to update');
      const doc = await databases.updateDocument(DATABASE_ID, famCol, familyId, patch);
      return mapLibraryFamilyDocument(doc as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryFamilies', user?.$id] });
      toast({ title: 'Saved', variant: 'success' });
    },
    onError: (e) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
};

export const useDeleteLibraryFamily = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<void, Error, string>({
    mutationFn: async (familyId) => {
      await databases.deleteDocument(DATABASE_ID, famCol, familyId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryFamilies', user?.$id] });
      toast({ title: 'Removed', variant: 'success' });
    },
    onError: (e) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
};

export const useLibraryCollections = () => {
  const { user } = useAuth();
  return useQuery<LibraryCollection[], Error>({
    queryKey: ['libraryCollections', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      const response = await databases.listDocuments(DATABASE_ID, collCol, [Query.equal('user_id', user.$id)]);
      return response.documents.map((doc) => mapLibraryCollectionDocument(doc as Record<string, unknown>));
    },
    enabled: !!user,
  });
};

export type CreateLibraryCollectionInput = {
  name: string;
  items: LibraryCollectionMember[];
};

export const useCreateLibraryCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<LibraryCollection, Error, CreateLibraryCollectionInput>({
    mutationFn: async ({ name, items }) => {
      if (!user?.$id) throw new Error('Not authenticated');
      const n = name.trim();
      if (!n) throw new Error('Name is required');
      const doc = await databases.createDocument(DATABASE_ID, collCol, ID.unique(), {
        user_id: user.$id,
        name: n,
        items_json: serializeLibraryCollectionItems(items),
      });
      return mapLibraryCollectionDocument(doc as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryCollections', user?.$id] });
      toast({ title: 'Collection created', variant: 'success' });
    },
    onError: (e) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
};

export const useUpdateLibraryCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<
    LibraryCollection,
    Error,
    { collectionId: string; name?: string; items?: LibraryCollectionMember[] }
  >({
    mutationFn: async ({ collectionId, name, items }) => {
      const patch: Record<string, unknown> = {};
      if (name !== undefined) patch.name = name.trim() || 'Collection';
      if (items !== undefined) patch.items_json = serializeLibraryCollectionItems(items);
      if (Object.keys(patch).length === 0) throw new Error('Nothing to update');
      const doc = await databases.updateDocument(DATABASE_ID, collCol, collectionId, patch);
      return mapLibraryCollectionDocument(doc as Record<string, unknown>);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryCollections', user?.$id] });
      toast({ title: 'Saved', variant: 'success' });
    },
    onError: (e) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
};

export const useDeleteLibraryCollection = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  return useMutation<void, Error, string>({
    mutationFn: async (collectionId) => {
      await databases.deleteDocument(DATABASE_ID, collCol, collectionId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryCollections', user?.$id] });
      toast({ title: 'Removed', variant: 'success' });
    },
    onError: (e) => {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    },
  });
};

export { filterFamiliesContainingSlug };

/** Ordered slugs for family install: primary first, then others in member_slugs order. */
export function orderedFamilySlugsForInstall(family: LibraryFamily, primarySlug: string): string[] {
  const primary = primarySlug.trim().toLowerCase();
  const rest = family.memberSlugs.filter((m) => m.toLowerCase() !== primary);
  return [primary, ...rest];
}

export function buildCollectionMemberFromLibraryItem(
  slug: string,
  type: LibraryItemType,
): LibraryCollectionMember {
  return { slug: slug.trim().toLowerCase(), type, versionMode: 'default' };
}
