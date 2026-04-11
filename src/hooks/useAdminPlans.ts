import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import {
  fetchAdminPlansCatalog,
  patchAdminProduct,
  postAdminCreatePrice,
  postAdminCreateProduct,
} from '@/lib/stripeAdminApi';

export const adminPlansQueryKey = ['stripe-admin', 'plans', 'catalog'] as const;

export function useAdminPlansCatalog() {
  return useQuery({
    queryKey: adminPlansQueryKey,
    queryFn: fetchAdminPlansCatalog,
    staleTime: 30_000,
  });
}

export function useAdminPlanMutations() {
  const qc = useQueryClient();
  const invalidate = () => void qc.invalidateQueries({ queryKey: adminPlansQueryKey });

  const createProduct = useMutation({
    mutationFn: postAdminCreateProduct,
    onSuccess: invalidate,
  });
  const updateProduct = useMutation({
    mutationFn: (args: { productId: string; body: { name?: string; description?: string; active?: boolean } }) =>
      patchAdminProduct(args.productId, args.body),
    onSuccess: invalidate,
  });
  const createPrice = useMutation({
    mutationFn: postAdminCreatePrice,
    onSuccess: invalidate,
  });

  return { createProduct, updateProduct, createPrice };
}
