import { HttpException, Injectable, SCOPE } from '@danet/core'
import { EntityManager } from 'npm:typeorm'
import { TransactionRunner } from '../common/data-source/transaction-runner.ts'
import { RequestContextService } from '../common/request-context.service.ts'
import { env } from '../env.ts'
import { createLogger } from '../logger.ts'
import { IFeatureUpdateDto, IPortalPlugin } from '../types.d.ts'
import { FeatureRepository } from './repository/feature.repository.ts'
@Injectable({ scope: SCOPE.REQUEST })
export class FeatureService {
  private readonly NON_PLUGIN_FEATURES = [
    {
      featureFlag: 'atlas',
      name: 'Atlas',
      nameI18nKey: 'FEATURE__ATLAS',
      defaultEnabled: true
    },
    {
      featureFlag: 'pythia',
      name: 'Pythia (Atlas AI assistant)',
      nameI18nKey: 'FEATURE__PYTHIA',
      defaultEnabled: true
    },
    {
      featureFlag: 'datasetFilter',
      name: 'Dataset filter',
      nameI18nKey: 'FEATURE__DATASET_FILTER',
      defaultEnabled: false
    },
    {
      featureFlag: 'datasetSearch',
      name: 'Dataset search',
      nameI18nKey: 'FEATURE__DATASET_SEARCH',
      defaultEnabled: false
    },
    {
      featureFlag: 'fhirServer',
      name: 'Fhir server',
      nameI18nKey: 'FEATURE__FHIR_SERVER',
      defaultEnabled: false
    },
    {
      featureFlag: 'mappingSuggestion',
      name: 'Data mapping AI suggestion',
      nameI18nKey: 'FEATURE__DATA_MAPPING_SUGGESTION',
      defaultEnabled: false
    },
    {
      featureFlag: 'adminOnlySharing',
      name: 'Admin-only sharing',
      nameI18nKey: 'FEATURE__ADMIN_ONLY_SHARING',
      defaultEnabled: false
    },
    {
      featureFlag: 'conceptRecordCounts',
      name: 'Concept record counts',
      nameI18nKey: 'FEATURE__CONCEPT_RECORD_COUNTS',
      defaultEnabled: true
    }
  ]

  private readonly logger = createLogger(this.constructor.name)
  private readonly userId: string | undefined
  private featurePlugins: IPortalPlugin[] = []
  private validFeatures: string[] = []
  private featureMetaMap: Map<string, { name: string; nameI18nKey?: string; defaultEnabled: boolean }> = new Map()

  constructor(
    private readonly transactionRunner: TransactionRunner,
    private readonly featureRepo: FeatureRepository,
    private readonly requestContextService: RequestContextService,
  ) {
    const token = this.requestContextService.getAuthToken();
    this.userId = token?.sub
  }

  private async initializePlugins() {
    const authHeader = this.requestContextService.getOriginalToken() || "";
    
    try {
      const response = await fetch(`${env.TREX_API_URL}/portal/plugin.json`, {
        headers: {
          Authorization: authHeader
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const plugins = await response.json();
      const researcherPlugins = JSON.parse(plugins).researcher || [];
      const systemadminPlugins = JSON.parse(plugins).systemadmin || [];

      this.featurePlugins = [
        ...researcherPlugins.filter(p => Boolean(p.featureFlag)  || "children" in p),
        ...systemadminPlugins.filter(p => Boolean(p.featureFlag))
      ];

      const pluginFeatureFlags: string[] = [];
      this.featureMetaMap = new Map();
      this.featurePlugins.forEach(f => {
        const isVisible = f.visible ?? f.enabled;
        if (isVisible && f.featureFlag) {
          pluginFeatureFlags.push(f.featureFlag);
          this.featureMetaMap.set(f.featureFlag, {
            name: f.name,
            nameI18nKey: f.nameI18nKey,
            defaultEnabled: f.defaultEnabled ?? true
          });
        }
        f.children?.forEach(child => {
          const isChildVisible = child.visible ?? child.enabled;
          if (isChildVisible && child.featureFlag) {
            pluginFeatureFlags.push(child.featureFlag);
            this.featureMetaMap.set(child.featureFlag, {
              name: child.name,
              nameI18nKey: child.nameI18nKey,
              defaultEnabled: child.defaultEnabled ?? true
            });
          }
        });
      });

      this.validFeatures = [
        ...this.NON_PLUGIN_FEATURES.map(f => f.featureFlag),
        ...pluginFeatureFlags
      ];
    } catch (err) {
      this.logger.error(`Error while loading plugin config: ${err}`);
      throw new Error('Error while loading plugin config in FeatureService');
    }
  }

  async getFeatures() {
    await this.initializePlugins();
    const savedFeatures = (await this.featureRepo.getFeatures()).filter(f => this.validFeatures.includes(f.feature))

    const defaultNonPlugins = this.NON_PLUGIN_FEATURES.filter(
      f => !savedFeatures.map(s => s.feature).includes(f.featureFlag)
    )

    const defaultEnabledPluginFlags = this.validFeatures.filter(
      featureFlag =>
        !savedFeatures.map(s => s.feature).includes(featureFlag) &&
        !defaultNonPlugins.map(s => s.featureFlag).includes(featureFlag)
    )

    return [
      ...savedFeatures.map(f => {
        const meta = this.getFeatureMeta(f.feature)
        return { feature: f.feature, name: meta.name, nameI18nKey: meta.nameI18nKey, isEnabled: f.isEnabled }
      }),
      ...defaultNonPlugins.map(f => ({
        feature: f.featureFlag,
        name: f.name,
        nameI18nKey: f.nameI18nKey,
        isEnabled: f.defaultEnabled
      })),
      ...defaultEnabledPluginFlags.map(featureFlag => {
        const meta = this.getFeatureMeta(featureFlag)
        return { feature: featureFlag, name: meta.name, nameI18nKey: meta.nameI18nKey, isEnabled: meta.defaultEnabled }
      })
    ]
  }

  async setFeature(featureUpdateDto: IFeatureUpdateDto) {
    await this.initializePlugins();
    const setFeatureFn = async (entityMgr: EntityManager, featureUpdateDto: IFeatureUpdateDto) => {
      const result: { id: number }[] = []
      for (const feat of featureUpdateDto.features) {
        if (!this.validFeatures.includes(feat.feature)) {
          throw new HttpException(400, `Invalid feature flag: ${feat.feature}`)
        }

        const entity = await this.featureRepo.getFeature(feat.feature)
        if (entity) {
          this.logger.info(`Updating feature ${feat.feature} to ${feat.isEnabled ? 'enabled' : 'disabled'}`)
          entity.isEnabled = feat.isEnabled
          result.push(await this.featureRepo.updateFeature(entityMgr, entity.id, this.addOwner(entity)))
        } else {
          this.logger.info(`Creating feature ${feat.feature} to ${feat.isEnabled ? 'enabled' : 'disabled'}`)
          result.push(await this.featureRepo.insertFeature(entityMgr, this.addOwner(feat, true)))
        }
      }

      return { result }
    }
    return this.transactionRunner.run(setFeatureFn, featureUpdateDto)
  }

  private getFeatureMeta(featureFlag: string) {
    const nonPlugin = this.NON_PLUGIN_FEATURES.find(f => f.featureFlag === featureFlag)
    if (nonPlugin) return nonPlugin
    return this.featureMetaMap.get(featureFlag) ?? { name: featureFlag, defaultEnabled: true }
  }

  private addOwner<T>(object: T, isNewEntity = false) {
    if (isNewEntity) {
      return {
        ...object,
        createdBy: this.userId,
        modifiedBy: this.userId
      }
    }
    return {
      ...object,
      modifiedBy: this.userId
    }
  }
}
