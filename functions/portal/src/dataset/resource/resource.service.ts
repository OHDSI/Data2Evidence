import { Injectable } from "@danet/core";
import { SupabaseStorageClient } from "../../supabase-storage/supabase.storage.client.ts";

@Injectable()
export class ResourceService {
  constructor(private readonly storageClient: SupabaseStorageClient) {}

  async getResources(datasetId: string) {
    const resources = await this.storageClient.list(datasetId);
    return {
      id: datasetId,
      resources,
    };
  }

  downloadResource(datasetId: string, fileName: string) {
    return this.storageClient.download(datasetId, fileName);
  }

  uploadResource(datasetId: string, file: any) {
    return this.storageClient.upload(datasetId, file);
  }

  deleteResource(datasetId: string, fileName: string) {
    return this.storageClient.delete(datasetId, fileName);
  }
}
