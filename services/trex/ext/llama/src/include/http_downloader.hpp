#pragma once

#include <string>
#include <filesystem>

namespace llama_capi {

class HttpDownloader {
public:
    struct DownloadResult {
        bool success = false;
        std::string error_message;
        size_t bytes_downloaded = 0;
    };

    /**
     * Download a file from a URL to a local path
     * @param url The URL to download from
     * @param output_path The local file path to save to
     * @return DownloadResult with success status, error message, and bytes downloaded
     */
    static DownloadResult download_file(const std::string& url, const std::filesystem::path& output_path);

private:
#ifdef _WIN32
    static DownloadResult download_windows(const std::string& host, const std::string& path, 
                                         int port, bool is_https, const std::filesystem::path& output_path);
#else
    static DownloadResult download_unix(const std::string& host, const std::string& path, 
                                      int port, bool is_https, const std::filesystem::path& output_path);
#endif
};

} 
