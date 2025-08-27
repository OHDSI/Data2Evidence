#pragma once

#include <string>
#include <vector>
#include <regex>
#include <limits>

namespace duckdb_llama {

class SecurityValidator {
public:
    
    static bool IsValidURL(const std::string& url);
    static bool IsAllowedProtocol(const std::string& url);
    static bool IsAllowedDomain(const std::string& url);
    
    
    static bool IsValidFilePath(const std::string& path);
    static bool IsPathTraversalSafe(const std::string& path);
    static bool IsWithinAllowedDirectory(const std::string& path);
    
    
    static bool IsValidModelName(const std::string& name);
    static bool IsValidModelSize(size_t size_bytes);
    static bool IsValidContextSize(size_t context_size);
    
    
    static std::string SanitizeModelName(const std::string& name);
    static std::string SanitizeFilePath(const std::string& path);
    static std::string SanitizeUserInput(const std::string& input);
    
    
    static bool CheckMemoryLimit(size_t requested_bytes);
    static bool CheckDiskSpaceLimit(const std::string& path, size_t required_bytes);
    static bool CheckModelCountLimit();
    
    
    static void SetMaxModelSize(size_t bytes);
    static void SetMaxMemoryUsage(size_t bytes);
    static void SetMaxModelsLoaded(size_t count);
    static void SetAllowedDomains(const std::vector<std::string>& domains);
    static void SetAllowedDirectories(const std::vector<std::string>& directories);

private:
    
    static size_t max_model_size_bytes;
    static size_t max_memory_usage_bytes;
    static size_t max_models_loaded;
    static std::vector<std::string> allowed_domains;
    static std::vector<std::string> allowed_directories;
    
    
    static std::string ExtractDomain(const std::string& url);
    static std::string NormalizePath(const std::string& path);
    static bool ContainsDangerousPatterns(const std::string& input);
};

} 
