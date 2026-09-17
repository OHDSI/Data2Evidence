import { createHash } from "crypto";
import { decode, JwtPayload } from "jsonwebtoken";
import { ILike } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import dataSource from "../db/datasource.ts";
import { env } from "../env.ts";
import { SupabaseStorageClient } from "../storage/SupabaseStorageClient.ts";

export const MAX_FILE_SIZE_BYTES = 500 * 1024 * 1024;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 200;

export interface ResultUploadInput {
  name: string;
  fileName: string;
  buffer: Uint8Array;
  mimetype: string;
  metadata?: Record<string, unknown> | null;
}

export interface ListResultsOptions {
  limit?: number;
  offset?: number;
  name?: string;
}

export default class StrategusResultsService {
  private strategusResultsRepository;
  private storage: SupabaseStorageClient;
  private readonly bucket = env.STRATEGUS_RESULTS_BUCKET;

  constructor(storage: SupabaseStorageClient = new SupabaseStorageClient()) {
    this.strategusResultsRepository = dataSource.getRepository(
      "StrategusResult",
    );
    this.storage = storage;
  }

  async ensureBucket() {
    await this.storage.createBucket(this.bucket);
  }

  async createResult(token: string, input: ResultUploadInput) {
    const id = uuidv4();
    const storagePath = `${id}/${input.fileName}`;

    // Storage first, row second: a storage failure then leaves no dangling row.
    await this.storage.upload(this.bucket, storagePath, {
      fileName: input.fileName,
      buffer: input.buffer,
      mimetype: input.mimetype,
    });

    try {
      const row = {
        id,
        name: input.name,
        fileName: input.fileName,
        fileSize: input.buffer.byteLength,
        checksum: this.checksum(input.buffer),
        bucket: this.bucket,
        storagePath,
        metadata: input.metadata ?? null,
        ...this.ownerInfo(token),
      };
      await this.strategusResultsRepository.save(row);
      return row;
    } catch (error) {
      // The object is in the bucket but no row points at it, so nothing would
      // ever find or delete it. Compensate before rethrowing.
      await this.storage.delete(this.bucket, storagePath).catch(
        (cleanupError) => {
          console.error(
            `Failed to clean up orphaned object ${storagePath}:`,
            cleanupError,
          );
        },
      );
      throw error;
    }
  }

  async listResults(options: ListResultsOptions = {}) {
    const take = Math.min(
      options.limit ?? DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    );
    return await this.strategusResultsRepository.find({
      where: options.name ? { name: ILike(`%${options.name}%`) } : {},
      order: { createdAt: "DESC" },
      take,
      skip: options.offset ?? 0,
    });
  }

  async getResult(id: string) {
    return await this.strategusResultsRepository.findOne({ where: { id } });
  }

  async getResultStream(id: string) {
    const result = await this.getResult(id);
    if (!result) return null;

    const { readStream } = await this.storage.download(
      result.bucket,
      result.storagePath,
    );
    return { result, readStream };
  }

  async deleteResult(id: string) {
    const existing = await this.getResult(id);
    if (!existing) return null;

    await this.storage.delete(existing.bucket, existing.storagePath);
    await this.strategusResultsRepository.delete({ id });
    return existing;
  }

  private checksum(buffer: Uint8Array) {
    return createHash("sha256").update(buffer).digest("hex");
  }

  private ownerInfo(token: string) {
    const subject = this.subjectFromToken(token);
    return { createdBy: subject, modifiedBy: subject };
  }

  private subjectFromToken(token: string) {
    if (!token) return "system";
    try {
      const decoded = decode(token.replace(/bearer /i, "")) as JwtPayload;
      return decoded?.sub ?? "system";
    } catch (error) {
      console.error("Failed to decode token subject:", error);
      return "system";
    }
  }
}
