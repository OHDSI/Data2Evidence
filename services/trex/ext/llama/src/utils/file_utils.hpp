#pragma once

#include <string>
#include <vector>
#include <functional>
#include "common.hpp"

namespace duckdb_llama {

class FileUtils {
public:
    
    static bool FileExists(const std::string& path);
    static size_t GetFileSize(const std::string& path);
    static bool DeleteFile(const std::string& path);
    
    
    static std::string GetModelsDirectory();
    static std::vector<std::string> ListLocalModels();
    static bool CreateDirectoryIfNotExists(const std::string& path);
    
    
    static bool ValidateModelFile(const std::string& path);
    static bool IsValidGGUFFile(const std::string& path);
    
    
    static bool DownloadModel(const std::string& url, const std::string& destination, 
                             std::function<void(double)> progress_callback = nullptr);
    static bool DownloadFromHuggingFace(const std::string& hf_repo, const std::string& destination,
                                       const std::string& hf_token = "");

private:
    
    static bool PerformSingleDownload(const std::string& url, const std::string& destination,
                                     std::function<void(double)> progress_callback = nullptr);
    
    
    static ModelInfo GetModelInfo(const std::string& path);
    
private:
    static std::string GetDefaultModelsPath();
};

} 
