sap.ui.define([], function () {
    "use strict";

    var KEYS = ["parentMappingInteractionLabel", "parentInteraction", "parentMappingInteraction", "currentMappingInteractionId"];
    var DEFAULT_OLD_LABEL = "parent";
    var PARENT_LABEL_SUFFIX = " parent";
    var NEW_LABEL_PREFIX = "New Parent - ";
    var INTERACTION_PATH = /^patient\.(interactions|conditions\.[0-9a-zA-Z_]+\.interactions)\.[0-9a-zA-Z_]+$/;
    var PLACEHOLDER = /^@[0-9a-zA-Z_]+$/;
    var COLUMN = /^@[0-9a-zA-Z_]+\./;
    var TEXT = {
        label: "HPH_CDM_CFG_PARENT_MAPPING_LABEL_REQUIRED",
        parent: "HPH_CDM_CFG_PARENT_MAPPING_PARENT_REQUIRED",
        duplicate: "HPH_CDM_CFG_VALID_DUPLICATE_PARENT_INTERACTION",
        placeholder: "HPH_CDM_CFG_PARENT_MAPPING_PLACEHOLDER_REQUIRED",
        column: "HPH_CDM_CFG_PARENT_MAPPING_COLUMN_INVALID"
    };

    function field(value) {
        return { value: typeof value === "string" ? value : "", validity: { status: "valid", message: "" } };
    }

    function invalidField(source, message) {
        return { value: source.value, validity: { status: "invalid", message: message } };
    }

    function toItem(mapping) {
        return KEYS.reduce(function (item, key) {
            item[key] = field(mapping[key]);
            return item;
        }, {});
    }

    function lastSegment(path) {
        var parts = String(path || "").split(".");
        return parts[parts.length - 1];
    }

    function firstName(interaction) {
        var names = (interaction && interaction.name) || [];
        var found = names.filter(function (name) {
            return name && typeof name.value === "string" && name.value.trim() !== "";
        })[0];
        return found ? found.value : "";
    }

    function nameLookup(patient) {
        var names = {};
        var addAll = function (prefix, interactions) {
            Object.keys(interactions || {}).forEach(function (key) {
                names[prefix + key] = firstName(interactions[key]) || key;
            });
        };
        addAll("patient.interactions.", patient && patient.interactions);
        var conditions = (patient && patient.conditions) || {};
        Object.keys(conditions).forEach(function (conditionKey) {
            addAll("patient.conditions." + conditionKey + ".interactions.", conditions[conditionKey].interactions);
        });
        return function (path) {
            return names[path] || lastSegment(path);
        };
    }

    function storedMappings(interaction) {
        var stored = interaction.parentInteractionsMapping;
        if (typeof stored === "string") {
            try {
                stored = JSON.parse(stored);
            } catch (error) {
                console.error("Parent interaction mappings are not valid JSON", error);
                return [];
            }
        }
        return Array.isArray(stored) ? stored : [];
    }

    function labelRule(interaction, nameOf) {
        var parents = Array.isArray(interaction.parentInteraction) ? interaction.parentInteraction : [];
        var oldLabel = String(interaction.parentInteractionLabel || "").trim();
        var useOldLabel = parents.length === 1 && oldLabel !== "" && oldLabel !== DEFAULT_OLD_LABEL;
        return function (parentPath) {
            return useOldLabel ? oldLabel : nameOf(parentPath) + PARENT_LABEL_SUFFIX;
        };
    }

    function fromBackend(interaction, nameOf) {
        var source = interaction || {};
        var labelFor = labelRule(source, nameOf || lastSegment);
        var stored = storedMappings(source).map(function (mapping) {
            var label = String(mapping.parentMappingInteractionLabel || "").trim();
            return label ? mapping : Object.assign({}, mapping, { parentMappingInteractionLabel: labelFor(mapping.parentInteraction) });
        });
        var parents = Array.isArray(source.parentInteraction) ? source.parentInteraction : [];
        var missing = parents.filter(function (parentPath) {
            return !stored.some(function (mapping) {
                return mapping.parentInteraction === parentPath;
            });
        }).map(function (parentPath) {
            return { parentInteraction: parentPath, parentMappingInteractionLabel: labelFor(parentPath) };
        });
        return stored.concat(missing).map(toItem);
    }

    function trimmed(item, key) {
        return String((item[key] && item[key].value) || "").trim();
    }

    function toBackend(items) {
        var list = Array.isArray(items) ? items : [];
        var mappings = list.map(function (item) {
            var mapping = {
                parentMappingInteractionLabel: trimmed(item, "parentMappingInteractionLabel"),
                parentInteraction: trimmed(item, "parentInteraction"),
                parentMappingInteraction: trimmed(item, "parentMappingInteraction")
            };
            var column = trimmed(item, "currentMappingInteractionId");
            return column ? Object.assign({}, mapping, { currentMappingInteractionId: column }) : mapping;
        });
        return {
            parentInteraction: mappings.map(function (mapping) {
                return mapping.parentInteraction;
            }).filter(Boolean),
            parentInteractionsMapping: mappings
        };
    }

    function listOf(items) {
        return Array.isArray(items) ? items : [];
    }

    function add(items) {
        var list = listOf(items);
        return list.concat([toItem({ parentMappingInteractionLabel: NEW_LABEL_PREFIX + (list.length + 1) })]);
    }

    function valuesOf(item) {
        return KEYS.reduce(function (values, key) {
            values[key] = item[key] ? item[key].value : "";
            return values;
        }, {});
    }

    function duplicate(items, index) {
        var list = listOf(items);
        var copy = toItem(Object.assign(valuesOf(list[index]), { parentInteraction: "" }));
        return list.slice(0, index + 1).concat([copy], list.slice(index + 1));
    }

    function remove(items, index) {
        return listOf(items).filter(function (item, position) {
            return position !== index;
        });
    }

    function update(items, index, key, value) {
        return listOf(items).map(function (item, position) {
            if (position !== index) {
                return item;
            }
            var changed = Object.assign({}, item);
            changed[key] = field(value);
            return changed;
        });
    }

    function availableParents(items, index, options, selfPath) {
        var used = listOf(items).filter(function (item, position) {
            return position !== index;
        }).map(function (item) {
            return trimmed(item, "parentInteraction");
        });
        return (options || []).filter(function (option) {
            return option.key !== selfPath && used.indexOf(option.key) === -1;
        });
    }

    function checkItem(item, seenParents, text) {
        var checked = Object.assign({}, item);
        var label = trimmed(item, "parentMappingInteractionLabel");
        var parent = trimmed(item, "parentInteraction");
        var placeholder = trimmed(item, "parentMappingInteraction");
        var column = trimmed(item, "currentMappingInteractionId");
        KEYS.forEach(function (key) {
            checked[key] = field(item[key] ? item[key].value : "");
        });
        if (!label) {
            checked.parentMappingInteractionLabel = invalidField(checked.parentMappingInteractionLabel, text(TEXT.label));
        }
        if (!INTERACTION_PATH.test(parent)) {
            checked.parentInteraction = invalidField(checked.parentInteraction, text(TEXT.parent));
        } else if (seenParents.indexOf(parent) !== -1) {
            checked.parentInteraction = invalidField(checked.parentInteraction, text(TEXT.duplicate));
        }
        if (!PLACEHOLDER.test(placeholder)) {
            checked.parentMappingInteraction = invalidField(checked.parentMappingInteraction, text(TEXT.placeholder));
        }
        if (column && !COLUMN.test(column)) {
            checked.currentMappingInteractionId = invalidField(checked.currentMappingInteractionId, text(TEXT.column));
        }
        return checked;
    }

    function isValid(item) {
        return KEYS.every(function (key) {
            return item[key].validity.status === "valid";
        });
    }

    function validate(items, text) {
        var seenParents = [];
        var checked = listOf(items).map(function (item) {
            var result = checkItem(item, seenParents, text);
            seenParents = seenParents.concat([trimmed(item, "parentInteraction")]);
            return result;
        });
        return { items: checked, valid: checked.every(isValid) };
    }

    return {
        lastSegment: lastSegment,
        nameLookup: nameLookup,
        fromBackend: fromBackend,
        toBackend: toBackend,
        add: add,
        duplicate: duplicate,
        remove: remove,
        update: update,
        availableParents: availableParents,
        validate: validate
    };
});
