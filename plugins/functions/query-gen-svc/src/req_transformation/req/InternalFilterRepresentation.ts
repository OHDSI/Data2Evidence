import { Request } from "./RequestFactory";
import {
    ParserContainer,
    FilterNode,
    BaseNode,
    TemporalQueryNode,
    Expression,
    TemporalQueryExpression,
    And,
    Or,
    Filter,
} from "../def/ParserContainer";
import {
    IFRFilter,
    Expression as IFRExpression,
    FilterCard,
    ExcludeFilterCard,
} from "./IFR/IFRDeserialize";

import * as Keys from "../keys";
import { FastUtil } from "../fast_util";
import { Config } from "../../qe/qe_config_interface/Config";

export class InternalFilterRepresentation implements Request {
    public censoringThreshold: string;
    public parserContainers: ParserContainer[] = [];
    public parsedRequest: any[];
    private __request: IFRFilter;
    private __qConfig: Config;

    constructor(request: any, config: any, pholdertable: any) {
        this.__request = new IFRFilter().deserialize(request);
        this.__qConfig = new Config(config, pholdertable);
    }

    public buildDefaultOrderByList(c: ParserContainer, axis: string = "x") {
        c.orderBy = (<any[]>(
            FastUtil.deepClone(axis === "x" ? c.groupBy : c.measure)
        ))
            .filter(
                (x) => typeof x.axis !== Keys.TERM_UNDEFINED && x.axis === axis
            )
            .sort((x, y) => x.seq - y.seq);
        c.orderBy.forEach((x) => {
            if (axis === "y" && !x.isMeasure && !x.aggregation) {
                x.aggregation = FastUtil.toAggregateFunction("avg");
            }
        });
    }

    public getOptions() {
        return this.__request.options;
    }

    public parse() {
        let matchAnyFiltercardList: FilterNode[] = [];
        let leftJointFilterNodeList: FilterNode[] = [];
        let additionalBaseNodeList: BaseNode[] = [];
        let matchAnyCombined = [];
        let traverse = ([head, ...tail]: FilterCard[][], item) => {
            if (Array.isArray(head)) {
                head.forEach((e) => {
                    if (tail.length) {
                        traverse(tail, [...item, e]);
                    } else {
                        matchAnyCombined.push([
                            ...this.__request.matchAll,
                            ...item,
                            e,
                        ]);
                    }
                });
            }
        };
        traverse(this.__request.matchAny, []);

        // TODO: hack for no x-axis. Should be fixed.
        // if there is no y axis, then this must be patient list.
        if (
            matchAnyCombined.length === 1 &&
            this.__request.axes.filter((i) => i.axis === "y").length > 0 &&
            this.__request.axes.filter((i) => i.axis === "x").length === 0
        ) {
            matchAnyCombined.push(matchAnyCombined[0]);
        }

        let requests: ParserContainer[] =
            this.__request.matchAny.length > 0
                ? matchAnyCombined.map((e, i) =>
                      this.buildPatient(e, i, matchAnyFiltercardList)
                  )
                : [this.buildPatient(this.__request.matchAll, 0)];

        let population = this.buildPopulation(
            requests[0],
            matchAnyFiltercardList,
            leftJointFilterNodeList,
            additionalBaseNodeList
        );

        //Post handling
        requests.forEach((e) => {
            // copies measures from population context into patient context groupby clause, updating aliases accordingly for matchany requests
            e.groupBy.push(
                ...(FastUtil.deepClone(population.measure) as BaseNode[]).map(
                    (f) => {
                        if (f.alias === "P0") {
                            f.alias = e.alias;
                        }
                        return f;
                    }
                )
            );
            e.groupBy.sort((x, y) => x.seq - y.seq);

            /**
             * #LEFTJOIN POSTPROCESSING BEGIN
             */
            leftJointFilterNodeList.forEach((f) => {
                let interaction = e.filter[f.dataType];
                if (interaction) {
                    // if interaction identifier does not match, append left join filter to interaction filter list
                    // else, filter identifier matches and there is no need to append left join criteria since filter is already a constraint
                    if (
                        interaction.filter(
                            (g) => !g.isExclude && g.identifier === f.identifier
                        ).length === 0
                    ) {
                        interaction.push(f);
                    }
                } else {
                    // interaction does not exist in filter criteria, create one.
                    e.filter[f.dataType] = [f];
                }
            });
            // END

            /**
             * #FILLMISSINGATTRIBUTES BEGIN
             * Search for a non-negated filtercard with matching identifier and adds
             * attribute constraint to it if it does not exist
             */
            additionalBaseNodeList.forEach((f) => {
                if (e.filter[f.dataType]) {
                    e.filter[f.dataType]
                        .filter(
                            (g) => !g.isExclude && g.identifer === g.identifier
                        )
                        .forEach((h) => {
                            if (
                                h.attributeList.filter(
                                    (i) => i.pathId === f.pathId
                                ).length === 0
                            ) {
                                h.attributeList.push(f.withAlias(h.alias));
                            }
                        });
                }
            });
            // END
        });

        //add pcount to patient context groupBy list if it's not selected on the y axis
        if (
            population.measure.filter((e) => e.path === Keys.MRITERM_PCOUNT)
                .length === 0
        ) {
            requests.forEach((e) => {
                e.groupBy.push(
                    new BaseNode(Keys.MRITERM_PCOUNT, Keys.MRITERM_PCOUNT_ALIAS)
                        .withAlias(e.alias)
                        .withTemplateId(Keys.MRITERM_PCOUNT_TEMPLATEID)
                );
                e.groupBy.sort((x, y) => x.seq - y.seq);
            });
        }
        //Build list of orderBy conditions
        this.buildDefaultOrderByList(population);

        this.parserContainers = [...requests, population];

        this.createEntryExitCriteria();
    }

    private createEntryExitCriteria() {
        if (this.__qConfig.__config.panelOptions.cohortEntryExit) {
            // If enabled in PA config
            const entryExitEvent: ParserContainer = structuredClone(
                this.parserContainers.find((e) => e.name === "PatientRequest0")
            );
            entryExitEvent.alias = "PEE";
            entryExitEvent.name = Keys.DEF_PATIENT_REQUEST_ENTRYEXIT;

            entryExitEvent.measure = []
            entryExitEvent.groupBy = []
            const entryExitOverride = { entry: {dataType: "obsperiod", instanceID: "0"}, exit: {dataType: "obsperiod", instanceID: "0"} };
            this.__request.matchAny.forEach((fcArray) => {
                fcArray.forEach((fc) => {
                    if (fc._isEntry) {
                        entryExitOverride.entry.dataType = FastUtil.tokenizeAndJoin(
                            fc._configPath,
                            Keys.TERM_DELIMITER_PRD,
                            1
                        );

                        entryExitOverride.entry.instanceID = FastUtil.tokenizeAndJoin(
                            fc._instanceID,
                            Keys.TERM_DELIMITER_PRD,
                            1
                        );
                    }
                    else if (fc._isExit) {
                        entryExitOverride.exit.dataType = FastUtil.tokenizeAndJoin(
                            fc._configPath,
                            Keys.TERM_DELIMITER_PRD,
                            1
                        );

                        entryExitOverride.exit.instanceID = FastUtil.tokenizeAndJoin(
                            fc._instanceID,
                            Keys.TERM_DELIMITER_PRD,
                            1
                        );
                    }
                });
            });


            entryExitEvent.measure = [
                new BaseNode(
                    "entry",
                    `patient.interactions.${entryExitOverride.entry.dataType}.${entryExitOverride.entry.instanceID}.attributes.startdate`
                    )
                    .withIdentifier(`patient.interactions.${entryExitOverride.entry.dataType}.${entryExitOverride.entry.instanceID}`)
                    .withTemplateId(`patient-interactions-${entryExitOverride.entry.dataType}`)
                    .withDataType(entryExitOverride.entry.dataType)
                    .withAlias(`${entryExitOverride.entry.dataType}${entryExitOverride.entry.instanceID}`)
                    .withMeasure(true),
                new BaseNode(
                    "exit",
                    `patient.interactions.${entryExitOverride.exit.dataType}.${entryExitOverride.exit.instanceID}.attributes.enddate`
                    )
                    .withIdentifier(`patient.interactions.${entryExitOverride.exit.dataType}.${entryExitOverride.exit.instanceID}`)
                    .withTemplateId(`patient-interactions-${entryExitOverride.exit.dataType}`)
                    .withDataType(entryExitOverride.exit.dataType)
                    .withAlias(`${entryExitOverride.exit.dataType}${entryExitOverride.exit.instanceID}`)
                    .withMeasure(true),
            ];

            //Keep With Relationships only if they have a attribute filter and are marked as either entry / exit
            Object.keys(entryExitEvent.filter).forEach(fcType => {
                const toKeep = new Set<string>();
                toKeep.add(`${entryExitOverride.entry.dataType}${entryExitOverride.entry.instanceID}`)
                toKeep.add(`${entryExitOverride.exit.dataType}${entryExitOverride.exit.instanceID}`)
                const toDelete = new Set<string>();
                const fcArray = entryExitEvent.filter[fcType];
                fcArray.forEach(fc => {
                    if (!toKeep.has(fc.alias)) {
                        toDelete.add(fc.alias);
                        return;
                    } else {
                        fc.isEntryExit = true;
                    }
                    let filterExists = false
                    fc.attributeList.forEach(e => {
                        if(e.filter?.length > 0 && toKeep.has(fc.alias)) {
                            filterExists = true;
                        }
                    })
                    if(!filterExists) toDelete.add(fc.alias); // Even though its marked as entry/exit, if no attribute filters exists for them, still remove. Because it will be handled by BaseNode from Measure
                })

                //Prune unwanted filtercards for PatientEntryExitRequest
                entryExitEvent.filter[fcType] = fcArray.filter((fc) => !toDelete.has(fc.alias))
            })

            //handle where
            //Remove those associated with exclude specifically when where clause is defined to be null. Only keep basic data and those marked as either entry/exit
            entryExitEvent.where = entryExitEvent.where.filter(e => 
                                    (e.alias === `${entryExitOverride.entry.dataType}${entryExitOverride.entry.instanceID}` || 
                                     e.alias === `${entryExitOverride.exit.dataType}${entryExitOverride.exit.instanceID}` || 
                                     e.alias === "P0")) 
            //Associated with PEE
            entryExitEvent.where.forEach((e) => {
                e.alias = "PEE";
            });

         
            this.parserContainers.push(entryExitEvent);
        }
    }

    public getConfig(): any {
        return this.__qConfig;
    }

    // retrieves population context, there should only be one.
    public getPopulationContext(): ParserContainer {
        let populationContext = this.parserContainers.filter(
            (e) =>
                e.context === Keys.CQLTERM_CONTEXT_POPULATION &&
                e.name === Keys.DEF_AGGREGATE
        );
        return populationContext.length === 0 ? null : populationContext[0];
    }

    //retrieves all patient contexts
    public getPatientContext(): ParserContainer[] {
        let patients = [];

        for (let i = 0; i < this.parserContainers.length; i++) {
            if (
                this.parserContainers[i].context ===
                Keys.CQLTERM_CONTEXT_PATIENT
            ) {
                patients.push(this.parserContainers[i]);
            }
        }
        return patients;
    }

    private buildPopulation(
        patient: ParserContainer,
        matchAnyFiltercardList: FilterNode[],
        newFilterCards: FilterNode[],
        newAttributes: BaseNode[]
    ): ParserContainer {
        let population = new ParserContainer(
            Keys.DEF_AGGREGATE,
            Keys.CQLTERM_CONTEXT_POPULATION,
            0
        );

        // builds measure clause
        population.measure = this.__request.axes
            .filter((e) => e.axis === "y")
            .reduce((measureList, e) => {
                let baseNode: BaseNode = null;
                if (e.id === Keys.MRITERM_PCOUNT_ALIAS) {
                    baseNode = new BaseNode(
                        Keys.MRITERM_PCOUNT,
                        Keys.MRITERM_PCOUNT_ALIAS
                    )
                        .withIdentifier(Keys.MRITERM_PCOUNT_ALIAS)
                        .withTemplateId(Keys.MRITERM_PCOUNT_TEMPLATEID)
                        .withDataType(Keys.MRITERM_PCOUNT)
                        .withAlias("P0")
                        .withMeasure(true);
                } else if (
                    FastUtil.tokenizeAndJoin(
                        e.instanceID,
                        Keys.TERM_DELIMITER_PRD,
                        1
                    ) === "patient"
                ) {
                    baseNode = new BaseNode(
                        FastUtil.tokenizeAndJoin(
                            e.id,
                            Keys.TERM_DELIMITER_PRD,
                            1
                        ),
                        e.id
                    )
                        .withIdentifier(e.id)
                        .withTemplateId(
                            e.id.replace(/\./g, Keys.TERM_DELIMITER_DASH)
                        )
                        .withDataType(
                            FastUtil.tokenizeAndJoin(
                                e.id,
                                Keys.TERM_DELIMITER_PRD,
                                1
                            )
                        )
                        .withAlias("P0");
                } else if (
                    this.isMeasure(e.id.split(Keys.TERM_DELIMITER_PRD))
                ) {
                    baseNode = new BaseNode(
                        FastUtil.tokenizeAndJoin(
                            e.id,
                            Keys.TERM_DELIMITER_PRD,
                            1
                        ),
                        e.id
                    )
                        .withIdentifier(e.instanceID)
                        .withTemplateId(
                            e.configPath.replace(
                                /\./g,
                                Keys.TERM_DELIMITER_DASH
                            )
                        )
                        .withDataType(
                            FastUtil.tokenizeAndJoin(
                                e.configPath,
                                Keys.TERM_DELIMITER_PRD,
                                1
                            )
                        )
                        .withAlias(
                            FastUtil.tokenizeAndJoin(
                                e.instanceID,
                                Keys.TERM_DELIMITER_PRD,
                                2
                            )
                        )
                        .withMeasure(true);
                } else {
                    //Only attributes of MatchAll filtercards can be set as Y axis (except for Patient list requests)
                    this.__request.matchAny
                        .filter((f) => f.length === 1)
                        .forEach((gg) => {
                            const g = gg[0];
                            //Match axis id with filtercard attribute instanceid
                            for (let i = 0; i < g._attributes.length; i++) {
                                // attribute cannot be both measure and category
                                if (
                                    g._attributes[i]._instanceID === e.id &&
                                    patient.groupBy.filter(
                                        (i) => i.pathId === e.id
                                    ).length === 0
                                ) {
                                    baseNode = new BaseNode(
                                        FastUtil.tokenizeAndJoin(
                                            g._attributes[i]._configPath,
                                            Keys.TERM_DELIMITER_PRD,
                                            1
                                        ),
                                        g._attributes[i]._instanceID
                                    )
                                        .withIdentifier(g._instanceID)
                                        .withTemplateId(
                                            g._configPath.replace(
                                                /\./g,
                                                Keys.TERM_DELIMITER_DASH
                                            )
                                        )
                                        .withDataType(
                                            FastUtil.tokenizeAndJoin(
                                                g._configPath,
                                                Keys.TERM_DELIMITER_PRD,
                                                1
                                            )
                                        )
                                        .withAlias(
                                            FastUtil.tokenizeAndJoin(
                                                g._configPath,
                                                Keys.TERM_DELIMITER_PRD,
                                                1
                                            ) === "patient"
                                                ? "P0"
                                                : FastUtil.tokenizeAndJoin(
                                                      g._instanceID,
                                                      Keys.TERM_DELIMITER_PRD,
                                                      2
                                                  )
                                        );
                                    if (
                                        this.isMeasure(
                                            g._attributes[i]._instanceID.split(
                                                Keys.TERM_DELIMITER_PRD
                                            )
                                        )
                                    ) {
                                        baseNode.withMeasure(true).withFilter(
                                            g._attributes[
                                                i
                                            ]._constraints.reduce(
                                                (
                                                    constraintList,
                                                    constraint
                                                ) => {
                                                    if (
                                                        constraint instanceof
                                                        IFRExpression
                                                    ) {
                                                        constraintList.push(
                                                            new Expression(
                                                                constraint._operator,
                                                                constraint._value
                                                            )
                                                        );
                                                    } else if (
                                                        constraint._constraints
                                                            .length > 0
                                                    ) {
                                                        constraintList.push(
                                                            new And(
                                                                constraint._constraints.map(
                                                                    (f) =>
                                                                        new Expression(
                                                                            f._operator,
                                                                            f._value
                                                                        )
                                                                )
                                                            )
                                                        );
                                                    }
                                                    return constraintList;
                                                },
                                                []
                                            )
                                        );
                                    }
                                    break;
                                }
                            }
                        });
                }

                if (
                    !baseNode &&
                    typeof e.isFiltercard !== Keys.TERM_UNDEFINED
                ) {
                    //Create measure baseNode nevertheless.
                    baseNode = new BaseNode(
                        FastUtil.tokenizeAndJoin(
                            e.id,
                            Keys.TERM_DELIMITER_PRD,
                            1
                        ),
                        e.id
                    )
                        .withIdentifier(e.instanceID)
                        .withTemplateId(
                            e.configPath.replace(
                                /\./g,
                                Keys.TERM_DELIMITER_DASH
                            )
                        )
                        .withDataType(
                            FastUtil.tokenizeAndJoin(
                                e.configPath,
                                Keys.TERM_DELIMITER_PRD,
                                1
                            )
                        );
                    /**
                     * If axis is neither a pcount measure nor a measure that matches an attribute in non-exclude filtercards,
                     * check if axis property isFiltercard is false. This will indicate if axis attribute has been set
                     * as a column in patient list and that there is no corresponding filtercard associated with this attribute
                     * */
                    if (!e.isFiltercard) {
                        // check if axis interaction matches any matchAny non-negated filters
                        let matchAnyFilter = matchAnyFiltercardList.filter(
                            (j) =>
                                !j.isExclude &&
                                j.dataType ===
                                    FastUtil.tokenizeAndJoin(
                                        e.configPath,
                                        Keys.TERM_DELIMITER_PRD,
                                        1
                                    )
                        );
                        let newFc: FilterNode;
                        const instanceNum = FastUtil.tokenizeAndJoin(
                            baseNode.identifier,
                            Keys.TERM_DELIMITER_PRD,
                            1
                        );

                        /**
                         * If axis interaction type matches one of those in matchAny filters. Clone filter. Remove existing attribute constraints.
                         * Else, interaction does not exist in any filtercard constraint. Create filter.
                         * For both cases, set left join flag to true as it is not intended to be a constraint.
                         * Append the filter to newFilterCards list which will be used for postprocessing (See #LEFTJOIN POSTPROCESSING)
                         */
                        if (matchAnyFilter.length > 0) {
                            newFc = FastUtil.typedDeepClone(matchAnyFilter[0])
                                .withLeftJoin(true)
                                .clearAttributeList()
                                .withIdentifier(
                                    `${baseNode.templateId
                                        .split(Keys.TERM_DELIMITER_DASH)
                                        .join(".")}.
                                                                ${instanceNum}`
                                )
                                .withAlias(
                                    `${baseNode.dataType}${instanceNum}`
                                );

                            newFc.withAttributeList([
                                baseNode.withAlias(newFc.alias),
                            ]);
                        } else {
                            newFc = new FilterNode(
                                `${baseNode.templateId
                                    .split(Keys.TERM_DELIMITER_DASH)
                                    .join(".")}.${instanceNum}`,
                                e.configPath.replace(
                                    /\./g,
                                    Keys.TERM_DELIMITER_DASH
                                ),
                                FastUtil.tokenizeAndJoin(
                                    e.configPath,
                                    Keys.TERM_DELIMITER_PRD,
                                    1
                                ),
                                `${baseNode.dataType}${instanceNum}`
                            ).withLeftJoin(true);
                            newFc.withAttributeList([
                                baseNode.withAlias(newFc.alias),
                            ]);
                        }
                        newFilterCards.push(newFc);
                        newAttributes.push(baseNode.withAlias(newFc.alias));
                    } else {
                        /**
                         * If there is a match in filtercard instanceID but attribute is not set as a constraint in the fc,
                         * we append the attribute to newAttributes list which will be used for postprocessing (See #FILLMISSINGATTRIBUTES)
                         */
                        newAttributes.push(
                            baseNode.withAlias(
                                FastUtil.tokenizeAndJoin(
                                    e.instanceID,
                                    Keys.TERM_DELIMITER_PRD,
                                    2
                                )
                            )
                        );
                    }
                }
                if (baseNode) {
                    baseNode
                        .withAxis(e.axis)
                        .withSeq(e.seq)
                        .withBinsize(e.binsize)
                        .withAggregation(e.aggregation)
                        .withOrder(e.order);
                    measureList.push(baseNode);
                }

                return measureList;
            }, []);

        //Build list of having conditions
        population.groupBy = population.groupBy.concat(patient.groupBy);
        population.having = population.measure.filter(
            (e) => e.isMeasure && e.filter && e.filter.length > 0
        );

        //censoringThreshold
        if (this.censoringThreshold && population.having.length > 0) {
            population.having.forEach((e) => {
                e.filter[0].value =
                    e.filter[0].value < this.censoringThreshold
                        ? this.censoringThreshold
                        : e.filter[0].value;
            });
        } else {
            if (this.censoringThreshold) {
                population.having.push(
                    new BaseNode(Keys.MRITERM_PCOUNT, Keys.MRITERM_PCOUNT_ALIAS)
                        .withTemplateId(Keys.MRITERM_PCOUNT_TEMPLATEID)
                        .withAlias("P0")
                        .withFilter([
                            new Expression(
                                Keys.SQLTERM_INEQUALITY_SYMBOL_GREATEROREQUAL,
                                this.censoringThreshold
                            ),
                        ])
                );
            }
        }
        return population;
    }

    private buildPatient(
        x: FilterCard[],
        id: number,
        matchAnyFiltercardList?: FilterNode[]
    ): ParserContainer {
        let patient = new ParserContainer(
            Keys.DEF_PATIENTREQUEST + id,
            Keys.CQLTERM_CONTEXT_PATIENT,
            id
        );

        //Build list of filters
        patient.filter = x
            .filter(
                (e) =>
                    FastUtil.tokenizeAndJoin(
                        e._configPath,
                        Keys.TERM_DELIMITER_PRD,
                        1
                    ) !== "patient"
            )
            .reduce((filterConditions, filtercard) => {
                let currNode = FastUtil.tokenizeAndJoin(
                    filtercard._configPath,
                    Keys.TERM_DELIMITER_PRD,
                    1
                );
                // create interaction filternode
                let node = new FilterNode(
                    filtercard._instanceID,
                    filtercard._configPath.replace(
                        /\./g,
                        Keys.TERM_DELIMITER_DASH
                    ),
                    currNode,
                    FastUtil.tokenizeAndJoin(
                        filtercard._instanceID,
                        Keys.TERM_DELIMITER_PRD,
                        2
                    )
                )
                    .withExclude(filtercard instanceof ExcludeFilterCard)
                    .withAttributeList(
                        filtercard._attributes.map((e) => {
                            return new BaseNode(
                                FastUtil.tokenizeAndJoin(
                                    e._configPath,
                                    Keys.TERM_DELIMITER_PRD,
                                    1
                                ),
                                e._instanceID
                            ).withFilter(
                                e._constraints.reduce(
                                    (constraintList, constraint) => {
                                        if (
                                            constraint instanceof IFRExpression
                                        ) {
                                            constraintList.push(
                                                new Expression(
                                                    constraint._operator,
                                                    constraint._value
                                                )
                                            );
                                        } else if (
                                            constraint._constraints.length > 0
                                        ) {
                                            constraintList.push(
                                                new And(
                                                    constraint._constraints.map(
                                                        (f) =>
                                                            new Expression(
                                                                f._operator,
                                                                f._value
                                                            )
                                                    )
                                                )
                                            );
                                        }
                                        return constraintList;
                                    },
                                    []
                                )
                            );
                        })
                    );
                if (filtercard._successor) {
                    node.attributeList.push(
                        new BaseNode(
                            "_succ",
                            filtercard._instanceID + ".attributes._succ"
                        )
                            .withValue(filtercard._successor.id)
                            .withFilter([
                                new And(
                                    Object.keys(filtercard._successor).reduce(
                                        (expressions, key) => {
                                            if (
                                                typeof filtercard._successor[
                                                    key
                                                ] !== Keys.TERM_UNDEFINED &&
                                                filtercard._successor[key] !==
                                                    null
                                            ) {
                                                if (key === "minDaysBetween") {
                                                    expressions.push(
                                                        new Expression(
                                                            Keys.SQLTERM_INEQUALITY_SYMBOL_GREATEROREQUAL,
                                                            filtercard._successor.minDaysBetween
                                                        )
                                                    );
                                                } else if (
                                                    key === "maxDaysBetween"
                                                ) {
                                                    expressions.push(
                                                        new Expression(
                                                            Keys.SQLTERM_INEQUALITY_SYMBOL_LESS,
                                                            filtercard._successor.maxDaysBetween
                                                        )
                                                    );
                                                }
                                            }
                                            return expressions;
                                        },
                                        []
                                    )
                                ),
                            ])
                    );
                }
                if (filtercard._parentInteraction) {
                    node.attributeList.push(
                        new BaseNode(Keys.MRITERM_PARENTINTERACTION)
                            .withAlias(
                                FastUtil.tokenizeAndJoin(
                                    filtercard._instanceID,
                                    Keys.TERM_DELIMITER_PRD,
                                    2
                                )
                            )
                            .withFilter([
                                new Expression(
                                    Keys.SQLTERM_INEQUALITY_SYMBOL_EQUAL,
                                    FastUtil.tokenizeAndJoin(
                                        filtercard._parentInteraction.id,
                                        Keys.TERM_DELIMITER_PRD,
                                        2
                                    )
                                )
                                    .withType("expressionOp")
                                    .withPath(Keys.MRITERM_INTERACTIONID),
                            ])
                    );
                }
                if (filtercard._advanceTimeFilter) {
                    node.attributeList.push(
                        new BaseNode(
                            Keys.MRITERM_TEMPORALQUERY,
                            filtercard._instanceID +
                                ".attributes." +
                                Keys.MRITERM_TEMPORALQUERY
                        )
                            .withAlias(
                                FastUtil.tokenizeAndJoin(
                                    filtercard._instanceID,
                                    Keys.TERM_DELIMITER_PRD,
                                    2
                                )
                            )
                            .withFilter(
                                filtercard._advanceTimeFilter.request.reduce(
                                    (tempQFilters, request) => {
                                        if (request.and) {
                                            tempQFilters.push(
                                                new And(
                                                    (request.and as any[]).map(
                                                        (e) => {
                                                            if (e.or) {
                                                                return new Or(
                                                                    (
                                                                        e.or as any[]
                                                                    ).map(
                                                                        (f) =>
                                                                            new TemporalQueryNode(
                                                                                f.value,
                                                                                f.filter.map(
                                                                                    (
                                                                                        g
                                                                                    ) => {
                                                                                        return {
                                                                                            and: g.and.map(
                                                                                                (
                                                                                                    h
                                                                                                ) =>
                                                                                                    new Expression(
                                                                                                        h.op,
                                                                                                        h.value
                                                                                                    )
                                                                                                        .withThis(
                                                                                                            g.this
                                                                                                        )
                                                                                                        .withOther(
                                                                                                            g.other
                                                                                                        )
                                                                                            ),
                                                                                        };
                                                                                    }
                                                                                )
                                                                            )
                                                                    )
                                                                );
                                                            } else {
                                                                return new TemporalQueryNode(
                                                                    e.value,
                                                                    e.filter.map(
                                                                        (g) => {
                                                                            return {
                                                                                and: g.and.map(
                                                                                    (
                                                                                        h
                                                                                    ) =>
                                                                                        new Expression(
                                                                                            h.op,
                                                                                            h.value
                                                                                        )
                                                                                            .withThis(
                                                                                                g.this
                                                                                            )
                                                                                            .withOther(
                                                                                                g.other
                                                                                            )
                                                                                ),
                                                                            };
                                                                        }
                                                                    )
                                                                );
                                                            }
                                                        }
                                                    )
                                                )
                                            );
                                        }
                                        return tempQFilters;
                                    },
                                    [] as Filter[]
                                )
                            )
                    );
                }
                if (matchAnyFiltercardList && filtercard._isMatchAny) {
                    matchAnyFiltercardList.push(FastUtil.typedDeepClone(node));
                }

                filterConditions[currNode]
                    ? filterConditions[currNode].push(node)
                    : (filterConditions[currNode] = [node]);
                return filterConditions;
            }, {});

        //Detect interactions with multiple identical filtercards and add NotEqual check between them. Must be after isExclude is detected!
        Deno.env.get("NOT_EQ_CHECK_FILTERCARDS") === "true" && 
            Object.keys(patient.filter)
                .filter((e) => patient.filter[e].length > 1)
                .forEach((interaction) =>
                    patient.filter[interaction].forEach((e, i) => {
                        e.join = [];
                        if (i === 0 || e.isExclude) return; //Skip the first filtercard alone OR excluded filtercards
                        // Traverse to previous nodes and get their alias for establishing join relationship
                        for (let k = i - 1; k >= 0; k--) {
                            const identicalNode =
                                patient.filter[interaction][k];
                            if (identicalNode.isExclude) continue; // skip excluded filtercards
                            //path, e.alias, e.filter, e.pathId
                            e.join.push({
                                path: null,
                                pathId: null,
                                alias: identicalNode.alias,
                                filter: [
                                    new Expression(
                                        Keys.SQLTERM_INEQUALITY_SYMBOL_NOTEQUAL,
                                        identicalNode.alias
                                    ).withType("expressionOp"),
                                ],
                            });
                        }
                    })
                );

        // Build list of where conditions
        // Gets list of basic data attribute constraints and adds them into the where clause conditions
        let basicDataAttributes: BaseNode[] = x
            .filter(
                (e) =>
                    FastUtil.tokenizeAndJoin(
                        e._configPath,
                        Keys.TERM_DELIMITER_PRD,
                        1
                    ) === "patient"
            )
            .reduce((whereConditions, filtercard) => {
                filtercard._attributes
                    .filter(
                        (e) =>
                            !this.isMeasure(
                                e._instanceID.split(Keys.TERM_DELIMITER_PRD)
                            )
                    )
                    .forEach((e) => {
                        whereConditions.push(
                            new BaseNode(
                                FastUtil.tokenizeAndJoin(
                                    e._configPath,
                                    Keys.TERM_DELIMITER_PRD,
                                    1
                                ),
                                e._instanceID
                            )
                                .withIdentifier(e._configPath)
                                .withTemplateId(
                                    e._configPath.replace(
                                        /\./g,
                                        Keys.TERM_DELIMITER_DASH
                                    )
                                )
                                .withDataType(
                                    FastUtil.tokenizeAndJoin(
                                        filtercard._configPath,
                                        Keys.TERM_DELIMITER_PRD,
                                        1
                                    )
                                )
                                .withAlias(patient.alias)
                                .withFilter(
                                    e._constraints.reduce(
                                        (constraintList, constraint) => {
                                            if (
                                                constraint instanceof
                                                IFRExpression
                                            ) {
                                                constraintList.push(
                                                    new Expression(
                                                        constraint._operator,
                                                        constraint._value
                                                    )
                                                );
                                            } else if (
                                                constraint._constraints.length >
                                                0
                                            ) {
                                                constraintList.push(
                                                    new And(
                                                        constraint._constraints.map(
                                                            (f) =>
                                                                new Expression(
                                                                    f._operator,
                                                                    f._value
                                                                )
                                                        )
                                                    )
                                                );
                                            }
                                            return constraintList;
                                        },
                                        []
                                    )
                                )
                        );
                    });

                return whereConditions;
            }, []);

        // Retrieves list of excluded filtercards and adds negation conditions to where clause
        let excludedFiltercards: BaseNode[] = x
            .filter((e) => e instanceof ExcludeFilterCard)
            .reduce((whereConditions, filtercard) => {
                whereConditions.push(
                    new BaseNode(Keys.MRITERM_INTERACTIONID) //todo: check if sqlGenerator requires pathId for exclude where nodes
                        .withIdentifier(filtercard._instanceID)
                        .withTemplateId(
                            filtercard._configPath.replace(
                                /\./g,
                                Keys.TERM_DELIMITER_DASH
                            )
                        )
                        .withAlias(
                            FastUtil.tokenizeAndJoin(
                                filtercard._instanceID,
                                Keys.TERM_DELIMITER_PRD,
                                2
                            )
                        )
                        .withPathId(
                            filtercard._instanceID +
                                "." +
                                Keys.MRITERM_INTERACTIONID
                        )
                        .withFilter([new Expression("=", "NoValue")])
                );
                return whereConditions;
            }, []);

        // Compiles all where conditions
        patient.where = [
            ...basicDataAttributes,
            // ...filtercardsWithIdenticalInteractions,
            ...excludedFiltercards,
        ].filter((e) => e.filter.length > 0);

        //Build list of groupby conditions
        patient.groupBy = this.__request.axes
            .filter((e) => e.axis === "x")
            .reduce((groupByList, e) => {
                let baseNode: BaseNode = null;
                x.filter((f) => f instanceof FilterCard).forEach((g) => {
                    for (let i = 0; i < g._attributes.length; i++) {
                        if (
                            g._attributes[i]._instanceID === e.id &&
                            patient.groupBy.filter((i) => i.pathId === e.id)
                                .length === 0
                        ) {
                            let isBasicData =
                                FastUtil.tokenizeAndJoin(
                                    g._configPath,
                                    Keys.TERM_DELIMITER_PRD,
                                    1
                                ) === "patient";
                            baseNode = new BaseNode(
                                FastUtil.tokenizeAndJoin(
                                    g._attributes[i]._configPath,
                                    Keys.TERM_DELIMITER_PRD,
                                    1
                                ),
                                g._attributes[i]._instanceID
                            )
                                .withIdentifier(
                                    isBasicData
                                        ? g._attributes[i]._instanceID
                                        : g._instanceID
                                )
                                .withTemplateId(
                                    isBasicData
                                        ? g._attributes[i]._configPath.replace(
                                              /\./g,
                                              Keys.TERM_DELIMITER_DASH
                                          )
                                        : g._configPath.replace(
                                              /\./g,
                                              Keys.TERM_DELIMITER_DASH
                                          )
                                )
                                .withDataType(
                                    isBasicData
                                        ? FastUtil.tokenizeAndJoin(
                                              g._attributes[i]._configPath,
                                              Keys.TERM_DELIMITER_PRD,
                                              1
                                          )
                                        : FastUtil.tokenizeAndJoin(
                                              g._configPath,
                                              Keys.TERM_DELIMITER_PRD,
                                              1
                                          )
                                )
                                .withAlias(
                                    isBasicData
                                        ? `P${id}`
                                        : FastUtil.tokenizeAndJoin(
                                              g._instanceID,
                                              Keys.TERM_DELIMITER_PRD,
                                              2
                                          )
                                )
                                .withFilter(
                                    g._attributes[i]._constraints.reduce(
                                        (constraintList, constraint) => {
                                            if (
                                                constraint instanceof
                                                IFRExpression
                                            ) {
                                                constraintList.push(
                                                    new Expression(
                                                        constraint._operator,
                                                        constraint._value
                                                    )
                                                );
                                            } else if (
                                                constraint._constraints.length >
                                                0
                                            ) {
                                                constraintList.push(
                                                    new And(
                                                        constraint._constraints.map(
                                                            (f) =>
                                                                new Expression(
                                                                    f._operator,
                                                                    f._value
                                                                )
                                                        )
                                                    )
                                                );
                                            }
                                            return constraintList;
                                        },
                                        []
                                    )
                                );
                            break;
                        }
                    }
                });

                if (baseNode) {
                    baseNode
                        .withAxis(e.axis)
                        .withSeq(e.seq)
                        .withBinsize(e.binsize)
                        .withAggregation(e.aggregation)
                        .withOrder(e.order);
                    groupByList.push(baseNode);
                }
                return groupByList;
            }, [])
            .sort((x, y) => x.seq - y.seq);

        return patient;
    }

    private isMeasure(pathToken: string[]) {
        return (
            typeof this.__qConfig
                .getEntityByPath(FastUtil.getId(pathToken, true, true))
                .getConfig()[Keys.MRITERM_MEASUREEXPRESSION] !==
            Keys.TERM_UNDEFINED
        );
    }
}
