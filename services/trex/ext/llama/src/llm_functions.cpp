#include "llm_functions.hpp"
#include "model_manager.hpp"
#include "llama_wrapper.hpp"
#include "utils/file_utils.hpp"
#ifdef LLAMA_CPP_ENABLED
#include "llama.h"
#include "ggml-backend.h"
#endif
#include "yyjson.hpp"
#include <iostream>
#include <memory>
#include <filesystem>
#include <algorithm>
#include <sstream>

using namespace duckdb_yyjson;

namespace duckdb_llama {

static std::unique_ptr<ModelManager> g_model_manager;

void EnsureModelManager() {
    if (!g_model_manager) {
        g_model_manager = std::make_unique<ModelManager>();
    }
}

struct StreamingState {
    std::string model_name;
    std::string original_prompt;
    GenerationParams params;
    LoadedModel* model;
    
    
    void* llama_ctx;
    void* llama_sampler;
    llama_batch batch;
    std::vector<llama_token> prompt_tokens;
    int generated_tokens;
    bool is_complete;
    bool is_initialized;
    bool context_ready;
    uint64_t sequence_id;
    int32_t current_pos;  
    std::chrono::steady_clock::time_point start_time;
    
    StreamingState() : model(nullptr), llama_ctx(nullptr), llama_sampler(nullptr), 
                       generated_tokens(0), is_complete(false), is_initialized(false),
                       context_ready(false), sequence_id(0), current_pos(0) {
        
        batch = llama_batch_init(1, 0, 1);
    }
    
    ~StreamingState() {
        if (batch.token) {
            llama_batch_free(batch);
        }
    }
};

static std::atomic<uint64_t> g_sequence_counter{1};


class StreamingGenerator {
public:
    static bool InitializeStream(const std::string& model_name, const std::string& prompt,
                                const GenerationParams& params, StreamingState& state) {
        EnsureModelManager();
        
        
        LoadedModel* model = g_model_manager->GetModel(model_name);
        if (!model) {
            return false;
        }
        
        
        state.model_name = model_name;
        state.original_prompt = prompt;
        state.params = params;
        state.model = model;
        state.sequence_id = g_sequence_counter++;
        state.start_time = std::chrono::steady_clock::now();
        state.generated_tokens = 0;
        state.is_complete = false;
        state.is_initialized = true;
        state.context_ready = false;
        state.prompt_tokens.clear();
        
        return true;
    }
    
    static bool GetNextToken(StreamingState& state, std::string& token_text, bool& is_final) {
        if (!state.is_initialized || !state.model || state.is_complete) {
            is_final = true;
            return false;
        }
        
        
        if (!state.context_ready) {
            
            state.llama_ctx = state.model->context_ptr;
            if (!state.llama_ctx) {
                state.is_complete = true;
                is_final = true;
                return false;
            }
            
            
            auto* ctx = static_cast<::llama_context*>(state.llama_ctx);
            auto memory = llama_get_memory(ctx);
            llama_memory_clear(memory, true); 
            
            
            llama_sampler_chain_params sampler_params = llama_sampler_chain_default_params();
            auto* sampler_chain = llama_sampler_chain_init(sampler_params);
            
            
            llama_sampler_chain_add(sampler_chain, llama_sampler_init_top_k(state.params.top_k > 0 ? state.params.top_k : 40));
            llama_sampler_chain_add(sampler_chain, llama_sampler_init_top_p(state.params.top_p > 0.0f ? state.params.top_p : 0.95f, 1));
            llama_sampler_chain_add(sampler_chain, llama_sampler_init_temp(state.params.temperature > 0.0f ? state.params.temperature : 0.7f));
            
            
            llama_sampler_chain_add(sampler_chain, llama_sampler_init_dist(0)); 
            
            state.llama_sampler = sampler_chain;
            if (!state.llama_sampler) {
                state.is_complete = true;
                is_final = true;
                return false;
            }
            
            
            auto* llama_model = static_cast<::llama_model*>(state.model->model_ptr);
            const auto* vocab = llama_model_get_vocab(llama_model);
            
            state.prompt_tokens.resize(state.original_prompt.length() + 1024);
            int n_tokens = llama_tokenize(vocab, state.original_prompt.c_str(), 
                                        state.original_prompt.length(),
                                        state.prompt_tokens.data(), 
                                        state.prompt_tokens.size(), true, true);
            
            if (n_tokens < 0) {
                state.prompt_tokens.resize(-n_tokens);
                n_tokens = llama_tokenize(vocab, state.original_prompt.c_str(),
                                        state.original_prompt.length(),
                                        state.prompt_tokens.data(),
                                        state.prompt_tokens.size(), true, true);
            }
            
            if (n_tokens <= 0) {
                state.is_complete = true;
                is_final = true;
                return false;
            }
            
            state.prompt_tokens.resize(n_tokens);
            
            
            if (state.prompt_tokens.size() > 1) {
                llama_batch_free(state.batch);
                state.batch = llama_batch_init(state.prompt_tokens.size(), 0, 1);
            }
            
            state.batch.n_tokens = state.prompt_tokens.size();
            for (size_t i = 0; i < state.prompt_tokens.size(); i++) {
                state.batch.token[i] = state.prompt_tokens[i];
                state.batch.pos[i] = i;
                state.batch.n_seq_id[i] = 1;
                state.batch.seq_id[i][0] = 0;
                state.batch.logits[i] = false;
            }
            state.batch.logits[state.batch.n_tokens - 1] = true; 
            
            
            int decode_result = llama_decode(ctx, state.batch);
            if (decode_result != 0) {
                state.is_complete = true;
                is_final = true;
                return false;
            }
            
            state.context_ready = true;
            state.generated_tokens = 0;
            state.current_pos = state.prompt_tokens.size(); 
        }
        
        
        if (state.generated_tokens >= state.params.max_tokens) {
            state.is_complete = true;
            is_final = true;
            return false;
        }
        
        auto* ctx = static_cast<::llama_context*>(state.llama_ctx);
        auto* sampler = static_cast<::llama_sampler*>(state.llama_sampler);
        auto* llama_model = static_cast<::llama_model*>(state.model->model_ptr);
        const auto* vocab = llama_model_get_vocab(llama_model);
        
        
        llama_token new_token = llama_sampler_sample(sampler, ctx, -1);
        
        
        if (llama_vocab_is_eog(vocab, new_token)) {
            state.is_complete = true;
            is_final = true;
            return false;
        }
        
        
        char token_str[256];
        int n_chars = llama_token_to_piece(vocab, new_token, token_str, sizeof(token_str), 0, true);
        
        if (n_chars > 0) {
            token_text = std::string(token_str, n_chars);
        } else {
            token_text = "";
        }
        
        
        state.batch.n_tokens = 1;
        state.batch.token[0] = new_token;
        state.batch.pos[0] = state.current_pos; 
        state.batch.n_seq_id[0] = 1;
        state.batch.seq_id[0][0] = 0;
        state.batch.logits[0] = true;
        
        
        int decode_result = llama_decode(ctx, state.batch);
        if (decode_result != 0) {
            state.is_complete = true;
            is_final = true;
            return false;
        }
        
        state.generated_tokens++;
        state.current_pos++; 
        
        
        is_final = (state.generated_tokens >= state.params.max_tokens);
        if (is_final) {
            state.is_complete = true;
        }
        
        return true;
    }
    
    static void CleanupStream(StreamingState& state) {
        if (state.llama_sampler) {
            llama_sampler_free(static_cast<::llama_sampler*>(state.llama_sampler));
            state.llama_sampler = nullptr;
        }
        
        state.is_initialized = false;
        state.is_complete = true;
        state.context_ready = false;
        state.model = nullptr;
        state.llama_ctx = nullptr;
        state.prompt_tokens.clear();
    }
};

void LlamaListModelsFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    auto local_models = FileUtils::ListLocalModels();
    auto loaded_models = g_model_manager->ListLoadedModels();
    
    
    std::string models_list = "Available Models:\n\n";
    
    if (local_models.empty()) {
        models_list += "No local models found.\n";
        models_list += "Models directory: " + FileUtils::GetModelsDirectory() + "\n";
        models_list += "To add models, place .gguf files in the models directory.";
    } else {
        models_list += "Local Models:\n";
        for (const auto& model_path : local_models) {
            
            std::filesystem::path p(model_path);
            std::string model_name = p.stem().string();
            
            
            bool is_loaded = false;
            for (const auto& loaded : loaded_models) {
                if (loaded.path == model_path) {
                    is_loaded = true;
                    break;
                }
            }
            
            
            size_t file_size = FileUtils::GetFileSize(model_path);
            double size_mb = static_cast<double>(file_size) / (1024.0 * 1024.0);
            
            models_list += "  - " + model_name;
            models_list += " (" + std::to_string(static_cast<int>(size_mb)) + " MB)";
            models_list += is_loaded ? " [LOADED]" : " [Available]";
            models_list += "\n";
        }
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, models_list);
}

void LlamaDownloadModelFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    
    auto &source_vector = args.data[0];
    auto source_data = duckdb::FlatVector::GetData<duckdb::string_t>(source_vector);
    std::string source = source_data[0].GetString();
    
    std::string destination_name;
    if (args.ColumnCount() > 1) {
        auto &dest_vector = args.data[1];
        if (!duckdb::FlatVector::IsNull(dest_vector, 0)) {
            auto dest_data = duckdb::FlatVector::GetData<duckdb::string_t>(dest_vector);
            destination_name = dest_data[0].GetString();
        }
    }
    
    
    std::string options_json = "{}";
    if (args.ColumnCount() > 2) {
        auto &options_vector = args.data[2];
        if (!duckdb::FlatVector::IsNull(options_vector, 0)) {
            auto options_data = duckdb::FlatVector::GetData<duckdb::string_t>(options_vector);
            options_json = options_data[0].GetString();
        }
    }

    
    bool is_hf_repo = source.substr(0, 3) == "hf:";
    bool is_direct_url = source.substr(0, 4) == "http";
    
    if (!is_hf_repo && !is_direct_url) {
        std::string error_msg = "Invalid source format. Use 'hf:repo/name' for Hugging Face or 'https://...' for direct URL";
        result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
        auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
        *result_data = duckdb::StringVector::AddString(result, error_msg);
        return;
    }
    
    
    std::string models_dir = FileUtils::GetModelsDirectory();
    std::string destination_path;
    
    if (destination_name.empty()) {
        
        if (is_hf_repo) {
            
            std::string repo_part = source.substr(3); 
            size_t slash_pos = repo_part.find('/');
            if (slash_pos != std::string::npos) {
                destination_name = repo_part.substr(slash_pos + 1);
                
                std::transform(destination_name.begin(), destination_name.end(), 
                             destination_name.begin(), ::tolower);
                if (destination_name.find(".gguf") == std::string::npos) {
                    destination_name += ".gguf";
                }
            } else {
                destination_name = "model.gguf";
            }
        } else {
            
            size_t slash_pos = source.find_last_of('/');
            if (slash_pos != std::string::npos) {
                destination_name = source.substr(slash_pos + 1);
            } else {
                destination_name = "downloaded_model.gguf";
            }
        }
        destination_path = models_dir + "/" + destination_name;
    } else {
        
        if (destination_name.back() == '/') {
            
            std::string target_dir;
            if (destination_name.front() == '/' || destination_name.substr(0, 2) == "./") {
                
                target_dir = destination_name;
            } else {
                
                target_dir = "./" + destination_name;
            }
            
            
            std::string filename;
            if (is_hf_repo) {
                std::string repo_part = source.substr(3); 
                size_t slash_pos = repo_part.find('/');
                if (slash_pos != std::string::npos) {
                    filename = repo_part.substr(slash_pos + 1);
                    std::transform(filename.begin(), filename.end(), filename.begin(), ::tolower);
                    if (filename.find(".gguf") == std::string::npos) {
                        filename += ".gguf";
                    }
                } else {
                    filename = "model.gguf";
                }
            } else {
                size_t slash_pos = source.find_last_of('/');
                filename = (slash_pos != std::string::npos) ? source.substr(slash_pos + 1) : "downloaded_model.gguf";
            }
            
            destination_path = target_dir + filename;
            destination_name = filename; 
        } else {
            
            if (destination_name.find(".gguf") == std::string::npos) {
                destination_name += ".gguf";
            }
            destination_path = models_dir + "/" + destination_name;
        }
    }
    
    
    std::string target_directory = destination_path.substr(0, destination_path.find_last_of('/'));
    FileUtils::CreateDirectoryIfNotExists(target_directory);
    
    
    auto progress_callback = [](double progress) {
        if ((int)progress % 10 == 0) { 
            std::cout << "Download progress: " << (int)progress << "%" << std::endl;
        }
    };
    
    
    bool success = false;
    std::string result_message;
    
    try {
        if (is_hf_repo) {
            
            std::string hf_token = "";
            if (!options_json.empty()) {
                yyjson_doc *doc = yyjson_read(options_json.c_str(), options_json.length(), 0);
                if (doc) {
                    yyjson_val *root = yyjson_doc_get_root(doc);
                    yyjson_val *token_val = yyjson_obj_get(root, "hf_token");
                    if (token_val && yyjson_is_str(token_val)) {
                        hf_token = yyjson_get_str(token_val);
                    }
                    yyjson_doc_free(doc);
                }
            }
            success = FileUtils::DownloadFromHuggingFace(source, destination_path, hf_token);
        } else {
            success = FileUtils::DownloadModel(source, destination_path, progress_callback);
        }
        
        if (success) {
            
            if (FileUtils::ValidateModelFile(destination_path)) {
                size_t file_size = FileUtils::GetFileSize(destination_path);
                double size_mb = file_size / (1024.0 * 1024.0);
                result_message = "Model downloaded successfully: " + destination_name + 
                               " (" + std::to_string((int)size_mb) + " MB)";
            } else {
                result_message = "Download completed but file validation failed: " + destination_name;
                FileUtils::DeleteFile(destination_path); 
            }
        } else {
            result_message = "Download failed: " + source;
        }
    } catch (const std::exception& e) {
        result_message = "Download error: " + std::string(e.what());
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, result_message);
}

void LlamaLoadModelFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    auto &model_path_vector = args.data[0];
    auto model_path_data = duckdb::FlatVector::GetData<duckdb::string_t>(model_path_vector);
    std::string model_path = model_path_data[0].GetString();
    
    
    ModelConfig config;
    if (args.ColumnCount() > 1) {
        auto &config_vector = args.data[1];
        auto config_data = duckdb::FlatVector::GetData<duckdb::string_t>(config_vector);
        std::string config_json = config_data[0].GetString();
        
        
        
        if (config_json.find("\"n_ctx\"") != std::string::npos) {
            
            size_t pos = config_json.find("\"n_ctx\":");
            if (pos != std::string::npos) {
                size_t start = config_json.find(":", pos) + 1;
                size_t end = config_json.find_first_of(",}", start);
                if (start != std::string::npos && end != std::string::npos) {
                    std::string ctx_str = config_json.substr(start, end - start);
                    
                    ctx_str.erase(std::remove_if(ctx_str.begin(), ctx_str.end(), ::isspace), ctx_str.end());
                    try {
                        config.context_size = std::stoi(ctx_str);
                    } catch (...) {
                        config.context_size = 2048; 
                    }
                }
            }
        }
        
        if (config_json.find("\"n_gpu_layers\"") != std::string::npos) {
            size_t pos = config_json.find("\"n_gpu_layers\":");
            if (pos != std::string::npos) {
                size_t start = config_json.find(":", pos) + 1;
                size_t end = config_json.find_first_of(",}", start);
                if (start != std::string::npos && end != std::string::npos) {
                    std::string gpu_str = config_json.substr(start, end - start);
                    gpu_str.erase(std::remove_if(gpu_str.begin(), gpu_str.end(), ::isspace), gpu_str.end());
                    try {
                        config.n_gpu_layers = std::stoi(gpu_str);
                    } catch (...) {
                        config.n_gpu_layers = 0; 
                    }
                }
            }
        }
        
        if (config_json.find("\"flash_attn\"") != std::string::npos) {
            size_t pos = config_json.find("\"flash_attn\":");
            if (pos != std::string::npos) {
                size_t start = config_json.find(":", pos) + 1;
                size_t end = config_json.find_first_of(",}", start);
                if (start != std::string::npos && end != std::string::npos) {
                    std::string flash_str = config_json.substr(start, end - start);
                    flash_str.erase(std::remove_if(flash_str.begin(), flash_str.end(), ::isspace), flash_str.end());
                    config.flash_attn = (flash_str == "true" || flash_str == "1");
                }
            }
        }
    }
    
    
    bool success = g_model_manager->LoadModel(model_path, config);
    
    
    std::string message;
    if (success) {
        message = "Model loaded successfully: " + model_path;
    } else {
        message = "Failed to load model: " + model_path;
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, message);
}

void LlamaLoadModelForEmbeddingsFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    auto &first_vector = args.data[0];
    auto first_data = duckdb::FlatVector::GetData<duckdb::string_t>(first_vector);
    std::string first_param = first_data[0].GetString();
    
    
    ModelConfig config;
    config.embeddings = true;  
    std::string model_path;
    
    
    if (first_param.find("model_path") != std::string::npos && first_param.find("{") != std::string::npos) {
        
        yyjson_doc *doc = yyjson_read(first_param.c_str(), first_param.length(), 0);
        if (doc) {
            yyjson_val *root = yyjson_doc_get_root(doc);
            if (yyjson_is_obj(root)) {
                
                if (yyjson_val *val = yyjson_obj_get(root, "model_path")) {
                    if (yyjson_is_str(val)) model_path = yyjson_get_str(val);
                }
                
                if (yyjson_val *val = yyjson_obj_get(root, "n_ctx")) {
                    if (yyjson_is_num(val)) config.context_size = yyjson_get_uint(val);
                }
                if (yyjson_val *val = yyjson_obj_get(root, "n_gpu_layers")) {
                    if (yyjson_is_num(val)) config.n_gpu_layers = yyjson_get_int(val);
                }
                if (yyjson_val *val = yyjson_obj_get(root, "num_threads")) {
                    if (yyjson_is_num(val)) config.num_threads = yyjson_get_int(val);
                }
                if (yyjson_val *val = yyjson_obj_get(root, "flash_attn")) {
                    if (yyjson_is_bool(val)) config.flash_attn = yyjson_get_bool(val);
                }
            }
            yyjson_doc_free(doc);
        }
    } else {
        
        model_path = first_param;
        
        
        if (args.ColumnCount() > 1) {
            auto &config_vector = args.data[1];
            auto config_data = duckdb::FlatVector::GetData<duckdb::string_t>(config_vector);
            if (!duckdb::FlatVector::IsNull(config_vector, 0)) {
                std::string config_json = config_data[0].GetString();
                
                
                yyjson_doc *doc = yyjson_read(config_json.c_str(), config_json.length(), 0);
                if (doc) {
                    yyjson_val *root = yyjson_doc_get_root(doc);
                    if (yyjson_is_obj(root)) {
                        
                        if (yyjson_val *val = yyjson_obj_get(root, "n_ctx")) {
                            if (yyjson_is_num(val)) config.context_size = yyjson_get_uint(val);
                        }
                        if (yyjson_val *val = yyjson_obj_get(root, "n_gpu_layers")) {
                            if (yyjson_is_num(val)) config.n_gpu_layers = yyjson_get_int(val);
                        }
                        if (yyjson_val *val = yyjson_obj_get(root, "num_threads")) {
                            if (yyjson_is_num(val)) config.num_threads = yyjson_get_int(val);
                        }
                        if (yyjson_val *val = yyjson_obj_get(root, "flash_attn")) {
                            if (yyjson_is_bool(val)) config.flash_attn = yyjson_get_bool(val);
                        }
                    }
                    yyjson_doc_free(doc);
                }
            }
        }
    }
    
    
    bool success = false;
    if (!model_path.empty()) {
        success = g_model_manager->LoadModel(model_path, config);
    }
    
    
    std::string message;
    if (success) {
        message = "Model loaded successfully for embeddings: " + model_path;
    } else {
        message = "Failed to load model for embeddings: " + model_path;
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, message);
}

void LlamaUnloadModelFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    auto &model_name_vector = args.data[0];
    auto model_name_data = duckdb::FlatVector::GetData<duckdb::string_t>(model_name_vector);
    std::string model_name = model_name_data[0].GetString();
    
    
    bool success = g_model_manager->UnloadModel(model_name);
    
    
    std::string message;
    if (success) {
        message = "Model unloaded successfully: " + model_name;
    } else {
        message = "Failed to unload model (not found): " + model_name;
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, message);
}

void LlamaListLoadedFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    auto loaded_models = g_model_manager->ListLoadedModels();
    
    std::string loaded_list = "Currently Loaded Models:\n\n";
    
    if (loaded_models.empty()) {
        loaded_list += "No models currently loaded in memory.\n";
        loaded_list += "Use llama_load_model() to load a model for text generation.";
    } else {
        for (const auto& model : loaded_models) {
            loaded_list += "  - " + model.name + " (Path: " + model.path + ")\n";
            loaded_list += "    Memory Usage: " + std::to_string(model.file_size / (1024 * 1024)) + " MB\n";
            loaded_list += "    Last Used: ";
            loaded_list += (model.last_used != std::chrono::steady_clock::time_point{} ? "Recently" : "Never");
            loaded_list += "\n";
            loaded_list += "    Status: ";
            loaded_list += (model.is_loaded ? "Ready" : "Loading");
            loaded_list += "\n\n";
        }
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, loaded_list);
}

void LlamaGenerateFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    auto &model_name_vector = args.data[0];
    auto &prompt_vector = args.data[1];
    
    auto model_name_data = duckdb::FlatVector::GetData<duckdb::string_t>(model_name_vector);
    auto prompt_data = duckdb::FlatVector::GetData<duckdb::string_t>(prompt_vector);
    
    std::string model_name = model_name_data[0].GetString();
    std::string prompt = prompt_data[0].GetString();
    
    
    GenerationParams params; 
    if (args.data.size() > 2) {
        auto &params_vector = args.data[2];
        auto params_data = duckdb::FlatVector::GetData<duckdb::string_t>(params_vector);
        std::string params_json = params_data[0].GetString();
        
        
        
        
    }
    
    
    LoadedModel* model = g_model_manager->GetModel(model_name);
    
    std::string response;
    if (!model) {
        response = "Error: Model not loaded: " + model_name;
    } else {
        
        GenerationResult gen_result = LlamaWrapper::Generate(model, prompt, params);
        
        if (gen_result.success) {
            response = gen_result.text;
        } else {
            response = gen_result.error_message.empty() ? "Generation failed: Unknown error" : ("Generation failed: " + gen_result.error_message);
        }
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, response);
}


std::string ConvertMessagesToChat(yyjson_val *messages_array) {
    if (!yyjson_is_arr(messages_array)) {
        return "";
    }
    
    std::ostringstream chat_prompt;
    yyjson_arr_iter iter = yyjson_arr_iter_with(messages_array);
    yyjson_val *message;
    
    while ((message = yyjson_arr_iter_next(&iter))) {
        if (!yyjson_is_obj(message)) continue;
        
        
        yyjson_val *role_val = yyjson_obj_get(message, "role");
        yyjson_val *content_val = yyjson_obj_get(message, "content");
        
        if (!role_val || !content_val || !yyjson_is_str(role_val) || !yyjson_is_str(content_val)) {
            continue;
        }
        
        std::string role = yyjson_get_str(role_val);
        std::string content = yyjson_get_str(content_val);
        
        
        if (role == "system") {
            chat_prompt << "System: " << content << "\n\n";
        } else if (role == "user") {
            chat_prompt << "Human: " << content << "\n\n";
        } else if (role == "assistant") {
            chat_prompt << "Assistant: " << content << "\n\n";
        } else {
            
            chat_prompt << "Human: " << content << "\n\n";
        }
    }
    
    
    chat_prompt << "Assistant: ";
    
    return chat_prompt.str();
}

void LlamaChatFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    auto &model_name_vector = args.data[0];
    auto &messages_vector = args.data[1];
    
    auto model_name_data = duckdb::FlatVector::GetData<duckdb::string_t>(model_name_vector);
    auto messages_data = duckdb::FlatVector::GetData<duckdb::string_t>(messages_vector);
    
    std::string model_name = model_name_data[0].GetString();
    std::string messages_json = messages_data[0].GetString();
    
    
    GenerationParams params; 
    if (args.data.size() > 2) {
        auto &params_vector = args.data[2];
        auto params_data = duckdb::FlatVector::GetData<duckdb::string_t>(params_vector);
        std::string params_json = params_data[0].GetString();
        
        
        
        
    }
    
    
    LoadedModel* model = g_model_manager->GetModel(model_name);
    
    std::string response;
    if (!model) {
        response = "Error: Model not loaded: " + model_name;
    } else {
        
        std::string chat_prompt;
        try {
            
            yyjson_doc *doc = yyjson_read(messages_json.c_str(), messages_json.length(), 0);
            if (!doc) {
                response = "Error: Invalid JSON format in messages";
            } else {
                yyjson_val *root = yyjson_doc_get_root(doc);
                if (!yyjson_is_arr(root)) {
                    response = "Error: Messages must be a JSON array";
                } else {
                    
                    chat_prompt = ConvertMessagesToChat(root);
                    yyjson_doc_free(doc);
                    
                    if (!chat_prompt.empty()) {
                        
                        GenerationResult gen_result = LlamaWrapper::Generate(model, chat_prompt, params);
                        
                        if (gen_result.success) {
                            response = gen_result.text;
                        } else {
                            response = gen_result.error_message.empty() ? "Generation failed: Unknown error" : ("Generation failed: " + gen_result.error_message);
                        }
                    } else {
                        response = "Error: No valid messages found";
                    }
                }
            }
        } catch (const std::exception& e) {
            response = "Error parsing messages: " + std::string(e.what());
        }
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, response);
}

void LlamaEmbedFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    auto &model_name_vector = args.data[0];
    auto model_name_data = duckdb::FlatVector::GetData<duckdb::string_t>(model_name_vector);
    std::string model_name = model_name_data[0].GetString();
    
    auto &text_vector = args.data[1];  
    auto text_data = duckdb::FlatVector::GetData<duckdb::string_t>(text_vector);
    std::string text = text_data[0].GetString();
    
    
    LoadedModel* model = g_model_manager->GetModel(model_name);
    if (!model) {
        std::string error_msg = "Model not found: " + model_name + 
                               ". Use llama_load_model() first or llama_list_loaded() to see loaded models.";
        result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
        auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
        *result_data = duckdb::StringVector::AddString(result, error_msg);
        return;
    }
    
    std::string response;
    try {
        
        
        
        auto* llama_model_ptr = static_cast<::llama_model*>(model->model_ptr);
        auto* llama_context_ptr = static_cast<::llama_context*>(model->context_ptr);
        
        if (!llama_model_ptr || !llama_context_ptr) {
            response = "Error: Invalid model or context pointers";
        } else {
            
            int n_embd = llama_model_n_embd(llama_model_ptr);
            if (n_embd <= 0) {
                response = "Error: Model does not support embeddings (n_embd = " + std::to_string(n_embd) + ")";
            } else {
                
                std::vector<llama_token> tokens(text.length() + 1);
                int n_tokens = llama_tokenize(llama_model_get_vocab(llama_model_ptr), text.c_str(), text.length(),
                                            tokens.data(), tokens.size(), true, true);
                
                if (n_tokens < 0) {
                    tokens.resize(-n_tokens);
                    n_tokens = llama_tokenize(llama_model_get_vocab(llama_model_ptr), text.c_str(), text.length(),
                                            tokens.data(), tokens.size(), true, true);
                }
                
                if (n_tokens > 0) {
                    tokens.resize(n_tokens);
                    
                    
                    llama_memory_t memory = llama_get_memory(llama_context_ptr);
                    llama_memory_clear(memory, false);
                    
                    
                    llama_batch batch = llama_batch_init(tokens.size(), 0, 1);
                    
                    
                    for (size_t i = 0; i < tokens.size(); i++) {
                        batch.token[i] = tokens[i];
                        batch.pos[i] = i;
                        batch.n_seq_id[i] = 1;
                        batch.seq_id[i][0] = 0;  
                        batch.logits[i] = true;  
                    }
                    batch.n_tokens = tokens.size();
                    
                    if (llama_decode(llama_context_ptr, batch) != 0) {
                        response = "Error: Failed to process tokens for embedding";
                        llama_batch_free(batch);
                    } else {
                        
                        int pooling_type = llama_pooling_type(llama_context_ptr);
                        
                        
                        const float* embeddings = nullptr;
                        if (pooling_type != 0) {
                            
                            embeddings = llama_get_embeddings_seq(llama_context_ptr, 0);
                        }
                        
                        if (embeddings == nullptr) {
                            
                            int n_embd = llama_model_n_embd(llama_model_ptr);
                            std::vector<float> mean_embeddings(n_embd, 0.0f);
                            int valid_tokens = 0;
                            
                            for (int i = 0; i < batch.n_tokens; i++) {
                                const float* token_embd = llama_get_embeddings_ith(llama_context_ptr, i);
                                if (token_embd != nullptr) {
                                    for (int j = 0; j < n_embd; j++) {
                                        mean_embeddings[j] += token_embd[j];
                                    }
                                    valid_tokens++;
                                }
                            }
                            
                            if (valid_tokens > 0) {
                                
                                for (int j = 0; j < n_embd; j++) {
                                    mean_embeddings[j] /= valid_tokens;
                                }
                                
                                
                                std::ostringstream oss;
                                oss << "[";
                                for (int i = 0; i < n_embd; i++) {
                                    if (i > 0) oss << ",";
                                    oss << std::fixed << std::setprecision(6) << mean_embeddings[i];
                                }
                                oss << "]";
                                response = oss.str();
                            } else {
                                response = "Error: No valid token embeddings found";
                            }
                        } else {
                            
                            int n_embd = llama_model_n_embd(llama_model_ptr);
                            
                            
                            std::ostringstream oss;
                            oss << "[";
                            for (int i = 0; i < n_embd; i++) {
                                if (i > 0) oss << ",";
                                oss << std::fixed << std::setprecision(6) << embeddings[i];
                            }
                            oss << "]";
                            response = oss.str();
                        }
                        llama_batch_free(batch);
                    }
                } else {
                    response = "Error: Failed to tokenize input text";
                }
            }
        }
        
        
        model->last_used = std::chrono::steady_clock::now();
        
    } catch (const std::exception& e) {
        response = "Embedding error: " + std::string(e.what());
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, response);
}


void LlamaGpuInfoFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    
    auto result_data = duckdb::FlatVector::GetData<duckdb::string_t>(result);
    auto &result_validity = duckdb::FlatVector::Validity(result);
    
    try {
#ifdef LLAMA_CPP_ENABLED
        
        yyjson_mut_doc *doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *root = yyjson_mut_obj(doc);
        yyjson_mut_doc_set_root(doc, root);
        
        
        bool gpu_support = llama_supports_gpu_offload();
        yyjson_mut_obj_add_bool(doc, root, "gpu_support", gpu_support);
        
        
        size_t max_devices = llama_max_devices();
        yyjson_mut_obj_add_uint(doc, root, "max_devices", max_devices);
        
        
        size_t device_count = ggml_backend_dev_count();
        yyjson_mut_obj_add_uint(doc, root, "device_count", device_count);
        
        
        yyjson_mut_val *devices_array = yyjson_mut_arr(doc);
        
        for (size_t i = 0; i < device_count; i++) {
            ggml_backend_dev_t device = ggml_backend_dev_get(i);
            if (!device) continue;
            
            yyjson_mut_val *device_obj = yyjson_mut_obj(doc);
            
            
            const char* name = ggml_backend_dev_name(device);
            const char* desc = ggml_backend_dev_description(device);
            
            yyjson_mut_obj_add_uint(doc, device_obj, "index", i);
            yyjson_mut_obj_add_str(doc, device_obj, "name", name ? name : "Unknown");
            yyjson_mut_obj_add_str(doc, device_obj, "description", desc ? desc : "No description");
            
            
            enum ggml_backend_dev_type dev_type = ggml_backend_dev_type(device);
            const char* type_str;
            switch (dev_type) {
                case GGML_BACKEND_DEVICE_TYPE_CPU:
                    type_str = "CPU";
                    break;
                case GGML_BACKEND_DEVICE_TYPE_GPU:
                    type_str = "GPU";
                    break;
                case GGML_BACKEND_DEVICE_TYPE_ACCEL:
                    type_str = "ACCELERATOR";
                    break;
                default:
                    type_str = "UNKNOWN";
                    break;
            }
            yyjson_mut_obj_add_str(doc, device_obj, "type", type_str);
            
            
            size_t free_memory = 0, total_memory = 0;
            ggml_backend_dev_memory(device, &free_memory, &total_memory);
            
            yyjson_mut_val *memory_obj = yyjson_mut_obj(doc);
            yyjson_mut_obj_add_uint(doc, memory_obj, "free_bytes", free_memory);
            yyjson_mut_obj_add_uint(doc, memory_obj, "total_bytes", total_memory);
            yyjson_mut_obj_add_uint(doc, memory_obj, "used_bytes", total_memory - free_memory);
            
            
            auto format_memory = [](size_t bytes) -> std::string {
                if (bytes == 0) return "0 B";
                const char* units[] = {"B", "KB", "MB", "GB", "TB"};
                int unit_index = 0;
                double size = static_cast<double>(bytes);
                
                while (size >= 1024.0 && unit_index < 4) {
                    size /= 1024.0;
                    unit_index++;
                }
                
                char buffer[64];
                snprintf(buffer, sizeof(buffer), "%.2f %s", size, units[unit_index]);
                return std::string(buffer);
            };
            
            yyjson_mut_obj_add_str(doc, memory_obj, "free_formatted", format_memory(free_memory).c_str());
            yyjson_mut_obj_add_str(doc, memory_obj, "total_formatted", format_memory(total_memory).c_str());
            yyjson_mut_obj_add_str(doc, memory_obj, "used_formatted", format_memory(total_memory - free_memory).c_str());
            
            yyjson_mut_obj_add_val(doc, device_obj, "memory", memory_obj);
            
            
            struct ggml_backend_dev_props props;
            ggml_backend_dev_get_props(device, &props);
            
            yyjson_mut_val *props_obj = yyjson_mut_obj(doc);
            yyjson_mut_obj_add_str(doc, props_obj, "name", props.name);
            yyjson_mut_obj_add_str(doc, props_obj, "description", props.description);
            yyjson_mut_obj_add_uint(doc, props_obj, "type", static_cast<uint32_t>(props.type));
            
            yyjson_mut_obj_add_val(doc, device_obj, "properties", props_obj);
            
            
            yyjson_mut_val *caps_obj = yyjson_mut_obj(doc);
            yyjson_mut_obj_add_bool(doc, caps_obj, "async", props.caps.async);
            yyjson_mut_obj_add_bool(doc, caps_obj, "host_buffer", props.caps.host_buffer);
            yyjson_mut_obj_add_bool(doc, caps_obj, "buffer_from_host_ptr", props.caps.buffer_from_host_ptr);
            yyjson_mut_obj_add_bool(doc, caps_obj, "events", props.caps.events);
            
            yyjson_mut_obj_add_val(doc, device_obj, "capabilities", caps_obj);
            
            yyjson_mut_arr_append(devices_array, device_obj);
        }
        
        yyjson_mut_obj_add_val(doc, root, "devices", devices_array);
        
        
        yyjson_mut_val *summary_obj = yyjson_mut_obj(doc);
        int gpu_count = 0;
        size_t total_gpu_memory = 0;
        size_t total_free_memory = 0;
        
        
        for (size_t i = 0; i < device_count; i++) {
            ggml_backend_dev_t device = ggml_backend_dev_get(i);
            if (device && ggml_backend_dev_type(device) == GGML_BACKEND_DEVICE_TYPE_GPU) {
                gpu_count++;
                size_t free = 0, total = 0;
                ggml_backend_dev_memory(device, &free, &total);
                total_gpu_memory += total;
                total_free_memory += free;
            }
        }
        
        yyjson_mut_obj_add_uint(doc, summary_obj, "gpu_count", gpu_count);
        yyjson_mut_obj_add_uint(doc, summary_obj, "total_gpu_memory_bytes", total_gpu_memory);
        yyjson_mut_obj_add_uint(doc, summary_obj, "total_free_memory_bytes", total_free_memory);
        
        double usage_percent = total_gpu_memory > 0 ? 
            ((double)(total_gpu_memory - total_free_memory) / total_gpu_memory) * 100.0 : 0.0;
        yyjson_mut_obj_add_real(doc, summary_obj, "gpu_memory_usage_percent", usage_percent);
        
        yyjson_mut_obj_add_val(doc, root, "summary", summary_obj);
        
        
        char *json_str = yyjson_mut_write(doc, YYJSON_WRITE_PRETTY, nullptr);
        if (json_str) {
            result_data[0] = duckdb::StringVector::AddString(result, json_str);
            free(json_str);
        } else {
            result_data[0] = duckdb::StringVector::AddString(result, "{\"error\": \"Failed to serialize JSON\"}");
        }
        
        yyjson_mut_doc_free(doc);
        result_validity.SetValid(0);
        
#else
        
        yyjson_mut_doc *doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *root = yyjson_mut_obj(doc);
        yyjson_mut_doc_set_root(doc, root);
        
        yyjson_mut_obj_add_str(doc, root, "error", "llama.cpp not enabled in build");
        yyjson_mut_obj_add_bool(doc, root, "gpu_support", false);
        yyjson_mut_obj_add_uint(doc, root, "device_count", 0);
        yyjson_mut_obj_add_val(doc, root, "devices", yyjson_mut_arr(doc));
        
        yyjson_mut_val *summary_obj = yyjson_mut_obj(doc);
        yyjson_mut_obj_add_uint(doc, summary_obj, "gpu_count", 0);
        yyjson_mut_obj_add_uint(doc, summary_obj, "total_gpu_memory_bytes", 0);
        yyjson_mut_obj_add_uint(doc, summary_obj, "total_free_memory_bytes", 0);
        yyjson_mut_obj_add_real(doc, summary_obj, "gpu_memory_usage_percent", 0.0);
        yyjson_mut_obj_add_val(doc, root, "summary", summary_obj);
        
        char *json_str = yyjson_mut_write(doc, YYJSON_WRITE_PRETTY, nullptr);
        if (json_str) {
            result_data[0] = duckdb::StringVector::AddString(result, json_str);
            free(json_str);
        } else {
            result_data[0] = duckdb::StringVector::AddString(result, "{\"error\": \"Failed to serialize JSON\"}");
        }
        
        yyjson_mut_doc_free(doc);
        result_validity.SetValid(0);
#endif
    } catch (const std::exception& e) {
        
        yyjson_mut_doc *doc = yyjson_mut_doc_new(nullptr);
        yyjson_mut_val *root = yyjson_mut_obj(doc);
        yyjson_mut_doc_set_root(doc, root);
        
        std::string error_msg = std::string("GPU info error: ") + e.what();
        yyjson_mut_obj_add_str(doc, root, "error", error_msg.c_str());
        yyjson_mut_obj_add_bool(doc, root, "gpu_support", false);
        yyjson_mut_obj_add_uint(doc, root, "device_count", 0);
        yyjson_mut_obj_add_val(doc, root, "devices", yyjson_mut_arr(doc));
        
        char *json_str = yyjson_mut_write(doc, 0, nullptr);
        if (json_str) {
            result_data[0] = duckdb::StringVector::AddString(result, json_str);
            free(json_str);
        } else {
            result_data[0] = duckdb::StringVector::AddString(result, "{\"error\": \"JSON serialization failed\"}");
        }
        
        yyjson_mut_doc_free(doc);
        result_validity.SetValid(0);
    }
}

void LlamaStatusFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    size_t memory_usage = g_model_manager->GetMemoryUsage();
    auto loaded_models = g_model_manager->ListLoadedModels();
    
    
    bool gpu_support = false;
    int gpu_count = 0;
    
#ifdef GGML_USE_CUDA
    gpu_support = true;
    
#elif defined(GGML_USE_VULKAN)  
    gpu_support = true;
    
#elif defined(GGML_USE_OPENCL)
    gpu_support = true;
    
#endif
    
    
    std::string status = "LLaMA Extension Status:\n";
    status += "Loaded models: " + std::to_string(loaded_models.size()) + "\n";
    
    
    double memory_mb = static_cast<double>(memory_usage) / (1024.0 * 1024.0);
    status += "Memory usage: " + std::to_string(static_cast<int>(memory_mb)) + " MB (" + std::to_string(memory_usage) + " bytes)\n";
    
    status += "GPU support: " + std::string(gpu_support ? "Available" : "CPU Only") + "\n";
    if (gpu_support) {
        status += "GPU count: " + std::to_string(gpu_count) + " (detection pending)\n";
    }
    
    
    if (!loaded_models.empty()) {
        status += "\nLoaded Models:\n";
        for (const auto& model : loaded_models) {
            double model_mb = static_cast<double>(model.file_size) / (1024.0 * 1024.0);
            status += "  - " + model.name + " (" + std::to_string(static_cast<int>(model_mb)) + " MB)";
            status += model.is_loaded ? " [ACTIVE]" : " [INACTIVE]";
            status += "\n";
        }
    }
    
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, status);
}

void LlamaModelInfoFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    auto &model_name_vector = args.data[0];
    auto model_name_data = duckdb::FlatVector::GetData<duckdb::string_t>(model_name_vector);
    std::string model_name = model_name_data[0].GetString();
    
    
    auto model = g_model_manager->GetModel(model_name);
    
    std::string info;
    if (!model) {
        info = "Model not found: " + model_name + "\nUse llama_list_loaded() to see available models.";
    } else {
        
        info = "Model Information for: " + model_name + "\n";
        info += "Path: " + model->path + "\n";
        
        
        double memory_mb = static_cast<double>(model->memory_usage) / (1024.0 * 1024.0);
        info += "Memory Usage: " + std::to_string(static_cast<int>(memory_mb)) + " MB\n";
        
        
        if (model->model_ptr) {
            
            auto model_info = LlamaWrapper::GetModelInfo(model->path);
            info += "Name: " + model_info.name + "\n";
            info += "Is Loaded: " + std::string(model_info.is_loaded ? "Yes" : "No") + "\n";
            
            
            info += "Status: Operational\n";
            info += "Last Used: Recently\n";
        }
    }
    
    result.SetVectorType(duckdb::VectorType::CONSTANT_VECTOR);
    auto result_data = duckdb::ConstantVector::GetData<duckdb::string_t>(result);
    *result_data = duckdb::StringVector::AddString(result, info);
}


struct StreamGenerateBindData : public duckdb::TableFunctionData {
    std::string model_name;
    std::string prompt;
    GenerationParams params;
    
    StreamGenerateBindData(std::string model, std::string prompt_text, GenerationParams gen_params)
        : model_name(std::move(model)), prompt(std::move(prompt_text)), params(gen_params) {}
};

struct StreamGenerateGlobalState : public duckdb::GlobalTableFunctionState {
    StreamingState stream_state;
    bool finished;
    
    StreamGenerateGlobalState() : finished(false) {}
};

static duckdb::unique_ptr<duckdb::FunctionData> StreamGenerateBind(duckdb::ClientContext &context, duckdb::TableFunctionBindInput &input,
                                                                   duckdb::vector<duckdb::LogicalType> &return_types, duckdb::vector<duckdb::string> &names) {
    
    if (input.inputs.size() < 2 || input.inputs.size() > 3) {
        throw duckdb::BinderException("llama_stream_generate requires 2 or 3 arguments: model_name, prompt, [options_json]");
    }
    
    
    std::string model_name = input.inputs[0].ToString();
    std::string prompt = input.inputs[1].ToString();
    
    GenerationParams params; 
    if (input.inputs.size() > 2) {
        std::string params_json = input.inputs[2].ToString();
        
    }
    
    
    return_types.push_back(duckdb::LogicalType::BIGINT);    
    return_types.push_back(duckdb::LogicalType::BIGINT);    
    return_types.push_back(duckdb::LogicalType::VARCHAR);   
    return_types.push_back(duckdb::LogicalType::BOOLEAN);   
    return_types.push_back(duckdb::LogicalType::VARCHAR);   
    return_types.push_back(duckdb::LogicalType::DOUBLE);    
    
    names.push_back("sequence_id");
    names.push_back("token_index");
    names.push_back("token");
    names.push_back("is_final");
    names.push_back("cumulative_text");
    names.push_back("generation_time_ms");
    
    return duckdb::make_uniq<StreamGenerateBindData>(model_name, prompt, params);
}

static duckdb::unique_ptr<duckdb::GlobalTableFunctionState> StreamGenerateInitGlobal(duckdb::ClientContext &context, duckdb::TableFunctionInitInput &input) {
    auto result = duckdb::make_uniq<StreamGenerateGlobalState>();
    auto &bind_data = input.bind_data->Cast<StreamGenerateBindData>();
    
    
    if (!StreamingGenerator::InitializeStream(bind_data.model_name, bind_data.prompt, bind_data.params, result->stream_state)) {
        result->finished = true;
    }
    
    return std::move(result);
}

static void StreamGenerateFunction(duckdb::ClientContext &context, duckdb::TableFunctionInput &data_p, duckdb::DataChunk &output) {
    auto &bind_data = data_p.bind_data->Cast<StreamGenerateBindData>();
    auto &global_state = data_p.global_state->Cast<StreamGenerateGlobalState>();
    
    if (global_state.finished) {
        return; 
    }
    
    duckdb::idx_t count = 0;
    auto start_time = std::chrono::steady_clock::now();
    
    while (count < STANDARD_VECTOR_SIZE && !global_state.finished) {
        std::string token_text;
        bool is_final;
        
        if (StreamingGenerator::GetNextToken(global_state.stream_state, token_text, is_final)) {
            
            auto current_time = std::chrono::steady_clock::now();
            auto duration = std::chrono::duration_cast<std::chrono::microseconds>(current_time - start_time);
            double generation_time_ms = duration.count() / 1000.0;
            
            
            output.data[0].SetValue(count, duckdb::Value::BIGINT(global_state.stream_state.sequence_id));
            output.data[1].SetValue(count, duckdb::Value::BIGINT(global_state.stream_state.generated_tokens - 1));
            output.data[2].SetValue(count, duckdb::Value(token_text));
            output.data[3].SetValue(count, duckdb::Value::BOOLEAN(is_final));
            output.data[4].SetValue(count, duckdb::Value("")); 
            output.data[5].SetValue(count, duckdb::Value::DOUBLE(generation_time_ms));
            
            count++;
            
            if (is_final) {
                global_state.finished = true;
                StreamingGenerator::CleanupStream(global_state.stream_state);
            }
        } else {
            global_state.finished = true;
            StreamingGenerator::CleanupStream(global_state.stream_state);
        }
    }
    
    output.SetCardinality(count);
}


struct StreamChatBindData : public duckdb::TableFunctionData {
    std::string model_name;
    std::string messages_json;
    GenerationParams params;
    
    StreamChatBindData(std::string model, std::string messages, GenerationParams gen_params)
        : model_name(std::move(model)), messages_json(std::move(messages)), params(gen_params) {}
};

static duckdb::unique_ptr<duckdb::FunctionData> StreamChatBind(duckdb::ClientContext &context, duckdb::TableFunctionBindInput &input,
                                                               duckdb::vector<duckdb::LogicalType> &return_types, duckdb::vector<duckdb::string> &names) {
    
    return_types.push_back(duckdb::LogicalType::BIGINT);    
    return_types.push_back(duckdb::LogicalType::BIGINT);    
    return_types.push_back(duckdb::LogicalType::VARCHAR);   
    return_types.push_back(duckdb::LogicalType::BOOLEAN);   
    return_types.push_back(duckdb::LogicalType::VARCHAR);   
    return_types.push_back(duckdb::LogicalType::DOUBLE);    
    
    names.push_back("sequence_id");
    names.push_back("token_index");
    names.push_back("token");
    names.push_back("is_final");
    names.push_back("cumulative_text");
    names.push_back("generation_time_ms");
    
    if (input.inputs.size() < 2 || input.inputs.size() > 3) {
        throw duckdb::BinderException("llama_stream_chat requires 2 or 3 arguments: model_name, messages_json, [options_json]");
    }
    
    std::string model_name = input.inputs[0].ToString();
    std::string messages_json = input.inputs[1].ToString();
    
    GenerationParams params; 
    if (input.inputs.size() > 2) {
        std::string params_json = input.inputs[2].ToString();
        
    }
    
    return duckdb::make_uniq<StreamChatBindData>(model_name, messages_json, params);
}

static duckdb::unique_ptr<duckdb::GlobalTableFunctionState> StreamChatInitGlobal(duckdb::ClientContext &context, duckdb::TableFunctionInitInput &input) {
    auto result = duckdb::make_uniq<StreamGenerateGlobalState>();
    auto &bind_data = input.bind_data->Cast<StreamChatBindData>();
    
    
    std::string chat_prompt;
    try {
        yyjson_doc *doc = yyjson_read(bind_data.messages_json.c_str(), bind_data.messages_json.length(), 0);
        if (doc) {
            yyjson_val *root = yyjson_doc_get_root(doc);
            if (yyjson_is_arr(root)) {
                chat_prompt = ConvertMessagesToChat(root);
            }
            yyjson_doc_free(doc);
        }
    } catch (const std::exception& e) {
        result->finished = true;
        return std::move(result);
    }
    
    if (chat_prompt.empty()) {
        result->finished = true;
        return std::move(result);
    }
    
    
    if (!StreamingGenerator::InitializeStream(bind_data.model_name, chat_prompt, bind_data.params, result->stream_state)) {
        result->finished = true;
    }
    
    return std::move(result);
}

static void StreamChatFunction(duckdb::ClientContext &context, duckdb::TableFunctionInput &data_p, duckdb::DataChunk &output) {
    
    StreamGenerateFunction(context, data_p, output);
}


struct GenerateLinesBindData : public duckdb::TableFunctionData {
    std::string model_name;
    std::string prompt;
    GenerationParams params;
    
    GenerateLinesBindData(std::string model, std::string prompt_text, GenerationParams gen_params)
        : model_name(std::move(model)), prompt(std::move(prompt_text)), params(gen_params) {}
};

struct GenerateLinesGlobalState : public duckdb::GlobalTableFunctionState {
    std::vector<std::string> completed_lines;
    std::vector<int> line_tokens;
    std::vector<double> line_times;
    std::string current_line_buffer;
    size_t current_line_index = 0;
    bool generation_started = false;
    bool finished = false;
    std::unique_ptr<StreamingState> stream_state;
    std::chrono::steady_clock::time_point line_start_time;
    int line_token_count = 0;
    
    duckdb::idx_t MaxThreads() const override { return 1; }
};

static duckdb::unique_ptr<duckdb::FunctionData> GenerateLinesBind(duckdb::ClientContext &context, duckdb::TableFunctionBindInput &input,
                                                                  duckdb::vector<duckdb::LogicalType> &return_types, duckdb::vector<duckdb::string> &names) {
    
    return_types.push_back(duckdb::LogicalType::INTEGER);
    return_types.push_back(duckdb::LogicalType::VARCHAR);
    return_types.push_back(duckdb::LogicalType::INTEGER);
    return_types.push_back(duckdb::LogicalType::DOUBLE);
    names.push_back("line_number");
    names.push_back("line_text");
    names.push_back("tokens");
    names.push_back("time_ms");
    
    if (input.inputs.size() < 2) {
        throw duckdb::InvalidInputException("llama_generate_lines requires at least 2 parameters: model_name, prompt");
    }
    
    
    std::string model_name = input.inputs[0].ToString();
    std::string prompt = input.inputs[1].ToString();
    
    
    GenerationParams params; 
    if (input.inputs.size() > 2) {
        std::string params_json = input.inputs[2].ToString();
        
        
        if (!params_json.empty() && params_json != "{}") {
            yyjson_doc *doc = yyjson_read(params_json.c_str(), params_json.length(), 0);
            if (doc) {
                yyjson_val *root = yyjson_doc_get_root(doc);
                
                
                yyjson_val *max_tokens_val = yyjson_obj_get(root, "max_tokens");
                if (max_tokens_val && yyjson_is_int(max_tokens_val)) {
                    params.max_tokens = yyjson_get_int(max_tokens_val);
                }
                
                
                yyjson_val *temperature_val = yyjson_obj_get(root, "temperature");
                if (temperature_val && yyjson_is_num(temperature_val)) {
                    params.temperature = yyjson_get_real(temperature_val);
                }
                
                
                yyjson_val *top_p_val = yyjson_obj_get(root, "top_p");
                if (top_p_val && yyjson_is_num(top_p_val)) {
                    params.top_p = yyjson_get_real(top_p_val);
                }
                
                
                yyjson_val *top_k_val = yyjson_obj_get(root, "top_k");
                if (top_k_val && yyjson_is_int(top_k_val)) {
                    params.top_k = yyjson_get_int(top_k_val);
                }
                
                yyjson_doc_free(doc);
            }
        }
    }
    
    return duckdb::make_uniq<GenerateLinesBindData>(model_name, prompt, params);
}

static duckdb::unique_ptr<duckdb::GlobalTableFunctionState> GenerateLinesInitGlobal(duckdb::ClientContext &context, duckdb::TableFunctionInitInput &input) {
    return duckdb::make_uniq<GenerateLinesGlobalState>();
}

static void GenerateLinesFunction(duckdb::ClientContext &context, duckdb::TableFunctionInput &data_p, duckdb::DataChunk &output) {
    auto &bind_data = data_p.bind_data->CastNoConst<GenerateLinesBindData>();
    auto &gstate = data_p.global_state->Cast<GenerateLinesGlobalState>();
    
    
    if (!gstate.generation_started) {
        EnsureModelManager();
        
        
        gstate.stream_state = std::make_unique<StreamingState>();
        if (!StreamingGenerator::InitializeStream(bind_data.model_name, bind_data.prompt, bind_data.params, *gstate.stream_state)) {
            
            output.data[0].SetValue(0, static_cast<int32_t>(1));
            output.data[1].SetValue(0, duckdb::string_t("Error: Failed to initialize stream for model: " + bind_data.model_name));
            output.data[2].SetValue(0, static_cast<int32_t>(0));
            output.data[3].SetValue(0, 0.0);
            output.SetCardinality(1);
            gstate.finished = true;
            return;
        }
        gstate.generation_started = true;
        gstate.line_start_time = std::chrono::steady_clock::now();
    }
    
    if (gstate.finished) {
        output.SetCardinality(0);
        return;
    }
    
    
    if (gstate.current_line_index < gstate.completed_lines.size()) {
        
        duckdb::idx_t output_count = 0;
        const duckdb::idx_t max_output = std::min<duckdb::idx_t>(STANDARD_VECTOR_SIZE, gstate.completed_lines.size() - gstate.current_line_index);
        
        for (duckdb::idx_t i = 0; i < max_output; i++) {
            output.data[0].SetValue(i, static_cast<int32_t>(gstate.current_line_index + i + 1));
            output.data[1].SetValue(i, duckdb::string_t(gstate.completed_lines[gstate.current_line_index + i]));
            output.data[2].SetValue(i, static_cast<int32_t>(gstate.line_tokens[gstate.current_line_index + i]));
            output.data[3].SetValue(i, gstate.line_times[gstate.current_line_index + i]);
            output_count++;
        }
        
        gstate.current_line_index += output_count;
        output.SetCardinality(output_count);
        return;
    }
    
    
    if (gstate.stream_state && !gstate.stream_state->is_complete) {
        
        
        int tokens_processed = 0;
        
        while (!gstate.stream_state->is_complete) {
            std::string token_text;
            bool is_final = false;
            if (StreamingGenerator::GetNextToken(*gstate.stream_state, token_text, is_final)) {
                tokens_processed++;
                gstate.line_token_count++;
                gstate.current_line_buffer += token_text;
                
                
                if (token_text.find('\n') != std::string::npos) {
                    
                    
                    std::istringstream stream(gstate.current_line_buffer);
                    std::string line;
                    std::vector<std::string> lines;
                    
                    while (std::getline(stream, line)) {
                        lines.push_back(line);
                    }
                    
                    
                    
                    bool ends_with_newline = !gstate.current_line_buffer.empty() && gstate.current_line_buffer.back() == '\n';
                    size_t complete_lines_count = ends_with_newline ? lines.size() : (lines.size() > 0 ? lines.size() - 1 : 0);
                    
                    for (size_t i = 0; i < complete_lines_count; i++) {
                        auto line_end_time = std::chrono::steady_clock::now();
                        double line_time_ms = std::chrono::duration<double, std::milli>(line_end_time - gstate.line_start_time).count();
                        
                        gstate.completed_lines.push_back(lines[i]);
                        gstate.line_tokens.push_back(gstate.line_token_count);
                        gstate.line_times.push_back(line_time_ms);
                        
                        gstate.line_start_time = std::chrono::steady_clock::now();
                        gstate.line_token_count = 0;
                    }
                    
                    
                    if (ends_with_newline) {
                        gstate.current_line_buffer = "";
                    } else {
                        gstate.current_line_buffer = lines.empty() ? "" : lines.back();
                    }
                    
                }
                
                
                if (gstate.completed_lines.size() > gstate.current_line_index) {
                    duckdb::idx_t output_count = 0;
                    const duckdb::idx_t max_output = std::min<duckdb::idx_t>(STANDARD_VECTOR_SIZE, gstate.completed_lines.size() - gstate.current_line_index);
                    
                    
                    for (duckdb::idx_t i = 0; i < max_output; i++) {
                        output.data[0].SetValue(i, static_cast<int32_t>(gstate.current_line_index + i + 1));
                        output.data[1].SetValue(i, duckdb::string_t(gstate.completed_lines[gstate.current_line_index + i]));
                        output.data[2].SetValue(i, static_cast<int32_t>(gstate.line_tokens[gstate.current_line_index + i]));
                        output.data[3].SetValue(i, gstate.line_times[gstate.current_line_index + i]);
                        output_count++;
                    }
                    
                    gstate.current_line_index += output_count;
                    output.SetCardinality(output_count);
                    return;
                }
            } else {
                
                gstate.stream_state->is_complete = true;
                break;
            }
        }
        
        
        
        if (!gstate.stream_state->is_complete) {
        }
        
        
        if (gstate.stream_state->is_complete) {
            
            if (!gstate.current_line_buffer.empty()) {
                auto line_end_time = std::chrono::steady_clock::now();
                double line_time_ms = std::chrono::duration<double, std::milli>(line_end_time - gstate.line_start_time).count();
                
                gstate.completed_lines.push_back(gstate.current_line_buffer);
                gstate.line_tokens.push_back(gstate.line_token_count);
                gstate.line_times.push_back(line_time_ms);
                gstate.current_line_buffer.clear();
                
            }
            
            
            if (gstate.completed_lines.empty() && !gstate.current_line_buffer.empty()) {
                
                auto line_end_time = std::chrono::steady_clock::now();
                double line_time_ms = std::chrono::duration<double, std::milli>(line_end_time - gstate.line_start_time).count();
                int total_tokens = gstate.stream_state->generated_tokens;
                
                gstate.completed_lines.push_back(gstate.current_line_buffer);
                gstate.line_tokens.push_back(total_tokens);
                gstate.line_times.push_back(line_time_ms);
                
            }
            
            gstate.finished = true;
        }
        
        
        if (gstate.current_line_index < gstate.completed_lines.size()) {
            duckdb::idx_t output_count = 0;
            const duckdb::idx_t max_output = std::min<duckdb::idx_t>(STANDARD_VECTOR_SIZE, gstate.completed_lines.size() - gstate.current_line_index);
            
            
            for (duckdb::idx_t i = 0; i < max_output; i++) {
                output.data[0].SetValue(i, static_cast<int32_t>(gstate.current_line_index + i + 1));
                output.data[1].SetValue(i, duckdb::string_t(gstate.completed_lines[gstate.current_line_index + i]));
                output.data[2].SetValue(i, static_cast<int32_t>(gstate.line_tokens[gstate.current_line_index + i]));
                output.data[3].SetValue(i, gstate.line_times[gstate.current_line_index + i]);
                output_count++;
            }
            
            gstate.current_line_index += output_count;
            output.SetCardinality(output_count);
            return;
        }
    }
    
    
    if (gstate.finished) {
        output.SetCardinality(0);
    } else {
        
        output.SetCardinality(0);
    }
}

void RegisterModelManagementFunctions(duckdb::DatabaseInstance &db) {
    
    duckdb::ScalarFunctionSet list_models_functions("llama_list_models");
    list_models_functions.AddFunction(duckdb::ScalarFunction(
        {}, 
        duckdb::LogicalType::VARCHAR,
        LlamaListModelsFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, list_models_functions);
    
    
    duckdb::ScalarFunctionSet download_model_functions("llama_download_model");
    
    download_model_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaDownloadModelFunction
    ));
    
    download_model_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaDownloadModelFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, download_model_functions);
    
    
    duckdb::ScalarFunctionSet load_model_functions("llama_load_model");
    
    load_model_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaLoadModelFunction
    ));
    
    load_model_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaLoadModelFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, load_model_functions);
    
    
    duckdb::ScalarFunctionSet load_model_embeddings_functions("llama_load_model_for_embeddings");
    
    load_model_embeddings_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaLoadModelForEmbeddingsFunction
    ));
    
    load_model_embeddings_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaLoadModelForEmbeddingsFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, load_model_embeddings_functions);
    
    
    duckdb::ScalarFunctionSet unload_model_functions("llama_unload_model");
    unload_model_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaUnloadModelFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, unload_model_functions);
    
    
    duckdb::ScalarFunctionSet list_loaded_functions("llama_list_loaded");
    list_loaded_functions.AddFunction(duckdb::ScalarFunction(
        {}, 
        duckdb::LogicalType::VARCHAR,
        LlamaListLoadedFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, list_loaded_functions);
}

void LlamaBatchProcessFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    auto &manager = ModelManager::GetInstance();
    auto count = args.size();
    
    for (idx_t i = 0; i < count; i++) {
        try {
            
            std::string json_request = args.GetValue(0, i).GetValueUnsafe<duckdb::string_t>().GetString();
            BatchRequest request(json_request);
            
            
            auto batch_result = manager.ProcessBatch(request);
            
            
            std::stringstream ss;
            ss << "{";
            ss << "\"success\": " << (batch_result.success ? "true" : "false") << ",";
            ss << "\"total_time_ms\": " << batch_result.total_time.count() << ",";
            ss << "\"outputs\": [";
            for (size_t j = 0; j < batch_result.outputs.size(); ++j) {
                if (j > 0) ss << ",";
                ss << "\"" << batch_result.outputs[j] << "\"";
            }
            ss << "],";
            ss << "\"errors\": [";
            for (size_t j = 0; j < batch_result.errors.size(); ++j) {
                if (j > 0) ss << ",";
                ss << "\"" << batch_result.errors[j] << "\"";
            }
            ss << "]}";
            
            result.SetValue(i, duckdb::Value(ss.str()));
            
        } catch (const std::exception& e) {
            std::string error_msg = "Batch processing failed: " + std::string(e.what());
            result.SetValue(i, duckdb::Value(error_msg));
        }
    }
}


void LlamaStreamConsoleFunction(duckdb::DataChunk &args, duckdb::ExpressionState &state, duckdb::Vector &result) {
    EnsureModelManager();
    
    
    std::string model_name = args.GetValue(0, 0).GetValueUnsafe<duckdb::string_t>().GetString();
    std::string prompt = args.GetValue(1, 0).GetValueUnsafe<duckdb::string_t>().GetString();
    
    
    GenerationParams params; 
    if (args.ColumnCount() > 2) {
        std::string params_json = args.GetValue(2, 0).GetValueUnsafe<duckdb::string_t>().GetString();
        
        if (!params_json.empty() && params_json != "{}") {
            yyjson_doc *doc = yyjson_read(params_json.c_str(), params_json.length(), 0);
            if (doc) {
                yyjson_val *root = yyjson_doc_get_root(doc);
                
                yyjson_val *max_tokens_val = yyjson_obj_get(root, "max_tokens");
                if (max_tokens_val && yyjson_is_int(max_tokens_val)) {
                    params.max_tokens = yyjson_get_int(max_tokens_val);
                }
                
                yyjson_val *temperature_val = yyjson_obj_get(root, "temperature");
                if (temperature_val && yyjson_is_num(temperature_val)) {
                    params.temperature = yyjson_get_real(temperature_val);
                }
                
                yyjson_val *top_p_val = yyjson_obj_get(root, "top_p");
                if (top_p_val && yyjson_is_num(top_p_val)) {
                    params.top_p = yyjson_get_real(top_p_val);
                }
                
                yyjson_val *top_k_val = yyjson_obj_get(root, "top_k");
                if (top_k_val && yyjson_is_int(top_k_val)) {
                    params.top_k = yyjson_get_int(top_k_val);
                }
                
                yyjson_doc_free(doc);
            }
        }
    }
    
    
    StreamingState stream_state;
    if (!StreamingGenerator::InitializeStream(model_name, prompt, params, stream_state)) {
        result.SetValue(0, duckdb::Value("Error: Failed to initialize streaming"));
        return;
    }
    
    
    std::cout << "\n=== Streaming Generation ===" << std::endl;
    std::cout << "Model: " << model_name << std::endl;
    std::cout << "Prompt: " << prompt << std::endl;
    std::cout << "Max tokens: " << params.max_tokens << std::endl;
    std::cout << "===========================\n" << std::endl;
    
    
    std::string full_text;
    int total_tokens = 0;
    auto start_time = std::chrono::steady_clock::now();
    
    while (!stream_state.is_complete) {
        std::string token_text;
        bool is_final = false;
        
        if (StreamingGenerator::GetNextToken(stream_state, token_text, is_final)) {
            
            std::cout << token_text << std::flush;
            full_text += token_text;
            total_tokens++;
        } else {
            
            break;
        }
    }
    
    auto end_time = std::chrono::steady_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::milliseconds>(end_time - start_time);
    
    
    std::cout << "\n\n=== Generation Complete ===" << std::endl;
    std::cout << "Total tokens: " << total_tokens << std::endl;
    std::cout << "Time: " << duration.count() << " ms" << std::endl;
    std::cout << "Speed: " << (total_tokens > 0 ? (total_tokens * 1000.0 / duration.count()) : 0) << " tokens/sec" << std::endl;
    std::cout << "===========================" << std::endl;
    
    
    StreamingGenerator::CleanupStream(stream_state);
    
    
    std::stringstream summary;
    summary << "Generated " << total_tokens << " tokens in " << duration.count() 
            << " ms (" << (total_tokens > 0 ? (total_tokens * 1000.0 / duration.count()) : 0) 
            << " tokens/sec)";
    
    result.SetValue(0, duckdb::Value(summary.str()));
}

void RegisterGenerationFunctions(duckdb::DatabaseInstance &db) {
    
    duckdb::ScalarFunctionSet generate_functions("llama_generate");
    
    generate_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaGenerateFunction
    ));
    
    generate_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaGenerateFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, generate_functions);
    
    
    duckdb::ScalarFunctionSet chat_functions("llama_chat");
    
    chat_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaChatFunction
    ));
    
    chat_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaChatFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, chat_functions);
    
    
    duckdb::ScalarFunctionSet embed_functions("llama_embed");
    embed_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaEmbedFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, embed_functions);
    
    duckdb::ScalarFunctionSet batch_functions("llama_batch_process");
    batch_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaBatchProcessFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, batch_functions);
}

void RegisterStatusFunctions(duckdb::DatabaseInstance &db) {
    
    duckdb::ScalarFunctionSet status_functions("llama_status");
    status_functions.AddFunction(duckdb::ScalarFunction(
        {}, 
        duckdb::LogicalType::VARCHAR,
        LlamaStatusFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, status_functions);
    
    
    duckdb::ScalarFunctionSet model_info_functions("llama_model_info");
    model_info_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR}, 
        duckdb::LogicalType::VARCHAR,
        LlamaModelInfoFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, model_info_functions);
    
    
    duckdb::ScalarFunctionSet gpu_info_functions("llama_gpu_info");
    gpu_info_functions.AddFunction(duckdb::ScalarFunction(
        {}, 
        duckdb::LogicalType::VARCHAR,
        LlamaGpuInfoFunction
    ));
    duckdb::ExtensionUtil::RegisterFunction(db, gpu_info_functions);
    
    duckdb::TableFunction stream_generate_func("llama_stream_generate", {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
                                               StreamGenerateFunction, StreamGenerateBind, StreamGenerateInitGlobal);
    stream_generate_func.named_parameters["options"] = duckdb::LogicalType::VARCHAR;
    duckdb::ExtensionUtil::RegisterFunction(db, stream_generate_func);
    
    duckdb::TableFunction stream_chat_func("llama_stream_chat", {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
                                          StreamChatFunction, StreamChatBind, StreamChatInitGlobal);
    stream_chat_func.named_parameters["options"] = duckdb::LogicalType::VARCHAR;
    duckdb::ExtensionUtil::RegisterFunction(db, stream_chat_func);
    
    
    duckdb::ScalarFunctionSet console_stream_functions("llama_stream_console");
    console_stream_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, duckdb::LogicalType::VARCHAR, LlamaStreamConsoleFunction));
    console_stream_functions.AddFunction(duckdb::ScalarFunction(
        {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, duckdb::LogicalType::VARCHAR, LlamaStreamConsoleFunction));
    duckdb::ExtensionUtil::RegisterFunction(db, console_stream_functions);
    
    
    duckdb::TableFunction generate_lines_func("llama_generate_lines", {duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR, duckdb::LogicalType::VARCHAR}, 
                                             GenerateLinesFunction, GenerateLinesBind, GenerateLinesInitGlobal);
    duckdb::ExtensionUtil::RegisterFunction(db, generate_lines_func);
}

} 
