import { BadRequestException, InternalServerErrorException } from "@danet/core";
import { Buffer } from "node:buffer";
import { contentType } from "npm:mime-types@2.1.35";
import * as Minio from "npm:minio@8.0.2";
import { env } from "../env.ts";

export class MinioClient {
  private readonly client: Minio.Client;

  constructor() {
    this.client = new Minio.Client({
      endPoint: env.MINIO_ENDPOINT,
      port: Number(env.MINIO_PORT),
      useSSL: env.MINIO_SSL == "true" ? true : false,
      accessKey: env.MINIO_ACCESS_KEY,
      secretKey: env.MINIO_SECRET_KEY,
    });
  }

  async list(datasetId: string) {
    try {
      const bucketName = this.getBucketName(datasetId);
      await this.createBucket(bucketName);

      const stream = this.client.listObjectsV2(bucketName);
      const resources = [];
      const streamPromise = new Promise((resolve, reject) => {
        stream.on("data", (item) => {
          resources.push(item);
        });
        stream.on("end", () => resolve(resources));
        stream.on("error", (err) => {
          console.error(
            `Error occurred while reading stream from bucket ${bucketName}: ${err}`
          );
          return reject(err);
        });
      });
      await streamPromise;

      return resources.map((r) => {
        const nameArr = r.name.split(".");
        const fileType = nameArr[nameArr.length - 1].toUpperCase();
        return {
          name: r.name,
          size: this.formatBytes(r.size),
          type: fileType,
        };
      });
    } catch (e) {
      console.error(`${e}`);
      throw new InternalServerErrorException(
        `Error occurred in MinIO S3 objects retrieval: ${datasetId}`
      );
    }
  }

  async download(datasetId: string, fileName: string) {
    try {
      const bucketName = this.getBucketName(datasetId);
      await this.createBucket(bucketName);

      const readStream = await this.client.getObject(bucketName, fileName);

      const fileExtension = fileName.substring(fileName.lastIndexOf("."));
      const mimeType = contentType(fileExtension);
      return {
        readStream,
        contentType: mimeType,
        contentDisposition: `attachment; filename="${fileName}"`,
      };
    } catch (e) {
      if (
        e instanceof BadRequestException ||
        e instanceof InternalServerErrorException
      ) {
        throw e;
      } else if (e.message === "Not Found") {
        throw new BadRequestException(`Invalid file name: ${fileName}`);
      }
      console.error(`${e}`);
      throw new InternalServerErrorException(
        `Error occurred in MinIO S3 object download: ${fileName}`
      );
    }
  }

  async upload(datasetId: string, file: Multer.File) {
    const fileName = file.originalname;
    try {
      const bucketName = this.getBucketName(datasetId);
      await this.createBucket(bucketName);

      const buffer = Buffer.from(file.buffer);
      await this.client.putObject(bucketName, fileName, buffer);
      console.info(`MinIO S3 object ${fileName} successfully uploaded`);
      return {
        status: "success",
      };
    } catch (e) {
      console.error(`${e}`);
      throw new InternalServerErrorException(
        `Error occurred in MinIO S3 object upload: ${fileName}`
      );
    }
  }

  async delete(datasetId: string, fileName: string) {
    try {
      const bucketName = this.getBucketName(datasetId);

      await this.client.removeObject(bucketName, fileName);
      console.info(`MinIO S3 object ${fileName} successfully deleted`);
      return {
        status: "success",
      };
    } catch (e) {
      console.error(`${e}`);
      throw new InternalServerErrorException(
        `Error occurred in MinIO S3 object deletion: $ {fileName}`
      );
    }
  }

  async getFlowRunResults(filePath: string) {
    const flowBucketName = this.getFlowBucketName();
    try {
      const dataStream = await this.client.getObject(flowBucketName, filePath);
      const dataChunks = [];

      return new Promise((resolve, reject) => {
        dataStream.on("data", (chunk) => {
          dataChunks.push(chunk);
        });

        dataStream.on("end", () => {
          const buffer = Buffer.concat(dataChunks);
          const jsonStr = buffer.toString("utf8");
          try {
            const jsonData = JSON.parse(jsonStr);
            const dataStr = jsonData["result"];
            // Parse again the double serialized data
            const parsedData = JSON.parse(dataStr);
            resolve(parsedData);
          } catch (err) {
            console.error("Error parsing JSON:", err);
            reject(err);
          }
        });

        dataStream.on("error", (err) => {
          console.error("Error reading stream:", err);
          reject(err);
        });
      });
    } catch (err) {
      console.error("Error fetching object from MinIO:", err);
      throw err;
    }
  }

  async getMultipleFlowRunResults(filePaths: string[]) {
    const results = [];
    for (const filePath of filePaths) {
      try {
        const flowRunResult = await this.getFlowRunResults(filePath);
        results.push(flowRunResult);          
      } catch (error) {
        console.error(`Error retrieving file ${filePath}: ${error}`)
      }
    }
    return results;
  }

  private getBucketName(datasetId: string) {
    return `portal-dataset-${datasetId}`;
  }

  private getFlowBucketName() {
    return "flows";
  }

  private async createBucket(bucketName: string) {
    const hasBucket = await this.client.bucketExists(bucketName);

    if (!hasBucket) {
      console.info(
        `Bucket is not created yet. Creating bucket ${bucketName}...`
      );
      await this.client.makeBucket(bucketName, env.MINIO_REGION);
      console.info(`Bucket ${bucketName} created successfully`);
    } else {
      console.debug(`Bucket ${bucketName} is available`);
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
