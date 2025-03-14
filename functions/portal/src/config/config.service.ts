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

  async getConfigByType(type: string): Promise<Config | null> {
    try {
      return await this.configRepo.findOneOrFail(type);
    } catch (error) {
      this.logger.error(`Error getting config of type ${type}: ${error}`);
      throw new InternalServerErrorException();
    }
  }

  async getConfigValuesByTypes(types: string[]): Promise<Config[] | null> {
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
          await this.configRepo.update(
            { type: configUpdateDto.type },
            this.addOwner(configUpdateDto)
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
