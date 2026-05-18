import { z } from 'zod';

import { oidcPromptsGuard } from '@logto/connector-kit';

export const entraExternalIdConfigGuard = z.object({
  clientId: z.string(),
  clientSecret: z.string(),
  tenantSubdomain: z.string(),
  tenantId: z.string(),
  prompts: oidcPromptsGuard,
  scopes: z.string().optional(),
});

export type EntraExternalIdConfig = z.infer<typeof entraExternalIdConfigGuard>;

export const idTokenClaimsGuard = z
  .object({
    sub: z.string(),
    email: z.string().optional(),
    emails: z.array(z.string()).optional(),
    name: z.string().optional(),
    given_name: z.string().optional(),
    family_name: z.string().optional(),
    preferred_username: z.string().optional(),
  })
  .passthrough();

export type IdTokenClaims = z.infer<typeof idTokenClaimsGuard>;

export const authResponseGuard = z.object({
  code: z.string(),
  redirectUri: z.string(),
});
