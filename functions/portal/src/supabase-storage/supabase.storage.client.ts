import { BadRequestException, InternalServerErrorException } from "@danet/core";
import { SupabaseClient, createClient } from 'jsr:@supabase/supabase-js@2';
import { contentType } from "npm:mime-types@2.1.35";
import { env } from "../env.ts";

export class SupabaseStorageClient {
  private readonly client: SupabaseClient;

  constructor() {
    // this.client = createClient(
    //   env.SUPABASE_URL,
    //   env.SUPABASE_ANON_KEY
    // );
    this.client = createClient(
      "http://alp-supabase-storage-1:9000",
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE3Mzg4OTA1MDgsImlhdCI6MTczODcxNzcwOH0.-Ba73atXCQR_tVwYfyQrVCbZuGTFF47uq_ZyQC0n4pA"
    );
  }

  async list(datasetId: string) {
    try {
      const bucketName = this.getBucketName(datasetId);
      await this.createBucket(bucketName);

      const { data: files, error } = await this.client.storage
        .from(bucketName)
        .list();

      if (error) throw error;

      return files.map((file) => {
        const nameArr = file.name.split(".");
        const fileType = nameArr[nameArr.length - 1].toUpperCase();
        return {
          name: file.name,
          size: this.formatBytes(file.metadata.size),
          type: fileType,
        };
      });
    } catch (e) {
      console.error(`${e}`);
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage objects retrieval: ${datasetId}`
      );
    }
  }

  async download(datasetId: string, fileName: string) {
    try {
      const bucketName = this.getBucketName(datasetId);
      await this.createBucket(bucketName);

      const { data, error } = await this.client.storage
        .from(bucketName)
        .download(fileName);

      if (error) {
        if (error.message === "The resource was not found") {
          throw new BadRequestException(`Invalid file name: ${fileName}`);
        }
        throw error;
      }

      const fileExtension = fileName.substring(fileName.lastIndexOf("."));
      const mimeType = contentType(fileExtension);
      
      return {
        readStream: data,
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
      console.error(`${e}`);
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage object download: ${fileName}`
      );
    }
  }

  async upload(datasetId: string, file: Multer.File) {
    const fileName = file.originalname;
    try {
      const bucketName = this.getBucketName(datasetId);
      await this.createBucket(bucketName);

      const { error } = await this.client.storage
        .from(bucketName)
        .upload(fileName, file.buffer, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      console.info(`Supabase storage object ${fileName} successfully uploaded`);
      return {
        status: "success",
      };
    } catch (e) {
      console.error(`${e}`);
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage object upload: ${fileName}`
      );
    }
  }

  async delete(datasetId: string, fileName: string) {
    try {
      const bucketName = this.getBucketName(datasetId);

      const { error } = await this.client.storage
        .from(bucketName)
        .remove([fileName]);

      if (error) throw error;

      console.info(`Supabase storage object ${fileName} successfully deleted`);
      return {
        status: "success",
      };
    } catch (e) {
      console.error(`${e}`);
      throw new InternalServerErrorException(
        `Error occurred in Supabase storage object deletion: ${fileName}`
      );
    }
  }

  private getBucketName(datasetId: string) {
    return `portal-dataset-${datasetId}`;
  }

  private async createBucket(bucketName: string) {
    try {
      const { data: bucket, error: getBucketError } = await this.client.storage
        .getBucket(bucketName);

      if (getBucketError || !bucket) {
        console.info(
          `Bucket is not created yet. Creating bucket ${bucketName}...`
        );
        
        const { error: createBucketError } = await this.client.storage
          .createBucket(bucketName, {
            public: false,
          });

        if (createBucketError) throw createBucketError;
        
        console.info(`Bucket ${bucketName} created successfully`);
      } else {
        console.debug(`Bucket ${bucketName} is available`);
      }
    } catch (e) {
      console.error(`Error in bucket creation/verification: ${e}`);
      throw new InternalServerErrorException(
        `Error occurred in bucket creation/verification: ${bucketName}`
      );
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
}