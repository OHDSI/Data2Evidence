import { BadRequestException, InternalServerErrorException } from "@danet/core";
import { contentType } from "npm:mime-types@2.1.35";
import { env } from "../env.ts";
import pg from "npm:pg";

export class SupabaseStorageClient {
  private readonly DEFAULT_BUCKET = "portal-datasets-resources";
  private readonly baseUrl: string;
  private readonly authToken: string;
  private pgclient;
  private pgOpt;

  constructor() {
    // TODO: Get from env
    this.baseUrl = env.SUPABASE_URL || "http://alp-supabase-storage-1:9000";
    // TODO: Get from env
    this.authToken =
      env.SUPABASE_SERVICE_ROLE_KEY ||
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.ewogICJyb2xlIjogInNlcnZpY2Vfcm9sZSIsCiAgImlzcyI6ICJzdXBhYmFzZSIsCiAgImlhdCI6IDE3NDQwNDE2MDAsCiAgImV4cCI6IDE5MDE4MDgwMDAKfQ.RzRgCyQ4VIvscxvJA5lJy8XZnpWbcA8OxhE0u1WXrwI";

    const envObj = Deno.env.toObject();
    this.pgOpt = {
      user: envObj.PG_USER,
      password: envObj.PG_PASSWORD,
      host: envObj.PG__HOST,
      port: parseInt(envObj.PG__PORT),
      database: envObj.PG__DB_NAME,
      ssl: (() => {
        let ssl = false;
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
    this.pgclient = new pg.Client(this.pgOpt);
    this.initializeDb();

    this.createDefaultBucket();
  }

  private async initializeDb() {
    try {
      await this.pgclient.connect();
      console.log("Successfully connected to PostgreSQL database");
    } catch (e) {
      console.error(`Error connecting to PostgreSQL: ${e}`);
    }
  }

  private async createDefaultBucket() {
    try {
      console.info(`Creating default bucket ${this.DEFAULT_BUCKET}...`);
      
      const url = `${this.baseUrl}/bucket`;
      console.log(`Making request to create bucket: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: this.DEFAULT_BUCKET,
          public: false
        })
      });
      
      if (!response.ok && response.status !== 409) { // 409 means bucket already exists
        const errorText = await response.text();
        console.error(`Error creating bucket: ${response.status} - ${errorText}`);
      } else {
        console.info(`Bucket ${this.DEFAULT_BUCKET} created or already exists`);
      }
    } catch (e) {
      console.error(`Error creating default bucket: ${e}`);
    }
  }

  // Supabase storage API does not work for listing files, need further investigation.
  // Directly query the database to get the files.
  async list(datasetId: string) {
    try {
      if (!this.pgclient || this.pgclient.connectionParameters.state === 'closed') {
        await this.initializeDb();
      }
      
      const folderPath = this.getDatasetFolderPath(datasetId);
      console.log(`Querying database for files in folder: ${folderPath}`);

      // Query the storage.objects table directly
      const query = `
        SELECT name, metadata
        FROM storage.objects
        WHERE bucket_id = $1
        AND name LIKE $2
        AND name NOT LIKE $3
      `;
      
      const result = await this.pgclient.query(query, [
        this.DEFAULT_BUCKET,
        `${folderPath}/%`,
        `${folderPath}/%/%` // Exclude nested folders
      ]);
      
      console.log(`Found ${result.rows.length} files in database for dataset ${datasetId}`);
      
      return result.rows.map(file => {
        const fullPath = file.name;
        const fileName = fullPath.substring(fullPath.lastIndexOf('/') + 1);
        const nameArr = fileName.split(".");
        const fileType = nameArr.length > 1 ? nameArr[nameArr.length - 1].toUpperCase() : "UNKNOWN";
        
        return {
          name: fileName,
          size: this.formatBytes(file.metadata?.size || 0),
          type: fileType,
        };
      });
    } catch (e) {
      console.error(`Error in list method: ${e instanceof Error ? e.message : String(e)}`);
      return [];
    }
  }

  async download(datasetId: string, fileName: string) {
    try {
      const filePath = this.getFilePath(datasetId, fileName);
      console.log(`Downloading file: ${filePath}`);

      // Direct request to download file
      const url = `${this.baseUrl}/object/${this.DEFAULT_BUCKET}/${filePath}`;
      console.log(`Making request to: ${url}`);
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error downloading file: ${response.status} - ${errorText}`);
        
        if (response.status === 404) {
          throw new BadRequestException(`Invalid file name: ${fileName}`);
        }
        
        throw new Error(`Storage service returned ${response.status}: ${errorText}`);
      }
      
      const blob = await response.blob();
      const fileExtension = fileName.substring(fileName.lastIndexOf("."));
      const mimeType = contentType(fileExtension) || 'application/octet-stream';

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
      console.error(`Error in download method: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`Stack trace: ${e instanceof Error ? e.stack : 'No stack trace'}`);
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage object download: ${fileName}`
      );
    }
  }

  async upload(datasetId: string, file: Multer.File) {
    const fileName = file.originalname;
    try {
      const filePath = this.getFilePath(datasetId, fileName);
      console.log(`Uploading file: ${filePath}`);

      const url = `${this.baseUrl}/object/${this.DEFAULT_BUCKET}/${filePath}`;
      console.log(`Making request to: ${url}`);
      
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.authToken}`,
          'Content-Type': file.mimetype || 'application/octet-stream',
          'Cache-Control': '3600',
          'x-upsert': 'true' // For overwriting existing files
        },
        body: file.buffer
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error uploading file: ${response.status} - ${errorText}`);
        throw new Error(`Storage service returned ${response.status}: ${errorText}`);
      }
      
      console.info(`File ${fileName} successfully uploaded to ${filePath}`);
      return {
        status: "success",
      };
    } catch (e) {
      console.error(`Error in upload method: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`Stack trace: ${e instanceof Error ? e.stack : 'No stack trace'}`);
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage object upload: ${fileName}`
      );
    }
  }

  async delete(datasetId: string, fileName: string) {
    try {
      const filePath = this.getFilePath(datasetId, fileName);
      console.log(`Deleting file: ${filePath}`);

      const url = `${this.baseUrl}/object/${this.DEFAULT_BUCKET}/${filePath}`;
      console.log(`Making request to: ${url}`);
      
      const response = await fetch(url, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.authToken}`
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Error deleting file: ${response.status} - ${errorText}`);
        throw new Error(`Storage service returned ${response.status}: ${errorText}`);
      }
      
      console.info(`File ${filePath} successfully deleted`);
      return {
        status: "success",
      };
    } catch (e) {
      console.error(`Error in delete method: ${e instanceof Error ? e.message : String(e)}`);
      console.error(`Stack trace: ${e instanceof Error ? e.stack : 'No stack trace'}`);
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage object deletion: ${fileName}`
      );
    }
  }

  private getDatasetFolderPath(datasetId: string) {
    return `datasets/${datasetId}`;
  }

  private getFilePath(datasetId: string, fileName: string) {
    return `${this.getDatasetFolderPath(datasetId)}/${fileName}`;
  }

  private formatBytes(bytes, decimals = 1) {
    if (!+bytes) return "0 Byte";

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  }
}
