#include "llama_wrapper.hpp"
#ifdef LLAMA_CPP_ENABLED
#include "llama.h"
#include "ggml.h"
#endif
#include "utils/retry_utils.hpp"
#include <iostream>
#include <fstream>
#include <sstream>
#include <chrono>

namespace duckdb_llama {

#ifdef LLAMA_CPP_ENABLED

bool LlamaWrapper::Initialize() {
    try {
        llama_backend_init();
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Failed to initialize llama.cpp: " << e.what() << std::endl;
        return false;
    }
}

bool LlamaWrapper::LoadModel(const std::string& model_path, const ModelConfig& config, LoadedModel& model) {
    try {
        llama_model_params model_params = llama_model_default_params();
        model_params.n_gpu_layers = config.n_gpu_layers;
        model_params.main_gpu = config.main_gpu;
        
        llama_model* llama_model_ptr = llama_model_load_from_file(model_path.c_str(), model_params);
        
        if (!llama_model_ptr) {
            std::string error_msg = "Failed to load model from: " + model_path;
            
            if (config.n_gpu_layers > 0) {
                throw GPUException(error_msg + " (GPU layers requested: " + std::to_string(config.n_gpu_layers) + ")");
            } else {
                throw ModelLoadException(error_msg);
            }
        }
        
        llama_context_params ctx_params = llama_context_default_params();
        ctx_params.n_ctx = config.context_size;
        ctx_params.n_threads = config.num_threads;
        ctx_params.embeddings = config.embeddings;
        ctx_params.flash_attn = config.flash_attn;
        
        llama_context* ctx = llama_init_from_model(llama_model_ptr, ctx_params);
        if (!ctx) {
            llama_model_free(llama_model_ptr);
            
            std::string error_msg = "Failed to create context";
            if (config.n_gpu_layers > 0) {
                throw GPUException(error_msg + " (GPU context creation failed)");
            } else {
                throw ModelLoadException(error_msg);
            }
        }
        
        llama_sampler_chain_params sampler_params = llama_sampler_chain_default_params();
        llama_sampler* sampler = llama_sampler_chain_init(sampler_params);
        if (!sampler) {
            llama_free(ctx);
            llama_model_free(llama_model_ptr);
            throw ModelLoadException("Failed to create sampler");
        }
        
        llama_sampler_chain_add(sampler, llama_sampler_init_top_k(config.top_k));
        llama_sampler_chain_add(sampler, llama_sampler_init_top_p(config.top_p, 1));
        llama_sampler_chain_add(sampler, llama_sampler_init_temp(config.temperature));
        llama_sampler_chain_add(sampler, llama_sampler_init_dist(LLAMA_DEFAULT_SEED));
        
        
        model.model_ptr = llama_model_ptr;
        model.context_ptr = ctx;
        model.sampler_ptr = sampler;
        model.path = model_path;
        model.config = config;
        model.is_valid = true;
        model.last_used = std::chrono::steady_clock::now();
        model.memory_usage = LlamaWrapper::GetModelMemoryUsage(model);
        
        return true;
        
    } catch (const GPUException& e) {
        
        throw;
    } catch (const ModelLoadException& e) {
        
        throw;
    } catch (const std::exception& e) {
        std::cerr << "Exception in LoadModel: " << e.what() << std::endl;
        throw ModelLoadException("Unexpected error: " + std::string(e.what()));
    }
}

void LlamaWrapper::UnloadModel(LoadedModel& model) {
    if (!model.is_valid) {
        return;
    }
    
    try {
        if (model.sampler_ptr) {
            llama_sampler_free(static_cast<llama_sampler*>(model.sampler_ptr));
            model.sampler_ptr = nullptr;
        }
        
        if (model.context_ptr) {
            llama_free(static_cast<llama_context*>(model.context_ptr));
            model.context_ptr = nullptr;
        }
        
        if (model.model_ptr) {
            llama_model_free(static_cast<llama_model*>(model.model_ptr));
            model.model_ptr = nullptr;
        }
        
        model.is_valid = false;
        model.memory_usage = 0;
        
    } catch (const std::exception& e) {
        std::cerr << "Exception in UnloadModel: " << e.what() << std::endl;
    }
}

std::string LlamaWrapper::GenerateText(LoadedModel& model, const std::string& prompt, const GenerationParams& params) {
    if (!model.is_valid || !model.context_ptr || !model.model_ptr || !model.sampler_ptr) {
        return "Error: Model not properly loaded";
    }
    
    try {
        llama_context* ctx = static_cast<llama_context*>(model.context_ptr);
        llama_model* llama_model_ptr = static_cast<llama_model*>(model.model_ptr);
        llama_sampler* sampler = static_cast<llama_sampler*>(model.sampler_ptr);
        
        
        auto memory = llama_get_memory(ctx);
        llama_memory_seq_rm(memory, 0, -1, -1); 
        
        
        llama_sampler_reset(sampler);
        
        
        const llama_vocab* vocab = llama_model_get_vocab(llama_model_ptr);
        
        
        std::vector<llama_token> tokens;
        tokens.resize(prompt.length() + 1);
        int n_tokens = llama_tokenize(vocab, prompt.c_str(), prompt.length(), tokens.data(), tokens.size(), true, true);
        
        if (n_tokens < 0) {
            tokens.resize(-n_tokens);
            n_tokens = llama_tokenize(vocab, prompt.c_str(), prompt.length(), tokens.data(), tokens.size(), true, true);
        }
        
        if (n_tokens < 0) {
            return "Error: Failed to tokenize prompt";
        }
        
        tokens.resize(n_tokens);
        
        
        llama_batch batch = llama_batch_init(tokens.size(), 0, 1);
        
        
        for (size_t i = 0; i < tokens.size(); i++) {
            batch.token[i] = tokens[i];
            batch.pos[i] = i;
            batch.n_seq_id[i] = 1;
            batch.seq_id[i][0] = 0;
            batch.logits[i] = false;
        }
        batch.n_tokens = tokens.size();
        batch.logits[batch.n_tokens - 1] = true; 
        
        
        int decode_result = llama_decode(ctx, batch);
        if (decode_result != 0) {
            llama_batch_free(batch);
            std::cerr << "llama_decode failed with code: " << decode_result << std::endl;
            return "Error: Failed to process prompt (decode error: " + std::to_string(decode_result) + ")";
        }
        
        std::ostringstream result;
        int generated_tokens = 0;
        
        
        while (generated_tokens < params.max_tokens) {
            
            llama_token new_token = llama_sampler_sample(sampler, ctx, -1);
            
            
            if (llama_vocab_is_eog(vocab, new_token)) {
                break;
            }
            
            
            char token_str[256];
            int n_chars = llama_token_to_piece(vocab, new_token, token_str, sizeof(token_str), false, true);
            
            if (n_chars > 0) {
                result << std::string(token_str, n_chars);
            }
            
            
            std::string current_text = result.str();
            bool should_stop = false;
            for (const auto& stop_seq : params.stop_sequences) {
                if (!stop_seq.empty() && current_text.find(stop_seq) != std::string::npos) {
                    should_stop = true;
                    break;
                }
            }
            
            if (should_stop) {
                break;
            }
            
            
            batch.n_tokens = 1;
            batch.token[0] = new_token;
            batch.pos[0] = tokens.size() + generated_tokens;
            batch.logits[0] = true;
            
            
            int decode_result = llama_decode(ctx, batch);
            if (decode_result != 0) {
                std::cerr << "llama_decode failed during generation with code: " << decode_result << std::endl;
                break;
            }
            
            generated_tokens++;
        }
        
        llama_batch_free(batch);
        
        
        model.last_used = std::chrono::steady_clock::now();
        
        return result.str();
        
    } catch (const std::exception& e) {
        std::cerr << "Exception in GenerateText: " << e.what() << std::endl;
        return "Error: Exception during text generation: " + std::string(e.what());
    } catch (...) {
        std::cerr << "Unknown exception in GenerateText" << std::endl;
        return "Error: Unknown exception during text generation";
    }
}

GenerationResult LlamaWrapper::Generate(LoadedModel* model, const std::string& prompt, const GenerationParams& params) {
    GenerationResult result;
    
    if (!model) {
        result.success = false;
        result.error_message = "Error: Model pointer is null";
        return result;
    }
    
    auto start_time = std::chrono::high_resolution_clock::now();
    std::string generated_text = GenerateText(*model, prompt, params);
    auto end_time = std::chrono::high_resolution_clock::now();
    
    result.text = generated_text;
    result.tokens_generated = 0; 
    result.generation_time = std::chrono::duration<double>(end_time - start_time).count();
    result.success = !generated_text.empty() && generated_text.find("Error:") != 0;
    
    if (!result.success && result.error_message.empty()) {
        result.error_message = generated_text;
    }
    
    return result;
}

size_t LlamaWrapper::GetModelMemoryUsage(const LoadedModel& model) {
    if (!model.is_valid || !model.model_ptr) {
        return 0;
    }
    
    try {
        llama_model* llama_model_ptr = static_cast<llama_model*>(model.model_ptr);
        return llama_model_size(llama_model_ptr);
    } catch (...) {
        return 0;
    }
}

bool LlamaWrapper::IsModelValid(const LoadedModel& model) {
    return model.is_valid && 
           model.model_ptr != nullptr && 
           model.context_ptr != nullptr && 
           model.sampler_ptr != nullptr;
}

ModelInfo LlamaWrapper::GetModelInfo(const std::string& path) {
    ModelInfo info;
    info.name = path.substr(path.find_last_of("/\\") + 1);
    info.path = path;
    info.is_loaded = false;
    
    
    std::ifstream file(path, std::ios::binary | std::ios::ate);
    if (file.good()) {
        info.file_size = file.tellg();
    } else {
        info.file_size = 0;
    }
    
    
    
    info.architecture = "unknown";
    info.parameter_count = 0;
    info.quantization = "unknown";
    
    return info;
}

#else 


bool LlamaWrapper::Initialize() {
    std::cerr << "llama.cpp support not compiled in" << std::endl;
    return false;
}

bool LlamaWrapper::LoadModel(const std::string& model_path, const ModelConfig& config, LoadedModel& model) {
    std::cerr << "llama.cpp support not compiled in" << std::endl;
    return false;
}

void LlamaWrapper::UnloadModel(LoadedModel& model) {
    
}

std::string LlamaWrapper::GenerateText(LoadedModel& model, const std::string& prompt, const GenerationParams& params) {
    return "Error: llama.cpp support not compiled in";
}

size_t LlamaWrapper::GetModelMemoryUsage(const LoadedModel& model) {
    return 0;
}

bool LlamaWrapper::IsModelValid(const LoadedModel& model) {
    return false;
}

ModelInfo LlamaWrapper::GetModelInfo(const std::string& path) {
    ModelInfo info;
    info.name = "stub";
    info.path = path;
    info.file_size = 0;
    info.is_loaded = false;
    info.architecture = "stub";
    info.parameter_count = 0;
    info.quantization = "stub";
    return info;
}

#endif 

} 
