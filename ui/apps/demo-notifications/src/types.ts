export interface PortalProps {
  appId?: string;
  username?: string;
  datasetId?: string;
  getToken?: () => Promise<string>;
  features?: Record<string, boolean>;
  featuresLoading?: boolean;
  locale?: string;
  autoMount?: boolean;
  containerId?: string;
  [key: string]: any;
}

export interface NotificationDrawerProps {
  message: string;
  source: string;
  timestamp: string;
  onClose?: () => void;
}
