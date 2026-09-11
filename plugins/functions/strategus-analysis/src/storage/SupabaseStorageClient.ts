import { env, services } from "../env.ts";

export interface StorageUploadFile {
  fileName: string;
  buffer: Uint8Array;
  mimetype: string;
}

export class StorageError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "StorageError";
    this.statusCode = statusCode;
  }
}

/**
 * Minimal client for the Supabase Storage REST API.
 *
 * Deliberately not routed through portal's supabase-storage controller: that
 * endpoint base64-encodes the whole object on download, which would hold a
 * 500MB zip in memory twice over. Here download hands back the response stream
 * so the route can pipe it straight to the client.
 */
export class SupabaseStorageClient {
  private readonly baseUrl: string;
  private readonly authToken: string;

  constructor() {
    if (!services.supabaseStorage) {
      throw new Error("No url is set for SupabaseStorageClient");
    }
    this.baseUrl = services.supabaseStorage;
    this.authToken = env.SUPABASE_STORAGE_JWT_TOKEN;
  }

  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.authToken}`, ...extra };
  }

  private objectUrl(bucket: string, path: string) {
    return `${this.baseUrl}/object/${bucket}/${path}`;
  }

  async createBucket(name: string, isPublic = false): Promise<void> {
    const response = await fetch(`${this.baseUrl}/bucket`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, public: isPublic }),
    });

    // 409 means the bucket already exists, which is the normal case on every
    // boot after the first.
    if (!response.ok && response.status !== 409) {
      throw new StorageError(
        `Failed to create bucket ${name}: ${response.status} ${await response
          .text()}`,
        502,
      );
    }
  }

  async upload(bucket: string, path: string, file: StorageUploadFile) {
    const response = await fetch(this.objectUrl(bucket, path), {
      method: "POST",
      headers: this.headers({
        "Content-Type": file.mimetype || "application/zip",
        "Cache-Control": "3600",
        "x-upsert": "true",
      }),
      body: file.buffer,
    });

    if (!response.ok) {
      throw new StorageError(
        `Failed to upload ${path}: ${response.status} ${await response.text()}`,
        502,
      );
    }

    return { bucket, path };
  }

  async download(bucket: string, path: string) {
    const response = await fetch(this.objectUrl(bucket, path), {
      method: "GET",
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new StorageError(
        `Failed to download ${path}: ${response.status} ${await response
          .text()}`,
        response.status === 404 ? 404 : 502,
      );
    }

    if (!response.body) {
      throw new StorageError(`Empty response body for ${path}`, 502);
    }

    return {
      readStream: response.body,
      contentType: response.headers.get("content-type") || "application/zip",
    };
  }

  async delete(bucket: string, path: string): Promise<void> {
    const response = await fetch(this.objectUrl(bucket, path), {
      method: "DELETE",
      headers: this.headers(),
    });

    // A missing object is not an error: delete has to stay idempotent so a row
    // can always be removed even when its object is already gone.
    if (!response.ok && response.status !== 404) {
      throw new StorageError(
        `Failed to delete ${path}: ${response.status} ${await response.text()}`,
        502,
      );
    }
  }
}
