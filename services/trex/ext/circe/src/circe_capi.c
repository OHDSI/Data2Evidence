#include "duckdb_extension.h"
#include "circe_functions.h"

DUCKDB_EXTENSION_EXTERN

DUCKDB_EXTENSION_ENTRYPOINT(duckdb_connection connection, duckdb_extension_info info, struct duckdb_extension_access *access) {
    RegisterCirceHelloFunction(connection);
    RegisterCirceOpenSSLVersionFunction(connection);
    RegisterCirceJsonToSqlFunction(connection);
    RegisterCirceSqlRenderFunction(connection);
    RegisterCirceSqlTranslateFunction(connection);
    RegisterCirceSqlRenderTranslateFunction(connection);
    
    return true;
}
