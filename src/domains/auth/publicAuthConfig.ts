import { executeFunction } from '@/integrations/appwrite/executeFunction';
import { APPWRITE_FUNCTION_IDS } from '@/services/appwrite';
import { useQuery } from '@tanstack/react-query';

export type PublicAuthConfig = {
  forceMfaForAllUsers: boolean;
  /** Platform allows email OTP as an MFA method at sign-in (when Appwrite exposes it). */
  mfaOtpMailEnabled: boolean;
  /** Platform allows authenticator (TOTP) as an MFA method. */
  mfaAuthenticatorEnabled: boolean;
};

export async function fetchPublicAuthConfig(): Promise<PublicAuthConfig> {
  const res = await executeFunction<{
    forceMfaForAllUsers?: boolean;
    mfaOtpMailEnabled?: boolean;
    mfaAuthenticatorEnabled?: boolean;
  }>(APPWRITE_FUNCTION_IDS.PUBLIC_AUTH_CONFIG, {
    action: 'public_auth_config',
  });
  return {
    forceMfaForAllUsers: Boolean(res?.forceMfaForAllUsers),
    mfaOtpMailEnabled: res?.mfaOtpMailEnabled !== false,
    mfaAuthenticatorEnabled: res?.mfaAuthenticatorEnabled !== false,
  };
}

export function usePublicAuthConfig() {
  return useQuery({
    queryKey: ['public-auth-config'],
    queryFn: fetchPublicAuthConfig,
    staleTime: 60_000,
    retry: false,
  });
}

export type LoginMethodsResult = {
  mfaFactorEmailEnabled: boolean;
  mfaFactorAuthenticatorEnabled: boolean;
  /**
   * Whether Appwrite has an email MFA factor for this user (from Users API).
   * Used during sign-in while the client session is MFA-pending — `account.listMfaFactors()` can fail then.
   */
  mfaFactorEmailRegistered: boolean | null;
  mfaFactorTotpRegistered: boolean | null;
};

export async function fetchLoginMethods(email: string): Promise<LoginMethodsResult> {
  const res = await executeFunction<{
    mfaFactorEmailEnabled?: boolean;
    mfaFactorAuthenticatorEnabled?: boolean;
    mfaFactorEmailRegistered?: boolean;
    mfaFactorTotpRegistered?: boolean;
  }>(APPWRITE_FUNCTION_IDS.PUBLIC_AUTH_CONFIG, {
    action: 'login_methods',
    email: email.trim().toLowerCase(),
  });
  const emailReg = res?.mfaFactorEmailRegistered;
  const totpReg = res?.mfaFactorTotpRegistered;
  return {
    mfaFactorEmailEnabled: res?.mfaFactorEmailEnabled !== false,
    mfaFactorAuthenticatorEnabled: res?.mfaFactorAuthenticatorEnabled !== false,
    mfaFactorEmailRegistered: typeof emailReg === 'boolean' ? emailReg : null,
    mfaFactorTotpRegistered: typeof totpReg === 'boolean' ? totpReg : null,
  };
}
