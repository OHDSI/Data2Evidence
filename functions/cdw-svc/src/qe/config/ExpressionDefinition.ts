
//////////////////////////////////////////////////////////////////////
// 				Expression/Condition Validation Regex				//
//////////////////////////////////////////////////////////////////////

/* Missing functions:
Miscellaneous Functions:
- CONVERT_CURRENCY
	CONVERT_CURRENCY(
		{
			"{AMOUNT|SOURCE_UNIT|TARGET_UNIT|REFERENCE_DATE|CLIENT}" => <EXP>/<AGGR>
			| "{SCHEMA|CONVERSION_TYPE|LOOKUP|ERROR_HANDLING|ACCURACY|DATE_FORMAT|STEPS
				|CONFIGURATION_TABLE|PRECISIONS_TABLE|NOTATION_TABLE|RATES_TABLE|PREFACTORS_TABLE}" => <EXP>
		}
		, ...
	)
- CONVERT_UNIT
	CONVERT_UNIT(
		{
			"{QUANTITY|SOURCE_UNIT|TARGET_UNIT|CLIENT}" => <EXP>/<AGGR>
			| "{SCHEMA|ERROR_HANDLING|RATES_TABLE|DIMENSION_TABLE}" => <EXP>
		}
		,...
	)
*/

export class ExpressionDefinition {
    public expressions: Array<{ regex: RegExp; placeholder?: string }>;
    private aPlaceholders: string[] = ["CDM_COHORT_DEF", "RESULT_COHORT_DEF"];

    constructor(defaultPholderTableMap: any) {
        this.aPlaceholders = this.aPlaceholders.concat(Object.keys(defaultPholderTableMap).map((key) => key.replace("@", "")));

        this.expressions = [
            // Column access
            // /[@A-Z0-9_]+\."[ a-zA-Z0-9_-]+"|@[A-Z0-9_]+\.[A-Z0-9_]+/,
            { regex: new RegExp("@(" + this.aPlaceholders.join("|") + ")\\.(\\\"(?:(?:\\\"\\\")|[^\\\"])+\\\"|[a-zA-Z0-9_]+)"), placeholder: "<EXP>" },

            // Conditions
            { regex: /<((?:EXP)|(?:AGGR))>[\s]*IS[\s]+(NOT[\s]+)?NULL/, placeholder: "<COND>" },
            { regex: /<((?:EXP)|(?:AGGR))>[\s]*(=|>|<|>=|<=|!=|<>)[\s]*<((?:EXP)|(?:AGGR))>/, placeholder: "<COND>" },
            { regex: /<((?:EXP)|(?:AGGR))>[\s]+BETWEEN[\s]+<((?:EXP)|(?:AGGR))>[\s]+AND[\s]+<((?:EXP)|(?:AGGR))>/, placeholder: "<COND>" },
            { regex: /<COND>[\s]+(AND|OR)[\s]+<COND>/, placeholder: "<COND>" },
            { regex: /<((?:EXP)|(?:AGGR))>[\s]+LIKE[\s]+<((?:EXP)|(?:AGGR))>/, placeholder: "<COND>" },
            { regex: /NOT[\s]+<COND>/, placeholder: "<COND>" },
            { regex: /<((?:EXP)|(?:AGGR))>[\s]+IN[\s]+\([\s]*<EXP>([\s]*,[\s]*<EXP>)*[\s]*\)/, placeholder: "<COND>" },
            { regex: /\([\s]*<COND>[\s]*\)/, placeholder: "<COND>" },

            // Case
            { regex: /CASE[\s]+(?:WHEN[\s]+<COND>[\s]+THEN[\s]+<((?:EXP)|(?:AGGR))>[\s]+)+(?:ELSE[\s]+<((?:EXP)|(?:AGGR))>[\s]+)?END/ },
            { regex: /CASE[\s]+<((?:EXP)|(?:AGGR))>[\s]+(?:WHEN[\s]+<((?:EXP)|(?:AGGR))>[\s]+THEN[\s]+<((?:EXP)|(?:AGGR))>[\s]+)+(?:ELSE[\s]+<((?:EXP)|(?:AGGR))>[\s]+)?END/ },

            // Datatype Conversion Functions
            // FUNCTION(<EXP>/<AGGR>)
            { regex: /(TO_ALPHANUM|TO_BIGINT|TO_BINARY|TO_BLOB|TO_CLOB|TO_DATE|TO_DATS|TO_DECIMAL|TO_DOUBLE|TO_FIXEDCHAR|TO_INT|TO_INTEGER|TO_NCLOB|TO_NVARCHAR|TO_REAL|TO_SECONDDATE|TO_SMALLDECIMAL|TO_SMALLINT|TO_TIME|TO_TIMESTAMP|TO_TINYINT|TO_VARCHAR|TO_NUMBER)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*\)/ },
            // CAST (<EXP>/<AGGR> AS {TINYINT|SMALLINT|INTEGER|BIGINT|DECIMAL|SMALLDECIMAL|REAL|DOUBLE|ALPHANUM|VARCHAR|NVARCHAR|DAYDATE|DATE|TIME|SECONDDATE|TIMESTAMP})
            { regex: /CAST[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]+AS[\s]+(?:TINYINT|SMALLINT|INTEGER|BIGINT|DECIMAL|SMALLDECIMAL|REAL|DOUBLE|ALPHANUM|VARCHAR|NVARCHAR|DAYDATE|DATE|TIME|SECONDDATE|TIMESTAMP)[\s]*\)/ },

            // Date/Time Functions
            // FUNCTION
            { regex: /(CURRENT_DATE|CURRENT_TIMESTAMP|CURRENT_TIME|CURRENT_UTCDATE|CURRENT_UTCTIMESTAMP|CURRENT_UTCTIME)/, placeholder: "<EXP>" },
            // FUNCTION()
            { regex: /NOW[\s]*\([\s]*\)/, placeholder: "<EXP>" },
            // FUNCTION(<EXP>/<AGGR>)
            { regex: /(DAYNAME|DAYOFMONTH|DAYOFYEAR|HOUR|ISOWEEK|LAST_DAY|MINUTE|MONTH|MONTHNAME|NEXT_DAY|SECOND|WEEK|WEEKDAY|YEAR)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*\)/ },
            // FUNCTION(<EXP>/<AGGR>,<EXP>/<AGGR>)
            { regex: /(ADD_DAYS|ADD_MONTHS|ADD_SECONDS|ADD_YEARS|DAYS_BETWEEN|LOCALTOUTC|NANO100_BETWEEN|SECONDS_BETWEEN|UTCTOLOCAL)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*,[\s]*<((?:EXP)|(?:AGGR))>[\s]*\)/ },
            // FUNCTION(<EXP>/<AGGR>[,<EXP>/<AGGR>])
            { regex: /(QUARTER)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*(,[\s]*<((?:EXP)|(?:AGGR))>[\s]*)?\)/ },
            // FUNCTION(<EXP>/<AGGR>, <EXP>/<AGGR>, <EXP>/<AGGR> [, <EXP>/<AGGR>])
            { regex: /(ADD_WORKDAYS|WORKDAYS_BETWEEN)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*(,[\s]*<((?:EXP)|(?:AGGR))>[\s]*){2,3}\)/ },
            // EXTRACT ({YEAR|MONTH|DAY|HOUR|MINUTE|SECOND} FROM <EXP>/<AGGR>)
            { regex: /EXTRACT[\s]*\([\s]*(?:YEAR|MONTH|DAY|HOUR|MINUTE|SECOND)[\s]+FROM[\s]+<((?:EXP)|(?:AGGR))>[\s]*\)/ },

            // Numeric Functions
            // FUNCTION()
            { regex: /(RAND|RAND_SECURE)[\s]*\([\s]*\)/, placeholder: "<EXP>" },
            // FUNCTION(<EXP>/<AGGR>)
            { regex: /(ABS|ACOS|ASIN|ATAN|BITCOUNT|BITNOT|BINTOHEX|CEIL|COS|COSH|COT|EXP|FLOOR|LN|HEXTOBIN|SIGN|SIN|SINH|SQRT|TAN|TANH|UMINUS)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*\)/ },
            // FUNCTION(<EXP>/<AGGR>,<EXP>)
            { regex: /(ATAN2|BITAND|LOG|MOD|POWER)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*,[\s]*<EXP>[\s]*\)/ },
            // FUNCTION(<EXP>/<AGGR>,<EXP>/<AGGR>)
            { regex: /(BITOR|BITXOR)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*,[\s]*<((?:EXP)|(?:AGGR))>[\s]*\)/ },
            // FUNCTION(<EXP>/<AGGR>,<EXP>,<EXP>)
            { regex: /(BITSET|BITUNSET)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*,[\s]*<EXP>[\s]*,[\s]*<EXP>[\s]*\)/ },
            //
            { regex: /ROUND[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*(,[\s]*<EXP>[\s]*(,[\s]*((ROUND_HALF_UP|ROUND_HALF_DOWN|ROUND_HALF_EVEN|ROUND_UP|ROUND_DOWN|ROUND_CEILING|ROUND_FLOOR)|('(ROUND_HALF_UP|ROUND_HALF_DOWN|ROUND_HALF_EVEN|ROUND_UP|ROUND_DOWN|ROUND_CEILING|ROUND_FLOOR)')|("(ROUND_HALF_UP|ROUND_HALF_DOWN|ROUND_HALF_EVEN|ROUND_UP|ROUND_DOWN|ROUND_CEILING|ROUND_FLOOR)")))?)?[\s]*\)/ },

            // String Functions
            // FUNCTION(<EXP>/<AGGR>,<EXP>/<AGGR>[,<EXP>/<AGGR>])
            { regex: /(LPAD|RPAD|SUBSTR|SUBSTRING)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*(,[\s]*<((?:EXP)|(?:AGGR))>[\s]*){1,2}\)/ },
            // FUNCTION(<EXP>/<AGGR>[,<EXP>/<AGGR>])
            { regex: /(LTRIM|RTRIM)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*(,[\s]*<((?:EXP)|(?:AGGR))>[\s]*)?\)/ },
            // FUNCTION(<EXP>/<AGGR>)
            { regex: /(ASCII|BINTOSTR|BINTONHEX|CHAR|LCASE|LENGTH|LOWER|NCHAR|UCASE|UNICODE|UPPER)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*\)/ },
            // FUNCTION(<EXP>/<AGGR>,<EXP>/<AGGR>)
            { regex: /(CONCAT|HAMMING_DISTANCE|LEFT|RIGHT|STRTOBIN|SUBSTR_AFTER|SUBSTR_BEFORE)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*,[\s]*<((?:EXP)|(?:AGGR))>[\s]*\)/ },
            // FUNCTION(<EXP>/<AGGR>,<EXP>/<AGGR>,<EXP>/<AGGR>)
            { regex: /(REPLACE)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*(,[\s]*<((?:EXP)|(?:AGGR))>[\s]*){2}\)/ },
            // FUNCTION(<EXP>/<AGGR>,<EXP>,<EXP>,<EXP>)
            { regex: /(LOCATE)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*(,[\s]*<EXP>[\s]*){3}\)/ },
            //TRIM ([[LEADING|TRAILING|BOTH] <EXP>/<AGGR> FROM] <EXP>/<AGGR> )
            { regex: /(TRIM)[\s]*\([\s]*(?:(?:(?:LEADING|TRAILING|BOTH)[\s]+)?<((?:EXP)|(?:AGGR))>[\s]+FROM[\s]+)?<((?:EXP)|(?:AGGR))>[\s]*\)/ },

            // Miscellaneous Functions
            // FUNCTION
            { regex: /(CURRENT_SCHEMA|CURRENT_USER)/, placeholder: "<EXP>" },
            // FUNCTION(<EXP>/<AGGR>,<EXP>/<AGGR>)
            { regex: /(IFNULL|NULLIF)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*,[\s]*<((?:EXP)|(?:AGGR))>[\s]*\)/ },
            // FUNCTION(<EXP>/<AGGR>[,<EXP>/<AGGR>...])
            { regex: /(GREATEST|HASH_SHA256|LEAST)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*(,[\s]*<((?:EXP)|(?:AGGR))>[\s]*)*\)/ },
            // FUNCTION(<EXP>/<AGGR>,<EXP>/<AGGR>[,<EXP>/<AGGR>...])
            { regex: /COALESCE[\s]*\([\s]*<((?:EXP)|(?:AGGR))>([\s]*,[\s]*<((?:EXP)|(?:AGGR))>)+[\s]*\)/ },
            // MAP(<((?:EXP)|(?:AGGR))>,<EXP>,<EXP>[{,<EXP>,<EXP>}...],<EXP>)
            { regex: /MAP[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]*(,[\s]*<EXP>[\s]*,[\s]*<EXP>[\s]*)+[\s]*(,[\s]*<EXP>[\s]*)?\)/ },

            // aggregate expression
            // FUNCTION()
            { regex: /COUNT[\s]*\([\s]*\*[\s]*\)/, placeholder: "<AGGR>" },
            // FUNCTION([DISTINCT|ALL] <EXP>)
            { regex: /(COUNT|MIN|MAX|SUM|AVG|STDDEV|VAR)[\s]*\(([\s]*(DISTINCT|ALL))?[\s]*<EXP>[\s]*\)/, placeholder: "<AGGR>" },
            // FUNCTION(<EXP>[,<EXP>])
            { regex: /STRING_AGG[\s]*\([\s]*<EXP>[\s]*(,[\s]*<EXP>[\s]*)?\)/, placeholder: "<AGGR>" },

            // Regex functions
            // <EXP>/<AGGR> LIKE_REGEXPR <EXP>/<AGGR> [FLAG {i|m|s|x}]
            { regex: /<((?:EXP)|(?:AGGR))>[\s]+LIKE_REGEXPR[\s]+<((?:EXP)|(?:AGGR))>[\s]+FLAG[\s]+<((?:EXP)|(?:AGGR))>[\s]*/, placeholder: "<COND>" },
            // REPLACE_REGEXPR (<EXP>/<AGGR> IN <EXP>/<AGGR> WITH <EXP>/<AGGR>) LIKE_REGEXPR <EXP>/<AGGR> FLAG <EXP>/<AGGR>
            { regex: /REPLACE_REGEXPR[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]+IN[\s]+<((?:EXP)|(?:AGGR))>[\s]+WITH[\s]+<((?:EXP)|(?:AGGR))>[\s]*\)[\s]+LIKE_REGEXPR[\s]+<((?:EXP)|(?:AGGR))>[\s]+FLAG[\s]+<((?:EXP)|(?:AGGR))>[\s]*/, placeholder: "<COND>" },
            // LOCATE_REGEXPR([START|AFTER] <EXP>/<AGGR> [FLAG {i|m|s|x}] IN <EXP>/<AGGR> [FROM <EXP>/<AGGR>] [OCCURRENCE <EXP>/<AGGR>] [GROUP <EXP>/<AGGR>])
            { regex: /LOCATE_REGEXPR[\s]*\([\s]*(?:(?:START|AFTER)[\s]+)?<((?:EXP)|(?:AGGR))>[\s]+(?:FLAG[\s]+'[imsx]{1,4}'[\s]+)?IN[\s]+<((?:EXP)|(?:AGGR))>(?:[\s]+FROM[\s]+<((?:EXP)|(?:AGGR))>)?(?:[\s]+OCCURRENCE[\s]+<((?:EXP)|(?:AGGR))>)?(?:[\s]+GROUP[\s]+<((?:EXP)|(?:AGGR))>)?[\s]*\)/ },
            // OCCURRENCES_REGEXPR(<EXP>/<AGGR> [FLAG {i|m|s|x}] IN <EXP>/<AGGR> [FROM <EXP>/<AGGR>])
            { regex: /OCCURRENCES_REGEXPR[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]+(?:FLAG[\s]+'[imsx]{1,4}'[\s]+)?IN[\s]+<((?:EXP)|(?:AGGR))>(?:[\s]+FROM[\s]+<((?:EXP)|(?:AGGR))>)?[\s]*\)/ },
            // REPLACE_REGEXPR (<EXP>/<AGGR> [FLAG {i|m|s|x}] IN <EXP>/<AGGR> [WITH <EXP>/<AGGR>] [FROM <EXP>/<AGGR>] [OCCURRENCE <EXP>/<AGGR>])
            { regex: /REPLACE_REGEXPR[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]+(?:FLAG[\s]+'[imsx]{1,4}'[\s]+)?IN[\s]+<((?:EXP)|(?:AGGR))>(?:[\s]+WITH[\s]+<((?:EXP)|(?:AGGR))>)?(?:[\s]+FROM[\s]+<((?:EXP)|(?:AGGR))>)?(?:[\s]+OCCURRENCE[\s]+<((?:EXP)|(?:AGGR))>)?[\s]*\)/ },
            // {SUBSTRING_REGEXPR|SUBSTR_REGEXPR} (<EXP>/<AGGR> [FLAG {i|m|s|x}] IN <EXP>/<AGGR> [FROM <EXP>/<AGGR>] [ OCCURRENCE <EXP>/<AGGR>] [GROUP <EXP>/<AGGR>])
            { regex: /(?:SUBSTRING_REGEXPR|SUBSTR_REGEXPR)[\s]*\([\s]*<((?:EXP)|(?:AGGR))>[\s]+(?:FLAG[\s]+'[imsx]{1,4}'[\s]+)?IN[\s]+<((?:EXP)|(?:AGGR))>(?:[\s]+FROM[\s]+<((?:EXP)|(?:AGGR))>)?(?:[\s]+OCCURRENCE[\s]+<((?:EXP)|(?:AGGR))>)?(?:[\s]+GROUP[\s]+<((?:EXP)|(?:AGGR))>)?[\s]*\)/ },

            // <EXP>/<AGGR> AND REGEXP_MATCHES(<EXP>/<AGGR>, <EXP>/<AGGR>)
            { regex: /<((?:EXP)|(?:AGGR))>[\s]*AND REGEXP_MATCHES[\s]*\(<((?:EXP)|(?:AGGR))>,[\s]*<((?:EXP)|(?:AGGR))>\)?[\s]*/, placeholder: "<COND>" },

            // <EXP>/<AGGR>/<COND> AND JARO_SIMILARITY(<EXP>,<EXP>) (>=|<=|>|<) x.xx
            { regex: /<((?:EXP)|(?:AGGR)|(?:COND))> AND JARO_SIMILARITY\(<EXP>,[\s]*<EXP>\)[\s]*(>=|<=|>|<) \d*\.\d+/, placeholder: "<COND>" },
            // Operators
            { regex: /\([\s]*<((?:EXP)|(?:AGGR))>[\s]*\)/ },
            { regex: /<((?:EXP)|(?:AGGR))>[\s]*(\*|\/|\+|-|\|\|)[\s]*<((?:EXP)|(?:AGGR))>/ },

            // Constants
            { regex: /'(?:(?:'')|[^'])*'/, placeholder: "<EXP>" },
            { regex: /\d+(\.\d+)?/, placeholder: "<EXP>" },
            { regex: /NULL/, placeholder: "<EXP>" },

            // misc
            { regex: /-[\s]*<((?:EXP)|(?:AGGR))>/ },
            { regex: /\+[\s]*<((?:EXP)|(?:AGGR))>/ },

        ];
    }

}
