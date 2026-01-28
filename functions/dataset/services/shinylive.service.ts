import { Untar } from "jsr:@std/archive/untar";
import { readerFromStreamReader } from "jsr:@std/io/reader-from-stream-reader";
import { ensureDir } from "jsr:@std/fs/ensure-dir";
import path from "node:path";
import { env, services } from "../env.ts";

export class ShinyLiveService {
  private readonly baseUrl: string;
  private readonly authToken: string;
  private readonly DEFAULT_BUCKET = "portal-datasets-resources";

  constructor() {
    this.baseUrl = services.supabaseStorage;
    this.authToken = env.SUPABASE_STORAGE_JWT_TOKEN;
  }

  private async downloadZip(
    datasetId: string,
    type: string,
    name: string,
    language: string,
  ): Promise<ReadableStream> {
    const fileName = `dashboard_${datasetId}_${type}_${name}_${language}.zip`;
    const filePath = `datasets/${datasetId}/${fileName}`;
    const url = `${this.baseUrl}/object/${this.DEFAULT_BUCKET}/${filePath}`;

    console.log(`Downloading shinylive zip: ${url}`);

    const response = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${this.authToken}`,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(
        `Error downloading shinylive zip: ${response.status} - ${errorText}`,
      );
      throw new Error(
        `Failed to download shinylive zip: ${response.status} ${errorText}`,
      );
    }

    if (!response.body) {
      throw new Error("Response body is null");
    }

    return response.body;
  }

  private async unzipFile(
    zipStream: ReadableStream,
    targetDir: string,
  ): Promise<void> {
    console.log(`Unzipping to: ${targetDir}`);

    await ensureDir(targetDir);

    const reader = readerFromStreamReader(zipStream.getReader());
    const untar = new Untar(reader);

    // Extract all files
    for await (const entry of untar) {
      if (entry.type === "directory") {
        const dirPath = path.join(targetDir, entry.fileName);
        await ensureDir(dirPath);
      } else if (entry.type === "file") {
        const filePath = path.join(targetDir, entry.fileName);
        const fileDir = path.dirname(filePath);

        await ensureDir(fileDir);

        const file = await Deno.open(filePath, {
          create: true,
          write: true,
        });

        const buffer = new Uint8Array(1024 * 64); // 64KB buffer
        let bytesRead = await reader.read(buffer);

        while (bytesRead !== null) {
          await file.write(buffer.subarray(0, bytesRead));
          bytesRead = await reader.read(buffer);
        }

        file.close();
      }
    }

    console.log(`Successfully unzipped to: ${targetDir}`);
  }

  async getStaticFilesDir(
    datasetId: string,
    type: string,
    name: string,
    language: string,
  ): Promise<string> {
    const targetDir = path.join(
      process.cwd(),
      "temp",
      `${datasetId}_${type}_${name}_${language}`,
    );

    // Download and unzip
    console.log(
      `Downloading and unzipping shinylive for ${datasetId}_${type}_${name}_${language}`,
    );
    const zipStream = await this.downloadZip(datasetId, type, name, language);
    await this.unzipFile(zipStream, targetDir);

    return targetDir;
  }
}
