export interface LoginRequest {
  scopes: string[];
  extraQueryParameters: { [q: string]: any };
}
