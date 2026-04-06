import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { databases, DATABASE_ID, COLLECTIONS } from '../services/appwrite';
import { Query } from 'appwrite';
import { useAuth } from '../domains/auth';
import { executeFunction } from '../integrations/appwrite/executeFunction';

/**
 * Hook to fetch platform settings by category.
 */
export const usePlatformSettings = (category: string) => {
    return useQuery({
        queryKey: ['platformSettings', category],
        queryFn: async () => {
            try {
                const response = await databases.listDocuments(
                    DATABASE_ID,
                    COLLECTIONS.SETTINGS,
                    [Query.equal('key', category)]
                );
                
                if (response.total > 0) {
                    return JSON.parse(response.documents[0].value);
                }
                return null;
            } catch (error) {
                const message = error instanceof Error ? error.message : String(error);
                console.error(`Error fetching ${category} settings:`, message || error);
                return null;
            }
        },
        staleTime: 1000 * 60 * 10, // 10 minutes
    });
};

/**
 * Hook to update platform settings via Appwrite Function.
 * This is a secure workaround for the server's failure to inject APPWRITE_FUNCTION_USER_ID.
 */
export const useUpdatePlatformSettings = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();

    return useMutation({
        mutationFn: async ({ category, settings }: { category: string, settings: any }) => {
            if (!user) {
                throw new Error("User is not authenticated.");
            }

            return await executeFunction<{ success: boolean; message?: string }>('manage-settings', {
                category,
                settings,
                userId: user.$id
            });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['platformSettings', variables.category] });
        }
    });
};

