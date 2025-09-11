#pragma once

#include <string>
#include <vector>
#include <memory>
#include <chrono>
#include <unordered_map>
#include <mutex>
#include <filesystem>
#include <queue>
#include <atomic>
#include <thread>
#include <condition_variable>
#include <random>


struct llama_model;
struct llama_context;
struct llama_sampler;

namespace llama_capi {


struct ModelConfig {
    std::string model_path;
    int n_ctx = 2048;
    int n_batch = 512;
    int n_threads = 4;
    int n_gpu_layers = 0;
    int seed = -1;
    bool use_mmap = true;
    bool use_mlock = false;
    bool embeddings = false;
    bool memory_f16 = true;
};

struct ChatMessage {
    std::string role;
    std::string content;
};


struct GenerationParams {
    int max_tokens = 100;
    float temperature = 0.8f;
    float top_p = 0.9f;
    int top_k = 40;
    float repeat_penalty = 1.0f;
    int repeat_last_n = 64;
    int seed = -1;
    bool stream = false;
    std::vector<std::string> stop_sequences;
};


struct PerformanceMetrics {
    std::atomic<uint64_t> total_requests{0};
    std::atomic<uint64_t> total_tokens_generated{0};
    std::atomic<uint64_t> total_generation_time_ms{0};
    std::atomic<uint64_t> memory_usage_bytes{0};
    std::atomic<uint64_t> peak_memory_bytes{0};
    std::atomic<uint32_t> active_contexts{0};
    std::atomic<uint32_t> pool_size{0};
    
    
    double GetAverageTokensPerSecond() const;
    double GetAverageLatencyMs() const;
    size_t GetMemoryUsageMB() const;
    void Reset();
    
    
    PerformanceMetrics() = default;
    PerformanceMetrics(const PerformanceMetrics&) = delete;
    PerformanceMetrics& operator=(const PerformanceMetrics&) = delete;
    PerformanceMetrics(PerformanceMetrics&&) = delete;
    PerformanceMetrics& operator=(PerformanceMetrics&&) = delete;
};


struct PerformanceSnapshot {
    uint64_t total_requests;
    uint64_t total_tokens_generated;
    uint64_t total_generation_time_ms;
    uint64_t memory_usage_bytes;
    uint64_t peak_memory_bytes;
    uint32_t active_contexts;
    uint32_t pool_size;
    
    
    double GetAverageTokensPerSecond() const;
    double GetAverageLatencyMs() const;
    size_t GetMemoryUsageMB() const;
};


struct ContextPoolEntry {
    llama_context* context;
    llama_sampler* sampler;
    std::chrono::steady_clock::time_point last_used;
    bool in_use;
    uint64_t usage_count;
    
    ContextPoolEntry();
    ~ContextPoolEntry();
};


struct StreamToken {
    std::string text;
    bool is_final;
    float probability;
    int token_id;
};

struct StreamingSession {
    std::string session_id;
    std::string model_name;
    std::string prompt;
    GenerationParams params;
    std::queue<StreamToken> token_queue;
    std::mutex queue_mutex;
    std::condition_variable queue_cv;
    std::atomic<bool> finished{false};
    std::atomic<bool> error{false};
    std::string error_message;
    std::thread generation_thread;
    
    StreamingSession(const std::string& id, const std::string& model, const std::string& prompt, const GenerationParams& params);
    ~StreamingSession();
    
    void StartGeneration();
    bool GetNextToken(StreamToken& token);
    void Stop();
};


struct BatchRequest {
    std::string request_id;
    std::string model_name;
    std::string prompt;
    GenerationParams params;
    std::chrono::steady_clock::time_point submitted_at;
    bool completed = false;
};

struct BatchResult {
    std::string request_id;
    std::string response;
    bool success;
    std::string error_message;
    std::chrono::steady_clock::time_point completed_at;
    uint64_t processing_time_ms;
};

class ContextPool {
private:
    std::queue<ContextPoolEntry*> available_contexts_;  
    std::vector<std::unique_ptr<ContextPoolEntry>> all_contexts_;
    mutable std::mutex pool_mutex_;
    llama_model* model_;
    ModelConfig config_;
    size_t max_pool_size_;
    std::chrono::minutes context_ttl_;

public:
    ContextPool(llama_model* model, const ModelConfig& config, size_t max_size = 4);
    ~ContextPool();
    
    
    std::unique_ptr<ContextPoolEntry> AcquireContext();
    void ReleaseContext(std::unique_ptr<ContextPoolEntry> entry);
    void CleanupExpiredContexts();
    size_t GetPoolSize() const;
    size_t GetAvailableCount() const;
    
private:
    std::unique_ptr<ContextPoolEntry> CreateNewContext();
};


struct LoadedModel {
    llama_model* model;
    std::unique_ptr<ContextPool> context_pool;
    ModelConfig config;
    std::chrono::steady_clock::time_point load_time;
    std::chrono::steady_clock::time_point last_access;
    std::atomic<size_t> reference_count;
    std::atomic<size_t> memory_usage_bytes;
    
    LoadedModel();
    ~LoadedModel();
};


class SimpleModelManager {
private:
    std::unordered_map<std::string, std::unique_ptr<LoadedModel>> models_;
    mutable std::mutex models_mutex_;
    bool backend_initialized_;
    
    
    PerformanceMetrics metrics_;
    std::chrono::steady_clock::time_point start_time_;
    
    
    size_t memory_limit_bytes_;
    size_t max_context_pool_size_;
    std::atomic<bool> background_cleanup_enabled_;
    std::thread cleanup_thread_;
    std::atomic<bool> should_stop_cleanup_;
    
    
    std::queue<BatchRequest> batch_queue_;
    std::mutex batch_mutex_;
    std::condition_variable batch_cv_;
    std::thread batch_processor_;
    std::unordered_map<std::string, BatchResult> batch_results_;
    
    
    std::unordered_map<std::string, std::unique_ptr<StreamingSession>> streaming_sessions_;
    mutable std::mutex streaming_mutex_;
    
public:
    static SimpleModelManager& GetInstance();
    
    SimpleModelManager(size_t memory_limit_mb = 0, size_t max_context_pool_size = 10);
    ~SimpleModelManager();
    
    
    bool Initialize();
    bool LoadModel(const std::string& model_name, const ModelConfig& config);
    bool UnloadModel(const std::string& model_name);
    std::shared_ptr<LoadedModel> GetModel(const std::string& model_name);
    LoadedModel* GetModelRaw(const std::string& model_name);
    
    
    bool IsModelLoaded(const std::string& model_name) const;
    size_t GetLoadedModelCount() const;
    std::vector<std::string> GetModelNames() const;
    std::vector<std::string> GetLoadedModelNames() const;
    
    
    std::string Generate(const std::string& model_name, const std::string& prompt, const GenerationParams& params);
    std::string ChatCompletion(const std::string& model_name, const std::vector<ChatMessage>& messages, const GenerationParams& params);
    std::vector<float> GetEmbeddings(const std::string& model_name, const std::string& text);
    
    
    std::string SubmitBatchRequest(const std::string& model_name, const std::string& prompt, const GenerationParams& params);
    BatchResult GetBatchResult(const std::string& request_id);
    std::vector<BatchResult> GetAllBatchResults();
    
    
    std::string StartStreamingSession(const std::string& model_name, const std::string& prompt, const GenerationParams& params);
    bool GetNextStreamToken(const std::string& session_id, StreamToken& token);
    void StopStreamingSession(const std::string& session_id);
    void CleanupExpiredSessions();
    
    
    PerformanceSnapshot GetMetrics() const;
    void ResetMetrics();
    void Cleanup();
    void ConfigureSampler(llama_sampler* sampler, const GenerationParams& params);
    std::string GetStatus() const;
    void SetMemoryLimit(size_t limit_mb);
    bool CheckMemoryHealth() const;
    bool CheckMemoryLimit() const;
    size_t GetTotalMemoryUsage() const;
    size_t EstimateModelMemoryUsage(llama_model* model) const;
    void ReleaseModelReference(const std::string& model_name);
    
    
    std::vector<std::pair<std::string, int>> GetGPUInfo();
    
private:
    void StartBackgroundTasks();
    void StopBackgroundTasks();
    void CleanupTask();
    void BatchProcessingTask();
    void BackgroundCleanupWorker();
    void UpdateMemoryUsage();
    std::string GenerateRequestId();
};

} 
