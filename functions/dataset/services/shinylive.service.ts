import { ensureDir } from "jsr:@std/fs/ensure-dir";
import { unzipSync } from "npm:fflate";
import path from "node:path";
import { env, services } from "../env.ts";

const FETCH_TIMEOUT_MS = 60000;
const CACHE_TTL_MS = 15 * 60 * 1000; // 15 minutes
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

interface CacheEntry {
  extractedAt: number;
  targetDir: string;
}

// Shared cache across all ShinyLiveService instances
const sharedCache = new Map<string, CacheEntry>();

function startCacheCleanup() {
  setInterval(async () => {
    const now = Date.now();

    // Remove expired cache entries
    for (const [key, entry] of sharedCache) {
      if (now - entry.extractedAt >= CACHE_TTL_MS) {
        sharedCache.delete(key);
        try {
          await Deno.remove(entry.targetDir, { recursive: true });
          console.log(`Cleaned up expired shinylive cache: ${key}`);
        } catch {
          // ignore if already gone
        }
      }
    }

    // Clean orphaned temp dirs (not in cache)
    const tempDir = path.join(process.cwd(), "temp");
    try {
      for await (const entry of Deno.readDir(tempDir)) {
        if (entry.isDirectory && entry.name.startsWith("dashboard_")) {
          const dirPath = path.join(tempDir, entry.name);
          const cacheKey = entry.name.replace("dashboard_", "");
          if (!sharedCache.has(cacheKey)) {
            await Deno.remove(dirPath, { recursive: true });
            console.log(`Cleaned up orphaned shinylive dir: ${entry.name}`);
          }
        }
      }
    } catch {
      // temp dir may not exist
    }
  }, CLEANUP_INTERVAL_MS);
}

// Start cleanup on module load
startCacheCleanup();

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
  ): Promise<ReadableStream | null> {
    const fileName = `dashboard_${datasetId}_${type}_${name}_${language}.zip`;
    const filePath = `datasets/${datasetId}/${fileName}`;
    const url = `${this.baseUrl}/object/${this.DEFAULT_BUCKET}/${filePath}`;

    console.log(`Downloading shinylive zip: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.authToken}`,
        },
        signal: controller.signal,
      });

      if (!response.ok) {
        if (response.status == 400 || response.status === 404) {
          return null;
        }
        const errorText = await response.text();
        throw new Error(`Failed to download: ${response.status} ${errorText}`);
      }

      if (!response.body) {
        throw new Error("Response body is null");
      }

      return response.body;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async streamToBuffer(stream: ReadableStream): Promise<Uint8Array> {
    const chunks: Uint8Array[] = [];
    const reader = stream.getReader();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
    }

    const totalLength = chunks.reduce((acc, chunk) => acc + chunk.length, 0);
    const buffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of chunks) {
      buffer.set(chunk, offset);
      offset += chunk.length;
    }

    return buffer;
  }

  private async writeExtractedFiles(
    unzipped: Record<string, Uint8Array>,
    targetDir: string,
  ): Promise<void> {
    for (const [fileName, fileData] of Object.entries(unzipped)) {
      if (fileName.endsWith("/")) continue;

      const filePath = path.join(targetDir, fileName);
      await ensureDir(path.dirname(filePath));
      await Deno.writeFile(filePath, fileData);
    }
  }

  private async unzipFile(
    zipStream: ReadableStream,
    targetDir: string,
  ): Promise<void> {
    // Remove existing target dir to avoid conflicts
    try {
      await Deno.remove(targetDir, { recursive: true });
    } catch (e) {
      if (!(e instanceof Deno.errors.NotFound)) {
        console.warn(`Warning removing existing dir: ${e}`);
      }
    }

    await ensureDir(targetDir);

    const zipData = await this.streamToBuffer(zipStream);
    const unzipped = unzipSync(zipData);
    await this.writeExtractedFiles(unzipped, targetDir);

    console.log(`Unzipped shinylive to: ${targetDir}`);
  }

  async getStaticFilesDir(
    datasetId: string,
    type: string,
    name: string,
    language: string,
  ): Promise<string | null> {
    const cacheKey = `${datasetId}_${type}_${name}_${language}`;
    const targetDir = path.join(
      process.cwd(),
      "temp",
      `dashboard_${cacheKey}`,
    );

    // Check cache
    const cached = sharedCache.get(cacheKey);
    if (cached && Date.now() - cached.extractedAt < CACHE_TTL_MS) {
      try {
        await Deno.stat(cached.targetDir);
        console.log(`Cache hit for shinylive: ${cacheKey}`);
        return cached.targetDir;
      } catch {
        // dir deleted, proceed to download
      }
    }

    const zipStream = await this.downloadZip(datasetId, type, name, language);
    if (!zipStream) {
      return null;
    }

    await this.unzipFile(zipStream, targetDir);
    sharedCache.set(cacheKey, { extractedAt: Date.now(), targetDir });
    return targetDir;
  }
}
