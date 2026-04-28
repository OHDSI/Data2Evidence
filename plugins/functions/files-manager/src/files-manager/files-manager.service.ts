import { Service } from "typedi";
import { Buffer } from "buffer";
import crypto from "crypto";
import { UserDataRepository } from "./repository/user-data.repository";
import { BlobDataRepository } from "./repository/blob-data.repository";
import { FileSaveResponse } from "../types";
import { UserData } from "./entity/user-data.entity";
import { BlobData } from "./entity/blob-data.entity";

@Service()
export class FilesManagerService {
  private readonly logger = console;

  constructor(
    private readonly userDataRepo: UserDataRepository,
    private readonly blobDataRepo: BlobDataRepository
  ) {}

  async getFile(userDataId: string) {
    const userData: UserData = await this.userDataRepo.findOne({
      where: {
        id: userDataId,
      },
      relations: ["blobData"],
    });

    const blobId = userData.blobData.data;
    const query = `SELECT convert_from(lo_get($1)::bytea, 'UTF8') AS data FROM "files_manager"."blob_data"`;
    const result = await this.blobDataRepo.query(query, [blobId]);

    return Buffer.from(result[0].data, "hex");
  }

  async saveFile(
    username: string,
    dataKey: string,
    file: Express.Multer.File
  ): Promise<FileSaveResponse> {
    this.logger.info("saving file");

    const filename = file.originalname;
    const hash = crypto.createHash("md5").update(file.buffer).digest("hex");

    // return file response if data exists in the user repository
    const existingUserData: UserData = await this.userDataRepo.findOne({
      select: {
        id: true,
        username: true,
        dataKey: true,
        fileName: true,
      },
      where: {
        hash: hash,
        username: username,
        dataKey: dataKey,
        fileName: filename,
      },
    });

    if (existingUserData) {
      return {
        id: existingUserData.id,
        username: existingUserData.username,
        dataKey: existingUserData.dataKey,
        fileName: existingUserData.fileName,
      };
    }

    // return blobId if file already exists, else create new blob
    const blobData = await this.userDataRepo
      .findOne({
        where: {
          hash: hash,
        },
        relations: ["blobData"],
      })
      .then(async (db) => {
        if (db) {
          return db.blob_data;
        } else {
          const hexString = file.buffer.toString("hex");
          const query = `INSERT INTO "files_manager"."blob_data"("data") VALUES (lo_from_bytea(0, $1)) RETURNING "id"`;
          return await this.blobDataRepo.query(query, [hexString]);
        }
      });

    // finally insert into user
    const userData: UserData = this.userDataRepo.create({
      hash: hash,
      username: username,
      dataKey: dataKey,
      fileName: filename,
      blobId: blobData[0].id,
    });

    await this.userDataRepo.save(userData);

    const fileSaveResponse: FileSaveResponse = {
      id: userData.id,
      username: username,
      dataKey: dataKey,
      fileName: file.originalname,
    };
    return fileSaveResponse;
  }

  async deleteData(userDataId: string): Promise<void> {
    try {
      const userData: UserData = await this.userDataRepo.findOne({
        where: {
          id: userDataId,
        },
        relations: ["blobData"],
      });

      await this.userDataRepo.delete(userData);

      const blobData: BlobData = await this.blobDataRepo.findOne({
        where: {
          id: userData.blobId,
        },
        relations: ["userData"],
      });

      if (blobData.userData.length < 2) {
        await this.blobDataRepo.delete({ id: blobData.id });
        await this.blobDataRepo.query("SELECT lo_unlink($1)", [blobData.data]);
      }
    } catch (error) {
      this.logger.error(error);
      throw new Error(error);
    }

    return;
  }

  async getUserById(userDataId: string): Promise<UserData> {
    return await this.userDataRepo.findOne({
      where: {
        id: userDataId,
      },
    });
  }
}
