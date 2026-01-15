import { Request, Response, Router } from "express";
import multer from "npm:multer";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";

const upload = multer({ storage: multer.memoryStorage() });

export class StrategusResultsController {
  public router = Router();
  private readonly STRATEGUS_RESULTS_BUCKET = "strategus-results";

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post(
      "/upload",
      upload.single("file"),
      this.uploadResultsFile.bind(this)
    );

    this.router.get("/list", this.listResultsFiles.bind(this));

    this.router.get("/download", this.downloadResultsFile.bind(this));

    this.router.delete("/delete", this.deleteResultsFile.bind(this));
  }

  private async uploadResultsFile(req: Request, res: Response) {
    try {
      const { studyId } = req.query;
      const authHeader = req.headers["authorization"];

      if (!authHeader) {
        return res
          .status(401)
          .json({ message: "Authorization header is required" });
      }

      if (!studyId) {
        return res
          .status(400)
          .json({ message: "studyId query parameter is required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Validate file type (must be .zip)
      if (!req.file.originalname.endsWith(".zip")) {
        return res.status(400).json({
          message: "Invalid file type. Only .zip files are allowed",
        });
      }

      const maxSize = 500 * 1024 * 1024; // 500MB
      if (req.file.size > maxSize) {
        return res.status(400).json({
          message: `File size exceeds maximum allowed size of 500MB`,
        });
      }

      const file = new File([req.file.buffer], req.file.originalname, {
        type: req.file.mimetype || "application/zip",
      });

      const storagePath = `${studyId}/${req.file.originalname}`;

      const portalAPI = new PortalServerAPI(authHeader);
      const result = await portalAPI.uploadFileToStrategusResults(
        this.STRATEGUS_RESULTS_BUCKET,
        storagePath,
        file
      );

      return res.status(200).json({
        message: "File uploaded successfully",
        bucket: this.STRATEGUS_RESULTS_BUCKET,
        path: storagePath,
        fileName: req.file.originalname,
        fileSize: req.file.size,
        studyId: studyId,
        uploadedAt: new Date().toISOString(),
        ...result,
      });
    } catch (error) {
      console.error("Error in uploadResultsFile: ", error);
      return res.status(500).json({ message: error.message });
    }
  }

  private async listResultsFiles(req: Request, res: Response) {
    try {
      const { studyId } = req.query;
      const authHeader = req.headers["authorization"];

      if (!authHeader) {
        return res
          .status(401)
          .json({ message: "Authorization header is required" });
      }

      if (!studyId) {
        return res
          .status(400)
          .json({ message: "studyId query parameter is required" });
      }

      const portalAPI = new PortalServerAPI(authHeader);
      const result = await portalAPI.listFilesFromStrategusResults(
        this.STRATEGUS_RESULTS_BUCKET,
        studyId as string
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in listResultsFiles: ", error);
      return res.status(500).json({ message: error.message });
    }
  }

  private async downloadResultsFile(req: Request, res: Response) {
    const { studyId, fileName } = req.query;
    try {
      const authHeader = req.headers["authorization"];

      if (!authHeader) {
        return res
          .status(401)
          .json({ message: "Authorization header is required" });
      }

      if (!studyId || !fileName) {
        return res.status(400).json({
          message: "studyId and fileName query parameters are required",
        });
      }

      const portalAPI = new PortalServerAPI(authHeader);
      const result = await portalAPI.getFileFromStrategusResults(
        this.STRATEGUS_RESULTS_BUCKET,
        studyId as string,
        fileName as string
      );

      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in downloadResultsFile: ", error);
      const statusCode = (error as Error & { statusCode?: number }).statusCode;
      if (
        statusCode === 404 ||
        error.message?.includes("not found") ||
        error.message?.includes("404")
      ) {
        return res.status(404).json({
          message: `File not found: ${fileName} in study ${studyId}`,
          error: error.message,
        });
      }
      return res.status(500).json({ message: error.message });
    }
  }

  private async deleteResultsFile(req: Request, res: Response) {
    const { studyId, fileName } = req.query;
    try {
      const authHeader = req.headers["authorization"];

      if (!authHeader) {
        return res
          .status(401)
          .json({ message: "Authorization header is required" });
      }

      if (!studyId || !fileName) {
        return res.status(400).json({
          message: "studyId and fileName query parameters are required",
        });
      }

      const portalAPI = new PortalServerAPI(authHeader);
      const result = await portalAPI.deleteFileFromStrategusResults(
        this.STRATEGUS_RESULTS_BUCKET,
        studyId as string,
        fileName as string
      );

      return res.status(200).json({
        message: "File deleted successfully",
        ...result,
      });
    } catch (error) {
      console.error("Error in deleteResultsFile: ", error);
      const statusCode = (error as Error & { statusCode?: number }).statusCode;
      if (
        statusCode === 404 ||
        error.message?.includes("not found") ||
        error.message?.includes("404")
      ) {
        return res.status(404).json({
          message: `File not found: ${fileName} in study ${studyId}`,
          error: error.message,
        });
      }
      return res.status(500).json({ message: error.message });
    }
  }
}
