#include "security_validator.hpp"
#include "../include/model_manager.hpp"
#include <filesystem>
#include <algorithm>
#include <cctype>
#include <iostream>

namespace duckdb_llama {


size_t SecurityValidator::max_model_size_bytes = 10ULL * 1024 * 1024 * 1024; 
size_t SecurityValidator::max_memory_usage_bytes = 16ULL * 1024 * 1024 * 1024; 
size_t SecurityValidator::max_models_loaded = 10; 
std::vector<std::string> SecurityValidator::allowed_domains = {
    "huggingface.co",
    "hf.co", 
    "raw.githubusercontent.com",
    "github.com",
    "httpbin.org" 
};
std::vector<std::string> SecurityValidator::allowed_directories = {
    "./models/",
    "./downloads/",
    "/tmp/llama/",
    "/home/"  
};

bool SecurityValidator::IsValidURL(const std::string& url) {
    if (url.empty() || url.length() > 2048) { 
        return false;
    }
    
    
    std::regex url_pattern(R"(^https?:\/\/[a-zA-Z0-9\-\.]+[a-zA-Z]{2,}(:[0-9]+)?(\/.*)?$)");
    if (!std::regex_match(url, url_pattern)) {
        return false;
    }
    
    return IsAllowedProtocol(url) && IsAllowedDomain(url);
}

bool SecurityValidator::IsAllowedProtocol(const std::string& url) {
    return url.substr(0, 8) == "https://" || url.substr(0, 7) == "http://";
}

bool SecurityValidator::IsAllowedDomain(const std::string& url) {
    std::string domain = ExtractDomain(url);
    if (domain.empty()) {
        return false;
    }
    
    
    for (const auto& allowed : allowed_domains) {
        if (domain == allowed) {
            return true;
        }
        
        
        std::string subdomain_pattern = "." + allowed;
        if (domain.length() >= subdomain_pattern.length() &&
            domain.substr(domain.length() - subdomain_pattern.length()) == subdomain_pattern) {
            return true;
        }
    }
    
    return false;
}

bool SecurityValidator::IsValidFilePath(const std::string& path) {
    if (path.empty() || path.length() > 4096) { 
        return false;
    }
    
    return IsPathTraversalSafe(path) && IsWithinAllowedDirectory(path);
}

bool SecurityValidator::IsPathTraversalSafe(const std::string& path) {
    
    if (path.find("..") != std::string::npos) {
        return false;
    }
    
    
    return !ContainsDangerousPatterns(path);
}

bool SecurityValidator::IsWithinAllowedDirectory(const std::string& path) {
    std::string normalized = NormalizePath(path);
    
    for (const auto& allowed : allowed_directories) {
        std::string allowed_normalized = NormalizePath(allowed);
        if (normalized.substr(0, allowed_normalized.length()) == allowed_normalized) {
            return true;
        }
    }
    
    return false;
}

bool SecurityValidator::IsValidModelName(const std::string& name) {
    if (name.empty() || name.length() > 256) {
        return false;
    }
    
    
    std::regex name_pattern(R"(^[a-zA-Z0-9\-_\.]+$)");
    return std::regex_match(name, name_pattern) && !ContainsDangerousPatterns(name);
}

bool SecurityValidator::IsValidModelSize(size_t size_bytes) {
    return size_bytes > 0 && size_bytes <= max_model_size_bytes;
}

bool SecurityValidator::IsValidContextSize(size_t context_size) {
    return context_size >= 128 && context_size <= 32768; 
}

std::string SecurityValidator::SanitizeModelName(const std::string& name) {
    std::string sanitized;
    for (char c : name) {
        if (std::isalnum(c) || c == '-' || c == '_' || c == '.') {
            sanitized += c;
        }
    }
    
    
    if (sanitized.length() > 256) {
        sanitized = sanitized.substr(0, 256);
    }
    
    return sanitized;
}

std::string SecurityValidator::SanitizeFilePath(const std::string& path) {
    std::string sanitized = path;
    
    
    sanitized.erase(std::remove_if(sanitized.begin(), sanitized.end(), 
                                  [](char c) { return c < 32 && c != '\t' && c != '\n'; }), 
                   sanitized.end());
    
    
    try {
        sanitized = std::filesystem::path(sanitized).lexically_normal().string();
    } catch (...) {
        
        return "";
    }
    
    return sanitized;
}

std::string SecurityValidator::SanitizeUserInput(const std::string& input) {
    std::string sanitized = input;
    
    
    sanitized.erase(std::remove_if(sanitized.begin(), sanitized.end(), 
                                  [](char c) { return c < 32 && c != '\t' && c != '\n' && c != '\r'; }), 
                   sanitized.end());
    
    
    if (sanitized.length() > 100000) { 
        sanitized = sanitized.substr(0, 100000);
    }
    
    return sanitized;
}

bool SecurityValidator::CheckMemoryLimit(size_t requested_bytes) {
    return requested_bytes <= max_memory_usage_bytes;
}

bool SecurityValidator::CheckDiskSpaceLimit(const std::string& path, size_t required_bytes) {
    try {
        auto space_info = std::filesystem::space(std::filesystem::path(path).parent_path());
        return space_info.available >= required_bytes;
    } catch (...) {
        return false; 
    }
}

bool SecurityValidator::CheckModelCountLimit() {
    
    
    try {
        auto& manager = ModelManager::GetInstance();
        auto loaded_models = manager.ListLoadedModels();
        size_t current_count = loaded_models.size();
        
        if (max_models_loaded > 0 && current_count >= max_models_loaded) {
            std::cerr << "Model count limit exceeded: " << current_count 
                     << " >= " << max_models_loaded << std::endl;
            return false;
        }
        
        return true;
    } catch (const std::exception& e) {
        std::cerr << "Error checking model count limit: " << e.what() << std::endl;
        return false; 
    }
}


void SecurityValidator::SetMaxModelSize(size_t bytes) {
    max_model_size_bytes = bytes;
    std::cout << "Set max model size to " << (bytes / (1024*1024)) << " MB" << std::endl;
}

void SecurityValidator::SetMaxMemoryUsage(size_t bytes) {
    max_memory_usage_bytes = bytes;
    std::cout << "Set max memory usage to " << (bytes / (1024*1024)) << " MB" << std::endl;
}

void SecurityValidator::SetMaxModelsLoaded(size_t count) {
    max_models_loaded = count;
    std::cout << "Set max models loaded to " << count << std::endl;
}

void SecurityValidator::SetAllowedDomains(const std::vector<std::string>& domains) {
    allowed_domains = domains;
    std::cout << "Updated allowed domains list" << std::endl;
}

void SecurityValidator::SetAllowedDirectories(const std::vector<std::string>& directories) {
    allowed_directories = directories;
    std::cout << "Updated allowed directories list" << std::endl;
}


std::string SecurityValidator::ExtractDomain(const std::string& url) {
    std::regex domain_pattern(R"(^https?:\/\/([a-zA-Z0-9\-\.]+))");
    std::smatch matches;
    
    if (std::regex_search(url, matches, domain_pattern)) {
        return matches[1].str();
    }
    
    return "";
}

std::string SecurityValidator::NormalizePath(const std::string& path) {
    try {
        return std::filesystem::path(path).lexically_normal().string();
    } catch (...) {
        return path; 
    }
}

bool SecurityValidator::ContainsDangerousPatterns(const std::string& input) {
    
    std::vector<std::string> dangerous_patterns = {
        "..",
        "\\x00", 
        "<script", 
        "javascript:",
        "data:",
        "file://",
        "\\\\", 
        "/proc/", 
        "/sys/",
        "/dev/",
        "C:\\Windows", 
        "System32"
    };
    
    std::string lower_input = input;
    std::transform(lower_input.begin(), lower_input.end(), lower_input.begin(), ::tolower);
    
    for (const auto& pattern : dangerous_patterns) {
        if (lower_input.find(pattern) != std::string::npos) {
            return true;
        }
    }
    
    return false;
}

} 
