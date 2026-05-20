import { Git } from "../../../_shared/git/Git.ts";
import { env } from "../env.ts";
import { ResultViewerTemplateData } from "../type.ts";

const R_FILE_FILTER = /\.(r|R)$/;

export default class StrategusViewerTemplateService {
  private readonly git: Git;

  constructor() {
    this.git = new Git({
      repoDir: "./ResultViewerTemplateRepository",
      repoUrl: env.GIT_RESULT_VIEWER_TEMPLATE_REPO_URL,
      branch: env.GIT_RESULT_VIEWER_TEMPLATE_REPO_BRANCH || "develop",
    });
  }

  public async getTemplatesFromRepository(): Promise<ResultViewerTemplateData[]> {
    const filenames = await this.git.listFiles(R_FILE_FILTER);
    const result: ResultViewerTemplateData[] = [];
    for (const filename of filenames) {
      result.push({ filename, content: await this.git.readFile(filename) });
    }
    return result;
  }
}
