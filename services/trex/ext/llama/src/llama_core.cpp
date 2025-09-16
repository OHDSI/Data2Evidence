#include "include/llama_core.hpp"
#include "../llama.cpp/include/llama.h"
#include <iostream>
#include <filesystem>
#include <cstring>
#include <sstream>
#include <iomanip>
#include <algorithm>

namespace llama_capi {


double PerformanceMetrics::GetAverageTokensPerSecond() const {
    auto requests = total_requests.load();
    auto time_ms = total_generation_time_ms.load();
    if (requests > 0 && time_ms > 0) {
        return (static_cast<double>(total_tokens_generated.load()) / time_ms) * 1000.0;
    }
    return 0.0;
}

double PerformanceMetrics::GetAverageLatencyMs() const {
    auto requests = total_requests.load();
    if (requests > 0) {
        return static_cast<double>(total_generation_time_ms.load()) / requests;
    }
    return 0.0;
}

size_t PerformanceMetrics::GetMemoryUsageMB() const {
    return memory_usage_bytes.load() / (1024 * 1024);
}

void PerformanceMetrics::Reset() {
    total_requests = 0;
    total_tokens_generated = 0;
    total_generation_time_ms = 0;
    memory_usage_bytes = 0;
    peak_memory_bytes = 0;
    active_contexts = 0;
    pool_size = 0;
}


double PerformanceSnapshot::GetAverageTokensPerSecond() const {
    if (total_requests > 0 && total_generation_time_ms > 0) {
        return (static_cast<double>(total_tokens_generated) / total_generation_time_ms) * 1000.0;
    }
    return 0.0;
}

double PerformanceSnapshot::GetAverageLatencyMs() const {
    if (total_requests > 0) {
        return static_cast<double>(total_generation_time_ms) / total_requests;
    }
    return 0.0;
}

size_t PerformanceSnapshot::GetMemoryUsageMB() const {
    return memory_usage_bytes / (1024 * 1024);
}


ContextPoolEntry::ContextPoolEntry() 
    : context(nullptr), sampler(nullptr), in_use(false), usage_count(0) {
    last_used = std::chrono::steady_clock::now();
}

ContextPoolEntry::~ContextPoolEntry() {
    if (sampler) {
        llama_sampler_free(sampler);
        sampler = nullptr;
    }
    if (context) {
        llama_free(context);
        context = nullptr;
    }
}


ContextPool::ContextPool(llama_model* model, const ModelConfig& config, size_t max_size)
    : model_(model), config_(config), max_pool_size_(max_size), context_ttl_(std::chrono::minutes(30)) {
}

ContextPool::~ContextPool() {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    
    while (!available_contexts_.empty()) {
        available_contexts_.pop();
    }
    
    all_contexts_.clear();
}

std::unique_ptr<ContextPoolEntry> ContextPool::AcquireContext() {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    
    
    if (!available_contexts_.empty()) {
        ContextPoolEntry* raw_entry = available_contexts_.front();
        available_contexts_.pop();
        raw_entry->in_use = true;
        raw_entry->last_used = std::chrono::steady_clock::now();
        raw_entry->usage_count++;
        
        
        for (auto it = all_contexts_.begin(); it != all_contexts_.end(); ++it) {
            if (it->get() == raw_entry) {
                auto result = std::move(*it);
                all_contexts_.erase(it);
                return result;
            }
        }
    }
    
    
    if (all_contexts_.size() < max_pool_size_) {
        return CreateNewContext();
    }
    
    
    return nullptr;
}

void ContextPool::ReleaseContext(std::unique_ptr<ContextPoolEntry> entry) {
    if (!entry) return;
    
    std::lock_guard<std::mutex> lock(pool_mutex_);
    entry->in_use = false;
    entry->last_used = std::chrono::steady_clock::now();
    
    
    ContextPoolEntry* raw_ptr = entry.get();
    available_contexts_.push(raw_ptr);
    all_contexts_.push_back(std::move(entry));
}

std::unique_ptr<ContextPoolEntry> ContextPool::CreateNewContext() {
    if (!model_) return nullptr;
    
    
    llama_context_params ctx_params = llama_context_default_params();
    ctx_params.n_ctx = config_.n_ctx;
    ctx_params.n_batch = config_.n_batch;
    ctx_params.n_threads = config_.n_threads;
    ctx_params.embeddings = config_.embeddings;
    ctx_params.offload_kqv = config_.n_gpu_layers > 0;
    
    
    llama_context* context = llama_init_from_model(model_, ctx_params);
    if (!context) {
        return nullptr;
    }
    
    
    llama_sampler* sampler = llama_sampler_chain_init(llama_sampler_chain_default_params());
    if (!sampler) {
        llama_free(context);
        return nullptr;
    }
    
    
    llama_sampler_chain_add(sampler, llama_sampler_init_top_k(40));
    llama_sampler_chain_add(sampler, llama_sampler_init_top_p(0.9f, 1));
    llama_sampler_chain_add(sampler, llama_sampler_init_temp(0.8f));
    
    
    llama_sampler_chain_add(sampler, llama_sampler_init_dist(12345));
    
    auto entry = std::make_unique<ContextPoolEntry>();
    entry->context = context;
    entry->sampler = sampler;
    entry->in_use = true;
    entry->usage_count = 1;
    
    
    
    return entry;
}

void ContextPool::CleanupExpiredContexts() {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    auto now = std::chrono::steady_clock::now();
    
    
    std::queue<ContextPoolEntry*> new_queue;
    while (!available_contexts_.empty()) {
        ContextPoolEntry* entry = available_contexts_.front();
        available_contexts_.pop();
        
        if (now - entry->last_used < context_ttl_) {
            new_queue.push(entry);
        } else {
            
            all_contexts_.erase(
                std::remove_if(all_contexts_.begin(), all_contexts_.end(),
                    [entry](const std::unique_ptr<ContextPoolEntry>& ptr) {
                        return ptr.get() == entry;
                    }),
                all_contexts_.end());
        }
    }
    available_contexts_ = std::move(new_queue);
}

size_t ContextPool::GetPoolSize() const {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    return all_contexts_.size();
}

size_t ContextPool::GetAvailableCount() const {
    std::lock_guard<std::mutex> lock(pool_mutex_);
    return available_contexts_.size();
}


LoadedModel::LoadedModel() 
    : model(nullptr), reference_count(0), memory_usage_bytes(0) {
    load_time = std::chrono::steady_clock::now();
    last_access = load_time;
}

LoadedModel::~LoadedModel() {
    
    if (context_pool) {
        context_pool.reset();
    }
    
    if (model) {
        llama_model_free(model);
        model = nullptr;  
    }
}


SimpleModelManager& SimpleModelManager::GetInstance() {
    
    
    static SimpleModelManager* instance = new SimpleModelManager(0, 10); 
    return *instance;
}

SimpleModelManager::SimpleModelManager(size_t memory_limit_mb, size_t max_context_pool_size)
    : memory_limit_bytes_(memory_limit_mb * 1024 * 1024)
    , max_context_pool_size_(max_context_pool_size)
    , background_cleanup_enabled_(false)  
    , backend_initialized_(false) {
    
    
    
}

SimpleModelManager::~SimpleModelManager() {
    background_cleanup_enabled_ = false;
    
    {
        std::lock_guard<std::mutex> streaming_lock(streaming_mutex_);
        for (auto& session_pair : streaming_sessions_) {
            if (session_pair.second) {
                session_pair.second->Stop();
            }
        }
        streaming_sessions_.clear();
    }
    
    
    if (cleanup_thread_.joinable()) {
        
        std::this_thread::sleep_for(std::chrono::milliseconds(100));
        if (cleanup_thread_.joinable()) {
            cleanup_thread_.join();
        }
    }
    
    {
        std::lock_guard<std::mutex> lock(models_mutex_);
        models_.clear();
    }
    
    if (backend_initialized_) {
        
        if (models_.empty()) {
            llama_backend_free();
            backend_initialized_ = false;
        }
    }
}

bool SimpleModelManager::Initialize() {
    if (backend_initialized_) {
        return true;
    }

    try {
        llama_backend_init();
        backend_initialized_ = true;
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize llama backend: " << e.what() << std::endl;
        return false;
    }
}

bool SimpleModelManager::LoadModel(const std::string& model_name, const ModelConfig& config) {
    std::lock_guard<std::mutex> lock(models_mutex_);
    
    if (!backend_initialized_ && !Initialize()) {
        return false;
    }
    
    
    if (models_.find(model_name) != models_.end()) {
        std::cout << "Model " << model_name << " already loaded" << std::endl;
        return true;
    }
    
    
    if (models_.empty() && !cleanup_thread_.joinable()) {
        background_cleanup_enabled_ = true;
        cleanup_thread_ = std::thread(&SimpleModelManager::BackgroundCleanupWorker, this);
    }
    
    
    if (!CheckMemoryLimit()) {
        std::cout << "Memory limit reached, cannot load model " << model_name << std::endl;
        return false;
    }

    std::string model_path = config.model_path;
    if (!std::filesystem::exists(model_path)) {
        std::cerr << "Model file not found: " << model_path << std::endl;
        return false;
    }

    
    llama_model_params model_params = llama_model_default_params();
    model_params.n_gpu_layers = config.n_gpu_layers;
    model_params.use_mmap = config.use_mmap;
    model_params.use_mlock = config.use_mlock;

    
    llama_model* model = llama_model_load_from_file(model_path.c_str(), model_params);
    if (!model) {
        std::cerr << "Failed to load model from: " << model_path << std::endl;
        return false;
    }

    
    auto loaded_model = std::make_unique<LoadedModel>();
    loaded_model->model = model;
    loaded_model->config = config;
    loaded_model->context_pool = std::make_unique<ContextPool>(model, config, max_context_pool_size_);
    
    
    size_t model_size = EstimateModelMemoryUsage(model);
    loaded_model->memory_usage_bytes = model_size;
    metrics_.memory_usage_bytes += model_size;
    metrics_.peak_memory_bytes = std::max(
        metrics_.peak_memory_bytes.load(), 
        metrics_.memory_usage_bytes.load()
    );

    
    models_[model_name] = std::move(loaded_model);
    
    std::cout << "Successfully loaded model: " << model_name 
              << " (estimated " << (model_size / 1024 / 1024) << " MB)" << std::endl;
    return true;
}

bool SimpleModelManager::UnloadModel(const std::string& model_name) {
    std::lock_guard<std::mutex> lock(models_mutex_);
    auto it = models_.find(model_name);
    if (it != models_.end()) {
        auto& loaded_model = it->second;
        
        
        while (loaded_model->reference_count > 0) {
            std::this_thread::sleep_for(std::chrono::milliseconds(100));
        }
        
        
        if (loaded_model->context_pool) {
            
            size_t max_wait_ms = 5000; 
            size_t wait_ms = 0;
            while (wait_ms < max_wait_ms) {
                size_t total_contexts = loaded_model->context_pool->GetPoolSize();
                size_t available_contexts = loaded_model->context_pool->GetAvailableCount();
                
                if (total_contexts == available_contexts) {
                    break; 
                }
                
                std::this_thread::sleep_for(std::chrono::milliseconds(100));
                wait_ms += 100;
            }
            
            
            loaded_model->context_pool.reset();
        }
        
        
        metrics_.memory_usage_bytes -= loaded_model->memory_usage_bytes;
        
        models_.erase(it);
        std::cout << "Unloaded model: " << model_name << std::endl;
        return true;
    }
    return false;
}

std::shared_ptr<LoadedModel> SimpleModelManager::GetModel(const std::string& model_name) {
    std::lock_guard<std::mutex> lock(models_mutex_);
    auto it = models_.find(model_name);
    if (it == models_.end()) {
        return nullptr;
    }
    
    auto& loaded_model = it->second;
    loaded_model->reference_count++;
    loaded_model->last_access = std::chrono::steady_clock::now();
    
    return std::shared_ptr<LoadedModel>(loaded_model.get(), [this, model_name](LoadedModel* model) {
        ReleaseModelReference(model_name);
    });
}

LoadedModel* SimpleModelManager::GetModelRaw(const std::string& model_name) {
    auto shared_model = GetModel(model_name);
    return shared_model.get(); 
}

bool SimpleModelManager::IsModelLoaded(const std::string& model_name) const {
    std::lock_guard<std::mutex> lock(models_mutex_);
    return models_.find(model_name) != models_.end();
}

size_t SimpleModelManager::GetLoadedModelCount() const {
    std::lock_guard<std::mutex> lock(models_mutex_);
    return models_.size();
}

std::vector<std::string> SimpleModelManager::GetLoadedModelNames() const {
    std::lock_guard<std::mutex> lock(models_mutex_);
    std::vector<std::string> names;
    names.reserve(models_.size());
    for (const auto& pair : models_) {
        names.push_back(pair.first);
    }
    return names;
}

PerformanceSnapshot SimpleModelManager::GetMetrics() const {
    PerformanceSnapshot result;
    result.total_requests = metrics_.total_requests.load();
    result.total_tokens_generated = metrics_.total_tokens_generated.load();
    result.total_generation_time_ms = metrics_.total_generation_time_ms.load();
    result.memory_usage_bytes = metrics_.memory_usage_bytes.load();
    result.peak_memory_bytes = metrics_.peak_memory_bytes.load();
    result.active_contexts = metrics_.active_contexts.load();
    result.pool_size = metrics_.pool_size.load();
    return result;
}

void SimpleModelManager::ResetMetrics() {
    metrics_.Reset();
}

void SimpleModelManager::Cleanup() {
    
    background_cleanup_enabled_ = false;
    
    
    if (cleanup_thread_.joinable()) {
        cleanup_thread_.join();
    }
    
    
    {
        std::lock_guard<std::mutex> streaming_lock(streaming_mutex_);
        for (auto& session_pair : streaming_sessions_) {
            if (session_pair.second) {
                session_pair.second->Stop();
            }
        }
        streaming_sessions_.clear();
    }
    
    
    {
        std::lock_guard<std::mutex> lock(models_mutex_);
        models_.clear();
    }
    
    
    if (backend_initialized_) {
        llama_backend_free();
        backend_initialized_ = false;
    }
    
    
    ResetMetrics();
}

size_t SimpleModelManager::GetTotalMemoryUsage() const {
    return metrics_.GetMemoryUsageMB();
}

void SimpleModelManager::ReleaseModelReference(const std::string& model_name) {
    std::lock_guard<std::mutex> lock(models_mutex_);
    auto it = models_.find(model_name);
    if (it != models_.end()) {
        it->second->reference_count--;
    }
}

bool SimpleModelManager::CheckMemoryLimit() const {
    return memory_limit_bytes_ == 0 || metrics_.memory_usage_bytes < memory_limit_bytes_;
}

size_t SimpleModelManager::EstimateModelMemoryUsage(llama_model* model) const {
    if (!model) return 0;
    
    
    size_t n_params = llama_model_n_params(model);
    size_t bytes_per_param = 2; 
    
    return n_params * bytes_per_param;
}

void SimpleModelManager::ConfigureSampler(llama_sampler* sampler, const GenerationParams& params) {
    if (!sampler) return;
    
    
    llama_sampler_reset(sampler);
    
    
    
    
    
    
    
    
}

void SimpleModelManager::BackgroundCleanupWorker() {
    while (background_cleanup_enabled_) {
        
        for (int i = 0; i < 300 && background_cleanup_enabled_; ++i) { 
            std::this_thread::sleep_for(std::chrono::seconds(1));
        }
        
        if (!background_cleanup_enabled_) break;
        
        
        std::lock_guard<std::mutex> lock(models_mutex_);
        for (auto& pair : models_) {
            if (pair.second->context_pool) {
                pair.second->context_pool->CleanupExpiredContexts();
            }
        }
    }
}

std::string SimpleModelManager::Generate(const std::string& model_name, 
                                       const std::string& prompt, 
                                       const GenerationParams& params) {
    auto model = GetModel(model_name);
    if (!model) {
        return "Error: Model not found: " + model_name;
    }

    
    auto context_entry = model->context_pool->AcquireContext();
    if (!context_entry) {
        return "Error: No available context for model: " + model_name;
    }

    auto start_time = std::chrono::steady_clock::now();
    metrics_.total_requests++;

    try {
        
        ConfigureSampler(context_entry->sampler, params);
        
        
        const llama_vocab* vocab = llama_model_get_vocab(model->model);
        
        
        std::vector<llama_token> tokens(prompt.length() + 100);
        int n_tokens = llama_tokenize(vocab, prompt.c_str(), prompt.length(), 
                                    tokens.data(), tokens.size(), true, true);
        if (n_tokens < 0) {
            tokens.resize(-n_tokens);
            n_tokens = llama_tokenize(vocab, prompt.c_str(), prompt.length(), 
                                    tokens.data(), tokens.size(), true, true);
        }
        if (n_tokens <= 0) {
            model->context_pool->ReleaseContext(std::move(context_entry));
            return "Error: Failed to tokenize prompt";
        }
        tokens.resize(n_tokens);

        
        llama_batch batch = llama_batch_get_one(tokens.data(), tokens.size());

        
        if (llama_decode(context_entry->context, batch) != 0) {
            model->context_pool->ReleaseContext(std::move(context_entry));
            return "Error: Failed to process prompt";
        }

        std::string result;
        int tokens_generated = 0;
        
        
        for (int i = 0; i < params.max_tokens; ++i) {
            
            llama_token new_token = llama_sampler_sample(context_entry->sampler, context_entry->context, -1);
            
            
            if (llama_vocab_is_eog(vocab, new_token)) {
                break;
            }

            
            char piece[256];
            int n = llama_token_to_piece(vocab, new_token, piece, sizeof(piece), 0, true);
            if (n > 0) {
                result.append(piece, n);
                tokens_generated++;
            }

            
            llama_sampler_accept(context_entry->sampler, new_token);

            
            llama_batch next_batch = llama_batch_get_one(&new_token, 1);
            
            
            if (llama_decode(context_entry->context, next_batch) != 0) {
                break;
            }
        }

        
        auto end_time = std::chrono::steady_clock::now();
        auto duration_ms = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time).count();
        metrics_.total_generation_time_ms += duration_ms;
        metrics_.total_tokens_generated += tokens_generated;

        
        model->context_pool->ReleaseContext(std::move(context_entry));

        return result;
        
    } catch (const std::exception& e) {
        
        model->context_pool->ReleaseContext(std::move(context_entry));
        std::cerr << "Generation error: " << e.what() << std::endl;
        return "Error: " + std::string(e.what());
    }
}

std::string SimpleModelManager::ChatCompletion(const std::string& model_name, 
                                              const std::vector<ChatMessage>& messages, 
                                              const GenerationParams& params) {
    
    std::string prompt;
    for (const auto& message : messages) {
        if (message.role == "system") {
            prompt += "System: " + message.content + "\n";
        } else if (message.role == "user") {
            prompt += "User: " + message.content + "\n";
        } else if (message.role == "assistant") {
            prompt += "Assistant: " + message.content + "\n";
        }
    }
    prompt += "Assistant: ";
    
    
    return Generate(model_name, prompt, params);
}

std::vector<float> SimpleModelManager::GetEmbeddings(const std::string& model_name, 
                                                    const std::string& text) {
    auto model = GetModel(model_name);
    if (!model) {
        std::cerr << "Model not found: " << model_name << std::endl;
        return {};
    }

    
    auto context_entry = model->context_pool->AcquireContext();
    if (!context_entry) {
        std::cerr << "No available context for model: " << model_name << std::endl;
        return {};
    }

    try {
        
        const llama_vocab* vocab = llama_model_get_vocab(model->model);
        
        
        std::vector<llama_token> tokens(text.length() + 100);
        int n_tokens = llama_tokenize(vocab, text.c_str(), text.length(), 
                                    tokens.data(), tokens.size(), true, false);
        if (n_tokens < 0) {
            tokens.resize(-n_tokens);
            n_tokens = llama_tokenize(vocab, text.c_str(), text.length(), 
                                    tokens.data(), tokens.size(), true, false);
        }
        if (n_tokens <= 0) {
            std::cerr << "Failed to tokenize text for embeddings" << std::endl;
            model->context_pool->ReleaseContext(std::move(context_entry));
            return {};
        }
        tokens.resize(n_tokens);

        
        llama_batch batch = llama_batch_get_one(tokens.data(), tokens.size());

        
        if (llama_decode(context_entry->context, batch) != 0) {
            std::cerr << "Failed to process tokens for embeddings" << std::endl;
            model->context_pool->ReleaseContext(std::move(context_entry));
            return {};
        }

        
        int32_t n_embd = llama_model_n_embd(model->model);
        const float* embeddings = llama_get_embeddings(context_entry->context);
        
        if (!embeddings) {
            std::cerr << "Failed to get embeddings from context" << std::endl;
            model->context_pool->ReleaseContext(std::move(context_entry));
            return {};
        }

        
        std::vector<float> result(embeddings, embeddings + n_embd);
        
        
        model->context_pool->ReleaseContext(std::move(context_entry));
        
        return result;
        
    } catch (const std::exception& e) {
        
        model->context_pool->ReleaseContext(std::move(context_entry));
        std::cerr << "Embeddings error: " << e.what() << std::endl;
        return {};
    }
}

std::vector<std::pair<std::string, int>> SimpleModelManager::GetGPUInfo() {
    std::vector<std::pair<std::string, int>> gpu_info;
    
    try {
        
        bool vulkan_available = false;
        bool cuda_available = false;
        
        
        #ifdef GGML_USE_VULKAN
        vulkan_available = true;
        #endif
        
        
        #ifdef GGML_USE_CUDA
        cuda_available = true;
        #endif
        
        if (vulkan_available) {
            gpu_info.push_back({"Vulkan GPU", 1});
        }
        if (cuda_available) {
            gpu_info.push_back({"CUDA GPU", 1});
        }
        if (!vulkan_available && !cuda_available) {
            gpu_info.push_back({"CPU Only", 0});
        }
        
        return gpu_info;
    } catch (const std::exception& e) {
        std::cerr << "Failed to get GPU info: " << e.what() << std::endl;
        return {{"CPU Only", 0}};
    }
}


StreamingSession::StreamingSession(const std::string& id, const std::string& model, const std::string& prompt_text, const GenerationParams& gen_params)
    : session_id(id), model_name(model), prompt(prompt_text), params(gen_params) {}

StreamingSession::~StreamingSession() {
    Stop();
}

void StreamingSession::StartGeneration() {
    generation_thread = std::thread([this]() {
        try {
            auto& manager = SimpleModelManager::GetInstance();
            auto model = manager.GetModel(model_name);
            if (!model) {
                error = true;
                error_message = "Model not found: " + model_name;
                finished = true;
                queue_cv.notify_all();
                return;
            }

            
            auto context_entry = model->context_pool->AcquireContext();
            if (!context_entry) {
                error = true;
                error_message = "Failed to get context for streaming";
                finished = true;
                queue_cv.notify_all();
                return;
            }

            
            manager.ConfigureSampler(context_entry->sampler, params);

            
            const llama_vocab* vocab = llama_model_get_vocab(model->model);
            std::vector<llama_token> tokens(prompt.length() + 100);
            int n_tokens = llama_tokenize(vocab, prompt.c_str(), prompt.length(), 
                                        tokens.data(), tokens.size(), true, true);
            if (n_tokens < 0) {
                tokens.resize(-n_tokens);
                n_tokens = llama_tokenize(vocab, prompt.c_str(), prompt.length(), 
                                        tokens.data(), tokens.size(), true, true);
            }
            if (n_tokens <= 0) {
                error = true;
                error_message = "Failed to tokenize prompt";
                model->context_pool->ReleaseContext(std::move(context_entry));
                finished = true;
                queue_cv.notify_all();
                return;
            }
            tokens.resize(n_tokens);
            
            
            if (llama_decode(context_entry->context, llama_batch_get_one(tokens.data(), tokens.size())) != 0) {
                error = true;
                error_message = "Failed to evaluate prompt";
                model->context_pool->ReleaseContext(std::move(context_entry));
                finished = true;
                queue_cv.notify_all();
                return;
            }

            
            int n_generated = 0;
            
            while (n_generated < params.max_tokens && !finished.load()) {
                llama_token token = llama_sampler_sample(context_entry->sampler, context_entry->context, -1);
                
                
                if (llama_vocab_is_eog(vocab, token)) {
                    break;
                }

                
                char token_str[256];
                int n_chars = llama_token_to_piece(vocab, token, token_str, sizeof(token_str), 0, true);
                std::string token_text;
                if (n_chars > 0) {
                    token_text = std::string(token_str, n_chars);
                } else {
                    token_text = "[UNK]"; 
                }
                    
                
                float token_probability = 0.0f;
                try {
                    
                    const float* logits = llama_get_logits(context_entry->context);
                    if (logits) {
                        int32_t n_vocab = llama_vocab_n_tokens(vocab);
                        if (token >= 0 && token < n_vocab) {
                            
                            float logit_value = logits[token];
                            token_probability = expf(logit_value); 
                            
                            
                            
                            if (token_probability > 1.0f) {
                                token_probability = 1.0f; 
                            }
                        }
                    }
                } catch (const std::exception& e) {
                    
                    token_probability = 0.0f;
                }
                
                
                {
                    std::lock_guard<std::mutex> lock(queue_mutex);
                    token_queue.emplace(StreamToken{
                        token_text,
                        false, 
                        token_probability,
                        token
                    });
                }
                queue_cv.notify_one();

                
                if (llama_decode(context_entry->context, llama_batch_get_one(&token, 1)) != 0) {
                    error = true;
                    error_message = "Failed to decode token";
                    break;
                }

                n_generated++;
            }

            
            {
                std::lock_guard<std::mutex> lock(queue_mutex);
                token_queue.emplace(StreamToken{"", true, 0.0f, -1}); 
            }
            queue_cv.notify_one();

            
            model->context_pool->ReleaseContext(std::move(context_entry));
            finished = true;

        } catch (const std::exception& e) {
            error = true;
            error_message = e.what();
            finished = true;
            queue_cv.notify_all();
        }
    });
}

bool llama_capi::StreamingSession::GetNextToken(llama_capi::StreamToken& token) {
    std::unique_lock<std::mutex> lock(queue_mutex);
    
    
    queue_cv.wait(lock, [this] { return !token_queue.empty() || finished.load(); });
    
    if (!token_queue.empty()) {
        token = token_queue.front();
        token_queue.pop();
        return true;
    }
    
    return false; 
}

void llama_capi::StreamingSession::Stop() {
    finished = true;
    queue_cv.notify_all();
    if (generation_thread.joinable()) {
        generation_thread.join();
    }
}


std::string llama_capi::SimpleModelManager::StartStreamingSession(const std::string& model_name, const std::string& prompt, const llama_capi::GenerationParams& params) {
    std::lock_guard<std::mutex> lock(streaming_mutex_);
    
    
    std::string session_id = "stream_" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count());
    
    
    auto session = std::make_unique<llama_capi::StreamingSession>(session_id, model_name, prompt, params);
    session->StartGeneration();
    
    streaming_sessions_[session_id] = std::move(session);
    return session_id;
}

bool llama_capi::SimpleModelManager::GetNextStreamToken(const std::string& session_id, llama_capi::StreamToken& token) {
    std::lock_guard<std::mutex> lock(streaming_mutex_);
    
    auto it = streaming_sessions_.find(session_id);
    if (it != streaming_sessions_.end()) {
        return it->second->GetNextToken(token);
    }
    return false;
}

void llama_capi::SimpleModelManager::StopStreamingSession(const std::string& session_id) {
    std::lock_guard<std::mutex> lock(streaming_mutex_);
    
    auto it = streaming_sessions_.find(session_id);
    if (it != streaming_sessions_.end()) {
        it->second->Stop();
        streaming_sessions_.erase(it);
    }
}

void llama_capi::SimpleModelManager::CleanupExpiredSessions() {
    std::lock_guard<std::mutex> lock(streaming_mutex_);
    
    auto it = streaming_sessions_.begin();
    while (it != streaming_sessions_.end()) {
        if (it->second->finished.load()) {
            it = streaming_sessions_.erase(it);
        } else {
            ++it;
        }
    }
}


std::string llama_capi::SimpleModelManager::SubmitBatchRequest(const std::string& model_name, const std::string& prompt, const llama_capi::GenerationParams& params) {
    std::lock_guard<std::mutex> lock(batch_mutex_);
    
    
    std::string request_id = "batch_" + std::to_string(std::chrono::steady_clock::now().time_since_epoch().count());
    
    llama_capi::BatchRequest request;
    request.request_id = request_id;
    request.model_name = model_name;
    request.prompt = prompt;
    request.params = params;
    request.submitted_at = std::chrono::steady_clock::now();
    
    batch_queue_.push(std::move(request));
    batch_cv_.notify_one();
    
    return request_id;
}

llama_capi::BatchResult llama_capi::SimpleModelManager::GetBatchResult(const std::string& request_id) {
    std::lock_guard<std::mutex> lock(batch_mutex_);
    
    auto it = batch_results_.find(request_id);
    if (it != batch_results_.end()) {
        return it->second;
    }
    
    
    llama_capi::BatchResult result;
    result.request_id = request_id;
    result.success = false;
    result.error_message = "Request not found";
    return result;
}

std::vector<llama_capi::BatchResult> llama_capi::SimpleModelManager::GetAllBatchResults() {
    std::lock_guard<std::mutex> lock(batch_mutex_);
    
    std::vector<llama_capi::BatchResult> results;
    for (const auto& pair : batch_results_) {
        results.push_back(pair.second);
    }
    return results;
}

} 
