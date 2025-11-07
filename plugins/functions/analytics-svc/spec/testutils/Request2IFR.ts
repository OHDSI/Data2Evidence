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
        this.configData = this.patient.configData ? this.patient.configData : <ConfigMetaData> {configVersion: "No config version", configId: "No config id"};
    }

    private visitBasicData(parentPathId: string[], basicData: any): FilterCard {
        let pathId = [...parentPathId];

        if (basicData.pcount) {
            this.axes.push(this.createAxis("yaxis", parentPathId, "0", [...pathId, "attributes", "pcount"], basicData.pcount[0]));
        }

        return {
            _configPath: parentPathId.join(DELIMITER),
            _instanceNumber: 0,
            _instanceID: parentPathId.join(DELIMITER),
            _attributes: {content: Object.keys(basicData)
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
                        _configPath: configPath.join(DELIMITER),
                        _instanceNumber: parseInt(instanceNumber, 10),
                        _instanceID: instanceID.join(DELIMITER),
                        _attributes: {content: attributes ? Object.keys(attributes).filter((e) => this.specialAttributes.indexOf(e) === -1)
                                                                  .reduce( (attributeConstraints, attributeName) => {
                                                                        attributeConstraints.push( this.visitAttributes(instanceID,
                                                                                                                        attributeName,
                                                                                                                        attributes[attributeName][0],
                                                                                                                        "0"));
                                                                        return attributeConstraints;
                                                                    }, [] as Constraint[]) : []} as BooleanContainer<Constraint>,
                        _successor: attributes && attributes._succ ? this.createSuccessor(attributes._succ[0]) : null,
                        _parentInteraction: filter.parentInteraction ? filter.parentInteraction[0].value : null,
                        _advance_time_filter: filter._tempQ ? filter._tempQ : null,
                    } as FilterCard;

                    filtercards.push(filter.exclude ? {content: [filtercard]} : filtercard);
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
                    _configPath: configPath.join(DELIMITER),
                    _instanceNumber: parseInt(instanceNumber, 10),
                    _instanceID: instanceID.join(DELIMITER),
                    _attributes: {content: attributes ? Object.keys(attributes).filter((e) => this.specialAttributes.indexOf(e) === -1)
                                                                  .reduce( (attributeConstraints, attributeName) => {
                                                                        attributeConstraints.push( this.visitAttributes(instanceID,
                                                                                                                        attributeName,
                                                                                                                        attributes[attributeName][0],
                                                                                                                        "0"));
                                                                        return attributeConstraints;
                                                                    }, [] as Constraint[]) : []} as BooleanContainer<Constraint>,
                    _successor: attributes && attributes._succ ? this.createSuccessor(attributes._succ[0]) : null,
                    _parentInteraction: attributes && attributes.parentInteraction ? attributes.parentInteraction[0].value : null,
                    _advance_time_filter: attributes && attributes._tempQ ? attributes._tempQ : null,
                } as FilterCard;

                filtercards.push(filter.exclude ? {content: [filtercard]} : filtercard);
            });
            return filtercards;
        }, [] as Card[]) : [];
    }

    private visitAttributes(parentPathId: string[], attributeName: string, attribute: any, instanceNumber: string, isFiltercard?: boolean): Constraint {
        let pathId = [...parentPathId, "attributes", attributeName];

        Object.keys(attribute).filter((e) => e === "xaxis" || e === "yaxis")
                              .forEach((f) => this.axes.push(this.createAxis(f, parentPathId, instanceNumber, pathId, attribute, isFiltercard)));

        return {
            _configPath: pathId.join(DELIMITER),
            _instanceID: instanceNumber !== "0" ? [...parentPathId, instanceNumber, "attributes", attributeName].join(DELIMITER) : pathId.join(DELIMITER),
            _constraints: this.visitConstraint(attribute.filter),
        } as Constraint;

    }

    private visitConstraint(filter: any[]): BooleanContainer<Expression|And> {
        let constraint: BooleanContainer<Expression|And> = {
            content: [],
        };

        if (filter) {
            constraint.content = filter.map((e) => {
               return e.and ?
                        //tslint:disable next-line: arrow-return-shorthand
                        {content: e.and.map ((f) => {return {_operator: f.op, _value: f.value} as Expression; })} :
                        {_operator: e.op, _value: e.value} as Expression;
            });
        }
        return constraint;
    }

    private createAxis(axisType: string, parentPathId: string[], instanceNumber: string, pathId: string[], attribute: any, isFiltercard?: boolean): Axis {
        return {
            instanceID: instanceNumber !== "0" ? [...parentPathId, instanceNumber].join(DELIMITER) : parentPathId.join(DELIMITER),
            configPath: parentPathId.join(DELIMITER),
            id: pathId.join(DELIMITER),
            axis: axisType.substring(0, 1),
            seq: attribute[axisType],
            binsize: attribute.binsize ? attribute.binsize : null,
            aggregation: attribute.aggregation ? attribute.aggregation : null,
            order: attribute.order ? attribute.order : null,
            isFiltercard: typeof isFiltercard !== "undefined" ? isFiltercard : null,
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

export function request2IFR(request: any): any {
    request = request instanceof Array ? request : [request];
    let req = (request as any[]).map( (e) => new PatientVisitor(e.patient));
    let ifr = {
            configData: req[0].configData,
            axes: req[0].axes,
        } as IFR;

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

    ifr.cards = {
        content: matchAll.map((card) => ({ content: [card] })),            
    };

    // Furnish IFR with additional options if any
    Object.keys(request[0]).filter((e) => e !== "patient")
                           .forEach((f) => {ifr[f] = request[0][f]; });

    trim(ifr);

    return ifr;
}


type BooleanContainer<T> = {
    content: T[];
};

type IFR = {
    configData: ConfigMetaData;
    cards: BooleanContainer<BooleanContainer<Card>>
    axes: Axis[];
};

type ConfigMetaData = {
    configVersion: string;
    configId: string;
};

type Axis = {
    instanceID: string;
    configPath: string;
    id: string;
    axis: string;
    seq: number;
    binsize?: number;
    aggregation?: string;
    order?: string;
    isFiltercard?: boolean;
};

type Card = FilterCard | ExcludeFilterCard;

type FilterCard = {
    _configPath: string;
    _instanceNumber: number;
    _instanceID: string;
    _name?: string;
    _attributes: BooleanContainer<Constraint>;
    _successor?: Successor;
    _parentInteraction?: ParentInteraction;
    _advance_time_filter?: TemporalQuery;
    _inactive?: boolean;
    _isMatchAny?: boolean;
};

type ExcludeFilterCard = BooleanContainer<FilterCard>;

type Constraint = {
    _configPath: string;
    _instanceID: string;
    _constraints: BooleanContainer<Expression|And>;
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
    _operator: string;
    _value: string;
};

type And = {
    content: Expression[];
};

type Or = {
    content: Expression[];
};
