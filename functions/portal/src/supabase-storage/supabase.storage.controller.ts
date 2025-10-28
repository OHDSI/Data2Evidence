import {
  HttpException,
  Controller,
  Delete,
  Get,
  Post,
  Query,
  Req,
} from "@danet/core";
import { Buffer } from "node:buffer";
import { SupabaseStorageClient } from "./supabase.storage.client.ts";

@Controller("system-portal/supabase-storage")
export class SupabaseStorageController {
  constructor(private readonly storageClient: SupabaseStorageClient) {}

  @Post("upload/csv")
  async uploadFile(@Query("nodeId") nodeId: string, @Req() request: Request) {
    if (!nodeId) {
      throw new HttpException(400, "nodeId query parameter is required");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new HttpException(400, "No file provided");
    }

    // Validate CSV file type
    if (!file.name.toLowerCase().endsWith(".csv")) {
      throw new HttpException(400, "Only CSV files are allowed");
    }

    const uploadedFile = {
      originalname: file.name,
      buffer: await file.arrayBuffer(),
      mimetype: file.type || "text/csv",
    };

    return await this.storageClient.upload(
      nodeId,
      uploadedFile,
      "data-transformation",
      "data-transformation"
    );
  }

  @Get("get/csv")
  async getFile(
    @Query("nodeId") nodeId: string,
    @Query("fileName") fileName: string
  ) {
    if (!nodeId) {
      throw new HttpException(400, "nodeId query parameter is required");
    }

    if (!fileName) {
      throw new HttpException(400, "fileName query parameter is required");
    }

    const result = await this.storageClient.download(
      nodeId,
      fileName,
      "data-transformation",
      "data-transformation"
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

  @Delete("delete/csv")
  async deleteFile(
    @Query("nodeId") nodeId: string,
    @Query("fileName") fileName: string
  ) {
    if (!nodeId) {
      throw new HttpException(400, "nodeId query parameter is required");
    }

    if (!fileName) {
      throw new HttpException(400, "fileName query parameter is required");
    }

    return await this.storageClient.delete(
      nodeId,
      fileName,
      "data-transformation",
      "data-transformation"
    );
  }
}
