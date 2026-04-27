// tslint:disable:max-classes-per-file
//////////////////////////////////////////////////////////////////////
//                             Rule Validation                            //
//////////////////////////////////////////////////////////////////////

import { Logger } from "@alp/alp-base-utils";

///////////////////////
// RuleValidatorBase //
///////////////////////

export class RuleValidatorBase {
    constructor(public dataSource) {
        this.dataSource = dataSource ? dataSource : [];
    }

    public setDataSource(dataSource) {
        this.dataSource = dataSource;
    }

    public getData(config) {
        if (this.dataSource instanceof RuleValidatorBase) {
            const data = this.dataSource.getObjects(config);
            if (data) {
                return data;
            } else {
                return false;
            }
        } else {
            return config;
        }
    }

    public selectObjects(data): any[] {
        return [false];
    }

    public getObjects(config) {
        let returnObj;

        try {
            returnObj = this.selectObjects(this.getData(config));
        } catch (e) {
            return false;
        }
        return returnObj;
    }
}

//////////////////////
// UniqueValidation //
//////////////////////
export class UniqueValidation extends RuleValidatorBase {
    constructor(public dataSource) {
        super(dataSource);
    }
    public isUnique(array) {
        const valuesSoFar = [];
        for (const ele of array) {
            const value = ele;
            if (valuesSoFar.indexOf(value) !== -1) {
                return false;
            }
            valuesSoFar.push(value);
        }
        return true;
    }

    public selectObjects(data) {
        return [this.isUnique(data)];
    }
}

//////////////////
// BaseSelector //
//////////////////
export class BaseSelector extends RuleValidatorBase {
    constructor(public dataSource = null) {
        super(dataSource);
    }

    public selectObjects(data) {
        let obj;
        const result = [];
        for (obj in data) {
            if (data.hasOwnProperty(obj)) {
                result.push(data[obj]);
            }
        }
        return result;
    }
}

//////////////////////
// PropertySelector //
//////////////////////
export class PropertySelector extends BaseSelector {
    constructor(public dataSource: string, public property: string) {
        super(dataSource);
        this.property = property ? property : "";
    }

    public selectObjects(data) {
        let element;
        const result = [];
        for (element in data) {
            if (this.property === "" || element === this.property) {
                result.push(data[element]);
            }
        }
        return result;
    }
}

///////////////////////////
// ChildPropertySelector //
///////////////////////////
export class ChildPropertySelector extends PropertySelector {
    constructor(public dataSource: any, public property: string) {
        super(dataSource, property);
    }

    public selectObjects(data) {
        let result = [];
        let obj;
        for (obj in data) {
            if (data.hasOwnProperty(obj)) {
                result = result.concat(super.selectObjects(data[obj]));
            }
        }
        return result;
    }
}

////////////////////
// BaseValidation //
////////////////////
export class BaseValidation extends RuleValidatorBase {
    constructor(dataSource) {
        super(dataSource);
    }

    public selectObjects(data) {
        let element;
        const result = [];

        if (typeof (data) === "string" || typeof (data) === "number") {
            result.push(this.validate(data));
        } else {
            for (element in data) {
                if (data.hasOwnProperty(element)) {
                    result.push(this.validate(data[element]));
                }
            }
        }

        return result;
    }

    public validate(element) {
        return true;
    }
}

////////////////////////////
// CompareValueValidation //
////////////////////////////
export class CompareValueValidation extends BaseValidation {
    constructor(dataSource, mode, value) {
        super(dataSource);

        switch (mode) {
            case "eq":
                this.validate =  (element) => element === value;
                break;
            case "lt":
                this.validate =  (element) => element < value;
                break;
            case "le":
                this.validate =  (element) => element <= value;
                break;
            case "gt":
                this.validate =  (element) => element > value;
                break;
            case "ge":
                this.validate =  (element) => element >= value;
                break;
            case "ne":
                this.validate =  (element) => element !== value;
                break;
            case "contains":
                this.validate =  (element) => element.indexOf(value) > -1;
                break;
            case "notContains":
                this.validate =  (element) => element.indexOf(value) === -1;
                break;
            default:
                this.validate =  () => false;
                const e = new Error("CompareValueValidation Error: operator not supported: " + mode);
                Logger.CreateLogger("config-util-log").error(e);
        }
    }
}

///////////////////
// UnionOperator //
///////////////////

export class UnionOperator extends RuleValidatorBase {
    constructor(dataSource) {
        super(dataSource);
    }

    public getData(config) {
        let result = [];
        if (!Array.isArray(this.dataSource)) {
            return [];
        }
        this.dataSource.forEach( (dataset) => {
            if (dataset instanceof RuleValidatorBase) {
                result = result.concat(dataset.getObjects(config));
            } else if (Array.isArray(dataset)) {
                result = result.concat(dataset);
            } else if (typeof (dataset) === "undefined") {
                result.push(config);
            } else {
                result.push(dataset);
            }
        });
        return result;
    }
    public selectObjects(data) {
        return data;
    }

}
///////////////////
// CountSelector //
///////////////////
export class CountSelector extends RuleValidatorBase {
    constructor(dataSource) {
        super(dataSource);

    }
    public selectObjects(data) {
        let ind;
        let count = 0;
        for (ind in data) {
            if (data[ind]) {
                count++;
            }
        }
        return [count];
    }
}

////////////////////
// BinaryOperator //
////////////////////
export class BinaryOperator extends RuleValidatorBase {
    constructor(public dataSource) {
        super(dataSource);
        this.dataSource = dataSource ? dataSource : [[], []];
    }

    public getData(config) {
        let data1;
        let data2;
        if (this.dataSource[0] instanceof RuleValidatorBase) {
            data1 = this.dataSource[0].getObjects(config);
            if (!data1 || Object.prototype.toString.call(data1) !== "[object Array]") {
                return false;
            }
        } else {
            data1 = config;
        }
        if (this.dataSource[1] instanceof RuleValidatorBase) {
            data2 = this.dataSource[1].getObjects(config);
            if (!data2 || Object.prototype.toString.call(data2) !== "[object Array]") {
                return false;
            }
        } else {
            data2 = config;
        }
        return data1.concat(data2);
    }

    public setDataSource(dataSource) {
        this.dataSource = dataSource ? dataSource : [[], []];
    }
}

////////////////
// OrOperator //
////////////////
export class OrOperator extends BinaryOperator {
    constructor(dataSource) {
        super(dataSource);
    }

    public selectObjects(data) {
        let ind;
        for (ind in data) {
            if (data[ind]) {
                return [true];
            }
        }
        return [false];
    }
}

////////////////
// AndOperator //
////////////////
export class AndOperator extends BinaryOperator {
    constructor(dataSource) {
        super(dataSource);

    }

    public selectObjects(data) {
        if (!data || Object.prototype.toString.call(data) !== "[object Array]" || data.length === 0) {
            return [false];
        }
        let ind;
        for (ind in data) {
            if (!data[ind]) {
                return [false];
            }
        }
        return [true];
    }
}
