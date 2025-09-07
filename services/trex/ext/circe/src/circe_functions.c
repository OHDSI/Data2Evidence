#include "duckdb_extension.h"
#include "circe_functions.h"
#include <dlfcn.h>
#include <openssl/opensslv.h>
#include <string.h>
#include <stdlib.h>
#include <stdio.h>

#ifdef CIRCE_EMBEDDED_NATIVE_LIB
#include <unistd.h>
#include <sys/stat.h>
#include <fcntl.h>
#include "circe_native_embedded.h"
#endif

DUCKDB_EXTENSION_EXTERN

typedef struct graal_isolate graal_isolate_t;
typedef struct graal_isolatethread graal_isolatethread_t;

typedef char *(*circe_convert_fn)(graal_isolatethread_t *, char *expr_json, char *options_json);
typedef char *(*circe_sql_render_fn)(graal_isolatethread_t *, char *sql_template, char *parameters_json);
typedef char *(*circe_sql_translate_fn)(graal_isolatethread_t *, char *sql, char *target_dialect);
typedef char *(*circe_sql_render_translate_fn)(graal_isolatethread_t *, char *sql_template, char *target_dialect, char *parameters_json);
typedef int (*graal_create_isolate_fn)(void *params, graal_isolate_t **isolate, graal_isolatethread_t **thread);

static void *circe_lib_handle = NULL;
static graal_isolate_t *circe_isolate = NULL;
static graal_isolatethread_t *circe_thread = NULL;
static circe_convert_fn circe_convert = NULL;
static circe_sql_render_fn circe_sql_render = NULL;
static circe_sql_translate_fn circe_sql_translate = NULL;
static circe_sql_render_translate_fn circe_sql_render_translate = NULL;
static graal_create_isolate_fn graal_create_isolate_ptr = NULL;

static const char base64_decode_table[256] = {
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,62, -1,-1,-1,63,
    52,53,54,55, 56,57,58,59, 60,61,-1,-1, -1,-2,-1,-1,
    -1, 0, 1, 2,  3, 4, 5, 6,  7, 8, 9,10, 11,12,13,14,
    15,16,17,18, 19,20,21,22, 23,24,25,-1, -1,-1,-1,-1,
    -1,26,27,28, 29,30,31,32, 33,34,35,36, 37,38,39,40,
    41,42,43,44, 45,46,47,48, 49,50,51,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1,
    -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1, -1,-1,-1,-1
};

static char* base64_decode(const char* input, size_t input_len, size_t* output_len) {
    if (input_len % 4 != 0) return NULL;
    
    size_t decoded_len = input_len / 4 * 3;
    if (input_len > 0 && input[input_len - 1] == '=') decoded_len--;
    if (input_len > 1 && input[input_len - 2] == '=') decoded_len--;
    
    char* decoded = (char*)duckdb_malloc(decoded_len + 1);
    if (!decoded) return NULL;
    
    for (size_t i = 0, j = 0; i < input_len;) {
        uint32_t sextet_a = input[i] == '=' ? (i++, 0) : base64_decode_table[(int)input[i++]];
        uint32_t sextet_b = input[i] == '=' ? (i++, 0) : base64_decode_table[(int)input[i++]];
        uint32_t sextet_c = input[i] == '=' ? (i++, 0) : base64_decode_table[(int)input[i++]];
        uint32_t sextet_d = input[i] == '=' ? (i++, 0) : base64_decode_table[(int)input[i++]];

        uint32_t triple = (sextet_a << 3 * 6) + (sextet_b << 2 * 6) + (sextet_c << 1 * 6) + (sextet_d << 0 * 6);

        if (j < decoded_len) decoded[j++] = (triple >> 2 * 8) & 0xFF;
        if (j < decoded_len) decoded[j++] = (triple >> 1 * 8) & 0xFF;
        if (j < decoded_len) decoded[j++] = (triple >> 0 * 8) & 0xFF;
    }
    
    decoded[decoded_len] = '\0';
    *output_len = decoded_len;
    return decoded;
}

#ifdef CIRCE_EMBEDDED_NATIVE_LIB
static void *LoadEmbeddedCirceLibrary() {
    if (!circe_native_blob || circe_native_blob_len == 0) return NULL;
    char tmpl[] = "/tmp/circe-native-XXXXXX.so";
    int fd = mkstemps(tmpl, 3);
    if (fd < 0) return NULL;
    size_t remaining = circe_native_blob_len;
    const unsigned char *ptr = circe_native_blob;
    while (remaining > 0) {
        ssize_t w = write(fd, ptr, remaining);
        if (w <= 0) { close(fd); unlink(tmpl); return NULL; }
        ptr += w; remaining -= w;
    }
    fsync(fd);
    void *handle = dlopen(tmpl, RTLD_LAZY | RTLD_LOCAL);
    unlink(tmpl);
    close(fd);
    return handle;
}
#endif

static int EnsureCirceLoaded() {
    if (circe_convert) return 1; // Already loaded
    
#ifdef CIRCE_EMBEDDED_NATIVE_LIB
    circe_lib_handle = LoadEmbeddedCirceLibrary();
    if (!circe_lib_handle) {
        // Fall back to search paths below
    }
#endif
    
    if (!circe_lib_handle) {
        const char *candidates[] = {
            "./circe-be/native-libs/libcirce-native-lib.so",
            "./circe-be/native-libs/linux-x86_64/libcirce-native-lib.so",
            "./circe-be/native-libs/libcirce-native.so",
            "./circe-be/native-libs/linux-x86_64/libcirce-native.so",
            "libcirce-native-lib.so",
            "libcirce-native.so"
        };
        for (size_t i = 0; i < sizeof(candidates) / sizeof(candidates[0]); i++) {
            circe_lib_handle = dlopen(candidates[i], RTLD_LAZY | RTLD_LOCAL);
            if (circe_lib_handle) break;
        }
    }
    
    if (!circe_lib_handle) {
        return 0; // Failed to load
    }
    
    void *sym_build = dlsym(circe_lib_handle, "circe_build_cohort_sql");
    if (!sym_build) return 0;
    void *sym_render = dlsym(circe_lib_handle, "circe_sql_render");
    if (!sym_render) return 0;
    void *sym_translate = dlsym(circe_lib_handle, "circe_sql_translate");
    if (!sym_translate) return 0;
    void *sym_render_translate = dlsym(circe_lib_handle, "circe_sql_render_translate");
    if (!sym_render_translate) return 0;
    void *sym_create = dlsym(circe_lib_handle, "graal_create_isolate");
    if (!sym_create) return 0;
    
    circe_convert = (circe_convert_fn)sym_build;
    circe_sql_render = (circe_sql_render_fn)sym_render;
    circe_sql_translate = (circe_sql_translate_fn)sym_translate;
    circe_sql_render_translate = (circe_sql_render_translate_fn)sym_render_translate;
    graal_create_isolate_ptr = (graal_create_isolate_fn)sym_create;
    
    int rc = graal_create_isolate_ptr(NULL, &circe_isolate, &circe_thread);
    if (rc != 0 || !circe_thread) return 0;
    
    return 1; // Success
}

static char* get_string_from_vector(duckdb_vector vector, idx_t row) {
    duckdb_string_t *string_data = (duckdb_string_t*)duckdb_vector_get_data(vector);
    duckdb_string_t str = string_data[row];
    uint32_t len = duckdb_string_t_length(str);
    const char* data = duckdb_string_t_data(&str);
    
    char* result = (char*)duckdb_malloc(len + 1);
    if (result) {
        memcpy(result, data, len);
        result[len] = '\0';
    }
    return result;
}

static void set_string_in_vector(duckdb_vector vector, idx_t row, const char* str) {
    duckdb_vector_assign_string_element(vector, row, str);
}

static void set_error_in_vector(duckdb_vector vector, idx_t row, uint64_t* validity) {
    if (validity) {
        duckdb_validity_set_row_invalid(validity, row);
    }
}

static void CirceHelloFunction(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t input_size = duckdb_data_chunk_get_size(input);
    duckdb_vector name_vector = duckdb_data_chunk_get_vector(input, 0);
    uint64_t* name_validity = duckdb_vector_get_validity(name_vector);
    uint64_t* result_validity = NULL;
    
    if (name_validity) {
        duckdb_vector_ensure_validity_writable(output);
        result_validity = duckdb_vector_get_validity(output);
    }
    
    for (idx_t row = 0; row < input_size; row++) {
        if (name_validity && !duckdb_validity_row_is_valid(name_validity, row)) {
            if (result_validity) {
                duckdb_validity_set_row_invalid(result_validity, row);
            }
            continue;
        }
        
        char* name = get_string_from_vector(name_vector, row);
        if (!name) {
            set_error_in_vector(output, row, result_validity);
            continue;
        }
        
        // Create result string "Circe " + name
        size_t result_len = strlen("Circe ") + strlen(name);
        char* result = (char*)duckdb_malloc(result_len + 1);
        if (result) {
            snprintf(result, result_len + 1, "Circe %s", name);
            set_string_in_vector(output, row, result);
            duckdb_free(result);
        } else {
            set_error_in_vector(output, row, result_validity);
        }
        
        duckdb_free(name);
    }
}

static void CirceOpenSSLVersionFunction(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    idx_t input_size = duckdb_data_chunk_get_size(input);
    duckdb_vector name_vector = duckdb_data_chunk_get_vector(input, 0);
    uint64_t* name_validity = duckdb_vector_get_validity(name_vector);
    uint64_t* result_validity = NULL;
    
    if (name_validity) {
        duckdb_vector_ensure_validity_writable(output);
        result_validity = duckdb_vector_get_validity(output);
    }
    
    for (idx_t row = 0; row < input_size; row++) {
        if (name_validity && !duckdb_validity_row_is_valid(name_validity, row)) {
            if (result_validity) {
                duckdb_validity_set_row_invalid(result_validity, row);
            }
            continue;
        }
        
        char* name = get_string_from_vector(name_vector, row);
        if (!name) {
            set_error_in_vector(output, row, result_validity);
            continue;
        }
        
        // Create result string "Circe " + name + ", my linked OpenSSL version is " + OPENSSL_VERSION_TEXT
        size_t result_len = strlen("Circe ") + strlen(name) + strlen(", my linked OpenSSL version is ") + strlen(OPENSSL_VERSION_TEXT);
        char* result = (char*)duckdb_malloc(result_len + 1);
        if (result) {
            snprintf(result, result_len + 1, "Circe %s, my linked OpenSSL version is %s", name, OPENSSL_VERSION_TEXT);
            set_string_in_vector(output, row, result);
            duckdb_free(result);
        } else {
            set_error_in_vector(output, row, result_validity);
        }
        
        duckdb_free(name);
    }
}

// circe_json_to_sql function (base64 encoded JSON -> SQL)
static void CirceJsonToSqlFunction(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    if (!EnsureCirceLoaded()) {
        // Set all rows to NULL if Circe library failed to load
        idx_t input_size = duckdb_data_chunk_get_size(input);
        duckdb_vector_ensure_validity_writable(output);
        uint64_t* result_validity = duckdb_vector_get_validity(output);
        for (idx_t row = 0; row < input_size; row++) {
            duckdb_validity_set_row_invalid(result_validity, row);
        }
        return;
    }
    
    idx_t input_size = duckdb_data_chunk_get_size(input);
    duckdb_vector b64_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector opts_vector = duckdb_data_chunk_get_vector(input, 1);
    uint64_t* b64_validity = duckdb_vector_get_validity(b64_vector);
    uint64_t* opts_validity = duckdb_vector_get_validity(opts_vector);
    uint64_t* result_validity = NULL;
    
    if (b64_validity || opts_validity) {
        duckdb_vector_ensure_validity_writable(output);
        result_validity = duckdb_vector_get_validity(output);
    }
    
    for (idx_t row = 0; row < input_size; row++) {
        if ((b64_validity && !duckdb_validity_row_is_valid(b64_validity, row)) ||
            (opts_validity && !duckdb_validity_row_is_valid(opts_validity, row))) {
            if (result_validity) {
                duckdb_validity_set_row_invalid(result_validity, row);
            }
            continue;
        }
        
        char* b64_expr = get_string_from_vector(b64_vector, row);
        char* opts = get_string_from_vector(opts_vector, row);
        
        if (!b64_expr || !opts) {
            set_error_in_vector(output, row, result_validity);
            if (b64_expr) duckdb_free(b64_expr);
            if (opts) duckdb_free(opts);
            continue;
        }
        
        // Decode base64
        size_t decoded_len;
        char* decoded = base64_decode(b64_expr, strlen(b64_expr), &decoded_len);
        if (!decoded || decoded_len == 0) {
            duckdb_scalar_function_set_error(info, "circe_json_to_sql: base64 decode failed");
            if (decoded) duckdb_free(decoded);
            duckdb_free(b64_expr);
            duckdb_free(opts);
            return;
        }
        
        // Call Circe native function
        char* sql_c = circe_convert(circe_thread, decoded, opts);
        if (sql_c) {
            set_string_in_vector(output, row, sql_c);
        } else {
            set_error_in_vector(output, row, result_validity);
        }
        
        duckdb_free(decoded);
        duckdb_free(b64_expr);
        duckdb_free(opts);
    }
}

// circe_sql_render function
static void CirceSqlRenderFunction(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    if (!EnsureCirceLoaded()) {
        idx_t input_size = duckdb_data_chunk_get_size(input);
        duckdb_vector_ensure_validity_writable(output);
        uint64_t* result_validity = duckdb_vector_get_validity(output);
        for (idx_t row = 0; row < input_size; row++) {
            duckdb_validity_set_row_invalid(result_validity, row);
        }
        return;
    }
    
    idx_t input_size = duckdb_data_chunk_get_size(input);
    duckdb_vector template_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector params_vector = duckdb_data_chunk_get_vector(input, 1);
    uint64_t* template_validity = duckdb_vector_get_validity(template_vector);
    uint64_t* params_validity = duckdb_vector_get_validity(params_vector);
    uint64_t* result_validity = NULL;
    
    if (template_validity || params_validity) {
        duckdb_vector_ensure_validity_writable(output);
        result_validity = duckdb_vector_get_validity(output);
    }
    
    for (idx_t row = 0; row < input_size; row++) {
        if ((template_validity && !duckdb_validity_row_is_valid(template_validity, row)) ||
            (params_validity && !duckdb_validity_row_is_valid(params_validity, row))) {
            if (result_validity) {
                duckdb_validity_set_row_invalid(result_validity, row);
            }
            continue;
        }
        
        char* template_str = get_string_from_vector(template_vector, row);
        char* params_str = get_string_from_vector(params_vector, row);
        
        if (!template_str || !params_str) {
            set_error_in_vector(output, row, result_validity);
            if (template_str) duckdb_free(template_str);
            if (params_str) duckdb_free(params_str);
            continue;
        }
        
        char* rendered_c = circe_sql_render(circe_thread, template_str, params_str);
        if (rendered_c) {
            set_string_in_vector(output, row, rendered_c);
        } else {
            set_error_in_vector(output, row, result_validity);
        }
        
        duckdb_free(template_str);
        duckdb_free(params_str);
    }
}

// circe_sql_translate function
static void CirceSqlTranslateFunction(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    if (!EnsureCirceLoaded()) {
        idx_t input_size = duckdb_data_chunk_get_size(input);
        duckdb_vector_ensure_validity_writable(output);
        uint64_t* result_validity = duckdb_vector_get_validity(output);
        for (idx_t row = 0; row < input_size; row++) {
            duckdb_validity_set_row_invalid(result_validity, row);
        }
        return;
    }
    
    idx_t input_size = duckdb_data_chunk_get_size(input);
    duckdb_vector sql_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector dialect_vector = duckdb_data_chunk_get_vector(input, 1);
    uint64_t* sql_validity = duckdb_vector_get_validity(sql_vector);
    uint64_t* dialect_validity = duckdb_vector_get_validity(dialect_vector);
    uint64_t* result_validity = NULL;
    
    if (sql_validity || dialect_validity) {
        duckdb_vector_ensure_validity_writable(output);
        result_validity = duckdb_vector_get_validity(output);
    }
    
    for (idx_t row = 0; row < input_size; row++) {
        if ((sql_validity && !duckdb_validity_row_is_valid(sql_validity, row)) ||
            (dialect_validity && !duckdb_validity_row_is_valid(dialect_validity, row))) {
            if (result_validity) {
                duckdb_validity_set_row_invalid(result_validity, row);
            }
            continue;
        }
        
        char* sql_str = get_string_from_vector(sql_vector, row);
        char* dialect_str = get_string_from_vector(dialect_vector, row);
        
        if (!sql_str || !dialect_str) {
            set_error_in_vector(output, row, result_validity);
            if (sql_str) duckdb_free(sql_str);
            if (dialect_str) duckdb_free(dialect_str);
            continue;
        }
        
        char* translated_c = circe_sql_translate(circe_thread, sql_str, dialect_str);
        if (translated_c) {
            set_string_in_vector(output, row, translated_c);
        } else {
            set_error_in_vector(output, row, result_validity);
        }
        
        duckdb_free(sql_str);
        duckdb_free(dialect_str);
    }
}

// circe_sql_render_translate function
static void CirceSqlRenderTranslateFunction(duckdb_function_info info, duckdb_data_chunk input, duckdb_vector output) {
    if (!EnsureCirceLoaded()) {
        idx_t input_size = duckdb_data_chunk_get_size(input);
        duckdb_vector_ensure_validity_writable(output);
        uint64_t* result_validity = duckdb_vector_get_validity(output);
        for (idx_t row = 0; row < input_size; row++) {
            duckdb_validity_set_row_invalid(result_validity, row);
        }
        return;
    }
    
    idx_t input_size = duckdb_data_chunk_get_size(input);
    duckdb_vector template_vector = duckdb_data_chunk_get_vector(input, 0);
    duckdb_vector dialect_vector = duckdb_data_chunk_get_vector(input, 1);
    duckdb_vector params_vector = duckdb_data_chunk_get_vector(input, 2);
    uint64_t* template_validity = duckdb_vector_get_validity(template_vector);
    uint64_t* dialect_validity = duckdb_vector_get_validity(dialect_vector);
    uint64_t* params_validity = duckdb_vector_get_validity(params_vector);
    uint64_t* result_validity = NULL;
    
    if (template_validity || dialect_validity || params_validity) {
        duckdb_vector_ensure_validity_writable(output);
        result_validity = duckdb_vector_get_validity(output);
    }
    
    for (idx_t row = 0; row < input_size; row++) {
        if ((template_validity && !duckdb_validity_row_is_valid(template_validity, row)) ||
            (dialect_validity && !duckdb_validity_row_is_valid(dialect_validity, row)) ||
            (params_validity && !duckdb_validity_row_is_valid(params_validity, row))) {
            if (result_validity) {
                duckdb_validity_set_row_invalid(result_validity, row);
            }
            continue;
        }
        
        char* template_str = get_string_from_vector(template_vector, row);
        char* dialect_str = get_string_from_vector(dialect_vector, row);
        char* params_str = get_string_from_vector(params_vector, row);
        
        if (!template_str || !dialect_str || !params_str) {
            set_error_in_vector(output, row, result_validity);
            if (template_str) duckdb_free(template_str);
            if (dialect_str) duckdb_free(dialect_str);
            if (params_str) duckdb_free(params_str);
            continue;
        }
        
        char* result_c = circe_sql_render_translate(circe_thread, template_str, dialect_str, params_str);
        if (result_c) {
            set_string_in_vector(output, row, result_c);
        } else {
            set_error_in_vector(output, row, result_validity);
        }
        
        duckdb_free(template_str);
        duckdb_free(dialect_str);
        duckdb_free(params_str);
    }
}

void RegisterCirceHelloFunction(duckdb_connection connection) {
    duckdb_scalar_function function = duckdb_create_scalar_function();
    duckdb_scalar_function_set_name(function, "circe_hello");
    
    duckdb_logical_type varchar_type = duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR);
    duckdb_scalar_function_add_parameter(function, varchar_type);
    duckdb_scalar_function_set_return_type(function, varchar_type);
    duckdb_destroy_logical_type(&varchar_type);
    
    duckdb_scalar_function_set_function(function, CirceHelloFunction);
    duckdb_register_scalar_function(connection, function);
    duckdb_destroy_scalar_function(&function);
}

void RegisterCirceOpenSSLVersionFunction(duckdb_connection connection) {
    duckdb_scalar_function function = duckdb_create_scalar_function();
    duckdb_scalar_function_set_name(function, "circe_openssl_version");
    
    duckdb_logical_type varchar_type = duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR);
    duckdb_scalar_function_add_parameter(function, varchar_type);
    duckdb_scalar_function_set_return_type(function, varchar_type);
    duckdb_destroy_logical_type(&varchar_type);
    
    duckdb_scalar_function_set_function(function, CirceOpenSSLVersionFunction);
    duckdb_register_scalar_function(connection, function);
    duckdb_destroy_scalar_function(&function);
}

void RegisterCirceJsonToSqlFunction(duckdb_connection connection) {
    duckdb_scalar_function function = duckdb_create_scalar_function();
    duckdb_scalar_function_set_name(function, "circe_json_to_sql");
    
    duckdb_logical_type varchar_type = duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR);
    duckdb_scalar_function_add_parameter(function, varchar_type); // base64 expression
    duckdb_scalar_function_add_parameter(function, varchar_type); // options JSON
    duckdb_scalar_function_set_return_type(function, varchar_type);
    duckdb_destroy_logical_type(&varchar_type);
    
    duckdb_scalar_function_set_function(function, CirceJsonToSqlFunction);
    duckdb_register_scalar_function(connection, function);
    duckdb_destroy_scalar_function(&function);
}

void RegisterCirceSqlRenderFunction(duckdb_connection connection) {
    duckdb_scalar_function function = duckdb_create_scalar_function();
    duckdb_scalar_function_set_name(function, "circe_sql_render");
    
    duckdb_logical_type varchar_type = duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR);
    duckdb_scalar_function_add_parameter(function, varchar_type); // SQL template
    duckdb_scalar_function_add_parameter(function, varchar_type); // parameters JSON
    duckdb_scalar_function_set_return_type(function, varchar_type);
    duckdb_destroy_logical_type(&varchar_type);
    
    duckdb_scalar_function_set_function(function, CirceSqlRenderFunction);
    duckdb_register_scalar_function(connection, function);
    duckdb_destroy_scalar_function(&function);
}

void RegisterCirceSqlTranslateFunction(duckdb_connection connection) {
    duckdb_scalar_function function = duckdb_create_scalar_function();
    duckdb_scalar_function_set_name(function, "circe_sql_translate");
    
    duckdb_logical_type varchar_type = duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR);
    duckdb_scalar_function_add_parameter(function, varchar_type); // SQL
    duckdb_scalar_function_add_parameter(function, varchar_type); // target dialect
    duckdb_scalar_function_set_return_type(function, varchar_type);
    duckdb_destroy_logical_type(&varchar_type);
    
    duckdb_scalar_function_set_function(function, CirceSqlTranslateFunction);
    duckdb_register_scalar_function(connection, function);
    duckdb_destroy_scalar_function(&function);
}

void RegisterCirceSqlRenderTranslateFunction(duckdb_connection connection) {
    duckdb_scalar_function function = duckdb_create_scalar_function();
    duckdb_scalar_function_set_name(function, "circe_sql_render_translate");
    
    duckdb_logical_type varchar_type = duckdb_create_logical_type(DUCKDB_TYPE_VARCHAR);
    duckdb_scalar_function_add_parameter(function, varchar_type); // SQL template
    duckdb_scalar_function_add_parameter(function, varchar_type); // target dialect
    duckdb_scalar_function_add_parameter(function, varchar_type); // parameters JSON
    duckdb_scalar_function_set_return_type(function, varchar_type);
    duckdb_destroy_logical_type(&varchar_type);
    
    duckdb_scalar_function_set_function(function, CirceSqlRenderTranslateFunction);
    duckdb_register_scalar_function(connection, function);
    duckdb_destroy_scalar_function(&function);
}
