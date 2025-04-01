import { Controller, Delete, Get, Post, Query, Param, Req } from "@danet/core";
import { Buffer } from "node:buffer";
import { ResourceService } from "./resource.service.ts";

@Controller("system-portal/dataset/resource")
export class ResourceController {
  constructor(private readonly resourceService: ResourceService) {}

  @Get("list")
  async getResources(@Query("datasetId") datasetId: any) {
    return await this.resourceService.getResources(datasetId);
  }

  @Post()
  async uploadResource(
    @Query("datasetId") datasetId: string,
    @Req() request: Request
  ) {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    const uploadedFile = {
      originalname: file.name,
      buffer: await file.arrayBuffer(),
      mimetype: file.type,
    };
    console.log(`uploadedFile: ${uploadedFile}`);
    if (
      uploadedFile.originalname.includes("\\") ||
      uploadedFile.originalname.includes("/")
    ) {
      throw new Error("Invalid filename");
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
    return await this.resourceService.deleteResource(datasetId, fileName);
  }
}
