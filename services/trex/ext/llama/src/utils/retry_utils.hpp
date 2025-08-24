#pragma once

#include <functional>
#include <chrono>
#include <thread>
#include <stdexcept>
#include <string>

namespace duckdb_llama {


struct RetryConfig {
    size_t max_attempts = 3;
    std::chrono::milliseconds initial_delay = std::chrono::milliseconds(1000);
    double backoff_multiplier = 2.0;
    std::chrono::milliseconds max_delay = std::chrono::milliseconds(10000);
    
    RetryConfig() = default;
    
    RetryConfig(size_t attempts, std::chrono::milliseconds delay = std::chrono::milliseconds(1000)) 
        : max_attempts(attempts), initial_delay(delay) {}
};


class RetriableException : public std::runtime_error {
public:
    explicit RetriableException(const std::string& message) : std::runtime_error(message) {}
};

class NetworkException : public RetriableException {
public:
    explicit NetworkException(const std::string& message) : RetriableException("Network error: " + message) {}
};

class MemoryException : public RetriableException {
public:
    explicit MemoryException(const std::string& message) : RetriableException("Memory error: " + message) {}
};

class ModelLoadException : public RetriableException {
public:
    explicit ModelLoadException(const std::string& message) : RetriableException("Model load error: " + message) {}
};

class GPUException : public RetriableException {
public:
    explicit GPUException(const std::string& message) : RetriableException("GPU error: " + message) {}
};


class NonRetriableException : public std::runtime_error {
public:
    explicit NonRetriableException(const std::string& message) : std::runtime_error(message) {}
};


class RetryUtils {
public:
    template<typename T>
    static T ExecuteWithRetry(
        std::function<T()> operation,
        const RetryConfig& config = RetryConfig{},
        const std::string& operation_name = "operation"
    ) {
        std::chrono::milliseconds current_delay = config.initial_delay;
        std::string last_error;
        
        for (size_t attempt = 1; attempt <= config.max_attempts; ++attempt) {
            try {
                return operation();
            } catch (const NonRetriableException& e) {
                
                throw;
            } catch (const RetriableException& e) {
                last_error = e.what();
                if (attempt == config.max_attempts) {
                    throw std::runtime_error("Failed after " + std::to_string(config.max_attempts) + 
                                           " attempts. Last error: " + last_error);
                }
                
                
                LogRetryAttempt(operation_name, attempt, config.max_attempts, last_error, current_delay);
                
                
                std::this_thread::sleep_for(current_delay);
                
                
                current_delay = std::chrono::milliseconds(
                    static_cast<long>(current_delay.count() * config.backoff_multiplier)
                );
                if (current_delay > config.max_delay) {
                    current_delay = config.max_delay;
                }
            } catch (const std::exception& e) {
                
                last_error = e.what();
                if (attempt == config.max_attempts) {
                    throw std::runtime_error("Failed after " + std::to_string(config.max_attempts) + 
                                           " attempts. Last error: " + last_error);
                }
                
                LogRetryAttempt(operation_name, attempt, config.max_attempts, last_error, current_delay);
                std::this_thread::sleep_for(current_delay);
                current_delay = std::chrono::milliseconds(
                    static_cast<long>(current_delay.count() * config.backoff_multiplier)
                );
                if (current_delay > config.max_delay) {
                    current_delay = config.max_delay;
                }
            }
        }
        
        
        throw std::runtime_error("Unexpected retry loop exit");
    }
    
    
    static void ExecuteWithRetryVoid(
        std::function<void()> operation,
        const RetryConfig& config = RetryConfig{},
        const std::string& operation_name = "operation"
    ) {
        ExecuteWithRetry<int>([&operation]() -> int {
            operation();
            return 0;
        }, config, operation_name);
    }

private:
    static void LogRetryAttempt(
        const std::string& operation_name,
        size_t attempt,
        size_t max_attempts,
        const std::string& error,
        std::chrono::milliseconds delay
    );
};

} 
