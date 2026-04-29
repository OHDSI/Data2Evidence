import {BaseOperandExpression} from "./OperandFactory";

export class GroupBy extends BaseOperandExpression {
    constructor(type: string, path: string, scope: string, alias?: string, axis?: boolean) {
        super(type, path, scope, alias, axis);
    }
}
