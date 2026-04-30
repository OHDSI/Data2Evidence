import { Operand, OperandFactory } from "./OperandFactory";
import { FastUtil } from "../fast_util";

export class Having extends Operand {
    constructor(path: string, alias: string, filter: any[], pathId: string) {
        super(FastUtil.getConjunctiveOperators(filter.length));
        this.build(path, pathId, alias, filter);
    }

    private build(path: string, pathId: string, alias: string, filter: any[]) {
        filter.forEach((f) => this.addOperand(OperandFactory.createOperand(path, pathId, alias, f)));
    }

    print() {
        return FastUtil.printOperand(this);
    }
}
