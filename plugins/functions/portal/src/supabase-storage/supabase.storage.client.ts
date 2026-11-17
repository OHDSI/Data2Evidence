import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from "@danet/core";
import { contentType } from "mime-types";
import { env, services } from "../env.ts";
import { isBucketAlreadyExists, isBucketNotFound } from "./bucket.util.ts";

interface UploadFile {
  originalname: string;
  buffer: ArrayBuffer | Uint8Array;
  mimetype: string;
}

interface StorageObject {
  id: string;
  name: string;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
  last_accessed_at: string;
}

@Injectable()
export class SupabaseStorageClient {
  private readonly DEFAULT_BUCKET = "portal-datasets-resources";
  private readonly baseUrl: string;
  private readonly authToken: string;
  private static isInitialized = false;
  // Buckets this portal owns, created on demand before a write. Names passed in
  // by callers (e.g. the strategus-results ?bucket= param) are never created.
  private static readonly managedBuckets = new Map<string, boolean>();
  // bucket -> creation in flight or done. A failed attempt is dropped so the
  // next write retries: storage starts after trex, so the boot attempt can 502.
  private static readonly ensuredBuckets = new Map<string, Promise<void>>();

  constructor() {
    this.baseUrl = services.supabaseStorage;
    this.authToken = env.SUPABASE_STORAGE_JWT_TOKEN;

    // Only initialize once for the singleton
    if (!SupabaseStorageClient.isInitialized) {
      SupabaseStorageClient.isInitialized = true;

      const envObj = Deno.env.toObject();
      const buckets: Array<[string | undefined, boolean]> = [
        [this.DEFAULT_BUCKET, false],
        [envObj.DATA_TRANSFORMATION_BUCKET, false],
        ["strategus-results", false],
        ["portal-datasets-graphs", true],
      ];
      for (const [name, isPublic] of buckets) {
        if (name) {
          SupabaseStorageClient.managedBuckets.set(name, isPublic);
        }
      }

      // Warm up the buckets; writes ensure them again.
      for (const name of SupabaseStorageClient.managedBuckets.keys()) {
        this.ensureBucket(name).catch((e) =>
          console.warn(`Bucket ${name} not created at startup, retrying on first write: ${e}`)
        );
      }
    }
  }

  // Pages through list-v2. With a delimiter only the direct children of
  // `prefix` are returned; without one the listing is recursive.
  private async listObjects(
    bucket: string,
    prefix: string,
    options: {
      withDelimiter?: boolean;
      sortBy?: { column: "name" | "created_at" | "updated_at"; order: "asc" | "desc" };
    } = {},
  ): Promise<StorageObject[]> {
    const objects: StorageObject[] = [];
    let cursor: string | undefined;
    do {
      const response = await fetch(
        `${this.baseUrl}/object/list-v2/${encodeURIComponent(bucket)}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prefix,
            limit: 1000,
            cursor,
            with_delimiter: options.withDelimiter ?? false,
            sortBy: options.sortBy,
          }),
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        if (isBucketNotFound(response.status, errorText)) {
          return [];
        }
        throw new Error(
          `Error listing ${bucket}/${prefix}: ${response.status} - ${errorText}`,
        );
      }
      const page = await response.json();
      objects.push(...page.objects);
      cursor = page.hasNext ? page.nextCursor : undefined;
    } while (cursor);
    return objects;
  }

  // Creates a managed bucket once per worker; no-op for other names.
  private ensureBucket(bucketName: string): Promise<void> {
    const isPublic = SupabaseStorageClient.managedBuckets.get(bucketName);
    if (isPublic === undefined) {
      return Promise.resolve();
    }
    let pending = SupabaseStorageClient.ensuredBuckets.get(bucketName);
    if (!pending) {
      pending = this.createBucket(bucketName, isPublic).catch((e) => {
        SupabaseStorageClient.ensuredBuckets.delete(bucketName);
        throw e;
      });
      SupabaseStorageClient.ensuredBuckets.set(bucketName, pending);
    }
    return pending;
  }

  private async createBucket(bucketName: string, isPublic = false) {
    const response = await fetch(`${this.baseUrl}/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: bucketName,
        public: isPublic,
      }),
    });
    const errorText = response.ok ? "" : await response.text();
    if (!response.ok && !isBucketAlreadyExists(response.status, errorText)) {
      throw new Error(`Error creating bucket ${bucketName}: ${response.status} - ${errorText}`);
    }
    console.info(`Bucket ${bucketName} created or already exists`);
  }

  async list(
    id: string,
    bucketName?: string,
    pathType: "dataset" | "data-transformation" = "dataset"
  ) {
    const targetBucket = bucketName || this.DEFAULT_BUCKET;

    try {
      let folderPath;

      if (pathType === "data-transformation") {
        folderPath = this.getDataTransformationFolderPath(id);
      } else {
        folderPath = this.getDatasetFolderPath(id);
      }

      const files = await this.listObjects(targetBucket, `${folderPath}/`, {
        withDelimiter: true,
      });

      if (pathType === "data-transformation") {
        console.log(
          `Found ${files.length} files for data-transformation node ${id}`
        );
      } else {
        console.log(`Found ${files.length} files for dataset ${id}`);
      }

      return files.map((file) => {
        const fullPath = file.name;
        const fileName = fullPath.substring(fullPath.lastIndexOf("/") + 1);
        const nameArr = fileName.split(".");
        const fileType =
          nameArr.length > 1
            ? nameArr[nameArr.length - 1].toUpperCase()
            : "UNKNOWN";

        return {
          name: fileName,
          size: this.formatBytes(Number(file.metadata?.size) || 0),
          type: fileType,
        };
      });
    } catch (e) {
      console.error(
        `Error in list method: ${e instanceof Error ? e.message : String(e)}`
      );
      return [];
    }
  }

  async download(
    datasetId: string,
    fileName: string,
    bucketName?: string,
    pathType: "dataset" | "data-transformation" = "dataset"
  ) {
    try {
      const targetBucket = bucketName || this.DEFAULT_BUCKET;

      const filePath = this.getFilePath(datasetId, fileName, pathType);
      console.log(`Downloading file: ${filePath} from bucket: ${targetBucket}`);

      // Direct request to download file
      const url = `${this.baseUrl}/object/${targetBucket}/${filePath}`;
      console.log(`Making request to: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error downloading file: ${response.status} - ${errorText}`
        );

        if (response.status === 404) {
          throw new BadRequestException(`Invalid file name: ${fileName}`);
        }

        throw new Error(
          `Storage service returned ${response.status}: ${errorText}`
        );
      }

      const blob = await response.blob();
      const fileExtension = fileName.substring(fileName.lastIndexOf("."));
      const mimeType = contentType(fileExtension) || "application/octet-stream";

      return {
        readStream: blob.stream(),
        contentType: mimeType,
        contentDisposition: `attachment; filename="${fileName}"`,
      };
    } catch (e) {
      if (
        e instanceof BadRequestException ||
        e instanceof InternalServerErrorException
      ) {
        throw e;
      }
      console.error(
        `Error in download method: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      console.error(
        `Stack trace: ${e instanceof Error ? e.stack : "No stack trace"}`
      );
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage object download: ${fileName}`
      );
    }
  }

  async upload(
    id: string,
    file: UploadFile,
    bucketName?: string,
    pathType: "dataset" | "data-transformation" = "dataset"
  ) {
    const fileName = file.originalname;
    const targetBucket = bucketName || this.DEFAULT_BUCKET;

    try {
      await this.ensureBucket(targetBucket);
      const filePath = this.getFilePath(id, fileName, pathType);
      console.log(`Uploading file: ${filePath} to bucket: ${targetBucket}`);

      const url = `${this.baseUrl}/object/${targetBucket}/${filePath}`;
      console.log(`Making request to: ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": file.mimetype || "application/octet-stream",
          "Cache-Control": "3600",
          "x-upsert": "true", // For overwriting existing files
        },
        body: file.buffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error uploading file: ${response.status} - ${errorText}`
        );
        throw new Error(
          `Storage service returned ${response.status}: ${errorText}`
        );
      }

      console.info(`File ${fileName} successfully uploaded to ${filePath}`);
      return {
        status: "success",
        filePath,
        bucket: targetBucket,
      };
    } catch (e) {
      console.error(
        `Error in upload method: ${e instanceof Error ? e.message : String(e)}`
      );
      console.error(
        `Stack trace: ${e instanceof Error ? e.stack : "No stack trace"}`
      );
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage object upload: ${fileName}`
      );
    }
  }

  async delete(
    id: string,
    fileName: string,
    bucketName?: string,
    pathType: "dataset" | "data-transformation" = "dataset"
  ) {
    const targetBucket = bucketName || this.DEFAULT_BUCKET;

    try {
      const filePath = this.getFilePath(id, fileName, pathType);
      console.log(`Deleting file: ${filePath} from bucket: ${targetBucket}`);

      const url = `${this.baseUrl}/object/${targetBucket}/${filePath}`;
      console.log(`Making request to: ${url}`);

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error deleting file: ${response.status} - ${errorText}`);
        throw new Error(
          `Storage service returned ${response.status}: ${errorText}`
        );
      }

      console.info(
        `File ${filePath} successfully deleted from ${targetBucket}`
      );
      return {
        status: "success",
        filePath,
        bucket: targetBucket,
      };
    } catch (e) {
      console.error(
        `Error in delete method: ${e instanceof Error ? e.message : String(e)}`
      );
      console.error(
        `Stack trace: ${e instanceof Error ? e.stack : "No stack trace"}`
      );
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage object deletion: ${fileName}`
      );
    }
  }

  private getDatasetFolderPath(datasetId: string) {
    return `datasets/${datasetId}`;
  }

  private getDataTransformationFolderPath(nodeId: string) {
    return `data-transformation/${nodeId}`;
  }

  private getFilePath(
    id: string,
    fileName: string,
    pathType: "dataset" | "data-transformation" = "dataset"
  ) {
    if (pathType === "data-transformation") {
      return `${this.getDataTransformationFolderPath(id)}/${fileName}`;
    } else {
      return `${this.getDatasetFolderPath(id)}/${fileName}`;
    }
  }

  private formatBytes(bytes, decimals = 1) {
    if (!+bytes) return "0 Byte";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }

  async uploadDirect(bucket: string, path: string, file: UploadFile) {
    try {
      await this.ensureBucket(bucket);
      console.log(`Uploading file directly: ${path} to bucket: ${bucket}`);

      const url = `${this.baseUrl}/object/${bucket}/${path}`;
      console.log(`Making request to: ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": file.mimetype || "application/octet-stream",
          "Cache-Control": "3600",
          "x-upsert": "true",
        },
        body: file.buffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error uploading file: ${response.status} - ${errorText}`
        );
        throw new Error(
          `Storage service returned ${response.status}: ${errorText}`
        );
      }

      console.info(`File successfully uploaded to ${path}`);
      return {
        status: "success",
        filePath: path,
        bucket: bucket,
      };
    } catch (e) {
      console.error(
        `Error in uploadDirect method: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      console.error(`Failed to upload to path: ${path}`);
      throw new InternalServerErrorException();
    }
  }

  async downloadDirect(bucket: string, path: string) {
    try {
      console.log(`Downloading file directly: ${path} from bucket: ${bucket}`);

      const url = `${this.baseUrl}/object/${bucket}/${path}`;
      console.log(`Making request to: ${url}`);

      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(
          `Error downloading file: ${response.status} - ${errorText}`
        );
        throw new Error(
          `Storage service returned ${response.status}: ${errorText}`
        );
      }

      const body = response.body;
      if (!body) {
        throw new Error("Response body is null");
      }

      console.info(`File successfully downloaded from ${path}`);
      return {
        readStream: body,
        contentType:
          response.headers.get("content-type") || "application/octet-stream",
        contentDisposition: response.headers.get("content-disposition") || "",
      };
    } catch (e) {
      console.error(
        `Error in downloadDirect method: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      console.error(`Failed to download from path: ${path}`);
      throw new InternalServerErrorException();
    }
  }

  async deleteDirect(bucket: string, path: string) {
    try {
      console.log(`Deleting file directly: ${path} from bucket: ${bucket}`);

      const url = `${this.baseUrl}/object/${bucket}/${path}`;
      console.log(`Making request to: ${url}`);

      const response = await fetch(url, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error deleting file: ${response.status} - ${errorText}`);

        if (
          response.status === 404 ||
          errorText.includes("not_found") ||
          errorText.includes("Object not found")
        ) {
          throw new HttpException(404, `File not found: ${path}`);
        }

        throw new Error(
          `Storage service returned ${response.status}: ${errorText}`
        );
      }

      console.info(`File successfully deleted from ${path}`);
      return {
        status: "success",
        message: `File ${path} deleted successfully`,
      };
    } catch (e) {
      console.error(
        `Error in deleteDirect method: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      console.error(`Failed to delete from path: ${path}`);

      if (e instanceof HttpException) {
        throw e;
      }

      throw new InternalServerErrorException();
    }
  }

  async listByPrefix(bucket: string, prefix: string) {
    try {
      console.log(`Listing files in bucket: ${bucket} with prefix: ${prefix}`);

      const files = (
        await this.listObjects(bucket, prefix, {
          sortBy: { column: "created_at", order: "desc" },
        })
      ).map((obj) => ({
        name: obj.name,
        id: obj.id,
        updated_at: obj.updated_at,
        created_at: obj.created_at,
        last_accessed_at: obj.last_accessed_at,
        metadata: obj.metadata,
      }));

      console.info(`Found ${files.length} files with prefix ${prefix}`);
      return files;
    } catch (e) {
      console.error(
        `Error in listByPrefix method: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      console.error(`Failed to list files with prefix: ${prefix}`);
      throw new InternalServerErrorException();
    }
  }

  async uploadFolder(
    bucket: string,
    basePath: string,
    files: Array<{ relativePath: string; buffer: ArrayBuffer; mimetype: string }>,
    parallel: boolean = true,
    concurrencyLimit: number = 5
  ): Promise<{ status: string; uploadedFiles: string[]; bucket: string }> {
    const uploadedFiles: string[] = [];

    const uploadSingleFile = async (file: {
      relativePath: string;
      buffer: ArrayBuffer;
      mimetype: string;
    }) => {
      const fullPath = `${basePath}/${file.relativePath}`;
      console.log(`Uploading file: ${fullPath} to bucket: ${bucket}`);

      const url = `${this.baseUrl}/object/${bucket}/${fullPath}`;

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": file.mimetype || "application/octet-stream",
          "Cache-Control": "3600",
          "x-upsert": "true",
        },
        body: file.buffer,
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error uploading file: ${response.status} - ${errorText}`);
        throw new Error(
          `Storage service returned ${response.status}: ${errorText}`
        );
      }

      console.info(`File successfully uploaded to ${fullPath}`);
      return fullPath;
    };

    try {
      await this.ensureBucket(bucket);
      if (parallel) {
        // Parallel uploads with concurrency limit
        const results: string[] = [];
        for (let i = 0; i < files.length; i += concurrencyLimit) {
          const batch = files.slice(i, i + concurrencyLimit);
          const batchResults = await Promise.all(batch.map(uploadSingleFile));
          results.push(...batchResults);
        }
        uploadedFiles.push(...results);
      } else {
        // Sequential uploads
        for (const file of files) {
          const result = await uploadSingleFile(file);
          uploadedFiles.push(result);
        }
      }

      console.info(
        `Successfully uploaded ${uploadedFiles.length} files to ${bucket}/${basePath}`
      );
      return {
        status: "success",
        uploadedFiles,
        bucket,
      };
    } catch (e) {
      console.error(
        `Error in uploadFolder method: ${
          e instanceof Error ? e.message : String(e)
        }`
      );
      throw new InternalServerErrorException(
        `Error occurred uploading folder to ${bucket}/${basePath}`
      );
    }
  }
}
