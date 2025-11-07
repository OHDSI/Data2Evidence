import { AstElement } from "./AstElement";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { isPropExists, sqlFormat } from "@alp/alp-base-utils";

export class Def extends AstElement {
    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);

        if (!isPropExists(node, "accessLevel")) {
            throw new Error("[DEF] accessLevel does not exists");
        }
        if (!isPropExists(node, "context")) {
            throw new Error("[DEF] context does not exists");
        }
        if (!isPropExists(node, "expression")) {
            throw new Error("[DEF] expression does not exists");
        }
        if (!isPropExists(node, "name")) {
            throw new Error("[DEF] name does not exists");
        }
    }

    private aliasEntityMap = {};

    public addEntity(alias, entity) {
        this.aliasEntityMap[alias] = entity;
    }

    public getEntity(alias) {
        return this.aliasEntityMap[alias];
    }

    public getContext() {
        return this.node.context;
    }

    getSQL(format: number = sqlFormat.TEMP_RESULTSET) {
        switch (format) {
            case sqlFormat.TEMP_RESULTSET:
                return QueryObject.format(
                    " %UNSAFE AS (%Q) ",
                    this.node.name,
                    this.node.expression.getSQL()
                );
            case sqlFormat.ANONYMOUS_BLOCK:
                return QueryObject.format(
                    " %UNSAFE = (%Q); ",
                    this.node.name,
                    this.node.expression.getSQL()
                );
            case sqlFormat.NESTED:
                return QueryObject.format(
                    "%Q",
                    this.node.expression.getSQL(format)
                );
            default:
                return QueryObject.format(
                    " %UNSAFE AS (%Q) ",
                    this.node.name,
                    this.node.expression.getSQL()
                );
        }
    }

    private dependencies = {};
}
