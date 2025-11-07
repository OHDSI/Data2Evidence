import { getJsonWalkFunction, assert } from "@alp/alp-base-utils";

export default class TableResolver {
    private _pholderTableMap;
    private _fromEntries;
    constructor(config, pholderTableMap) {
        this._pholderTableMap = pholderTableMap;
        let configWalkFunction = getJsonWalkFunction(config);
        this._fromEntries = configWalkFunction("**.from").map((fromEntry) => {
            // remove the '.from' from the path name
            fromEntry.path = fromEntry.path.slice(0, -5);
            return fromEntry;
        });

        // sort entries by path length to allow
        // nested from entries to overwrite outer
        // ones
        this._fromEntries.sort((a, b) => {
            return a.path.length - b.path.length;
        });
    }

    // Get the 'from' property that are valid for this aliasPath.
    private _getFrom(aliasPath) {
        //remove the interaction instances from the aliasPath, such that the attribute paths in the config
        // matches the actual path. So replace '.digit+.' by '.'
        aliasPath = aliasPath.replace(/\.\d+\./g, ".");

        let from = {};
        let entry;
        for (let i = 0, l = this._fromEntries.length; i < l; i++) {
            entry = this._fromEntries[i];
            if (aliasPath.slice(0, entry.path.length) === entry.path) {
                // overwrite from entries
                for (let key in entry.obj) {
                    if (entry.obj.hasOwnProperty(key)) {
                        from[key] = entry.obj[key];
                    }
                }
            }
        }
        return from;
    }

    private _stripQuotation(str) {
        if (str) {
            return str.replace(/^"?([^"]+)"?$/, "$1");
        }
        return str;
    }

    /*private resolve(alias) {
        alias = this._stripQuotation(alias);
        let match = alias.match(/\$(obs|measure|code|text)$/);
        let placeholder = null;
        if (match) {
            placeholder = "@" + match[1].toUpperCase();
        }
        else if (alias === "patient") {
            placeholder = "@PATIENT";
        }
        else if (/.+\.interactions\.[^.]+\.\d+$/.test(alias)) {
            placeholder = "@INTERACTION";
        }
        assert(placeholder, "cannot get table for alias " + alias);
        let fromDict = this._getFrom(alias);
        if (placeholder in fromDict) {
            return fromDict[placeholder];
        }
        return this._pholderTableMap[placeholder];
    };*/
}
