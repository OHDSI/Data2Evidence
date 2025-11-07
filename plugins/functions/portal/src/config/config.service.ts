import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  SCOPE,
} from "@danet/core";
import { RequestContextService } from "../common/request-context.service.ts";
import { createLogger } from "../logger.ts";
import { IConfig, IConfigUpdateDto } from "../types.d.ts";
import { Config } from "./entity/config.entity.ts";
import { ConfigRepository } from "./repository/config.repository.ts";
import {
  PUBLIC_CONFIG_TYPES,
  REDACTED_TEXT,
  SECRET_CONFIG_TYPES,
  PAT_SECRET_CONFIG_TYPES,
} from "../common/const.ts";

@Injectable({ scope: SCOPE.REQUEST })
export class ConfigService {
  private readonly logger = createLogger(this.constructor.name);
  private readonly userId: string | undefined;

  constructor(
    private configRepo: ConfigRepository,
    private requestContextService: RequestContextService
  ) {
    this.userId = this.requestContextService.getAuthToken()?.sub;
  }

  async getConfigValuesByTypes(
    types: string[]
  ): Promise<Record<string, string>> {
    try {
      const configs = await this.configRepo.findByTypes(types);
      const parsedConfigs = configs.reduce(
        (acc: { [key: string]: Config }, config: Config) => ({
          ...acc,
          [config.type]: config.value,
        }),
        {}
      );
      return parsedConfigs;
    } catch (error) {
      this.logger.error(
        `Error getting config of types ${types.toString()}: ${error}`
      );
      throw new InternalServerErrorException();
    }
  }

  async getPublicConfigValuesByTypes(
    types: string[]
  ): Promise<Record<string, string>> {
    const publicTypes = types.filter((type: string) =>
      PUBLIC_CONFIG_TYPES.includes(type)
    );
    return this.getConfigValuesByTypes(publicTypes);
  }

  async getRedactedConfigValuesByTypes(
    types: string[]
  ): Promise<Record<string, string>> {
    const configs = await this.getConfigValuesByTypes(types);
    return Object.entries(configs).reduce((acc, [type, value]) => {
      let redactedValue = value;
      const isSecret = SECRET_CONFIG_TYPES.includes(type);
      const isPatSecret = PAT_SECRET_CONFIG_TYPES.includes(type);

      if (isSecret && value) {
        redactedValue = REDACTED_TEXT;
      } else if (isPatSecret && value) {
        try {
          const parsedValue = JSON.parse(value);
          redactedValue = JSON.stringify({
            ...parsedValue,
            pat: parsedValue.pat ? REDACTED_TEXT : "",
          });
        } catch (_e) {
          redactedValue = REDACTED_TEXT;
        }
      }

      acc[type] = redactedValue;
      return acc;
    }, {} as Record<string, string>);
  }

  async updateConfig(configUpdateDto: IConfigUpdateDto): Promise<IConfig> {
    try {
      await this.configRepo.update(
        { type: configUpdateDto.type },
        this.addOwner(configUpdateDto)
      );
      this.logger.info(`Config of type: ${configUpdateDto.type} updated`);
      return configUpdateDto;
    } catch (error) {
      if (error.name === "EntityNotFoundError") {
        throw new NotFoundException();
      }
      throw error;
    }
  }

  async insertOrUpdateConfigs(configUpdateDtos: IConfigUpdateDto[]) {
    await Promise.all(
      configUpdateDtos.map(async (configUpdateDto) => {
        const config = await this.configRepo.findOne(configUpdateDto.type);
        if (config) {
          let safeValue = configUpdateDto.value;
          const isSecret = SECRET_CONFIG_TYPES.includes(configUpdateDto.type);
          const isPatSecret = PAT_SECRET_CONFIG_TYPES.includes(
            configUpdateDto.type
          );

          if (isSecret && configUpdateDto.value === REDACTED_TEXT) {
            safeValue = config.value;
          } else if (isPatSecret && configUpdateDto.value) {
            try {
              const parsedValue = JSON.parse(configUpdateDto.value);
              if (parsedValue.pat === REDACTED_TEXT) {
                const originalValue = JSON.parse(config.value);
                safeValue = JSON.stringify({
                  ...parsedValue,
                  pat: originalValue.pat,
                });
              }
            } catch (_e) {
              safeValue = configUpdateDto.value;
            }
          }

          await this.configRepo.update(
            { type: configUpdateDto.type },
            this.addOwner({ ...configUpdateDto, value: safeValue })
          );
        } else {
          await this.configRepo.save(this.addOwner(configUpdateDto, true));
        }
      })
    );
    return;
  }

  private addOwner<T>(object: T, isNewEntity = false) {
    if (isNewEntity) {
      return {
        ...object,
        createdBy: this.userId,
        modifiedBy: this.userId,
      };
    }
    return {
      ...object,
      modifiedBy: this.userId,
    };
  }
}
