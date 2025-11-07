import { ConfigErrorType } from "../types";

export class ErrorStorage {
    public errors: ConfigErrorType[] = [];
    public warnings: ConfigErrorType[] = [];

    constructor() {
        Object.defineProperty(this, "length", {
            get: () => this.errors.length,
        });
    }

    public getMessages() {
        return {
            errors: this._removePrefix(this.errors),
            warnings: this._removePrefix(this.warnings),
        };
    }

    public getErrors() {
        return this._removePrefix(this.errors);
    }

    public getWarnings() {
        return this._removePrefix(this.warnings);
    }

    public addError(config, definition, path, error) {
        error.config = config;
        error.definition = definition;
        error.path = path;
        this.errors.push(error);
    }

    public addWarning(config, definition, path, warning) {
        warning.config = config;
        warning.definition = definition;
        warning.path = path;
        this.warnings.push(warning);
    }

    private _removePrefix(array: ConfigErrorType[]) {
        return array.map((element) => {
            // remove prefix "Config."
            element.path = element.path.split(".").slice(1).join(".");
            return element;
        });
    }
}
