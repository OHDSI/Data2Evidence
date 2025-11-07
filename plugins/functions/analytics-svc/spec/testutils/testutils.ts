/**
 * Apply a function the unquoted parts of an SQL string
 * @private
 * @param {string} inputSql The SQL string to be processed
 * @param {function}  func Function to apply to unquoted parts.
 * @returns {string} Processed SQL string.
 */

export function applyToUnquotedParts(inputSql, func) {
    let processedSql = "";
    let escapeRexExp = /[\'\"]/g;
    let quotationCharactersUsed = inputSql.match(escapeRexExp);
    if (quotationCharactersUsed) {
        let quotationSplitArray = inputSql.split(escapeRexExp);
        let i;
        for (i = 0; i < quotationSplitArray.length - 1; i++) {
            // Uppercase every second element (those inside quotation marks).
            if (i % 2 === 0) {
                processedSql += func(quotationSplitArray[i]);
            } else {
                processedSql += quotationSplitArray[i];
            }
            processedSql += quotationCharactersUsed[i];
        }
        processedSql += func(quotationSplitArray[quotationSplitArray.length - 1]);
    } else {
        processedSql = func(inputSql);
    }
    return processedSql;
}

/**
 * Uppercase the unquoted parts of an SQL string
 *
 * @private
 * @param {string}
 *            inputSql The SQL string to be uppercased.
 * @returns {string} Uppercased SQL string.
 */
export function uppercaseUnquotedParts(inputSql) {
    let uppercasedSql = applyToUnquotedParts(inputSql,  (str) => {
        return str.toUpperCase();
    });
    return uppercasedSql;
};

/*
 * Replace all multiple spaces in a string with single spaces.
 *
 * @param {string}
 *            str
 * @returns {string} String with all multiple spaces replaced with a single
 *          space.
 */
export function evenOutSpaces(str) {
    return str.split(/\s+/gm).join(" ").trim();
}

/*
 * Pad all parantheses - '(' & ')' only - with spaces.
 *
 * @param str
 * @returns {string} String with all parentheses padded with spaces.
 */
export function spaceParantheses(str) {
    return str.replace(/\(/gm, " ( ").replace(/\)/gm, " ) ");
}

/**
 * Convert an SQL string into a standard format to allow unambiguous
 * comparisons.
 *
 * @param {string}
 *            rawSql SQL string to be normalized.
 * @returns {string} Normalized SQL string.
 */
export function normalizeSql(rawSql) {
    let spacedParenthesesSql = spaceParantheses(rawSql);
    let evenSpacedSql = evenOutSpaces(spacedParenthesesSql);
    let normalizedSql = uppercaseUnquotedParts(evenSpacedSql);
    return normalizedSql;
}

/**
 * Replace characters in a string with the escaped version for a regular
 * expression in JS.
 *
 * @param {string}
 *            str String to be escaped
 * @returns {string} String with regular expression reserved characters escaped
 */
export function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

/*
 * Escape all backslashes (\) in the passed string so that resulting string can
 * be used as a regular expression in JSs RegExp() constructor.
 *
 * @param {string}
 *            str String to be escaped
 * @returns {string} String with regular expression reserved characters doubly
 *          escaped
 */
export function escapedSqlRegExpString(regExpStr) {
    return regExpStr.replace(/\\/g, "\\");
}

/**
 * Replace the SQL aliases in a string with matched regular expressions.
 *
 * @param {string}
 *            sqlStr SQL string in which to do replacements
 * @param {string[]}
 *            aliases Array of aliases
 * @returns {string} Input string with substitutions carried out
 */
export function replaceNamedAliases(sqlStr, aliases) {
    if (aliases.length === 0) {
        return sqlStr;
    }
    // Regexp for matching all the passed aliases
    let aliasRegExp = new RegExp(" \(" + aliases.join("|") + "\)\( |.|,|$\)",
        "g");
    // Replacement every occurrence of an alias in the unquoted parts of the SQL
    // command.
    // We use a closure and the replace() function to replace the first
    // occurrence of a given alias with a capture group and every subsequent
    // occurrence of that alias by a back-reference to the appropriate capture
    // group.
    let seenAliases = {};
    let aliasCounter = 1;
    let processedString = applyToUnquotedParts(sqlStr,  (argStr) => {
        let processedArgStr = argStr.replace(aliasRegExp,  (fullMatch, capture1, capture2) => {
            let result;
            if (seenAliases[capture1]) {
                result = " \\" + seenAliases[capture1] + capture2;
            } else {
                result = " (\\\w+)" + capture2;
                seenAliases[capture1] = aliasCounter;
                aliasCounter++;
            }
            return result;
        });
        return processedArgStr;
    });
    return processedString;
}

/**
 * Find column and tables aliases in the input string.
 *
 * @param {string}
 *            sqlStr Normalized SQL string
 * @returns {string[]} Arrays containing aliases as strings
 */
export function findAliases(sqlStr) {
    // Match both column and table alias definition - we must capture both
    // together since we need all aliases in the order of occurrence in order to
    // replace them correct in replaceNamedAliases().
    // For column aliases, we simply match "X AS [alias]"
    // For table aliases, we match both "X FROM Y [alias]" and "X JOIN Y
    // [alias]", taking care that we don't mistake a reserved SQL command for an
    // alias.
    /* tslint:disable-next-line:max-line-length */
    let aliasRegExp = /(?: AS (\w+)(?: |,|$))|(?:(?:FROM|(?:JOIN(?: \\\()?)) (?:(?:\")?\w+(?:\")?\\\.)?(?:\")?(?:\w+|(?:\w+\\\.)*\w+::(?:\w+\\\.)*\w+)(?:\")?(?! (?:WHERE|GROUP|HAVING)) (\w+)(?:$| ))/g;
    let match = aliasRegExp.exec(sqlStr);
    let aliases = [];
    while (match !== null) {
        if (match[1]) {
            aliases.push(match[1]);
        } else {
            aliases.push(match[2]);
        }
        match = aliasRegExp.exec(sqlStr);
    }
    return aliases;
}

/*
 * Replace all SQL aliases with matching regular expression
 *
 * @param {string}
 *            sqlStr Escaped SQL string to be processed
 * @returns {string} String with aliases replaced
 */
export function replaceAliases(sqlStr) {
    let aliases = findAliases(sqlStr);
    let processedString = replaceNamedAliases(sqlStr, aliases);
    return processedString;
}

/*
 * Return a regular expression that matches a given SQL string after
 * normalization with normalizeSql().
 *
 * @param {string}
 *            sqlString Raw SQL string
 * @returns {RegExp} SRegular expression for matching this SQL.
 */
export function getSqlRegExpString(rawSqlString) {
    let sNormalizedSql = normalizeSql(rawSqlString);
    let sEscapedSqlString = escapeRegExp(sNormalizedSql);
    let sEscapedSqlRegExpString = replaceAliases(sEscapedSqlString);
    return sEscapedSqlRegExpString;
};


/*
 * Return the string (minus spaces at start or end) that is sandwiched between
 * one of the startStrings and one of the endStrings (or the end of the string).
 *
 * @param {string} str String containing sandwiched string
 * @param {string[]} startStrings String that may start the "sandwich"
 * @param {string[]} endStrings String that may end the "sandwich"
 * @returns {str} Sandwiched string (or undefined, if not found)
 */
export function getSandwichedString(str, startStrings, endStrings) {
    let startRegExp = startStrings.join("|");
    let endRegExp = "$";
    if (endStrings.length > 0) {
        endRegExp += "|" + endStrings.join("|");
    }
    let re = new RegExp("((?:" + startRegExp + ")\\s*)(.+?)(?:\\s*(?:" + endRegExp + "))", "g");
    let sandwichStr = re.exec(str)[2];
    return sandwichStr;
}

/*
 * Function that checks if to objects contain the same (visible) values.
 *
 * @param {object}
 *            obj1
 * @param {object}
 *            obj2
 */
export function objectEquals(obj1, obj2) {
    let key = null;
    let seenProperties = [];
    for (key in obj1) {
        if (obj1.hasOwnProperty(key)) {
            if (!obj2.hasOwnProperty(key) || obj1[key] !== obj2[key]) {
                return false;
            } else {
                seenProperties.push(key);
            }
        }
    }
    for (key in obj2) {
        if (obj2.hasOwnProperty(key) && seenProperties.indexOf(key) === -1) {
            if (!obj1.hasOwnProperty(key) || obj1[key] !== obj2[key]) {
                return false;
            }
        }
    }
    return true;
}

/**
 * Implementation of custom Jasmine matcher verifying if two arrays contain the
 * same elements (regardless of order).
 *
 * WARNING! This function alters the second argument!
 *
 * @param {object[]}
 *            actualObjectArray Actual array of objects
 * @param {object[]}
 *            expectedObjectArray Expected array of objects
 * @returns {bool} true if the arrays contain the same objects, otherwise false
 */
export function toContainSameObjectsAsImpl(actualObjectArray, expectedObjectArray) {
    let i;
    let j;
    let passVal = false;
    if (actualObjectArray.length === expectedObjectArray.length) {
        let foundMatch;
        passVal = true;
        for (i = 0; i < actualObjectArray.length; i++) {
            foundMatch = false;
            for (j = 0; j < expectedObjectArray.length; j++) {
                if (objectEquals(actualObjectArray[i], expectedObjectArray[j])) {
                    // Found matching objects
                    foundMatch = true;
                    // Manipulating array we're iterating over is OK since
                    // we
                    // break out of the loop
                    expectedObjectArray.splice(j, 1);
                    break;
                }
            }
            if (!foundMatch) {
                passVal = false;
                break;
            }
        }
    }
    return passVal;
}

/*
 * Implementation of custom Jasmine matcher verifying if strings contain equivalent
 * SQL.
 *
 * @param {string}
 *            actualObjectArray Actual array of objects
 * @param {string}
 *            expectedObjectArray Expected array of objects
 * @returns {bool} true if the strings contain equivalent SQL, false otherwise
 */
export function toEqualAsSql(str1, str2) {
    return (normalizeSql(str1) === normalizeSql(str2));
}


/*
 * Check if if strings contain equivalent
 * SQL.
 *
 * @param {string}
 *            actualObjectArray Actual array of objects
 * @param {string}
 *            expectedObjectArray Expected array of objects
 * @returns {bool} true if the strings contain equivalent SQL, false otherwise
 */
export function expectEqualAsSql(str1, str2) {
    expect(normalizeSql(str1)).toBe(normalizeSql(str2));
}


// Check if two query objects are essentially equal,
// i.e. if the sql strings are equal and the parameters
// are the same
export function expectEqualAsQueryObject(q1, q2) {
    let query1 = q1._prepareQuery();
    let query2 = q2._prepareQuery();
    expect(query1.placeholders.length).toBe(query2.placeholders.length);
    let p1;
    let p2;
    for (let i = 0; i < query1.placeholders.length; i++) {
        p1 = query1.placeholders[i];
        p2 = query2.placeholders[i];
        expect(p1.type).toBe(p2.type);
        expect(p1.value).toBe(p2.value);
    }

    return expectEqualAsSql(query1.sql, query2.sql);
}

/**
 * Generate an integer hash from a string.
 *
 * This should be equivalent to Java's hashCode() function. Adapted from
 * http://stackoverflow.com/questions/7616461/generate-a-hash-from-string-in-javascript-jquery
 *
 * @param {string}
 *            str String to be hashed
 * @returns {Number} Integer hash
 */
export function hashString(str) {
    let hash = 0;
    let i;
    let char;
    if (str.length === 0) {
        return hash;
    }
    for (i = 0; i < str.length; i++) {
        char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}


/**
 * Log (via Jasmine) second passed since a previous time and return current time.
 *
 * @param {Date} timeThen Time from which to measure time (if null, th logged time will be set to 0.0
 * @param {string} msg Message to display with timestamp (optional)
 * @returns {number} Milliseconds passed between fixed past date and now
 */
export function logSecondsPassed(timeThen, msg) {
    let timeNow = new Date().getTime();
    let outputMsg = "";
    if (typeof msg !== "undefined") {
        outputMsg += msg + ": ";
    }
    if (timeThen) {
        outputMsg += "" + (timeNow - timeThen) / 1000.0;
    } else {
        outputMsg += "0.0";
    }
    return timeNow;
}
