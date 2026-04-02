import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '@/services/appwrite';
import { useAuth } from '@/domains/auth';
import {
  mapLibraryCollectionDocument,
  mapLibraryFamilyDocument,
  serializeLibraryCollectionItems,
} from '@/domains/library';
import { useNotificationContext } from '@/context/useNotificationContext';
import type { LibraryCollection, LibraryCollectionMember, LibraryFamily } from '@/types';

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

export const useUpdateLibraryFamilyMemberSlugs = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();

  return useMutation<void, Error, { familyId: string; memberSlugs: string[] }>({
    mutationFn: async ({ familyId, memberSlugs }) => {
      const unique = [...new Set(memberSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
      await databases.updateDocument(DATABASE_ID, famCol, familyId, { member_slugs: unique });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryFamilies', user?.$id] });
    },
    onError: (e: Error) => {
      showNotification({ title: 'Family', message: e.message, variant: 'danger' });
    },
  });
};

export const useCreateLibraryFamily = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();

  return useMutation<void, Error, { name?: string; memberSlugs: string[] }>({
    mutationFn: async ({ name, memberSlugs }) => {
      if (!user?.$id) throw new Error('Not signed in');
      const slugs = [...new Set(memberSlugs.map((s) => s.trim().toLowerCase()).filter(Boolean))];
      if (slugs.length === 0) throw new Error('At least one member slug is required');
      await databases.createDocument(DATABASE_ID, famCol, ID.unique(), {
        user_id: user.$id,
        member_slugs: slugs,
        ...(name?.trim() ? { name: name.trim() } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryFamilies', user?.$id] });
      showNotification({ title: 'Family', message: 'Family created.', variant: 'success' });
    },
    onError: (e: Error) => {
      showNotification({ title: 'Family', message: e.message, variant: 'danger' });
    },
  });
};

export const useUpdateLibraryCollectionItems = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();

  return useMutation<void, Error, { collectionId: string; items: LibraryCollectionMember[] }>({
    mutationFn: async ({ collectionId, items }) => {
      await databases.updateDocument(DATABASE_ID, collCol, collectionId, {
        items_json: serializeLibraryCollectionItems(items),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryCollections', user?.$id] });
    },
    onError: (e: Error) => {
      showNotification({ title: 'Collection', message: e.message, variant: 'danger' });
    },
  });
};

export const useCreateLibraryCollection = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();

  return useMutation<void, Error, { name: string; items: LibraryCollectionMember[] }>({
    mutationFn: async ({ name, items }) => {
      if (!user?.$id) throw new Error('Not signed in');
      const n = name.trim();
      if (!n) throw new Error('Name is required');
      if (items.length === 0) throw new Error('Add at least one item');
      await databases.createDocument(DATABASE_ID, collCol, ID.unique(), {
        user_id: user.$id,
        name: n,
        items_json: serializeLibraryCollectionItems(items),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryCollections', user?.$id] });
      showNotification({ title: 'Collection', message: 'Collection created.', variant: 'success' });
    },
    onError: (e: Error) => {
      showNotification({ title: 'Collection', message: e.message, variant: 'danger' });
    },
  });
};
