#pragma once

#include "duckdb.hpp"
#include "duckdb/function/scalar_function.hpp"
#include "duckdb/main/extension_util.hpp"

namespace duckdb_llama {


void LlamaListModelsFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);
void LlamaDownloadModelFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);
void LlamaLoadModelFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);
void LlamaLoadModelForEmbeddingsFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);
void LlamaUnloadModelFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);
void LlamaListLoadedFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);


void LlamaGenerateFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);
void LlamaChatFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);
void LlamaEmbedFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);

void LlamaBatchProcessFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);


void LlamaStreamGenerateFunction(duckdb::ClientContext &context, duckdb::TableFunctionInput &data_p, duckdb::DataChunk &output);
void LlamaStreamChatFunction(duckdb::ClientContext &context, duckdb::TableFunctionInput &data_p, duckdb::DataChunk &output);


void LlamaStatusFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);
void LlamaModelInfoFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);
void LlamaGpuInfoFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result);


void RegisterModelManagementFunctions(duckdb::DatabaseInstance &db);
void RegisterGenerationFunctions(duckdb::DatabaseInstance &db);
void RegisterStatusFunctions(duckdb::DatabaseInstance &db);

} 
