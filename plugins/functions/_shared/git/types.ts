export interface GitConfig {
  repoDir: string;
  repoUrl: string;
  branch: string;
  pat?: string;
  subDir?: string;
  submodules?: boolean;
}

export interface GitAuthor {
  name: string;
  email: string;
}

export interface GitSubmodule {
  name: string;
  path: string;
  url: string;
  branch?: string;
}

export type PartialGitSubmodule = Partial<GitSubmodule> & { name?: string };

export interface TemplateData {
  filename: string;
  content: string;
}

export interface StudyMetadata {
  strategus_json: string;
  description?: string;
  email?: string;
}

export interface StudiesData {
  [studyId: string]: StudyMetadata;
}
