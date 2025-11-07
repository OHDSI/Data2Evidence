import { BaseOperandExpression } from "./OperandFactory";
import { Expression } from "./Expression";

export class Measure extends BaseOperandExpression {

    constructor(type: string, path: string, scope: string, alias: string, expression?: string) {
        super(type, path, scope, alias);
    }
}
