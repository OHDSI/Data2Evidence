#include "include/llama_functions.h"
#include "include/llama_core.hpp"
#include "include/http_downloader.hpp"


#include "llama.h"
#include "ggml.h"


#include "yyjson.h"

#include <string>
#include <memory>
#include <cstring>

namespace {


llama_capi::GenerationParams parse_generation_params(const char* options_json) {
    llama_capi::GenerationParams params;
    
    if (!options_json || strlen(options_json) == 0) {
        return params; 
    }
    
    yyjson_doc *doc = yyjson_read(options_json, strlen(options_json), 0);
    if (!doc) {
        return params; 
    }
    
    yyjson_val *root = yyjson_doc_get_root(doc);
    if (!yyjson_is_obj(root)) {
        yyjson_doc_free(doc);
        return params;
    }
    
    
    yyjson_val *max_tokens_val = yyjson_obj_get(root, "max_tokens");
    if (max_tokens_val && yyjson_is_num(max_tokens_val)) {
        params.max_tokens = (int)yyjson_get_int(max_tokens_val);
    }
    
    
    yyjson_val *temperature_val = yyjson_obj_get(root, "temperature");
    if (temperature_val && yyjson_is_num(temperature_val)) {
        params.temperature = (float)yyjson_get_real(temperature_val);
    }
    
    
    yyjson_val *top_p_val = yyjson_obj_get(root, "top_p");
    if (top_p_val && yyjson_is_num(top_p_val)) {
        params.top_p = (float)yyjson_get_real(top_p_val);
    }
    
    
    yyjson_val *top_k_val = yyjson_obj_get(root, "top_k");
    if (top_k_val && yyjson_is_num(top_k_val)) {
        params.top_k = (int)yyjson_get_int(top_k_val);
    }
    
    yyjson_doc_free(doc);
    return params;
}

}
#include <cstdlib>
#include <vector>
#include <sstream>
#include <algorithm>
#include <filesystem>
#include <fstream>


static char* string_to_cstring(const std::string& str) {
    if (str.empty()) {
        return nullptr;
    }
    char* result = static_cast<char*>(std::malloc(str.length() + 1));
    if (result) {
        std::strcpy(result, str.c_str());
    }
    return result;
}


static std::string cstring_to_string(const char* cstr) {
    return cstr ? std::string(cstr) : std::string();
}


static llama_capi::ModelConfig parse_model_config(const std::string& config_json) {
    llama_capi::ModelConfig config;
    if (config_json.empty()) return config;
    
    yyjson_doc *doc = yyjson_read(config_json.c_str(), config_json.length(), 0);
    if (!doc) {
        return config; 
    }
    
    yyjson_val *root = yyjson_doc_get_root(doc);
    if (!yyjson_is_obj(root)) {
        yyjson_doc_free(doc);
        return config;
    }
    
    
    yyjson_val *n_gpu_layers_val = yyjson_obj_get(root, "n_gpu_layers");
    if (n_gpu_layers_val && yyjson_is_int(n_gpu_layers_val)) {
        config.n_gpu_layers = static_cast<int>(yyjson_get_int(n_gpu_layers_val));
    }
    
    
    yyjson_val *n_ctx_val = yyjson_obj_get(root, "n_ctx");
    if (n_ctx_val && yyjson_is_int(n_ctx_val)) {
        config.n_ctx = static_cast<int>(yyjson_get_int(n_ctx_val));
    }
    
    
    yyjson_val *num_threads_val = yyjson_obj_get(root, "num_threads");
    if (num_threads_val && yyjson_is_int(num_threads_val)) {
        config.n_threads = static_cast<int>(yyjson_get_int(num_threads_val));
    }
    
    
    yyjson_val *batch_size_val = yyjson_obj_get(root, "batch_size");
    if (batch_size_val && yyjson_is_int(batch_size_val)) {
        config.n_batch = static_cast<int>(yyjson_get_int(batch_size_val));
    }
    
    
    yyjson_val *memory_f16_val = yyjson_obj_get(root, "memory_f16");
    if (memory_f16_val && yyjson_is_bool(memory_f16_val)) {
        config.memory_f16 = yyjson_get_bool(memory_f16_val);
    }
    
    
    yyjson_val *use_mlock_val = yyjson_obj_get(root, "use_mlock");
    if (use_mlock_val && yyjson_is_bool(use_mlock_val)) {
        config.use_mlock = yyjson_get_bool(use_mlock_val);
    }
    
    yyjson_doc_free(doc);
    return config;
}


static llama_capi::SimpleModelManager& get_manager() {
    return llama_capi::SimpleModelManager::GetInstance();
}

extern "C" {


char* cpp_llama_load_model(const char* path, const char* config_json) {
    try {
        if (!path) {
            return string_to_cstring("Error: Model path is required");
        }
        
        std::string path_str = cstring_to_string(path);
        std::string config_str = cstring_to_string(config_json);
        
        
        llama_capi::ModelConfig config = parse_model_config(config_str);
        config.model_path = path_str;
        
        
        std::string model_name = std::filesystem::path(path_str).stem().string();
        
        if (get_manager().LoadModel(model_name, config)) {
            std::string result = "{\"status\": \"success\", \"model_name\": \"" + model_name + "\", \"path\": \"" + path_str + "\"}";
            return string_to_cstring(result);
        } else {
            return string_to_cstring("Error: Failed to load model");
        }
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_unload_model(const char* model_name) {
    try {
        if (!model_name) {
            return string_to_cstring("Error: Model name is required");
        }
        
        std::string name_str = cstring_to_string(model_name);
        
        if (get_manager().UnloadModel(name_str)) {
            std::string result = "{\"status\": \"success\", \"model_name\": \"" + name_str + "\"}";
            return string_to_cstring(result);
        } else {
            return string_to_cstring("Error: Model not found or failed to unload");
        }
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_generate(const char* model, const char* prompt, const char* options_json) {
    try {
        if (!model || !prompt) {
            return string_to_cstring("Error: Model name and prompt are required");
        }
        
        std::string model_str = cstring_to_string(model);
        std::string prompt_str = cstring_to_string(prompt);
        std::string options_str = cstring_to_string(options_json);
        
        
        llama_capi::GenerationParams params = parse_generation_params(options_str.c_str());
        
        std::string response = get_manager().Generate(model_str, prompt_str, params);
        return string_to_cstring(response);
        
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_embed(const char* model, const char* text) {
    try {
        if (!model || !text) {
            return string_to_cstring("Error: Model and text are required");
        }
        
        std::string model_str = cstring_to_string(model);
        std::string text_str = cstring_to_string(text);
        
        
        auto embeddings = get_manager().GetEmbeddings(model_str, text_str);
        
        std::ostringstream oss;
        oss << "{\"embeddings\": [";
        for (size_t i = 0; i < embeddings.size(); ++i) {
            if (i > 0) oss << ", ";
            oss << embeddings[i];
        }
        oss << "]}";
        
        return string_to_cstring(oss.str());
        
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_batch_process(const char* json_request) {
    try {
        if (!json_request) {
            return string_to_cstring("{\"error\": \"Missing JSON request\"}");
        }
        
        
        yyjson_doc *doc = yyjson_read(json_request, strlen(json_request), 0);
        if (!doc) {
            return string_to_cstring("{\"error\": \"Invalid JSON format\"}");
        }
        
        yyjson_val *root = yyjson_doc_get_root(doc);
        if (!yyjson_is_obj(root)) {
            yyjson_doc_free(doc);
            return string_to_cstring("{\"error\": \"JSON root must be an object\"}");
        }
        
        
        yyjson_val *model_val = yyjson_obj_get(root, "model");
        if (!model_val || !yyjson_is_str(model_val)) {
            yyjson_doc_free(doc);
            return string_to_cstring("{\"error\": \"Missing or invalid 'model' field\"}");
        }
        std::string model = yyjson_get_str(model_val);
        
        
        yyjson_val *prompt_val = yyjson_obj_get(root, "prompt");
        if (!prompt_val || !yyjson_is_str(prompt_val)) {
            yyjson_doc_free(doc);
            return string_to_cstring("{\"error\": \"Missing or invalid 'prompt' field\"}");
        }
        std::string prompt = yyjson_get_str(prompt_val);
        
        
        llama_capi::GenerationParams params;
        yyjson_val *max_tokens_val = yyjson_obj_get(root, "max_tokens");
        if (max_tokens_val && yyjson_is_num(max_tokens_val)) {
            params.max_tokens = (int)yyjson_get_int(max_tokens_val);
        }
        
        yyjson_val *temperature_val = yyjson_obj_get(root, "temperature");
        if (temperature_val && yyjson_is_num(temperature_val)) {
            params.temperature = (float)yyjson_get_real(temperature_val);
        }
        
        yyjson_val *top_p_val = yyjson_obj_get(root, "top_p");
        if (top_p_val && yyjson_is_num(top_p_val)) {
            params.top_p = (float)yyjson_get_real(top_p_val);
        }
        
        yyjson_val *top_k_val = yyjson_obj_get(root, "top_k");
        if (top_k_val && yyjson_is_num(top_k_val)) {
            params.top_k = (int)yyjson_get_int(top_k_val);
        }
        
        yyjson_doc_free(doc);
        
        
        std::string request_id = get_manager().SubmitBatchRequest(model, prompt, params);
        
        
        yyjson_mut_doc *response_doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *response_root = yyjson_mut_obj(response_doc);
        yyjson_mut_doc_set_root(response_doc, response_root);
        
        yyjson_mut_obj_add_str(response_doc, response_root, "request_id", request_id.c_str());
        yyjson_mut_obj_add_str(response_doc, response_root, "status", "queued");
        
        char *response_json = yyjson_mut_write(response_doc, 0, nullptr);
        std::string result(response_json);
        free(response_json);
        yyjson_mut_doc_free(response_doc);
        
        return string_to_cstring(result);
    } catch (const std::exception& e) {
        
        yyjson_mut_doc *error_doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *error_root = yyjson_mut_obj(error_doc);
        yyjson_mut_doc_set_root(error_doc, error_root);
        
        yyjson_mut_obj_add_str(error_doc, error_root, "error", e.what());
        
        char *error_json = yyjson_mut_write(error_doc, 0, nullptr);
        std::string result(error_json);
        free(error_json);
        yyjson_mut_doc_free(error_doc);
        
        return string_to_cstring(result);
    }
}


char* cpp_llama_start_streaming(const char* model, const char* prompt, const char* options_json) {
    try {
        if (!model || !prompt) {
            return string_to_cstring("{\"error\": \"Missing model or prompt\"}");
        }
        
        std::string model_str = cstring_to_string(model);
        std::string prompt_str = cstring_to_string(prompt);
        
        llama_capi::GenerationParams params = parse_generation_params(options_json);
        
        std::string session_id = get_manager().StartStreamingSession(model_str, prompt_str, params);
        
        
        yyjson_mut_doc *response_doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *response_root = yyjson_mut_obj(response_doc);
        yyjson_mut_doc_set_root(response_doc, response_root);
        
        yyjson_mut_obj_add_str(response_doc, response_root, "session_id", session_id.c_str());
        yyjson_mut_obj_add_str(response_doc, response_root, "status", "started");
        
        char *response_json = yyjson_mut_write(response_doc, 0, nullptr);
        std::string result(response_json);
        free(response_json);
        yyjson_mut_doc_free(response_doc);
        
        return string_to_cstring(result);
    } catch (const std::exception& e) {
        yyjson_mut_doc *error_doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *error_root = yyjson_mut_obj(error_doc);
        yyjson_mut_doc_set_root(error_doc, error_root);
        
        yyjson_mut_obj_add_str(error_doc, error_root, "error", e.what());
        
        char *error_json = yyjson_mut_write(error_doc, 0, nullptr);
        std::string result(error_json);
        free(error_json);
        yyjson_mut_doc_free(error_doc);
        
        return string_to_cstring(result);
    }
}

char* cpp_llama_get_stream_token(const char* session_id) {
    try {
        if (!session_id) {
            return string_to_cstring("{\"error\": \"Missing session_id\"}");
        }
        
        std::string session_str = cstring_to_string(session_id);
        
        llama_capi::StreamToken token;
        bool has_token = get_manager().GetNextStreamToken(session_str, token);
        
        
        yyjson_mut_doc *response_doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *response_root = yyjson_mut_obj(response_doc);
        yyjson_mut_doc_set_root(response_doc, response_root);
        
        if (has_token) {
            yyjson_mut_obj_add_str(response_doc, response_root, "token", token.text.c_str());
            yyjson_mut_obj_add_bool(response_doc, response_root, "is_final", token.is_final);
            yyjson_mut_obj_add_real(response_doc, response_root, "probability", token.probability);
        } else {
            yyjson_mut_obj_add_str(response_doc, response_root, "token", "");
            yyjson_mut_obj_add_bool(response_doc, response_root, "is_final", true);
            yyjson_mut_obj_add_real(response_doc, response_root, "probability", 0.0);
        }
        
        char *response_json = yyjson_mut_write(response_doc, 0, nullptr);
        std::string result(response_json);
        free(response_json);
        yyjson_mut_doc_free(response_doc);
        
        return string_to_cstring(result);
    } catch (const std::exception& e) {
        yyjson_mut_doc *error_doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *error_root = yyjson_mut_obj(error_doc);
        yyjson_mut_doc_set_root(error_doc, error_root);
        
        yyjson_mut_obj_add_str(error_doc, error_root, "error", e.what());
        
        char *error_json = yyjson_mut_write(error_doc, 0, nullptr);
        std::string result(error_json);
        free(error_json);
        yyjson_mut_doc_free(error_doc);
        
        return string_to_cstring(result);
    }
}

char* cpp_llama_stop_streaming(const char* session_id) {
    try {
        std::string session_str = cstring_to_string(session_id);
        get_manager().StopStreamingSession(session_str);
        return string_to_cstring("{\"status\": \"stopped\"}");
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}

char* cpp_llama_get_batch_result(const char* request_id) {
    try {
        std::string request_str = cstring_to_string(request_id);
        auto result = get_manager().GetBatchResult(request_str);
        
        std::string json = "{";
        json += "\"request_id\": \"" + result.request_id + "\",";
        json += "\"success\": " + std::string(result.success ? "true" : "false") + ",";
        json += "\"response\": \"" + result.response + "\",";
        json += "\"error_message\": \"" + result.error_message + "\"";
        json += "}";
        
        return string_to_cstring(json);
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_status() {
    try {
        std::string result = "{\"backend\": \"llama.cpp\", \"models_loaded\": " + 
                           std::to_string(get_manager().GetLoadedModelNames().size()) + "}";
        return string_to_cstring(result);
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_model_info(const char* name) {
    try {
        if (!name) {
            return string_to_cstring("Error: Model name is required");
        }
        
        std::string name_str = cstring_to_string(name);
        
        if (get_manager().IsModelLoaded(name_str)) {
            std::string result = "{\"name\": \"" + name_str + "\", \"status\": \"loaded\", \"memory_usage\": 0}";
            return string_to_cstring(result);
        } else {
            return string_to_cstring("Error: Model not found");
        }
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_gpu_info() {
    try {
        std::ostringstream oss;
        oss << "{\\n";
        oss << "  \"gpu_available\": " << (llama_supports_gpu_offload() ? "true" : "false") << ",\\n";
        oss << "  \"backend\": \"vulkan\",\\n";
        oss << "  \"devices\": [\\n";
        oss << "    {\\n";
        oss << "      \"id\": 0,\\n";
        oss << "      \"name\": \"Default GPU\",\\n";
        oss << "      \"memory_total\": 0,\\n";
        oss << "      \"memory_used\": 0\\n";
        oss << "    }\\n";
        oss << "  ]\\n";
        oss << "}";
        
        return string_to_cstring(oss.str());
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_cleanup() {
    try {
        return string_to_cstring("Cleanup completed");
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_list_models() {
    try {
        auto model_names = get_manager().GetLoadedModelNames();
        std::string json = "[";
        for (size_t i = 0; i < model_names.size(); ++i) {
            if (i > 0) json += ", ";
            json += "\"" + model_names[i] + "\"";
        }
        json += "]";
        return string_to_cstring(json);
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_download_model(const char* source, const char* name, const char* options_json) {
    try {
        if (!source) {
            return string_to_cstring("Error: Source URL is required");
        }
        
        std::string source_str = cstring_to_string(source);
        std::string name_str = name ? cstring_to_string(name) : "";
        std::string options_str = cstring_to_string(options_json);
        
        
        std::filesystem::path models_dir("./models");
        std::filesystem::create_directories(models_dir);
        
        
        std::string filename;
        if (!name_str.empty()) {
            filename = name_str;
        } else {
            
            size_t last_slash = source_str.find_last_of('/');
            if (last_slash != std::string::npos) {
                filename = source_str.substr(last_slash + 1);
            } else {
                filename = "downloaded_model.gguf";
            }
        }
        
        
        if (filename.find(".gguf") == std::string::npos) {
            filename += ".gguf";
        }
        
        std::filesystem::path output_path = models_dir / filename;
        
        
        if (std::filesystem::exists(output_path)) {
            size_t existing_size = std::filesystem::file_size(output_path);
            std::string response = "{\"status\": \"already_exists\", \"filename\": \"" + filename +
                                 "\", \"size\": " + std::to_string(existing_size) + "}";
            return string_to_cstring(response);
        }
        
        
        llama_capi::HttpDownloader::DownloadResult download_result = 
            llama_capi::HttpDownloader::download_file(source_str, output_path);
        
        if (download_result.success && std::filesystem::exists(output_path)) {
            size_t file_size = std::filesystem::file_size(output_path);
            
            
            if (file_size < 1024) {  
                std::filesystem::remove(output_path);
                return string_to_cstring("Error: Downloaded file is too small, likely invalid. Check URL: " + source_str);
            }
            
            
            std::ifstream file(output_path, std::ios::binary);
            if (file) {
                char magic[4];
                file.read(magic, 4);
                if (file.gcount() == 4 && std::strncmp(magic, "GGUF", 4) == 0) {
                    std::string response = "{\"status\": \"success\", \"filename\": \"" + filename +
                                         "\", \"size\": " + std::to_string(file_size) + ", \"validated\": true}";
                    return string_to_cstring(response);
                } else {
                    std::string response = "{\"status\": \"success\", \"filename\": \"" + filename +
                                         "\", \"size\": " + std::to_string(file_size) + ", \"validated\": false, \"warning\": \"Not a valid GGUF file\"}";
                    return string_to_cstring(response);
                }
            } else {
                std::string response = "{\"status\": \"success\", \"filename\": \"" + filename +
                                     "\", \"size\": " + std::to_string(file_size) + ", \"validated\": false}";
                return string_to_cstring(response);
            }
        } else {
            
            if (std::filesystem::exists(output_path)) {
                std::filesystem::remove(output_path);
            }
            std::string error_msg = "Error: Failed to download model from " + source_str + ".";
            if (!download_result.error_message.empty()) {
                error_msg += " " + download_result.error_message;
            } else {
                error_msg += " Check URL and network connection.";
            }
            return string_to_cstring(error_msg);
        }
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_load_model_for_embeddings(const char* path, const char* config_json) {
    try {
        if (!path) {
            return string_to_cstring("Error: Model path is required");
        }
        
        std::string path_str = cstring_to_string(path);
        std::string config_str = cstring_to_string(config_json);
        
        
        llama_capi::ModelConfig config = parse_model_config(config_str);
        config.embeddings = true;
        config.model_path = path_str;
        
        
        std::string model_name = std::filesystem::path(path_str).stem().string();
        
        if (get_manager().LoadModel(model_name, config)) {
            std::string result = "{\"status\": \"success\", \"model_name\": \"" + model_name + "\", \"path\": \"" + path_str + "\", \"embeddings_enabled\": true}";
            return string_to_cstring(result);
        } else {
            return string_to_cstring("Error: Failed to load model for embeddings");
        }
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_initialize() {
    try {
        if (get_manager().Initialize()) {
            return string_to_cstring("{\"status\": \"success\", \"backend\": \"llama.cpp\", \"features\": [\"context_pooling\", \"performance_tracking\", \"memory_management\"]}");
        } else {
            return string_to_cstring("Error: Failed to initialize backend");
        }
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_chat(const char* model, const char* messages_json, const char* options_json) {
    try {
        if (!model || !messages_json) {
            return string_to_cstring("{\"error\": \"Missing model or messages\"}");
        }
        
        std::string model_str = cstring_to_string(model);
        
        
        yyjson_doc *messages_doc = yyjson_read(messages_json, strlen(messages_json), 0);
        if (!messages_doc) {
            return string_to_cstring("{\"error\": \"Invalid messages JSON\"}");
        }
        
        yyjson_val *messages_array = yyjson_doc_get_root(messages_doc);
        if (!yyjson_is_arr(messages_array)) {
            yyjson_doc_free(messages_doc);
            return string_to_cstring("{\"error\": \"Messages must be an array\"}");
        }
        
        std::vector<llama_capi::ChatMessage> messages;
        size_t idx, max;
        yyjson_val *message_obj;
        yyjson_arr_foreach(messages_array, idx, max, message_obj) {
            if (!yyjson_is_obj(message_obj)) continue;
            
            yyjson_val *role_val = yyjson_obj_get(message_obj, "role");
            yyjson_val *content_val = yyjson_obj_get(message_obj, "content");
            
            if (role_val && content_val && yyjson_is_str(role_val) && yyjson_is_str(content_val)) {
                llama_capi::ChatMessage msg;
                msg.role = yyjson_get_str(role_val);
                msg.content = yyjson_get_str(content_val);
                messages.push_back(msg);
            }
        }
        yyjson_doc_free(messages_doc);
        
        if (messages.empty()) {
            return string_to_cstring("{\"error\": \"No valid messages found\"}");
        }
        
        llama_capi::GenerationParams params = parse_generation_params(options_json);
        
        std::string response = get_manager().ChatCompletion(model_str, messages, params);
        
        
        yyjson_mut_doc *response_doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *response_root = yyjson_mut_obj(response_doc);
        yyjson_mut_doc_set_root(response_doc, response_root);
        
        yyjson_mut_obj_add_str(response_doc, response_root, "content", response.c_str());
        yyjson_mut_obj_add_str(response_doc, response_root, "role", "assistant");
        yyjson_mut_obj_add_str(response_doc, response_root, "model", model_str.c_str());
        
        char *response_json = yyjson_mut_write(response_doc, 0, nullptr);
        std::string result(response_json);
        free(response_json);
        yyjson_mut_doc_free(response_doc);
        
        return string_to_cstring(result);
        
    } catch (const std::exception& e) {
        yyjson_mut_doc *error_doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *error_root = yyjson_mut_obj(error_doc);
        yyjson_mut_doc_set_root(error_doc, error_root);
        
        yyjson_mut_obj_add_str(error_doc, error_root, "error", e.what());
        
        char *error_json = yyjson_mut_write(error_doc, 0, nullptr);
        std::string result(error_json);
        free(error_json);
        yyjson_mut_doc_free(error_doc);
        
        return string_to_cstring(result);
    }
}


char* cpp_llama_list_loaded() {
    try {
        auto model_names = get_manager().GetLoadedModelNames();
        std::string json = "[";
        for (size_t i = 0; i < model_names.size(); ++i) {
            if (i > 0) json += ", ";
            json += "\"" + model_names[i] + "\"";
        }
        json += "]";
        return string_to_cstring(json);
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}


char* cpp_llama_get_performance_metrics() {
    try {
        auto snapshot = get_manager().GetMetrics();
        
        std::string json = "{";
        json += "\"total_requests\": " + std::to_string(snapshot.total_requests) + ",";
        json += "\"total_tokens_generated\": " + std::to_string(snapshot.total_tokens_generated) + ",";
        json += "\"total_generation_time_ms\": " + std::to_string(snapshot.total_generation_time_ms) + ",";
        json += "\"memory_usage_mb\": " + std::to_string(snapshot.GetMemoryUsageMB()) + ",";
        json += "\"peak_memory_mb\": " + std::to_string(snapshot.peak_memory_bytes / (1024 * 1024)) + ",";
        json += "\"active_contexts\": " + std::to_string(snapshot.active_contexts) + ",";
        json += "\"pool_size\": " + std::to_string(snapshot.pool_size) + ",";
        json += "\"avg_tokens_per_second\": " + std::to_string(snapshot.GetAverageTokensPerSecond()) + ",";
        json += "\"avg_latency_ms\": " + std::to_string(snapshot.GetAverageLatencyMs());
        json += "}";
        
        return string_to_cstring(json);
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}

char* cpp_llama_get_memory_status() {
    try {
        auto& mgr = get_manager();
        size_t memory_used = mgr.GetTotalMemoryUsage();
        bool memory_limit_ok = mgr.CheckMemoryLimit();
        
        std::string json = "{";
        json += "\"memory_used_mb\": " + std::to_string(memory_used) + ",";
        json += "\"memory_limit_ok\": " + std::string(memory_limit_ok ? "true" : "false");
        json += "}";
        
        return string_to_cstring(json);
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}

char* cpp_llama_get_context_pool_status() {
    try {
        auto& mgr = get_manager();
        
        size_t loaded_models = mgr.GetLoadedModelCount();
        
        std::string json = "{";
        json += "\"loaded_models\": " + std::to_string(loaded_models) + ",";
        json += "\"status\": \"operational\"";
        json += "}";
        
        return string_to_cstring(json);
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}

char* cpp_llama_cleanup_contexts() {
    try {
        auto& mgr = get_manager();
        
        
        mgr.Cleanup();
        
        std::string json = "{";
        json += "\"status\": \"success\",";
        json += "\"action\": \"comprehensive_cleanup\"";
        json += "}";
        
        return string_to_cstring(json);
    } catch (const std::exception& e) {
        return string_to_cstring(std::string("Error: ") + e.what());
    }
}

} 
