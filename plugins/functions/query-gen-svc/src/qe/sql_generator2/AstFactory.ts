import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { AstElement } from "./AstElement";
import { With } from "./With";
import { Property } from "./Property";
import { Query } from "./Query";
import { Def } from "./Def";
import { Retrieve } from "./Retrieve";
import { ExpressionRef } from "./ExpressionRef";
import { Source } from "./Source";
import { Statement } from "./Statement";
import { Literal } from "./Literal";
import { Aggregation } from "./Aggregation";
import { Operator } from "./Operator";

export function getAstFactory(config): AstFactory {
    AstElement.__astFactory = new AstFactory(config);
    return AstElement.__astFactory;
}

export class AstFactory {
    private classmap = {
        statement: (x, y, z, w) => new Statement(x, y, z, w),
        def: (x, y, z, w) => new Def(x, y, z, w),
        Literal: (x, y, z, w) => new Literal(x, y, z, w),
        Property: (x, y, z, w) => new Property(x, y, z, w),
        With: (x, y, z, w) => new With(x, y, z, w),
        Without: (x, y, z, w) => new With(x, y, z, w),
        LeftJoin: (x, y, z, w) => new With(x, y, z, w),
        Retrieve: (x, y, z, w) => new Retrieve(x, y, z, w),
        source: (x, y, z, w) => new Source(x, y, z, w),
        Query: (x, y, z, w) => new Query(x, y, z, w),
        //suchThat: (x, y, z, w) => new SuchThat(x, y, z, w),
        ExpressionRef: (x, y, z, w) => new ExpressionRef(x, y, z, w),
        Greater: (x, y, z, w) => new Operator(x, y, z, w, " > "),
        GreaterOrEqual: (x, y, z, w) => new Operator(x, y, z, w, " >= "),
        Less: (x, y, z, w) => new Operator(x, y, z, w, " < "),
        LessOrEqual: (x, y, z, w) => new Operator(x, y, z, w, " <= "),
        Equal: (x, y, z, w) => new Operator(x, y, z, w, " = "),
        NotEqual: (x, y, z, w) => new Operator(x, y, z, w, " != "),
        DurationBetween: (x, y, z, w) =>
            new Operator(x, y, z, w, " DAYS_BETWEEN "),
        Or: (x, y, z, w) => new Operator(x, y, z, w, " OR "),
        IsNotNull: (x, y, z, w) => new Operator(x, y, z, w, " IS NOT NULL "),
        IsNull: (x, y, z, w) => new Operator(x, y, z, w, " IS NULL "),
        And: (x, y, z, w) => new Operator(x, y, z, w, " AND "),
        AggregateExpression: (x, y, z, w) => new Aggregation(x, y, z, w),
        start: (x, y, z, w) => new Operator(x, y, z, w, ""),
        end: (x, y, z, w) => new Operator(x, y, z, w, ""),
        Union: (x, y, z, w) => new Operator(x, y, z, w, " UNION "),
        SXor: (x, y, z, w) => new Operator(x, y, z, w, " FULL OUTER JOIN "),
        contains: (x, y, z, w) => new Operator(x, y, z, w, " CONTAINS "),
    };

    constructor(config) {
        AstElement.__config = config;
    }

    public astElementFactory(node, path, name, parent: AstElement): AstElement {
        if (!node) {
            return null;
        }
        let nodetype = this.getType(node, path, name);
        if (nodetype in this.classmap) {
            let instance = this.classmap[nodetype](node, path, name, parent);
            return instance;
        } else {
            return new AstElement(node, path, name, parent);
        }
    }

    private getType(node, path, name) {
        if ("type" in node) {
            return node.type;
        }
        return name;
    }
}
