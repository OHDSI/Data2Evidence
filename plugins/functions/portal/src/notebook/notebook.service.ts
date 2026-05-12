import {
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  SCOPE,
} from "@danet/core";
import { v4 as uuidv4 } from "uuid";
import { Git } from "../../../_shared/git/Git.ts";
import { DEFAULT_ERROR_MESSAGE } from "../common/const.ts";
import { RequestContextService } from "../common/request-context.service.ts";
import { ConfigService } from "../config/config.service.ts";
import { INotebook, INotebookBaseDto, INotebookUpdateDto } from "../types.d.ts";
import { ServiceName } from "../user-artifact/enums/index.ts";
import { UserArtifactService } from "../user-artifact/user-artifact.service.ts";
import { NotebookTemplateDto } from "./dto/notebook-template.dto.ts";
import { env } from "../env.ts";

const JSON_FILE_FILTER = /\.json$/;

@Injectable({ scope: SCOPE.REQUEST })
export class NotebookService {
  private readonly userId: string;
  private readonly gitRepoPath = "./NotebookRepository";
  private readonly templateRepoPath = "./NotebookTemplateRepository";
  private readonly notebooksFolder = "notebooks";
  private readonly defaultAuthor = {
    name: "Notebook System",
    email: "we@data4life-asia.care",
  };

  constructor(
    private readonly userArtifactService: UserArtifactService,
    private readonly requestContextService: RequestContextService,
    private readonly configService: ConfigService,
  ) {
    this.userId = this.requestContextService.getAuthToken()?.sub;
  }

  // --- Git helpers ---

  private async getMainGit(): Promise<Git | null> {
    try {
      const config = await this.configService.getConfigValuesByTypes([
        "notebook-git-config",
      ]);
      const value = config["notebook-git-config"];
      if (!value) return null;
      const cfg = JSON.parse(value) as {
        repoUrl?: string;
        branch?: string;
        pat?: string;
      };
      if (!cfg.repoUrl || !cfg.branch) return null;
      return new Git({
        repoDir: this.gitRepoPath,
        repoUrl: cfg.repoUrl,
        branch: cfg.branch,
        pat: cfg.pat,
        subDir: this.notebooksFolder,
      });
    } catch (error) {
      console.error(`Failed to resolve notebook git config: ${error}`);
      return null;
    }
  }

  private getTemplateGit(): Git {
    return new Git({
      repoDir: this.templateRepoPath,
      repoUrl: env.NOTEBOOK_TEMPLATE_REPO_URL,
      branch: env.NOTEBOOK_TEMPLATE_BRANCH,
      subDir: this.notebooksFolder,
    });
  }

  private buildAuthor(name?: string) {
    return {
      name: name || this.defaultAuthor.name,
      email: this.defaultAuthor.email,
    };
  }

  // --- Public methods ---

  async getNotebooksByUserId(): Promise<any[]> {
    try {
      const userNotebooks =
        await this.userArtifactService.getAllUserServiceArtifacts(
          ServiceName.NOTEBOOKS,
          this.userId,
        );
      return userNotebooks;
    } catch (error) {
      console.error(
        `Error while getting notebooks for user id ${this.userId}: ${error}`,
      );
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE);
    }
  }

  async createNotebook(notebookDto: INotebookBaseDto): Promise<INotebook> {
    try {
      const notebookEntity = this.addOwner(
        {
          ...notebookDto,
          id: uuidv4(),
          userId: this.userId,
          isShared: false,
        },
        true,
      );
      await this.userArtifactService.createServiceArtifact(
        ServiceName.NOTEBOOKS,
        { serviceArtifact: notebookEntity },
      );
      console.log(
        `Created new notebook ${notebookEntity.name} with id ${notebookEntity.id}`,
      );

      await this.saveToGitRepo(
        notebookEntity.id,
        notebookEntity,
        `Created new notebook ${notebookEntity.name} with id ${notebookEntity.id}`,
      );

      return notebookEntity;
    } catch (error) {
      console.error(`Error while creating new notebook: ${error}`);
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE);
    }
  }

  async updateNotebook(
    notebookUpdateDto: INotebookUpdateDto,
  ): Promise<INotebook> {
    try {
      const notebook =
        await this.userArtifactService.getUserServiceArtifactById(
          this.userId,
          ServiceName.NOTEBOOKS,
          notebookUpdateDto.id,
        );

      if (notebook.userId !== this.userId) {
        console.error("Notebook does not belong to user!");
        throw new InternalServerErrorException(
          "Notebook does not belong to user!",
        );
      }

      const updatedServiceEntity = this.addOwner({
        userId: this.userId,
        id: notebookUpdateDto.id,
        serviceArtifact: notebookUpdateDto,
      });
      await this.userArtifactService.updateServiceArtifactEntity(
        ServiceName.NOTEBOOKS,
        updatedServiceEntity,
      );

      await this.saveToGitRepo(
        notebookUpdateDto.id,
        notebookUpdateDto,
        `Updated notebook ${notebookUpdateDto.name}`,
      );

      console.log(`Updated notebook ${notebookUpdateDto.name}`);
      return { ...notebookUpdateDto, userId: this.userId };
    } catch (error) {
      console.error(
        `Error while updating notebook ${notebookUpdateDto.id}: ${error}`,
      );
      if (error instanceof NotFoundException) {
        throw new NotFoundException(
          `Notebook with id ${notebookUpdateDto.id} not found`,
        );
      }
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE);
    }
  }

  async deleteNotebook(id: string): Promise<any> {
    try {
      const notebook = await this.getNotebook(id);
      await this.userArtifactService.deleteUserServiceArtifact(
        this.userId,
        ServiceName.NOTEBOOKS,
        id,
      );

      await this.deleteFromGitRepo(
        id,
        `Deleted notebook ${notebook.name} with id ${id}`,
      );

      return notebook;
    } catch (error) {
      console.error(`Error deleting notebook ${id}: ${error}`);
      if (error instanceof NotFoundException) {
        throw new NotFoundException(`Notebook with id ${id} not found`);
      }
      throw new InternalServerErrorException(DEFAULT_ERROR_MESSAGE);
    }
  }

  async overwriteNotebookFromRemote(notebookId: string) {
    const git = await this.getMainGit();
    if (!git) {
      return {
        message: "Git config not set, skip git operations",
        overwritten: false,
        notebookId,
      };
    }

    const fileName = `${notebookId}.json`;

    let remoteNotebookData: any;
    try {
      remoteNotebookData = JSON.parse(await git.readFile(fileName));
    } catch {
      return {
        message: `Notebook ${notebookId} not found in remote repository, no action taken`,
        overwritten: false,
        notebookId,
      };
    }

    const localNotebook = await this.tryGetNotebook(notebookId);

    if (localNotebook) {
      const localContent = JSON.stringify(localNotebook.notebookContent || "");
      const remoteContent = JSON.stringify(
        remoteNotebookData.notebookContent || "",
      );

      if (localContent === remoteContent) {
        return {
          message: `Notebook ${notebookId} content is identical to remote, no action taken`,
          overwritten: false,
          notebookId,
        };
      }
    }

    const updatedNotebook = {
      id: notebookId,
      name:
        remoteNotebookData.name ||
        localNotebook?.name ||
        `Imported Notebook ${notebookId}`,
      notebookContent: remoteNotebookData.notebookContent || "",
      isShared: remoteNotebookData.isShared || false,
      userId: this.userId,
    };

    if (localNotebook) {
      const updatedServiceEntity = this.addOwner({
        userId: this.userId,
        id: notebookId,
        serviceArtifact: updatedNotebook,
      });
      await this.userArtifactService.updateServiceArtifactEntity(
        ServiceName.NOTEBOOKS,
        updatedServiceEntity,
      );
    } else {
      const newServiceEntity = this.addOwner(updatedNotebook, true);
      await this.userArtifactService.createServiceArtifact(
        ServiceName.NOTEBOOKS,
        { serviceArtifact: newServiceEntity },
      );
    }

    console.log(`Overwritten notebook ${notebookId} from remote`);

    return {
      message: `Successfully overwritten notebook ${notebookId} from remote due to content mismatch`,
      overwritten: true,
      notebookId,
    };
  }

  async checkNotebookDiffFromRemote(notebookId: string) {
    const git = await this.getMainGit();
    if (!git) return { hasDifferences: false, reason: "Git config not set" };

    const fileName = `${notebookId}.json`;

    let remoteNotebookData: any;
    try {
      remoteNotebookData = JSON.parse(await git.readFile(fileName));
    } catch {
      return {
        hasDifferences: false,
        reason: "Notebook not found in remote repository",
      };
    }

    try {
      const localNotebook = await this.getNotebook(notebookId);
      const localContent = JSON.stringify(localNotebook.notebookContent || "");
      const remoteContent = JSON.stringify(
        remoteNotebookData.notebookContent || "",
      );
      const hasDifferences = localContent !== remoteContent;

      return {
        hasDifferences,
        reason: hasDifferences
          ? "Content differs from remote"
          : "Content is identical to remote",
      };
    } catch {
      console.log(`No local notebook found for ${notebookId}`);
      return { hasDifferences: true, reason: "No local notebook found" };
    }
  }

  async overwriteAllNotebooksFromRemote() {
    const git = await this.getMainGit();
    if (!git) throw new Error("Git config not set, cannot sync from remote");

    await git.ensureLatest();
    const fileNames = await git.listFiles(JSON_FILE_FILTER);

    const existingNotebooks = await this.getNotebooksByUserId();
    for (const notebook of existingNotebooks) {
      await this.userArtifactService.deleteUserServiceArtifact(
        this.userId,
        ServiceName.NOTEBOOKS,
        notebook.id,
      );
    }

    if (fileNames.length === 0) {
      return {
        message: "No notebooks folder found",
        processedCount: 0,
        results: [],
      };
    }

    const results: any[] = [];
    for (const fileName of fileNames) {
      const notebookId = fileName.replace(".json", "");
      try {
        const remoteData = JSON.parse(await git.readFile(fileName));
        const notebookEntity = this.addOwner(
          {
            id: notebookId,
            name: remoteData.name || `Notebook ${notebookId}`,
            notebookContent: remoteData.notebookContent || "",
            isShared: remoteData.isShared || false,
            userId: this.userId,
          },
          true,
        );

        await this.userArtifactService.createServiceArtifact(
          ServiceName.NOTEBOOKS,
          { serviceArtifact: notebookEntity },
        );

        results.push({ notebookId, name: notebookEntity.name });
      } catch (fileError: any) {
        console.error(
          `Failed to process file ${fileName}: ${fileError.message}`,
        );
        results.push({
          notebookId,
          error: `Failed to process: ${fileError.message}`,
        });
      }
    }

    console.log(
      `Successfully overwritten all notebooks from remote. Processed ${fileNames.length} files`,
    );

    return {
      message: "Successfully overwritten all notebooks from remote",
      processedCount: fileNames.length,
      results,
    };
  }

  async getTemplates(): Promise<NotebookTemplateDto[]> {
    const git = this.getTemplateGit();
    const fileNames = await git.listFiles(JSON_FILE_FILTER);

    const templates: NotebookTemplateDto[] = [];
    for (const fileName of fileNames) {
      const templateId = fileName.replace(".json", "");
      try {
        const templateData = JSON.parse(await git.readFile(fileName));
        templates.push({
          id: templateId,
          name: templateData.name || templateId,
          description: templateData.description || `Template: ${templateId}`,
          notebookContent: templateData.notebookContent || templateData,
        });
      } catch (fileError: any) {
        console.error(
          `Failed to process template file ${fileName}: ${fileError.message}`,
        );
      }
    }

    console.log(`Found ${templates.length} notebook templates`);
    return templates;
  }

  async createNotebookFromTemplate(
    templateId: string,
    name: string,
  ): Promise<INotebook> {
    const git = this.getTemplateGit();
    const fileName = `${templateId}.json`;

    let templateData: any;
    try {
      templateData = JSON.parse(await git.readFile(fileName));
    } catch {
      throw new Error(`Template ${templateId} not found`);
    }

    const notebookDto: INotebookBaseDto = {
      name,
      notebookContent: templateData.notebookContent || templateData,
    };

    const result = await this.createNotebook(notebookDto);
    console.log(
      `Created new notebook from template ${templateId} with id ${result.id}`,
    );
    return result;
  }

  // --- Private helpers ---

  private async saveToGitRepo(
    notebookId: string,
    notebookEntity: any,
    commitMessage: string,
  ) {
    const git = await this.getMainGit();
    if (!git) {
      console.log(
        "Git remote URL or default branch not configured, skipping Git operations",
      );
      return;
    }

    const author = this.buildAuthor(notebookEntity.createdBy);
    const fileName = `${notebookId}.json`;
    const content = JSON.stringify(notebookEntity, null, 2);

    await git.saveFile(fileName, content, commitMessage, author);
  }

  private async deleteFromGitRepo(notebookId: string, commitMessage: string) {
    const git = await this.getMainGit();
    if (!git) {
      console.log(
        "Git remote URL or default branch not configured, skipping Git operations",
      );
      return;
    }

    const author = this.buildAuthor(this.userId);
    await git.deleteFile(`${notebookId}.json`, commitMessage, author);
  }

  private async getNotebook(id: string) {
    const notebook = await this.userArtifactService.getUserServiceArtifactById(
      this.userId,
      ServiceName.NOTEBOOKS,
      id,
    );
    if (!notebook) {
      throw new NotFoundException(`Notebook with id ${id} not found`);
    }
    return notebook;
  }

  private async tryGetNotebook(id: string) {
    try {
      return await this.getNotebook(id);
    } catch {
      return null;
    }
  }

  private addOwner<T>(object: T, isNewEntity = false) {
    if (isNewEntity) {
      return {
        ...object,
        createdBy: this.userId,
        modifiedBy: this.userId,
      };
    }
    return { ...object, modifiedBy: this.userId };
  }
}
