import { ParserContainer, BaseNode } from "./ParserContainer";
import { Definition } from "./Definition";
import { Source } from "./Source";
import {
    BaseOperandExpressionRef,
    DataModelTypeExpression,
} from "./OperandFactory";
import { AggregateFactory } from "./AggregateFactory";
import { Node } from "./Node";
import { Query } from "./Query";
import { Union } from "./Union";
import { Expression } from "./Expression";
import { Relationship } from "./Relationship";
import * as Keys from "../keys";
import { FastUtil } from "../fast_util";

export class Statement extends Node {
    private __definition: Definition[] = [];

    constructor(
        private __parserContainers: ParserContainer[],
        private __action
    ) {
        super();
        this.build();
    }

    addDefinition(def: Definition) {
        this.__definition.push(def);
    }

    private build() {
        let names: String[] = [];
        let union = FastUtil.isUnion(this.__parserContainers);

        const isEntryExitApplied = this.__parserContainers.some((e) => {
            if (e.name === Keys.DEF_PATIENT_REQUEST_ENTRYEXIT) return true;
        });

        this.__parserContainers.forEach((e) => {
            if (e.context === Keys.CQLTERM_CONTEXT_PATIENT) {
                let qry = new Query(
                    e,
                    this.__action,
                    Keys.CQLTERM_QUERY,
                    new Source(
                        undefined,
                        undefined,
                        e.alias,
                        new DataModelTypeExpression(
                            e.context,
                            e.context.toLowerCase(),
                            Keys.CQLTERM_RETRIEVE
                        )
                    )
                );

                if (e.name === Keys.DEF_PATIENT_REQUEST_ENTRYEXIT) {
                    const existingRelationShips = new Set<string>();

                    //Check if the With Relationship already filters, if yes avoid adding additional relationship for the measure below
                    Object.keys(e.filter).forEach(fcType => {
                        const fcArray = e.filter[fcType];
                        fcArray.forEach(fc => {
                            if(fc.isEntryExit) existingRelationShips.add(fc.alias)
                        })
                    })

                    e.measure.forEach((e) => {
                        if (!existingRelationShips.has(e.alias)) {
                            //Only add unique relationships for entry and exit
                            qry.addRelationship(
                                new Relationship(
                                    e.alias,
                                    Keys.CQLTERM_WITH,
                                    new DataModelTypeExpression(
                                        e.dataType,
                                        e.templateId,
                                        Keys.CQLTERM_RETRIEVE
                                    ),
                                    []
                                )
                            );
                            existingRelationShips.add(e.alias);
                        }
                    });
                } else if (isEntryExitApplied) {
                    qry.insertRelationship(
                        new Relationship(
                            Keys.DEF_PATIENT_REQUEST_ENTRYEXIT,
                            Keys.CQLTERM_WITH,
                            new BaseOperandExpressionRef(
                                Keys.DEF_PATIENT_REQUEST_ENTRYEXIT,
                                Keys.CQLTERM_EXPRESSIONREF
                            ),
                            [],
                            [],
                            false
                        )
                    );
                }

                let def = new Definition(
                    e.name,
                    e.context,
                    Keys.CQLTERM_PUBLIC,
                    qry
                );
                this.addDefinition(def);
                names.push(e.name);
            } else if (e.context === Keys.CQLTERM_CONTEXT_POPULATION) {
                this.addDefinition(
                    new Definition(
                        e.name,
                        Keys.CQLTERM_CONTEXT_POPULATION,
                        Keys.CQLTERM_PUBLIC,
                        AggregateFactory.createAggregate(
                            Keys.CQLTERM_AGGREGATEEXPRESSION,
                            e,
                            union
                                ? Keys.DEF_PATIENTREQUESTS
                                : Keys.DEF_PATIENTREQUEST + "0",
                            this.__action
                        )
                    )
                );
            }
        });

        if (names.length > 1) {
            this.addDefinition(
                new Union(
                    Keys.DEF_PATIENTREQUESTS,
                    Keys.CQLTERM_CONTEXT_PATIENT,
                    Keys.CQLTERM_PUBLIC,
                    new Expression(
                        Keys.SQLTERM_SET_OP_UNION,
                        this.__action,
                        undefined,
                        names
                            .map((z) => {
                                if (
                                    z.toString() !==
                                    Keys.DEF_PATIENT_REQUEST_ENTRYEXIT
                                ) {
                                    return new BaseOperandExpressionRef(
                                        z.toString(),
                                        Keys.CQLTERM_EXPRESSIONREF
                                    );
                                }
                            })
                            .filter((z) => {
                                if (z) {
                                    return z;
                                }
                            }) //filter for false boolean values
                    )
                )
            );
        }
    }

    print() {
        return { statement: { def: this.__definition.map((x) => x.print()) } };
    }
}
