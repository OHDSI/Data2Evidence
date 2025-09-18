#include "include/llama_functions.h"
#include "duckdb_extension.h"

#include <stdio.h>
#include <stdlib.h>
#include <string.h>


DUCKDB_EXTENSION_EXTERN


#ifdef __cplusplus
extern "C" {
#endif


extern bool cpp_llama_initialize(void);
extern void cpp_llama_cleanup(void);
extern char* cpp_llama_list_models(void);
extern char* cpp_llama_download_model(const char* source, const char* name, const char* options_json);
extern char* cpp_llama_load_model(const char* path, const char* config_json);
extern char* cpp_llama_load_model_for_embeddings(const char* path, const char* config_json);
extern char* cpp_llama_unload_model(const char* name);
extern char* cpp_llama_list_loaded(void);
extern char* cpp_llama_generate(const char* model, const char* prompt, const char* options_json);
extern char* cpp_llama_chat(const char* model, const char* messages_json, const char* options_json);
extern char* cpp_llama_embed(const char* model, const char* text);
extern char* cpp_llama_batch_process(const char* json_request);
extern char* cpp_llama_status(void);
extern char* cpp_llama_model_info(const char* name);
extern char* cpp_llama_gpu_info(void);


extern char* cpp_llama_get_performance_metrics(void);
extern char* cpp_llama_get_memory_status(void);
extern char* cpp_llama_get_context_pool_status(void);
extern char* cpp_llama_cleanup_contexts(void);


extern char* cpp_llama_start_streaming(const char* model, const char* prompt, const char* options_json);
extern char* cpp_llama_get_stream_token(const char* session_id);
extern char* cpp_llama_stop_streaming(const char* session_id);
extern char* cpp_llama_get_batch_result(const char* request_id);

#ifdef __cplusplus
}
#endif


static char* get_string_from_vector(duckdb_vector vector, idx_t row) {
    
    duckdb_string_t *string_data = (duckdb_string_t*)duckdb_vector_get_data(vector);
    duckdb_string_t str = string_data[row];
    
    
    uint32_t len = duckdb_string_t_length(str);
    const char* data = duckdb_string_t_data(&str);
    
    
    char* result = (char*)duckdb_malloc(len + 1);
    if (result && data) {
        memcpy(result, data, len);
        result[len] = '\0';
    } else if (result) {
        result[0] = '\0';  
    }
    return result;
}


static void set_string_result(duckdb_vector output, idx_t row, const char* result) {
    if (result) {
        duckdb_vector_assign_string_element(output, row, result);
    } else {
        duckdb_vector_assign_string_element(output, row, "Error: NULL result");
    }
}


bool llama_initialize_backend(void) {
    return cpp_llama_initialize();
}

void llama_cleanup_backend(void) {
    cpp_llama_cleanup();
}


void llama_test_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector input_vector = duckdb_data_chunk_get_vector(input, 0);
    
    for (idx_t i = 0; i < count; i++) {
        char* name = get_string_from_vector(input_vector, i);
        if (name) {
            char result[256];
            snprintf(result, sizeof(result), "Llama %s 🦙 [C API working!]", name);
            set_string_result(output, i, result);
            duckdb_free(name);
        } else {
            set_string_result(output, i, "Llama (no name) 🦙 [C API working!]");
        }
    }
}

void llama_openssl_version_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector input_vector = duckdb_data_chunk_get_vector(input, 0);
    
    for (idx_t i = 0; i < count; i++) {
        char* name = get_string_from_vector(input_vector, i);
        if (name) {
            char result[512];
            snprintf(result, sizeof(result), "Llama %s, my linked OpenSSL version is (C API implementation)", name);
            set_string_result(output, i, result);
            duckdb_free(name);
        } else {
            set_string_result(output, i, "Llama (no name), my linked OpenSSL version is (C API implementation)");
        }
    }
}


void llama_list_models_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    
    for (idx_t i = 0; i < count; i++) {
        char* result = cpp_llama_list_models();
        set_string_result(output, i, result ? result : "Error: Failed to list models");
        if (result) free(result);
    }
}

void llama_download_model_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector source_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector name_vector = duckdb_data_chunk_get_vector(input, 1);
    duckdb_vector options_vector = duckdb_data_chunk_get_vector(input, 2);
    
    for (idx_t i = 0; i < count; i++) {
        char* source = get_string_from_vector(source_vector, i);
        char* name = get_string_from_vector(name_vector, i);
        char* options_json = get_string_from_vector(options_vector, i);
        
        if (source) {
            char* result = cpp_llama_download_model(source, name, options_json);
            set_string_result(output, i, result ? result : "Error: Failed to download model");
            if (result) free(result);
            duckdb_free(source);
        } else {
            set_string_result(output, i, "Error: Source parameter is required");
        }
        
        if (name) duckdb_free(name);
        if (options_json) duckdb_free(options_json);
    }
}

void llama_load_model_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector path_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector config_vector = duckdb_data_chunk_get_vector(input, 1);
    
    for (idx_t i = 0; i < count; i++) {
        char* path = get_string_from_vector(path_vector, i);
        char* config_json = get_string_from_vector(config_vector, i);
        
        if (path) {
            char* result = cpp_llama_load_model(path, config_json);
            set_string_result(output, i, result ? result : "Error: Failed to load model");
            if (result) free(result);
            duckdb_free(path);
        } else {
            set_string_result(output, i, "Error: Path parameter is required");
        }
        
        if (config_json) duckdb_free(config_json);
    }
}

void llama_load_model_for_embeddings_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector path_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector config_vector = duckdb_data_chunk_get_vector(input, 1);
    
    for (idx_t i = 0; i < count; i++) {
        char* path = get_string_from_vector(path_vector, i);
        char* config_json = get_string_from_vector(config_vector, i);
        
        if (path) {
            char* result = cpp_llama_load_model_for_embeddings(path, config_json);
            set_string_result(output, i, result ? result : "Error: Failed to load model for embeddings");
            if (result) free(result);
            duckdb_free(path);
        } else {
            set_string_result(output, i, "Error: Path parameter is required");
        }
        
        if (config_json) duckdb_free(config_json);
    }
}

void llama_unload_model_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector name_vector = duckdb_data_chunk_get_vector(input, 0);
    
    for (idx_t i = 0; i < count; i++) {
        char* name = get_string_from_vector(name_vector, i);
        
        if (name) {
            char* result = cpp_llama_unload_model(name);
            set_string_result(output, i, result ? result : "Error: Failed to unload model");
            if (result) free(result);
            duckdb_free(name);
        } else {
            set_string_result(output, i, "Error: Name parameter is required");
        }
    }
}

void llama_list_loaded_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    
    for (idx_t i = 0; i < count; i++) {
        char* result = cpp_llama_list_loaded();
        set_string_result(output, i, result ? result : "Error: Failed to list loaded models");
        if (result) free(result);
    }
}


void llama_generate_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector model_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector prompt_vector = duckdb_data_chunk_get_vector(input, 1);
    duckdb_vector options_vector = duckdb_data_chunk_get_vector(input, 2);
    
    for (idx_t i = 0; i < count; i++) {
        char* model = get_string_from_vector(model_vector, i);
        char* prompt = get_string_from_vector(prompt_vector, i);
        char* options_json = get_string_from_vector(options_vector, i);
        
        if (model && prompt) {
            char* result = cpp_llama_generate(model, prompt, options_json);
            set_string_result(output, i, result ? result : "Error: Failed to generate text");
            if (result) free(result);
        } else {
            set_string_result(output, i, "Error: Model and prompt parameters are required");
        }
        
        if (model) duckdb_free(model);
        if (prompt) duckdb_free(prompt);
        if (options_json) duckdb_free(options_json);
    }
}

void llama_chat_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector model_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector messages_vector = duckdb_data_chunk_get_vector(input, 1);
    duckdb_vector options_vector = duckdb_data_chunk_get_vector(input, 2);
    
    for (idx_t i = 0; i < count; i++) {
        char* model = get_string_from_vector(model_vector, i);
        char* messages_json = get_string_from_vector(messages_vector, i);
        char* options_json = options_vector ? get_string_from_vector(options_vector, i) : NULL;
        
        if (model && messages_json) {
            char* result = cpp_llama_chat(model, messages_json, options_json);
            set_string_result(output, i, result ? result : "Error: Failed to process chat");
            if (result) free(result);
        } else {
            set_string_result(output, i, "Error: Model and messages_json parameters are required");
        }
        
        if (model) duckdb_free(model);
        if (messages_json) duckdb_free(messages_json);
        if (options_json) duckdb_free(options_json);
    }
}

void llama_embed_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector model_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector text_vector = duckdb_data_chunk_get_vector(input, 1);
    
    for (idx_t i = 0; i < count; i++) {
        char* model = get_string_from_vector(model_vector, i);
        char* text = get_string_from_vector(text_vector, i);
        
        if (model && text) {
            char* result = cpp_llama_embed(model, text);
            set_string_result(output, i, result ? result : "Error: Failed to generate embeddings");
            if (result) free(result);
        } else {
            set_string_result(output, i, "Error: Model and text parameters are required");
        }
        
        if (model) duckdb_free(model);
        if (text) duckdb_free(text);
    }
}

void llama_batch_process_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector json_vector = duckdb_data_chunk_get_vector(input, 0);
    
    for (idx_t i = 0; i < count; i++) {
        char* json_request = get_string_from_vector(json_vector, i);
        
        if (json_request) {
            char* result = cpp_llama_batch_process(json_request);
            set_string_result(output, i, result ? result : "Error: Failed to process batch request");
            if (result) free(result);
            duckdb_free(json_request);
        } else {
            set_string_result(output, i, "Error: JSON request parameter is required");
        }
    }
}

void llama_get_batch_result_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector id_vector = duckdb_data_chunk_get_vector(input, 0);
    
    for (idx_t i = 0; i < count; i++) {
        char* batch_id = get_string_from_vector(id_vector, i);
        
        if (batch_id) {
            char* result = cpp_llama_get_batch_result(batch_id);
            set_string_result(output, i, result ? result : "Error: Failed to get batch result");
            if (result) free(result);
            duckdb_free(batch_id);
        } else {
            set_string_result(output, i, "Error: Batch ID parameter is required");
        }
    }
}


void llama_status_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    
    for (idx_t i = 0; i < count; i++) {
        char* result = cpp_llama_status();
        set_string_result(output, i, result ? result : "Error: Failed to get status");
        if (result) free(result);
    }
}

void llama_model_info_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    duckdb_vector name_vector = duckdb_data_chunk_get_vector(input, 0);
    
    for (idx_t i = 0; i < count; i++) {
        char* name = get_string_from_vector(name_vector, i);
        
        if (name) {
            char* result = cpp_llama_model_info(name);
            set_string_result(output, i, result ? result : "Error: Failed to get model info");
            if (result) free(result);
            duckdb_free(name);
        } else {
            set_string_result(output, i, "Error: Name parameter is required");
        }
    }
}

void llama_gpu_info_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    
    for (idx_t i = 0; i < count; i++) {
        char* result = cpp_llama_gpu_info();
        set_string_result(output, i, result ? result : "Error: Failed to get GPU info");
        if (result) free(result);
    }
}


typedef struct {
    char* model;
    char* prompt;
    char* options_json;
    char* session_id;
    bool session_started;
    bool finished;
} llama_stream_generate_state;

void llama_stream_generate_bind(duckdb_bind_info info) {
    
    idx_t param_count = duckdb_bind_get_parameter_count(info);
    
    
    if (param_count < 2) {
        duckdb_bind_set_error(info, "stream_generate requires at least model and prompt parameters");
        return;
    }
    
    
    llama_stream_generate_state* bind_state = malloc(sizeof(llama_stream_generate_state));
    bind_state->model = NULL;
    bind_state->prompt = NULL; 
    bind_state->options_json = NULL;
    bind_state->session_id = NULL;
    bind_state->session_started = false;
    bind_state->finished = false;
    
    
    duckdb_value model_param = duckdb_bind_get_parameter(info, 0);
    duckdb_value prompt_param = duckdb_bind_get_parameter(info, 1);
    
    if (duckdb_get_type_id(duckdb_get_value_type(model_param)) == DUCKDB_TYPE_VARCHAR) {
        char* model_str = duckdb_get_varchar(model_param);
        bind_state->model = strdup(model_str);
        duckdb_free(model_str);
    }
    
    if (duckdb_get_type_id(duckdb_get_value_type(prompt_param)) == DUCKDB_TYPE_VARCHAR) {
        char* prompt_str = duckdb_get_varchar(prompt_param);
        bind_state->prompt = strdup(prompt_str);
        duckdb_free(prompt_str);
    }
    
    
    if (param_count > 2) {
        duckdb_value options_param = duckdb_bind_get_parameter(info, 2);
        if (duckdb_get_type_id(duckdb_get_value_type(options_param)) == DUCKDB_TYPE_VARCHAR) {
            char* options_str = duckdb_get_varchar(options_param);
            bind_state->options_json = strdup(options_str);
            duckdb_free(options_str);
        }
    }
    
    if (!bind_state->options_json) {
        bind_state->options_json = strdup("{}"); 
    }
    
    duckdb_bind_set_bind_data(info, bind_state, free);
    
    
    duckdb_bind_add_result_column(info, "token", duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
    duckdb_bind_add_result_column(info, "is_final", duckdb_create_logical_type(DUCKDB_TYPE_BOOLEAN));
}

void llama_stream_generate_init(duckdb_init_info info) {
    
    llama_stream_generate_state* bind_state = (llama_stream_generate_state*)duckdb_init_get_bind_data(info);
    
    
    llama_stream_generate_state* state = malloc(sizeof(llama_stream_generate_state));
    state->model = bind_state->model ? strdup(bind_state->model) : NULL;
    state->prompt = bind_state->prompt ? strdup(bind_state->prompt) : NULL;
    state->options_json = bind_state->options_json ? strdup(bind_state->options_json) : NULL;
    state->session_id = NULL;
    state->session_started = false;
    state->finished = false;
    
    duckdb_init_set_init_data(info, state, free);
}

void llama_stream_generate_function(duckdb_function_info info, duckdb_data_chunk output) {
    llama_stream_generate_state* state = (llama_stream_generate_state*)duckdb_function_get_init_data(info);
    
    if (state->finished) {
        return; 
    }
    
    
    if (!state->session_started) {
        
        char* result = cpp_llama_start_streaming(state->model, state->prompt, state->options_json);
        
        if (result) {
            
            const char* session_start = strstr(result, "\"session_id\":");
            if (session_start) {
                session_start += 13; 
                while (*session_start == ' ' || *session_start == '"') session_start++;
                const char* session_end = session_start;
                while (*session_end && *session_end != '"' && *session_end != ',' && *session_end != '}') session_end++;
                
                if (session_end > session_start) {
                    size_t session_len = session_end - session_start;
                    state->session_id = malloc(session_len + 1);
                    if (state->session_id) {
                        strncpy(state->session_id, session_start, session_len);
                        state->session_id[session_len] = '\0';
                        state->session_started = true;
                    }
                }
            }
            free(result);
        }
        
        if (!state->session_started) {
            state->finished = true;
            return;
        }
    }
    
    
    if (state->session_id) {
        char* token_result = cpp_llama_get_stream_token(state->session_id);
        
        if (token_result) {
            duckdb_vector token_vector = duckdb_data_chunk_get_vector(output, 0);
            duckdb_vector is_final_vector = duckdb_data_chunk_get_vector(output, 1);
            
            
            bool is_final = false;
            char* token_text = "";
            
            const char* is_final_pos = strstr(token_result, "\"is_final\":");
            if (is_final_pos) {
                is_final_pos += 11; 
                while (*is_final_pos == ' ') is_final_pos++;
                is_final = (strncmp(is_final_pos, "true", 4) == 0);
            }
            
            if (!is_final) {
                const char* token_start = strstr(token_result, "\"token\":");
                if (token_start) {
                    token_start += 8; 
                    while (*token_start == ' ' || *token_start == '"') token_start++;
                    const char* token_end = token_start;
                    while (*token_end && *token_end != '"') {
                        if (*token_end == '\\') token_end++; 
                        token_end++;
                    }
                    
                    if (token_end > token_start) {
                        size_t token_len = token_end - token_start;
                        char* extracted_token = malloc(token_len + 1);
                        if (extracted_token) {
                            strncpy(extracted_token, token_start, token_len);
                            extracted_token[token_len] = '\0';
                            duckdb_vector_assign_string_element(token_vector, 0, extracted_token);
                            free(extracted_token);
                        }
                    }
                }
            } else {
                duckdb_vector_assign_string_element(token_vector, 0, "");
                state->finished = true;
                
                
                if (state->session_id) {
                    cpp_llama_stop_streaming(state->session_id);
                    free(state->session_id);
                    state->session_id = NULL;
                }
            }
            
            
            bool* is_final_data = (bool*)duckdb_vector_get_data(is_final_vector);
            is_final_data[0] = is_final;
            
            duckdb_data_chunk_set_size(output, 1);
            free(token_result);
        } else {
            state->finished = true;
        }
    }
}


typedef struct {
    char* model;
    char* messages_json;
    char* options_json;
    char* session_id;
    bool session_started;
    bool finished;
} llama_stream_chat_state;

void llama_stream_chat_bind(duckdb_bind_info info) {
    
    idx_t param_count = duckdb_bind_get_parameter_count(info);
    
    
    if (param_count < 2) {
        duckdb_bind_set_error(info, "stream_chat requires at least model and messages_json parameters");
        return;
    }
    
    
    llama_stream_chat_state* bind_state = malloc(sizeof(llama_stream_chat_state));
    bind_state->model = NULL;
    bind_state->messages_json = NULL; 
    bind_state->options_json = NULL;
    bind_state->session_id = NULL;
    bind_state->session_started = false;
    bind_state->finished = false;
    
    
    duckdb_value model_param = duckdb_bind_get_parameter(info, 0);
    duckdb_value messages_param = duckdb_bind_get_parameter(info, 1);
    
    if (duckdb_get_type_id(duckdb_get_value_type(model_param)) == DUCKDB_TYPE_VARCHAR) {
        char* model_str = duckdb_get_varchar(model_param);
        bind_state->model = strdup(model_str);
        duckdb_free(model_str);
    }
    
    if (duckdb_get_type_id(duckdb_get_value_type(messages_param)) == DUCKDB_TYPE_VARCHAR) {
        char* messages_str = duckdb_get_varchar(messages_param);
        bind_state->messages_json = strdup(messages_str);
        duckdb_free(messages_str);
    }
    
    
    if (param_count > 2) {
        duckdb_value options_param = duckdb_bind_get_parameter(info, 2);
        if (duckdb_get_type_id(duckdb_get_value_type(options_param)) == DUCKDB_TYPE_VARCHAR) {
            char* options_str = duckdb_get_varchar(options_param);
            bind_state->options_json = strdup(options_str);
            duckdb_free(options_str);
        }
    }
    
    if (!bind_state->options_json) {
        bind_state->options_json = strdup("{}"); 
    }
    
    duckdb_bind_set_bind_data(info, bind_state, free);
    
    duckdb_bind_add_result_column(info, "token", duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR));
    duckdb_bind_add_result_column(info, "is_final", duckdb_create_logical_type(DUCKDB_TYPE_BOOLEAN));
}

void llama_stream_chat_init(duckdb_init_info info) {
    
    llama_stream_chat_state* bind_state = (llama_stream_chat_state*)duckdb_init_get_bind_data(info);
    
    
    llama_stream_chat_state* state = malloc(sizeof(llama_stream_chat_state));
    state->model = bind_state->model ? strdup(bind_state->model) : NULL;
    state->messages_json = bind_state->messages_json ? strdup(bind_state->messages_json) : NULL;
    state->options_json = bind_state->options_json ? strdup(bind_state->options_json) : NULL;
    state->session_id = NULL;
    state->session_started = false;
    state->finished = false;
    
    duckdb_init_set_init_data(info, state, free);
}

void llama_stream_chat_function(duckdb_function_info info, duckdb_data_chunk output) {
    llama_stream_chat_state* state = (llama_stream_chat_state*)duckdb_function_get_init_data(info);
    
    if (state->finished) {
        return; 
    }
    
    
    if (!state->session_started) {
        
        char* result = cpp_llama_chat(state->model, state->messages_json, state->options_json);
        
        if (result) {
            
            
            const char* session_start = strstr(result, "\"session_id\":");
            if (session_start) {
                session_start += 13; 
                while (*session_start == ' ' || *session_start == '"') session_start++;
                const char* session_end = session_start;
                while (*session_end && *session_end != '"' && *session_end != ',' && *session_end != '}') session_end++;
                
                if (session_end > session_start) {
                    size_t session_len = session_end - session_start;
                    state->session_id = malloc(session_len + 1);
                    if (state->session_id) {
                        strncpy(state->session_id, session_start, session_len);
                        state->session_id[session_len] = '\0';
                        state->session_started = true;
                    }
                }
            } else {
                
                duckdb_vector token_vector = duckdb_data_chunk_get_vector(output, 0);
                duckdb_vector is_final_vector = duckdb_data_chunk_get_vector(output, 1);
                
                duckdb_vector_assign_string_element(token_vector, 0, result);
                bool* is_final_data = (bool*)duckdb_vector_get_data(is_final_vector);
                is_final_data[0] = true;
                
                state->finished = true;
                duckdb_data_chunk_set_size(output, 1);
                free(result);
                return;
            }
            free(result);
        }
        
        if (!state->session_started) {
            state->finished = true;
            return;
        }
    }
    
    
    if (state->session_id) {
        char* token_result = cpp_llama_get_stream_token(state->session_id);
        
        if (token_result) {
            duckdb_vector token_vector = duckdb_data_chunk_get_vector(output, 0);
            duckdb_vector is_final_vector = duckdb_data_chunk_get_vector(output, 1);
            
            
            bool is_final = false;
            
            const char* is_final_pos = strstr(token_result, "\"is_final\":");
            if (is_final_pos) {
                is_final_pos += 11; 
                while (*is_final_pos == ' ') is_final_pos++;
                is_final = (strncmp(is_final_pos, "true", 4) == 0);
            }
            
            if (!is_final) {
                const char* token_start = strstr(token_result, "\"token\":");
                if (token_start) {
                    token_start += 8; 
                    while (*token_start == ' ' || *token_start == '"') token_start++;
                    const char* token_end = token_start;
                    while (*token_end && *token_end != '"') {
                        if (*token_end == '\\') token_end++; 
                        token_end++;
                    }
                    
                    if (token_end > token_start) {
                        size_t token_len = token_end - token_start;
                        char* extracted_token = malloc(token_len + 1);
                        if (extracted_token) {
                            strncpy(extracted_token, token_start, token_len);
                            extracted_token[token_len] = '\0';
                            duckdb_vector_assign_string_element(token_vector, 0, extracted_token);
                            free(extracted_token);
                        }
                    }
                }
            } else {
                duckdb_vector_assign_string_element(token_vector, 0, "");
                state->finished = true;
                
                
                if (state->session_id) {
                    cpp_llama_stop_streaming(state->session_id);
                    free(state->session_id);
                    state->session_id = NULL;
                }
            }
            
            
            bool* is_final_data = (bool*)duckdb_vector_get_data(is_final_vector);
            is_final_data[0] = is_final;
            
            duckdb_data_chunk_set_size(output, 1);
            free(token_result);
        } else {
            state->finished = true;
        }
    }
}



void llama_get_performance_metrics_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    
    for (idx_t i = 0; i < count; i++) {
        char* result = cpp_llama_get_performance_metrics();
        set_string_result(output, i, result ? result : "{\"error\": \"Failed to get performance metrics\"}");
        if (result) free(result);
    }
}

void llama_get_memory_status_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    
    for (idx_t i = 0; i < count; i++) {
        char* result = cpp_llama_get_memory_status();
        set_string_result(output, i, result ? result : "{\"error\": \"Failed to get memory status\"}");
        if (result) free(result);
    }
}

void llama_get_context_pool_status_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    
    for (idx_t i = 0; i < count; i++) {
        char* result = cpp_llama_get_context_pool_status();
        set_string_result(output, i, result ? result : "{\"error\": \"Failed to get context pool status\"}");
        if (result) free(result);
    }
}

void llama_cleanup_contexts_function(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t count = duckdb_data_chunk_get_size(input);
    
    for (idx_t i = 0; i < count; i++) {
        char* result = cpp_llama_cleanup_contexts();
        set_string_result(output, i, result ? result : "{\"error\": \"Failed to cleanup contexts\"}");
        if (result) free(result);
    }
}
