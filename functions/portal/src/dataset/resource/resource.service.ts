import { Injectable } from "@danet/core";
import { SupabaseStorageClient } from "../../supabase-storage/supabase.storage.client.ts";
import { MinioClient } from "../../minio/minio.client.ts";

@Injectable()
export class ResourceService {
  // constructor(private readonly storageClient: SupabaseStorageClient) {}
  constructor(private readonly minioClient: MinioClient) {}
  

  async getResources(datasetId: string) {
    // const resources = await this.storageClient.list(datasetId);
    const resources = await this.minioClient.list(datasetId);
    return {
      id: datasetId,
      resources
    };
  }

  downloadResource(datasetId: string, fileName: string) {
    // return this.storageClient.download(datasetId, fileName);
    return this.minioClient.download(datasetId, fileName);
  }

  uploadResource(datasetId: string, file: any) {
    // return this.storageClient.upload(datasetId, file);
    return this.minioClient.upload(datasetId, file);
  }

  deleteResource(datasetId: string, fileName: string) {
    // return this.storageClient.delete(datasetId, fileName);
    return this.minioClient.delete(datasetId, fileName);
  }
}
