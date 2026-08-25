// Data characterization for webapi datasets writes its Achilles tables into the
// dataset's own results schema on the SOURCE database. A TrexConnection defaults
// to the DuckDB cache alias, which does not hold those tables, so the schema has
// to be qualified with the source-database catalog (`<databaseCode>__srcdb`) —
// the same convention CohortEndpoint uses for webapi cohort tables. This applies
// to BigQuery too: analytics-svc routes ordinary CDM reads to the cache to avoid
// billing live queries, but DC results exist only on the source.
export const resolveDcResultsSchema = ({
    isTrexConnection,
    useSourceConnection,
    databaseCode,
    resultsSchema,
}: {
    isTrexConnection: boolean;
    useSourceConnection: boolean;
    databaseCode: string;
    resultsSchema: string;
}): string => {
    if (!isTrexConnection || !useSourceConnection || !databaseCode) {
        return resultsSchema;
    }
    return `${databaseCode}__srcdb.${resultsSchema}`;
};
