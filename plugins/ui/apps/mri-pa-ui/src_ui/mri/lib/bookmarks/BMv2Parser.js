/* eslint no-use-before-define: [2, "nofunc"] */
sap.ui.define([
    "sap/hc/mri/pa/ui/lib/ifr/BooleanContainers",
    "sap/hc/mri/pa/ui/lib/ifr/InternalFilterRepresentation",
    "sap/hc/mri/pa/ui/lib/ifr/IFRBuilder",
    "sap/hc/mri/pa/ui/lib/ifr/ParameterObjectValidator"
], function (BooleanContainers, IFR, IFRBuilder, ParameterObjectValidator) {
    "use strict";

    function parseFilter(bookmarkJson) {
        new ParameterObjectValidator(bookmarkJson)
            .expectProperty("configMetadata")
            .expectProperty("cards");

        var configMetadataJson = bookmarkJson.configMetadata;
        new ParameterObjectValidator(configMetadataJson)
            .expectProperty("version")
            .expectProperty("id");

        var filterBuilder = new IFRBuilder.FilterBuilder().setParameters({
            configMetadata: new IFR.ConfigMetadata(configMetadataJson.version, configMetadataJson.id)
        });

        if (bookmarkJson.cards) {
            parseFilterContent(filterBuilder, bookmarkJson.cards);
        }

        return filterBuilder.build();
    }

    function parseFilterContent(filterBuilder, filterCardContainerJson) {
        new ParameterObjectValidator(filterCardContainerJson)
            .expectProperty("type");

        switch (filterCardContainerJson.type) {
            case "BooleanContainer":
                parseBooleanContainer(parseFilterContent, filterBuilder, filterCardContainerJson);
                break;
            case "FilterCard":
                parseFilterCard(filterBuilder, filterCardContainerJson);
                break;
            default:
                throw new Error("Unexpected type on FilterCard level!");
        }
    }

    function parseFilterCard(filterBuilder, filterCardJson) {
        new ParameterObjectValidator(filterCardJson)
            .expectProperty("attributes");

        var filterCardParam = filterCardJson;

        if (filterCardJson.successor) {
            var successorJson = filterCardJson.successor;

            new ParameterObjectValidator(successorJson)
                .expectProperty("id")
                .expectProperty("minDaysBetween")
                .expectProperty("maxDaysBetween");

            var successor = new IFR.Successor(successorJson.id, successorJson.minDaysBetween, successorJson.maxDaysBetween);

            // Copy the JSON to NOT alter the original bookmark
            filterCardParam = {
                configPath: filterCardJson.configPath,
                instanceNumber: filterCardJson.instanceNumber,
                instanceID: filterCardJson.instanceID,
                name: filterCardJson.name,
                successor: successor,
                advanceTimeFilter: filterCardParam.advanceTimeFilter,
                parentInteraction: filterCardParam.parentInteraction
            };
        }

        var filterCardBuilder = filterBuilder.addFilterCard().setParameters(filterCardParam);

        if (filterCardJson.attributes) {
            parseFilterCardContent(filterCardBuilder, filterCardJson.attributes);
        }
    }

    function parseFilterCardContent(filterBuilder, attributeContainerJson) {
        new ParameterObjectValidator(attributeContainerJson)
            .expectProperty("type");

        switch (attributeContainerJson.type) {
            case "BooleanContainer":
                parseBooleanContainer(parseFilterCardContent, filterBuilder, attributeContainerJson);
                break;
            case "Attribute":
                parseAttribute(filterBuilder, attributeContainerJson);
                break;
            default:
                throw new Error("Unexpected type on Attribute level!");
        }
    }

    function parseAttribute(filterBuilder, attributeJson) {
        new ParameterObjectValidator(attributeJson)
            .expectProperty("constraints");

        var attributeBuilder = filterBuilder.addAttribute().setParameters(attributeJson);

        if (attributeJson.constraints) {
            parseAttributeContent(attributeBuilder, attributeJson.constraints);
        }
    }

    function parseAttributeContent(attributeBuilder, constraintContainerJson) {
        new ParameterObjectValidator(constraintContainerJson)
            .expectProperty("type");

        switch (constraintContainerJson.type) {
            case "BooleanContainer":
                parseBooleanContainer(parseAttributeContent, attributeBuilder, constraintContainerJson);
                break;
            case "Expression":
                parseExpression(attributeBuilder, constraintContainerJson);
                break;
            default:
                throw new Error("Unexpected type on Expression level!");
        }
    }

    function parseExpression(attributeBuilder, constraintJson) {
        new ParameterObjectValidator(constraintJson)
            .expectProperty("operator")
            .expectProperty("value");

        attributeBuilder.addExpression().setParameters(constraintJson);
    }

    function parseBooleanContainer(currentLevelParsingFunction, filterBuilder, booleanContainerJson) {
        new ParameterObjectValidator(booleanContainerJson)
            .expectProperty("op")
            .expectProperty("content");

        var nextLevelBuilder;
        var nextLevelContent = booleanContainerJson.content;

        switch (booleanContainerJson.op) {
            case "AND":
                nextLevelBuilder = filterBuilder.addAnd();
                break;
            case "OR":
                nextLevelBuilder = filterBuilder.addOr();
                break;
            case "NOT":
                nextLevelBuilder = filterBuilder.addNot();
                break;
            default:
                throw new Error("Unexpected BooleanContainer op!");
        }

        nextLevelContent.forEach(function (element) {
            currentLevelParsingFunction(nextLevelBuilder, element);
        });
    }

    return {
        convertBM2IFR: parseFilter
    };
});
