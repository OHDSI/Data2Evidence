sap.ui.define([], function () {

    var eventBus = sap.ui.getCore().getEventBus();

    return {
        setIFR: function (arg) {
            eventBus.publish("VUE_SET_IFR", { ifr: arg.ifr, backendIFR: arg.backendIFR, topics: arg.topics });
        },
        setVariantFiltercards: function (variantFilterCards) {
            // Do nothing, this method is deprecated as the "query.ts" is managing to update variantFilterCards
            // whenever there is a change
        },
        fireNewCardAdded: function (cardName) {
            eventBus.publish("VUE_NEW_FILTER_CARD", { cardName: cardName });
        }
    };

});