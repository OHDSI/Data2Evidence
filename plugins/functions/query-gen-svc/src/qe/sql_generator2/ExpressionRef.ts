import { AstElement } from "./AstElement";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { sqlFormat } from "@alp/alp-base-utils";
import { Def } from "./Def";
import { Statement } from "./Statement";


export class ExpressionRef extends AstElement {

    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);
    }


    public getScopeConfigAndAliasEntityMapping() {
        if (
            (this.parent.getType() === "With" ||
            this.parent.getType() === "Without" ||
            this.parent.getType() === "LeftJoin") 
        ) {
            this.parent.addTableAlias({ baseEntity: "@EXPRESSIONREF", table: this.node.name }, true)
        }
    }

    public resolveDefChild(cur_parent): Def {
        if (cur_parent.parent === null) {
            return null;
        } else if (cur_parent.parent.name === "def") {
            return cur_parent;
        } else {
            return this.resolveDefChild(cur_parent.parent);
        }
    }

    public beforeVisit() {
        let referedDef = this.node.name;
        let statement = <Statement>(
            this.resolveStatementChild(this.parent).parent
        );

        if (statement != null) {
            statement.addContextDep(this.getID());
        }
    }

    public getSQL(format: number = sqlFormat.TEMP_RESULTSET) {
        switch (format) {
            case sqlFormat.ANONYMOUS_BLOCK:
                return QueryObject.format(
                    " :%UNSAFE %UNSAFE ",
                    this.node.name,
                    this.node.name
                );
            case sqlFormat.NESTED:
                let statement = (<Statement>(
                    this.resolveStatementChild(this.parent)
                )).parent
                    .getContextDep(this.node.name)
                    .getSQL(format);

                if (
                    this.name === "operand" &&
                    this.parent.op.trim() === "UNION"
                ) {
                    return QueryObject.format(" %Q ", statement);
                } else {
                    return QueryObject.format(
                        " (%Q) %UNSAFE ",
                        statement,
                        this.node.name
                    );
                }
            case sqlFormat.TEMP_RESULTSET:
            default:
                return QueryObject.format(" %UNSAFE ", this.node.name);
        }
    }
}
