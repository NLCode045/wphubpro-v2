import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../domains/auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  console.log('🛡️ ProtectedRoute check - isLoading:', isLoading, 'user:', user?.$id, 'path:', location.pathname);

  // Wait for auth check to complete
  if (isLoading) {
    console.log('⏳ ProtectedRoute: Still loading auth state');
    return (
      <div className="flex items-center justify-center h-screen bg-secondary">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Only redirect if we're certain there's no user
  if (!user) {
    console.warn('❌ ProtectedRoute: No user found, redirecting to login from:', location.pathname);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  console.log('✅ ProtectedRoute: User authenticated, rendering children');
  return children;
};

export default ProtectedRoute;
