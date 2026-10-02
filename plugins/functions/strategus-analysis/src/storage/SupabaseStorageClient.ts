import { env, services } from "../env.ts";

export interface StorageUploadFile {
  fileName: string;
  buffer: Uint8Array;
  mimetype: string;
}

export class StorageError extends Error {
  public readonly statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "StorageError";
    this.statusCode = statusCode;
  }
}

/**
 * Minimal client for the Supabase Storage REST API.
 *
 * Deliberately not routed through portal's supabase-storage controller: that
 * endpoint base64-encodes the whole object on download, which would hold a
 * 500MB zip in memory twice over. Here download hands back the response stream
 * so the route can pipe it straight to the client.
 */
export class SupabaseStorageClient {
  private readonly baseUrl: string;
  private readonly authToken: string;

  constructor() {
    if (!services.supabaseStorage) {
      throw new Error("No url is set for SupabaseStorageClient");
    }
    this.baseUrl = services.supabaseStorage;
    this.authToken = env.SUPABASE_STORAGE_JWT_TOKEN;
  }

  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.authToken}`, ...extra };
  }

  /**
   * True when a raw (not-yet-encoded) path segment is a dot-segment in any
   * form the WHATWG URL spec normalizes away: "." or ".." after
   * percent-decoding, compared case-insensitively. This covers the literal
   * forms as well as every partially/fully percent-encoded spelling (".",
   * "..", "%2e", "%2E", ".%2e", "%2e.", "%2e%2e", ...). Percent-encoding a
   * dot-segment does NOT protect against traversal — the URL parser (and
   * fetch, which applies WHATWG dot-segment normalization to the raw path)
   * still collapses it after decoding — so these segments must be rejected
   * outright rather than encoded.
   */
  private isDotSegment(segment: string): boolean {
    let decoded: string;
    try {
      decoded = decodeURIComponent(segment);
    } catch {
      // Malformed percent-encoding: not decodable, so it can't decode to a
      // dot-segment either. Let normal encoding handle it.
      return false;
    }
    const lower = decoded.toLowerCase();
    return lower === "." || lower === "..";
  }

  /**
   * Validates every "/"-separated segment of a storage path, rejecting empty
   * segments and dot-segments (in any percent-encoded form) before a URL is
   * ever built. This is the actual traversal guard for this client -
   * encoding alone cannot stop the URL parser from normalizing an encoded
   * dot-segment back into a literal one.
   */
  private assertSafePath(path: string): void {
    const segments = path.split("/");
    for (const segment of segments) {
      if (segment.length === 0) {
        throw new StorageError(
          `Invalid storage path "${path}": empty path segment`,
          404,
        );
      }
      if (this.isDotSegment(segment)) {
        throw new StorageError(
          `Invalid storage path "${path}": dot-segment "${segment}" is not allowed`,
          404,
        );
      }
    }
  }

  /**
   * Percent-encodes a single path segment with the ordinary rules
   * (encodeURIComponent), so plain filenames keep their literal dots (e.g.
   * "results.zip" stays "results.zip") while reserved characters such as
   * "?", "#" and spaces are still neutralized. Callers must validate the
   * segment with `isDotSegment`/`assertSafePath` first - this method does
   * not defend against traversal on its own.
   */
  private encodeSegment(segment: string) {
    return encodeURIComponent(segment);
  }

  private objectUrl(bucket: string, path: string) {
    this.assertSafePath(bucket);
    this.assertSafePath(path);
    const encodedPath = path.split("/").map((segment) =>
      this.encodeSegment(segment)
    ).join("/");
    return `${this.baseUrl}/object/${
      this.encodeSegment(bucket)
    }/${encodedPath}`;
  }

  async createBucket(name: string, isPublic = false): Promise<void> {
    const response = await fetch(`${this.baseUrl}/bucket`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ name, public: isPublic }),
    });

    // 409 means the bucket already exists, which is the normal case on every
    // boot after the first.
    if (!response.ok && response.status !== 409) {
      throw new StorageError(
        `Failed to create bucket ${name}: ${response.status} ${await response
          .text()}`,
        502,
      );
    }
  }

  async upload(bucket: string, path: string, file: StorageUploadFile) {
    const response = await fetch(this.objectUrl(bucket, path), {
      method: "POST",
      headers: this.headers({
        "Content-Type": file.mimetype || "application/zip",
        "Cache-Control": "3600",
        "x-upsert": "true",
      }),
      body: file.buffer,
    });

    if (!response.ok) {
      throw new StorageError(
        `Failed to upload ${path}: ${response.status} ${await response.text()}`,
        502,
      );
    }

    return { bucket, path };
  }

  async download(bucket: string, path: string) {
    const response = await fetch(this.objectUrl(bucket, path), {
      method: "GET",
      headers: this.headers(),
    });

    if (!response.ok) {
      throw new StorageError(
        `Failed to download ${path}: ${response.status} ${await response
          .text()}`,
        response.status === 404 ? 404 : 502,
      );
    }

    if (!response.body) {
      throw new StorageError(`Empty response body for ${path}`, 502);
    }

    return { readStream: response.body };
  }

  async delete(bucket: string, path: string): Promise<void> {
    const response = await fetch(this.objectUrl(bucket, path), {
      method: "DELETE",
      headers: this.headers(),
    });

    // A missing object is not an error: delete has to stay idempotent so a row
    // can always be removed even when its object is already gone.
    if (!response.ok && response.status !== 404) {
      throw new StorageError(
        `Failed to delete ${path}: ${response.status} ${await response.text()}`,
        502,
      );
    }
  }
}
