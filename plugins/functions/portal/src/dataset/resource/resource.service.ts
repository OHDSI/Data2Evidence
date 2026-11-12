import { HttpException, Injectable } from "@danet/core";
import { SupabaseStorageClient } from "../../supabase-storage/supabase.storage.client.ts";
import { RequestContextService } from "../../common/request-context.service.ts";
import { getResourceUploadConfig } from "./resource-upload.config.ts";
import { validateResourceFile } from "./resource-upload.validation.ts";
import {
  BLOCKED_MESSAGE,
  SCAN_UNAVAILABLE_MESSAGE,
  ScanResult,
  scanFile,
} from "./resource-upload.scan.ts";

export interface CheckedUpload {
  file: File;
  buffer: ArrayBuffer;
  scan: ScanResult;
}

@Injectable()
export class ResourceService {
  constructor(
    private readonly storageClient: SupabaseStorageClient,
    private readonly requestContextService: RequestContextService,
  ) {}

  // Replaceable in tests, which use a fake scanner instead of ClamAV.
  scanner: (content: Uint8Array) => Promise<ScanResult> = (content) => scanFile(content);

  async getResources(datasetId: string) {
    const resources = await this.storageClient.list(datasetId);
    return {
      id: datasetId,
      resources
    };
  }

  downloadResource(datasetId: string, fileName: string) {
    return this.storageClient.download(datasetId, fileName);
  }

  // Applies every upload rule (the same as the Add file dialog, in case its
  // check was bypassed) and scans the file for malware. Rule failures throw
  // a 400; the scan result is returned for the caller to act on.
  async checkUpload(datasetId: string, file: unknown): Promise<CheckedUpload> {
    if (!(file instanceof File)) {
      throw new HttpException(400, "No file was uploaded");
    }

    const config = getResourceUploadConfig();
    const buffer = await file.arrayBuffer();
    const validationError = validateResourceFile(
      file,
      config,
      new Uint8Array(buffer, 0, Math.min(buffer.byteLength, config.maxFileSizeBytes)),
    );
    if (validationError) {
      throw new HttpException(400, validationError);
    }

    const scan = await this.scanner(new Uint8Array(buffer));
    if (scan.status === "infected") {
      console.info(
        `[Data2Evidence][AUDITLOG][${Date.now()}] Resource upload blocked: "${file.name}" for dataset ${datasetId} ` +
          `matched malware signature ${scan.signature}. User: ${this.requestContextService.getAuthToken()?.sub}`,
      );
    } else if (scan.status === "unavailable") {
      console.error(`Resource upload not scanned, so refused: ${scan.reason}`);
    }
    return { file, buffer, scan };
  }

  // Stores a file that passed checkUpload. An infected or unscanned file is
  // never stored: scanning fails closed.
  uploadResource(datasetId: string, { file, buffer, scan }: CheckedUpload) {
    if (scan.status === "infected") {
      throw new HttpException(400, BLOCKED_MESSAGE);
    }
    if (scan.status === "unavailable") {
      throw new HttpException(503, SCAN_UNAVAILABLE_MESSAGE);
    }
    if (file.name.includes("\\") || file.name.includes("/")) {
      throw new HttpException(400, "Invalid filename");
    }
    return this.storageClient.upload(datasetId, {
      originalname: file.name,
      buffer,
      mimetype: file.type,
    });
  }

  deleteResource(datasetId: string, fileName: string) {
    return this.storageClient.delete(datasetId, fileName);
  }
}
