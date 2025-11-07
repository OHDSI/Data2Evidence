// tslint:disable:max-classes-per-file
import { FastUtil } from "../fast_util";
import { Node } from "./Node";
import * as Keys from "../keys";

export class BaseOperandType extends Node {
    constructor(protected type: string) {
        super();
        this.type = FastUtil.toEnglishLiteral(type);
    }

    setAttribute(attrName: string, value: string) {
        this[attrName] = value;
    }

    getType() {
        return this.type;
    }

    getScopes(): string[] { return []; }
}

export class DataModelTypeExpression extends BaseOperandType {
    constructor(private __dataType: string, private __templateId: string, private __type: string) {
        super(__type);
    }

    getTemplateId(): string { return this.__templateId; }
    getDataType(): string { return this.__dataType; }
}


export class BaseOperandExpression extends BaseOperandType {
    constructor(private __type: string, private __path: string, private __scope: string, private __alias: string, private __axis?: boolean) {
        super(__type);
    }

    getPath(): string { return this.__path; }
    getScope(): string { return this.__scope; }
    getAlias(): string { return this.__alias; }
    getScopes(): string[] { return [this.__scope]; }
}

export class BaseOperandValue extends BaseOperandType {
    constructor(private __type: string, private __valueType: string, private __value: string) {
        super(__type);
    }

    getValueType(): string { return this.__valueType; }
    getValue(): string { return this.__value; }
    getScopes(): string[] { return []; }
}

export class BaseOperandExpressionRef extends BaseOperandType {
    constructor(private __name: string, private __type: string) {
        super(__type);
    }
}


export class Operand extends BaseOperandType {
    protected operand: (BaseOperandType |
        BaseOperandValue |
        BaseOperandExpression |
        BaseOperandExpressionRef |
        BaseDurationBetweenOperand |
        Operand |
        DurationOperand |
        RangeOperand)[] = [];

    constructor(type: string, ...operands: (BaseOperandType |
        BaseOperandValue |
        BaseOperandExpression |
        BaseOperandExpressionRef |
        BaseDurationBetweenOperand |
        Operand |
        DurationOperand |
        RangeOperand)[]) {
        super(type);
        this.operand = operands;
    }

    getOperand(): (BaseOperandType |
        BaseOperandValue |
        BaseOperandExpression |
        BaseOperandExpressionRef |
        BaseDurationBetweenOperand |
        Operand |
        DurationOperand |
        RangeOperand)[] {
        return this.operand;
    }

    addOperand(op: Operand) {
        this.operand.push(op);
    }

    print() {
        return { type: this.type, operand: this.operand.map((x) => x.print()) };
    }

    getScopes(): string[] {
        let ar: string[] = [];
        this.operand.map((x) => x.getScopes()).forEach((arr) => {
            arr.forEach((element) => { if (ar.indexOf(element) < 0) {ar.push(element); } });
        });
        return ar;
    }
}

export class BaseDurationBetweenOperand extends Operand {
    private __precision: string;
    private __type: string;

    constructor(type: string, precision: string, ...operands: BaseOperandType[]) {
        super(type, ...operands);
        this.__precision = precision;
    }
}

export class RangeOperand extends Operand {
    constructor(path: string, pathId: string, alias: string, filter: any, value?: string) {
        super(Keys.SQLTERM_CAMEL_CONJUNCTIVE_AND);
        this.operand = [];
        if (filter.this && filter.other) {
            filter[Keys.SQLTERM_LOWER_CONJUNCTIVE_AND].forEach((e) => {
                e.this = filter.this;
                e.other = filter.other;
            });
        }
        this.build(path, pathId, alias, filter[Keys.SQLTERM_LOWER_CONJUNCTIVE_AND], value);
    }

    addOperand(op: Operand) {
        this.operand.push(op);
    }

    private build(path: string, pathId: string, alias: string, filter: any[], value?: string) {
        filter.forEach((f) => {
            this.addOperand(OperandFactory.createOperand(path, pathId, alias, f, value));
        });
    }

    print() {
        let hasDurationChild = false;

        for (let i = 0; i < this.operand.length; i++) {
            if (this.operand[i] instanceof DurationOperand) {
                hasDurationChild = true;
                break;
            }
        }

        return this.operand.length === 1 ? FastUtil.printOperand(<Operand> this.operand[0]) : FastUtil.printOperand(this);
    }
}

export class DurationOperand extends Operand {
    constructor(path: string, pathId: string, alias: string, filter: any, value: string) {
        super(filter.op);
        this.operand = [];
        this.build(path, pathId, alias, filter, value);
    }

    addOperand(op: BaseDurationBetweenOperand | BaseOperandType) {
        this.operand.push(op);
    }

    private build(path, pathId, alias, filter, value) {
        let tokenizedValue = FastUtil.tokenizeAndJoin(value, ".", 2);

        this.addOperand(new BaseDurationBetweenOperand(Keys.CQLTERM_DURATIONBETWEEN,
            Keys.CQLTERM_DURATIONBETWEEN_PRECISION_DAY,
            new Operand(Keys.TERM_LOWER_START, new BaseOperandExpression(Keys.CQLTERM_PROPERTY,
                                                                        filter.this ? filter.this : Keys.TERM_LOWER_END,
                                                                        alias,
                                                                        pathId + Keys.TERM_DELIMITER_PRD +
                                                                        (filter.this ? filter.this : Keys.TERM_LOWER_START))),
            new Operand(Keys.TERM_LOWER_END, new BaseOperandExpression(Keys.CQLTERM_PROPERTY,
                                                                        filter.other ? filter.other : Keys.TERM_LOWER_START,
                                                                        tokenizedValue,
                                                                        pathId + Keys.TERM_DELIMITER_PRD +
                                                                        (filter.other ? filter.other : Keys.TERM_LOWER_END)))));
        this.addOperand(new BaseOperandValue("Literal", "Integer", filter.value));

    }

    print() {
        return FastUtil.printOperand(this);
    }
}

export class OperandFactory {
    static createCompoundOperand(type: string): Operand {
        return new Operand(type);
    }

    static createOperand(path: string, pathId: string, alias: string, filter: any, value?: string, axis?: boolean): Operand {

        if (filter === undefined) {return null; }

        let operandType = FastUtil.getOperandType(path, filter);
        switch (operandType) {
            case Keys.TERM_OPERANDTYPE_LITERAL:
                if (filter.value === "NoValue") {
                    return new Operand(filter.op === Keys.SQLTERM_INEQUALITY_SYMBOL_EQUAL || filter.op === Keys.SQLTERM_LOWER_INEQUALITY_CONTAINS ? 
                        Keys.SQLTERM_INEQUALITY_ISNULL : Keys.SQLTERM_INEQUALITY_ISNOTNULL,
                        new BaseOperandExpression(Keys.CQLTERM_PROPERTY, path, alias, pathId, axis));
                }
                return new Operand(filter.op,
                                   new BaseOperandExpression(Keys.CQLTERM_PROPERTY, path, alias, pathId, axis),
                                   new BaseOperandValue(Keys.CQLTERM_LITERAL, Keys.CQLTERM_DATATYPES_STRING, filter.value));
            case Keys.TERM_OPERANDTYPE_SQLFUNCTION:
                return new Operand(filter.op,
                                   new BaseOperandExpression(Keys.CQLTERM_PROPERTY, path, alias, pathId, axis),
                                   new BaseOperandValue(Keys.CQLTERM_LITERAL, Keys.CQLTERM_DATATYPES_SQL_FUNCTION, filter.value));
            case Keys.TERM_OPERANDTYPE_EXPRESSION:
                if (!pathId && !path) { //The attribute is the default joining key derieved in the next steps
                    return new Operand(filter.op,
                        new BaseOperandExpression(filter.type, path, alias, alias))
                }
                return new Operand(filter.op,
                                    new BaseOperandExpression(Keys.CQLTERM_PROPERTY, path, alias, pathId, axis),
                                    new BaseOperandExpression(Keys.CQLTERM_PROPERTY, filter.path ? filter.path : path, filter.value, pathId));
            case Keys.TERM_OPERANDTYPE_ABSTIME:
                return new Operand(filter.op,
                                    new BaseOperandExpression(Keys.CQLTERM_PROPERTY, FastUtil.toAbsTimeLiteral(filter.op), alias, pathId, axis),
                                    new BaseOperandValue(Keys.CQLTERM_LITERAL, Keys.CQLTERM_DATATYPES_STRING, filter.value));
            case Keys.TERM_OPERANDTYPE_DURATIONBETWEEN:
                return new DurationOperand(path, pathId, alias, filter, value);
            case Keys.TERM_OPERANDTYPE_RANGE:
                return new RangeOperand(path, pathId, alias, filter, value);
            default:
                return null;
        }
    }
}

