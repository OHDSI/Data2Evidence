#include "include/http_downloader.hpp"
#include <iostream>
#include <regex>
#include <fstream>
#include <cstring>

#ifdef _WIN32
    #include <windows.h>
    #include <wininet.h>
    #pragma comment(lib, "wininet.lib")
#else
    #include <sys/socket.h>
    #include <netinet/in.h>
    #include <netdb.h>
    #include <arpa/inet.h>
    #include <unistd.h>
#endif

namespace llama_capi {

HttpDownloader::DownloadResult HttpDownloader::download_file(const std::string& url, const std::filesystem::path& output_path) {
    DownloadResult result;
    
    try {
        
        std::regex url_regex(R"(^https?://([^/]+)(/.*)?$)");
        std::smatch url_match;
        
        if (!std::regex_match(url, url_match, url_regex)) {
            result.error_message = "Invalid URL format";
            return result;
        }
        
        std::string host = url_match[1].str();
        std::string path = url_match[2].str();
        if (path.empty()) path = "/";
        
        bool is_https = url.substr(0, 5) == "https";
        int port = is_https ? 443 : 80;
        
        
        size_t port_pos = host.find(':');
        if (port_pos != std::string::npos) {
            port = std::stoi(host.substr(port_pos + 1));
            host = host.substr(0, port_pos);
        }

#ifdef _WIN32
        return download_windows(host, path, port, is_https, output_path);
#else
        return download_unix(host, path, port, is_https, output_path);
#endif
    } catch (const std::exception& e) {
        result.error_message = std::string("Download error: ") + e.what();
        return result;
    }
}

#ifdef _WIN32
HttpDownloader::DownloadResult HttpDownloader::download_windows(const std::string& host, const std::string& path, 
                                     int port, bool is_https, const std::filesystem::path& output_path) {
    DownloadResult result;
    
    HINTERNET hInternet = InternetOpenA("DuckDB-LLaMA/1.0", INTERNET_OPEN_TYPE_PRECONFIG, NULL, NULL, 0);
    if (!hInternet) {
        result.error_message = "Failed to initialize WinINet";
        return result;
    }
    
    HINTERNET hConnect = InternetConnectA(hInternet, host.c_str(), port, NULL, NULL, 
                                        INTERNET_SERVICE_HTTP, 0, 0);
    if (!hConnect) {
        InternetCloseHandle(hInternet);
        result.error_message = "Failed to connect to server";
        return result;
    }
    
    DWORD flags = INTERNET_FLAG_RELOAD | INTERNET_FLAG_NO_CACHE_WRITE;
    if (is_https) {
        flags |= INTERNET_FLAG_SECURE;
    }
    
    HINTERNET hRequest = HttpOpenRequestA(hConnect, "GET", path.c_str(), NULL, NULL, NULL, flags, 0);
    if (!hRequest) {
        InternetCloseHandle(hConnect);
        InternetCloseHandle(hInternet);
        result.error_message = "Failed to create HTTP request";
        return result;
    }
    
    if (!HttpSendRequestA(hRequest, NULL, 0, NULL, 0)) {
        InternetCloseHandle(hRequest);
        InternetCloseHandle(hConnect);
        InternetCloseHandle(hInternet);
        result.error_message = "Failed to send HTTP request";
        return result;
    }
    
    
    DWORD status_code = 0;
    DWORD status_size = sizeof(status_code);
    if (HttpQueryInfoA(hRequest, HTTP_QUERY_STATUS_CODE | HTTP_QUERY_FLAG_NUMBER, 
                      &status_code, &status_size, NULL)) {
        if (status_code != 200) {
            InternetCloseHandle(hRequest);
            InternetCloseHandle(hConnect);
            InternetCloseHandle(hInternet);
            result.error_message = "HTTP error: " + std::to_string(status_code);
            return result;
        }
    }
    
    
    std::ofstream output_file(output_path, std::ios::binary);
    if (!output_file) {
        InternetCloseHandle(hRequest);
        InternetCloseHandle(hConnect);
        InternetCloseHandle(hInternet);
        result.error_message = "Failed to create output file";
        return result;
    }
    
    const size_t buffer_size = 8192;
    char buffer[buffer_size];
    DWORD bytes_read;
    
    while (InternetReadFile(hRequest, buffer, buffer_size, &bytes_read) && bytes_read > 0) {
        output_file.write(buffer, bytes_read);
        result.bytes_downloaded += bytes_read;
    }
    
    InternetCloseHandle(hRequest);
    InternetCloseHandle(hConnect);
    InternetCloseHandle(hInternet);
    
    result.success = true;
    return result;
}
#else
HttpDownloader::DownloadResult HttpDownloader::download_unix(const std::string& host, const std::string& path, 
                                  int port, bool is_https, const std::filesystem::path& output_path) {
    DownloadResult result;
    
    if (is_https) {
        result.error_message = "HTTPS not supported in this simple implementation. Use HTTP or install curl.";
        return result;
    }
    
    
    struct hostent* server = gethostbyname(host.c_str());
    if (!server) {
        result.error_message = "Failed to resolve hostname: " + host;
        return result;
    }
    
    
    int sockfd = socket(AF_INET, SOCK_STREAM, 0);
    if (sockfd < 0) {
        result.error_message = "Failed to create socket";
        return result;
    }
    
    
    struct timeval timeout;
    timeout.tv_sec = 30;  
    timeout.tv_usec = 0;
    setsockopt(sockfd, SOL_SOCKET, SO_RCVTIMEO, &timeout, sizeof(timeout));
    setsockopt(sockfd, SOL_SOCKET, SO_SNDTIMEO, &timeout, sizeof(timeout));
    
    
    struct sockaddr_in serv_addr;
    memset(&serv_addr, 0, sizeof(serv_addr));
    serv_addr.sin_family = AF_INET;
    serv_addr.sin_port = htons(port);
    memcpy(&serv_addr.sin_addr.s_addr, server->h_addr, server->h_length);
    
    if (connect(sockfd, (struct sockaddr*)&serv_addr, sizeof(serv_addr)) < 0) {
        close(sockfd);
        result.error_message = "Failed to connect to server";
        return result;
    }
    
    
    std::string request = "GET " + path + " HTTP/1.1\r\n";
    request += "Host: " + host + "\r\n";
    request += "User-Agent: DuckDB-LLaMA/1.0\r\n";
    request += "Connection: close\r\n";
    request += "\r\n";
    
    if (send(sockfd, request.c_str(), request.length(), 0) < 0) {
        close(sockfd);
        result.error_message = "Failed to send HTTP request";
        return result;
    }
    
    
    std::string response;
    const size_t buffer_size = 8192;
    char buffer[buffer_size];
    ssize_t bytes_received;
    
    while ((bytes_received = recv(sockfd, buffer, buffer_size, 0)) > 0) {
        response.append(buffer, bytes_received);
    }
    
    close(sockfd);
    
    if (response.empty()) {
        result.error_message = "No response received from server";
        return result;
    }
    
    
    size_t header_end = response.find("\r\n\r\n");
    if (header_end == std::string::npos) {
        result.error_message = "Invalid HTTP response format";
        return result;
    }
    
    std::string headers = response.substr(0, header_end);
    std::string body = response.substr(header_end + 4);
    
    
    std::regex status_regex(R"(HTTP/1\.[01] (\d+))");
    std::smatch status_match;
    if (std::regex_search(headers, status_match, status_regex)) {
        int status_code = std::stoi(status_match[1].str());
        if (status_code != 200) {
            result.error_message = "HTTP error: " + std::to_string(status_code);
            return result;
        }
    } else {
        result.error_message = "Could not parse HTTP status code";
        return result;
    }
    
    
    std::ofstream output_file(output_path, std::ios::binary);
    if (!output_file) {
        result.error_message = "Failed to create output file";
        return result;
    }
    
    output_file.write(body.data(), body.size());
    result.bytes_downloaded = body.size();
    result.success = true;
    
    return result;
}
#endif

} 
