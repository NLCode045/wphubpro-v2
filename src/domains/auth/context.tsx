import { clearPagespeedSessionStorage } from '@/domains/sites/pagespeedSessionCache';
import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import { AppwriteException, AuthenticationFactor } from 'appwrite';
import { account, teams, ID, OAuthProvider } from '../../services/appwrite';
import type { User } from '../../types';

function getOAuthRedirectUrls() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    success: `${origin}/dashboard`,
    failure: `${origin}/login`,
  };
}

function isMfaFactorsRequiredError(err: unknown): boolean {
  if (err instanceof AppwriteException) {
    return err.type === 'user_more_factors_required';
  }
  const o = err as { type?: string };
  return o.type === 'user_more_factors_required';
}

interface AuthContextType {
  user: User | null;
  isAdmin: boolean;
  /**
   * Email/password session; if the account has MFA, returns `mfa_required` and the session stays challenge-pending
   * until {@link completeTotpMfaLogin} or {@link cancelMfaLogin}.
   */
  login: (email: string, pass: string) => Promise<'success' | 'mfa_required'>;
  /** Start TOTP challenge after {@link login} returned `mfa_required`. Returns challenge id for {@link completeTotpMfaLogin}. */
  beginTotpMfaChallenge: () => Promise<string>;
  completeTotpMfaLogin: (challengeId: string, otp: string) => Promise<void>;
  /** Abandon MFA sign-in and clear the partial session. */
  cancelMfaLogin: () => Promise<void>;
  loginWithGitHub: () => void;
  /** Appwrite Email OTP step 1 — sends code to the address; returns target user id for {@link verifyLoginEmailOtp}. */
  sendLoginEmailOtp: (email: string) => Promise<{ userId: string }>;
  /** Appwrite Email OTP step 2 — completes session after user enters code from email. */
  verifyLoginEmailOtp: (userId: string, secret: string) => Promise<void>;
  /**
   * Password verified via session, then email OTP is sent, session cleared — user must enter OTP to finish sign-in.
   */
  beginDoubleAuthAfterPassword: (email: string, pass: string) => Promise<{ userId: string }>;
  /**
   * While signed in (e.g. after registration), send email OTP and clear the session — same second step as double auth sign-in.
   */
  beginDoubleAuthEmailStepAfterSession: (email: string) => Promise<{ userId: string }>;
  register: (name: string, email: string, pass: string) => Promise<void>;
  forgotPassword: (email: string) => Promise<void>;
  completePasswordRecovery: (userId: string, secret: string, password: string) => Promise<void>;
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
      const userTeams = await teams.list();
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
  const [isLoading, setIsLoading] = useState(true);

  const commitSessionUser = async () => {
    const currentUser = await account.get();
    const adminStatus = await resolveAdminStatus(currentUser);
    setUser({ ...currentUser, isAdmin: adminStatus });
    setIsAdmin(adminStatus);
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  useEffect(() => {
    let mounted = true;

    const hydrateUser = async () => {
      const currentUser = await withTimeout(account.get(), AUTH_TIMEOUT_MS);
      const adminStatus = await resolveAdminStatus(currentUser);
      if (!mounted) return;
      setUser({ ...currentUser, isAdmin: adminStatus });
      setIsAdmin(adminStatus);
    };

    const checkSession = async () => {
      try {
        await hydrateUser();
      } catch (err: unknown) {
        if (!mounted) return;
        const code = (err as { code?: number })?.code;
        const message = err instanceof Error ? err.message : String(err);
        if (code !== 401) {
          console.error('Session check failed:', message || err);
        }
        setUser(null);
        setIsAdmin(false);
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

  const loginWithGitHub = () => {
    const { success, failure } = getOAuthRedirectUrls();
    account.createOAuth2Session(OAuthProvider.Github, success, failure, ['user:email']);
  };

  const sendLoginEmailOtp = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) {
      throw new Error('Email is required.');
    }
    const token = await account.createEmailToken(ID.unique(), trimmed);
    const uid = token.userId;
    if (!uid) {
      throw new Error('Could not start email sign-in.');
    }
    return { userId: uid };
  };

  const verifyLoginEmailOtp = async (userId: string, secret: string) => {
    const code = secret.trim();
    if (!code) {
      throw new Error('Enter the code from your email.');
    }
    await account.createSession(userId, code);
    await commitSessionUser();
  };

  const sendEmailOtpAndClearSession = async (trimmedEmail: string) => {
    let token;
    try {
      token = await account.createEmailToken(ID.unique(), trimmedEmail);
    } catch (err) {
      try {
        await account.deleteSession('current');
      } catch {
        /* ignore */
      }
      setUser(null);
      setIsAdmin(false);
      throw err;
    }
    clearPagespeedSessionStorage();
    try {
      await account.deleteSession('current');
    } catch {
      /* ignore */
    }
    setUser(null);
    setIsAdmin(false);
    const uid = token.userId;
    if (!uid) {
      throw new Error('Could not send verification code.');
    }
    return { userId: uid };
  };

  const beginDoubleAuthAfterPassword = async (email: string, pass: string) => {
    const trimmed = email.trim();
    if (!trimmed || !pass) {
      throw new Error('Email and password are required.');
    }
    await account.createEmailPasswordSession(trimmed, pass);
    return sendEmailOtpAndClearSession(trimmed);
  };

  const beginDoubleAuthEmailStepAfterSession = async (email: string) => {
    const trimmed = email.trim();
    if (!trimmed) {
      throw new Error('Email is required.');
    }
    return sendEmailOtpAndClearSession(trimmed);
  };

  const login = async (email: string, pass: string): Promise<'success' | 'mfa_required'> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !pass) {
      throw new Error('Email and password are required.');
    }
    await account.createEmailPasswordSession(trimmedEmail, pass);
    try {
      await account.get();
    } catch (err: unknown) {
      if (isMfaFactorsRequiredError(err)) {
        return 'mfa_required';
      }
      console.error('❌ Login failed:', err);
      throw err;
    }
    await commitSessionUser();
    return 'success';
  };

  const beginTotpMfaChallenge = async (): Promise<string> => {
    const challenge = await account.createMfaChallenge(AuthenticationFactor.Totp);
    if (!challenge.$id) {
      throw new Error('Could not start authenticator verification.');
    }
    return challenge.$id;
  };

  const completeTotpMfaLogin = async (challengeId: string, otp: string) => {
    const code = otp.trim();
    if (!code) {
      throw new Error('Enter the code from your authenticator app.');
    }
    await account.updateMfaChallenge(challengeId, code);
    await commitSessionUser();
  };

  const cancelMfaLogin = async () => {
    clearPagespeedSessionStorage();
    try {
      await account.deleteSession('current');
    } catch {
      /* ignore */
    }
    setUser(null);
    setIsAdmin(false);
  };

  const register = async (name: string, email: string, pass: string) => {
    const userId = ID.unique();
    await account.create(userId, email, pass, name);
    await account.createEmailPasswordSession(email, pass);

    const currentUser = await account.get();
    const adminStatus = (currentUser.labels as string[] | undefined)?.includes('admin') || false;

    setUser({ ...currentUser, isAdmin: adminStatus });
    setIsAdmin(adminStatus);
  };

  const forgotPassword = async (email: string) => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const resetUrl = `${origin}/reset-password`;
    await account.createRecovery(email, resetUrl);
  };

  const completePasswordRecovery = async (userId: string, secret: string, password: string) => {
    await account.updateRecovery(userId, secret, password);
    await commitSessionUser();
  };

  const logout = async () => {
    clearPagespeedSessionStorage();
    await account.deleteSession('current');
    setUser(null);
    setIsAdmin(false);
  };

  const refreshUser = async () => {
    const currentUser = await account.get();
    const adminStatus = await resolveAdminStatus(currentUser);
    setUser({ ...currentUser, isAdmin: adminStatus });
    setIsAdmin(adminStatus);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        login,
        beginTotpMfaChallenge,
        completeTotpMfaLogin,
        cancelMfaLogin,
        loginWithGitHub,
        sendLoginEmailOtp,
        verifyLoginEmailOtp,
        beginDoubleAuthAfterPassword,
        beginDoubleAuthEmailStepAfterSession,
        register,
        forgotPassword,
        completePasswordRecovery,
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
