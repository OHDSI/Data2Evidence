function parseBookmarkElementToIFRBackend(object) {
  if (object.type === "BooleanContainer") {
    const content = [];
    const boolContainerObj = { content: [] };
    Object.keys(object).forEach((key) => {
      if (key === "type" || object[key] === null) {
        // do nothing
      } else if (key === "content") {
        for (let i = 0; i < object.content.length; i += 1) {
          content.push(parseBookmarkElementToIFRBackend(object.content[i]));
        }
        boolContainerObj.content = content;
      } else {
        boolContainerObj[key] = object[key];
      }
    });
    return boolContainerObj;
  } else if (object.type === "FilterCard") {
    const filterCardObj = { op: "AND" };
    Object.keys(object).forEach((key) => {
      if (key === "type" || object[key] === null) {
        // do nothing
      } else if (key === "attributes") {
        filterCardObj["_" + key] = parseBookmarkElementToIFRBackend(
          object[key],
        );
      } else {
        filterCardObj["_" + key] = object[key];
      }
    });
    return filterCardObj;
  } else if (object.type === "Attribute") {
    const attributeObj = {};
    Object.keys(object).forEach((key) => {
      if (key === "type" || object[key] === null) {
        // do nothing
      } else if (key === "constraints") {
        attributeObj["_" + key] = parseBookmarkElementToIFRBackend(object[key]);
      } else {
        attributeObj["_" + key] = object[key];
      }
    });
    return attributeObj;
  } else if (object.type === "Expression") {
    const constraintObj = {};
    Object.keys(object).forEach((key) => {
      if (key === "type" || object[key] === null) {
        // do nothing
      } else {
        constraintObj["_" + key] = object[key];
      }
    });
    return constraintObj;
  }
}

export async function bookmarkToIFRBackend(bookmark) {
  const bookmarkObj =
    typeof bookmark === "object" ? bookmark : JSON.parse(bookmark);

  //if input is IFR, then do not convert
  if (bookmarkObj.axes && bookmarkObj.cards && bookmarkObj.configData) {
    return bookmarkObj;
  }

  if (Object.keys(bookmarkObj).length === 0) {
    return {};
  }

  const bookmarkFilter = bookmarkObj.filter;

  let ifrFilter = {};
  if (bookmarkFilter && bookmarkFilter.cards) {
    ifrFilter = parseBookmarkElementToIFRBackend(bookmarkFilter.cards);
  }
  let ifrConfig = {};
  let ifrAdditionalInfo = {};

  if (bookmarkFilter && bookmarkFilter.configMetadata) {
    ifrConfig = {
      configId: bookmarkFilter.configMetadata.id,
      configVersion: bookmarkFilter.configMetadata.version,
    };
  }

  if (bookmarkObj && bookmarkObj.chartType === "km") {
    let kmEventIdentifier = "kmEventIdentifier";
    let kmEndEventIdentifier = "kmEndEventIdentifier";
    let kmStartEventOccurence = "kmStartEventOccurence";
    let kmEndEventOccurence = "kmEndEventOccurence";
    if (bookmarkFilter.selected_event && bookmarkFilter.selected_event.key) {
      ifrAdditionalInfo[kmEventIdentifier] = bookmarkFilter.selected_event.key;
    }
    if (
      bookmarkFilter.selected_end_event &&
      bookmarkFilter.selected_end_event.key
    ) {
      ifrAdditionalInfo[kmEndEventIdentifier] =
        bookmarkFilter.selected_end_event.key;
    }
    if (
      bookmarkFilter.selected_start_event_occ &&
      bookmarkFilter.selected_start_event_occ.key
    ) {
      ifrAdditionalInfo[kmStartEventOccurence] =
        bookmarkFilter.selected_start_event_occ.key;
    }
    if (
      bookmarkFilter.selected_end_event_occ &&
      bookmarkFilter.selected_end_event_occ.key
    ) {
      ifrAdditionalInfo[kmEndEventOccurence] =
        bookmarkFilter.selected_end_event_occ.key;
    }
  }

  if (bookmarkObj && bookmarkObj.axisSelection) {
    let axes = [];
    for (let i = 0; i < bookmarkObj.axisSelection.length; i += 1) {
      const axis = bookmarkObj.axisSelection[i];
      if (axis.attributeId !== "n/a") {
        const axisType = axis.categoryId.substring(0, 1);
        const axisSequence = parseInt(axis.categoryId.substring(1), 10);
        const attributeId = axis.attributeId;
        const instanceID = attributeId.split(".attributes.")[0];
        const configPathArr = instanceID.split(".");
        if (configPathArr.length > 1) {
          configPathArr.pop();
        }
        const configPath = configPathArr.join(".");
        let axesObj = {
          axis: axisType,
          seq: axisSequence,
          configPath,
          instanceID,
          id: attributeId,
        };

        if (axis.binsize || axis.binsize === "0") {
          let binsizeText = "binsize";
          axesObj[binsizeText] = parseInt(axis.binsize, 10);
        }

        if (axis.aggregation) {
          let aggregationText = "aggregation";
          axesObj[aggregationText] = axis.aggregation;
        }

        axes.push(axesObj);
      }
    }
    let axesString = "axes";
    ifrAdditionalInfo[axesString] = axes;
  }

  const returnObj: any = {
    guarded: bookmarkObj.guarded,
    language: bookmarkObj.language,
  };

  if (ifrFilter && Object.keys(ifrFilter).length > 0) {
    let cardsText = "cards";
    returnObj[cardsText] = ifrFilter;
  }

  if (ifrConfig && Object.keys(ifrConfig).length > 0) {
    let configText = "configData";
    returnObj[configText] = ifrConfig;
  }

  Object.keys(ifrAdditionalInfo).forEach((key) => {
    returnObj[key] = ifrAdditionalInfo[key];
  });

  // used in genomics pcount request
  if (bookmarkObj.hasOwnProperty("genomics")) {
    returnObj.genomics = bookmarkObj.genomics; 
  }

  return returnObj;
}


