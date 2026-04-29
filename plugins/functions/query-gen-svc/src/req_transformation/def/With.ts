import { Node } from "./Node";
import { Operand, DataModelTypeExpression } from "./OperandFactory";
import { SuchThat } from "./SuchThat";
import { FastUtil } from "../fast_util";
import * as Keys from "../keys";

export class With extends Operand {
    protected operand: SuchThat[];
    protected dependentAlias: string[];
    constructor(alias: string, relList: any[]) {
        super(FastUtil.getConjunctiveOperators(FastUtil.find(relList, Keys.MRITERM_FILTER).length, false));
        this.operand = [];
        this.build(alias, relList);
        this.dependentAlias = [];
        this.operand.map((x) => x.getScopes()).forEach((arr) => {
            arr.forEach((element) => { if (this.dependentAlias.indexOf(element) < 0 && alias !== element) {this.dependentAlias.push(element); } });
        });
    }

    addSuchThatCondition(suchThatCondition: SuchThat) {
        this.operand.push(suchThatCondition);
    }

    isDependentOn(alias: string): boolean {
        return (this.dependentAlias.indexOf(alias) >= 0);
    }

    getDependency(): string[] {
        return this.dependentAlias;
    }

    private build(alias: string, relList: any[]) {
        relList.forEach((r) => {
            if (r.filter && r.filter.length > 0) {
                this.addSuchThatCondition(new SuchThat(alias, r));
            }
        });
    }

    print(): any {
        return FastUtil.printOperand(this);
    }
}
