import express, { Request, Response } from "express";
import multer from "multer";
import { Readable } from "stream";
import StrategusResultsService, {
  MAX_FILE_SIZE_BYTES,
} from "./services.ts";
import { StorageError } from "../storage/SupabaseStorageClient.ts";

// Cuts off oversized bodies during parsing, before the whole thing is
// buffered into memory; the post-hoc size check below stays as a defense in
// depth (and preserves the exact 400 the caller sees for an oversized file).
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE_BYTES },
});

interface UploadedFile {
  originalname: string;
  buffer: Uint8Array;
  size: number;
  mimetype?: string;
}

interface ValidatedUpload {
  authHeader: string;
  file: UploadedFile;
  name: string;
  metadata?: Record<string, unknown>;
}

export default class StrategusResultsRouter {
  public router = express.Router();
  public strategusResultsService = new StrategusResultsService();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/", upload.single("file"), this.createResult.bind(this));
    this.router.get("/", this.listResults.bind(this));
    // Registered before "/:id" so the more specific path wins.
    this.router.get("/:id/download", this.downloadResult.bind(this));
    this.router.get("/:id", this.getResult.bind(this));
    this.router.delete("/:id", this.deleteResult.bind(this));
  }

  private async createResult(req: Request, res: Response) {
    const validated = this.validateUpload(req, res);
    if (!validated) return;

    try {
      const result = await this.strategusResultsService.createResult(
        validated.authHeader,
        {
          name: validated.name,
          fileName: validated.file.originalname,
          buffer: validated.file.buffer,
          mimetype: validated.file.mimetype || "application/zip",
          metadata: validated.metadata ?? null,
        },
      );
      return res.status(201).json(result);
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while saving the result",
      );
    }
  }

  private async listResults(req: Request, res: Response) {
    if (!this.requireAuth(req, res)) return;

    try {
      const { limit, offset, name } = req.query;
      const results = await this.strategusResultsService.listResults({
        limit: this.parseNonNegativeInt(limit),
        offset: this.parseNonNegativeInt(offset),
        name: typeof name === "string" ? name : undefined,
      });
      return res.status(200).json(results);
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while listing results",
      );
    }
  }

  private async getResult(req: Request, res: Response) {
    if (!this.requireAuth(req, res)) return;

    const { id } = req.params;
    try {
      const result = await this.strategusResultsService.getResult(id);
      if (!result) {
        return res.status(404).json({ message: `Result not found: ${id}` });
      }
      return res.status(200).json(result);
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while fetching the result",
      );
    }
  }

  private async downloadResult(req: Request, res: Response) {
    if (!this.requireAuth(req, res)) return;

    const { id } = req.params;
    try {
      const streamed = await this.strategusResultsService.getResultStream(id);
      if (!streamed) {
        return res.status(404).json({ message: `Result not found: ${id}` });
      }

      res.status(200);
      res.setHeader("Content-Type", "application/zip");
      const safeFileName = streamed.result.fileName.replace(
        /[\\"]/g,
        "\\$&",
      );
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="${safeFileName}"`,
      );
      res.setHeader("Content-Length", String(streamed.result.fileSize));

      // Web ReadableStream to node stream, so the zip is piped to the client
      // rather than buffered in the function.
      const nodeStream = Readable.fromWeb(streamed.readStream as never);
      // Headers are already sent by the time a mid-transfer error can occur,
      // so it can't be reported as a JSON error body; pipe() also doesn't
      // forward source errors to the destination. Log it and tear down the
      // response instead of leaving the client hanging.
      nodeStream.on("error", (error) => {
        console.error(
          `An error occurred while streaming the result ${id}:`,
          error,
        );
        res.destroy(error);
      });
      nodeStream.pipe(res);
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while downloading the result",
      );
    }
  }

  private async deleteResult(req: Request, res: Response) {
    if (!this.requireAuth(req, res)) return;

    const { id } = req.params;
    try {
      const result = await this.strategusResultsService.deleteResult(id);
      if (!result) {
        return res.status(404).json({ message: `Result not found: ${id}` });
      }
      return res.status(200).json({
        id: result.id,
        message: "Result deleted successfully.",
      });
    } catch (error) {
      return this.handleError(
        res,
        error,
        "An error occurred while deleting the result",
      );
    }
  }

  /**
   * Reduces a client-controlled upload file name to a bare basename and
   * rejects anything that still looks unsafe, so a name like
   * "../../strategus-results/x.zip" can never be used to write outside the
   * object's own `{id}/` prefix. Returns null when the name is unusable.
   */
  private sanitizeFileName(name: string): string | null {
    const base = name.split(/[/\\]/).pop() ?? "";
    if (!base || base === "." || base === "..") return null;
    // deno-lint-ignore no-control-regex
    if (/[\x00-\x1f\x7f]/.test(base)) return null;
    return base;
  }

  /**
   * Parses a query value to a non-negative integer, falling back to
   * `undefined` (so the service applies its own default) when the value is
   * absent, non-numeric, or negative. The service's page-size cap remains the
   * single source of truth for the maximum.
   */
  private parseNonNegativeInt(value: unknown): number | undefined {
    if (typeof value !== "string" || !/^\d+$/.test(value)) return undefined;
    const parsed = Number(value);
    return Number.isSafeInteger(parsed) ? parsed : undefined;
  }

  private requireAuth(req: Request, res: Response) {
    if (!req.headers["authorization"]) {
      res.status(401).json({ message: "Authorization header is required" });
      return false;
    }
    return true;
  }

  /**
   * Validates a multipart upload and replies directly on failure. Returns null
   * once a response has been sent, so callers just `if (!validated) return;`.
   */
  private validateUpload(
    req: Request,
    res: Response,
  ): ValidatedUpload | null {
    const authHeader = req.headers["authorization"] as string;
    if (!authHeader) {
      res.status(401).json({ message: "Authorization header is required" });
      return null;
    }

    const file = (req as Request & { file?: UploadedFile }).file;
    if (!file) {
      res.status(400).json({ message: "No file provided" });
      return null;
    }

    const sanitizedName = this.sanitizeFileName(file.originalname);
    if (!sanitizedName) {
      res.status(400).json({ message: "Invalid file name" });
      return null;
    }
    file.originalname = sanitizedName;

    if (!file.originalname.endsWith(".zip")) {
      res.status(400).json({
        message: "Invalid file type. Only .zip files are allowed",
      });
      return null;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      res.status(400).json({
        message: "File size exceeds maximum allowed size of 500MB",
      });
      return null;
    }

    const name = req.body?.name;
    if (!name) {
      res.status(400).json({ message: "Missing required field: name" });
      return null;
    }

    let metadata: Record<string, unknown> | undefined;
    const rawMetadata = req.body?.metadata;
    if (rawMetadata !== undefined && rawMetadata !== "") {
      try {
        metadata = JSON.parse(rawMetadata);
      } catch {
        res.status(400).json({
          message: "Invalid metadata: must be valid JSON",
        });
        return null;
      }
    }

    return { authHeader, file, name, metadata };
  }

  private handleError(res: Response, error: unknown, message: string) {
    console.error(`${message}:`, error);
    if (error instanceof StorageError) {
      return res.status(error.statusCode === 404 ? 404 : 502).json({
        message: error.message,
      });
    }
    return res.status(500).json({ message });
  }
}
