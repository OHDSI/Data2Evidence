import { Constants, Logger, utils } from "@alp/alp-base-utils";
import * as http from "http";
import * as qs from "querystring";
import { URL } from "url";
import { StudyMriConfigMetaDataType } from "../types";
// import * as https from "https";
const log = Logger.CreateLogger("config-util-log");

export default class MriConfigConnection {
    private portalServerUrl: string;
    private agent: any;

    constructor(portalServerUrl: string) {
        this.portalServerUrl = portalServerUrl;
        this.agent = new http.Agent({ keepAlive: true })
    }

    public async getMriConfig(req, payload) {
        return new Promise(async (resolve, reject) => {
            const { hostname, port, protocol } = new URL(
                this.portalServerUrl,
            );

            const timestamp = (new Date()).valueOf();
            console.time(`time-mriconfigconnection-${timestamp}`)
      
            let authorizationValue = req.headers.authorization;
            const { action, datasetId } = payload;
            log.debug(`payload: ${qs.stringify(payload)}`);
            const sourceOrigin = req.headers["x-source-origin"];

            let urlPath: string;
            const options = {
              headers: {
                authorization: authorizationValue, // Replace user JWT (req.headers.authorization)
              },
              agent: this.agent
            };

            let result;
            let getReq;
            switch (action) {
              case "getBackendConfig":
                urlPath = "backend";
                getReq = await fetch(`${this.portalServerUrl}/dataset/pa-config/${urlPath}?datasetId=${datasetId}`, options);
                result = await getReq.json();
                // console.log(`backend ${JSON.stringify(result)}`)
                break;
              case "getMyConfig":
                  urlPath = "me";
                  getReq = await fetch(`${this.portalServerUrl}/dataset/pa-config/${urlPath}?datasetId=${datasetId}`, options);
                  result = await getReq.json();
                break;
              default:
                urlPath = "me";
            }

          // console.log(`urlpath-${timestamp} ${urlPath}`)
          console.timeEnd(`time-mriconfigconnection-${timestamp}`)

          resolve(result);
        });
    }

    public async getStudyConfig(
        opts,
        isAccessTokenRequired = false,
    ): Promise<StudyMriConfigMetaDataType> {
        const params = this.extractReqAndPayload(opts);
        const configObj: StudyMriConfigMetaDataType = this.emptyStudyMriConfigMetaDataType();
        const configResp = await this.getMriConfig(params.req, params.payload);
        Object.keys(configResp).forEach((k) => configObj[k] = configResp[k]);
        const replaceFn = (mapping: Map<string, string>, replacement: string) => {
            for (const [key, value] of Object.entries(mapping)) {
                mapping[key] = value.replace(/\$\$SCHEMA\$\$./g, `${replacement}.`);
            }
        };
        log.debug(`configObj.schemaName: ${configObj.schemaName}`);
        if (configObj.schemaName) {
            replaceFn(
                configObj.config.advancedSettings.guardedTableMapping,
                configObj.schemaName,
            );
            replaceFn(
                configObj.config.advancedSettings.tableMapping,
                configObj.schemaName,
            );
        }

        return configObj;
    }

    public async getScoreConfig(
        opts,
    ): Promise<StudyMriConfigMetaDataType> {
        const params = this.extractReqAndPayload(opts);
        const configObj: StudyMriConfigMetaDataType = this.emptyStudyMriConfigMetaDataType();
        const configResp = await this.getMriConfig(params.req, params.payload);
        Object.keys(configResp).forEach((k) => configObj[k] = configResp[k]);
        return configObj;
    }

    private emptyStudyMriConfigMetaDataType() {
        return {
                config: {},
                meta: {
                    configId: "",
                    configVersion: "",
                    configStatus: "",
                    configName: "",
                    dependentConfig: {
                        configId: "",
                        configVersion: "",
                    },
                    creator: "",
                    created: "",
                    modifier: "",
                    modified: "",
                },
                schemaName: "",
            };
    }

    private extractReqAndPayload(opts) {
      const { req, action, configId, configVersion, lang, datasetId } = opts;
      log.info(`action: ${action}`);
      log.info(`configId: ${configId}`);
      log.info(`configVersion: ${configVersion}`);
      log.info(`lang: ${lang}`);
      log.info(`datasetId: ${datasetId}`);
      return {
        req,
        payload: {
          action,
          configId,
          configVersion,
          lang,
          datasetId,
        },
      };
    }
}
