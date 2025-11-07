export interface ICloneable<T> {
    clone(): T;
}

export class ParserContainer implements ICloneable<ParserContainer> {
    constructor(
        public name: string,
        public context: string,
        public idx: number,
        public alias: string = "",
        public filter: any = {},
        public groupBy: any[] = [],
        public where: any[] = [],
        public measure: any[] = [],
        public having: any[] = [],
        public orderBy: any[] = [],
        public customClauseMap: string[] = []
    ) {
        if (!alias) {
            this.alias = context.substring(0, 1).toUpperCase() + idx.toString();
        } else {
            this.alias = alias;
        }
    }

    public addClause(clause: string, value: any) {
        this[clause] = value;
        this.customClauseMap.push(clause);
    }

    public clone(): ParserContainer {
        return new ParserContainer(
            this.name,
            this.context,
            this.idx,
            this.alias,
            this.filter,
            this.groupBy,
            this.where,
            this.measure,
            this.having,
            this.orderBy,
            this.customClauseMap
        );
    }
}

// tslint:disable-next-line:max-classes-per-file
export class FilterNode implements ICloneable<FilterNode> {
    constructor(
        public identifier: string,
        public templateId: string,
        public dataType: string,
        public alias: string,
        public attributeList: BaseNode[] = [],
        public isExclude?: boolean,
        public isLeftJoin?: boolean,
        public join?: any[],
    ) {}

    public clone(): FilterNode {
        return new FilterNode(
            this.identifier,
            this.templateId,
            this.dataType,
            this.alias,
            this.attributeList,
            this.isExclude,
            this.isLeftJoin
        );
    }

    public withAttributeList(attributeList: BaseNode[]) {
        this.attributeList = attributeList;
        return this;
    }

    public clearAttributeList() {
        this.attributeList = [];
        return this;
    }

    public withExclude(isExclude: boolean) {
        if (isExclude) {
            this.isExclude = isExclude;
        }
        return this;
    }

    public withLeftJoin(isLeftJoin: boolean) {
        this.isLeftJoin = isLeftJoin;
        return this;
    }

    public withAlias(alias: string) {
        this.alias = alias;
        return this;
    }

    public withIdentifier(identifier: string) {
        this.identifier = identifier;
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class BaseNode {
    public filter: Filter;
    public order: string;
    public axis: string; //'x',
    public seq: number;
    public identifier: string;
    public templateId: string;
    public dataType: string;
    public alias: string;
    public isMeasure: boolean;
    public value: string;
    public binsize: number;
    public aggregation: string;

    constructor(public path: string, public pathId?: string) {}

    public withIdentifier(identifier: string) {
        this.identifier = identifier;
        return this;
    }

    public withTemplateId(templateId: string) {
        this.templateId = templateId;
        return this;
    }

    public withDataType(dataType: string) {
        this.dataType = dataType;
        return this;
    }

    public withAlias(alias: string) {
        this.alias = alias;
        return this;
    }

    public withPathId(pathId: string) {
        this.pathId = pathId;
        return this;
    }

    public withMeasure(isMeasure: boolean) {
        this.isMeasure = isMeasure;
        return this;
    }

    public withFilter(filter: Filter) {
        this.filter = filter;
        return this;
    }

    public withValue(value: string) {
        this.value = value;
        return this;
    }

    public withAxis(axis: string) {
        this.axis = axis;
        return this;
    }

    public withSeq(seq: number) {
        this.seq = seq;
        return this;
    }

    public withOrder(order: string) {
        this.order = order ? order : "ASC";
        return this;
    }

    public withBinsize(binsize: number) {
        if (binsize) {
            this.binsize = binsize;
        }
        return this;
    }

    public withAggregation(aggregation: string) {
        if (aggregation) {
            this.aggregation = aggregation;
        }
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class And {
    constructor(public and: Filter) {
        this.and = this.and.filter(
            (e) =>
                (e instanceof Expression && e.value !== null) ||
                e instanceof Or ||
                e instanceof TemporalQueryNode
        );
    }
}

// tslint:disable-next-line:max-classes-per-file
export class Or {
    constructor(public or: Filter) {
        this.or = this.or.filter(
            (e) =>
                (e instanceof Expression && e.value !== null) ||
                e instanceof And ||
                e instanceof TemporalQueryNode
        );
    }
}

// tslint:disable-next-line:max-classes-per-file
export class Expression {
    public path: string;
    public type: string;
    public this: string;
    public other: string;
    public isValid: Boolean;

    constructor(public op: string, public value: string) {
        this.isValid = this.op === "invalid_op" ? false : true;
    }

    public withType(type: string) {
        this.type = type;
        return this;
    }

    public withPath(path: string) {
        this.path = path;
        return this;
    }

    public withThis(_this: string) {
        this.this = _this;
        return this;
    }

    public withOther(_other: string) {
        this.other = _other;
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class TemporalQueryNode {
    constructor(
        public value: string,
        public filter: TemporalQueryExpression[]
    ) {}
}

// tslint:disable-next-line:max-classes-per-file
export class TemporalQueryExpression {
    constructor(public and: Expression[]) {}
}

export type Filter = (
    | Expression
    | And
    | Or
    | TemporalQueryNode
)[];
