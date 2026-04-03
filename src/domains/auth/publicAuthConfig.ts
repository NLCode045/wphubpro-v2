import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '@/services/appwrite';
import { useQuery } from '@tanstack/react-query';

export type PublicAuthConfig = {
  requireEmailOtpOnly: boolean;
};

export async function fetchPublicAuthConfig(): Promise<PublicAuthConfig> {
  const res = await executeFunction<{ requireEmailOtpOnly?: boolean }>(APPWRITE_FUNCTION_IDS.PUBLIC_AUTH_CONFIG, {
    action: 'public_auth_config',
  });
  return { requireEmailOtpOnly: Boolean(res?.requireEmailOtpOnly) };
}

export function usePublicAuthConfig() {
  return useQuery({
    queryKey: ['public-auth-config'],
    queryFn: fetchPublicAuthConfig,
    staleTime: 60_000,
  });
}

export type LoginMethodsResult = {
  otpOnly: boolean;
  globalOtp: boolean;
  userOtp: boolean;
};

export async function fetchLoginMethods(email: string): Promise<LoginMethodsResult> {
  const res = await executeFunction<{
    otpOnly?: boolean;
    globalOtp?: boolean;
    userOtp?: boolean;
  }>(APPWRITE_FUNCTION_IDS.PUBLIC_AUTH_CONFIG, {
    action: 'login_methods',
    email: email.trim().toLowerCase(),
  });
  return {
    otpOnly: Boolean(res?.otpOnly),
    globalOtp: Boolean(res?.globalOtp),
    userOtp: Boolean(res?.userOtp),
  };
}
