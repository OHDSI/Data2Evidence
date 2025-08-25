cmake_minimum_required(VERSION 3.16)

# Set extension name here
set(TARGET_NAME llama)

# Set vector size to 1 for streaming responsiveness (default is 2048)
set(STANDARD_VECTOR_SIZE 4 CACHE STRING "Set vector size to 4 for real-time streaming")

# Enable llama.cpp integration
option(ENABLE_LLAMA_CPP "Enable llama.cpp integration" ON)

if(ENABLE_LLAMA_CPP)
    # Use git submodule for llama.cpp
    if(EXISTS "${CMAKE_CURRENT_SOURCE_DIR}/llama.cpp/CMakeLists.txt")
        # Set llama.cpp options before adding subdirectory
        set(LLAMA_BUILD_TESTS OFF CACHE BOOL "" FORCE)
        set(LLAMA_BUILD_EXAMPLES OFF CACHE BOOL "" FORCE)
        set(LLAMA_BUILD_SERVER OFF CACHE BOOL "" FORCE)
        set(LLAMA_STATIC ON CACHE BOOL "" FORCE)
        set(BUILD_SHARED_LIBS OFF CACHE BOOL "" FORCE)
        
        # Enable common library for CURL support
        set(LLAMA_BUILD_COMMON ON CACHE BOOL "Build common library for CURL support" FORCE)
        
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
            # No GPU backend available
            if(APPLE)
                message(FATAL_ERROR "Metal frameworks not found! GPU support requires Metal on Apple platforms.")
            else()
                message(FATAL_ERROR "Vulkan development libraries not found! GPU support requires Vulkan. Install vulkan-tools and libvulkan-dev.")
            endif()
        endif()
        set(LLAMA_OPENCL OFF CACHE BOOL "" FORCE)
        
        # Enable CURL support for downloads
        set(LLAMA_CURL ON CACHE BOOL "Enable CURL for HTTP downloads" FORCE)
        
        # Add llama.cpp as subdirectory
        add_subdirectory(llama.cpp)
        
        # Set preprocessor definition
        add_compile_definitions(LLAMA_CPP_ENABLED)
        
        message(STATUS "llama.cpp integration enabled via submodule")
    else()
        message(WARNING "llama.cpp submodule not found. Run: git submodule update --init --recursive")
        set(ENABLE_LLAMA_CPP OFF)
    endif()
else()
    message(STATUS "llama.cpp integration disabled")
endif()

# DuckDB's extension distribution supports vcpkg. Dependencies can be added in ./vcpkg.json
find_package(OpenSSL REQUIRED)
find_package(Threads REQUIRED)

# Override DuckDB's CUDA detection - we handle CUDA linking globally
# This prevents DuckDB's sqlite3_api_wrapper from trying to link CUDA separately
set(CUDAToolkit_FOUND FALSE CACHE BOOL "Override DuckDB CUDA detection - handled globally" FORCE)

# Try to find CURL, but make it optional for now
find_package(CURL QUIET)
if(CURL_FOUND)
    message(STATUS "Found CURL: ${CURL_LIBRARIES}")
    set(CURL_AVAILABLE TRUE)
else()
    message(WARNING "CURL not found - download functionality will be disabled")
    set(CURL_AVAILABLE FALSE)
endif()

set(EXTENSION_NAME ${TARGET_NAME}_extension)
set(LOADABLE_EXTENSION_NAME ${TARGET_NAME}_loadable_extension)

project(${TARGET_NAME})

# Set C++17 standard for modern features
set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

# Extension source files
set(EXTENSION_SOURCES 
    src/llama_extension.cpp
    src/model_manager.cpp
    src/llama_wrapper.cpp
    src/llm_functions.cpp
    src/utils/file_utils.cpp
    src/utils/retry_utils.cpp
    src/utils/security_validator.cpp
)

# Include directories for our code
include_directories(src/include)

# If llama.cpp is enabled, add its include directories
if(ENABLE_LLAMA_CPP)
    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/llama.cpp/include)
    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/llama.cpp/common)
    include_directories(${CMAKE_CURRENT_SOURCE_DIR}/llama.cpp/ggml/include)
endif()

build_static_extension(${TARGET_NAME} ${EXTENSION_SOURCES})
# Build the extension
build_loadable_extension(${TARGET_NAME} " " ${EXTENSION_SOURCES})

# Add CURL support define since we have it available  
target_compile_definitions(${EXTENSION_NAME} PRIVATE LLAMA_USE_CURL)
target_compile_definitions(${LOADABLE_EXTENSION_NAME} PRIVATE LLAMA_USE_CURL)

# Link basic libraries

# Link basic libraries
target_link_libraries(${EXTENSION_NAME} 
    OpenSSL::SSL 
    OpenSSL::Crypto
    Threads::Threads
)

target_link_libraries(${LOADABLE_EXTENSION_NAME} 
    OpenSSL::SSL 
    OpenSSL::Crypto
    Threads::Threads
)

# Link llama.cpp libraries if enabled
if(ENABLE_LLAMA_CPP)
    # For static builds, avoid linking targets that can't be exported
    if(NOT EXTENSION_STATIC_BUILD)
        if(TARGET llama)
            target_link_libraries(${EXTENSION_NAME} llama)
            target_link_libraries(${LOADABLE_EXTENSION_NAME} llama)
        endif()

        if(TARGET ggml)
            target_link_libraries(${EXTENSION_NAME} ggml)
            target_link_libraries(${LOADABLE_EXTENSION_NAME} ggml)
        endif()
        
        if(TARGET ggml-base)
            target_link_libraries(${EXTENSION_NAME} ggml-base)
            target_link_libraries(${LOADABLE_EXTENSION_NAME} ggml-base)
        endif()
        
        if(TARGET ggml-cpu)
            target_link_libraries(${EXTENSION_NAME} ggml-cpu)
            target_link_libraries(${LOADABLE_EXTENSION_NAME} ggml-cpu)
        endif()
        
        if(TARGET common)
            target_link_libraries(${EXTENSION_NAME} common)
            target_link_libraries(${LOADABLE_EXTENSION_NAME} common)
            
            # Ensure CURL support is enabled if common library is available
            target_compile_definitions(${EXTENSION_NAME} PRIVATE LLAMA_USE_CURL)
            target_compile_definitions(${LOADABLE_EXTENSION_NAME} PRIVATE LLAMA_USE_CURL)
        endif()
    else()
        # For static builds, we need to link after the dependencies are built
        # Use generator expressions to link the actual library files
        target_link_libraries(${EXTENSION_NAME} 
            $<TARGET_FILE:llama>
            $<TARGET_FILE:ggml>
            $<TARGET_FILE:ggml-base>
            $<TARGET_FILE:ggml-cpu>
            $<TARGET_FILE:ggml-vulkan>
            $<TARGET_FILE:common>
            vulkan 
            gomp
        )
        target_link_libraries(${LOADABLE_EXTENSION_NAME} 
            $<TARGET_FILE:llama>
            $<TARGET_FILE:ggml>
            $<TARGET_FILE:ggml-base>
            $<TARGET_FILE:ggml-cpu>
            $<TARGET_FILE:ggml-vulkan>
            $<TARGET_FILE:common>
            vulkan 
            gomp
        )
        
        # Add dependencies to ensure build order
        add_dependencies(${EXTENSION_NAME} llama ggml ggml-base ggml-cpu ggml-vulkan common)
        add_dependencies(${LOADABLE_EXTENSION_NAME} llama ggml ggml-base ggml-cpu ggml-vulkan common)
        
        # Add CUDA support if available
        find_package(CUDAToolkit QUIET)
        if(CUDAToolkit_FOUND AND TARGET ggml-cuda)
            target_link_libraries(${EXTENSION_NAME} $<TARGET_FILE:ggml-cuda> CUDA::cudart CUDA::cublas CUDA::cublasLt CUDA::curand)
            target_link_libraries(${LOADABLE_EXTENSION_NAME} $<TARGET_FILE:ggml-cuda> CUDA::cudart CUDA::cublas CUDA::cublasLt CUDA::curand)
            add_dependencies(${EXTENSION_NAME} ggml-cuda)
            add_dependencies(${LOADABLE_EXTENSION_NAME} ggml-cuda)
            message(STATUS "CUDA found - adding CUDA libraries to link")
        else()
            message(STATUS "CUDA not found - building without CUDA support")
        endif()
    endif()
    
    # Always add the compile definitions
    target_compile_definitions(${EXTENSION_NAME} PRIVATE ENABLE_LLAMA_CPP=1)
    target_compile_definitions(${LOADABLE_EXTENSION_NAME} PRIVATE ENABLE_LLAMA_CPP=1)
endif()

# Link CURL if available
if(CURL_AVAILABLE)
    target_link_libraries(${EXTENSION_NAME} ${CURL_LIBRARIES})
    target_link_libraries(${LOADABLE_EXTENSION_NAME} ${CURL_LIBRARIES})
    target_compile_definitions(${EXTENSION_NAME} PRIVATE CURL_AVAILABLE=1)
    target_compile_definitions(${LOADABLE_EXTENSION_NAME} PRIVATE CURL_AVAILABLE=1)
endif()

install(
  TARGETS ${EXTENSION_NAME}
  EXPORT "${DUCKDB_EXPORT_SET}"
  LIBRARY DESTINATION "${INSTALL_LIB_DIR}"
  ARCHIVE DESTINATION "${INSTALL_LIB_DIR}")
