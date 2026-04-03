import { clearPagespeedSessionStorage } from '@/domains/sites/pagespeedSessionCache';
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AuthenticationFactor } from 'appwrite';
import { account, teams, ID, OAuthProvider } from '../../services/appwrite';
import type { User } from '../../types';

function getOAuthRedirectUrls() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    success: `${origin}/dashboard`,
    failure: `${origin}/login`,
  };
}

const USER_MORE_FACTORS_REQUIRED = 'user_more_factors_required';

function isUserMoreFactorsRequired(err: unknown): boolean {
  return (err as { type?: string })?.type === USER_MORE_FACTORS_REQUIRED;
}

export type LoginResult = { needsMfa: boolean };
export type PasswordRecoveryResult = { needsMfa: boolean };

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  mfaPending: boolean;
  login: (email: string, pass: string) => Promise<LoginResult>;
  loginWithGitHub: () => void;
  register: (name: string, email: string, pass: string) => Promise<LoginResult>;
  forgotPassword: (email: string) => Promise<void>;
  completePasswordRecovery: (userId: string, secret: string, password: string) => Promise<PasswordRecoveryResult>;
  completeMfaChallenge: (otp: string, factor?: AuthenticationFactor) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  isLoading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const AUTH_TIMEOUT_MS = 10_000;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`Auth request timed out after ${ms}ms`)), ms)
    ),
  ]);
}

async function resolveAdminStatus(currentUser: User): Promise<boolean> {
  let adminStatus = (currentUser.labels as string[] | undefined)?.includes('admin') || false;
  if (!adminStatus) {
    try {
      const userTeams = await withTimeout(teams.list(), AUTH_TIMEOUT_MS);
      adminStatus = userTeams.teams.some(t => t.$id === 'admin' || t.name.toLowerCase() === 'admin');
    } catch {
      adminStatus = false;
    }
  }
  return adminStatus;
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAuthenticatedUser = async () => {
      const currentUser = await withTimeout(account.get(), AUTH_TIMEOUT_MS);
      const adminStatus = await resolveAdminStatus(currentUser);
      if (!mounted) return;
      setUser({ ...currentUser, isAdmin: adminStatus });
      setIsAdmin(adminStatus);
      setMfaPending(false);
    };

    const checkSession = async () => {
      try {
        await loadAuthenticatedUser();
      } catch (err: unknown) {
        if (!mounted) return;
        if (isUserMoreFactorsRequired(err)) {
          setMfaPending(true);
          setUser(null);
          setIsAdmin(false);
        } else {
          const code = (err as { code?: number })?.code;
          const message = err instanceof Error ? err.message : String(err);
          if (code !== 401) {
            console.error('Session check failed:', message || err);
          }
          setUser(null);
          setIsAdmin(false);
          setMfaPending(false);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    checkSession();

    return () => {
      mounted = false;
    };
  }, []);

  const applySessionUser = async () => {
    const currentUser = await account.get();
    const adminStatus = await resolveAdminStatus(currentUser);
    setUser({ ...currentUser, isAdmin: adminStatus });
    setIsAdmin(adminStatus);
    setMfaPending(false);
  };

  const loginWithGitHub = () => {
    const { success, failure } = getOAuthRedirectUrls();
    account.createOAuth2Session(OAuthProvider.Github, success, failure, ['user:email']);
  };

  const login = async (email: string, pass: string): Promise<LoginResult> => {
    await account.createEmailPasswordSession(email, pass);
    try {
      await applySessionUser();
      await new Promise(resolve => setTimeout(resolve, 100));
      return { needsMfa: false };
    } catch (error: unknown) {
      if (isUserMoreFactorsRequired(error)) {
        setMfaPending(true);
        return { needsMfa: true };
      }
      console.error('❌ Login failed:', error);
      throw error;
    }
  };

  const register = async (name: string, email: string, pass: string): Promise<LoginResult> => {
    const userId = ID.unique();
    await account.create(userId, email, pass, name);
    await account.createEmailPasswordSession(email, pass);

    try {
      await applySessionUser();
      return { needsMfa: false };
    } catch (error: unknown) {
      if (isUserMoreFactorsRequired(error)) {
        setMfaPending(true);
        return { needsMfa: true };
      }
      throw error;
    }
  };

  const forgotPassword = async (email: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const resetUrl = `${origin}/reset-password`;
    await account.createRecovery(email, resetUrl);
  };

  const completePasswordRecovery = async (
    userId: string,
    secret: string,
    password: string
  ): Promise<PasswordRecoveryResult> => {
    await account.updateRecovery(userId, secret, password);
    try {
      await applySessionUser();
      return { needsMfa: false };
    } catch (error: unknown) {
      if (isUserMoreFactorsRequired(error)) {
        setMfaPending(true);
        return { needsMfa: true };
      }
      throw error;
    }
  };

  async function resolveChallengeFactor(explicit?: AuthenticationFactor): Promise<AuthenticationFactor> {
    if (explicit != null) return explicit;
    const factors = await account.listMfaFactors();
    if (factors.totp) return AuthenticationFactor.Totp;
    if (factors.email) return AuthenticationFactor.Email;
    if (factors.phone) return AuthenticationFactor.Phone;
    if (factors.recoveryCode) return AuthenticationFactor.Recoverycode;
    throw new Error('No MFA method is available on this account.');
  }

  const completeMfaChallenge = async (otp: string, factor?: AuthenticationFactor) => {
    const trimmed = otp.trim();
    if (!trimmed) {
      throw new Error('Enter your verification code.');
    }
    const authFactor = await resolveChallengeFactor(factor);
    const challenge = await account.createMfaChallenge(authFactor);
    await account.updateMfaChallenge(challenge.$id, trimmed);
    await applySessionUser();
  };

  const logout = async () => {
    clearPagespeedSessionStorage();
    await account.deleteSession('current');
    setUser(null);
    setIsAdmin(false);
    setMfaPending(false);
  };

  const refreshUser = async () => {
    try {
      const currentUser = await account.get();
      let adminStatus = currentUser.labels?.includes('admin') || false;
      if (!adminStatus) {
        try {
          const userTeams = await teams.list();
          adminStatus = userTeams.teams.some(t => t.$id === 'admin' || t.name.toLowerCase() === 'admin');
        } catch {
          adminStatus = false;
        }
      }
      setUser({ ...currentUser, isAdmin: adminStatus });
      setIsAdmin(adminStatus);
      setMfaPending(false);
    } catch (err: unknown) {
      if (isUserMoreFactorsRequired(err)) {
        setMfaPending(true);
        setUser(null);
        setIsAdmin(false);
        return;
      }
      throw err;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        mfaPending,
        login,
        loginWithGitHub,
        register,
        forgotPassword,
        completePasswordRecovery,
        completeMfaChallenge,
        logout,
        refreshUser,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
