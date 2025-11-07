import { getJsonWalkFunction, getObjectByPath } from "@alp/alp-base-utils";
import { Logger } from "@alp/alp-base-utils";
import TerminologySvcAPI from "../../api/TerminologySvcAPI";
const logger = Logger.CreateLogger();

type ConceptSetConcept = {
    id: number;
    useDescendants: boolean;
    useMapped: boolean;
};

type IfrConceptSet = {
    conceptSetAttr: string;
    path: string;
    instanceId: string;
    conceptSetIds: string[];
};
type IfrConceptSetWithConceptIds = IfrConceptSet & {
    conceptIds: number[];
};
type Ifr = {
    cards: {
        content: {
            content: {
                op: string;
                _configPath: string;
                _instanceNumber: number;
                _instanceID: string;
                _name: string;
                _inactive: boolean;
                _attributes: {
                    content: {
                        _configPath: string;
                        _instanceID: string;
                        _constraints: {
                            content: {
                                _operator: string;
                                _value: string;
                            }[];
                            op: string;
                        };
                    }[];
                    op: string;
                };
            }[];
            op: string;
        }[];
        op: string;
    };
};
// This is a partial type with only the structure required for this functionality
type Config = {
    patient: {
        interactions: {
            conditionera: {
                name: string;
                defaultFilter: string;
                defaultPlaceholder: string;
                order: number;
                parentInteraction: any[];
                parentInteractionLabel: string;
                attributes: {
                    [key: string]: {
                        name: string;
                        type: string;
                    };
                };
            };
        };
    };
};
type ConstraintContent = {
    _operator: string;
    // Concept Id is a number, but sent as string in ifr
    _value: string | number;
};
type Constraint = {
    content: ConstraintContent[];
    op: string;
};

/**
 * This is the main function.
 * Replaces concept sets in the filter (ifr) with the associated concepts
 * _configPath is updated to the attribute used for the concept id using the key `conceptSetAttr` in the config.
 * Note that _instanceID is left unchanged as this value should be unique, and replacing it like _configPath may cause key collision
 */
const updateIfrWithConcepts = async (
    config: Config,
    ifr: Ifr,
    datasetId: string,
    bearerToken: string
): Promise<Ifr> => {
    const updatedIfr = JSON.parse(JSON.stringify(ifr));
    const conceptSets = findConceptSetsInIfr(config, updatedIfr);
    if (conceptSets && conceptSets.length > 0) {
        const conceptSetsWithConceptIds = await getConceptsFromConceptSets(
            conceptSets,
            datasetId,
            bearerToken
        );
        conceptSetsWithConceptIds.forEach((set) => {
            const conceptSetAttributes = getObjectByPath(updatedIfr, set.path);
            conceptSetAttributes._constraints = generateConceptConstraints(
                set.conceptIds
            );
        });
    }
    return updatedIfr;
};

// Jasmine tests are unable to mock module exports as they are not mutable
// putting them into an object first instead allows the function to be mocked.
const mockables = {
    getConceptIdsFromTerminologySvc: async (
        conceptSetIds: string[],
        datasetId: string,
        bearerToken: string
    ): Promise<number[]> => {
        try {
            const terminologySvcApi = new TerminologySvcAPI();
            const result = await terminologySvcApi.getConceptIds(
                conceptSetIds,
                datasetId,
                bearerToken
            );
            return result;
        } catch (err) {
            const errorMessage = `Error getting concept ids for concept sets: ${JSON.stringify(
                conceptSetIds
            )} with Error: ${err}`;
            logger.error(errorMessage);
            throw err;
        }
    },
};

/**
 * Find the attributes used in the filters (ifr), and check if they are concept sets
 * from their definitions in the config
 */
const findConceptSetsInIfr = (config: Config, ifr: Ifr): IfrConceptSet[] => {
    const configJsonWalker = getJsonWalkFunction(config);
    const ifrJsonWalker = getJsonWalkFunction(ifr);
    const attributes = ifrJsonWalker("**._constraints").map(({ path, obj }) => {
        const attrObjPath = path.split(".").slice(0, -1).join(".");
        return ifrJsonWalker(attrObjPath)[0];
    });
    const conceptSetAttributes = attributes.filter(
        ({ obj }) =>
            configJsonWalker(obj._configPath)[0]?.obj?.type === "conceptSet"
    );

    const conceptSetIds = conceptSetAttributes
    .map(({ path, obj }) => {
        // Json walk over concept set attributes as content could be nested
        const conceptSetJsonWalker = getJsonWalkFunction(obj)
        const conceptSetContent = conceptSetJsonWalker("**.content").reduce((acc, obj) => {
            if (obj.obj.filter(o => o.hasOwnProperty("_value")).length > 0){
                acc.push(...(obj.obj))
            }
            return acc
        }, [])

        return {
            conceptSetAttr: configJsonWalker(obj._configPath)[0]?.obj
            ?.conceptSetAttr,
            path,
            instanceId: obj._instanceID,
            conceptSetIds: conceptSetContent.map((c) => c._value),
        };
    })
    .filter((el) => el.conceptSetIds.length > 0);
    
    return conceptSetIds;
};

const generateConceptConstraints = (
    conceptIds: (number | null)[]
): Constraint => {
    // It is possible for the concept id to be null. This happens when a concept set is built using
    // a dataset where the concepts are available, but searched on a dataset which does not contain
    // the concepts.
    return {
        content: conceptIds
            .filter((id) => id)
            .map((id) => {
                return { _operator: "=", _value: id };
            }),
        op: "OR",
    };
};

const getConceptsFromConceptSets = async (
    conceptSets: IfrConceptSet[],
    datasetId: string,
    bearerToken: string
): Promise<IfrConceptSetWithConceptIds[]> => {
    const promises = conceptSets.map(async (set) => {
        const conceptIds = await mockables.getConceptIdsFromTerminologySvc(
            set.conceptSetIds,
            datasetId,
            bearerToken
        );
        return { ...set, conceptIds };
    });
    const conceptSetsWithConceptIds = await Promise.all(promises);
    return conceptSetsWithConceptIds;
};

export {
    findConceptSetsInIfr,
    updateIfrWithConcepts,
    generateConceptConstraints,
    getConceptsFromConceptSets,
    mockables,
};
