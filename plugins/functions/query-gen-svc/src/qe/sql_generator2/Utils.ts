import { AstElement } from "./AstElement";
import { Def } from "./Def";
import { Statement } from "./Statement";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;

export class Utils {
    public static hasMultiRequest(nql: AstElement): Boolean {
        return nql instanceof Statement &&
            (nql as Statement).getContextDep("PatientRequests")
            ? true
            : false;
    }

    public static getContextSQL(
        e: any,
        context: string,
        name?: string
    ): QueryObject {
        const { withClause, body } = this.getContextSQLParts(e, context, name);
        if (!withClause) {
            return body;
        }
        return new QueryObject(
            `${withClause} ${body.queryString}`,
            body.parameterPlaceholders,
            body.sqlReturnOn
        );
    }

    // Same traversal as getContextSQL, but returns the WITH clause and body
    // separately so callers (notably appendPluginSpecificQueries) can hoist
    // the WITH to the top level of the surrounding statement instead of
    // emitting it inside a subquery — required for HANA, which rejects WITH
    // inside parenthesized subqueries. See issue #2234.
    public static getContextSQLParts(
        e: any,
        context: string,
        name?: string
    ): { withClause: string; body: QueryObject } {
        let contextList: QueryObject[] = [];

        function traverse(x: any) {
            if (
                x instanceof Def &&
                x.node.name !== "PatientRequests" &&
                x.node.context === context &&
                (!name || (name && x.node.name === name))
            ) {
                contextList.push(x.getChildren()[0].getSQL());
            } else if (x instanceof Array) {
                x.forEach((y) => traverse(y));
            } else if (x instanceof AstElement) {
                x.getChildren().forEach((y) => traverse(y));
            } else {
                return;
            }
        }

        e.node.def.forEach((x) => traverse(x));

        const entryExitExist = this.isEntryExitExists(contextList);
        if (entryExitExist) {
            return this.formMultipleEntryExitParts(contextList);
        }

        let body: QueryObject;
        if (contextList.length > 1) {
            contextList.forEach((queryObject) => {
                this.wrapBrackets(queryObject);
            });
            body = QueryObject.format(" UNION ").join(contextList);
        } else {
            body = contextList[0];
        }
        return { withClause: "", body };
    }

    // Exposed for unit testing. Builds the entry/exit-aware WITH clause
    // and the corresponding SELECT/INNER JOIN body separately so the WITH
    // can be hoisted out of any subquery wrapping. See getContextSQLParts.
    public static formMultipleEntryExitParts(
        localContextList: QueryObject[]
    ): { withClause: string; body: QueryObject } {
        let count = 0;
        const name = "PatientRequest";
        const parsSet = new Set<string>();
        let withClause: any = [];
        localContextList.forEach((queryObject) => {
            if (queryObject.queryString.indexOf("PEE") > -1) {
                withClause = `WITH PatientRequestEntryExit AS ${
                    this.wrapBrackets(queryObject).queryString
                } `;
            } else {
                withClause += `, ${name}${count} AS ( ${queryObject.queryString} ) `;
                count++;
            }
            queryObject.parameterPlaceholders.forEach((p) =>
                parsSet.add(p)
            );
        });
        let unionQuery = "";
        for (let i = 0; i < count; i++) {
            if (i === 0) {
                // PatientRequestEntryExit is referenced UNQUOTED to match the
                // unquoted CTE declaration in the WITH chain. HANA stores
                // unquoted identifiers in upper case, so a quoted reference
                // ("PatientRequestEntryExit") would fail to resolve against
                // the upper-cased CTE name. See issue #2234.
                unionQuery = `SELECT
                        "PatientListRequests"."patient.attributes.pcount.0" AS "patient.attributes.pcount.0",
                        PatientRequestEntryExit."entry" AS "entry",
                        PatientRequestEntryExit."exit" AS "exit"
                        FROM (SELECT * FROM ${name}${i}`;
            } else {
                unionQuery += ` UNION SELECT * FROM ${name}${i}`;
            }
        }

        // Construct order by query for unionQuery if there is an ORDER BY in PatientRequest
        let orderByQuery = "";
        localContextList.forEach((queryObject) => {
            // Find ORDER BY expression and direction by looking for string inbetween ORDER BY and ASC|DESC
            const orderByExpressionMatch =
                queryObject.queryString.match(
                    new RegExp(`(?<=ORDER BY)(.*)(ASC|DESC)`)
                );
            if (orderByExpressionMatch) {
                const orderByExpression =
                    orderByExpressionMatch[1].trim();
                const orderByDirection =
                    orderByExpressionMatch[2].trim();

                // Use orderByExpression to find `AS alias` to use in ORDER BY for unionQuery
                const OrderByAliasRegex = new RegExp(
                    `${this.escapeRegExp(
                        orderByExpression
                    )} AS \\"(.*?)\\"`
                );
                const orderByAliasMatch = queryObject.queryString.match(
                    OrderByAliasRegex
                );

                if (orderByAliasMatch) {
                    const orderByAlias = orderByAliasMatch[1];
                    orderByQuery = `ORDER BY "${orderByAlias}" ${orderByDirection}`;
                }
            }
        });

        unionQuery += `) AS "PatientListRequests" INNER JOIN PatientRequestEntryExit
        ON "PatientListRequests"."patient.attributes.pcount.0" = PatientRequestEntryExit."patient.attributes.pid"
        ${orderByQuery}`;

        const body = new QueryObject(
            unionQuery,
            [...Array.from(parsSet)],
            true
        );
        return { withClause: String(withClause), body };
    }

    static wrapBrackets(qo: QueryObject) {
        qo.queryString = "(" + qo.queryString + ")";
        return qo;
    }

    static isEntryExitExists(contextList: QueryObject[]) {
        return contextList.some((queryObject) => {
            return queryObject.queryString.indexOf("PEE") > -1;
        });
    }

    static escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); // $& means the whole matched string
    }
}
