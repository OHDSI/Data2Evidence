import { Logger } from "@alp/alp-base-utils";
import * as http from "http";
import { StudyMriConfigMetaDataType } from "../types";
// import * as https from "https";
const log = Logger.CreateLogger("config-util-log");

export default class MriConfigConnection {
    private serverUrl: string;
    private agent: any;
    private paconfigapi: any;

    constructor(serverUrl: string) {
        this.serverUrl = serverUrl;
        this.agent = new http.Agent({ keepAlive: true })
        this.paconfigapi = Trex.tokioChannel("d2e-functions/mri-pa-config");
    }

    public async getMriConfig(req, payload) {
            let authorizationValue = req.headers.authorization;
            const { action, datasetId, configId } = payload;
            const options = {
              headers: {
                authorization: authorizationValue, // Replace user JWT (req.headers.authorization)
              },
              httpAgent: this.agent
            };

            const body = {
              action,
              configId,
            };
            const url = `${this.serverUrl}/enduser?datasetId=${datasetId}`;
            const result = await this.paconfigapi.post(url, body, options);

          return result.data;
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
      // log.info(`action: ${action}`);
      // log.info(`configId: ${configId}`);
      // log.info(`configVersion: ${configVersion}`);
      // log.info(`lang: ${lang}`);
      // log.info(`datasetId: ${datasetId}`);
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
