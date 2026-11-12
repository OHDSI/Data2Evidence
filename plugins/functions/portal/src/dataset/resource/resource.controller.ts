import {
  HttpException,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Param,
  Req,
} from "@danet/core";
import { Buffer } from "node:buffer";
import { ResourceService } from "./resource.service.ts";
import { getResourceUploadConfig } from "./resource-upload.config.ts";
import { validateResourceFile } from "./resource-upload.validation.ts";

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

  @Post()
  async uploadResource(
    @Query("datasetId") datasetId: string,
    @Req() request: Request
  ) {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) {
      throw new HttpException(400, "No file was uploaded");
    }

    // Same rules as the Add file dialog, in case its check was bypassed.
    const config = getResourceUploadConfig();
    const buffer = await file.arrayBuffer();
    const validationError = validateResourceFile(
      file,
      config,
      new Uint8Array(buffer, 0, Math.min(buffer.byteLength, config.maxFileSizeBytes)),
    );
    if (validationError) {
      throw new HttpException(400, validationError);
    }

    const uploadedFile = {
      originalname: file.name,
      buffer,
      mimetype: file.type,
    };
    if (
      uploadedFile.originalname.includes("\\") ||
      uploadedFile.originalname.includes("/")
    ) {
      throw new HttpException(400, "Invalid filename");
    }

    return await this.resourceService.uploadResource(datasetId, uploadedFile);
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
