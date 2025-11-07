import { Inject, Injectable } from '@danet/core';
import { Repository } from 'npm:typeorm';
import { DATABASE } from '../../database/module.ts';
import { PostgresService } from '../../database/postgres.service.ts';
import { UserArtifactGroup } from '../entity/user-artifact-group.entity.ts';

@Injectable()
export class UserArtifactGroupRepository{
  private repository: Repository<UserArtifactGroup> | null = null;
  constructor(@Inject(DATABASE) private dbService: PostgresService) { }

  private async getRepository() {
    if (!this.repository) {
      const dataSource = await this.dbService.getDataSourceAsync();
      this.repository = dataSource.getRepository(UserArtifactGroup);
    }
    return this.repository;
  }

  async findOne(userId: string): Promise<UserArtifactGroup | null> {
    const repository = await this.getRepository()
    return await repository.findOne({
      where: {
        userId: userId
      }
    });
  }

  async create(entity: Partial<UserArtifactGroup>): Promise<UserArtifactGroup> {
    const repository = await this.getRepository()
    return await repository.create(entity)
  }

  async save(entity: Partial<UserArtifactGroup>): Promise<UserArtifactGroup> {
    const repository = await this.getRepository()
    return await repository.save(entity)
  }

  async delete(userId: string): Promise<void> {
    const repository = await this.getRepository()
    await repository.delete({ userId })
  }
}