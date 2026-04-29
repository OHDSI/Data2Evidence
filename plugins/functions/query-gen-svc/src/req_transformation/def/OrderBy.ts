import { BaseOperandExpression } from "./OperandFactory";

export class OrderBy extends BaseOperandExpression {

    constructor(type: string, path: string, scope: string, alias?: string, axis?: boolean, public order: string = "ASC") {
        super(type, path, scope, alias, axis);
    }
}
