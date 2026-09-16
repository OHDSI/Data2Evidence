export const env = {
  D2E_IDP_MODE: Deno.env.get('D2E_IDP_MODE'),
  LOGTO_ISSUER: Deno.env.get('LOGTO__ISSUER') ?? '',
  LOGTO_UPSTREAM_CLIENT_ID: Deno.env.get('D2E__LOGTO_UPSTREAM__CLIENT_ID') ?? '',
  LOGTO_UPSTREAM_CLIENT_SECRET: Deno.env.get('D2E__LOGTO_UPSTREAM__CLIENT_SECRET') ?? '',
  // The public origin; its /oidc/auth is Logto's authorize endpoint through the gateway.
  PUBLIC_ORIGIN: Deno.env.get('TREX_OIDC_ISSUER') ?? '',
  TREX_FEDERATION_ADMIN_URL: Deno.env.get('TREX__FEDERATION_ADMIN_URL') ?? '',
  TREX_ROLES_ADMIN_URL: Deno.env.get('TREX__ADMIN_URL') ?? '',
  SERVICE_ROLE_KEY: Deno.env.get('TREX__SERVICE_ROLE_KEY') || Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '',
  USER_DOMAIN: Deno.env.get('IDP__INITIAL_USER__DOMAIN') ?? 'd2e.local'
}
