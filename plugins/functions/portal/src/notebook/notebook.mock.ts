import { MockType } from 'test/type.mock'
import { NotebookService } from './notebook.service'

export const notebookServiceMockFactory: () => MockType<NotebookService> = jest.fn(() => ({
  getNotebooksByUserId: jest.fn()
}))
