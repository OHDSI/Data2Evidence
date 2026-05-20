import { Test, TestingModule } from '@nestjs/testing'
import { NotebookController } from './notebook.controller'
import { notebookServiceMockFactory } from './notebook.mock'
import { NotebookService } from './notebook.service'

describe('NotebookController', () => {
  let controller: NotebookController

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotebookController],
      providers: [{ provide: NotebookService, useFactory: notebookServiceMockFactory }]
    }).compile()

    controller = module.get<NotebookController>(NotebookController)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })
})
