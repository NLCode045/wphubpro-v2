import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS, COLLECTIONS, DATABASE_ID, databases } from '@/services/appwrite';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Query } from 'appwrite';

/** Raw user from Appwrite Users API */
export interface AppwriteUser {
  $id: string;
  name?: string;
  email?: string;
  status?: boolean;
  labels?: string[];
  prefs?: Record<string, unknown>;
  $createdAt?: string;
  $updatedAt?: string;
  [key: string]: unknown;
}

/** Account document from platform_db.accounts */
export interface AccountDoc {
  $id: string;
  user_id: string;
  current_plan_id?: string | null;
  stripe_customer_id?: string | null;
  avatar?: string | null;
  admin_notes?: string | null;
  [key: string]: unknown;
}

/** Formatted admin user for UI */
export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: 'Admin' | 'User';
  isAdmin: boolean;
  planName: string;
  stripeId: string;
  status: 'Active' | 'Inactive';
  joined: string;
  prefs: Record<string, unknown>;
  avatar: string | null;
}

function formatUser(
  user: AppwriteUser,
  accountMap: Record<string, { stripeId: string | null; avatar: string | null }>,
): AdminUser {
  const labels = Array.isArray(user.labels) ? user.labels : [];
  const isAdmin = labels.some((l) => String(l).toLowerCase() === 'admin');
  const acc = accountMap[user.$id];
  const planName = acc?.stripeId ? 'Stripe' : 'Free';
  return {
    id: user.$id,
    name: user.name || user.email || `aser ${(user.$id || '').substring(0, 8)}`,
    email: user.email || 'N/A',
    role: isAdmin ? 'Admin' : 'User',
    isAdmin,
    planName,
    stripeId: acc?.stripeId || 'n/a',
    status: user.status === false ? 'Inactive' : 'Active',
    joined: user.$createdAt ? new Date(user.$createdAt).toLocaleDateString() : 'n/a',
    prefs: user.prefs || {},
    avatar: acc?.avatar ?? (user.prefs && (user.prefs as Record<string, unknown>).avatar as string) ?? null,
  };
}

export type AdminUserStatusFilter = 'all' | 'active' | 'inactive';
export type AdminUserRoleFilter = 'all' | 'admin' | 'user';
export type AdminUserPlanFilter = 'all' | 'free' | 'stripe';

export interface ListUsersParams {
  limit?: number;
  offset?: number;
  search?: string;
  status?: AdminUserStatusFilter;
  role?: AdminUserRoleFilter;
  plan?: AdminUserPlanFilter;
}

async function fetchFormattedAdminUsers(params: ListUsersParams): Promise<{
  users: AdminUser[];
  total: number;
  limit: number;
  offset: number;
}> {
  const limit = Math.max(1, Math.min(100, params.limit ?? 50));
  const offset = params.offset ?? 0;
  const search = params.search ?? '';
  const status = params.status ?? 'all';
  const role = params.role ?? 'all';
  const plan = params.plan ?? 'all';

  const payload = { action: 'list', limit, offset, search, status, role, plan };
  
  // Debug logging
  console.debug('[fetchFormattedAdminUsers] Sending payload:', payload);

  const res = await executeFunction<{
    success?: boolean;
    users: AppwriteUser[];
    total: number;
    limit?: number;
    offset?: number;
  }>(APPWRITE_FUNCTION_IDS.ADMIN_MANAGE_USERS, payload);

  const rawUsers = res?.users ?? [];
  const total = res?.total ?? rawUsers.length;

  const accountMap: Record<string, { stripeId: string | null; avatar: string | null }> = {};

  if (rawUsers.length > 0) {
    const accountPromises = rawUsers.map((u) =>
      databases.listDocuments(DATABASE_ID, COLLECTIONS.ACCOUNTS, [
        Query.equal('user_id', u.$id),
        Query.limit(1),
      ]),
    );
    const accountResults = await Promise.all(accountPromises);
    accountResults.forEach((r, i) => {
      const doc = r.documents?.[0] as unknown as AccountDoc | undefined;
      const userId = rawUsers[i].$id;
      if (doc) {
        accountMap[userId] = {
          stripeId: doc.stripe_customer_id ?? null,
          avatar: doc.avatar ?? null,
        };
      } else {
        accountMap[userId] = { stripeId: null, avatar: null };
      }
    });
  }

  const users = rawUsers.map((u) => formatUser(u, accountMap));

  return { users, total, limit, offset };
}

export interface UpdateUserParams {
  userId: string;
  updates: {
    name?: string;
    email?: string;
    status?: 'Active' | 'Inactive';
    isAdmin?: boolean;
    stripe_customer_id?: string;
  };
}

export function useAdminUsersList(
  params: ListUsersParams = {},
  options?: { enabled?: boolean },
) {
  const limit = Math.max(1, Math.min(100, params.limit ?? 50));
  const offset = params.offset ?? 0;
  const search = params.search ?? '';
  const status = params.status ?? 'all';
  const role = params.role ?? 'all';
  const plan = params.plan ?? 'all';

  return useQuery({
    queryKey: ['admin', 'users', limit, offset, search, status, role, plan],
    queryFn: () => fetchFormattedAdminUsers({ limit, offset, search, status, role, plan }),
    enabled: options?.enabled ?? true,
  });
}

export function useAdminUsersUpdate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ userId, updates }: UpdateUserParams) => {
      const userUpdates: Record<string, unknown> = {};
      if (updates.name !== undefined) userUpdates.name = updates.name;
      if (updates.email !== undefined) userUpdates.email = updates.email;
      if (updates.status !== undefined) userUpdates.status = updates.status;
      if (updates.isAdmin !== undefined) userUpdates.isAdmin = updates.isAdmin;
      if (updates.stripe_customer_id !== undefined)
        userUpdates.stripe_customer_id = updates.stripe_customer_id;

      await executeFunction(APPWRITE_FUNCTION_IDS.ADMIN_MANAGE_USERS, {
        action: 'update',
        userId,
        updates: userUpdates,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}

