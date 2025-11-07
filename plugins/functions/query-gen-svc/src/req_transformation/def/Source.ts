import { Node } from "./Node";
import { DataModelTypeExpression } from "./OperandFactory";
import { FastUtil } from "../fast_util";

export class Source extends Node {
    constructor(private __name?: string, private __type?: string, private __alias?: string, private __expression?: DataModelTypeExpression) {
        super();
    }
}
