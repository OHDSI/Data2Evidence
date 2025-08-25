#pragma once

#include <string>
#include <vector>
#include <memory>
#include <chrono>
#include <unordered_map>
#include <mutex>


#include "yyjson.hpp"

namespace duckdb_llama {

using namespace duckdb_yyjson; 


struct LoadedModel;
class ModelManager;
class LlamaWrapper;


constexpr size_t DEFAULT_CONTEXT_SIZE = 2048;
constexpr size_t DEFAULT_MAX_TOKENS = 100;
constexpr float DEFAULT_TEMPERATURE = 0.8f;
constexpr float DEFAULT_TOP_P = 0.9f;


struct ModelConfig {
    size_t context_size = DEFAULT_CONTEXT_SIZE;
    int n_gpu_layers = 0;  
    int main_gpu = 0;
    std::string split_mode = "layer";  
    std::vector<float> tensor_split;
    float temperature = DEFAULT_TEMPERATURE;
    float top_p = DEFAULT_TOP_P;
    int num_threads = 4;
    int seed = -1;
    int top_k = 40;
    bool use_gpu = false;
    bool embeddings = false;  
    bool flash_attn = false;  
};


struct GenerationParams {
    int max_tokens = DEFAULT_MAX_TOKENS;
    float temperature = DEFAULT_TEMPERATURE;
    float top_p = DEFAULT_TOP_P;
    int top_k = 40;
    std::vector<std::string> stop_sequences;
    int batch_size = 512;
    bool stream = false;
};


struct LoadedModel {
    void* model_ptr = nullptr;      
    void* context_ptr = nullptr;    
    void* sampler_ptr = nullptr;    
    void* vocab_ptr = nullptr;      
    std::string name;
    std::string path;
    ModelConfig config;
    std::chrono::steady_clock::time_point last_used;
    std::chrono::steady_clock::time_point loaded_at;
    size_t memory_usage = 0;
    size_t peak_memory_usage = 0;
    bool is_valid = false;
    bool is_busy = false;           
    size_t usage_count = 0;        
    
    
    std::chrono::milliseconds total_generation_time{0};
    size_t total_tokens_generated = 0;
    
    
    LoadedModel() : loaded_at(std::chrono::steady_clock::now()) {}
    
    
    LoadedModel(const LoadedModel&) = delete;
    LoadedModel& operator=(const LoadedModel&) = delete;
    LoadedModel(LoadedModel&&) = default;
    LoadedModel& operator=(LoadedModel&&) = default;
    
    
    void UpdateUsageStats(std::chrono::milliseconds generation_time, size_t tokens_generated);
    bool IsIdle(std::chrono::seconds timeout) const;
    double GetTokensPerSecond() const;
};


struct ModelInfo {
    std::string name;
    std::string path;
    size_t file_size;
    bool is_loaded;
    std::chrono::steady_clock::time_point last_used;
    std::string architecture;
    size_t parameter_count;
    std::string quantization;
};


struct BatchRequest {
    std::string model_name;
    std::vector<std::string> inputs;  
    std::string operation_type = "embed"; 
    std::string options;
    
    
    BatchRequest(const std::string& json_str) {
        yyjson_doc *doc = yyjson_read(json_str.c_str(), json_str.length(), 0);
        if (doc) {
            yyjson_val *root = yyjson_doc_get_root(doc);
            if (yyjson_is_obj(root)) {
                if (yyjson_val *val = yyjson_obj_get(root, "model")) {
                    if (yyjson_is_str(val)) model_name = yyjson_get_str(val);
                }
                if (yyjson_val *val = yyjson_obj_get(root, "inputs")) {
                    if (yyjson_is_arr(val)) {
                        yyjson_arr_iter iter = yyjson_arr_iter_with(val);
                        yyjson_val *item;
                        while ((item = yyjson_arr_iter_next(&iter))) {
                            if (yyjson_is_str(item)) {
                                inputs.push_back(yyjson_get_str(item));
                            }
                        }
                    }
                }
                if (yyjson_val *val = yyjson_obj_get(root, "operation_type")) {
                    if (yyjson_is_str(val)) operation_type = yyjson_get_str(val);
                }
                if (yyjson_val *val = yyjson_obj_get(root, "options")) {
                    if (yyjson_is_str(val)) options = yyjson_get_str(val);
                }
            }
            yyjson_doc_free(doc);
        }
    }
    
    
    BatchRequest() = default;
};

} 
