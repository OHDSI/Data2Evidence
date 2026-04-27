import { GitService } from "./git-service.ts";
import { resolveConfigFromEnv } from "./config-resolvers.ts";
import { StudiesData } from "../types.ts";

const STUDIES_JSON_NAME = "studies.json";

export class StudiesService {
  private readonly gitService: GitService;

  constructor() {
    const config = resolveConfigFromEnv(
      "GIT_STUDIES_REPO_URL",
      "GIT_STUDIES_REPO_BRANCH",
      "./StudiesRepository"
    );
    this.gitService = new GitService({ ...config, submodules: true });
  }

  async getStudies(): Promise<StudiesData> {
    const content = await this.gitService.readFile(STUDIES_JSON_NAME);
    return JSON.parse(content) as StudiesData;
  }

  async getStudyStrategusJson(studyId: string): Promise<unknown> {
    const studies = await this.getStudies();

    if (!studies[studyId]) {
      throw new Error(`Study ${studyId} not found in repository`);
    }

    const strategusPath = studies[studyId].strategus_json;
    const content = await this.gitService.readFileByPath(strategusPath);
    return JSON.parse(content);
  }
}
