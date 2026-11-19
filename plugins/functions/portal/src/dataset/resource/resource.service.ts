import { HttpException, Injectable } from "@danet/core";
import { SupabaseStorageClient } from "../../supabase-storage/supabase.storage.client.ts";
import { RequestContextService } from "../../common/request-context.service.ts";
import { getResourceUploadConfig } from "./resource-upload.config.ts";
import { toStorageFileName, validateResourceFile } from "./resource-upload.validation.ts";
import {
  BLOCKED_MESSAGE,
  SCAN_UNAVAILABLE_MESSAGE,
  ScanResult,
  scanResource,
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

  // Replaceable in tests, which use a fake scanner instead of ClamAV. Returns
  // "not-scanned" unless the deployment has switched scanning on.
  scanner: (content: Uint8Array) => Promise<ScanResult> = (content) => scanResource(content);

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
  // check was bypassed) and, if scanning is on, scans the file for malware.
  // Rule failures throw a 400; the scan result is returned for the caller to
  // act on.
  async checkUpload(datasetId: string, file: unknown): Promise<CheckedUpload> {
    if (!(file instanceof File)) {
      throw new HttpException(400, "No file was uploaded");
    }

    const config = getResourceUploadConfig();
    // The content check looks at most at the size limit, so copy no more than
    // that: an oversized file is rejected without copying all of it. A file
    // that passes is within the limit, so this copy is then the whole file.
    const buffer = await file.slice(0, config.maxFileSizeBytes).arrayBuffer();
    const validationError = validateResourceFile(file, config, new Uint8Array(buffer));
    if (validationError) {
      throw new HttpException(400, validationError);
    }

    const scan = await this.scanner(new Uint8Array(buffer));
    if (scan.status === "infected") {
      console.info(
        // The file name is user input: JSON.stringify quotes it and escapes
        // quotes and line breaks, so it can't forge or split the audit line.
        `[Data2Evidence][AUDITLOG][${Date.now()}] Resource upload blocked: ${JSON.stringify(file.name)} for dataset ${datasetId} ` +
          `matched malware signature ${scan.signature}. User: ${this.requestContextService.getAuthToken()?.sub}`,
      );
    } else if (scan.status === "unavailable") {
      console.error(`Resource upload not scanned, so refused: ${scan.reason}`);
    }
    return { file, buffer, scan };
  }

  // Stores a file that passed checkUpload. With scanning on, an infected or
  // unscanned file is never stored: scanning fails closed. With it off
  // ("not-scanned"), the upload rules above are the only checks.
  // The file is stored under toStorageFileName(file.name), since storage
  // refuses some characters; the response says which name was used.
  async uploadResource(datasetId: string, { file, buffer, scan }: CheckedUpload) {
    if (scan.status === "infected") {
      throw new HttpException(400, BLOCKED_MESSAGE);
    }
    if (scan.status === "unavailable") {
      throw new HttpException(503, SCAN_UNAVAILABLE_MESSAGE);
    }
    if (file.name.includes("\\") || file.name.includes("/")) {
      throw new HttpException(400, "Invalid filename");
    }
    const fileName = toStorageFileName(file.name);
    const stored = await this.storageClient.upload(datasetId, {
      originalname: fileName,
      buffer,
      mimetype: file.type,
    });
    return { ...stored, fileName };
  }

  deleteResource(datasetId: string, fileName: string) {
    return this.storageClient.delete(datasetId, fileName);
  }
}
