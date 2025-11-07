import { PluginSelectedAttributeType } from "../../types";
import {
    FastQueryBuilder,
    BoolExpr,
    Operand,
    Logical,
} from "./FastQueryBuilder";
import { utils as utilsLib } from "@alp/alp-base-utils";
import { PluginColumnType, FilterType } from "../../types";
/**
 * Builds FAST for sql generation
 * @param selectedAttributes - List of attributes requested
 */
export function buildFAST(
    selectedAttributes: PluginSelectedAttributeType[],
    annotated: boolean = false,
    filters?: FilterType
): { entity: string; fast: any }[] {
    let oBuilder;
    let interactionList = {};
    let sortingList = {};
    //groups attributes according to its associated interactions
    selectedAttributes.forEach((attribute) => {
        if (Object.keys(interactionList).indexOf(attribute.configPath) === -1) {
            interactionList[attribute.configPath] = [
                { id: attribute.id, annotations: attribute.annotations },
            ];
        } else {
            interactionList[attribute.configPath].push({
                id: attribute.id,
                annotations: attribute.annotations,
            });
        }

        if (attribute.order !== "" && attribute.order !== undefined) {
            sortingList[attribute.id] = attribute.order;
        }
    });

    return Object.keys(interactionList).reduce((list, interaction) => {
        list.push({
            entity: interaction,
            fast: ((interaction: string, attributes) => {
                oBuilder = new FastQueryBuilder();
                let define = oBuilder.definition(
                    `${interaction.replace(/\./g, "")}DEF`
                );

                //inject patient id into each record
                define.retrieve("P0", "patient", "patient");

                if (interaction !== "patient") {
                    define.group("pid", "P0", `${interaction}.attributes.pid`);

                    // pid must be ordered for binary search to work when selecting interactions.
                    // do not sort when selecting from patient table
                    define.order(
                        "pid",
                        "P0",
                        `${interaction}.attributes.pid`,
                        "ASC"
                    );
                } else if (interaction === "patient") {
                    //Add if PID is not present as part of the request
                    if (
                        attributes &&
                        attributes.filter(
                            (elem) => elem.id.indexOf("attributes.pid") > -1
                        ).length === 0
                    ) {
                        define.group(
                            "pid",
                            "P0",
                            `${interaction}.attributes.pid`
                        );
                    }
                }

                if (filters && filters.or) {
                    if (filters.or.length === 1) {
                        let filter = filters.or[0];
                        define.whereClause(
                            BoolExpr.compare(filter.op)
                                .LHS(
                                    Operand.property(
                                        filter.filterKey,
                                        "P0",
                                        filter.attrPath
                                    )
                                )
                                .RHS(
                                    Operand.literal(
                                        "String",
                                        filter.filterValue
                                    )
                                )
                        );
                    } else if (filters.or.length > 1) {
                        let logical = BoolExpr.logical("Or");
                        filters.or.forEach((filter) => {
                            let operand = BoolExpr.compare(filter.op)
                                .LHS(
                                    Operand.property(
                                        filter.filterKey,
                                        "P0",
                                        filter.attrPath
                                    )
                                )
                                .RHS(
                                    Operand.literal(
                                        "String",
                                        filter.filterValue
                                    )
                                );
                            logical.addOperand(operand);
                        });
                        define.whereClause(logical);
                    }
                }

                let interactionScopeAlias = "P0";
                if (interaction !== "patient") {
                    interactionScopeAlias = `${tokenizeAndJoin(
                        interaction,
                        ".",
                        2
                    )}`;
                    define.with(
                        FastQueryBuilder.with(interactionScopeAlias).retrieve(
                            interaction.split(".").pop(),
                            interaction.replace(/\./g, "-")
                        )
                    );
                }
                attributes.forEach((attribute, index) => {
                    if (interaction !== "patient") {
                        if (index === 0) {
                            attribute.id.split(".").pop();
                        }
                    }
                    define.group(
                        tokenizeAndJoin(attribute.id, ".", 1),
                        interactionScopeAlias,
                        annotated
                            ? attribute.annotations
                                ? attribute.annotations
                                : attribute.id
                            : attribute.id
                    );

                    if (sortingList.hasOwnProperty(attribute.id)) {
                        define.order(
                            tokenizeAndJoin(attribute.id, ".", 1),
                            interactionScopeAlias,
                            attribute.id,
                            sortingList[attribute.id],
                            attribute.id.replace(/\./g, "-")
                        );
                    }
                });
                return oBuilder.getFast();
            })(interaction, interactionList[interaction]),
        });
        return list;
    }, []);
}

function tokenizeAndJoin(
    str: string,
    delimiter: string,
    joinLastXTokens: number
) {
    let tokens = str.split(delimiter);
    let out = "";

    for (let i = tokens.length - 1; i >= 0 && joinLastXTokens > 0; i--) {
        out = tokens[i] + out;
        --joinLastXTokens;
    }

    return out;
}

/**Forms default selected attribute request, retrieves all attributes from all interactions and patient */
export function formSelectedAttributesRequest({
    config,
    requestQuery,
    metadataType,
    userSelectedAttributes = [],
    supportMeasureExpr = false,
}: {
    config;
    requestQuery?: string[];
    metadataType?: string;
    userSelectedAttributes: PluginColumnType[];
    supportMeasureExpr?: boolean;
}): PluginSelectedAttributeType[] {
    let allAttributes = [];
    let requestWalker = utilsLib.getJsonWalkFunction(config);
    let requestInteractionWalker;
    let currInteraction;
    let currAttributes;

    allAttributes = requestWalker("patient.attributes.*").reduce(
        (attrList, currAttr) => {
            attrList.push({
                id: currAttr.path,
                configPath: "patient",
                annotations: currAttr.obj.hasOwnProperty("annotations")
                    ? currAttr.obj.annotations[0]
                    : undefined,
            });
            return attrList;
        },
        []
    );

    requestWalker("**.interactions.*").forEach((interaction) => {
        let currentInteractionAnno: string = interaction.obj.hasOwnProperty(
            "annotationInteraction"
        );
        // console.log(`annotation: ${JSON.stringify(currentInteractionAnno)}`);
        //Check if annotations are passed in the URL and match against each one of them
        //If NO annotations or request query entities are passed in the URL then return all interactions
        currInteraction = interaction.path;
        requestInteractionWalker = utilsLib.getJsonWalkFunction(
            interaction.obj
        );
        const interactionAttrs = requestInteractionWalker("attributes.*");
        const isGeneticInteraction =
            interactionAttrs.findIndex((attr) => {
                // one of the annotations has "genomics_variant_location";
                return (
                    attr.obj.annotations &&
                    attr.obj.annotations.indexOf("genomics_variant_location") >=
                        0
                );
            }) >= 0;
        allAttributes = allAttributes.concat(
            interactionAttrs.reduce((attrList, currAttr) => {
                // skip Genomics default attributes
                if (isGeneticInteraction && currAttr.obj.isDefault) {
                    return attrList;
                }
                //Based on flag, either allow or skip all attributes with measure expression
                if (
                    supportMeasureExpr ||
                    (!supportMeasureExpr && !currAttr.obj.measureExpression)
                ) {
                    attrList.push({
                        id: `${currInteraction}.${currAttr.path}`,
                        configPath: currInteraction,
                        annotations: currAttr.obj.hasOwnProperty("annotations")
                            ? currAttr.obj.annotations[0]
                            : undefined,
                    });
                }
                return attrList;
            }, [])
        );
    });

    // Return the attributes that were selected at the front end. And add sorting direction
    return allAttributes.reduce((finalList, currAttr) => {
        if (userSelectedAttributes.length > 0) {
            const attributeIndex = userSelectedAttributes.findIndex(
                (column) => column.configPath === currAttr.id
            );
            if (attributeIndex > -1) {
                let order = "";

                switch (userSelectedAttributes[attributeIndex].order) {
                    case "D":
                        order = "DESC";
                        break;
                    case "A":
                        order = "ASC";
                        break;
                    default:
                        order = "";
                }
                finalList.push({
                    ...currAttr,
                    order,
                });
            }
        } else {
            finalList.push(currAttr);
        }
        return finalList;
    }, []);
}
