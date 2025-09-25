#include "duckdb_extension.h"
#include "include/llama_functions.h"

#include <stdio.h>
#include <string.h>

static bool extension_initialized = false;

DUCKDB_EXTENSION_ENTRYPOINT(duckdb_connection connection, duckdb_extension_info info, struct duckdb_extension_access *access) {
    if (extension_initialized) {
        return true;
    }

    
    if (!llama_initialize_backend()) {
        fprintf(stderr, "Warning: Failed to initialize Llama backend\n");
    }

    
    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_list_models");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_list_models_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_download_model");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_download_model_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_load_model");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_load_model_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_load_model_for_embeddings");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_load_model_for_embeddings_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_unload_model");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_unload_model_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_list_loaded");
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_list_loaded_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    
    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_generate");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_generate_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_chat");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_chat_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_embed");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_embed_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_batch_process");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_batch_process_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_get_batch_result");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_get_batch_result_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

        
    

    
    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_status");
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_status_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_model_info");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR)); 
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_model_info_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_gpu_info");
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_gpu_info_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    
    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_get_performance_metrics");
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_get_performance_metrics_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_get_memory_status");
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_get_memory_status_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_get_context_pool_status");
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_get_context_pool_status_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_cleanup_contexts");
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_cleanup_contexts_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    
    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_test_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    {
        duckdb_scalar_function function = duckdb_create_scalar_function();
        duckdb_scalar_function_set_name(function, "llama_openssl_version");
        duckdb_scalar_function_add_parameter(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_return_type(function, duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
        duckdb_scalar_function_set_function(function, llama_openssl_version_function);
        duckdb_register_scalar_function(connection, function);
        duckdb_destroy_scalar_function(&function);
    }

    extension_initialized = true;
    
    return true;  
}
