import { BadRequestException, Controller, Delete, Post, Query, Req } from "@danet/core";
import { SupabaseStorageClient } from "./supabase.storage.client.ts";

@Controller("system-portal/supabase-storage")
export class SupabaseStorageController {
  constructor(private readonly storageClient: SupabaseStorageClient) {}

  @Post("upload/csv")
  async uploadFile(
    @Query("nodeId") nodeId: string,
    @Req() request: Request
  ) {
    if (!nodeId) {
      throw new BadRequestException("nodeId query parameter is required");
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      throw new BadRequestException("No file provided");
    }

    // Validate CSV file type
    if (!file.name.toLowerCase().endsWith('.csv')) {
      throw new BadRequestException("Only CSV files are allowed");
    }

    const uploadedFile = {
      originalname: file.name,
      buffer: await file.arrayBuffer(),
      mimetype: file.type || 'text/csv',
    };

    return await this.storageClient.upload(nodeId, uploadedFile, "data-transformation", "data-transformation");
  }

  @Delete("delete/csv")
  async deleteFile(
    @Query("nodeId") nodeId: string,
    @Query("fileName") fileName: string
  ) {
    if (!nodeId) {
      throw new BadRequestException("nodeId query parameter is required");
    }

    if (!fileName) {
      throw new BadRequestException("fileName query parameter is required");
    }

    return await this.storageClient.delete(nodeId, fileName, "data-transformation", "data-transformation");
  }
}
