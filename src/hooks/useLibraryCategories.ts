import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';
import { databases, DATABASE_ID, COLLECTIONS, ID } from '@/services/appwrite';
import { useAuth } from '@/domains/auth';
import type { LibraryCategory, LibraryCategoryScope } from '@/types';
import { useNotificationContext } from '@/context/useNotificationContext';

function parseCategoryScope(raw: unknown): LibraryCategoryScope {
  const s = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  if (s === 'plugin' || s === 'theme' || s === 'general') return s;
  return 'general';
}

function mapCategoryDoc(doc: Record<string, unknown>): LibraryCategory {
  const sortRaw = doc.sort_order ?? doc.sortOrder;
  const sortOrder = typeof sortRaw === 'number' ? sortRaw : Number(sortRaw) || undefined;
  const parentRaw = doc.parent_id ?? doc.parentId;
  const parentId =
    typeof parentRaw === 'string' && parentRaw.trim() ? parentRaw.trim() : null;
  const scopeRaw = doc.category_scope ?? doc.categoryScope ?? doc.scope;
  const scope = parseCategoryScope(scopeRaw);
  return {
    $id: String(doc.$id),
    userId: String(doc.userId || doc.user_id || ''),
    name: String(doc.name ?? '').trim() || 'Category',
    scope,
    ...(parentId ? { parentId } : {}),
    ...(typeof doc.color === 'string' && doc.color.trim() ? { color: doc.color.trim() } : {}),
    ...(sortOrder !== undefined && !Number.isNaN(sortOrder) ? { sortOrder } : {}),
  };
}

export const useLibraryCategories = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['libraryCategories', user?.$id],
    queryFn: async () => {
      if (!user?.$id) return [];
      try {
        const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.LIBRARY_CATEGORIES, [
          Query.equal('user_id', user.$id),
        ]);
        return res.documents.map((d) => mapCategoryDoc(d as Record<string, unknown>));
      } catch {
        return [];
      }
    },
    enabled: !!user,
  });
};

export const useCreateLibraryCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();

  return useMutation({
    mutationFn: async (input: { name: string; color?: string; scope: LibraryCategoryScope }) => {
      if (!user?.$id) throw new Error('Not signed in');
      const name = input.name.trim();
      if (!name) throw new Error('Name is required');
      await databases.createDocument(DATABASE_ID, COLLECTIONS.LIBRARY_CATEGORIES, ID.unique(), {
        user_id: user.$id,
        name,
        category_scope: input.scope,
        ...(input.color?.trim() ? { color: input.color.trim() } : {}),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryCategories', user?.$id] });
      showNotification({ title: 'Category', message: 'Category created.', variant: 'success' });
    },
    onError: (e: Error) => {
      showNotification({ title: 'Error', message: e.message, variant: 'danger' });
    },
  });
};

export const useUpdateLibraryCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();

  return useMutation({
    mutationFn: async (input: {
      categoryId: string;
      name: string;
      color?: string | null;
      scope: LibraryCategoryScope;
    }) => {
      const name = input.name.trim();
      if (!name) throw new Error('Name is required');
      const patch: Record<string, unknown> = {
        name,
        parent_id: null,
        category_scope: input.scope,
      };
      if (input.color !== undefined) {
        patch.color = input.color?.trim() ? input.color.trim() : null;
      }
      await databases.updateDocument(DATABASE_ID, COLLECTIONS.LIBRARY_CATEGORIES, input.categoryId, patch);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryCategories', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      showNotification({ title: 'Category', message: 'Folder updated.', variant: 'success' });
    },
    onError: (e: Error) => {
      showNotification({ title: 'Error', message: e.message, variant: 'danger' });
    },
  });
};

export const useReorderLibraryCategories = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();

  return useMutation({
    mutationFn: async (updates: { categoryId: string; sortOrder: number }[]) => {
      await Promise.all(
        updates.map((u) =>
          databases.updateDocument(DATABASE_ID, COLLECTIONS.LIBRARY_CATEGORIES, u.categoryId, {
            sort_order: u.sortOrder,
          }),
        ),
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryCategories', user?.$id] });
    },
    onError: (e: Error) => {
      showNotification({ title: 'Error', message: e.message, variant: 'danger' });
    },
  });
};

export const useDeleteLibraryCategory = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const { showNotification } = useNotificationContext();

  return useMutation({
    mutationFn: async (categoryId: string) => {
      await databases.deleteDocument(DATABASE_ID, COLLECTIONS.LIBRARY_CATEGORIES, categoryId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['libraryCategories', user?.$id] });
      queryClient.invalidateQueries({ queryKey: ['libraryItems', user?.$id] });
      showNotification({ title: 'Category', message: 'Category removed.', variant: 'success' });
    },
    onError: (e: Error) => {
      showNotification({ title: 'Error', message: e.message, variant: 'danger' });
    },
  });
};
