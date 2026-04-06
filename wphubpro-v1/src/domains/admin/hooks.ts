import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { functions } from '../../services/appwrite';

/**
 * Hook for admin dashboard statistics
 */
export const useAdminStats = () => {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      // Placeholder for actual function call
      // const response = await functions.createExecution('get-admin-stats');
      // return JSON.parse(response.responseBody);
      return {
        totalUsers: 1284,
        activeSubscriptions: 842,
        mrr: 12450,
        churnRate: 2.4,
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
};

/**
 * Hook for managing Stripe products/plans
 */
export const useAdminPlans = () => {
  const queryClient = useQueryClient();

  const plansQuery = useQuery({
    queryKey: ['admin', 'plans'],
    queryFn: async () => {
      // Placeholder for Stripe API call via Appwrite function
      return [
        { id: 'prod_1', name: 'Starter', monthlyPrice: 12, yearlyPrice: 120 },
        { id: 'prod_2', name: 'Pro', monthlyPrice: 29, yearlyPrice: 290 },
      ];
    }
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      await functions.createExecution('sync-stripe-plans');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'plans'] });
    }
  });

  return { ...plansQuery, syncPlans: syncMutation.mutate };
};
