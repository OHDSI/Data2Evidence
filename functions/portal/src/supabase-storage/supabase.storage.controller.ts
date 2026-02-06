import {
  Controller,
  Delete,
  Get,
  HttpException,
  Post,
  Query,
  Req,
} from "@danet/core";
import { Buffer } from "node:buffer";
import { SupabaseStorageClient } from "./supabase.storage.client.ts";

@Controller("system-portal/supabase-storage")
export class SupabaseStorageController {
  constructor(private readonly storageClient: SupabaseStorageClient) {}

  @Get("list/file")
  async listFiles(@Query("nodeId") nodeId: string) {
    if (!nodeId) {
      throw new HttpException(400, "nodeId query parameter is required");
    }

    return await this.storageClient.list(
      nodeId,
      "data-transformation",
      "data-transformation"
    );
  }

  @Post("upload/file")
  async uploadFile(@Query("nodeId") nodeId: string, @Req() request: Request) {
    if (!nodeId) {
      throw new HttpException(400, "nodeId query parameter is required");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new HttpException(400, "No file provided");
    }

    const uploadedFile = {
      originalname: file.name,
      buffer: await file.arrayBuffer(),
      mimetype: file.type || "application/octet-stream",
    };

    return await this.storageClient.upload(
      nodeId,
      uploadedFile,
      "data-transformation",
      "data-transformation"
    );
  }

  @Get("get/file")
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

  @Delete("delete/file")
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

  @Post("strategus-results/upload")
  async uploadStrategusResults(
    @Query("bucket") bucket: string,
    @Query("path") path: string,
    @Req() request: Request
  ) {
    if (!bucket) {
      throw new HttpException(400, "bucket query parameter is required");
    }

    if (!path) {
      throw new HttpException(400, "path query parameter is required");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new HttpException(400, "No file provided");
    }

    const uploadedFile = {
      originalname: file.name,
      buffer: await file.arrayBuffer(),
      mimetype: file.type || "application/zip",
    };

    return await this.storageClient.uploadDirect(bucket, path, uploadedFile);
  }

  @Get("strategus-results/list")
  async listStrategusResults(
    @Query("bucket") bucket: string,
    @Query("prefix") prefix: string
  ) {
    if (!bucket) {
      throw new HttpException(400, "bucket query parameter is required");
    }

    if (!prefix) {
      throw new HttpException(400, "prefix query parameter is required");
    }

    return await this.storageClient.listByPrefix(bucket, prefix);
  }

  @Get("strategus-results/download")
  async downloadStrategusResults(
    @Query("bucket") bucket: string,
    @Query("path") path: string
  ) {
    if (!bucket) {
      throw new HttpException(400, "bucket query parameter is required");
    }

    if (!path) {
      throw new HttpException(400, "path query parameter is required");
    }

    const result = await this.storageClient.downloadDirect(bucket, path);

    // Convert stream to base64 or array buffer
    const chunks = [];
    for await (const chunk of result.readStream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);
    const base64Data = buffer.toString("base64");

    return {
      fileName: path.split("/").pop(),
      contentType: result.contentType,
      contentDisposition: result.contentDisposition,
      data: base64Data,
    };
  }

  @Delete("strategus-results/delete")
  async deleteStrategusResults(
    @Query("bucket") bucket: string,
    @Query("path") path: string
  ) {
    if (!bucket) {
      throw new HttpException(400, "bucket query parameter is required");
    }

    if (!path) {
      throw new HttpException(400, "path query parameter is required");
    }

    return await this.storageClient.deleteDirect(bucket, path);
  }
}
