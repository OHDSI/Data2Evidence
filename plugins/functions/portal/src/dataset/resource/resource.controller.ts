import {
  HttpException,
  Controller,
  Delete,
  Get,
  Middleware,
  Post,
  Query,
  Param,
  Req,
} from "@danet/core";
import { Buffer } from "node:buffer";
import { RequestContextMiddleware } from "../../common/request-context.middleware.ts";
import { ResourceService } from "./resource.service.ts";
import { getResourceUploadConfig } from "./resource-upload.config.ts";

@Middleware(RequestContextMiddleware)
@Controller("system-portal/dataset/resource")
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get("list")
  async getResources(@Query("datasetId") datasetId: string) {
    if (!datasetId) {
      throw new HttpException(400, "Invalid datasetId");
    }
    return await this.resourceService.getResources(datasetId);
  }

  // Upload rules for the Add file dialog, so the UI always matches what the
  // backend enforces.
  @Get("config")
  getUploadConfig() {
    return getResourceUploadConfig();
  }

  // Lets the Add file dialog show the scan result before the user clicks Add.
  // Nothing is stored; the upload itself checks and scans again.
  @Post("check")
  async checkResource(
    @Query("datasetId") datasetId: string,
    @Req() request: Request
  ) {
    const formData = await request.formData();
    const { scan } = await this.resourceService.checkUpload(datasetId, formData.get("file"));
    return { result: scan.status };
  }

  @Post()
  async uploadResource(
    @Query("datasetId") datasetId: string,
    @Req() request: Request
  ) {
    const formData = await request.formData();
    const checked = await this.resourceService.checkUpload(datasetId, formData.get("file"));
    return await this.resourceService.uploadResource(datasetId, checked);
  }

  @Get(":fileName/download")
  async downloadResource(
    @Query("datasetId") datasetId: string,
    @Param("fileName") fileName: string
  ) {
    const result = await this.resourceService.downloadResource(
      datasetId,
      fileName
    );

    // Convert stream to base64 or array buffer
    const chunks = [];
    for await (const chunk of result.readStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const base64Data = buffer.toString("base64");

    return {
      fileName: fileName,
      contentType: result.contentType,
      contentDisposition: result.contentDisposition,
      data: base64Data,
    };
  }

  @Delete(":fileName")
  async deleteResource(
    @Query("datasetId") datasetId: string,
    @Param("fileName") fileName: string
  ) {
    if (!datasetId || !fileName) {
      throw new HttpException(400, "Invalid datasetId or fileName");
    }
    return await this.resourceService.deleteResource(datasetId, fileName);
  }
}
