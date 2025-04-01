export interface LoginRequest {
  scopes: string[];
  extraQueryParameters: { [q: string]: any };
}

export interface AccessTokenPayload {
  thirdPartyToken?: string;
}
