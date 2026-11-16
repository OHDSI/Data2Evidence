import { env, services } from "../env.ts";
import fs from "node:fs/promises";
import path from "node:path";
import { Buffer } from "node:buffer";

interface StorageObject {
  name: string;
  updated_at: string;
}

export class ShinyLiveService {
  private readonly PUBLIC_BUCKET = "portal-datasets-graphs";
  private readonly baseUrl: string;
  private readonly authToken: string;

  constructor() {
    this.baseUrl = services.supabaseStorage;
    this.authToken = env.SUPABASE_STORAGE_JWT_TOKEN;
  }

  getPublicUrl(
    datasetId: string,
    type: string,
    name: string,
    language: string,
    subPath: string,
  ): string {
    const basePath = `${datasetId}/dashboard/${datasetId}_${type}_${name}_${language}`;
    return `${this.baseUrl}/object/public/${this.PUBLIC_BUCKET}/${basePath}/${subPath}`;
  }

  // Every object under `prefix`, recursively, newest first.
  private async listObjects(prefix: string): Promise<StorageObject[]> {
    const objects: StorageObject[] = [];
    let cursor: string | undefined;
    do {
      const response = await fetch(
        `${this.baseUrl}/object/list-v2/${this.PUBLIC_BUCKET}`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${this.authToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            prefix,
            limit: 1000,
            cursor,
            sortBy: { column: "updated_at", order: "desc" },
          }),
        },
      );
      if (!response.ok) {
        throw new Error(
          `Failed to list ${prefix}: ${response.status} - ${await response.text()}`,
        );
      }
      const page = await response.json();
      objects.push(...page.objects);
      cursor = page.hasNext ? page.nextCursor : undefined;
    } while (cursor);
    return objects;
  }

  async getStaticFilesDir(
    datasetId: string,
    type: string,
    name: string,
    language: string,
  ): Promise<string | null> {
    const resourcePrefix = `${datasetId}/dashboard/${datasetId}_${type}_${name}_${language}`;
    const tmpDir = path.join(
      "/tmp",
      "shinylive",
      `${datasetId}_${type}_${name}_${language}`,
    );

    const objects = await this.listObjects(`${resourcePrefix}/`);
    if (objects.length === 0) {
      return null;
    }

    const newestRemote = new Date(objects[0].updated_at);
    let localNewest: Date;

    try {
      const indexPath = path.join(tmpDir, "index.html");
      const stat = await fs.stat(indexPath);
      localNewest = new Date(stat.mtime);
    } catch {
      localNewest = new Date(0);
    }

    if (newestRemote > localNewest) {
      await fs.rm(tmpDir, { recursive: true, force: true });
      await fs.mkdir(tmpDir, { recursive: true });
    } else {
      return tmpDir;
    }

    for (const obj of objects) {
      const relPath = obj.name.substring(resourcePrefix.length + 1);
      const localPath = path.join(tmpDir, relPath);
      await fs.mkdir(path.dirname(localPath), { recursive: true });

      const url = `${this.baseUrl}/object/public/${this.PUBLIC_BUCKET}/${obj.name}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        throw new Error(`Failed to download ${url}: ${resp.status}`);
      }
      const data = await resp.arrayBuffer();

      await fs.writeFile(localPath, Buffer.from(data));
    }

    return tmpDir;
  }

  async deleteDatasetShinyLiveResources(
    datasetId: string,
    type: string,
    name: string,
    language: string,
  ): Promise<void> {
    const resourcePrefix = `${datasetId}/dashboard/${datasetId}_${type}_${name}_${language}`;
    const objects = await this.listObjects(`${resourcePrefix}/`);
    if (objects.length === 0) {
      return;
    }

    const deleteResponse = await fetch(
      `${this.baseUrl}/object/${this.PUBLIC_BUCKET}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.authToken}`,
        },
        body: JSON.stringify({ prefixes: objects.map((obj) => obj.name) }),
      },
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      throw new Error(
        `Failed to delete files: ${deleteResponse.status} - ${errorText}`,
      );
    }
  }
}
