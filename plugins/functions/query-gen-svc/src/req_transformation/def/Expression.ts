import { Node } from "./Node";
import { Source } from "./Source";
import { BaseOperandType, DataModelTypeExpression } from "./OperandFactory";

export class Expression extends Node {
    constructor(protected __type: string, protected __actionType?: string, protected __source?: Source[], protected __operand?: BaseOperandType[]) {
        super();
    }
}
