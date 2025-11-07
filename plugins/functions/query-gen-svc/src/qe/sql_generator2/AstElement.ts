import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { sqlFormat } from "@alp/alp-base-utils";
import { Config } from "../qe_config_interface/Config";

export class AstElement {
    public static __config;
    public static __astFactory;
    public static getConfig(): Config {
        return <Config>this.__config;
    }

    public append: QueryObject | string;
    public appendName: string;
    public into: string;
    public sql: QueryObject;

    private __children;
    private __type = this.getType();
    private __sqlFormat = sqlFormat.TEMP_RESULTSET;

    constructor(
        public node,
        public path: string,
        public name: string,
        public parent: AstElement
    ) {
        this.transformChildren();
    }

    public appendSQL(x: QueryObject | string, y: string) {
        this.append = x;
        this.appendName = y;
    }

    public appendIntoSQL(tableName: string) {
        this.into = tableName;
    }

    public generateSQL() {
        this._generateSQL(sqlFormat.TEMP_RESULTSET);
    }

    public generateSQLAnonymousBlock() {
        this._generateSQL(sqlFormat.ANONYMOUS_BLOCK);
    }

    public generateSQLNested() {
        this._generateSQL(sqlFormat.NESTED);
    }

    public generateSQLCombineCount() {
        this._generateSQL(sqlFormat.COMBINE_COUNT);
    }

    public traverse(
        beforeVisitFunctionName: string,
        afterVisitFunctionName: string,
        format?: number
    ): void {
        this.setSQLFormat(format);
        if (beforeVisitFunctionName) {
            this[beforeVisitFunctionName]();
        }
        this.__children.forEach((x) =>
            x instanceof Array
                ? x.map((y) =>
                      y.traverse(
                          beforeVisitFunctionName,
                          afterVisitFunctionName,
                          format
                      )
                  )
                : x.traverse(
                      beforeVisitFunctionName,
                      afterVisitFunctionName,
                      format
                  )
        );
        if (afterVisitFunctionName) {
            this[afterVisitFunctionName]();
        }
    }

    public getChildren(): any {
        return this.__children;
    }

    protected getScopeConfigAndAliasEntityMapping() {
        // doStuff();
    }
    protected getAttributeConfig() {
        // doStuff();
    }

    protected resolveDefChild(cur_parent: AstElement): AstElement {
        if (cur_parent.parent === null) {
            return null;
        } else if (cur_parent.parent.name === "def") {
            return cur_parent;
        } else {
            return this.resolveDefChild(cur_parent.parent);
        }
    }

    protected resolveStatementChild(cur_parent: AstElement): AstElement {
        if (cur_parent.parent === null) {
            return null;
        } else if (cur_parent.parent.name === "statement") {
            return cur_parent;
        } else {
            return this.resolveStatementChild(cur_parent.parent);
        }
    }

    protected resolveQuery(cur_parent: AstElement): AstElement {
        if (cur_parent.parent === null) {
            return null;
        } else if (cur_parent.__type === "Query") {
            return cur_parent;
        } else {
            return this.resolveQuery(cur_parent.parent);
        }
    }

    protected resolveAggregation(cur_parent: AstElement): AstElement {
        if (cur_parent.parent === null) {
            return null;
        } else if (cur_parent.__type === "AggregateExpression") {
            return cur_parent;
        } else {
            return this.resolveAggregation(cur_parent.parent);
        }
    }

    protected beforeVisit() {
        // doStuff();
    }

    protected afterVisit() {
        this.sql = this.getSQL(this.getSQLFormat());
    }

    protected getType(): string {
        if ("type" in this.node) {
            return this.node.type;
        }
        return this.name;
    }

    protected getID(): string {
        return this.node.name;
    }

    protected getSQL(format: number = sqlFormat.TEMP_RESULTSET): any {
        return QueryObject.format("ASTELEMENT");
    }

    protected getSQLFormat(): number {
        return this.__sqlFormat;
    }

    protected setSQLFormat(format: number) {
        return (this.__sqlFormat = format);
    }

    private transformChildren(): void {
        this.__children = [];
        for (let key in this.node) {
            if (this.node[key] instanceof Array) {
                this.node[key] = this.node[key].map((e, i) =>
                    AstElement.__astFactory.astElementFactory(
                        e,
                        this.path + "[" + i + "]",
                        key,
                        this
                    )
                );
                this.__children.push(this.node[key]);
            } else if (typeof this.node[key] === "object") {
                this.node[key] = AstElement.__astFactory.astElementFactory(
                    this.node[key],
                    this.path + '["' + key + '"]',
                    key,
                    this
                );
                this.__children.push(this.node[key]);
            }
        }
    }

    private _generateSQL(format: number = sqlFormat.TEMP_RESULTSET) {
        this.__sqlFormat = format;
        this.traverse("getScopeConfigAndAliasEntityMapping", null);
        this.traverse(null, "getAttributeConfig");
        this.traverse("beforeVisit", "afterVisit", format);
    }
}
