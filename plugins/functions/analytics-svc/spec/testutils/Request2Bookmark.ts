const DELIMITER = ".";
let trim = (x: any) => {
    let isPrimitive = (z: any) => {
        return (typeof z === "string" ||
            typeof z === "number" ||
            typeof z === "boolean");
    };
    try {
        if (x instanceof Object) {
            Object.keys(x).forEach((y) => {
                if (x[y] === null) {
                    delete x[y];
                } else if (isPrimitive(x[y])) {
                    return;
                } else if (x[y] && Object.keys(x[y]).length > 0) {
                    trim(x[y]);
                }
            });
        } else if (x instanceof Array) {
            x.forEach((y) => trim(y));
        }
    } catch (e) {
        throw e;
    }
};

class PatientVisitor {
    public axes: Axis[] = [];
    public basicData: FilterCard[];
    public cards: Card[] = [];
    public configData: ConfigMetaData;
    private specialAttributes = ["_succ", "_tempQ", "parentInteraction"];

    constructor(public patient: any) {
        this.visitPatient();
    }

    private visitPatient() {
        let pathId = ["patient"];
        this.basicData = this.patient.attributes ? [this.visitBasicData(pathId, this.patient.attributes)] : [];
        this.cards = [...this.visitConditions(pathId, this.patient.conditions), ...this.visitInteractions(pathId, this.patient.interactions)];
        this.configData = this.patient.configData ? this.patient.configData : <ConfigMetaData> {version: "No config version", id: "No config id"};
    }

    private visitBasicData(parentPathId: string[], basicData: any): FilterCard {
        let pathId = [...parentPathId];

        if (basicData.pcount) {
            this.axes.push(this.createAxis("yaxis", parentPathId, "0", [...pathId, "attributes", "pcount"], basicData.pcount[0]));
        }

        return {
            type: "FilterCard",
            configPath: parentPathId.join(DELIMITER),
            instanceNumber: 0,
            instanceID: parentPathId.join(DELIMITER),
            attributes: {type: "BooleanContainer", op: "AND", content: Object.keys(basicData)
                                        .filter((e) => e !== "pcount")   //handle pcount attribute as an axis elsewhere
                                        .map((attributeName) => this.visitAttributes(pathId,
                                                                                     attributeName,
                                                                                     basicData[attributeName][0], "0")),
            } as BooleanContainer<Constraint>,
        } as FilterCard;
    }

    private visitConditions(parentPathId: string[], conditions: any): Card[] {
        return conditions ? Object.keys(conditions).reduce( (filtercards, conditionName) => {
            let condition = conditions[conditionName];
            Object.keys(condition.interactions).forEach((interactionType) => {
                let interaction = condition.interactions[interactionType];
                Object.keys(interaction).forEach((instanceNumber) => {

                    let filter = interaction[instanceNumber];
                    let configPath = [...parentPathId, "conditions", conditionName, "interactions", interactionType];
                    let instanceID = [...configPath, instanceNumber];
                    let attributes = filter.attributes;
                    let filtercard = {
                        type: "FilterCard",
                        configPath: configPath.join(DELIMITER),
                        instanceNumber: parseInt(instanceNumber, 10),
                        instanceID: instanceID.join(DELIMITER),
                        attributes: {type: "BooleanContainer", op: "AND", content: attributes ?
                          Object.keys(attributes).filter((e) => this.specialAttributes.indexOf(e) === -1)
                          .reduce( (attributeConstraints, attributeName) => {
                            attributeConstraints.push( this.visitAttributes(instanceID,
                            attributeName,
                            attributes[attributeName][0],
                            "0"));
                            return attributeConstraints;
                            }, [] as Constraint[]) : []} as BooleanContainer<Constraint>,
                        successor: attributes && attributes._succ ? this.createSuccessor(attributes._succ[0]) : null,
                        parentInteraction: filter.parentInteraction ? filter.parentInteraction[0].value : null,
                        advanceTimeFilter: filter._tempQ ? filter._tempQ : null,
                    } as FilterCard;

                    filtercards.push(filter.exclude ? {type: "BooleanContainer", op: "NOT", content: [filtercard]} : filtercard);
                });
            });
            return filtercards;
        }, [] as Card[]) : [];
    }

    private visitInteractions(parentPathId, interactions: any): Card[] {
        return interactions ? Object.keys(interactions).reduce((filtercards, interactionName) => {
            let interaction = interactions[interactionName];
            Object.keys(interaction).forEach((instanceNumber) => {
                let filter = interaction[instanceNumber];
                let configPath = [...parentPathId, "interactions", interactionName];
                let instanceID = [...configPath, instanceNumber];
                let attributes = filter.attributes;
                let filtercard = {
                    type: "FilterCard",
                    configPath: configPath.join(DELIMITER),
                    instanceNumber: parseInt(instanceNumber, 10),
                    instanceID: instanceID.join(DELIMITER),
                    attributes: {type: "BooleanContainer", op: "AND", content: attributes ?
                      Object.keys(attributes).filter((e) => this.specialAttributes.indexOf(e) === -1)
                      .reduce( (attributeConstraints, attributeName) => {
                        attributeConstraints.push( this.visitAttributes(instanceID,
                        attributeName,
                        attributes[attributeName][0],
                        "0"));
                        return attributeConstraints;
                      }, [] as Constraint[]) : []} as BooleanContainer<Constraint>,
                    successor: attributes && attributes._succ ? this.createSuccessor(attributes._succ[0]) : null,
                    parentInteraction: attributes && attributes.parentInteraction ? attributes.parentInteraction[0].value : null,
                    advanceTimeFilter: attributes && attributes._tempQ ? attributes._tempQ : null,
                } as FilterCard;

                filtercards.push(filter.exclude ? {type: "BooleanContainer", op: "NOT", content: [filtercard]} : filtercard);
            });
            return filtercards;
        }, [] as Card[]) : [];
    }

    private visitAttributes(parentPathId: string[], attributeName: string, attribute: any, instanceNumber: string, isFiltercard?: boolean): Constraint {
        let pathId = [...parentPathId, "attributes", attributeName];

        Object.keys(attribute).filter((e) => e === "xaxis" || e === "yaxis")
                              .forEach((f) => this.axes.push(this.createAxis(f, parentPathId, instanceNumber, pathId, attribute, isFiltercard)));

        return {
            type: "Attribute",
            configPath: pathId.join(DELIMITER),
            instanceID: instanceNumber !== "0" ? [...parentPathId, instanceNumber, "attributes", attributeName].join(DELIMITER) : pathId.join(DELIMITER),
            constraints: this.visitConstraint(attribute.filter),
        } as Constraint;

    }

    private visitConstraint(filter: any[]): BooleanContainer<Expression|And> {
        let constraint: BooleanContainer<Expression|And> = {
            type: "BooleanContainer",
            op: "OR",
            content: [],
        };

        if (filter) {
            constraint.content = filter.map((e) => {
               return e.and ?
                        {type: "BooleanContainer", op: "AND", content:
                            //tslint:disable next-line: arrow-return-shorthand
                            e.and.map ((f) => {return {type: "Expression", operator: f.op, value: f.value} as Expression; })} :
                        {type: "Expression", operator: e.op, value: e.value} as Expression;
            });
        }
        return constraint;
    }

    private createAxis(axisType: string, parentPathId: string[], instanceNumber: string, pathId: string[], attribute: any, isFiltercard?: boolean): Axis {
        if (attribute.aggregation) {
            return {
                attributeId: pathId.join(DELIMITER),
                binsize: attribute.binsize ? attribute.binsize : "",
                categoryId: axisType.substring(0, 1) + attribute[axisType],
                aggregation: attribute.aggregation,
            } as Axis;
        }

        return {
            attributeId: pathId.join(DELIMITER),
            binsize: attribute.binsize ? attribute.binsize : "",
            categoryId: axisType.substring(0, 1) + attribute[axisType],
        } as Axis;
    }

    private createSuccessor(attribute: any): Successor {
        let succ = {
            id: attribute.value,
            minDaysBetween: null,
            maxDaysBetween: null,
        } as Successor;

        attribute.filter[0].and.forEach((e) => {
            if (e.op === ">=") {
                succ.minDaysBetween = e.value;
            } else if (e.op === "<") {
                succ.maxDaysBetween = e.value;
            }
        });
        return succ;
    }
}

export function request2Bookmark(request: any, chartType?: string): any {
    request = request instanceof Array ? request : [request];
    let req = (request as any[]).map( (e) => new PatientVisitor(e.patient));
    let filter = {
        configMetadata: req[0].configData,
    } as Filter;

    let matchAll: Card[] = req[0].basicData;
    let matchAny: Card[] = [];

    if (req.length > 1) {
        //compare first 2 requests, search for common filters and add them to matchAll category
        let counter = 0;
        let lhs;
        let rhs;
        //identifies matchAll filtercards
        do {
            lhs = JSON.stringify(req[0].cards[counter]);
            rhs = JSON.stringify(req[1].cards[counter]);

            if (lhs === rhs) {
                matchAll.push(req[0].cards[counter]);
            }
            ++counter;
        } while (lhs === rhs);

        //identifies matchAny filtercards
        matchAny = req.reduce( (matchAnyList, filter) => {
            filter.cards.forEach((e) => {
                if (matchAll.filter((f) => JSON.stringify(f) === JSON.stringify(e)).length === 0) {
                    matchAnyList.push(e);
                }
            });
            return matchAnyList;
        }, [] as Card[]);
    } else {
        matchAll = matchAll.concat(req[0].cards);
        matchAny = [];
    }

    filter.cards = {
        type: "BooleanContainer",
        op: "AND",
        content: matchAll.map((card) => {
                return {
                    type: "BooleanContainer",
                    op: "OR",
                    content: [card],
                };
            }),
    };

    if (chartType === "km") {
        if (request[0].kmEventIdentifier) {
            let bookmarkKey = "selected_event";
            filter[bookmarkKey] = {
                key: request[0].kmEventIdentifier,
            };
        }
        if (request[0].kmEndEventIdentifier) {
            let bookmarkKey = "selected_end_event";
            filter[bookmarkKey] = {
                key: request[0].kmEndEventIdentifier,
            };
        }
        if (request[0].kmStartEventOccurence) {
            let bookmarkKey = "selected_start_event_occ";
            filter[bookmarkKey] = {
                key: request[0].kmStartEventOccurence,
            };
        }
        if (request[0].kmEndEventOccurence) {
            let bookmarkKey = "selected_end_event_occ";
            filter[bookmarkKey] = {
                key: request[0].kmEndEventOccurence,
            };
        }
    }

    let bookmark = {
        filter,
        axisSelection: req[0].axes,
        chartType: chartType ? chartType : "stacked",
    } as Bookmark;

    // Furnish IFR with additional options if any
    Object.keys(request[0]).filter((e) => e !== "patient")
                           .forEach((f) => {bookmark[f] = request[0][f]; });

    trim(bookmark);

    return bookmark;
}


type Bookmark = {
    filter: Filter;
    axisSelection: Axis[];
};

type Filter = {
    configMetadata: ConfigMetaData;
    cards: BooleanContainer<BooleanContainer<Card>>
};

type BooleanContainer<T> = {
    type: string;
    op: string;
    content: T[];
};

type ConfigMetaData = {
    id: string;
    version: string;
};


type Axis = {
    attributeId: string;
    categoryId: string;
    binsize: string;
    aggregation?: string;
};

type Card = FilterCard | ExcludeFilterCard;

type FilterCard = {
    type: string;
    configPath: string;
    instanceNumber: number;
    instanceID: string;
    name?: string;
    attributes: BooleanContainer<Constraint>;
    successor?: Successor;
    parentInteraction?: ParentInteraction;
    advanceTimeFilter?: TemporalQuery;
    inactive?: boolean;
    isMatchAny?: boolean;
};

type ExcludeFilterCard = BooleanContainer<FilterCard>;

type Constraint = {
    configPath: string;
    instanceID: string;
    constraints: BooleanContainer<Expression|And>;
};

type TemporalQuery = {
    request: any[];
};

type Successor = {
    id: string;
    minDaysBetween: string;
    maxDaysBetween: string;
};

type ParentInteraction = {
    id: string;
};

type AbsoluteTime = BooleanContainer<BooleanContainer<Expression>>;

type Expression = {
    type: string;
    operator: string;
    value: string;
};

type And = {
    content: Expression[];
};

type Or = {
    content: Expression[];
};
