import { AstElement } from "./AstElement";
import { QueryObject as qo } from "@alp/alp-base-utils";
import QueryObject = qo.QueryObject;
import dayjs from "dayjs";
import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

export class Literal extends AstElement {
    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);
    }

    private _isValidDateString = function (value: string) {
        const date_formats = [
            "YYYY-MM-DD", // 2025-05-20
            "YYYY-MM-DD[T]HH:mm:ss.SSS[Z]", // 2025-05-20T09:36:04.000Z
        ];
        return dayjs(value, date_formats, true).isValid();
    };

    getSQLNoCase() {
        if (typeof this.node.value === "string") {
            return QueryObject.format("%s", this.node.value);
        } else if (typeof this.node.value === "number") {
            return QueryObject.format("%f", this.node.value);
        } else {
            return QueryObject.format("%s", this.node.value);
        }
    }

    getSQL() {
        //special case when drilling down on charts
        if (typeof this.node.value === "string") {
            if (
                typeof this.node.valueType === "string" &&
                this.node.valueType === "SQLFunction"
            ) {
                return QueryObject.format("%UNSAFE", this.node.value);
            } else if (this._isValidDateString(this.node.value)) {
                return QueryObject.format("%t", this.node.value);
            } else {
                return QueryObject.format("UPPER(%s)", this.node.value);
            }
        } else if (typeof this.node.value === "number") {
            return QueryObject.format("%f", this.node.value);
        } else {
            return QueryObject.format("%s", this.node.value);
        }
    }
}
