#define DUCKDB_EXTENSION_MAIN

#include "llama_extension.hpp"
#include "duckdb.hpp"
#include "duckdb/common/exception.hpp"
#include "duckdb/common/string_util.hpp"
#include "duckdb/function/scalar_function.hpp"
#include "duckdb/main/extension_util.hpp"
#include <duckdb/parser/parsed_data/create_scalar_function_info.hpp>

#include <openssl/opensslv.h>

#include "llm_functions.hpp"
#include "model_manager.hpp" 
#include "llama_wrapper.hpp"
#include "utils/file_utils.hpp"

namespace duckdb {

using namespace duckdb_llama;

inline void LlamaScalarFun(DataChunk &args, ExpressionState &state, Vector &result) {
	auto &name_vector = args.data[0];
	UnaryExecutor::Execute<string_t, string_t>(name_vector, result, args.size(), [&](string_t name) {
		return StringVector::AddString(result, "Llama " + name.GetString() + " 🦙");
	});
}

inline void LlamaOpenSSLVersionScalarFun(DataChunk &args, ExpressionState &state, Vector &result) {
	auto &name_vector = args.data[0];
	UnaryExecutor::Execute<string_t, string_t>(name_vector, result, args.size(), [&](string_t name) {
		return StringVector::AddString(result, "Llama " + name.GetString() + ", my linked OpenSSL version is " +
		                                           OPENSSL_VERSION_TEXT);
	});
}

static void LoadInternal(DatabaseInstance &instance) {
    if (!LlamaWrapper::Initialize()) {
        std::cerr << "Warning: Failed to initialize LlamaWrapper" << std::endl;
    }
    
	auto llama_scalar_function = ScalarFunction("llama", {LogicalType::VARCHAR}, LogicalType::VARCHAR, LlamaScalarFun);
	ExtensionUtil::RegisterFunction(instance, llama_scalar_function);

	auto llama_openssl_version_scalar_function = ScalarFunction("llama_openssl_version", {LogicalType::VARCHAR},
	                                                            LogicalType::VARCHAR, LlamaOpenSSLVersionScalarFun);
	ExtensionUtil::RegisterFunction(instance, llama_openssl_version_scalar_function);

    RegisterModelManagementFunctions(instance);
    RegisterGenerationFunctions(instance);
    RegisterStatusFunctions(instance);

    std::cout << "LLaMA extension loaded successfully!" << std::endl;
    std::cout << "Available functions:" << std::endl;
    std::cout << "  - llama_download_model(source[, name, options_json])" << std::endl;
    std::cout << "  - llama_load_model(path[, config_json])" << std::endl;
    std::cout << "  - llama_load_model_for_embeddings(path[, config_json])" << std::endl;
    std::cout << "  - llama_unload_model(name)" << std::endl;
    std::cout << "  - llama_list_loaded()" << std::endl;
    std::cout << "  - llama_generate(model, prompt[, options_json])" << std::endl;
    std::cout << "  - llama_chat(model, messages_json[, options_json])" << std::endl;
    std::cout << "  - llama_batch_process(json_request)" << std::endl;
    std::cout << "  - llama_embed(model, text)" << std::endl;
    std::cout << "  - llama_status()" << std::endl;
    std::cout << "  - llama_list_models()" << std::endl;
    std::cout << "  - llama_model_info(name)" << std::endl;
    std::cout << "  - llama_gpu_info()" << std::endl;
}

void LlamaExtension::Load(DuckDB &db) {
	LoadInternal(*db.instance);
}
std::string LlamaExtension::Name() {
	return "llama";
}

std::string LlamaExtension::Version() const {
#ifdef EXT_VERSION_LLAMA
	return EXT_VERSION_LLAMA;
#else
	return "";
#endif
}

} // namespace duckdb

extern "C" {

DUCKDB_EXTENSION_API void llama_init(duckdb::DatabaseInstance &db) {
	duckdb::DuckDB db_wrapper(db);
	db_wrapper.LoadExtension<duckdb::LlamaExtension>();
}

DUCKDB_EXTENSION_API const char *llama_version() {
	return duckdb::DuckDB::LibraryVersion();
}
}

#ifndef DUCKDB_EXTENSION_MAIN
#error DUCKDB_EXTENSION_MAIN not defined
#endif
