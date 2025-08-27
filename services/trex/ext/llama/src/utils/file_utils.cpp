#include "file_utils.hpp"
#include "retry_utils.hpp"
#include "security_validator.hpp"
#include <filesystem>
#include <fstream>
#include <iostream>
#include <regex>
#include <algorithm>

#ifdef LLAMA_USE_CURL
#include <curl/curl.h>
#include <thread>
#include <chrono>
#endif

namespace duckdb_llama {

bool FileUtils::FileExists(const std::string& path) {
    return std::filesystem::exists(path);
}

size_t FileUtils::GetFileSize(const std::string& path) {
    try {
        return std::filesystem::file_size(path);
    } catch (const std::filesystem::filesystem_error& e) {
        return 0;
    }
}

bool FileUtils::DeleteFile(const std::string& path) {
    try {
        return std::filesystem::remove(path);
    } catch (const std::filesystem::filesystem_error& e) {
        return false;
    }
}

std::string FileUtils::GetModelsDirectory() {
    static std::string models_dir = GetDefaultModelsPath();
    CreateDirectoryIfNotExists(models_dir);
    return models_dir;
}

std::vector<std::string> FileUtils::ListLocalModels() {
    std::vector<std::string> models;
    std::string models_dir = GetModelsDirectory();
    
    try {
        for (const auto& entry : std::filesystem::directory_iterator(models_dir)) {
            if (entry.is_regular_file()) {
                std::string path = entry.path().string();
                if (ValidateModelFile(path)) {
                    models.push_back(path);
                }
            }
        }
    } catch (const std::filesystem::filesystem_error& e) {
        std::cerr << "Error listing models: " << e.what() << std::endl;
    }
    
    return models;
}

bool FileUtils::CreateDirectoryIfNotExists(const std::string& path) {
    try {
        return std::filesystem::create_directories(path);
    } catch (const std::filesystem::filesystem_error& e) {
        return false;
    }
}

bool FileUtils::ValidateModelFile(const std::string& path) {
    if (!FileExists(path)) {
        return false;
    }
    
    
    std::string extension = std::filesystem::path(path).extension().string();
    return extension == ".gguf" || extension == ".ggml" || extension == ".bin";
}

bool FileUtils::IsValidGGUFFile(const std::string& path) {
    if (!FileExists(path)) {
        return false;
    }
    
    
    std::ifstream file(path, std::ios::binary);
    if (!file.is_open()) {
        return false;
    }
    
    
    char magic[4];
    file.read(magic, 4);
    
    if (file.gcount() != 4) {
        return false;
    }
    
    
    bool is_gguf = (magic[0] == 'G' && magic[1] == 'G' && magic[2] == 'U' && magic[3] == 'F');
    
    
    bool has_gguf_ext = std::filesystem::path(path).extension().string() == ".gguf";
    
    return is_gguf || has_gguf_ext;
}

bool FileUtils::DownloadModel(const std::string& url, const std::string& destination, 
                             std::function<void(double)> progress_callback) {
#ifdef LLAMA_USE_CURL
    
    
    if (!SecurityValidator::IsValidURL(url)) {
        std::cerr << "Invalid or disallowed URL: " << url << std::endl;
        return false;
    }
    
    std::string safe_destination = SecurityValidator::SanitizeFilePath(destination);
    if (!SecurityValidator::IsValidFilePath(safe_destination)) {
        std::cerr << "Invalid or unsafe destination path: " << destination << std::endl;
        return false;
    }
    
    
    if (!SecurityValidator::CheckDiskSpaceLimit(safe_destination, 1024 * 1024 * 1024)) {
        std::cerr << "Insufficient disk space for download" << std::endl;
        return false;
    }
    
    
    RetryConfig retry_config;
    retry_config.max_attempts = 3;
    retry_config.initial_delay = std::chrono::milliseconds(2000); 
    retry_config.backoff_multiplier = 2.0;
    retry_config.max_delay = std::chrono::milliseconds(30000); 
    
    try {
        return RetryUtils::ExecuteWithRetry<bool>([&]() -> bool {
            return PerformSingleDownload(url, safe_destination, progress_callback);
        }, retry_config, "Download from " + url);
        
    } catch (const std::exception& e) {
        std::cerr << "Download failed after all retry attempts: " << e.what() << std::endl;
        
        if (FileExists(safe_destination)) {
            DeleteFile(safe_destination);
        }
        return false;
    }
    
#else
    std::cerr << "Download not supported: extension built without CURL support" << std::endl;
    return false;
#endif
}

#ifdef LLAMA_USE_CURL
bool FileUtils::PerformSingleDownload(const std::string& url, const std::string& destination,
                                     std::function<void(double)> progress_callback) {
    
    CURL* curl = curl_easy_init();
    if (!curl) {
        throw NetworkException("Failed to initialize CURL");
    }

    
    FILE* file = fopen(destination.c_str(), "wb");
    if (!file) {
        curl_easy_cleanup(curl);
        throw std::runtime_error("Failed to open destination file: " + destination);
    }

    
    struct ProgressData {
        std::function<void(double)> callback;
    };
    ProgressData progress_data;
    progress_data.callback = progress_callback;

    auto progress_func = [](void* ptr, curl_off_t dltotal, curl_off_t dlnow, curl_off_t, curl_off_t) -> int {
        if (dltotal > 0 && ptr) {
            ProgressData* data = static_cast<ProgressData*>(ptr);
            if (data->callback) {
                double progress = static_cast<double>(dlnow) / static_cast<double>(dltotal) * 100.0;
                data->callback(progress);
            }
        }
        return 0;
    };

    
    curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
    curl_easy_setopt(curl, CURLOPT_WRITEDATA, file);
    curl_easy_setopt(curl, CURLOPT_FOLLOWLOCATION, 1L);
    curl_easy_setopt(curl, CURLOPT_USERAGENT, "DuckDB-Llama-Extension/1.0");
    curl_easy_setopt(curl, CURLOPT_TIMEOUT, 3600L); 
    curl_easy_setopt(curl, CURLOPT_CONNECTTIMEOUT, 30L); 
    
    if (progress_callback) {
        curl_easy_setopt(curl, CURLOPT_NOPROGRESS, 0L);
        curl_easy_setopt(curl, CURLOPT_XFERINFOFUNCTION, progress_func);
        curl_easy_setopt(curl, CURLOPT_XFERINFODATA, &progress_data);
    }

    
    std::cout << "Downloading model from: " << url << std::endl;
    CURLcode res = curl_easy_perform(curl);
    
    
    long response_code;
    curl_easy_getinfo(curl, CURLINFO_RESPONSE_CODE, &response_code);
    
    
    fclose(file);
    curl_easy_cleanup(curl);

    
    if (res != CURLE_OK) {
        DeleteFile(destination); 
        
        
        switch (res) {
            case CURLE_COULDNT_CONNECT:
            case CURLE_COULDNT_RESOLVE_HOST:
            case CURLE_COULDNT_RESOLVE_PROXY:
            case CURLE_OPERATION_TIMEDOUT:
            case CURLE_RECV_ERROR:
            case CURLE_SEND_ERROR:
                throw NetworkException(std::string("CURL error: ") + curl_easy_strerror(res));
                
            case CURLE_OUT_OF_MEMORY:
                throw MemoryException(std::string("CURL memory error: ") + curl_easy_strerror(res));
                
            case CURLE_WRITE_ERROR:
            case CURLE_READ_ERROR:
                throw std::runtime_error(std::string("CURL I/O error: ") + curl_easy_strerror(res));
                
            default:
                throw NonRetriableException(std::string("CURL error: ") + curl_easy_strerror(res));
        }
    }

    
    if (response_code >= 500) {
        DeleteFile(destination);
        throw NetworkException("Server error: HTTP " + std::to_string(response_code));
    } else if (response_code >= 400) {
        DeleteFile(destination);
        throw NonRetriableException("Client error: HTTP " + std::to_string(response_code));
    }

    std::cout << "Download completed successfully: " << destination << std::endl;
    return true;
}
#endif

bool FileUtils::DownloadFromHuggingFace(const std::string& hf_repo, const std::string& destination,
                                       const std::string& hf_token) {
    
    std::regex hf_pattern(R"(^hf:([^:]+)(?::(.+))?$)");
    std::smatch matches;
    
    if (!std::regex_match(hf_repo, matches, hf_pattern)) {
        std::cerr << "Invalid Hugging Face repo format: " << hf_repo << std::endl;
        std::cerr << "Expected format: hf:username/repo or hf:username/repo:filename" << std::endl;
        return false;
    }
    
    std::string repo = matches[1].str();
    std::string filename = matches.size() > 2 ? matches[2].str() : "";
    
    
    if (filename.empty()) {
        
        size_t slash_pos = repo.find('/');
        if (slash_pos != std::string::npos) {
            filename = repo.substr(slash_pos + 1) + ".gguf";
        } else {
            filename = "model.gguf";
        }
    }
    
    
    std::string url = "https://huggingface.co/" + repo + "/resolve/main/" + filename;
    
    std::cout << "Resolving Hugging Face model: " << repo << "/" << filename << std::endl;
    
    
    bool result;
    if (hf_token.empty()) {
        result = DownloadModel(url, destination);
    } else {
        
        
        std::cerr << "Hugging Face token authentication not yet implemented" << std::endl;
        result = DownloadModel(url, destination);
    }
    
    return result;
}

ModelInfo FileUtils::GetModelInfo(const std::string& path) {
    ModelInfo info;
    info.path = path;
    info.name = std::filesystem::path(path).stem().string();
    info.file_size = GetFileSize(path);
    info.is_loaded = false; 
    
    
    std::string filename = std::filesystem::path(path).filename().string();
    
    
    if (filename.find("q2_k") != std::string::npos || filename.find("Q2_K") != std::string::npos) {
        info.quantization = "Q2_K";
    } else if (filename.find("q4_0") != std::string::npos || filename.find("Q4_0") != std::string::npos) {
        info.quantization = "Q4_0";
    } else if (filename.find("q4_k") != std::string::npos || filename.find("Q4_K") != std::string::npos) {
        info.quantization = "Q4_K";
    } else if (filename.find("q8_0") != std::string::npos || filename.find("Q8_0") != std::string::npos) {
        info.quantization = "Q8_0";
    } else if (filename.find("f16") != std::string::npos || filename.find("F16") != std::string::npos) {
        info.quantization = "F16";
    } else {
        info.quantization = "unknown";
    }
    
    
    if (filename.find("7b") != std::string::npos || filename.find("7B") != std::string::npos) {
        info.parameter_count = 7000000000; 
    } else if (filename.find("13b") != std::string::npos || filename.find("13B") != std::string::npos) {
        info.parameter_count = 13000000000; 
    } else if (filename.find("30b") != std::string::npos || filename.find("30B") != std::string::npos) {
        info.parameter_count = 30000000000; 
    } else if (filename.find("70b") != std::string::npos || filename.find("70B") != std::string::npos) {
        info.parameter_count = 70000000000; 
    } else if (filename.find("1.1b") != std::string::npos || filename.find("1.1B") != std::string::npos) {
        info.parameter_count = 1100000000; 
    } else {
        info.parameter_count = 0; 
    }
    
    
    if (filename.find("llama") != std::string::npos || filename.find("Llama") != std::string::npos) {
        info.architecture = "llama";
    } else if (filename.find("mistral") != std::string::npos || filename.find("Mistral") != std::string::npos) {
        info.architecture = "mistral";
    } else if (filename.find("tinyllama") != std::string::npos || filename.find("TinyLlama") != std::string::npos) {
        info.architecture = "tinyllama";
    } else if (filename.find("codellama") != std::string::npos || filename.find("CodeLlama") != std::string::npos) {
        info.architecture = "codellama";
    } else {
        info.architecture = "unknown";
    }
    
    return info;
}

std::string FileUtils::GetDefaultModelsPath() {
    
    std::string home = std::getenv("HOME") ? std::getenv("HOME") : "/tmp";
    return home + "/.local/share/duckdb-llama/models";
}

} 
