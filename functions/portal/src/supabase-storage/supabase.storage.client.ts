import {
  BadRequestException,
  HttpException,
  Injectable,
  InternalServerErrorException,
} from "@danet/core";
import { contentType } from "mime-types";
import pg from "npm:pg";
import { env, services } from "../env.ts";

interface UploadFile {
  originalname: string;
  buffer: ArrayBuffer | Uint8Array;
  mimetype: string;
}

@Injectable()
export class SupabaseStorageClient {
  private readonly DEFAULT_BUCKET = "portal-datasets-resources";
  private readonly baseUrl: string;
  private readonly authToken: string;
  private static pgPool: pg.Pool;
  private static isInitialized = false;

  constructor() {
    this.baseUrl = services.supabaseStorage;
    this.authToken = env.SUPABASE_STORAGE_JWT_TOKEN;

    // Only initialize once for the singleton
    if (!SupabaseStorageClient.isInitialized) {
      SupabaseStorageClient.isInitialized = true;

      const envObj = Deno.env.toObject();
      const pgOpt = {
        user: envObj.PG_USER,
        password: envObj.PG_PASSWORD,
        host: envObj.PG__HOST,
        port: parseInt(envObj.PG__PORT),
        database: envObj.PG__DB_NAME,
        max: 1,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 2000,
        ssl: (() => {
          let ssl: boolean | { rejectUnauthorized: boolean; ca: string } =
            false;
          try {
            if (envObj.PG__SSL) {
              ssl = JSON.parse(envObj.PG__SSL.toLowerCase());
            }
            if (envObj.PG__CA_ROOT_CERT) {
              ssl = {
                rejectUnauthorized: true,
                ca: envObj.PG__CA_ROOT_CERT,
              };
            }
          } catch (e) {
            console.error(`Error parsing SSL config: ${e}`);
          }
          return ssl;
        })(),
      };

      SupabaseStorageClient.pgPool = new pg.Pool(pgOpt);

      SupabaseStorageClient.pgPool.on("error", (err) => {
        console.error("Unexpected error on idle PostgreSQL client", err);
      });

      // Test connection and initialize buckets
      this.initializeDb();
      this.createBucket(this.DEFAULT_BUCKET);
      this.createBucket(envObj.DATA_TRANSFORMATION_BUCKET);
      this.createBucket("strategus-results");
    }
  }

  async closePool() {
    if (SupabaseStorageClient.pgPool) {
      await SupabaseStorageClient.pgPool.end();
      console.log("PostgreSQL connection pool closed");
    }
  }

  private async initializeDb() {
    let client;
    try {
      client = await SupabaseStorageClient.pgPool.connect();
      console.log("Successfully connected to PostgreSQL database");
    } catch (e) {
      console.error(`Error connecting to PostgreSQL: ${e}`);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  private async createBucket(bucketName: string) {
    try {
      console.info(`Creating bucket ${bucketName}...`);

      const url = `${this.baseUrl}/bucket`;
      console.log(`Making request to create bucket: ${url}`);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: bucketName,
          public: false,
        }),
      });

      if (!response.ok && response.status !== 409) {
        // 409 means bucket already exists
        const errorText = await response.text();
        console.error(
          `Error creating bucket: ${response.status} - ${errorText}`
        );
      } else {
        console.info(`Bucket ${bucketName} created or already exists`);
      }
    } catch (e) {
      console.error(`Error creating default bucket: ${e}`);
    }
  }

  // Supabase storage API does not work for listing files, need further investigation.
  // Directly query the database to get the files.
  async list(
    id: string,
    bucketName?: string,
    pathType: "dataset" | "data-transformation" = "dataset"
  ) {
    const targetBucket = bucketName || this.DEFAULT_BUCKET;
    let client;

    try {
      client = await SupabaseStorageClient.pgPool.connect();

      let folderPath;

      if (pathType === "data-transformation") {
        folderPath = this.getDataTransformationFolderPath(id);
      } else {
        folderPath = this.getDatasetFolderPath(id);
      }

      console.log(`Querying database for files in folder: ${folderPath}`);

      // Query the storage.objects table directly
      const query = `
        SELECT name, metadata
        FROM storage.objects
        WHERE bucket_id = $1
        AND name LIKE $2
        AND name NOT LIKE $3
      `;

      const result = await client.query(query, [
        targetBucket,
        `${folderPath}/%`,
        `${folderPath}/%/%`, // Exclude nested folders
      ]);

      if (pathType === "data-transformation") {
        console.log(
          `Found ${result.rows.length} files in database for data-transformation node ${id}`
        );
      } else {
        console.log(
          `Found ${result.rows.length} files in database for dataset ${id}`
        );
      }

      return result.rows.map((file) => {
        const fullPath = file.name;
        const fileName = fullPath.substring(fullPath.lastIndexOf("/") + 1);
        const nameArr = fileName.split(".");
        const fileType =
          nameArr.length > 1
            ? nameArr[nameArr.length - 1].toUpperCase()
            : "UNKNOWN";

        return {
          name: fileName,
          size: this.formatBytes(file.metadata?.size || 0),
          type: fileType,
        };
      });
    } catch (e) {
      console.error(
        `Error in list method: ${e instanceof Error ? e.message : String(e)}`
      );
      return [];
    } finally {
      // Always release the client back to the pool
      if (client) {
        client.release();
      }
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

  // Direct methods for Strategus Results (no path transformation)
  async uploadDirect(bucket: string, path: string, file: UploadFile) {
    try {
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

      // Re-throw HttpException as is
      if (e instanceof HttpException) {
        throw e;
      }

      throw new InternalServerErrorException();
    }
  }

  async listByPrefix(bucket: string, prefix: string) {
    let client;
    try {
      console.log(`Listing files in bucket: ${bucket} with prefix: ${prefix}`);

      client = await SupabaseStorageClient.pgPool.connect();

      const query = `
        SELECT
          name,
          id,
          metadata,
          created_at,
          updated_at
        FROM storage.objects
        WHERE bucket_id = $1 AND name LIKE $2
        ORDER BY created_at DESC
      `;

      const result = await client.query(query, [bucket, `${prefix}%`]);

      const files = result.rows.map((row: any) => ({
        name: row.name,
        id: row.id,
        updated_at: row.updated_at,
        created_at: row.created_at,
        last_accessed_at: row.last_accessed_at,
        metadata: row.metadata,
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
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
