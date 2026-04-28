import * as _ from "underscore";
import { REQUIRED_URL_SCOPES } from "./security-scopes";
import { CreateLogger } from "./Logger";
const log = CreateLogger();
export class SecurityUtils {
  constructor() {}
  private appName;

  public authenticateRequest(app, xsenv) {
    throw new Error("This feature is deprecated");
  }

  public authorizeRequest() {
    return (req, res, next) => {
      const url = req.url;
      const httpMethod = req.method;
      if (!req.authInfo || !req.authInfo.scopes) {
        throw new Error("Invalid authInfo!");
      }
      const authInfo = req.authInfo;
      const result =
        _.intersection(authInfo.scopes, this._getRequiredScope(url, httpMethod))
          .length > 0;

      log.debug(`Authorizing [url:${url}; httpMethod:${httpMethod}; appName:${
        authInfo.xsappname
      }]...
        \nauthInfo.scopes: ${authInfo.scopes}
        \nRequired Scopes: ${this._getRequiredScope(url, httpMethod)}
        \nRequired XSAppname: ${this.appName}
        \nisAuthorized: ${result}`);

      if (result) {
        next();
      } else {
        const errMsg = `Request not authorized![user:${req.user.id}; url:${url}; httpMethod:${httpMethod}; appName:${this.appName}]`;
        console.error(errMsg);
        return res.status(401).send(errMsg);
      }
    };
  }

  private _getRequiredScope(url: string, httpMethod: string) {
    let scopes = [];
    let regex;
    for (const i in REQUIRED_URL_SCOPES) {
      const el: any = REQUIRED_URL_SCOPES[i];
      regex = new RegExp(el.path);
      if (el.httpMethods && el.httpMethods.length > 0) {
        // if url pattern & http method are defined, then both should match with the incoming values
        if (url.match(regex) && el.httpMethods.indexOf(httpMethod) !== -1) {
          scopes = el.scopes;
          break;
        }
      } else {
        // if only the url pattern is defined, then ignore the incoming http method value & match only the url
        if (url.match(regex)) {
          scopes = el.scopes;
          break;
        }
      }
    }
    const scopesWithAppName = [];
    scopes.forEach((scope) => {
      scopesWithAppName.push(`${this.appName}.${scope}`);
    });
    return scopesWithAppName;
  }
}
