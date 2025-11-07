import { Node } from "./Node";
import { With } from "./With";
import { Where } from "./Where";
import { DataModelTypeExpression, BaseOperandExpressionRef } from "./OperandFactory";
import { FastUtil } from "../fast_util";

export class Relationship extends Node {
    private __alias: string;
    private __type: string;
    private __expression: DataModelTypeExpression | BaseOperandExpressionRef;
    private __with: With;
    private __join: any[];
    private __joinUsingConditionId: boolean;

    constructor(alias: string, type: string, expression: DataModelTypeExpression | BaseOperandExpressionRef, relList: any[], join?: any[], __joinUsingConditionId?: boolean) {
        super();
        this.__alias = alias;
        this.__type = type;
        this.__expression = expression;
        this.__with = new With(alias, relList); //attributeList
        if (join) {join.forEach((e) => this.addJoinOn(new Where(e.path, e.alias, e.filter, e.pathId))); }
        this.__joinUsingConditionId = __joinUsingConditionId;
    }

    public isDependentOn(r: Relationship) {
        return this.__with.isDependentOn(r.getAlias());
    }

    public getDependency(): string[] {
        //Dependency only matters for Exclude Relationship
        if (this.getType() === "Without") {
            return this.__with.getDependency();
        } else {
            return [];
        }

    }

    public getAlias() {
        return this.__alias;
    }

    public getType() {
        return this.__type;
    }


    private addJoinOn(join: Where) {
        if (this.__join == null) {this.__join = []; }
        this.__join.push(join);
    }

    public print() {
        return {
            alias: this.__alias,
            type: this.__type,
            expression: this.__expression.print(),
            suchThat: this.__with.print(),
            joinUsingConditionId: this.__joinUsingConditionId,
            joinOn: this.__join ? (this.__join.length > 1 ?
                { type: FastUtil.getConjunctiveOperators(this.__join.length, false), operand: this.__join.map((x) => x.print()) } :
                (this.__join.length === 1 ? this.__join[0].print() : null)) : this.__join,
        };
    }
}
