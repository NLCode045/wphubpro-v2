import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { executeFunction } from '../../integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '../../services/appwrite';
import type { ForumCategory, ForumThread, ForumPost } from '../../types';

const FORUM_FN = APPWRITE_FUNCTION_IDS.FORUM;

interface CategoryDoc {
  $id: string;
  key: string;
  name: string;
  description?: string;
  order: number;
}

interface ThreadDoc {
  $id: string;
  category_id: string;
  user_id: string;
  title: string;
  post_count: number;
  last_post_at?: string;
  $createdAt: string;
}

interface PostDoc {
  $id: string;
  thread_id: string;
  user_id: string;
  body: string;
  $createdAt: string;
}

function mapCategory(doc: CategoryDoc): ForumCategory {
  return {
    $id: doc.$id,
    key: doc.key as ForumCategory['key'],
    name: doc.name,
    description: doc.description,
    order: doc.order,
  };
}

function mapThread(doc: ThreadDoc): ForumThread {
  return {
    $id: doc.$id,
    categoryId: doc.category_id,
    userId: doc.user_id,
    title: doc.title,
    postCount: doc.post_count,
    lastPostAt: doc.last_post_at,
    $createdAt: doc.$createdAt,
  };
}

function mapPost(doc: PostDoc): ForumPost {
  return {
    $id: doc.$id,
    threadId: doc.thread_id,
    userId: doc.user_id,
    body: doc.body,
    $createdAt: doc.$createdAt,
  };
}

export const useForumCategories = () => {
  return useQuery({
    queryKey: ['forumCategories'],
    queryFn: async () => {
      const res = await executeFunction<{ categories: CategoryDoc[] }>(FORUM_FN, {
        action: 'listCategories',
      });
      return (res?.categories ?? []).map(mapCategory);
    },
  });
};

export const useForumThreads = (categoryId?: string) => {
  return useQuery({
    queryKey: ['forumThreads', categoryId],
    queryFn: async () => {
      const res = await executeFunction<{ threads: ThreadDoc[]; total: number }>(FORUM_FN, {
        action: 'listThreads',
        categoryId,
      });
      return {
        threads: (res?.threads ?? []).map(mapThread),
        total: res?.total ?? 0,
      };
    },
  });
};

export const useForumThread = (threadId: string | undefined) => {
  return useQuery({
    queryKey: ['forumThread', threadId],
    queryFn: async () => {
      const res = await executeFunction<{ thread: ThreadDoc; posts: PostDoc[] }>(FORUM_FN, {
        action: 'getThread',
        threadId,
      });
      return {
        thread: mapThread(res!.thread),
        posts: (res?.posts ?? []).map(mapPost),
      };
    },
    enabled: !!threadId,
  });
};

export const useCreateForumThread = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { categoryId: string; title: string; body: string }) =>
      executeFunction<{ thread: ThreadDoc }>(FORUM_FN, { action: 'createThread', ...data }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['forumThreads'] });
    },
  });
};

export const useAddForumPost = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { threadId: string; body: string }) =>
      executeFunction(FORUM_FN, { action: 'addPost', ...data }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['forumThreads'] });
      queryClient.invalidateQueries({ queryKey: ['forumThread', variables.threadId] });
    },
  });
};
