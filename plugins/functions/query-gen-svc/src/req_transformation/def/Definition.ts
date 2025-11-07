import { Query } from "./Query";
import { Node } from "./Node";
import { Expression } from "./Expression";

export class Definition extends Node {
    constructor(protected __name: string, protected __context: string, protected __accessLevel: string, protected __expression?: Expression) {
        super();
    }
}
