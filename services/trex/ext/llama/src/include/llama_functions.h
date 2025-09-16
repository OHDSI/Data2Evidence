#pragma once

#include "duckdb_extension.h"

#ifdef __cplusplus
extern "C" {
#endif


void llama_list_models_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_download_model_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_load_model_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_load_model_for_embeddings_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_unload_model_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_list_loaded_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);


void llama_generate_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_chat_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_embed_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_batch_process_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_get_batch_result_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);


void llama_stream_generate_bind(duckdb_bind_info info);
void llama_stream_generate_init(duckdb_init_info info);
void llama_stream_generate_function(duckdb_function_info info, duckdb_data_chunk output);

void llama_stream_chat_bind(duckdb_bind_info info);
void llama_stream_chat_init(duckdb_init_info info);
void llama_stream_chat_function(duckdb_function_info info, duckdb_data_chunk output);


void llama_status_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_model_info_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_gpu_info_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);


void llama_get_performance_metrics_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_get_memory_status_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_get_context_pool_status_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_cleanup_contexts_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);


void llama_test_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);
void llama_openssl_version_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output);


bool llama_initialize_backend(void);
void llama_cleanup_backend(void);

#ifdef __cplusplus
}
#endif
