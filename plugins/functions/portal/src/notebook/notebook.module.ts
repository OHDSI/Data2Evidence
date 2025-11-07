import { Module } from '@danet/core';
// import { TypeOrmModule } from 'npm:typeorm'
// import { UserArtifactModule } from '../user-artifact/user-artifact.module.ts'
// import { Notebook } from './entity/notebook.entity.ts'
import { DatabaseModule } from '../database/module.ts';
import { NotebookController } from './notebook.controller.ts';
import { NotebookService } from './notebook.service.ts';
import { UserArtifactService } from '../user-artifact/user-artifact.service.ts'

const imports = [DatabaseModule]
const injectables = [NotebookService, UserArtifactService]
@Module({
  imports,
  controllers: [NotebookController],
  injectables
})
export class NotebookModule { }
