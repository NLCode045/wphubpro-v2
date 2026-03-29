import { useQuery } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { databases, DATABASE_ID, COLLECTIONS } from '@/services/appwrite';
import { useAuth } from '@/domains/auth';
import { mapLibraryCollectionDocument, mapLibraryFamilyDocument } from '@/domains/library';
import type { LibraryCollection, LibraryFamily } from '@/types';

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
