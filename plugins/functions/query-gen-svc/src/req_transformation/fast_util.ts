import { Node } from "./def/Node";
import { ICloneable, ParserContainer } from "./def/ParserContainer";
import {
    Operand,
    RangeOperand,
    DurationOperand,
    BaseOperandExpression,
} from "./def/OperandFactory";
import * as Keys from "./keys";
import { Query } from "./def/Query";
import { uniqueSeparatorString } from "@alp/alp-base-utils";

export class FastUtil {
    static getOperandType(attributeName: string, operandPair: any): string {
        if (operandPair.hasOwnProperty("type") && operandPair.type) {
            return operandPair.type.toString();
        }
        if (
            attributeName === "_absTime" &&
            !operandPair.hasOwnProperty("and")
        ) {
            return Keys.TERM_OPERANDTYPE_ABSTIME;
        }
        if (operandPair.hasOwnProperty("and")) {
            return Keys.TERM_OPERANDTYPE_RANGE;
        } else if (this.isDurationBetweenAttr(attributeName)) {
            return Keys.TERM_OPERANDTYPE_DURATIONBETWEEN;
        } else if (
            operandPair.hasOwnProperty("op") &&
            operandPair.hasOwnProperty("value")
        ) {
            return Keys.TERM_OPERANDTYPE_LITERAL;
        }

        return Keys.TERM_OPERANDTYPE_EXPRESSION;
    }

    static isDurationBetweenAttr(attributeName): boolean {
        let attrName = ["_succ", "_tempQ"];

        return attrName.indexOf(attributeName) === -1 ? false : true;
    }

    static getConjunctiveOperators(
        count: number,
        isBaseOperand: boolean = true
    ) {
        return count > 1
            ? isBaseOperand
                ? Keys.SQLTERM_CAMEL_CONJUNCTIVE_OR
                : Keys.SQLTERM_CAMEL_CONJUNCTIVE_AND
            : Keys.SQLTERM_INEQUALITY_EQUAL;
    }

    static printOperand(x: Operand): any {
        let operand = x.getOperand();
        let type = x.getType();

        function printAll() {
            return { type, operand: operand.map((x) => x.print()) };
        }

        return x instanceof RangeOperand || x instanceof DurationOperand
            ? printAll()
            : operand.length > 1
            ? printAll()
            : operand.length === 1
            ? operand[0].print()
            : null;
    }

    static print(x: any) {
        let out: any = {};
        Object.keys(x).forEach((e) => {
            if (this.isPrimitive(x[e])) {
                out[e.toString().replace("__", "")] = x[e];
            } else if (x[e] instanceof Array) {
                out[e.toString().replace("__", "")] = x[e].map((y) =>
                    y.print()
                );
            } else if (x[e] instanceof Node) {
                out[e.toString().replace("__", "")] = x[e].print();
            }
        });
        return out;
    }

    static toEnglishLiteral(op) {
        switch (op.trim()) {
            case Keys.SQLTERM_INEQUALITY_SYMBOL_EQUAL:
                return Keys.SQLTERM_INEQUALITY_EQUAL;
            case Keys.SQLTERM_INEQUALITY_SYMBOL_LESSOREQUAL:
                return Keys.SQLTERM_INEQUALITY_LESSOREQUAL;
            case Keys.SQLTERM_INEQUALITY_SYMBOL_LESS:
                return Keys.SQLTERM_INEQUALITY_LESS;
            case Keys.SQLTERM_INEQUALITY_SYMBOL_GREATER:
                return Keys.SQLTERM_INEQUALITY_GREATER;
            case Keys.SQLTERM_INEQUALITY_SYMBOL_GREATEROREQUAL:
                return Keys.SQLTERM_INEQUALITY_GREATEROREQUAL;
            case Keys.SQLTERM_INEQUALITY_SYMBOL_NOTEQUAL:
                return Keys.SQLTERM_INEQUALITY_NOTEQUAL;
            default:
                return op;
        }
    }

    static toAggregateFunction(
        aggregation: string,
        placeholder: string = "%Q"
    ): string {
        if (aggregation === undefined) {
            throw new Error("No aggregation type given!");
        }

        let availableAggregates = {
            countDistinct: "COUNT(DISTINCT(?))",
            count: "COUNT(?)",
            avg: "AVG(?)",
            max: "MAX(?)",
            min: "MIN(?)",
            string_agg: "STRING_AGG(?,'" + uniqueSeparatorString + "')",
            none: "?",
        };

        if (aggregation === undefined) {
            throw new Error("No aggregation type given!");
        }
        if (!availableAggregates.hasOwnProperty(aggregation)) {
            throw new Error("Unknown aggregation type given: " + aggregation);
        }
        let aggregationExpr = availableAggregates[aggregation].replace(
            "?",
            placeholder
        );

        return aggregationExpr;
    }

    static toAbsTimeLiteral(op) {
        switch (op.trim()) {
            case Keys.SQLTERM_INEQUALITY_SYMBOL_LESSOREQUAL:
                return Keys.TERM_LOWER_START;
            case Keys.SQLTERM_INEQUALITY_SYMBOL_GREATEROREQUAL:
                return Keys.TERM_LOWER_END;
            default:
                return op;
        }
    }

    static isNumber(x): boolean {
        return x.match(/^\d+$/g);
    }

    static tokenizeAndJoin(
        str: string,
        delimiter: string,
        joinLastXTokens: number
    ) {
        let tokens = str.split(delimiter);
        let out = "";

        for (let i = tokens.length - 1; i >= 0 && joinLastXTokens > 0; i--) {
            out = tokens[i] + out;
            --joinLastXTokens;
        }

        return out;
    }

    static getId(
        param: string[],
        isTemplateId: boolean = false,
        isAttr: boolean = false
    ): string {
        let delimiter = isTemplateId ? "-" : ".";
        let tId = param[0];

        for (let i = 1; i < param.length; i++) {
            if (param[i].match(/^\d+$/g)) {
                if (isAttr) {
                    continue;
                }
                if (!isTemplateId) {
                    tId += delimiter + param[i];
                    break;
                }
                break;
            }

            tId += delimiter + param[i];
        }

        return tId;
    }

    static getIndex(param: string[]) {
        for (let i = 0; i < param.length; i++) {
            if (param[i].match(/^\d+$/g)) {
                return param[i];
            }
        }
    }

    static find(x: any[], y: string) {
        let found = [];

        x.forEach((z) => {
            if (z.hasOwnProperty(y)) {
                found.push(z);
            }
        });

        return found;
    }

    static trim(x: any) {
        try {
            if (x instanceof Object) {
                Object.keys(x).forEach((y) => {
                    if (this.isPrimitive(x[y])) {
                        return;
                    }
                    if (!x[y] || Object.keys(x[y]).length === 0) {
                        delete x[y];
                    } else {
                        this.trim(x[y]);
                    }
                });
            } else if (x instanceof Array) {
                x.forEach((y) => this.trim(y));
            }
        } catch (e) {
            throw e;
        }
    }

    static isPrimitive(x: any) {
        return typeof x === "string" ||
            typeof x === "number" ||
            typeof x === "boolean"
            ? true
            : false;
    }

    static isUnion(x: ParserContainer[]) {
        let count = 0;
        x.forEach((y) => {
            if (y.context === Keys.CQLTERM_CONTEXT_PATIENT) {
                ++count;
            }
        });

        return count > 1 ? true : false;
    }

    static replace(
        x: ParserContainer,
        destination: string,
        source?: string,
        value?: string
    ) {
        for (let prop in x) {
            if (x[prop] instanceof Array) {
                x[prop].forEach((y) => {
                    if (!this.isPrimitive(y)) {
                        if (
                            source &&
                            typeof y[source] !== Keys.TERM_UNDEFINED
                        ) {
                            y[destination] = y[source];
                        } else if (value) {
                            y[destination] = value;
                        }
                    }
                });
            } else if (!this.isPrimitive(x[prop])) {
                if (
                    source &&
                    typeof x[prop][destination] !== Keys.TERM_UNDEFINED &&
                    typeof x[prop][source] !== Keys.TERM_UNDEFINED
                ) {
                    x[prop][destination] = x[prop][source];
                } else if (
                    value &&
                    typeof x[prop][destination] !== Keys.TERM_UNDEFINED
                ) {
                    x[prop][destination] = value;
                }
            }
        }
    }

    static convertTemplateId(x: ParserContainer) {
        for (let prop in x) {
            if (x[prop] instanceof Array) {
                x[prop].forEach((y) => {
                    if (typeof y.templateId !== Keys.TERM_UNDEFINED) {
                        y.templateId = this.getId(
                            y.templateId.split(Keys.TERM_DELIMITER_PRD),
                            true,
                            true
                        );
                    }
                });
            } else if (!this.isPrimitive(x[prop])) {
                if (typeof x[prop].templateId !== Keys.TERM_UNDEFINED) {
                    x[prop].templateId = this.getId(
                        x[prop].templateId.split(Keys.TERM_DELIMITER_PRD),
                        true,
                        true
                    );
                }
            }
        }
    }

    static addTemplateId(x: Query) {
        let that = this;
        function traverse(e: any) {
            if (e instanceof BaseOperandExpression) {
                e.setAttribute(
                    "templateId",
                    that.getId(
                        e
                            .getAlias()
                            .replace(/\./g, Keys.TERM_DELIMITER_DASH)
                            .split(Keys.TERM_DELIMITER_DASH),
                        true,
                        true
                    )
                );
            } else if (e instanceof Array) {
                e.forEach((x) => traverse(x));
            } else if (e instanceof Object) {
                for (let y in e) {
                    traverse(e[y]);
                }
            } else {
                return;
            }
        }
        traverse(x.getGroupBy());
        traverse(x.getMeasure());
        traverse(x.getHaving());
        traverse(x.getOrderBy());
    }

    static deepClone(x: Object): Object {
        return JSON.parse(JSON.stringify(x));
    }

    static typedDeepClone<T>(x: ICloneable<T>): T {
        return x.clone();
    }
}
