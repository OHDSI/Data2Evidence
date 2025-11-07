import { Node } from "./Node";
import { Source } from "./Source";
import { Relationship } from "./Relationship";
import { Where } from "./Where";
import { GroupBy } from "./GroupBy";
import { OrderBy } from "./OrderBy";
import { Measure } from "./Measure";
import { Having } from "./Having";
import { Expression } from "./Expression";
import { ParserContainer } from "./ParserContainer";
import { DataModelTypeExpression } from "./OperandFactory";
import { FastUtil } from "../fast_util";
import * as Keys from "../keys";

export class Query extends Expression {
    private __relationship: Relationship[] = [];
    private __where: Where[] = [];
    private __groupBy: GroupBy[] = [];
    private __orderBy: OrderBy[] = [];
    private __measure: Measure[] = [];
    private __having: Having[] = [];
    private __request: ParserContainer;

    constructor(request: ParserContainer, action: string, type: string, source: Source) {
        super(type, action, [source]);
        this.__request = request;
        this.build();
    }

    addRelationship(rel: Relationship) {
        this.__relationship.push(rel);
    }

    insertRelationship(rel: Relationship) {
        this.__relationship.unshift(rel);
    }

    addGroupBy(grpBy: GroupBy) {
        this.__groupBy.push(grpBy);
    }

    addMeasure(mse: Measure) {
        this.__measure.push(mse);
    }

    addWhere(whr: Where) {
        this.__where.push(whr);
    }

    addHaving(hving: Having) {
        this.__having.push(hving);
    }

    addOrderBy(ob: OrderBy) {
        this.__orderBy.push(ob);
    }

    getRelationship(): Relationship[] { return this.__relationship; }

    getWhere(): Where[] { return this.__where; }

    getGroupBy(): GroupBy[] { return this.__groupBy; }

    getOrderBy(): OrderBy[] { return this.__orderBy; }

    getMeasure(): Measure[] { return this.__measure; }

    getHaving(): Having[] { return this.__having; }

    getRequest(): ParserContainer { return this.__request; }

    protected build() {
        this.buildRelationship();
        this.buildGroupBy();
        this.buildMeasure();
        this.buildWhere();
        this.buildHaving();
        this.buildOrderBy();
    }

    private buildRelationship() {

        for (let interaction in this.__request.filter) {
            this.__request.filter[interaction].forEach((e) => {
                let relType = Keys.CQLTERM_WITH;
                if (typeof (e.isExclude) !== Keys.TERM_UNDEFINED) {relType = Keys.CQLTERM_WITHOUT; }
                else if (typeof (e.isLeftJoin) !== Keys.TERM_UNDEFINED && e.isLeftJoin) {relType = Keys.CQLTERM_LEFTJOIN; }

                this.addRelationship(
                    new Relationship(e.alias,
                        relType,
                        new DataModelTypeExpression(e.dataType, e.templateId, Keys.CQLTERM_RETRIEVE),
                        e.attributeList,
                        e.join,
                        e.joinUsingConditionId));
            });
        }

        //TopoSort
        let sorter = [];
        let addedAlias = [];
        let elementAdded = true;
        let relationships = this.__relationship;
        let that = this;
        while (relationships.length > 0 && elementAdded) {
            let idxToDelete = [];
            elementAdded = false;
            for (let i = 0; i < relationships.length; i++) {
                let addElement = true;
                let requiredAlias = relationships[i].getDependency();
                for (let ii = 0; ii < requiredAlias.length; ii++) {
                    if (addedAlias.indexOf(requiredAlias[ii]) < 0) { addElement = false; break; }
                }
                if (addElement) {
                    elementAdded = true;
                    idxToDelete.push(i);
                    sorter.push(relationships[i]);
                    addedAlias.push(relationships[i].getAlias());
                }
            }
            for (let i = idxToDelete.length - 1; i >= 0; i--) {
                relationships.splice(idxToDelete[i], 1);
            }
        }
        if (elementAdded) {
            this.__relationship = sorter;
        } else {
            throw new Error("[FAST] Circular query dependency detected");
        }
    }

    private buildGroupBy() {

        let withoutAlias = [];
        for (let i = 0; i < this.__relationship.length; i++) {
            if (this.__relationship[i].getType() === "Without") {
                withoutAlias.push(this.__relationship[i].getAlias());
            }
        }

        this.__request.groupBy.forEach((e) => {
            let grpBy = new GroupBy(Keys.CQLTERM_PROPERTY, e.path, e.alias, e.pathId, e.axis);
            if (withoutAlias.indexOf(e.alias) >= 0) {
                throw new Error("[FAST] Group By Should not come from an Excluded Relationship");
            }
            if (e.binsize) {
                grpBy.setAttribute("binsize", e.binsize);
            }
            if (e.aggregation) {
                grpBy.setAttribute("aggregation", e.aggregation);
            }
            this.addGroupBy(grpBy);
        });
    }

    private buildMeasure() {
        this.__request.measure.forEach((e) => {
            let mse = new Measure(Keys.CQLTERM_PROPERTY, e.path, e.alias, e.pathId, e.expression);
            if (e.aggregation) {
                mse.setAttribute("aggregation", e.aggregation);
            }
            this.addMeasure(mse);
        });
    }

    private buildWhere() {
        this.__request.where.forEach((e) => this.addWhere(new Where(e.path, e.alias, e.filter, e.pathId)));

    }

    private buildHaving() {
        this.__request.having.forEach((e) => this.addHaving(new Having(e.path, e.alias, e.filter, e.pathId)));
    }

    private buildOrderBy() {
        this.__request.orderBy.forEach((e) => {
            // Dont build orderBy if alias is PEE
            if (e.alias === "PEE") {
                return;
            }
            let order = new OrderBy(Keys.CQLTERM_PROPERTY, e.path, e.alias, e.pathId, e.axis, e.order);
            if (e.aggregation) {
                order.setAttribute("aggregation", e.aggregation);
            }
            this.addOrderBy(order);
        });
    }

    print() {

        let out = {
            type: this.__type,
            actionType: this.__actionType,
            source: this.__source.map((x) => x.print()),
            relationship: this.__relationship.map((x) => x.print()),
            where: this.__where.length > 1 ?
                { type: FastUtil.getConjunctiveOperators(this.__where.length, false), operand: this.__where.map((x) => x.print()) } :
                (this.__where.length === 1 ? this.__where[0].print() : null),
            groupBy: this.__groupBy.map((x) => x.print()),
            measure: this.__measure ? this.__measure.map((x) => x.print()) : [],
            having: this.__having.map((x) => x.print()),
            orderBy: this.__orderBy.map((x) => x.print()),
        };

        if (this.__request.customClauseMap.length > 0) {this.__request.customClauseMap.forEach((x) => { out[x] = this.__request[x]; }); }

        return out;
    }

}
