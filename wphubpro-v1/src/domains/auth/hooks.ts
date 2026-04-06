import { useQuery } from '@tanstack/react-query';
import { account, teams } from '../../services/appwrite';

/**
 * Hook to fetch the current logged-in user including roles/team membership.
 */
export const useUser = () => {
  return useQuery({
    queryKey: ['user'],
    queryFn: async () => {
      try {
        const user = await account.get();

        // Check if user is in the admin team
        let isAdmin = false;
        try {
          const teamMemberships = await teams.listMemberships('admin');
          isAdmin = teamMemberships.memberships.some(m => m.userId === user.$id);
        } catch (_err) {
          console.warn('Could not fetch admin team membership');
          isAdmin = false;
        }

        return {
          ...user,
          isAdmin,
        } as any;
      } catch {
        // If there is no active session, return null
        return null;
      }
    },
    // Avoid unnecessary retries if the user is simply not logged in
    retry: false,
    staleTime: 1000 * 60 * 5, // 5 minuten
  });
};

/**
 * Placeholder voor login logica
 */
export const useLogin = () => {
  // You can add the login mutation here later
};

/**
 * Placeholder voor logout logica
 */
export const useLogout = () => {
  // You can add the logout mutation here later
};
