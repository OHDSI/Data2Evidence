import { Definition } from "./Definition";
import { Expression } from "./Expression";

import { Operand, BaseOperandExpressionRef } from "./OperandFactory";

export class Union extends Definition {
    constructor(protected name: string, protected context: string, protected accessLevel: string, protected expression: Expression) {
        super(name, context, accessLevel, expression);
    }
}
