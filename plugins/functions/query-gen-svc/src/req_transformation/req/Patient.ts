import { FastUtil } from "../fast_util";
import { ParserContainer } from "../def/ParserContainer";
import { Request } from "./RequestFactory";
import { Config } from "../../qe/qe_config_interface/Config";
import * as Keys from "../keys";
import { PholderTableMapType } from "../../qe/settings/Settings";

export class Patient implements Request {
    censoringThreshold: string = null;
    private __request: any;
    parsedRequest: any[] = [];
    parserContainers: ParserContainer[] = [];
    private __patientConfig: any;
    private __qConfig: Config;

    constructor(request: any, config: any, pholdertable: PholderTableMapType) {
        this.__request = request instanceof Array ? request : [request];
        this.__patientConfig = config;
        this.__qConfig = new Config(config, pholdertable);
        for (let i = 0; i < this.__request.length; i++) {
            let result = {};
            this.parseRequest(this.__request[i].patient, config.patient, result, Keys.TERM_EMPTYSTRING, Keys.CQLTERM_CONTEXT_PATIENT);
            this.parsedRequest.push({ patient: result });
        }
    }


    private parseRequest(
        request: any,
        config: any,
        result: any,
        key?: string,
        parent?: string,
        isIntrFiltercard: boolean = false,
        isExclude: boolean = false,
        isFiltercard?: boolean): any {

        if (request.hasOwnProperty("excludePrevious")) {
            delete request.excludePrevious;
        }

        try {
            if (request instanceof Object) {
                Object.keys(request).forEach((e) => {
                    if (request[e] instanceof Array) {
                        if (!result.hasOwnProperty(e)) {
                            result[e] = {};
                        }
                        result[e].requestValue = {};
                        if (request[e][0].hasOwnProperty(Keys.MRITERM_FILTER)) {
                            //empty date range filter check
                            if (request[e][0].filter[0]) {
                                if (typeof request[e][0].filter[0].and !== Keys.TERM_UNDEFINED) {
                                    if (request[e][0].filter[0].and.length > 0) {
                                        result[e].requestValue.filter = request[e][0].filter;
                                    }
                                }
                                else {
                                    result[e].requestValue.filter = request[e][0].filter;
                                }
                            } else if (FastUtil.isDurationBetweenAttr(e)) {
                                result[e].requestValue.filter = [{ and: [{ op: ">=", value: 0 }] }];
                            }
                        }

                        if (e === "_tempQ") {
                            result[e].requestValue.filter = request[e];
                        }

                        if (request[e][0].hasOwnProperty(Keys.MRITERM_VALUE)) {
                            result[e].requestValue.value = request[e][0].value;
                        }
                        result[e].requestValue.path = parent + Keys.TERM_DELIMITER_PRD + e;
                        if (request[e][0].hasOwnProperty(Keys.MRITERM_XAXIS)) {
                            result[e].requestValue.xaxis = request[e][0].xaxis;
                            if (typeof (request[e][0].binsize) !== Keys.TERM_UNDEFINED) {
                                result[e].requestValue.binsize = request[e][0].binsize;
                            }
                        }
                        if (request[e][0].hasOwnProperty(Keys.MRITERM_YAXIS)) {
                            result[e].requestValue.yaxis = request[e][0].yaxis;
                        }
                        if (typeof request[e][0].aggregation !== Keys.TERM_UNDEFINED) {
                            result[e].requestValue.aggregation = request[e][0].aggregation;
                        }
                        if (typeof (isFiltercard) !== Keys.TERM_UNDEFINED && !isFiltercard) {
                            result[e].requestValue.isLeftJoin = true;
                        }
                        if (typeof request[e][0].order !== Keys.TERM_UNDEFINED) {
                            result[e].requestValue.order = request[e][0].order === "D" ? "DESC" : "ASC";
                        }
                        if (isIntrFiltercard) {
                            result[e].requestValue.isFiltercard = isIntrFiltercard;
                        }

                        if (isExclude) {
                            result[e].requestValue.isExclude = isExclude;
                        }
                    }
                    else if (FastUtil.isNumber(e)) {
                        if (!result.hasOwnProperty(e)) {
                            result[e] = {};
                        }

                        let _isIntrFiltercard = true;
                        let _isExclude = typeof (request[e].exclude) !== Keys.TERM_UNDEFINED;

                        typeof (request[e].isFiltercard) !== Keys.TERM_UNDEFINED ?
                            this.parseRequest(request[e],
                                config,
                                result[e],
                                e,
                                parent + Keys.TERM_DELIMITER_PRD + e,
                                _isIntrFiltercard,
                                _isExclude,
                                request[e].isFiltercard) :
                            this.parseRequest(request[e], config, result[e], e, parent + Keys.TERM_DELIMITER_PRD + e, _isIntrFiltercard, _isExclude);

                        if (!result[e].attributes || Object.keys(result[e].attributes).length === 0) {

                            result[e].attributes = {
                                dummy: {
                                    requestValue: {
                                        isFiltercard: _isIntrFiltercard,
                                        path: parent + "." + e + ".attributes.dummy",
                                    },
                                },
                            };

                            if (_isExclude) {
                                result[e].attributes.dummy.requestValue.isExclude = request[e].exclude;
                            }
                        }
                    }
                    else if (request[e] instanceof Object) {
                        result[e] = {};
                        typeof isFiltercard !== Keys.TERM_UNDEFINED ?
                            this.parseRequest(request[e],
                                config[e],
                                result[e],
                                e,
                                parent + Keys.TERM_DELIMITER_PRD + e,
                                isIntrFiltercard ? true : false,
                                isExclude ? true : false, isFiltercard) :
                            this.parseRequest(request[e],
                                config[e],
                                result[e],
                                e,
                                parent + Keys.TERM_DELIMITER_PRD + e,
                                isIntrFiltercard ? true : false,
                                isExclude ? true : false);

                    }
                });
            }
            return request;
        }
        catch (e) {
            throw e;
        }

    }

    private buildNotEqlList(patient: ParserContainer) {
        for (let prop in patient.filter) {
            if (patient.filter[prop].length > 1) {
                let interaction = patient.filter[prop];
                for (let i = 1; i < interaction.length; i++) {
                    let origin = i;
                    let currIdx = i;
                    while (currIdx > 0) {
                        if (typeof interaction[i].isExclude === Keys.TERM_UNDEFINED) {
                            patient.where.push({
                                path: Keys.MRITERM_INTERACTIONID,
                                alias: interaction[origin].alias,
                                filter: [{
                                    op: Keys.SQLTERM_INEQUALITY_SYMBOL_NOTEQUAL,
                                    value: interaction[currIdx - 1].alias,
                                    type: Keys.TERM_OPERANDTYPE_EXPRESSION,
                                }],
                            });
                        }
                        --currIdx;
                    }
                }
            }
        }
    }

    private handleExclude(patient: ParserContainer) {
        for (let prop in patient.filter) {
            let interactions = patient.filter[prop];
            let idxToDelete = [];
            let objToInsert = [];
            for (let i = 0; i < interactions.length; i++) {
                if (typeof interactions[i].isExclude !== Keys.TERM_UNDEFINED) {
                    patient.where.push({
                        alias: interactions[i].alias,
                        path: Keys.MRITERM_INTERACTIONID,
                        pathId: interactions[i].identifier + Keys.TERM_DELIMITER_PRD + Keys.MRITERM_INTERACTIONID,
                        filter: [{ op: "=", value: "NoValue" }],
                        identifier: interactions[i].identifier,
                        templateId: interactions[i].templateId,
                    });
                    idxToDelete.unshift(i);
                    objToInsert.unshift(interactions[i]);
                }
            }
            idxToDelete.forEach((x) => interactions.splice(x, 1));
            objToInsert.forEach((x) => interactions.push(x));
        }
    };


    parse() {
        let self = this;
        let getPopulation = false;
        let populationDef;
        let patientDef;

        function postProcess() {
            handleCensoringThreshold();
            copyMeasuresFromPopulationToPatientContext();
            handleAttributeTemplateIdForPopulationContext();
            self.buildDefaultOrderByList(populationDef);
        }

        function sortGroupBy(patient: ParserContainer) {
            if (patient.groupBy) {
                patient.groupBy.sort((x, y) => x.seq - y.seq);
            }
        }

        function handleCensoringThreshold() {
            if (self.censoringThreshold && populationDef.having.length > 0) {
                populationDef.having.forEach((e) => {
                    e.filter[0].value = e.filter[0].value < self.censoringThreshold ? self.censoringThreshold : e.filter[0].value;
                });
            }
            else {
                if (self.censoringThreshold) {
                    populationDef.having.push({
                        path: Keys.MRITERM_PCOUNT,
                        alias: patientDef.alias,
                        filter: [{ op: Keys.SQLTERM_INEQUALITY_SYMBOL_GREATEROREQUAL, value: self.censoringThreshold }],
                        pathId: Keys.MRITERM_PCOUNT_ALIAS,
                        templateId: Keys.MRITERM_PCOUNT_TEMPLATEID,
                    });
                }

                let hasPCount = false;
                for (let i = 0; i < populationDef.measure.length; i++) {
                    if (populationDef.measure[i].path === Keys.MRITERM_PCOUNT) {
                        hasPCount = true;
                        break;
                    }
                }

                if (!hasPCount) {
                    patientDef.groupBy.push({
                        path: Keys.MRITERM_PCOUNT,
                        alias: patientDef.alias,
                        pathId: Keys.MRITERM_PCOUNT_ALIAS,
                        templateId: Keys.MRITERM_PCOUNT_TEMPLATEID,
                    });
                }
            }
        }

        function handleAttributeTemplateIdForPopulationContext() {
            FastUtil.replace(populationDef, "templateId", "pathId", undefined);
            FastUtil.convertTemplateId(populationDef);
        }

        function copyMeasuresFromPopulationToPatientContext() {
            patientDef.groupBy.push(...populationDef.measure);
        }

        for (let i = 0; i < this.parsedRequest.length; i++) {
            patientDef = new ParserContainer(Keys.DEF_PATIENTREQUEST + i, Object.keys(this.parsedRequest[i])[0], i);
            populationDef = new ParserContainer(Keys.DEF_AGGREGATE, Keys.CQLTERM_CONTEXT_POPULATION, i);
            this.buildParserContainer(patientDef, populationDef, this.parsedRequest[i]);
            this.handleExclude(patientDef);
            this.buildNotEqlList(patientDef);
            postProcess();
            sortGroupBy(patientDef);
            sortGroupBy(populationDef);
            this.parserContainers.push(patientDef);
            if (!getPopulation) {
                this.parserContainers.push(populationDef);
                getPopulation = true;
            }
        }
    }

    buildDefaultOrderByList(c: ParserContainer, axis: string = "x") {
        let orderBy = (<any[]>FastUtil.deepClone(axis === "x" ? c.groupBy : c.measure))
            .filter((x) => {
                return typeof x.axis !== Keys.TERM_UNDEFINED && x.axis === axis;
            });
        c.orderBy = orderBy.sort((x, y) => x.seq - y.seq);
        c.orderBy.forEach((x) => {
            if (!x.isMeasure && !x.aggregation && axis === "y") {
                x.aggregation = FastUtil.toAggregateFunction("avg");
            }
        });
    }

    getPopulationContext(): ParserContainer {
        let populationContext = this.parserContainers
            .filter((e) => e.context === Keys.CQLTERM_CONTEXT_POPULATION && e.name === Keys.DEF_AGGREGATE);
        return populationContext.length === 0 ? null : populationContext[0];
    }

    getPatientContext(): ParserContainer[] {
        let patients = [];
        for (let i = 0; i < this.parserContainers.length; i++) {
            if (this.parserContainers[i].context === Keys.CQLTERM_CONTEXT_PATIENT) {
                patients.push(this.parserContainers[i]);
            }
        }
        return patients;
    }

    buildParserContainer(patient: ParserContainer, population: ParserContainer, req: any) {
        function indexOfAlias(obj: any, dataType: string, alias: string): number {
            if (!obj.hasOwnProperty(dataType)) {
                patient.filter[dataType] = [];
                return -1;
            }
            else {
                let arr = obj[dataType];
                for (let i = 0; i < arr.length; i++) {
                    if (arr[i].alias === alias) {
                        return i;
                    }
                }
            }

            return -1;
        }

        function insertToList(e: any, filterListIdx, listElement: any, listType: string) {
            let dType = listElement.dataType;

            if (listType === Keys.MRITERM_FILTER) {
                listElement.attributeList = [e];
                if (filterListIdx !== -1) {
                    patient.filter[dType][filterListIdx].attributeList.push(e);
                }
                else {
                    patient.filter[dType].push(listElement);
                }
            }
            else {
                e.identifier = listElement.identifier;
                e.templateId = listElement.templateId;
                e.dataType = listElement.dataType;
                e.alias = listElement.alias;

                switch (listType) {
                    case Keys.TERM_WHERE:
                        patient.where.push(e);
                        break;
                    case Keys.TERM_GROUPBY:
                        patient.groupBy.push(e);
                        population.groupBy.push(FastUtil.deepClone(e));
                        break;
                    case Keys.TERM_MEASURE:
                        population.measure.push(e);
                        break;
                    case Keys.TERM_HAVING:
                        population.having.push(e);
                        break;
                    default:
                        throw new Error("FAST_INVALID_REQUEST_CLAUSE");
                }
            }
        }

        function handleParentInteraction(childAlias: string, requestValue: any, attributeElement: any) {
            if (requestValue.hasOwnProperty(Keys.MRITERM_VALUE)) {
                let parentPath = FastUtil.tokenizeAndJoin(requestValue[Keys.MRITERM_VALUE], Keys.TERM_DELIMITER_PRD, 2);

                attributeElement.path = Keys.MRITERM_PARENTINTERACTION;
                attributeElement.alias = childAlias;
                attributeElement.filter = [{
                    op: Keys.SQLTERM_INEQUALITY_SYMBOL_EQUAL,
                    value: parentPath,
                    path: Keys.MRITERM_INTERACTIONID,
                    type: Keys.TERM_OPERANDTYPE_EXPRESSION,
                }];

                delete attributeElement.pathId;
            }
            else {
                throw new Error("MALFORMED PARENT INTERACTION REQUEST");
            }
        }

        if (req instanceof Object) {
            Object.keys(req).forEach((e) => {

                if (req[e].hasOwnProperty(Keys.TERM_REQUESTVALUE)) {
                    let pathId = req[e].requestValue.path;
                    let pathToken = pathId.split(Keys.TERM_DELIMITER_PRD);
                    let index = FastUtil.getIndex(pathToken);
                    let listElement: any = {
                        identifier: FastUtil.getId(pathToken),
                        templateId: FastUtil.getId(pathToken, true),
                    };

                    listElement.dataType = FastUtil.tokenizeAndJoin(listElement.templateId, Keys.TERM_DELIMITER_DASH, 1);
                    listElement.alias = index ? FastUtil.tokenizeAndJoin(listElement.identifier, Keys.TERM_DELIMITER_PRD, 2) : patient.alias;

                    let filterListIdx = indexOfAlias(patient.filter, listElement.dataType, listElement.alias);
                    let isYAxis = typeof (req[e].requestValue[Keys.MRITERM_YAXIS]) !== Keys.TERM_UNDEFINED;
                    let filterDefined = typeof (req[e].requestValue.filter) !== Keys.TERM_UNDEFINED;

                    let attributeElement: any = {
                        path: pathToken[pathToken.length - 1],
                        pathId,
                    };

                    if (filterDefined) {
                        attributeElement.filter = req[e].requestValue.filter;
                        if (req[e].requestValue.hasOwnProperty(Keys.MRITERM_VALUE)) {
                            attributeElement.value = req[e].requestValue.value;
                        }
                    }

                    if (typeof (req[e].requestValue.isLeftJoin) !== Keys.TERM_UNDEFINED) { listElement.isLeftJoin = true; }
                    if (typeof (req[e].requestValue.isExclude) !== Keys.TERM_UNDEFINED) { listElement.isExclude = true; }

                    if (e === Keys.MRITERM_PARENTINTERACTION_REQ) { handleParentInteraction(listElement.alias, req[e].requestValue, attributeElement); }

                    if (req[e].requestValue.hasOwnProperty(Keys.MRITERM_ISFILTERCARD)) {
                        insertToList(attributeElement, filterListIdx, listElement, Keys.MRITERM_FILTER);
                    }
                    else {
                        if (filterDefined &&
                            typeof (this.__qConfig.getEntityByPath(FastUtil.getId(pathToken, true, true)).getConfig()[Keys.MRITERM_MEASUREEXPRESSION])
                            === Keys.TERM_UNDEFINED) {
                            insertToList(attributeElement, filterListIdx, listElement, Keys.TERM_WHERE);
                        }
                    }

                    attributeElement.order = typeof req[e].requestValue.order !== Keys.TERM_UNDEFINED ? req[e].requestValue.order : "ASC";

                    if (req[e].requestValue.hasOwnProperty(Keys.MRITERM_XAXIS)) {
                        attributeElement.axis = "x";
                        attributeElement.seq = req[e].requestValue.xaxis;
                        if (typeof (req[e].requestValue.binsize) !== Keys.TERM_UNDEFINED) {
                            attributeElement.binsize = req[e].requestValue.binsize;
                        }
                        insertToList(attributeElement, filterListIdx, listElement, Keys.TERM_GROUPBY);
                    }

                    if (isYAxis) {
                        attributeElement.axis = "y";
                        attributeElement.seq = req[e].requestValue.yaxis;
                        attributeElement.isMeasure = true;

                        if (typeof req[e].requestValue.aggregation !== Keys.TERM_UNDEFINED) {
                            attributeElement.aggregation = FastUtil.toAggregateFunction(req[e].requestValue.aggregation);
                        }

                        if (typeof (this.__qConfig.getEntityByPath(FastUtil.getId(pathToken, true, true)).getConfig()[Keys.MRITERM_MEASUREEXPRESSION])
                            !== Keys.TERM_UNDEFINED) {
                            if (typeof (req[e].requestValue.filter) !== Keys.TERM_UNDEFINED) {
                                attributeElement.filter = req[e].requestValue.filter;
                                insertToList(attributeElement, filterListIdx, listElement, Keys.TERM_HAVING);
                            }
                        }
                        else {
                            //non-measureExpression
                            attributeElement.isMeasure = false;
                        }
                        insertToList(attributeElement, filterListIdx, listElement, Keys.TERM_MEASURE);
                    }
                }

                else if (req[e] instanceof Object) {
                    this.buildParserContainer(patient, population, req[e]);
                }
            });

        }
    }

    getOptions(): any {
        return this.__request[0];
    }

    getConfig(): any {
        return this.__qConfig;
    }
}
