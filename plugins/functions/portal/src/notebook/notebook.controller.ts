import {
  Body,
  Controller,
  Delete,
  Get,
  Middleware,
  Param,
  Post,
  Put,
  Query,
} from "@danet/core";
import { RequestContextMiddleware } from "../common/request-context.middleware.ts";
import { NotebookBaseDto, NotebookUpdateDto } from "./dto/index.ts";
import { NotebookService } from "./notebook.service.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/notebook")
export class NotebookController {
  constructor(private readonly notebookService: NotebookService) {}

  @Get()
  async getNotebooksByUserId() {
    return await this.notebookService.getNotebooksByUserId();
  }

  @Get("templates")
  async getTemplates() {
    try {
      const result = await this.notebookService.getTemplates();
      return result;
    } catch (error) {
      console.error("Error in getTemplates: ", error);
      throw error;
    }
  }

  @Post()
  async createNotebook(@Body() notebookBaseDto: NotebookBaseDto) {
    const notebookDto: NotebookBaseDto = {
      name: notebookBaseDto.name,
      notebookContent: notebookBaseDto.notebookContent,
    };
    return await this.notebookService.createNotebook(notebookDto);
  }

  @Post("templates/:templateId")
  async createNotebookFromTemplate(
    @Param("templateId") templateId: string,
    @Body() body: { name: string }
  ) {
    try {
      const { name } = body;

      if (!templateId || !name) {
        throw new Error("Template ID and name are required");
      }

      const result = await this.notebookService.createNotebookFromTemplate(
        templateId,
        name
      );
      return result;
    } catch (error) {
      console.error("Error in createNotebookFromTemplate: ", error);
      throw error;
    }
  }

  @Put()
  async updateNotebook(@Body() notebookUpdateDto: NotebookUpdateDto) {
    return await this.notebookService.updateNotebook(notebookUpdateDto);
  }

  @Delete(":id")
  async deleteNotebook(@Param("id") id: string) {
    return await this.notebookService.deleteNotebook(id);
  }

  @Get(":id/remote-diff-check")
  async checkNotebookDiffFromRemote(
    @Param("id") id: string,
    @Query("datasetId") datasetId: string
  ) {
    return await this.notebookService.checkNotebookDiffFromRemote(id);
  }

  @Post(":id/overwrite-from-remote")
  async overwriteNotebookFromRemote(
    @Param("id") id: string,
    @Body() body: { datasetId: string }
  ) {
    return await this.notebookService.overwriteNotebookFromRemote(id);
  }

  @Post("overwrite-all-from-remote")
  async overwriteAllNotebooksFromRemote() {
    return await this.notebookService.overwriteAllNotebooksFromRemote();
  }
}
