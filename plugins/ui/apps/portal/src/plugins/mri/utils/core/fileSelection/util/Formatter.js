sap.ui.define(
  function () {
    "use strict";
    var Formatter = {
      formatDate: function (sDate) {
        if (sDate === null) {
          return "---";
        } else {
          return sDate ? new Date(sDate).toLocaleString() : "";
        }
      },
      messageText: function (fvalue) {
        if (fvalue === null) {
          return "---";
        } else {
          return fvalue;
        }
      },
      getCheckmark: function (bSelected, aChildren) {
        return aChildren
          ? "sap-icon://folder"
          : bSelected
          ? "sap-icon://accept"
          : "";
      },
      // Returns a list item type depending on whether we're on
      // a branch or a leaf node of the hierarchy. We determine
      // that we're on a leaf if there's a FileName
      listItemType: function (aFolders) {
        return aFolders ? "Navigation" : "Active";
      },
      getCount: function (iSelected, iCount) {
        var sCountDisplay = [iSelected, iCount]
          .filter(function (element) {
            return element;
          })
          .join(" / ");
        return sCountDisplay;
      },
      setFilter: function (oFilterData) {
        return (
          oFilterData.selectedStatus.length < oFilterData.status.length ||
          oFilterData.lastImported.begin.enabled ||
          oFilterData.lastImported.end.enabled ||
          oFilterData.lastModified.begin.enabled ||
          oFilterData.lastModified.end.enabled
        );
      },
    };
    return Formatter;
  } /* bExport= */,
  true
);
