# This file is included by DuckDB's build system. It specifies which extension to load

# Check for CUDA and link CUDA driver library to DuckDB executable
find_package(CUDAToolkit QUIET)
if(CUDAToolkit_FOUND)
    message(STATUS "Adding CUDA driver linking for DuckDB executable")
    # Add CUDA driver library to the main DuckDB executable
    set(CMAKE_EXE_LINKER_FLAGS "${CMAKE_EXE_LINKER_FLAGS} -L/usr/local/cuda/lib64/stubs -lcuda")
    # Also link to all targets
    link_libraries("/usr/local/cuda/lib64/stubs/libcuda.so")
endif()

# Extension from this repo
duckdb_extension_load(llama
    SOURCE_DIR ${CMAKE_CURRENT_LIST_DIR}
    LOAD_TESTS
)

# Any extra extensions that should be built
# e.g.: duckdb_extension_load(json)