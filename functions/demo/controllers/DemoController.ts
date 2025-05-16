import express, { Request, Response } from "express";
import { DemoService } from "../services/DemoService.ts";
import { IStepInfo, IProgress, IStepTask } from "../type.d.ts";

export class DemoController {
  public router = express.Router();
  private service = new DemoService();
  private progressMap = new Map<string, IProgress>();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/setup", this.executeSetup.bind(this));
    this.router.post("/setup-db", this.executeSetupDb.bind(this));
    this.router.post("/setup-dataset", this.executeSetupDataset.bind(this));
    this.router.get("/progress/:id", this.getProgress.bind(this));
  }

  private async executeSetup(req: Request, res: Response) {
    const steps: IStepTask[] = [
      {
        code: "db",
        message: "Adding demo database...",
        task: this.service.addDatabase.bind(this.service),
      },
      {
        code: "dataset",
        message: "Adding demo dataset...",
        task: this.service.addDataset.bind(this.service),
      },
      {
        code: "dqd",
        message: "Running DQD on demo dataset...",
        task: this.service.runDQD.bind(this.service),
      },
      {
        code: "dc",
        message: "Running DC on demo dataset...",
        task: this.service.runDC.bind(this.service),
      },
      {
        code: "metadata",
        message: "Updating metadata for dataset...",
        task: this.service.updateDatasetMetadata.bind(this.service),
      },
    ];

    return await this.executeSteps(req, res, steps);
  }

  private async executeSetupDb(req: Request, res: Response) {
    const steps: IStepTask[] = [
      {
        code: "db",
        message: "Adding demo database...",
        task: this.service.addDatabase.bind(this.service),
      },
    ];

    return await this.executeSteps(req, res, steps);
  }

  private async executeSetupDataset(req: Request, res: Response) {
    const steps: IStepTask[] = [
      {
        code: "dataset",
        message: "Adding demo dataset...",
        task: this.service.addDataset.bind(this.service),
      },
      {
        code: "dqd",
        message: "Running DQD on demo dataset...",
        task: this.service.runDQD.bind(this.service),
      },
      {
        code: "dc",
        message: "Running DC on demo dataset...",
        task: this.service.runDC.bind(this.service),
      },
      {
        code: "metadata",
        message: "Updating metadata for dataset...",
        task: this.service.updateDatasetMetadata.bind(this.service),
      },
    ];

    return await this.executeSteps(
      req,
      res,
      steps,
      undefined,
      "Setup completed successfully. Go to Job Runs to view the result."
    );
  }

  private async executeSteps(
    req: Request,
    res: Response,
    steps: IStepTask[],
    initMessage = "Setup initiated.",
    completionMessage = "Setup completed successfully."
  ) {
    const id = `${Date.now()}-${Math.random()}`;

    this.progressMap.set(id, { steps: [], status: "inprogress" });
    const progress = this.progressMap.get(id);
    if (!progress) throw new Error("No progress found");

    const token = req.headers.authorization!;
    res.json({ id, message: initMessage });

    try {
      for (let i = 0; i < steps.length; i++) {
        const { code, message, task } = steps[i];
        const current: IStepInfo = {
          step: i + 1,
          code,
          message,
          status: "inprogress",
        };

        progress.steps.push(current);
        const idx = progress.steps.findIndex((s) => s.step === current.step);

        try {
          const result = await task(token, req.body, progress);

          if (idx !== -1) {
            progress.steps[idx].status = "completed";
            progress.steps[idx].result = result;
          }
        } catch (error) {
          current.message = `Failed: ${message} (${error.message})`;

          if (idx !== -1) {
            progress.steps[idx].status = "failed";
            progress.steps[idx] = current;
          }
          throw error; // Stop execution on failure
        }
      }

      progress.status = "completed";
      progress.steps.push({
        step: progress.steps.length + 1,
        message: completionMessage,
        status: "no_status",
      });
    } catch (error) {
      progress.status = "failed";
      console.error(error);
    }
  }

  private getProgress(req: Request, res: Response) {
    const { id } = req.params;
    const progressData = this.progressMap.get(id);

    if (!progressData) {
      return res.status(404).json({ message: "Progress not found." });
    }

    res.json(progressData);
  }
}
