#include "retry_utils.hpp"
#include <iostream>

namespace duckdb_llama {

void RetryUtils::LogRetryAttempt(
    const std::string& operation_name,
    size_t attempt,
    size_t max_attempts,
    const std::string& error,
    std::chrono::milliseconds delay
) {
    std::cout << "[RETRY] " << operation_name 
              << " failed (attempt " << attempt << "/" << max_attempts << "): " 
              << error << ". Retrying in " << delay.count() << "ms..." << std::endl;
}

} 
