import JSZip from "jszip";

export function createZip({
  resultSet,
  selectedAttributes,
  noValue,
}: {
  resultSet: any[];
  selectedAttributes: any[];
  noValue: string;
}) {
  const zipContainer = new JSZip();
  resultSet.forEach((resultPerInteraction) => {
    zipContainer.file(
      `${resultPerInteraction.entity.replace(/[^a-zA-Z0-9]/g, "")}.csv`,
      `${_buildCSV({
        headers: _getCSVHeaders(selectedAttributes, resultPerInteraction.entity),
        result: resultPerInteraction.data,
        noValue,
      })}`
    );
  });
  return zipContainer;
}

function _buildCSV({
  headers,
  result,
  delimiter = ",",
  noValue,
}: {
  headers: string[];
  result: any[];
  delimiter?: string;
  noValue: string;
}): string {
  result = _updatePidHeaderInResults(result);
  let csv = "";
  let line: string[] = [];
  const rowSeparator = "\r\n";
  const universalNewLineSeparator = "\n";
  const separatorRegex = new RegExp(`${delimiter}|${rowSeparator}|${universalNewLineSeparator}`, "g");
  if (headers.filter((h) => h === "patient.attributes.pid").length === 0) {
    headers.push("patient.attributes.pid");
  }
  if (headers.length > 0) {
    headers.forEach((header) =>
      line.push(
        scanForCharsToEscapeAndSurroundQuotes({
          columnValue: header,
          separatorRegex,
          noValue,
        })
      )
    );
    csv += line.join(delimiter) + rowSeparator;
    result.forEach((r, idx) => {
      line = [];
      headers.forEach((header) => {
        line.push(
          scanForCharsToEscapeAndSurroundQuotes({
            columnValue: result[idx][header],
            separatorRegex,
            noValue,
          })
        );
      });
      csv += line.join(delimiter) + rowSeparator;
    });
  }
  return csv;
}

function _getCSVHeaders(attributeList: any[], entityName: string): string[] {
  return attributeList.reduce((header, currAttr) => {
    if (currAttr.configPath === entityName) {
      header.push(currAttr.id);
    }
    return header;
  }, []);
}

function _updatePidHeaderInResults(result: any): any[] {
  if (result && result.length > 0) {
    let pidHeaderChangeRequired = false;
    let oldPidHeader = "";
    Object.keys(result[0]).forEach((h) => {
      if (h.indexOf("attributes.pid") !== -1 && h !== "patient.attributes.pid") {
        pidHeaderChangeRequired = true;
        oldPidHeader = h;
      }
    });

    if (pidHeaderChangeRequired && oldPidHeader !== "") {
      result.forEach((el: any) => {
        const pid = el[oldPidHeader];
        delete el[oldPidHeader];
        el[`patient.attributes.pid`] = pid;
      });
    }
  }
  return result;
}

function scanForCharsToEscapeAndSurroundQuotes({
  columnValue,
  separatorRegex,
  noValue,
}: {
  columnValue: any;
  separatorRegex: RegExp;
  noValue: string;
}) {
  if (columnValue === noValue) {
    return "";
  }
  if (
    columnValue &&
    columnValue.constructor !== Number &&
    columnValue.constructor !== Boolean &&
    columnValue.constructor !== Date
  ) {
    if (columnValue.constructor === Array) {
      columnValue = columnValue.map((value) => {
        return scanForCharsToEscapeAndSurroundQuotes({
          columnValue: value,
          separatorRegex,
          noValue,
        });
      });
      return columnValue;
    } else if (typeof columnValue === "string") {
      columnValue = columnValue.replace(/\\n/g, "\n");
      columnValue = columnValue.replace(/\\r/g, "\r");
      return _surroundWithQuotes(columnValue, separatorRegex);
    } else if (columnValue.constructor === Object) {
      const keys = Object.keys(columnValue);
      if (keys) {
        keys.forEach((key) => {
          columnValue[key] = scanForCharsToEscapeAndSurroundQuotes({
            columnValue: columnValue[key],
            separatorRegex,
            noValue,
          });
        });
      }
      return columnValue;
    }
  }
  return columnValue;
}

function _surroundWithQuotes(columnValue: string, separatorRegex: RegExp) {
  columnValue = columnValue.replace(/\"/g, `""`);
  if (columnValue && columnValue.search(separatorRegex) !== -1) {
    columnValue = `\"${columnValue}\"`;
  }
  return columnValue;
}
