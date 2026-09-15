// Which identity setup an installation runs. trex is the token issuer in both;
// logto-federated additionally keeps Logto as an upstream sign-in option for
// users who existed before trex.
export type IdpMode = 'trex' | 'logto-federated'

export function resolveIdpMode(raw: string | undefined): IdpMode {
  return raw === 'logto-federated' ? 'logto-federated' : 'trex'
}

/**
 * Whether a usermgmt row found by name may have its subject replaced by the
 * signing-in identity. A row with no subject is simply being linked. A row that
 * has one is left alone in federated mode: the migration owns that re-key, and
 * a name match is not proof two identities are the same person.
 */
export function mayRekeyExistingSubject(currentIdpUserId: string | null | undefined, mode: IdpMode): boolean {
  if (!currentIdpUserId) return true
  return mode === 'trex'
}
