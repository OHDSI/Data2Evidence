import { HttpException, Injectable } from "@danet/core";
import {
  ObjectAlreadyExistsError,
  SupabaseStorageClient,
} from "../../supabase-storage/supabase.storage.client.ts";
import { RequestContextService } from "../../common/request-context.service.ts";
import { getResourceUploadConfig } from "./resource-upload.config.ts";
import { nextFreeFileName, validateResourceFile } from "./resource-upload.validation.ts";

// How many times an upload looks for a free name when other uploads keep
// taking the one it picked. Only reached under unusual contention.
const MAX_NAME_ATTEMPTS = 20;

// A resource name taken from a URL (download, delete) must name a file in the
// data source's own folder: no "/" or "\", and not "." or "..", which would
// let the storage path reach other folders or buckets.
const assertResourceFileName = (fileName: string): void => {
  if (!fileName || fileName.includes("/") || fileName.includes("\\") || fileName === "." || fileName === "..") {
    throw new HttpException(400, "Invalid filename");
  }
};
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
    assertResourceFileName(fileName);
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
  // An existing file is never replaced: a taken name gets the lowest free
  // " (n)" suffix ("abcd.pdf" -> "abcd (1).pdf"), ignoring case. Storage
  // refuses a taken name atomically, so if another upload takes the chosen
  // name first, this picks the next one. The response says which name was
  // used, for the dialog to show.
  async uploadResource(datasetId: string, { file, buffer, scan }: CheckedUpload) {
    if (scan.status === "infected") {
      throw new HttpException(400, BLOCKED_MESSAGE);
    }
    if (scan.status === "unavailable") {
      throw new HttpException(503, SCAN_UNAVAILABLE_MESSAGE);
    }
    assertResourceFileName(file.name);

    const existing = (await this.storageClient.list(datasetId)).map((resource) => resource.name);
    for (let attempt = 0; attempt < MAX_NAME_ATTEMPTS; attempt++) {
      const fileName = nextFreeFileName(file.name, existing);
      try {
        const stored = await this.storageClient.upload(
          datasetId,
          { originalname: fileName, buffer, mimetype: file.type },
          undefined,
          "dataset",
          { overwrite: false },
        );
        return { ...stored, fileName };
      } catch (error) {
        if (!(error instanceof ObjectAlreadyExistsError)) throw error;
        existing.push(fileName); // taken meanwhile: try the next number
      }
    }
    throw new HttpException(409, "This file couldn’t be saved because its name is in use. Please try again.");
  }

  deleteResource(datasetId: string, fileName: string) {
    assertResourceFileName(fileName);
    return this.storageClient.delete(datasetId, fileName);
  }
}
