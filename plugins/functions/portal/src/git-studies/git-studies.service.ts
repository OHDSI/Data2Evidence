import { Injectable } from "@danet/core";
import { Git } from "../../../_shared/git/Git.ts";
import { env } from "../env.ts";
import type { StudiesData } from "../types.d.ts";
import { STUDIES_JSON_NAME } from "../common/const.ts";

@Injectable()
export class GitStudiesService {
  private readonly git: Git;

  constructor() {
    this.git = new Git({
      repoDir: "./StudiesRepository",
      repoUrl: env.GIT_STUDIES_REPO_URL,
      branch: env.GIT_STUDIES_REPO_BRANCH || "develop",
      submodules: true,
    });
  }

  async getStudiesFromRepo(): Promise<StudiesData> {
    const content = await this.git.readFile(STUDIES_JSON_NAME);
    const studiesData = JSON.parse(content) as StudiesData;
    console.log(
      `Found ${Object.keys(studiesData).length} studies in repository`
    );
    return studiesData;
  }

  async getStudyStrategusJson(studyId: string) {
    const studies = await this.getStudiesFromRepo();
    if (!studies[studyId]) {
      throw new Error(`Study ${studyId} not found in repository`);
    }
    const strategusPath = studies[studyId].strategus_json;
    console.log(`Looking for strategus JSON at: ${strategusPath}`);
    const content = await this.git.readFileByPath(strategusPath);
    console.log(`Successfully loaded strategus JSON for study ${studyId}`);
    return JSON.parse(content);
  }
}
