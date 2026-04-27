import { FastUtil } from "../fast_util";
import { Node } from "./Node";
import { Operand, OperandFactory } from "./OperandFactory";

export class Where extends Operand {
    constructor(path: string, alias: string, filter: any[], pathId: string) {
        super(FastUtil.getConjunctiveOperators(filter.length));
        this.operand = [];
        this.build(path, pathId, alias, filter);
    }

    addOperand(op: Operand) {
        this.operand.push(op);
    }

    private build(path: string, pathId: string, alias: string, filter: any[]) {
        filter.forEach((f) => this.addOperand(OperandFactory.createOperand(path, pathId, alias, f)));
    }

    print() {
        return FastUtil.printOperand(this);
    }
}
