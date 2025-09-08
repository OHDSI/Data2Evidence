cmake_minimum_required(VERSION 3.16)

###
# Configuration for C API Extension
###
if(NOT DEFINED EXTENSION_NAME)
    message(FATAL_ERROR "DuckDB extension name is required")
endif()

if (DEFINED TARGET_DUCKDB_VERSION_MAJOR)
    add_definitions(-DDUCKDB_EXTENSION_API_VERSION_MAJOR=${TARGET_DUCKDB_VERSION_MAJOR})
endif()
if (DEFINED TARGET_DUCKDB_VERSION_MINOR)
    add_definitions(-DDUCKDB_EXTENSION_API_VERSION_MINOR=${TARGET_DUCKDB_VERSION_MINOR})
endif()
if (DEFINED TARGET_DUCKDB_VERSION_PATCH)
    add_definitions(-DDUCKDB_EXTENSION_API_VERSION_PATCH=${TARGET_DUCKDB_VERSION_PATCH})
endif()

add_definitions(-DDUCKDB_EXTENSION_NAME=${EXTENSION_NAME})

if (DEFINED DUCKDB_EXTENSION_API_VERSION_UNSTABLE)
    add_definitions(-DDUCKDB_EXTENSION_API_VERSION_UNSTABLE=${DUCKDB_EXTENSION_API_VERSION_UNSTABLE})
endif()

# Set extension name here - use different name than llama.cpp's "llama" target
set(TARGET_NAME ${EXTENSION_NAME}_extension)

# But set the output name to match what the makefile expects
set(EXTENSION_OUTPUT_NAME ${EXTENSION_NAME})

# Set vector size to 1 for streaming responsiveness (default is 2048)
set(STANDARD_VECTOR_SIZE 4 CACHE STRING "Set vector size to 4 for real-time streaming")

# Enable llama.cpp integration
option(ENABLE_LLAMA_CPP "Enable llama.cpp integration" ON)

###
# llama.cpp Configuration (if enabled)
###
if(ENABLE_LLAMA_CPP)
    # Use git submodule for llama.cpp
    if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/llama.cpp/CMakeLists.txt")
        # Set llama.cpp options before adding subdirectory
        set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
        set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
        set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
        set(LLAMA_STATIC ON CACHE BOOL "" FORCE)
        set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
        
        # Ensure Position Independent Code (PIC) for shared library
        set(CMAKE_POSITION_INDEPENDENT_CODE ON)
        
        # Disable CURL in llama.cpp since we use our own http_downloader
        set(LLAMA_CURL OFF CACHE BOOL "Disable libcurl to use our own http_downloader" FORCE)
        # Enable common library but without CURL dependency
        set(LLAMA_BUILD_COMMON ON CACHE BOOL "Build common library without CURL dependency" FORCE)
        
        # GPU backend options - ALWAYS enable GPU support
        set(LLAMA_CUDA OFF CACHE BOOL "" FORCE)
        
        # Enable Vulkan GPU acceleration (preferred on non-Apple platforms)
        if(APPLE)
            # On Apple platforms, prefer Metal but allow Vulkan as fallback
            set(GGML_VULKAN OFF CACHE BOOL "Enable Vulkan GPU acceleration" FORCE)
            message(STATUS "Apple platform detected - will prefer Metal over Vulkan")
        else()
            # On non-Apple platforms, always enable Vulkan
            set(GGML_VULKAN ON CACHE BOOL "Enable Vulkan GPU acceleration" FORCE)
        endif()
        
        # Always check for CUDA and enable if available
        find_package(CUDAToolkit QUIET)
        if(CUDAToolkit_FOUND)
            set(GGML_CUDA ON CACHE BOOL "Enable CUDA GPU acceleration" FORCE)
            set(GGML_CUDA_F16 ON CACHE BOOL "Enable FP16 computations in CUDA" FORCE)
            set(GGML_CUDA_GRAPHS ON CACHE BOOL "Enable CUDA graphs for better performance" FORCE)
            message(STATUS "CUDA Toolkit found - enabling CUDA backend")
            
            # Set global CUDA driver library linking using full path
            set(CUDA_DRIVER_LIB "/usr/local/cuda/lib64/stubs/libcuda.so")
            set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} ${CUDA_DRIVER_LIB}")
            set(CMAKE_SHARED_LINKER_FLAGS "${CMAKE_SHARED_LINKER_FLAGS} ${CUDA_DRIVER_LIB}")
            
            # Add CUDA driver to global link libraries using full path
            link_libraries(${CUDA_DRIVER_LIB})
            
            # Also add library directory to link directories
            link_directories(/usr/local/cuda/lib64/stubs)
        else()
            set(GGML_CUDA OFF CACHE BOOL "Enable CUDA GPU acceleration" FORCE)
            message(STATUS "CUDA Toolkit not found - skipping CUDA backend")
        endif()
        
        # Check for Metal (Apple GPU acceleration) on macOS
        if(APPLE)
            find_library(METAL_FRAMEWORK Metal)
            find_library(FOUNDATION_FRAMEWORK Foundation)
            find_library(METALKIT_FRAMEWORK MetalKit)
            
            if(METAL_FRAMEWORK AND FOUNDATION_FRAMEWORK)
                set(GGML_METAL ON CACHE BOOL "Enable Metal GPU acceleration on Apple platforms" FORCE)
                set(GGML_METAL_NDEBUG ON CACHE BOOL "Disable Metal debug mode for better performance" FORCE)
                message(STATUS "Metal framework found - enabling Metal GPU backend")
                
                # Link Metal frameworks
                link_libraries(${METAL_FRAMEWORK} ${FOUNDATION_FRAMEWORK})
                if(METALKIT_FRAMEWORK)
                    link_libraries(${METALKIT_FRAMEWORK})
                    message(STATUS "MetalKit framework found - adding MetalKit support")
                endif()
            else()
                set(GGML_METAL OFF CACHE BOOL "Enable Metal GPU acceleration on Apple platforms" FORCE)
                message(STATUS "Metal frameworks not found - building without Metal support")
            endif()
        else()
            set(GGML_METAL OFF CACHE BOOL "Enable Metal GPU acceleration on Apple platforms" FORCE)
            message(STATUS "Not on Apple platform - skipping Metal backend")
        endif()
        
        # Verify that at least one GPU backend is available
        find_package(Vulkan QUIET)
        if(APPLE AND GGML_METAL)
            # On Apple platforms, Metal is sufficient for GPU support
            message(STATUS "Metal GPU backend enabled - GPU acceleration available")
        elseif(Vulkan_FOUND)
            # On non-Apple platforms, require Vulkan for GPU support
            message(STATUS "Vulkan found - GPU acceleration enabled")
        else()
            # No GPU backend available - warn but continue with CPU-only build
            if(APPLE)
                message(WARNING "Metal frameworks not found! Building with CPU-only support.")
            else()
                message(WARNING "Vulkan development libraries not found! Building with CPU-only support. Install vulkan-tools and libvulkan-dev for GPU acceleration.")
            endif()
        endif()
        
        # Add llama.cpp as subdirectory
        add_subdirectory(llama.cpp)
        
        message(STATUS "llama.cpp integration enabled with GPU backend support")
    else()
        message(FATAL_ERROR "llama.cpp submodule not found. Run: git submodule update --init --recursive")
    endif()
endif()

# Find required libraries
find_package(OpenSSL REQUIRED)

# CURL detection disabled - using our own http_downloader instead
# find_package(PkgConfig QUIET)
# if(PKG_CONFIG_FOUND)
#     pkg_check_modules(CURL libcurl)
#     if(CURL_FOUND)
#         set(CURL_AVAILABLE 1)
#         message(STATUS "CURL found: ${CURL_LIBRARIES}")
#     else()
#         message(STATUS "CURL not found via pkg-config")
#     endif()
# else()
#     message(STATUS "pkg-config not found, skipping CURL detection")
# endif()

###
# Build Configuration
###
project(${TARGET_NAME} LANGUAGES C CXX)

# Find Threads after project declaration
find_package(Threads REQUIRED)

# Extension source files - C API entry point with C++ backend
set(EXTENSION_SOURCES 
    src/llama_capi.c
    src/llama_functions.c
    src/llama_backend_bridge.cpp
    src/llama_core.cpp
    src/http_downloader.cpp
    third_party/yyjson.c
)

# Include directories for our code
include_directories(src/include)

# Include DuckDB C API headers
include_directories(duckdb_capi)

# Include standalone yyjson for JSON parsing
include_directories(third_party)

# If llama.cpp is enabled, add its include directories
if(ENABLE_LLAMA_CPP)
    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/llama.cpp/include)
    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/llama.cpp/common)
    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/llama.cpp/ggml/include)
endif()

# Create the extension library
if (DUCKDB_WASM_EXTENSION)
    add_library(${TARGET_NAME} STATIC ${EXTENSION_SOURCES})
else()
    add_library(${TARGET_NAME} SHARED ${EXTENSION_SOURCES})
endif()

# Set the output name to match what the makefile expects
set_target_properties(${TARGET_NAME} PROPERTIES OUTPUT_NAME ${EXTENSION_OUTPUT_NAME})

# Hide symbols
set(CMAKE_CXX_VISIBILITY_PRESET hidden)
set(CMAKE_C_VISIBILITY_PRESET hidden)
set(VISIBILITY_INLINES_HIDDEN ON)
set(CMAKE_C_FLAGS_RELEASE "${CMAKE_C_FLAGS_RELEASE} -s")
set(CMAKE_CXX_FLAGS_RELEASE "${CMAKE_CXX_FLAGS_RELEASE} -s")

# CURL support disabled - using our own http_downloader instead
# if(CURL_AVAILABLE)
#     target_compile_definitions(${TARGET_NAME} PRIVATE LLAMA_USE_CURL)
# endif()

# Link basic libraries
target_link_libraries(${TARGET_NAME} 
    OpenSSL::SSL 
    OpenSSL::Crypto
    Threads::Threads
)

# Link llama.cpp libraries if enabled
if(ENABLE_LLAMA_CPP)
    # Always add the compile definitions
    target_compile_definitions(${TARGET_NAME} PRIVATE ENABLE_LLAMA_CPP=1)
    
    # Link llama.cpp libraries
    if(TARGET llama)
        target_link_libraries(${TARGET_NAME} llama)
    endif()

    if(TARGET ggml)
        target_link_libraries(${TARGET_NAME} ggml)
    endif()
    
    if(TARGET ggml-base)
        target_link_libraries(${TARGET_NAME} ggml-base)
    endif()
    
    if(TARGET ggml-cpu)
        target_link_libraries(${TARGET_NAME} ggml-cpu)
    endif()
    
    if(TARGET common)
        target_link_libraries(${TARGET_NAME} common)
        
        # CURL support disabled - using our own http_downloader instead
        # target_compile_definitions(${TARGET_NAME} PRIVATE LLAMA_USE_CURL)
    endif()
    
    # Add GPU backend libraries
    if(TARGET ggml-vulkan)
        target_link_libraries(${TARGET_NAME} ggml-vulkan)
    endif()
    
    if(TARGET ggml-cuda AND CUDAToolkit_FOUND)
        target_link_libraries(${TARGET_NAME} ggml-cuda CUDA::cudart CUDA::cublas CUDA::cublasLt CUDA::curand)
        message(STATUS "CUDA found - adding CUDA libraries to link")
    endif()
    
    if(TARGET ggml-metal AND APPLE)
        target_link_libraries(${TARGET_NAME} ggml-metal)
    endif()
endif()

# CURL linking disabled - using our own http_downloader instead
# if(CURL_AVAILABLE)
#     target_link_libraries(${TARGET_NAME} ${CURL_LIBRARIES})
#     target_compile_definitions(${TARGET_NAME} PRIVATE CURL_AVAILABLE=1)
# endif()

message(STATUS "LLaMA C API extension configured successfully")
