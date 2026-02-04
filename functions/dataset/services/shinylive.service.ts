import { services } from "../env.ts";

export class ShinyLiveService {
  private readonly PUBLIC_BUCKET = "portal-datasets-graphs";
  private readonly baseUrl: string;

  constructor() {
    this.baseUrl = services.supabaseStorage;
  }

  getPublicUrl(
    datasetId: string,
    type: string,
    name: string,
    language: string,
    subPath: string,
  ): string {
    const basePath = `${datasetId}/dashboard/${datasetId}_${type}_${name}_${language}`;
    return `${this.baseUrl}/object/public/${this.PUBLIC_BUCKET}/${basePath}/${subPath}`;
  }
}
