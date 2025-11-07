export interface TokenClaimState {
  sub: string | null;
  oid: string | null;
  name: string | null;
  username: string | null;
  email: string | null;
  exp: number;
  [prop: string]: any;
}

export interface TokenState {
  idToken: string | null;
  idTokenClaims: TokenClaimState;
}
