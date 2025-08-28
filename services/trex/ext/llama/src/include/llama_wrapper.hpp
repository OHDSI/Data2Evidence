#pragma once

#include "common.hpp"
#include <string>
#include <vector>

namespace duckdb_llama {


struct GenerationResult {
    std::string text;
    int tokens_generated = 0;
    double generation_time = 0.0;
    bool success = false;
    std::string error_message;
};


struct EmbeddingResult {
    std::vector<float> embeddings;
    int tokens_processed = 0;
    double processing_time = 0.0;
    bool success = false;
    std::string error_message;
};

class LlamaWrapper {
public:
    
    static bool Initialize();
    static void Cleanup();
    
    
    static bool LoadModel(const std::string& model_path, const ModelConfig& config, LoadedModel& model);
    static void UnloadModel(LoadedModel& model);
    
    
    static GenerationResult Generate(LoadedModel* model, const std::string& prompt, 
                                   const GenerationParams& params);
    static std::string GenerateText(LoadedModel& model, const std::string& prompt, const GenerationParams& params);
    
    
    static GenerationResult Chat(LoadedModel* model, const std::vector<std::pair<std::string, std::string>>& messages,
                               const GenerationParams& params);
    
    
    static EmbeddingResult GetEmbeddings(LoadedModel* model, const std::string& text);
    
    
    static bool InitializeModel(const std::string& path, LoadedModel& model, 
                               const ModelConfig& config);
    static void CleanupModel(LoadedModel& model);
    
    
    static bool ValidateModelFile(const std::string& path);
    static ModelInfo GetModelInfo(const std::string& path);
    static size_t GetModelMemoryUsage(const LoadedModel& model);
    static bool IsModelValid(const LoadedModel& model);
    
private:
    
    static std::string ApplyChatTemplate(const std::vector<std::pair<std::string, std::string>>& messages);
    static std::vector<int> TokenizeText(LoadedModel* model, const std::string& text);
    static std::string DetokenizeText(LoadedModel* model, const std::vector<int>& tokens);
};

} 
