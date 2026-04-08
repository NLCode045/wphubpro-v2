import { ROUTE_PATHS } from '@/config/routePaths';
import { clearPagespeedSessionStorage } from '@/domains/sites/pagespeedSessionCache';
import { useQueryClient } from '@tanstack/react-query';
import { createContext, useContext, useState, useEffect, useMemo } from 'react';
import type { ReactNode } from 'react';
import type { Models } from 'appwrite';
import { AppwriteException, AuthenticationFactor } from 'appwrite';
import {
  account,
  applyStoredImpersonationHeaders,
  clearImpersonationClientAndStorage,
  getPrivilegedActorUserId,
  persistImpersonationOperatorId,
  persistImpersonationUserId,
  setImpersonationTargetOnClient,
  teams,
  ID,
  OAuthProvider,
} from '../../services/appwrite';
import type { User } from '../../types';

/** GitHub OAuth scopes — see https://appwrite.io/docs/products/auth/oauth2 */
const GITHUB_OAUTH_SCOPES = ['read:user', 'user:email'] as const;

/**
 * Where the browser lands after Appwrite finishes GitHub OAuth.
 * GitHub’s “redirect_uri” / “Authorization callback URL” is set in the GitHub OAuth App to the URL
 * from Appwrite Console → Auth → GitHub (API callback), not these app routes.
 */
function getOAuthRedirectUrls() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  return {
    // Land on login so MFA-pending OAuth sessions are not torn down by ProtectedRoute + sign-in mount.
    // Full sessions still redirect to the dashboard from AuthScreenGate.
    success: `${origin}${ROUTE_PATHS.LOGIN}`,
    failure: `${origin}${ROUTE_PATHS.LOGIN}`,
  };
}

function getGitHubLinkIdentityUrls() {
  const origin = typeof window !== 'undefined' ? window.location.origin : '';
  const base = `${origin}${ROUTE_PATHS.PROFILE}?tab=security`;
  return {
    success: `${base}&oauth=github_linked`,
    failure: `${base}&oauth=github_error`,
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
   * Validates email/password and opens a server session. Does not hydrate the app user until the second factor completes.
   * `mfaPending` is true when Appwrite requires MFA before account.get succeeds.
   */
  login: (email: string, pass: string) => Promise<{ mfaPending: boolean }>;
  /** TOTP challenge (after password, or while MFA session is pending). */
  beginTotpMfaChallenge: () => Promise<string>;
  /** Email MFA challenge when the session is already in MFA-pending state. */
  beginEmailMfaChallenge: () => Promise<string>;
  /** Complete any MFA challenge (TOTP or email code from Appwrite MFA). */
  completeMfaChallengeLogin: (challengeId: string, otp: string) => Promise<void>;
  /** Abandon MFA sign-in and clear the partial session. */
  cancelMfaLogin: () => Promise<void>;
  /** Start GitHub OAuth2 sign-in (new or existing user). See https://appwrite.io/docs/products/auth/oauth2 */
  loginWithGitHub: () => void;
  /**
   * While signed in, start GitHub OAuth2 to attach an identity to the current account.
   * See https://appwrite.io/docs/products/auth/identities
   */
  linkGitHubIdentity: () => void;
  listOAuthIdentities: () => Promise<Models.Identity[]>;
  unlinkOAuthIdentity: (identityId: string) => Promise<void>;
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
  completePasswordRecovery: (userId: string, secret: string, password: string) => Promise<PasswordRecoveryResult>;
  completeMfaChallenge: (otp: string, factor?: AuthenticationFactor) => Promise<void>;
  /** Creates an email MFA challenge; Appwrite sends a code (self-hosted: requires SMTP configured in Appwrite). */
  sendEmailMfaChallenge: () => Promise<string>;
  completeMfaEmailChallenge: (challengeId: string, otp: string) => Promise<void>;
  listMfaFactors: () => Promise<Models.MfaFactors>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  /** True when Appwrite returns `impersonatorUserId` on the effective account (native impersonation). */
  isImpersonating: boolean;
  /** Requires an admin session and Appwrite “impersonator” capability on the operator. */
  startImpersonation: (userId: string) => Promise<void>;
  stopImpersonation: () => Promise<void>;
  isLoading: boolean;
  /**
   * Appwrite user id to use for admin-only function payloads (real operator while impersonating).
   */
  privilegedActorUserId: string | null;
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

function impersonatorUserIdFromAccount(raw: Models.User<Models.Preferences>): string | undefined {
  const r = raw as Record<string, unknown>;
  const camel = r.impersonatorUserId;
  const snake = r.impersonator_user_id;
  if (typeof camel === 'string' && camel.trim()) return camel.trim();
  if (typeof snake === 'string' && snake.trim()) return snake.trim();
  return undefined;
}

function withImpersonationFields(u: Models.User<Models.Preferences>): User {
  const impersonatorUserId = impersonatorUserIdFromAccount(u);
  return { ...u, impersonatorUserId };
}

/** Align client headers + sessionStorage with the server: drop stale impersonation after a new login, etc. */
function syncImpersonationStateAfterGet(currentUser: Models.User<Models.Preferences>): void {
  if (!impersonatorUserIdFromAccount(currentUser)) {
    setImpersonationTargetOnClient(null);
    persistImpersonationUserId(null);
    persistImpersonationOperatorId(null);
  } else {
    setImpersonationTargetOnClient(currentUser.$id);
    persistImpersonationUserId(currentUser.$id);
    persistImpersonationOperatorId(null);
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [mfaPending, setMfaPending] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const isImpersonating = useMemo(() => Boolean(user?.impersonatorUserId), [user?.impersonatorUserId]);

  const privilegedActorUserId = useMemo(() => getPrivilegedActorUserId(user), [user]);

  const commitSessionUser = async () => {
    applyStoredImpersonationHeaders();
    const currentUser = await account.get();
    syncImpersonationStateAfterGet(currentUser);
    const adminStatus = await resolveAdminStatus(currentUser);
    setUser({ ...withImpersonationFields(currentUser), isAdmin: adminStatus });
    setIsAdmin(adminStatus);
    await new Promise((resolve) => setTimeout(resolve, 100));
  };

  useEffect(() => {
    let mounted = true;

    const hydrateUser = async () => {
      applyStoredImpersonationHeaders();
      const currentUser = await withTimeout(account.get(), AUTH_TIMEOUT_MS);
      syncImpersonationStateAfterGet(currentUser);
      const adminStatus = await resolveAdminStatus(currentUser);
      if (!mounted) return;
      setUser({ ...withImpersonationFields(currentUser), isAdmin: adminStatus });
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
        // Drop expired/invalid JWT from the client. Otherwise Appwrite still sends it and rejects
        // even "guest" function executions with 401. Keep MFA-pending sessions (same 401 type).
        if (code === 401 && !isMfaFactorsRequiredError(err)) {
          clearPagespeedSessionStorage();
          clearImpersonationClientAndStorage();
          try {
            await account.deleteSession('current');
          } catch {
            /* no session or already cleared */
          }
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

  const applySessionUser = async () => {
    const currentUser = await account.get();
    const adminStatus = await resolveAdminStatus(currentUser);
    setUser({ ...currentUser, isAdmin: adminStatus });
    setIsAdmin(adminStatus);
    setMfaPending(false);
  };

  const loginWithGitHub = () => {
    const { success, failure } = getOAuthRedirectUrls();
    account.createOAuth2Session(OAuthProvider.Github, success, failure, [...GITHUB_OAUTH_SCOPES]);
  };

  const linkGitHubIdentity = () => {
    const { success, failure } = getGitHubLinkIdentityUrls();
    account.createOAuth2Session(OAuthProvider.Github, success, failure, [...GITHUB_OAUTH_SCOPES]);
  };

  const listOAuthIdentities = async (): Promise<Models.Identity[]> => {
    const res = await account.listIdentities();
    if (Array.isArray(res)) {
      return res as Models.Identity[];
    }
    const list = (res as { identities?: Models.Identity[] }).identities;
    return Array.isArray(list) ? list : [];
  };

  const unlinkOAuthIdentity = async (identityId: string) => {
    await account.deleteIdentity(identityId);
    await refreshUser();
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
      clearImpersonationClientAndStorage();
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
    clearImpersonationClientAndStorage();
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

  const login = async (email: string, pass: string): Promise<{ mfaPending: boolean }> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !pass) {
      throw new Error('Email and password are required.');
    }
    await account.createEmailPasswordSession(trimmedEmail, pass);
    try {
      applyStoredImpersonationHeaders();
      const u = await account.get();
      syncImpersonationStateAfterGet(u);
      return { mfaPending: false };
    } catch (err: unknown) {
      if (isMfaFactorsRequiredError(err)) {
        return { mfaPending: true };
      }
      console.error('❌ Login failed:', err);
      throw err;
    }
  };

  const beginTotpMfaChallenge = async (): Promise<string> => {
    const challenge = await account.createMfaChallenge(AuthenticationFactor.Totp);
    if (!challenge.$id) {
      throw new Error('Could not start authenticator verification.');
    }
    return challenge.$id;
  };

  const beginEmailMfaChallenge = async (): Promise<string> => {
    const challenge = await account.createMfaChallenge(AuthenticationFactor.Email);
    if (!challenge.$id) {
      throw new Error('Could not start email verification.');
    }
    return challenge.$id;
  };

  const completeMfaChallengeLogin = async (challengeId: string, otp: string) => {
    const code = otp.trim();
    if (!code) {
      throw new Error('Enter the verification code.');
    }
    await account.updateMfaChallenge(challengeId, code);
    await commitSessionUser();
  };

  const cancelMfaLogin = async () => {
    clearPagespeedSessionStorage();
    clearImpersonationClientAndStorage();
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

    applyStoredImpersonationHeaders();
    const currentUser = await account.get();
    syncImpersonationStateAfterGet(currentUser);
    const adminStatus = (currentUser.labels as string[] | undefined)?.includes('admin') || false;

    setUser({ ...withImpersonationFields(currentUser), isAdmin: adminStatus });
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
    clearImpersonationClientAndStorage();
    await account.deleteSession('current');
    setUser(null);
    setIsAdmin(false);
  };

  const refreshUser = async () => {
    applyStoredImpersonationHeaders();
    const currentUser = await account.get();
    syncImpersonationStateAfterGet(currentUser);
    const adminStatus = await resolveAdminStatus(currentUser);
    setUser({ ...withImpersonationFields(currentUser), isAdmin: adminStatus });
    setIsAdmin(adminStatus);
  };

  const startImpersonation = async (userId: string) => {
    if (!isAdmin || !user) {
      throw new Error('Only administrators can impersonate a user.');
    }
    const id = userId.trim();
    if (!id) {
      throw new Error('Invalid user.');
    }
    persistImpersonationOperatorId(user.$id);
    setImpersonationTargetOnClient(id);
    persistImpersonationUserId(id);
    try {
      applyStoredImpersonationHeaders();
      const currentUser = await account.get();
      syncImpersonationStateAfterGet(currentUser);
      const adminStatus = await resolveAdminStatus(currentUser);
      setUser({ ...withImpersonationFields(currentUser), isAdmin: adminStatus });
      setIsAdmin(adminStatus);
      await queryClient.invalidateQueries();
    } catch (err) {
      clearImpersonationClientAndStorage();
      throw err;
    }
  };

  const stopImpersonation = async () => {
    clearImpersonationClientAndStorage();
    applyStoredImpersonationHeaders();
    const currentUser = await account.get();
    syncImpersonationStateAfterGet(currentUser);
    const adminStatus = await resolveAdminStatus(currentUser);
    setUser({ ...withImpersonationFields(currentUser), isAdmin: adminStatus });
    setIsAdmin(adminStatus);
    await queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAdmin,
        mfaPending,
        login,
        beginTotpMfaChallenge,
        beginEmailMfaChallenge,
        completeMfaChallengeLogin,
        cancelMfaLogin,
        loginWithGitHub,
        linkGitHubIdentity,
        listOAuthIdentities,
        unlinkOAuthIdentity,
        sendLoginEmailOtp,
        verifyLoginEmailOtp,
        beginDoubleAuthAfterPassword,
        beginDoubleAuthEmailStepAfterSession,
        register,
        forgotPassword,
        completePasswordRecovery,
        completeMfaChallenge,
        sendEmailMfaChallenge,
        completeMfaEmailChallenge,
        listMfaFactors,
        logout,
        refreshUser,
        isImpersonating,
        startImpersonation,
        stopImpersonation,
        isLoading,
        privilegedActorUserId,
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
