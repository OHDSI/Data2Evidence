import { env } from "../env.ts";
import fs from "fs";

export default class StrategusViewerTemplateService {
  private readonly repoDir = "./StudiesRepository";
  private readonly repositoryUrl = env.GIT_RESULT_VIEWER_TEMPLATE_REPO_URL;
  private readonly repositoryBranch =
    env.GIT_RESULT_VIEWER_TEMPLATE_REPO_BRANCH;

  constructor() {
    if (!fs.existsSync(this.repoDir)) {
      fs.mkdirSync(this.repoDir, { recursive: true });
    }
  }

  public getTemplatesFromRepository(): string {
    return "getTemplatesFromRepository";
  }
}
