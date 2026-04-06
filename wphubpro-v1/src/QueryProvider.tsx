
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AppwriteException } from 'appwrite';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      retry: (_failureCount, error) => {
        // Don't retry on 401 (unauthorized)
        if (error instanceof AppwriteException && error.code === 401) {
          console.warn('⚠️ Query 401 error - session invalid');
          return false;
        }
        // Retry other errors up to 1 time
        return _failureCount < 1;
      },
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: (_failureCount, error) => {
        // Don't retry mutations on 401
        if (error instanceof AppwriteException && error.code === 401) {
          console.warn('⚠️ Mutation 401 error - session invalid');
          return false;
        }
        return false; // Don't retry mutations by default
      },
    },
  },
});

interface QueryProviderProps {
  children: React.ReactNode;
}

const QueryProvider: React.FC<QueryProviderProps> = ({ children }) => {
  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  );
};

export default QueryProvider;
