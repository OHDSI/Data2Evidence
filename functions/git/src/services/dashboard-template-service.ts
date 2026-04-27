import { GitService } from "./git-service.ts";
import { resolveConfigFromEnv } from "./config-resolvers.ts";
import { TemplateData } from "../types.ts";

const R_FILE_FILTER = /\.(r|R)$/;

export class DashboardTemplateService {
  private readonly gitService: GitService;

  constructor() {
    const config = resolveConfigFromEnv(
      "GIT_DASHBOARDS_REPO_URL",
      "GIT_DASHBOARDS_REPO_BRANCH",
      "./StudiesDashboardRepository"
    );
    this.gitService = new GitService(config);
  }

  async getTemplates(): Promise<TemplateData[]> {
    await this.gitService.ensureLatest();

    const fileNames = await this.gitService.listFiles(R_FILE_FILTER);
    const templates: TemplateData[] = [];

    for (const filename of fileNames) {
      const content = await this.gitService.readFile(filename);
      templates.push({ filename, content });
    }

    return templates;
  }
}
