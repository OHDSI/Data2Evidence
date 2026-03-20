import { ConfigEntity } from "./ConfigEntity";
import { EntityConfig } from "./EntityConfig";
import { PholderTableMapType, Settings } from "../settings/Settings";
let idSelectorRegex = new RegExp("ID\"$", "i");

export type measuresPlaceHolderType = {
    isMeassure: boolean;
    measureExpression: string;
    placeHolders: { value: string, alias: string }[]
};

export class Config {
    private settings: Settings;
    constructor(
        public __config: any,
        public placeholderMap: PholderTableMapType) {
            this.settings = new Settings();
            this.settings.initAdvancedSettings(this.__config.advancedSettings);

    }

    public getSettings(): Settings {
        return this.settings;
    } 

    public getEntityByPath(path: string): ConfigEntity {
        if (!path) {
            return null;
        }

        path = path.replace(/\-/g, ".");
        let tmp = JSON.parse(JSON.stringify(this.getConfigElement(this.__config, path)));
        let splitPath = path.split(".");

        for (let i = 0; i < splitPath.length; i++) {
            if (splitPath[i] === "conditions") {
                tmp.condition = splitPath[i + 1];
            }
        }

        tmp.interactionName = path.split(".").slice(-1)[0];

        let tmpPlaceholderMap = JSON.parse(JSON.stringify(this.placeholderMap));
        if (tmp.from) {
            Object.keys(tmp.from).forEach( (key) => {
                tmpPlaceholderMap[key] = tmp.from[key];
            });
        }
        return new EntityConfig(tmp, tmpPlaceholderMap, this.settings);
    }

    public buildMeassuresPlaceholdersByTemplate(templateId: string): measuresPlaceHolderType {

        let path = templateId.replace(/\-/g, ".");
        let config = JSON.parse(JSON.stringify(this.getConfigElement(this.__config, path)));
        let mE = config.expression;

        if (config.measureExpression) {
            mE = config.measureExpression;
            return this.buildMeassuresPlaceholders(mE, true);
        } else {
            return this.buildMeassuresPlaceholders(mE, false);
        }
    }

    public buildMeassuresPlaceholders(measureExpression: string, isMeassure: boolean): measuresPlaceHolderType {

        let mE = measureExpression;
        let varCount = -1;
        let placeHolderResult = [];
        let result = mE.replace(/@[*\.A-Z,a-z,_,\/"]+/g,  (x) => {
            varCount = varCount + 1;
            placeHolderResult.push({ value: x, alias: varCount.toString() });
            return "{" + varCount + "}";
        });

        return {
            isMeassure,
            measureExpression: result,
            placeHolders: placeHolderResult,
        };
    }

    public getColumn(columnId: string): string {
        let col = this.placeholderMap[columnId];
        if (col) {
            return col;
        } else {
            throw new Error(`${columnId} is not defined in placeholderMap`);
        }
    }

    public getColumnsBySelector(matcher: RegExp): string[] {
        return Object.keys(this.placeholderMap)
            .filter((key) => matcher.test(this.placeholderMap[key]))
            .map((key) => this.placeholderMap[key]);
    }

    public getIDColumns(): string[] {
        return this.getColumnsBySelector(idSelectorRegex);
    }

    private getConfigElement(config, path) {
        let pathSplit = path.split(".");
        let curObj = config;
        for (let i = 0; i < pathSplit.length; i++) {
            //skip if path token is digit
            if (pathSplit[i].match(/^\d+$/g)) {
                continue;
            }
            if (typeof curObj === "object" && curObj !== null) {
                curObj = curObj[pathSplit[i]];
            }
            else {
                throw new Error("could not find config element for path: " + path);
            }
        }
        return curObj;
    }
}
