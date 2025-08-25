#define DUCKDB_EXTENSION_MAIN

#include "circe_extension.hpp"
#include "duckdb.hpp"
#include "duckdb/common/exception.hpp"
#include "duckdb/common/string_util.hpp"
#include "duckdb/function/scalar_function.hpp"
#include "duckdb/main/extension_util.hpp"
#include <duckdb/parser/parsed_data/create_scalar_function_info.hpp>
#include <dlfcn.h>
#include <openssl/opensslv.h>
#include "duckdb/common/types/blob.hpp"
#ifdef CIRCE_EMBEDDED_NATIVE_LIB
#include <unistd.h>
#include <sys/stat.h>
#include <fcntl.h>
#include <string.h>
#include <stdlib.h>
#include "circe_native_embedded.h" // provides unsigned char circe_native_blob[] and size_t circe_native_blob_len
#endif

namespace duckdb {

inline void CirceHelloScalarFun(DataChunk &args, ExpressionState &state, Vector &result) {
    auto &name_vector = args.data[0];
    UnaryExecutor::Execute<string_t, string_t>(name_vector, result, args.size(), [&](string_t name) {
        return StringVector::AddString(result, "Circe " + name.GetString());
    });
}

inline void CirceOpenSSLVersionScalarFun(DataChunk &args, ExpressionState &state, Vector &result) {
    auto &name_vector = args.data[0];
    UnaryExecutor::Execute<string_t, string_t>(name_vector, result, args.size(), [&](string_t name) {
        return StringVector::AddString(result, "Circe " + name.GetString() + ", my linked OpenSSL version is " + OPENSSL_VERSION_TEXT);
    });
}

// Circe native library integration
struct graal_isolate_t; // fwd decl
struct graal_isolatethread_t; // fwd decl
using circe_convert_fn = char *(*)(graal_isolatethread_t *, char *expr_json, char *options_json);
using circe_sql_render_fn = char *(*)(graal_isolatethread_t *, char *sql_template, char *parameters_json);
using circe_sql_translate_fn = char *(*)(graal_isolatethread_t *, char *sql, char *target_dialect);
using circe_sql_render_translate_fn = char *(*)(graal_isolatethread_t *, char *sql_template, char *target_dialect, char *parameters_json);
using graal_create_isolate_fn = int (*)(void *params, graal_isolate_t **isolate, graal_isolatethread_t **thread);
static circe_convert_fn circe_convert = nullptr;
static circe_sql_render_fn circe_sql_render = nullptr;
static circe_sql_translate_fn circe_sql_translate = nullptr;
static circe_sql_render_translate_fn circe_sql_render_translate = nullptr;
static graal_create_isolate_fn graal_create_isolate_ptr = nullptr;
static void *circe_lib_handle = nullptr;
static graal_isolate_t *circe_isolate = nullptr;
static graal_isolatethread_t *circe_thread = nullptr;

#ifdef CIRCE_EMBEDDED_NATIVE_LIB
static void *LoadEmbeddedCirceLibrary() {
    if (!circe_native_blob || circe_native_blob_len == 0) return nullptr;
    char tmpl[] = "/tmp/circe-native-XXXXXX.so";
    int fd = mkstemps(tmpl, 3);
    if (fd < 0) return nullptr;
    size_t remaining = circe_native_blob_len;
    const unsigned char *ptr = circe_native_blob;
    while (remaining > 0) {
        ssize_t w = write(fd, ptr, remaining);
        if (w <= 0) { close(fd); unlink(tmpl); return nullptr; }
        ptr += w; remaining -= w;
    }
    fsync(fd);
    void *handle = dlopen(tmpl, RTLD_LAZY | RTLD_LOCAL);
    unlink(tmpl);
    close(fd);
    return handle;
}
#endif

static void EnsureCirceLoaded() {
    if (circe_convert) return;
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
        for (auto path : candidates) {
            circe_lib_handle = dlopen(path, RTLD_LAZY | RTLD_LOCAL);
            if (circe_lib_handle) break;
        }
    }
    if (!circe_lib_handle) {
#ifdef CIRCE_EMBEDDED_NATIVE_LIB
        throw IOException("circe functions: failed to load embedded native circe library and no external library found; rebuild or disable embedding");
#else
        throw IOException("circe functions: native circe library not found (tried libcirce-native-lib.so and libcirce-native.so); build it first with 'make circe-native'");
#endif
    }
    auto sym_build = dlsym(circe_lib_handle, "circe_build_cohort_sql");
    if (!sym_build) throw IOException("circe_json_to_sql: symbol circe_build_cohort_sql not found in native circe library");
    auto sym_render = dlsym(circe_lib_handle, "circe_sql_render");
    if (!sym_render) throw IOException("circe_sql_render: symbol circe_sql_render not found in native circe library");
    auto sym_translate = dlsym(circe_lib_handle, "circe_sql_translate");
    if (!sym_translate) throw IOException("circe_sql_translate: symbol circe_sql_translate not found in native circe library");
    auto sym_render_translate = dlsym(circe_lib_handle, "circe_sql_render_translate");
    if (!sym_render_translate) throw IOException("circe_sql_render_translate: symbol circe_sql_render_translate not found in native circe library");
    auto sym_create = dlsym(circe_lib_handle, "graal_create_isolate");
    if (!sym_create) throw IOException("circe functions: symbol graal_create_isolate not found (Graal isolate creation)");
    circe_convert = reinterpret_cast<circe_convert_fn>(sym_build);
    circe_sql_render = reinterpret_cast<circe_sql_render_fn>(sym_render);
    circe_sql_translate = reinterpret_cast<circe_sql_translate_fn>(sym_translate);
    circe_sql_render_translate = reinterpret_cast<circe_sql_render_translate_fn>(sym_render_translate);
    graal_create_isolate_ptr = reinterpret_cast<graal_create_isolate_fn>(sym_create);
    int rc = graal_create_isolate_ptr(nullptr, &circe_isolate, &circe_thread);
    if (rc != 0 || !circe_thread) throw IOException("circe functions: failed to create Graal isolate (rc=" + std::to_string(rc) + ")");
}

// base64 encoded JSON cohort expression -> SQL text
inline void CirceJsonBase64ToSqlScalar(DataChunk &args, ExpressionState &state, Vector &result) {
    EnsureCirceLoaded();
    auto &b64_vec = args.data[0];
    auto &opt_vec = args.data[1];
    BinaryExecutor::Execute<string_t, string_t, string_t>(b64_vec, opt_vec, result, args.size(), [&](string_t b64_expr, string_t opts) {
        std::string decoded;
        try {
            decoded = duckdb::Blob::FromBase64(b64_expr);
        } catch (std::exception &ex) {
            throw IOException("circe_json_to_sql: base64 decode failed: " + std::string(ex.what()));
        }
        if (decoded.empty()) throw IOException("circe_json_to_sql: decoded JSON empty");
        char *sql_c = circe_convert(circe_thread, const_cast<char *>(decoded.c_str()), const_cast<char *>(opts.GetData()));
        if (!sql_c) throw IOException("circe_json_to_sql: native function returned null");
        return StringVector::AddString(result, sql_c);
    });
}

// SQL template + parameters JSON -> rendered SQL
inline void CirceSqlRenderScalar(DataChunk &args, ExpressionState &state, Vector &result) {
    EnsureCirceLoaded();
    auto &template_vec = args.data[0];
    auto &params_vec = args.data[1];
    BinaryExecutor::Execute<string_t, string_t, string_t>(template_vec, params_vec, result, args.size(), [&](string_t sql_template, string_t params_json) {
        std::string template_str = sql_template.GetString();
        std::string params_str = params_json.GetString();
        char *rendered_c = circe_sql_render(circe_thread, const_cast<char *>(template_str.c_str()), const_cast<char *>(params_str.c_str()));
        if (!rendered_c) throw IOException("circe_sql_render: native function returned null");
        return StringVector::AddString(result, rendered_c);
    });
}

// SQL + target dialect -> translated SQL
inline void CirceSqlTranslateScalar(DataChunk &args, ExpressionState &state, Vector &result) {
    EnsureCirceLoaded();
    auto &sql_vec = args.data[0];
    auto &dialect_vec = args.data[1];
    BinaryExecutor::Execute<string_t, string_t, string_t>(sql_vec, dialect_vec, result, args.size(), [&](string_t sql, string_t target_dialect) {
        std::string sql_str = sql.GetString();
        std::string dialect_str = target_dialect.GetString();
        char *translated_c = circe_sql_translate(circe_thread, const_cast<char *>(sql_str.c_str()), const_cast<char *>(dialect_str.c_str()));
        if (!translated_c) throw IOException("circe_sql_translate: native function returned null");
        return StringVector::AddString(result, translated_c);
    });
}

// SQL template + target dialect + parameters JSON -> rendered and translated SQL
inline void CirceSqlRenderTranslateScalar(DataChunk &args, ExpressionState &state, Vector &result) {
    EnsureCirceLoaded();
    auto &template_vec = args.data[0];
    auto &dialect_vec = args.data[1];
    auto &params_vec = args.data[2];
    TernaryExecutor::Execute<string_t, string_t, string_t, string_t>(template_vec, dialect_vec, params_vec, result, args.size(), [&](string_t sql_template, string_t target_dialect, string_t params_json) {
        std::string template_str = sql_template.GetString();
        std::string dialect_str = target_dialect.GetString();
        std::string params_str = params_json.GetString();
        char *result_c = circe_sql_render_translate(circe_thread, const_cast<char *>(template_str.c_str()), const_cast<char *>(dialect_str.c_str()), const_cast<char *>(params_str.c_str()));
        if (!result_c) throw IOException("circe_sql_render_translate: native function returned null");
        return StringVector::AddString(result, result_c);
    });
}

static void LoadInternal(DatabaseInstance &instance) {
    ExtensionUtil::RegisterFunction(instance, ScalarFunction("circe_hello", {LogicalType::VARCHAR}, LogicalType::VARCHAR, CirceHelloScalarFun));
    ExtensionUtil::RegisterFunction(instance, ScalarFunction("circe_openssl_version", {LogicalType::VARCHAR}, LogicalType::VARCHAR, CirceOpenSSLVersionScalarFun));
    ExtensionUtil::RegisterFunction(instance, ScalarFunction("circe_json_to_sql", {LogicalType::VARCHAR, LogicalType::VARCHAR}, LogicalType::VARCHAR, CirceJsonBase64ToSqlScalar));
    ExtensionUtil::RegisterFunction(instance, ScalarFunction("circe_sql_render", {LogicalType::VARCHAR, LogicalType::VARCHAR}, LogicalType::VARCHAR, CirceSqlRenderScalar));
    ExtensionUtil::RegisterFunction(instance, ScalarFunction("circe_sql_translate", {LogicalType::VARCHAR, LogicalType::VARCHAR}, LogicalType::VARCHAR, CirceSqlTranslateScalar));
    ExtensionUtil::RegisterFunction(instance, ScalarFunction("circe_sql_render_translate", {LogicalType::VARCHAR, LogicalType::VARCHAR, LogicalType::VARCHAR}, LogicalType::VARCHAR, CirceSqlRenderTranslateScalar));
}

void CirceExtension::Load(DuckDB &db) { LoadInternal(*db.instance); }
std::string CirceExtension::Name() { return "circe"; }
std::string CirceExtension::Version() const {
#ifdef EXT_VERSION_CIRCE
    return EXT_VERSION_CIRCE;
#else
    return "";
#endif
}

} // namespace duckdb

extern "C" {
DUCKDB_EXTENSION_API void circe_init(duckdb::DatabaseInstance &db) { duckdb::DuckDB dbw(db); dbw.LoadExtension<duckdb::CirceExtension>(); }
DUCKDB_EXTENSION_API const char *circe_version() { return duckdb::DuckDB::LibraryVersion(); }
}

#ifndef DUCKDB_EXTENSION_MAIN
#error DUCKDB_EXTENSION_MAIN not defined
#endif
