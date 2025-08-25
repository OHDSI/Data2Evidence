#pragma once

#include "common.hpp"
#include <memory>
#include <unordered_map>
#include <mutex>

namespace duckdb_llama {


struct llama_model;
struct llama_context; 
struct llama_sampler;

class ModelManager {
private:
    std::unordered_map<std::string, std::unique_ptr<LoadedModel>> loaded_models;
    std::mutex models_mutex;
    size_t max_memory_usage = 8ULL * 1024 * 1024 * 1024; 
    
    
    size_t connection_pool_size = 4; 
    std::chrono::seconds model_idle_timeout{300}; 
    bool auto_memory_management = true;
    double memory_usage_threshold = 0.9; 
    
public:
    
    static ModelManager& GetInstance();
    
    ModelManager() = default;
    ~ModelManager();
    
    
    bool LoadModel(const std::string& model_path, const ModelConfig& config);
    bool UnloadModel(const std::string& model_name);
    LoadedModel* GetModel(const std::string& model_name);
    
    
    std::vector<ModelInfo> ListLoadedModels();
    size_t GetMemoryUsage();
    bool IsModelLoaded(const std::string& model_name);
    
    
    void SetMaxMemoryUsage(size_t max_bytes);
    bool EvictLeastRecentlyUsed();
    
    
    void SetConnectionPoolSize(size_t pool_size);
    void SetModelIdleTimeout(std::chrono::seconds timeout);
    void SetAutoMemoryManagement(bool enabled);
    void SetMemoryUsageThreshold(double threshold);
    
    
    struct BatchResult {
        std::vector<std::string> outputs;
        std::vector<std::string> errors;
        bool success;
        std::chrono::milliseconds total_time;
    };
    
    BatchResult ProcessBatch(const BatchRequest& request);
    
    
    void OptimizeMemoryUsage();
    bool CheckMemoryPressure();
    void EvictIdleModels();
    
private:
    bool LoadModelInternal(const std::string& name, const std::string& path, const ModelConfig& config);
    void UnloadModelInternal(const std::string& model_name);
    LoadedModel* GetModelInternal(const std::string& model_name); 
    bool EvictLeastRecentlyUsedInternal(); 
    size_t GetMemoryUsageInternal(); 
    
    
    bool ShouldEvictModel(const LoadedModel& model);
    size_t CalculateActualMemoryUsage(const LoadedModel& model);
    void UpdateModelMemoryStats(LoadedModel& model);
    
    
    bool LoadModelWithRetry(const std::string& model_path, const std::string& model_name, const ModelConfig& config);
    
    
    bool LoadModelWithGPUFallback(const std::string& model_path, const std::string& model_name, const ModelConfig& config);
    bool IsGPUError(const std::string& error_message);
    bool IsGPUActuallyUsed(const LoadedModel& model);
};

} 
