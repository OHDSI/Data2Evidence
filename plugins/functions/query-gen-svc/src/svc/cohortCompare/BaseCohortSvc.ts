import * as utilsLib from "@alp/alp-base-utils";
import ConnectionInterface = utilsLib.Connection.ConnectionInterface;
import { Settings } from "../../qe/settings/Settings";
import { Fast } from "../../req_transformation/fast";
import { getAstFactory } from "../../qe/sql_generator2/AstFactory";
import { PluginColumnType } from "../../types";
import { Utils } from "../../qe/sql_generator2/Utils";
import { Config } from "../../qe/qe_config_interface/Config";
import { bookmarkToIFRBackend } from "../../utils/formatter/BookmarkFormatter";
import { IMRIRequest } from "../../types";
import { updateIfrWithConcepts } from "../../utils/formatter/ConceptSetToConceptConverter";
const utils = utilsLib.utils;

export class BaseCohortSvc {
    constructor(
        public props: {
            userSelectedAttributes: PluginColumnType[];
            yaxis: string;
            user: string;
            lang: string;
            backendConfig: any;
            bookmarks: any;
            req: IMRIRequest;
        }
    ) {}

    public async getcohortsql() {
        const settings = new Settings().initAdvancedSettings(
            this.props.backendConfig.advancedSettings
        );
        let pholderTableMap = settings.getPlaceholderMap();

        let queryList = await Promise.all(
            this.props.bookmarks.map(async (bmk) => {
                let convertedIFR = await bookmarkToIFRBackend(
                    JSON.parse(bmk.bookmark)
                );

                const ifrWithConceptSetConcepts = await updateIfrWithConcepts(
                    this.props.backendConfig,
                    convertedIFR,
                    JSON.parse(bmk.bookmark).datasetId,
                    this.props.req.headers.authorization
                );

                let f = new Fast(
                    "plugin",
                    ifrWithConceptSetConcepts,
                    this.props.backendConfig,
                    pholderTableMap
                );
                let astFactory = getAstFactory(
                    new Config(this.props.backendConfig, pholderTableMap)
                );
                let nql = astFactory.astElementFactory(
                    JSON.parse(JSON.stringify(f.statement.statement)),
                    "statement",
                    "statement",
                    null
                );

                nql.generateSQL();
                let cohortSubquery = Utils.getContextSQL(nql, "patient");
                return {
                    ...bmk,
                    cohortSubquery,
                };
            })
        );
        return queryList;
    }

    public generateQuery(request?: any, cb?: any) {}
}
