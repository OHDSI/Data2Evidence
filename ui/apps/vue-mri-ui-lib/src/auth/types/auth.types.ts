/**
 * Core authentication type definitions for the D2E Portal authentication system.
 *
 * This module provides type-safe interfaces and classes for authentication in both:
 * - Single-SPA standalone mode (using OIDC)
 * - Embedded mode (using React portal's authentication)
 *
 * @module auth.types
 */

// Type-only import for Vue's Ref type
// Using conditional type to avoid dependency on Vue's type exports
type Ref<T> = { value: T }

/**
 * Enum representing different types of authentication errors.
 * Used for consistent error handling across the authentication system.
 */
/* eslint-disable */
export enum AuthErrorType {
  /** Authentication login attempt failed */
  LOGIN_FAILED = 'LOGIN_FAILED',

  /** Logout operation failed */
  LOGOUT_FAILED = 'LOGOUT_FAILED',

  /** Access token has expired */
  TOKEN_EXPIRED = 'TOKEN_EXPIRED',

  /** Failed to refresh the access token */
  TOKEN_REFRESH_FAILED = 'TOKEN_REFRESH_FAILED',

  /** Token format is invalid or signature verification failed */
  INVALID_TOKEN = 'INVALID_TOKEN',

  /** User session has expired */
  SESSION_EXPIRED = 'SESSION_EXPIRED',

  /** Network error occurred during authentication */
  NETWORK_ERROR = 'NETWORK_ERROR',
}
/* eslint-enable */

/**
 * Represents an authenticated user in the system.
 * Contains identity information and authorization details.
 */
export interface User {
  /** Unique identifier for the user (from OIDC 'sub' claim) */
  id: string

  /** Username for display and identification */
  username: string

  /** User's email address (optional, from OIDC claims) */
  email?: string

  /** Full display name of the user */
  name?: string

  /** List of roles assigned to the user for authorization */
  roles?: string[]

  /** List of specific permissions granted to the user */
  permissions?: string[]

  /** Additional custom claims from the identity provider */
  [key: string]: unknown
}

/**
 * Core authentication service interface.
 * Implementations handle different authentication providers (OIDC, etc.).
 *
 * @remarks
 * All methods are async to support various authentication flows.
 * Implementations should provide proper error handling and logging.
 */
export interface AuthService {
  /**
   * Initiates the login flow.
   *
   * @returns Promise that resolves when redirect is initiated (void for redirect-based flows)
   * @throws {AuthError} with type LOGIN_FAILED if initialization fails
   *
   * @example
   * ```typescript
   * await authService.login();
   * // User will be redirected to identity provider
   * ```
   */
  login(): Promise<void>

  /**
   * Handles the authentication callback after redirect from identity provider.
   * Processes authorization code and exchanges it for tokens.
   *
   * @returns Promise that resolves with authenticated User on success
   * @throws {AuthError} with type LOGIN_FAILED if callback processing fails
   *
   * @example
   * ```typescript
   * // After redirect back from IdP with ?code=...
   * const user = await authService.handleCallback();
   * ```
   */
  handleCallback(): Promise<User>

  /**
   * Gets the current authenticated user.
   *
   * @returns Promise resolving to User if authenticated, null otherwise
   * @throws {AuthError} with type SESSION_EXPIRED if token validation fails
   *
   * @example
   * ```typescript
   * const user = await authService.getUser();
   * if (user) {
   *   console.log(`Logged in as ${user.username}`);
   * }
   * ```
   */
  getUser(): Promise<User | null>

  /**
   * Gets the current access token for API requests.
   *
   * @returns Promise resolving to access token string, or null if not authenticated
   * @throws {AuthError} with type TOKEN_EXPIRED if token cannot be retrieved
   *
   * @example
   * ```typescript
   * const token = await authService.getToken();
   * axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
   * ```
   */
  getToken(): Promise<string | null>

  /**
   * Refreshes the current access token using the refresh token.
   *
   * @returns Promise that resolves when token is refreshed
   * @throws {AuthError} with type TOKEN_REFRESH_FAILED if refresh fails
   *
   * @example
   * ```typescript
   * try {
   *   await authService.refreshToken();
   * } catch (error) {
   *   // Refresh failed, redirect to login
   *   await authService.login();
   * }
   * ```
   */
  refreshToken(): Promise<void>

  /**
   * Checks if the user is currently authenticated with a valid token.
   *
   * @returns Promise resolving to true if authenticated, false otherwise
   *
   * @example
   * ```typescript
   * if (await authService.isAuthenticated()) {
   *   // Proceed with authenticated flow
   * } else {
   *   await authService.login();
   * }
   * ```
   */
  isAuthenticated(): Promise<boolean>

  /**
   * Logs out the current user and clears all session data.
   *
   * @returns Promise that resolves when logout is complete
   * @throws {AuthError} with type LOGOUT_FAILED if logout fails
   *
   * @example
   * ```typescript
   * await authService.logout();
   * // User will be redirected to identity provider logout
   * ```
   */
  logout(): Promise<void>
}

/**
 * Reactive authentication state for Vue components.
 * Contains readonly reactive references to authentication state.
 */
export interface AuthState {
  /** Current authenticated user, null if not authenticated */
  user: Ref<User | null>

  /** Whether the user is currently authenticated */
  isAuthenticated: Ref<boolean>

  /** Whether authentication operation is in progress */
  isLoading: Ref<boolean>

  /** Current authentication error, if any */
  error: Ref<AuthError | null>
}

/**
 * Authentication actions for Vue composables.
 * Methods that modify authentication state.
 */
export interface AuthActions {
  /** Initiates the login flow */
  login(): Promise<void>

  /** Logs out the current user */
  logout(): Promise<void>

  /** Refreshes the authentication token */
  renewToken(): Promise<void>

  /** Clears any authentication errors */
  clearError(): void
}

/**
 * JWT (JSON Web Token) payload structure based on OIDC standard.
 *
 * @see https://openid.net/specs/openid-connect-core-1_0.html#IDToken
 */
export interface JWTPayload {
  // Required OIDC claims

  /** Issuer - URL of the identity provider that issued the token */
  iss: string

  /** Subject - Unique identifier for the user */
  sub: string

  /** Audience - Client ID(s) this token is intended for */
  aud: string | string[]

  /** Expiration time - Unix timestamp (seconds since epoch) */
  exp: number

  /** Issued at - Unix timestamp when token was issued */
  iat: number

  // Optional OIDC claims

  /** Authorized party - Client ID that the token was issued to */
  azp?: string

  /** Authentication time - When the user authentication occurred */
  auth_time?: number

  /** Nonce - String value used to associate client session with ID token */
  nonce?: string

  /** Authentication Context Class Reference */
  acr?: string

  /** Authentication Methods References - Array of authentication methods used */
  amr?: string[]

  // User profile claims (all optional per OIDC spec)

  /** User's email address */
  email?: string

  /** Whether the email address has been verified */
  email_verified?: boolean

  /** User's full name */
  name?: string

  /** User's given name (first name) */
  given_name?: string

  /** User's family name (last name) */
  family_name?: string

  /** User's preferred username */
  preferred_username?: string

  // Custom claims (D2E specific)

  /** User roles for authorization */
  roles?: string[]

  /** User permissions for fine-grained access control */
  permissions?: string[]

  // Additional optional standard claims

  /** Not before - Token not valid before this time */
  nbf?: number

  /** JWT ID - Unique identifier for this token */
  jti?: string

  /** Allow additional custom claims */
  [key: string]: unknown
}

/**
 * Custom error class for authentication-related errors.
 * Provides structured error information for consistent error handling.
 *
 * @example
 * ```typescript
 * throw new AuthError(
 *   AuthErrorType.TOKEN_EXPIRED,
 *   'Access token has expired',
 *   originalError
 * );
 * ```
 */
export class AuthError extends Error {
  /** Type of authentication error for programmatic handling */
  public readonly type: AuthErrorType

  /** Original error that caused this authentication error, if any */
  public readonly originalError?: Error

  /** Timestamp when the error occurred (milliseconds since epoch) */
  public readonly timestamp: number

  /**
   * Creates a new AuthError instance.
   *
   * @param type - The type of authentication error
   * @param message - Human-readable error message for debugging
   * @param originalError - Original error that triggered this auth error (optional)
   */
  constructor(type: AuthErrorType, message: string, originalError?: Error) {
    super(message)

    // Maintains proper stack trace for where error was thrown (V8 only)
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AuthError)
    }

    this.name = 'AuthError'
    this.type = type
    this.originalError = originalError
    this.timestamp = Date.now()

    // Set prototype explicitly for proper instanceof checks in TypeScript
    Object.setPrototypeOf(this, AuthError.prototype)
  }

  /**
   * Returns a user-friendly error message based on error type.
   * This message is safe to display to end users.
   *
   * @returns User-friendly error message
   *
   * @example
   * ```typescript
   * try {
   *   await authService.login();
   * } catch (error) {
   *   if (error instanceof AuthError) {
   *     showNotification(error.getUserMessage());
   *   }
   * }
   * ```
   */
  getUserMessage(): string {
    const messages: Record<AuthErrorType, string> = {
      [AuthErrorType.LOGIN_FAILED]: 'Login failed. Please try again.',
      [AuthErrorType.LOGOUT_FAILED]: 'Logout failed. Please try again.',
      [AuthErrorType.TOKEN_EXPIRED]: 'Your session has expired. Please log in again.',
      [AuthErrorType.TOKEN_REFRESH_FAILED]: 'Failed to refresh session. Please log in again.',
      [AuthErrorType.INVALID_TOKEN]: 'Invalid authentication token.',
      [AuthErrorType.SESSION_EXPIRED]: 'Your session has expired.',
      [AuthErrorType.NETWORK_ERROR]: 'Network error. Please check your connection.',
    }
    return messages[this.type] || this.message
  }
}
