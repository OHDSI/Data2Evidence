#include "model_manager.hpp"
#include "llama_wrapper.hpp"
#include "yyjson.hpp"
#include "utils/retry_utils.hpp"
#include "utils/security_validator.hpp"
#include <iostream>
#include <algorithm>
#include <memory>
#include <mutex>
#include <vector>
#include <filesystem>
#include <chrono>
#include <thread>
#include <future>
#include <sstream>
#include <iomanip>
#include <cstddef>
#include <stdint.h>
#include <sys/stat.h>

#ifdef LLAMA_BUILD_ENABLED
#include "llama.h"
#endif

namespace duckdb_llama {


ModelManager& ModelManager::GetInstance() {
    static ModelManager instance;
    return instance;
}

ModelManager::~ModelManager() {
    std::lock_guard<std::mutex> lock(models_mutex);
    loaded_models.clear();
}

bool ModelManager::LoadModel(const std::string& model_path, const ModelConfig& config) {
    std::lock_guard<std::mutex> lock(models_mutex);
    
    std::string model_name = std::filesystem::path(model_path).stem().string();
    
    if (loaded_models.find(model_name) != loaded_models.end()) {
        return true;
    }
    
    if (auto_memory_management && CheckMemoryPressure()) {
        EvictLeastRecentlyUsedInternal();
    }
    
    return LoadModelWithGPUFallback(model_path, model_name, config);
}

bool ModelManager::LoadModelInternal(const std::string& name, const std::string& path, const ModelConfig& config) {
    auto model = std::make_unique<LoadedModel>();
    model->name = name;
    model->path = path;
    model->config = config;
    model->last_used = std::chrono::steady_clock::now();
    model->memory_usage = 0;
    model->is_busy = false;
    
    LlamaWrapper::LoadModel(path, config, *model);
    
    model->memory_usage = CalculateActualMemoryUsage(*model);
    
    loaded_models[name] = std::move(model);
    return true;
}

bool ModelManager::UnloadModel(const std::string& model_name) {
    std::lock_guard<std::mutex> lock(models_mutex);
    auto it = loaded_models.find(model_name);
    if (it != loaded_models.end()) {
        UnloadModelInternal(model_name);
        return true;
    }
    return false;
}

void ModelManager::UnloadModelInternal(const std::string& model_name) {
    auto it = loaded_models.find(model_name);
    if (it != loaded_models.end()) {
        loaded_models.erase(it);
    }
}

LoadedModel* ModelManager::GetModel(const std::string& model_name) {
    std::lock_guard<std::mutex> lock(models_mutex);
    return GetModelInternal(model_name);
}

LoadedModel* ModelManager::GetModelInternal(const std::string& model_name) {
    auto it = loaded_models.find(model_name);
    if (it != loaded_models.end()) {
        it->second->last_used = std::chrono::steady_clock::now();
        return it->second.get();
    }
    return nullptr;
}

std::vector<ModelInfo> ModelManager::ListLoadedModels() {
    std::lock_guard<std::mutex> lock(models_mutex);
    std::vector<ModelInfo> models;
    
    for (const auto& [name, model] : loaded_models) {
        ModelInfo info;
        info.name = name;
        info.path = model->path;
        
        info.last_used = model->last_used;
        models.push_back(info);
    }
    
    return models;
}

size_t ModelManager::GetMemoryUsage() {
    std::lock_guard<std::mutex> lock(models_mutex);
    return GetMemoryUsageInternal();
}

size_t ModelManager::GetMemoryUsageInternal() {
    size_t total = 0;
    for (const auto& [name, model] : loaded_models) {
        total += model->memory_usage;
    }
    return total;
}

bool ModelManager::IsModelLoaded(const std::string& model_name) {
    std::lock_guard<std::mutex> lock(models_mutex);
    return loaded_models.find(model_name) != loaded_models.end();
}

void ModelManager::SetMaxMemoryUsage(size_t max_bytes) {
    max_memory_usage = max_bytes;
}

bool ModelManager::EvictLeastRecentlyUsed() {
    std::lock_guard<std::mutex> lock(models_mutex);
    return EvictLeastRecentlyUsedInternal();
}

bool ModelManager::EvictLeastRecentlyUsedInternal() {
    
    if (loaded_models.empty()) {
        return false;
    }
    
    auto oldest = loaded_models.begin();
    for (auto it = loaded_models.begin(); it != loaded_models.end(); ++it) {
        if (it->second->last_used < oldest->second->last_used) {
            oldest = it;
        }
    }
    
    loaded_models.erase(oldest);
    return true;
}

void ModelManager::SetConnectionPoolSize(size_t pool_size) {
    connection_pool_size = pool_size;
}

void ModelManager::SetModelIdleTimeout(std::chrono::seconds timeout) {
    model_idle_timeout = timeout;
}

void ModelManager::SetAutoMemoryManagement(bool enabled) {
    auto_memory_management = enabled;
}

void ModelManager::SetMemoryUsageThreshold(double threshold) {
    memory_usage_threshold = threshold;
}

ModelManager::BatchResult ModelManager::ProcessBatch(const BatchRequest& request) {
    BatchResult result;
    result.success = false;
    
    auto start_time = std::chrono::high_resolution_clock::now();
    
    
    LoadedModel* model = GetModel(request.model_name);
    if (!model) {
        result.errors.push_back("Model not found: " + request.model_name);
        return result;
    }
    
    result.outputs.reserve(request.inputs.size());
    result.errors.reserve(request.inputs.size());
    
    for (const auto& input : request.inputs) {
        try {
            std::string output;
            std::string error;
            
            if (request.operation_type == "generate") {
                GenerationParams params;
                params.max_tokens = 50;
                auto gen_result = LlamaWrapper::Generate(model, input, params);
                if (gen_result.success) {
                    output = gen_result.text;
                } else {
                    error = "Generation failed: " + gen_result.error_message;
                }
            } else if (request.operation_type == "embed") {
                
                try {
#ifdef LLAMA_BUILD_ENABLED
                    
                    auto* llama_model_ptr = static_cast<::llama_model*>(model->model_ptr);
                    auto* llama_context_ptr = static_cast<::llama_context*>(model->context_ptr);
                    
                    if (!llama_model_ptr || !llama_context_ptr) {
                        error = "Invalid model or context pointers";
                    } else {
                        int n_embd = llama_model_n_embd(llama_model_ptr);
                        if (n_embd <= 0) {
                            error = "Model does not support embeddings";
                        } else {
                            
                            EmbeddingResult emb_result = LlamaWrapper::GetEmbeddings(model, input);
                            if (emb_result.success) {
                                
                                std::ostringstream oss;
                                oss << "[";
                                for (size_t i = 0; i < emb_result.embedding.size(); i++) {
                                    if (i > 0) oss << ",";
                                    oss << emb_result.embedding[i];
                                }
                                oss << "]";
                                output = oss.str();
                            } else {
                                error = "Embedding generation failed: " + emb_result.error_message;
                            }
                        }
                    }
#else
                    
                    std::ostringstream oss;
                    oss << "[";
                    for (int i = 0; i < std::min(384, 5); i++) {
                        if (i > 0) oss << ",";
                        oss << "0." << (input.length() % 10) << (i % 10);
                    }
                    oss << "]";
                    output = oss.str();
#endif
                } catch (const std::exception& e) {
                    error = "Embedding failed: " + std::string(e.what());
                }
            } else if (request.operation_type == "chat") {
                
                GenerationParams params;
                params.max_tokens = 100;
                std::string chat_prompt = "Human: " + input + "\n\nAssistant: ";
                auto gen_result = LlamaWrapper::Generate(model, chat_prompt, params);
                if (gen_result.success) {
                    output = gen_result.text;
                } else {
                    error = "Chat failed: " + gen_result.error_message;
                }
            } else {
                error = "Unknown operation type: " + request.operation_type;
            }
            
            result.outputs.push_back(output);
            result.errors.push_back(error);
            
        } catch (const std::exception& e) {
            result.outputs.push_back("");
            result.errors.push_back("Exception: " + std::string(e.what()));
        }
    }
    
    auto end_time = std::chrono::high_resolution_clock::now();
    result.total_time = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);
    result.success = true;
    
    return result;
}

void ModelManager::OptimizeMemoryUsage() {
    std::lock_guard<std::mutex> lock(models_mutex);
    
    for (auto& [name, model] : loaded_models) {
        UpdateModelMemoryStats(*model);
    }
    
    
    if (CheckMemoryPressure()) {
        
        std::vector<std::pair<std::string, std::chrono::steady_clock::time_point>> model_usage;
        for (const auto& [name, model] : loaded_models) {
            model_usage.emplace_back(name, model->last_used);
        }
        
        std::sort(model_usage.begin(), model_usage.end(),
                  [](const auto& a, const auto& b) { return a.second < b.second; });
        
        
        size_t models_to_evict = std::min(model_usage.size() / 2, model_usage.size());
        for (size_t i = 0; i < models_to_evict && CheckMemoryPressure(); ++i) {
            UnloadModel(model_usage[i].first);
        }
    }
}

bool ModelManager::CheckMemoryPressure() {
    size_t current_usage = GetMemoryUsageInternal();
    size_t threshold_usage = static_cast<size_t>(max_memory_usage * memory_usage_threshold);
    return current_usage > threshold_usage;
}

void ModelManager::EvictIdleModels() {
    std::lock_guard<std::mutex> lock(models_mutex);
    auto now = std::chrono::steady_clock::now();
    
    auto it = loaded_models.begin();
    while (it != loaded_models.end()) {
        auto idle_time = std::chrono::duration_cast<std::chrono::seconds>(now - it->second->last_used);
        if (idle_time > model_idle_timeout) {
            it = loaded_models.erase(it);
        } else {
            ++it;
        }
    }
}

bool ModelManager::ShouldEvictModel(const LoadedModel& model) {
    auto now = std::chrono::steady_clock::now();
    auto idle_time = std::chrono::duration_cast<std::chrono::seconds>(now - model.last_used);
    return idle_time > model_idle_timeout || model.is_busy == false;
}

size_t ModelManager::CalculateActualMemoryUsage(const LoadedModel& model) {
    
    size_t memory_usage = 0;
    
    if (model.model_ptr) {
        
        struct stat st;
        if (stat(model.path.c_str(), &st) == 0) {
            memory_usage += st.st_size; 
        } else {
            memory_usage += 100 * 1024 * 1024; 
        }
        
        
        memory_usage += model.config.context_size * sizeof(float) * 4; 
        
        
        memory_usage += 32 * 1024 * 1024; 
    } else {
        memory_usage = 50 * 1024 * 1024; 
    }
    
    return memory_usage;
}

void ModelManager::UpdateModelMemoryStats(LoadedModel& model) {
    model.memory_usage = CalculateActualMemoryUsage(model);
}

bool ModelManager::LoadModelWithRetry(const std::string& model_path, const std::string& model_name, const ModelConfig& config) {
    RetryConfig retry_config;
    retry_config.max_attempts = 3;
    retry_config.initial_delay = std::chrono::milliseconds(1000);
    
    try {
        return RetryUtils::ExecuteWithRetry<bool>([&]() -> bool {
            if (auto_memory_management && CheckMemoryPressure()) {
                EvictLeastRecentlyUsedInternal();  
            }
            return LoadModelInternal(model_name, model_path, config);
        }, retry_config);
    } catch (const NonRetriableException& e) {
        std::cerr << "Model loading failed permanently: " << e.what() << std::endl;
        return false;
    } catch (const RetriableException& e) {
        std::cerr << "Model loading failed after retries: " << e.what() << std::endl;
        return false;
    }
}

bool ModelManager::LoadModelWithGPUFallback(const std::string& model_path, const std::string& model_name, const ModelConfig& config) {
    if (config.n_gpu_layers > 0) {
        try {
            bool success = LoadModelWithRetry(model_path, model_name, config);
            if (success) {
                
                auto model = GetModelInternal(model_name);  
                return true;
            }
        } catch (const std::exception& e) {
            std::string error_msg = e.what();
            if (!IsGPUError(error_msg)) {
                throw;
            }
        }
        
        ModelConfig cpu_config = config;
        cpu_config.n_gpu_layers = 0;
        cpu_config.main_gpu = -1;
        
        try {
            bool success = LoadModelWithRetry(model_path, model_name, cpu_config);
            if (!success) {
                std::cerr << "Model loading failed even with CPU fallback" << std::endl;
                return false;
            }
            return true;
        } catch (const std::exception& e) {
            std::cerr << "CPU fallback failed: " << e.what() << std::endl;
            return false;
        }
    } else {
        
        return LoadModelWithRetry(model_path, model_name, config);
    }
}

bool ModelManager::IsGPUError(const std::string& error_message) {
    
    std::vector<std::string> gpu_error_patterns = {
        "CUDA",
        "GPU",
        "VRAM",
        "device",
        "memory allocation failed",
        "out of memory",
        "ggml_cuda",
        "ggml_vulkan",
        "ggml_opencl",
        "failed to allocate",
        "no CUDA",
        "no GPU",
        "device not found",
        "driver"
    };
    
    std::string lower_error = error_message;
    std::transform(lower_error.begin(), lower_error.end(), lower_error.begin(), ::tolower);
    
    for (const auto& pattern : gpu_error_patterns) {
        std::string lower_pattern = pattern;
        std::transform(lower_pattern.begin(), lower_pattern.end(), lower_pattern.begin(), ::tolower);
        if (lower_error.find(lower_pattern) != std::string::npos) {
            return true;
        }
    }
    
    return false;
}

bool ModelManager::IsGPUActuallyUsed(const LoadedModel& model) {
    
    
    
    
    
    
    
    
    
    
    
    return false;
}

} 
