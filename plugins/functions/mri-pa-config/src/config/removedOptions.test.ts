import { stripRemovedOptions } from "./removedOptions.ts";

function assert(cond: boolean, msg: string) {
    if (!cond) throw new Error(msg);
}

Deno.test("removes usePaAtlas and keeps other panelOptions", () => {
    const config = { panelOptions: { usePaAtlas: true, atlasCohortDefinition: true, addToCohorts: false } };
    const result = stripRemovedOptions(config);
    assert(result === config, "should return the same object");
    assert(!("usePaAtlas" in config.panelOptions), "usePaAtlas should be removed");
    assert(config.panelOptions.atlasCohortDefinition === true, "atlasCohortDefinition must stay");
    assert(config.panelOptions.addToCohorts === false, "other options must stay");
});

Deno.test("tolerates configs without panelOptions", () => {
    assert(stripRemovedOptions(undefined) === undefined, "undefined config");
    assert(stripRemovedOptions({ panelOptions: null }).panelOptions === null, "null panelOptions");
});
