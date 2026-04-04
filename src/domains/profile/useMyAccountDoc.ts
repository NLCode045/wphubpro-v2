import { COLLECTIONS, DATABASE_ID, databases } from '@/services/appwrite';
import { useQuery } from '@tanstack/react-query';
import { Query } from 'appwrite';

/** Subset of `platform_db.accounts` fields used on the profile page. */
export type MyAccountDoc = {
  $id: string;
  user_id: string;
  current_plan_id?: string | null;
  stripe_customer_id?: string | null;
};

export function useMyAccountDoc(userId: string | undefined) {
  return useQuery({
    queryKey: ['my-account-doc', userId],
    enabled: Boolean(userId),
    queryFn: async () => {
      const res = await databases.listDocuments(DATABASE_ID, COLLECTIONS.ACCOUNTS, [
        Query.equal('user_id', userId!),
      ]);
      const doc = res.documents[0];
      return doc ? (doc as unknown as MyAccountDoc) : null;
    },
  });
}
