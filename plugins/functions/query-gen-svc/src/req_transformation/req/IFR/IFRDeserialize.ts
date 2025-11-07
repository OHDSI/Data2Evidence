import * as Keys from "../../keys";
import { FastUtil } from "../../fast_util";

export interface ISerializable<T> {
    deserialize(input: Object): T;
}

export class ConfigMetadata implements ISerializable<ConfigMetadata> {
    public configVersion: string;
    public configId: string;

    public deserialize(input) {
        this.configVersion = input.configVersion;
        this.configId = input.configId;
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class Successor implements ISerializable<Successor> {
    public id: string;
    public minDaysBetween: string;
    public maxDaysBetween: string;

    public deserialize(input) {
        this.id = input.id;
        this.minDaysBetween = input.minDaysBetween;
        this.maxDaysBetween = input.maxDaysBetween;
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class Axis implements ISerializable<Axis> {
    public instanceID: string;
    public configPath: string;
    public id: string;
    public axis: string;
    public seq: number;
    public binsize: number;
    public aggregation: string;
    public order: string;
    // indicates if axis path has an associated filtercard constraint
    public isFiltercard: boolean;

    public deserialize(input) {
        this.instanceID = input.instanceID;
        this.configPath = input.configPath;
        this.id = input.id;
        this.axis = input.axis;
        this.seq = input.seq;
        if (input.aggregation) {
            this.aggregation = FastUtil.toAggregateFunction(input.aggregation);
        }
        if (input.binsize) {
            this.binsize = input.binsize;
        }
        if (input.order) {
            this.order = input.order === "D" ? "DESC" : "ASC";
        }
        if (typeof input.isFiltercard !== Keys.TERM_UNDEFINED) {
            this.isFiltercard = input.isFiltercard;
        }
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class ParentInteraction implements ISerializable<ParentInteraction> {
    public id: string;

    public deserialize(input) {
        this.id = input;
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class TemporalQuery implements ISerializable<TemporalQuery> {
    public request: any[];

    public deserialize(input) {
        this.request = input.request;
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class Attribute implements ISerializable<Attribute> {
    public _configPath: string;
    public _instanceID: string;
    public _constraints: (Expression | And)[];

    public deserialize(input) {
        this._configPath = input._configPath;
        this._instanceID = input._instanceID;
        if (input._constraints) {
            this._constraints = (input._constraints.content ? input._constraints.content as any[] : [])
                .map((e) => e.content ? new And().deserialize(e) : new Expression().deserialize(e));
        }
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class And implements ISerializable<And> {
    public _constraints: Expression[];

    public deserialize(input) {
        this._constraints = (input.content as any[]).map((e) => new Expression().deserialize(e));
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class Or implements ISerializable<Or> {
    public _constraints: Expression[];

    public deserialize(input) {
        this._constraints = (input.content as any[]).map((e) => new Expression().deserialize(e));
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class Expression implements ISerializable<Expression> {
    public _operator: string;
    public _value: string;

    public deserialize(input) {
        this._operator = input._operator;
        this._value = input._value;
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class FilterCard implements ISerializable<FilterCard> {
    public _configPath: string;
    public _instanceNumber: number;
    public _instanceID: string;
    public _name: string;
    public _successor: Successor;
    public _parentInteraction: ParentInteraction;
    public _advanceTimeFilter: TemporalQuery;
    public _attributes: Attribute[];
    public _inactive: boolean;
    public _isMatchAny: boolean;
    public _isEntry: boolean;
    public _isExit: boolean;


    public deserialize(input, isMatchAny: boolean = false) {
        this._configPath = input._configPath;
        this._instanceNumber = input._instanceNumber;
        this._instanceID = input._instanceID;
        this._name = input._name;
        this._configPath = input._configPath;
        this._isMatchAny = isMatchAny;
        this._isEntry = input._isEntry;
        this._isExit = input._isExit;
        if (input._successor) {
            this._successor = new Successor().deserialize(input._successor);
        }
        if (input._parentInteraction) {
            this._parentInteraction = new ParentInteraction().deserialize(input._parentInteraction);
        }
        if (input._advanceTimeFilter) {
            this._advanceTimeFilter = new TemporalQuery().deserialize(input._advanceTimeFilter);
        }
        if (input._attributes) {
            this._attributes = (input._attributes.content as any[]).map((e) => new Attribute().deserialize(e));
        }
        return this;
    }
}

// tslint:disable-next-line:max-classes-per-file
export class ExcludeFilterCard extends FilterCard implements ISerializable<ExcludeFilterCard> {
}

// tslint:disable-next-line:max-classes-per-file
export class IFRFilter implements ISerializable<IFRFilter> {
    public configMetadata: ConfigMetadata;
    public matchAll: FilterCard[] = [];
    public matchAny: FilterCard[][] = [];
    public axes: Axis[];
    public options: any;
    private reqProp: string[] = ["configData", "cards"];

    public deserialize(input) {
        this.reqProp.forEach((e) => {
            if (typeof input[e] === Keys.TERM_UNDEFINED) {
                throw new Error(`[IFRDeserialize] Missing ${e} property in IFR request`);
            }
        });
        this.configMetadata = new ConfigMetadata().deserialize(input.configData);
        this.axes = (input.axes as any[]).map((e) => new Axis().deserialize(e));
        input.cards.content.forEach((element) => {
            if ( element.content.length ) {
                this.matchAny.push(
                    (element.content as any[]).map((e) =>
                        e.content ? new ExcludeFilterCard().deserialize(e.content[0], true) : new FilterCard().deserialize(e, true)),
                );
            }
        });

        this.options = Object.keys(input).filter((e) => this.reqProp.indexOf(e) < 0)
            .reduce((options, prop) => {
                options[prop] = input[prop];
                return options;
            }, {});
        return this;
    }
}

