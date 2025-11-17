export interface PluginProps {
  name: string;
  mountParcel: any;
  singleSpa: any;
  authContext: AuthContext;
  messageBus: PluginMessageBus;
}

export interface AuthContext {
  user: {
    id: string;
    username: string;
    email?: string;
    permissions: string[];
  } | null;
  token: string | null;
  isAuthenticated: boolean;
  hasPermission(permission: string): boolean;
}

export interface PluginMessageBus {
  send<T = any>(type: string, payload: T): void;
  request<TRequest = any, TResponse = any>(
    type: string,
    payload: TRequest
  ): Promise<TResponse>;
  subscribe<T = any>(
    type: string,
    callback: (payload: T) => void
  ): () => void;
}

export interface AuthProxyConfig {
  issuer: string;
  clientId: string;
  scopes: string[];
  redirectUri: string;
}

export interface SessionStats {
  activeUsers: number;
  timestamp: string;
}

export interface HealthStatus {
  status: string;
  timestamp: string;
  uptime?: number;
}
