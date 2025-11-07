import { Node } from "./Node";
import { Operand, OperandFactory } from "./OperandFactory";
import { FastUtil } from "../fast_util";
import * as Keys from "../keys";

export class SuchThat extends Operand {
    constructor(alias: string, attributeFilter: any) {
        super(FastUtil.getConjunctiveOperators(attributeFilter.filter.length));
        this.operand = [];
        this.build(attributeFilter.path, attributeFilter.pathId, alias, attributeFilter.filter, attributeFilter.value, attributeFilter.axis);
    }

    addOperand(op: Operand) {
        this.operand.push(op);
    }

    private build(path: string, pathId: string, alias: string, list: any[], value: string, axis: string) {
        if (path === "_tempQ") {
            if (list.length === 1 && list[0].and) {
                this.operand = list[0].and.map((f) => {
                    return f.or ?
                        new Operand(Keys.SQLTERM_CAMEL_CONJUNCTIVE_OR, ...f.or.map((g) => {
                            return new Operand(g.filter.length > 1 ? Keys.SQLTERM_CAMEL_CONJUNCTIVE_AND : Keys.SQLTERM_INEQUALITY_EQUAL,
                                                ...g.filter.map((h) => {
                                return OperandFactory.createOperand(path, pathId, alias, h, g.value, typeof axis !== Keys.TERM_UNDEFINED);
                            }));
                        })) :
                        (f.filter.length > 1 ?
                            new Operand(f.filter.length > 1 ? Keys.SQLTERM_CAMEL_CONJUNCTIVE_AND : Keys.SQLTERM_INEQUALITY_EQUAL, ...f.filter.map((g) => {
                                return OperandFactory.createOperand(path, pathId, alias, g, f.value, typeof axis !== Keys.TERM_UNDEFINED);
                            })) :
                            OperandFactory.createOperand(path, pathId, alias, f.filter[0], f.value, typeof axis !== Keys.TERM_UNDEFINED)
                        );
                });
                if (this.operand.length === 1) {
                    this.type = this.operand[0].getType();
                    this.operand = (this.operand[0] as Operand).getOperand();
                }
                else if (this.operand.length > 1) {
                    this.type = Keys.SQLTERM_CAMEL_CONJUNCTIVE_AND;
                }
            }
        } else if (path === Keys.MRITERM_JOINQUERY) {
            this.operand = list.map((filterNode) => {
                return new Operand(Keys.SQLTERM_CAMEL_CONJUNCTIVE_AND,
                     OperandFactory.createOperand(null, null, filterNode.value, filterNode.type)
                )
            })
        } else {
            list.forEach((e) => {
                this.addOperand(OperandFactory.createOperand(path, pathId, alias, e, value, typeof axis !== Keys.TERM_UNDEFINED));
            });
        }
    }

    print(): any {
        return FastUtil.printOperand(this);
    }

    getScopes(): string[] {
        let ar: string[] = [];
        this.operand.map((x) => x.getScopes()).forEach((arr) => {
            arr.forEach((element) => { if (ar.indexOf(element) < 0) {ar.push(element); } });
        });
        return ar;
    }
}
