// tslint:disable:max-classes-per-file
import { utils } from "@alp/alp-base-utils";
import { ruleValidator } from "@alp/alp-config-utils";
const RuleValidatorBase = ruleValidator.RuleValidatorBase;

export class InitialAttributesRule extends RuleValidatorBase {
    constructor(dataSource?) {
        super(dataSource);
    }

    public selectObjects(config) {
        const initialAttributes =
            config.chartOptions.initialAttributes.measures.concat(
                config.chartOptions.initialAttributes.categories);
        const initialFiltercards = config.filtercards.filter( (e) => {
            return e.initial;
        }).map( (e) => {
            return e.source;
        });
        let valid = true;
        let match;
        initialAttributes.forEach( (obj) => {
            match = obj.match(/^(.+)\.attributes\..+$/);
            if (!(match.length === 2)) {
                throw new Error("MRI_PA_CFG_VALIDATION_ERROR_INVALID_SOURCE_OF_ATTRIBUTE");
            }
            if (initialFiltercards.indexOf(match[1]) === -1) {
                valid = false;
            }
        });
        return [valid];
    }
}

export class InitialAttributesVisibilityRule extends RuleValidatorBase {
    constructor(dataSource?) {
        super(dataSource);
    }

    public selectObjects(config) {
        if (config.hasOwnProperty("visible") && config.hasOwnProperty("initial")) {
            return [!(!config.visible && config.initial)];
        }

        return [true];
    }

}

export class XAxisVisibilityRule extends RuleValidatorBase {
    constructor(dataSource?) {
        super(dataSource);
    }

    public selectObjects(config) {
        if (config.hasOwnProperty("category") && config.hasOwnProperty("filtercard")) {
            return [!config.category || config.filtercard.visible];
        }
        return [true];
    }
}

export class InitialChartCategoriesVisibleRule extends RuleValidatorBase {
    constructor(dataSource) {
        super(dataSource);
    }

    public selectObjects(config) {
        const initialChartCategories = config.chartOptions.initialAttributes.categories;
        const filtercards = config.filtercards;

        const res = initialChartCategories.every( (category) => {
            const categoryAttributeBaseName = category.match(/^(.+)\.attributes\..*$/)[1];
            const filtercardForCategory = filtercards.find((filtercard) =>
                filtercard.source === categoryAttributeBaseName,
            );

            if (!filtercardForCategory) {
                return false;
            }

            const attributeForCategory = filtercardForCategory.attributes.find((attribute) =>
                category === attribute.source,
            );

            if (!attributeForCategory) {
                return false;
            }

            const filtercardIsVisibleAndInitial = filtercardForCategory.initial && filtercardForCategory.visible;
            const attributeIsVisibleAndInitial = attributeForCategory.filtercard.initial && attributeForCategory.filtercard.visible;

            return filtercardIsVisibleAndInitial && attributeIsVisibleAndInitial;
        });

        return [res];
    }
}

export class InitialYAxisRule extends RuleValidatorBase {
    constructor(dataSource?) {
        super(dataSource);
    }

    public selectObjects(config) {
        let valid = true;
        const yAttributes = config.chartOptions.initialAttributes.measures;
        if (Object.keys(yAttributes).length === 0) {
            valid = false;
        }
        return [valid];
    }

}

export class AtLeastOneChartVisibleRule extends RuleValidatorBase {
    constructor(dataSource?) {
        super(dataSource);
    }

    public selectObjects(config) {
        let valid = false;

        for (const item of Object.keys(config.chartOptions)) {
            if (config.chartOptions[item].hasOwnProperty("visible")) {
                valid = valid || config.chartOptions[item].visible;
            }
        }
        return [valid];
    }
}

export class PathExistsInConfig extends RuleValidatorBase {
    constructor(dataSource?) {
        super(dataSource);
    }

    public selectObjects(config) {
        const cdwConfig = this.dataSource;
        const pathParts = config.split(".");
        let valid = true;

        let obj = JSON.parse(JSON.stringify(cdwConfig));
        for (let i = 0; i < pathParts.length; i++) {
            if (obj.hasOwnProperty(pathParts[i])) {
                obj = obj[pathParts[i]];
            } else {
                valid = false;
                break;
            }
        }
        return [valid];
    }

}

export class DefaultBinSizeRule extends RuleValidatorBase {
    constructor(dataSource) {
        super(dataSource);
    }

    public selectObjects(config) {
        const cdwConfig = this.dataSource;

        if (config.hasOwnProperty("defaultBinSize") && config.defaultBinSize) {
            const source = config.source;
            const sourceAttribute = utils.getObjectByPath(cdwConfig, source);
            return [sourceAttribute.type === "num"];
        }
        return [true];
    }
}

export class NoAggregatedCategory extends RuleValidatorBase {
    constructor(dataSource) {
        super(dataSource);
    }

    public selectObjects(config) {
        const cdwConfig = this.dataSource;

        if (config.hasOwnProperty("category") && config.category) {
            const source = config.source;
            const sourceAttribute = utils.getObjectByPath(cdwConfig, source);
            return [!sourceAttribute.measureExpression];
        }
        return [true];
    }
}

export class NoAggregatedFiltercardAttribute extends RuleValidatorBase {
    constructor(dataSource) {
        super(dataSource);
    }

    public selectObjects(config) {
        const cdwConfig = this.dataSource;

        if (config.hasOwnProperty("filtercard") && config.filtercard.hasOwnProperty("visible") && config.filtercard.visible) {
            const source = config.source;
            const sourceAttribute = utils.getObjectByPath(cdwConfig, source);
            return [!sourceAttribute.measureExpression];
        }
        return [true];
    }
}

export class UseRefTextRule extends RuleValidatorBase {
    constructor(dataSource) {
        super(dataSource);
    }

    public selectObjects(config) {
        const cdwConfig = this.dataSource;

        if (config.hasOwnProperty("useRefText") && config.useRefText) {
            const source = config.source;
            const sourceAttribute = utils.getObjectByPath(cdwConfig, source);
            if (sourceAttribute.type != "conceptSet") {
                return [sourceAttribute.hasOwnProperty("referenceFilter") && sourceAttribute.referenceFilter !== ""];
            }
        }
        return [true];
    }
}

export class UseRefValueRule extends RuleValidatorBase {
    constructor(dataSource) {
        super(dataSource);
    }

    public selectObjects(config) {
        const cdwConfig = this.dataSource;

        if (config.hasOwnProperty("useRefValue") && config.useRefValue) {
            const source = config.source;
            const sourceAttribute = utils.getObjectByPath(cdwConfig, source);
            if (sourceAttribute.type != "conceptSet") {
                return [
                    sourceAttribute.hasOwnProperty("referenceExpression")
                    && sourceAttribute.referenceExpression !== ""
                    && sourceAttribute.hasOwnProperty("referenceFilter")
                    && sourceAttribute.referenceFilter !== "",
                ];
            }
        }
        return [true];
    }
}
