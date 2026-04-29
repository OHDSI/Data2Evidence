import { AstElement } from "./AstElement";
import { Def } from "./Def";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import { sqlFormat } from "@alp/alp-base-utils";

export class Statement extends AstElement {
    private contextsDep = {};

    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);
    }

    public addContextDep(contextName: string): void {
        if (!(contextName in this.contextsDep)) {
            this.contextsDep[contextName] = this.node.def.find(
                (def) => def.node.name === contextName
            );
        }
    }

    public getContextDep(contextName: string): Def {
        return this.node.def.find((def) => def.node.name === contextName);
    }

    public getSQL(format: number) {
        let qoList: QueryObject[] = [];

        this.node.def.sort((x, y) => {
            if (x.node.name === "MeasurePopulation") {
                return 1;
            } else if (x.node.name === "PatientRequests") {
                if (
                    y.node.name === "MeasurePopulation" ||
                    y.node.name === "PatientCount"
                ) {
                    return -1;
                }
                return 1;
            } else if (x.node.name === "PatientCount") {
                if (y.node.name === "MeasurePopulation") {
                    return -1;
                }
                return 1;
            } else {
                return -1;
            }
        });

        switch (format) {
            case sqlFormat.ANONYMOUS_BLOCK:
                qoList.push(
                    QueryObject.format(
                        "DO BEGIN %Q",
                        QueryObject.format(" ").join(
                            this.node.def.map((x) => x.getSQL(format))
                        )
                    )
                );

                if (this.append) {
                    qoList.push(QueryObject.format(" %Q ", this.append));
                }

                if (this.into) {
                    qoList.push(
                        QueryObject.format(" INSERT INTO %UNSAFE ", this.into)
                    );
                }

                qoList.push(
                    QueryObject.format(
                        "SELECT * FROM :%UNSAFE;",
                        this.append
                            ? this.appendName
                            : this.node.def[this.node.def.length - 1].node.name
                    )
                );

                qoList.push(QueryObject.format("END;"));

                break;
            case sqlFormat.NESTED:
                if (this.into) {
                    qoList.push(
                        QueryObject.format(" INSERT INTO %UNSAFE ", this.into)
                    );
                }

                if (this.append) {
                    qoList.push(
                        QueryObject.format(
                            <string>this.append,
                            this.node.def[this.node.def.length - 1].getSQL(
                                format
                            )
                        )
                    );
                } else {
                    qoList.push(
                        this.node.def[this.node.def.length - 1].getSQL(format)
                    );
                }

                break;
            case sqlFormat.COMBINE_COUNT:
                qoList.push(
                    QueryObject.format(
                        "WITH %Q",
                        QueryObject.format(", ").join(
                            this.node.def.map((x) => x.getSQL(format))
                        )
                    )
                );

                if (this.append) {
                    qoList.push(QueryObject.format(", %Q ", this.append));
                }

                if (this.into) {
                    qoList.push(
                        QueryObject.format(" INSERT INTO %UNSAFE ", this.into)
                    );
                }

                const orderByList = [];

                if (
                    this.getContextDep("MeasurePopulation")?.node?.expression
                        ?.node?.orderBy
                ) {
                    this.getContextDep(
                        "MeasurePopulation"
                    ).node.expression.node.orderBy.forEach((item) => {
                        if ((item.node.axis = "x"))
                            orderByList.push(
                                `"${item.node.path}" ${item.node.order}`
                            );
                    });
                }

                qoList.push(
                    QueryObject.format(
                        "SELECT * FROM %UNSAFE FULL JOIN %UNSAFE ON 1=1 %UNSAFE ",
                        "MeasurePopulation",
                        this.append
                            ? this.appendName
                            : this.node.def[this.node.def.length - 1].node.name,
                        orderByList.length
                            ? `ORDER BY ${orderByList.join(",")}`
                            : ""
                    )
                );

                break;
            case sqlFormat.TEMP_RESULTSET:
            default:
                qoList.push(
                    QueryObject.format(
                        "WITH %Q",
                        QueryObject.format(", ").join(
                            this.node.def.map((x) => x.getSQL(format))
                        )
                    )
                );

                if (this.append) {
                    qoList.push(QueryObject.format(", %Q ", this.append));
                }

                if (this.into) {
                    qoList.push(
                        QueryObject.format(" INSERT INTO %UNSAFE ", this.into)
                    );
                }

                qoList.push(
                    QueryObject.format(
                        "SELECT * FROM %UNSAFE",
                        this.append
                            ? this.appendName
                            : this.node.def[this.node.def.length - 1].node.name
                    )
                );
                break;
        }

        return QueryObject.format(" ").join(qoList);
    }
}
