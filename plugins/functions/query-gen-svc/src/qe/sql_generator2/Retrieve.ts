import { AstElement } from "./AstElement";
import { EntityConfig } from "../qe_config_interface/EntityConfig";
import { isPropExists } from "@alp/alp-base-utils";

export class Retrieve extends AstElement {
    public entityConfig: EntityConfig;

    constructor(public node, public path, public name, public parent) {
        super(node, path, name, parent);

        if (!isPropExists(node, "dataType")) {
            throw new Error("[RETRIEVE] dataType does not exists");
        }
        if (!isPropExists(node, "templateId")) {
            throw new Error("[RETRIEVE] templateId does not exists");
        }
        if (!isPropExists(node, "type")) {
            throw new Error("[RETRIEVE] type does not exists");
        }
    }

    public getScopeConfigAndAliasEntityMapping() {
        this.entityConfig = <EntityConfig>(
            AstElement.getConfig().getEntityByPath(this.node.templateId)
        );
        if (
            this.parent.getType() === "With" ||
            this.parent.getType() === "Without" ||
            this.parent.getType() === "LeftJoin"
        ) {
            this.parent.entityConfig = this.entityConfig;
            this.entityConfig
                .getTables()
                .map((x) => this.parent.addTableAlias(x, true));
        }
        if (this.parent.getType() === "source") {
            this.parent.entityConfig = this.entityConfig;
        }
    }

    public getSQL() {
        if (this.parent.getType() === "source") {
            return this.entityConfig.getContextTable();
        }
        if (
            this.parent.getType() === "With" ||
            this.parent.getType() === "Without" ||
            this.parent.getType() === "LeftJoin"
        ) {
            return this.entityConfig.getTables()[0].table;
        }
    }
}
