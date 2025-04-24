import { User } from "./User";
import { Constants } from "./Constants";
import { IMRIDBRequest } from "./types";
import { Logger } from "./index";
import { decodeString } from "./utils";
const log = Logger.CreateLogger("mri-util-log");
import { decode } from "jsonwebtoken";

export const getUser = (req: Pick<IMRIDBRequest, "headers">): User => {
  try {
    const lang = (req.headers["x-language"] as string) || "en";
    const userToken: string = JSON.stringify(
      decode(req.headers["authorization"].replace(/bearer /i, "")),
    );

    const user = new User(JSON.parse(userToken), lang);

    // For HANA JWT Authentication
    const thirdPartyToken = decode(
      req.headers["authorization"].replace(/bearer /i, ""),
    )["thirdPartyToken"];
    if (thirdPartyToken) {
      user.thirdPartyToken = thirdPartyToken;
    }
    return user;
  } catch (err) {
    throw err;
  }
};
