#pragma once

#include "duckdb_extension.h"

void RegisterCirceHelloFunction(duckdb_connection connection);
void RegisterCirceOpenSSLVersionFunction(duckdb_connection connection);
void RegisterCirceJsonToSqlFunction(duckdb_connection connection);
void RegisterCirceSqlRenderFunction(duckdb_connection connection);
void RegisterCirceSqlTranslateFunction(duckdb_connection connection);
void RegisterCirceSqlRenderTranslateFunction(duckdb_connection connection);
