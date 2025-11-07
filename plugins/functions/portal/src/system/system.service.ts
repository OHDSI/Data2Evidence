import { Injectable } from '@danet/core';
import { env } from '../env.ts';
import { createLogger } from '../logger.ts';
import { RequestContextService } from '../common/request-context.service.ts';

@Injectable()
export class SystemService {
  private readonly logger = createLogger(this.constructor.name);
  private readonly authHeader: string;

  constructor(private readonly requestContextService: RequestContextService) {
    this.authHeader = this.requestContextService.getOriginalToken() || "";
  }

  async getSystemFeatures() {
    try {
      const response = await fetch(`${env.TREX_API_URL}/portal/plugin.json`, {
        headers: {
          Authorization: this.authHeader
        }
      });

      if (!response.ok) {
        throw new Error(`Error getting plugins from trex-api: HTTP error! status: ${response.status}`);
      }

      const plugins = await response.json();
      const systemAdminPlugins = JSON.parse(plugins).systemadmin || [];
      const enabledFeatures = systemAdminPlugins.filter(p => p.enabled || false);
      return enabledFeatures.map(f => {
        return { feature: f.featureFlag, enabled: f.enabled };
      });
    } catch (err) {
      this.logger.error(`Error while loading plugin config: ${err}`);
      throw new Error('Error while loading plugin config in SystemService');
    }
  }
}
