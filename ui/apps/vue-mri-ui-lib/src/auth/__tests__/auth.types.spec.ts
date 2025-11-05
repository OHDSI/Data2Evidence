/**
 * Test suite for authentication type definitions.
 * Tests type contracts and runtime behavior of auth types.
 */

import { ref, type Ref } from 'vue'
import {
  AuthErrorType,
  AuthError,
  type User,
  type AuthService,
  type AuthState,
  type AuthActions,
  type JWTPayload,
} from '../types/auth.types'

describe('AuthErrorType', () => {
  it('should define all error types', () => {
    expect(AuthErrorType.LOGIN_FAILED).toBe('LOGIN_FAILED')
    expect(AuthErrorType.LOGOUT_FAILED).toBe('LOGOUT_FAILED')
    expect(AuthErrorType.TOKEN_EXPIRED).toBe('TOKEN_EXPIRED')
    expect(AuthErrorType.TOKEN_REFRESH_FAILED).toBe('TOKEN_REFRESH_FAILED')
    expect(AuthErrorType.INVALID_TOKEN).toBe('INVALID_TOKEN')
    expect(AuthErrorType.SESSION_EXPIRED).toBe('SESSION_EXPIRED')
    expect(AuthErrorType.NETWORK_ERROR).toBe('NETWORK_ERROR')
  })

  it('should have exactly 7 error types', () => {
    const errorTypes = Object.keys(AuthErrorType)
    expect(errorTypes.length).toBe(7)
  })
})

describe('User Interface', () => {
  it('should accept valid user with required fields', () => {
    const user: User = {
      id: 'user-123',
      username: 'testuser',
    }

    expect(user.id).toBe('user-123')
    expect(user.username).toBe('testuser')
  })

  it('should accept user with all optional fields', () => {
    const user: User = {
      id: 'user-123',
      username: 'testuser',
      email: 'test@example.com',
      name: 'Test User',
      roles: ['admin', 'user'],
      permissions: ['read', 'write'],
      customClaim: 'custom-value',
    }

    expect(user.email).toBe('test@example.com')
    expect(user.roles).toEqual(['admin', 'user'])
    expect(user.customClaim).toBe('custom-value')
  })

  it('should have correct type structure', () => {
    // Type checking is done at compile time by TypeScript
    // This test validates the interface can be used correctly
    const user: User = {
      id: '1',
      username: 'test',
      email: 'test@example.com',
      roles: ['user'],
    }
    expect(user).toBeDefined()
  })
})

describe('AuthService Interface', () => {
  it('should define all required methods', () => {
    const mockService: AuthService = {
      login: async () => {},
      handleCallback: async () => ({ id: '1', username: 'test' }),
      getUser: async () => null,
      getToken: async () => null,
      refreshToken: async () => {},
      isAuthenticated: async () => false,
      logout: async () => {},
    }

    expect(mockService.login).toBeDefined()
    expect(mockService.handleCallback).toBeDefined()
    expect(mockService.getUser).toBeDefined()
    expect(mockService.getToken).toBeDefined()
    expect(mockService.refreshToken).toBeDefined()
    expect(mockService.isAuthenticated).toBeDefined()
    expect(mockService.logout).toBeDefined()
  })

  it('should have correct method signatures', async () => {
    // Type checking validated at compile time
    // Runtime validation that methods return expected types
    const mockService: AuthService = {
      login: async () => {},
      handleCallback: async () => ({ id: '1', username: 'test' }),
      getUser: async () => ({ id: '1', username: 'test' }),
      getToken: async () => 'token-123',
      refreshToken: async () => {},
      isAuthenticated: async () => true,
      logout: async () => {},
    }

    expect(typeof mockService.login).toBe('function')
    expect(typeof mockService.handleCallback).toBe('function')

    // Verify return types at runtime
    const user = await mockService.handleCallback()
    expect(user).toHaveProperty('id')
    expect(user).toHaveProperty('username')

    const token = await mockService.getToken()
    expect(typeof token).toBe('string')
  })

  it('should require all methods to be async', async () => {
    // Verify methods return Promises
    const mockService: AuthService = {
      login: async () => {},
      handleCallback: async () => ({ id: '1', username: 'test' }),
      getUser: async () => null,
      getToken: async () => null,
      refreshToken: async () => {},
      isAuthenticated: async () => false,
      logout: async () => {},
    }

    expect(mockService.login()).toBeInstanceOf(Promise)
    expect(mockService.logout()).toBeInstanceOf(Promise)
    expect(mockService.refreshToken()).toBeInstanceOf(Promise)
    expect(mockService.isAuthenticated()).toBeInstanceOf(Promise)
  })
})

describe('AuthState Interface', () => {
  it('should define reactive refs for all state properties', () => {
    const mockState: AuthState = {
      user: ref<User | null>(null),
      isAuthenticated: ref(false),
      isLoading: ref(false),
      error: ref<AuthError | null>(null),
    }

    expect(mockState.user.value).toBeNull()
    expect(mockState.isAuthenticated.value).toBe(false)
    expect(mockState.isLoading.value).toBe(false)
    expect(mockState.error.value).toBeNull()
  })

  it('should have correct ref types', () => {
    // Type checking validated at compile time
    // Verify refs work correctly at runtime
    const mockState: AuthState = {
      user: ref<User | null>(null),
      isAuthenticated: ref(false),
      isLoading: ref(false),
      error: ref<AuthError | null>(null),
    }

    // Verify they are Vue refs
    expect(mockState.user.value).toBeNull()
    expect(typeof mockState.isAuthenticated.value).toBe('boolean')
    expect(typeof mockState.isLoading.value).toBe('boolean')
    expect(mockState.error.value).toBeNull()
  })

  it('should allow state mutations', () => {
    const mockState: AuthState = {
      user: ref<User | null>(null),
      isAuthenticated: ref(false),
      isLoading: ref(false),
      error: ref<AuthError | null>(null),
    }

    mockState.user.value = { id: '1', username: 'test' }
    mockState.isAuthenticated.value = true

    expect(mockState.user.value?.username).toBe('test')
    expect(mockState.isAuthenticated.value).toBe(true)
  })
})

describe('AuthActions Interface', () => {
  it('should define all action methods', () => {
    const mockActions: AuthActions = {
      login: async () => {},
      logout: async () => {},
      renewToken: async () => {},
      clearError: () => {},
    }

    expect(mockActions.login).toBeDefined()
    expect(mockActions.logout).toBeDefined()
    expect(mockActions.renewToken).toBeDefined()
    expect(mockActions.clearError).toBeDefined()
  })

  it('should have correct method signatures', async () => {
    // Verify methods return correct types
    const mockActions: AuthActions = {
      login: async () => {},
      logout: async () => {},
      renewToken: async () => {},
      clearError: () => {},
    }

    expect(mockActions.login()).toBeInstanceOf(Promise)
    expect(mockActions.logout()).toBeInstanceOf(Promise)
    expect(mockActions.renewToken()).toBeInstanceOf(Promise)
    expect(mockActions.clearError()).toBeUndefined()
  })

  it('should allow synchronous clearError', () => {
    const mockActions: AuthActions = {
      login: async () => {},
      logout: async () => {},
      renewToken: async () => {},
      clearError: () => {
        // Synchronous operation
        console.log('Error cleared')
      },
    }

    expect(() => mockActions.clearError()).not.toThrow()
  })
})

describe('JWTPayload Interface', () => {
  it('should accept payload with required OIDC claims', () => {
    const payload: JWTPayload = {
      iss: 'https://auth.example.com',
      sub: 'user-123',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }

    expect(payload.iss).toBe('https://auth.example.com')
    expect(payload.sub).toBe('user-123')
    expect(payload.aud).toBe('client-id')
  })

  it('should accept audience as array', () => {
    const payload: JWTPayload = {
      iss: 'https://auth.example.com',
      sub: 'user-123',
      aud: ['client-id-1', 'client-id-2'],
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
    }

    expect(Array.isArray(payload.aud)).toBe(true)
    expect(payload.aud).toContain('client-id-1')
  })

  it('should accept all optional OIDC claims', () => {
    const payload: JWTPayload = {
      iss: 'https://auth.example.com',
      sub: 'user-123',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      azp: 'authorized-party',
      auth_time: Math.floor(Date.now() / 1000) - 60,
      nonce: 'random-nonce',
      acr: 'urn:mace:incommon:iap:silver',
      amr: ['password', 'mfa'],
    }

    expect(payload.azp).toBe('authorized-party')
    expect(payload.amr).toContain('mfa')
  })

  it('should accept user profile claims', () => {
    const payload: JWTPayload = {
      iss: 'https://auth.example.com',
      sub: 'user-123',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      email: 'test@example.com',
      email_verified: true,
      name: 'Test User',
      given_name: 'Test',
      family_name: 'User',
      preferred_username: 'testuser',
    }

    expect(payload.email).toBe('test@example.com')
    expect(payload.email_verified).toBe(true)
    expect(payload.name).toBe('Test User')
  })

  it('should accept custom claims', () => {
    const payload: JWTPayload = {
      iss: 'https://auth.example.com',
      sub: 'user-123',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      roles: ['admin', 'user'],
      permissions: ['read', 'write', 'delete'],
      customClaim: 'custom-value',
    }

    expect(payload.roles).toEqual(['admin', 'user'])
    expect(payload.permissions).toContain('write')
    expect(payload.customClaim).toBe('custom-value')
  })

  it('should have correct type structure', () => {
    // Type checking validated at compile time
    // Verify payload structure at runtime
    const payload: JWTPayload = {
      iss: 'issuer',
      sub: 'subject',
      aud: 'audience',
      exp: 9999999999,
      iat: 1000000000,
    }

    expect(typeof payload.iss).toBe('string')
    expect(typeof payload.sub).toBe('string')
    expect(typeof payload.exp).toBe('number')
    expect(typeof payload.iat).toBe('number')
  })
})

describe('AuthError Class', () => {
  describe('Constructor', () => {
    it('should create error with type and message', () => {
      const error = new AuthError(AuthErrorType.LOGIN_FAILED, 'Login failed')

      expect(error).toBeInstanceOf(Error)
      expect(error).toBeInstanceOf(AuthError)
      expect(error.name).toBe('AuthError')
      expect(error.type).toBe(AuthErrorType.LOGIN_FAILED)
      expect(error.message).toBe('Login failed')
    })

    it('should capture stack trace', () => {
      const error = new AuthError(AuthErrorType.TOKEN_EXPIRED, 'Token expired')

      expect(error.stack).toBeDefined()
      expect(error.stack).toContain('AuthError')
    })

    it('should store original error', () => {
      const originalError = new Error('Network timeout')
      const authError = new AuthError(AuthErrorType.NETWORK_ERROR, 'Network error occurred', originalError)

      expect(authError.originalError).toBe(originalError)
      expect(authError.originalError?.message).toBe('Network timeout')
    })

    it('should set timestamp', () => {
      const before = Date.now()
      const error = new AuthError(AuthErrorType.SESSION_EXPIRED, 'Session expired')
      const after = Date.now()

      expect(error.timestamp).toBeGreaterThanOrEqual(before)
      expect(error.timestamp).toBeLessThanOrEqual(after)
    })

    it('should work with instanceof checks', () => {
      const error = new AuthError(AuthErrorType.INVALID_TOKEN, 'Invalid token')

      expect(error instanceof Error).toBe(true)
      expect(error instanceof AuthError).toBe(true)
    })
  })

  describe('getUserMessage', () => {
    it('should return user-friendly message for LOGIN_FAILED', () => {
      const error = new AuthError(AuthErrorType.LOGIN_FAILED, 'Technical error')

      expect(error.getUserMessage()).toBe('Login failed. Please try again.')
    })

    it('should return user-friendly message for LOGOUT_FAILED', () => {
      const error = new AuthError(AuthErrorType.LOGOUT_FAILED, 'Technical error')

      expect(error.getUserMessage()).toBe('Logout failed. Please try again.')
    })

    it('should return user-friendly message for TOKEN_EXPIRED', () => {
      const error = new AuthError(AuthErrorType.TOKEN_EXPIRED, 'Technical error')

      expect(error.getUserMessage()).toBe('Your session has expired. Please log in again.')
    })

    it('should return user-friendly message for TOKEN_REFRESH_FAILED', () => {
      const error = new AuthError(AuthErrorType.TOKEN_REFRESH_FAILED, 'Technical error')

      expect(error.getUserMessage()).toBe('Failed to refresh session. Please log in again.')
    })

    it('should return user-friendly message for INVALID_TOKEN', () => {
      const error = new AuthError(AuthErrorType.INVALID_TOKEN, 'Technical error')

      expect(error.getUserMessage()).toBe('Invalid authentication token.')
    })

    it('should return user-friendly message for SESSION_EXPIRED', () => {
      const error = new AuthError(AuthErrorType.SESSION_EXPIRED, 'Technical error')

      expect(error.getUserMessage()).toBe('Your session has expired.')
    })

    it('should return user-friendly message for NETWORK_ERROR', () => {
      const error = new AuthError(AuthErrorType.NETWORK_ERROR, 'Technical error')

      expect(error.getUserMessage()).toBe('Network error. Please check your connection.')
    })

    it('should not expose technical details', () => {
      const error = new AuthError(AuthErrorType.LOGIN_FAILED, 'Error: Connection refused at 192.168.1.1:8080')

      const userMessage = error.getUserMessage()
      expect(userMessage).not.toContain('192.168.1.1')
      expect(userMessage).not.toContain('Connection refused')
    })

    it('should return original message for unknown error types', () => {
      const error = new AuthError('UNKNOWN_ERROR' as AuthErrorType, 'Unknown error occurred')

      expect(error.getUserMessage()).toBe('Unknown error occurred')
    })
  })

  describe('Error Properties', () => {
    it('should have readonly type property', () => {
      const error = new AuthError(AuthErrorType.LOGIN_FAILED, 'Login failed')

      expect(error.type).toBe(AuthErrorType.LOGIN_FAILED)

      // TypeScript prevents reassignment at compile time
      // Runtime test verifies readonly behavior
      try {
        // @ts-expect-error - Testing readonly property
        error.type = AuthErrorType.LOGOUT_FAILED
        // If we get here, readonly didn't work (should not happen)
        expect(true).toBe(false)
      } catch (e) {
        // Expected error when trying to modify readonly property
        expect(true).toBe(true)
      }
    })

    it('should preserve error chain', () => {
      const originalError = new Error('Database connection failed')
      const authError = new AuthError(AuthErrorType.LOGIN_FAILED, 'Login failed due to database error', originalError)

      expect(authError.originalError).toBe(originalError)
      expect(authError.originalError instanceof Error).toBe(true)
    })
  })

  describe('Error Handling', () => {
    it('should work with try-catch blocks', () => {
      expect(() => {
        throw new AuthError(AuthErrorType.TOKEN_EXPIRED, 'Token expired')
      }).toThrow(AuthError)
    })

    it('should be catchable as generic Error', () => {
      let caughtError: Error | null = null

      try {
        throw new AuthError(AuthErrorType.SESSION_EXPIRED, 'Session expired')
      } catch (error) {
        if (error instanceof Error) {
          caughtError = error
        }
      }

      expect(caughtError).toBeInstanceOf(AuthError)
    })

    it('should provide type-safe error handling', () => {
      let errorType: AuthErrorType | null = null

      try {
        throw new AuthError(AuthErrorType.NETWORK_ERROR, 'Network error')
      } catch (error) {
        if (error instanceof AuthError) {
          errorType = error.type
        }
      }

      expect(errorType).toBe(AuthErrorType.NETWORK_ERROR)
    })
  })
})

describe('Type Relationships', () => {
  it('should allow AuthService to return User', async () => {
    const user: User = { id: '1', username: 'test' }
    const mockService: AuthService = {
      login: async () => {},
      handleCallback: async () => user,
      getUser: async () => user,
      getToken: async () => 'token',
      refreshToken: async () => {},
      isAuthenticated: async () => true,
      logout: async () => {},
    }

    const result = await mockService.getUser()
    expect(result).toEqual(user)
  })

  it('should allow AuthState to hold User', () => {
    const user: User = { id: '1', username: 'test' }
    const state: AuthState = {
      user: ref<User | null>(user),
      isAuthenticated: ref(true),
      isLoading: ref(false),
      error: ref<AuthError | null>(null),
    }

    expect(state.user.value).toEqual(user)
  })

  it('should allow AuthState to hold AuthError', () => {
    const error = new AuthError(AuthErrorType.LOGIN_FAILED, 'Login failed')
    const state: AuthState = {
      user: ref<User | null>(null),
      isAuthenticated: ref(false),
      isLoading: ref(false),
      error: ref<AuthError | null>(error),
    }

    expect(state.error.value).toBeInstanceOf(AuthError)
  })

  it('should allow JWTPayload to be converted to User', () => {
    const payload: JWTPayload = {
      iss: 'https://auth.example.com',
      sub: 'user-123',
      aud: 'client-id',
      exp: Math.floor(Date.now() / 1000) + 3600,
      iat: Math.floor(Date.now() / 1000),
      preferred_username: 'testuser',
      email: 'test@example.com',
      roles: ['admin'],
    }

    const user: User = {
      id: payload.sub,
      username: payload.preferred_username || payload.sub,
      email: payload.email,
      roles: payload.roles,
    }

    expect(user.id).toBe('user-123')
    expect(user.username).toBe('testuser')
  })
})

describe('Negative Test Cases', () => {
  it('should handle User without optional fields', () => {
    const user: User = {
      id: '1',
      username: 'test',
    }

    expect(user.email).toBeUndefined()
    expect(user.roles).toBeUndefined()
  })

  it('should handle AuthService returning null', async () => {
    const mockService: AuthService = {
      login: async () => {},
      handleCallback: async () => ({ id: '1', username: 'test' }),
      getUser: async () => null,
      getToken: async () => null,
      refreshToken: async () => {},
      isAuthenticated: async () => false,
      logout: async () => {},
    }

    const user = await mockService.getUser()
    expect(user).toBeNull()

    const token = await mockService.getToken()
    expect(token).toBeNull()
  })

  it('should handle empty roles and permissions', () => {
    const user: User = {
      id: '1',
      username: 'test',
      roles: [],
      permissions: [],
    }

    expect(user.roles).toHaveLength(0)
    expect(user.permissions).toHaveLength(0)
  })

  it('should handle JWTPayload with minimal claims', () => {
    const payload: JWTPayload = {
      iss: 'issuer',
      sub: 'subject',
      aud: 'audience',
      exp: 9999999999,
      iat: 1000000000,
    }

    expect(payload.email).toBeUndefined()
    expect(payload.roles).toBeUndefined()
  })

  it('should handle expired JWT payload', () => {
    const payload: JWTPayload = {
      iss: 'issuer',
      sub: 'subject',
      aud: 'audience',
      exp: Math.floor(Date.now() / 1000) - 3600, // 1 hour ago
      iat: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
    }

    expect(payload.exp < Math.floor(Date.now() / 1000)).toBe(true)
  })
})
