import { ParserContainer } from "./ParserContainer";
import { Query } from "./Query";
import { Source } from "./Source";

export class Aggregate extends Query {
    constructor(request: ParserContainer, action: string, type: string, source: Source) {
        super(request, action, type, source);
    }
}
