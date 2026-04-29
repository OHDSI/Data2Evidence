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
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const decodedToken = decode(authHeader.replace(/bearer /i, ""));
    if (!decodedToken || typeof decodedToken === "string") {
      throw new Error("Failed to decode JWT token - invalid token format");
    }

    let user = new User(decodedToken, lang);

    // For HANA JWT Authentication
    const thirdPartyToken = decodedToken["thirdPartyToken"];
    if (thirdPartyToken) {
      const thirdPartyDecoded = decode(thirdPartyToken);
      if (thirdPartyDecoded && typeof thirdPartyDecoded !== "string") {
        user = new User(thirdPartyDecoded, lang, thirdPartyToken); //Override logto IDP with thirdparty token
      }
    }
    return user;
  } catch (err) {
    throw err;
  }
};
