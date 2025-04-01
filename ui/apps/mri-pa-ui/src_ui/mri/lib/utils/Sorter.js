sap.ui.define(function () {
    "use strict";

    /**
     * Perform Sorting to data based on the categories available
     */

     /**
     * Internal Function to remove bracket in negative number
     * @param   {string}  String to be formatted
     * @returns {string}  Resulting String with Bracket Removed if exist
     */
    function _removeBracket(st) {
        if(st && typeof st === "string" && st[0] === "(" && st[st.length - 1] === ")") {
            return st.substring(1, st.length - 1);
        } else {
            return st;
        }
    }

    /**
     * A reccursive function to sort data according to the category available
     * @param   {object[]}  constantCategories  Array of object containing the sortable categories. Produced by calling buildSortableCategories function below.
     * @param   {object[]}  data                Array of object containing the data to be sorted.
     * @param   {string}    sorttype            Ascending or Descending Sorting. Should contain either MRI_PA_CHART_SORT_ASCENDING or MRI_PA_CHART_SORT_DESCENDING
     * @param   {int}       categoryIndex       Sorting Level. 0 Corresponds to sorting of X1, 1 Corresponds to sorting of X2, etc.
     * @returns {object[]}  Resulting sorted data
     */
    function sortCategory(constantCategories, data, sortType, categoryIndex) {
        if (!data || data.length === 0) {
            return [];
        }
        if (!constantCategories || !constantCategories[categoryIndex]) {
            return data;
        }
        var currentCategorySorted = JSON.parse(JSON.stringify(data));
        var physicalData = [];

        var sortedCategories = constantCategories[categoryIndex].id;
        var sortFunction = (sortType === "MRI_PA_CHART_SORT_ASCENDING" ?
            function (a, b) {
                if (a[sortedCategories] === "NoValue" || a[sortedCategories] === "No Value") {
                    return -1;
                } else if (b[sortedCategories] === "NoValue" || b[sortedCategories] === "No Value") {
                    return 1;
                } else if (!isNaN(a[sortedCategories]) && !isNaN(b[sortedCategories])) {
                    return a[sortedCategories] - b[sortedCategories];
                } else if (constantCategories[categoryIndex].type === "num" && !isNaN(parseFloat(_removeBracket(a[sortedCategories]))) && !isNaN(parseFloat(_removeBracket(b[sortedCategories])))) {
                    return parseFloat(_removeBracket(a[sortedCategories])) - parseFloat(_removeBracket(b[sortedCategories]));
                } else if (constantCategories[categoryIndex].binsize) {
                    return parseFloat(_removeBracket(a[sortedCategories].split(" - ").pop())) - parseFloat(_removeBracket(b[sortedCategories].split(" - ").pop()));
                } else {
                    return a[sortedCategories].localeCompare(b[sortedCategories]);
                }
            } :
            function (a, b) {
                if (a[sortedCategories] === "NoValue" || a[sortedCategories] === "No Value") {
                    return -1;
                } else if (b[sortedCategories] === "NoValue" || b[sortedCategories] === "No Value") {
                    return 1;
                } else if (!isNaN(a[sortedCategories]) && !isNaN(b[sortedCategories])) {
                    return b[sortedCategories] - a[sortedCategories];
                } else if (constantCategories[categoryIndex].type === "num" && !isNaN(parseFloat(_removeBracket(a[sortedCategories]))) && !isNaN(parseFloat(_removeBracket(b[sortedCategories])))) {
                    return parseFloat(_removeBracket(b[sortedCategories])) - parseFloat(_removeBracket(a[sortedCategories]));
                } else if (constantCategories[categoryIndex].binsize) {
                    return parseFloat(_removeBracket(b[sortedCategories].split(" - ").pop())) - parseFloat(_removeBracket(a[sortedCategories].split(" - ").pop()));
                } else {
                    return b[sortedCategories].localeCompare(a[sortedCategories]);
                }
            }
        );

        currentCategorySorted.sort(sortFunction);
        var currentCategoryValue = currentCategorySorted[0][sortedCategories];
        var nextCategorySorting = [];
        for (var i = 0; i < currentCategorySorted.length; i++) {
            if (currentCategorySorted[i][sortedCategories] === currentCategoryValue) {
                nextCategorySorting.push(currentCategorySorted[i]);
            } else {
                var nextCategorySorted = nextCategorySorting;

                if (categoryIndex < constantCategories.length - 1) {
                    nextCategorySorted = sortCategory(constantCategories, nextCategorySorting, sortType, categoryIndex + 1);
                }

                for (var ii = 0; ii < nextCategorySorted.length; ii++) {
                    physicalData.push(nextCategorySorted[ii]);
                }

                nextCategorySorting = [];
                nextCategorySorting.push(currentCategorySorted[i]);
                currentCategoryValue = currentCategorySorted[i][sortedCategories];
            }
        }

        nextCategorySorted = nextCategorySorting;
        if (categoryIndex < constantCategories.length - 1) {
            nextCategorySorted = sortCategory(constantCategories, nextCategorySorting, sortType, categoryIndex + 1);
        }

        for (ii = 0; ii < nextCategorySorted.length; ii++) {
            physicalData.push(nextCategorySorted[ii]);
        }

        return physicalData;
    }

    /**
     * Build Sortable Categories Object which will be used by this sort. The object contain path, type, and binning information of the axis
     * @param   {object}    data    Response from a backend query. Should contain categories data.
     * @returns {object[]}  Array of object containing the axes information to be sorted.
     */
    function buildSortableCategories(data) {
        var sortableCategories = [];
        for (var i = 0; i < data.categories.length; i++) {
            if (data.categories[i].axis === 1 && data.categories[i].id !== "dummy_category") {
                var obj = {
                    id: data.categories[i].id,
                    type: data.categories[i].type,
                    binsize: data.categories[i].binsize
                };
                sortableCategories.push(obj);
            }
        }
        return sortableCategories;
    }

    return {
        sortCategory: sortCategory,
        buildSortableCategories: buildSortableCategories
    };
}, true);
