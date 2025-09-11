PROJ_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

# Default target
.DEFAULT_GOAL := all

# Main extension configuration
EXTENSION_NAME=circe

# Set to 0 to use stable C API (recommended for production)
USE_UNSTABLE_C_API=0

# The DuckDB version to target
TARGET_DUCKDB_VERSION=v1.2.0

# Configuration of extension (keep for circe native build)
EXT_NAME=circe
EXT_CONFIG=${PROJ_DIR}extension_config.cmake

CIRCE_DIR:=circe-be
CIRCE_TARGET:=$(CIRCE_DIR)/target
CIRCE_JAR:=$(CIRCE_TARGET)/circe-cli.jar
# Updated to allow root-level override
ROOT_GRAAL_CONF_DIR:=${PROJ_DIR}graalvm-config
CIRCE_REFLECT:=$(ROOT_GRAAL_CONF_DIR)/reflect-config.json
CIRCE_RESOURCES:=$(ROOT_GRAAL_CONF_DIR)/resource-config.json
CIRCE_NATIVE_SO:=$(CIRCE_DIR)/native-libs/$(shell uname -s | tr A-Z a-z)-$(shell uname -m)/libcirce-native.so
CIRCE_INIT_PKGS:=org.ohdsi.circe,com.fasterxml.jackson

RESOURCE_JSON := { "resources": [ {"pattern": ".*cohortdefinition/sql/.*\\.sql"}, {"pattern": ".*vocabulary/sql/.*\\.sql"}, {"pattern": ".*sql/.*\\.sql"}, {"pattern": ".*templates/.*"}, {"pattern": ".*ftl"} ] }

.PHONY: circe-native configure debug release test test_debug test_release clean clean_all
# Replaced legacy native-image build with CMake delegation
circe-native:
	@echo "[circe-native] Delegating to CMake target circe_native (embedding handled in extension_config.cmake)"
	@mkdir -p build/release
	@cd build/release && ( [ -f CMakeCache.txt ] || cmake ../.. ) && $(MAKE) -j1 circe_native

all: configure release

# Include makefiles from DuckDB C API extensions
include extension-ci-tools/makefiles/c_api_extensions/base.Makefile
include extension-ci-tools/makefiles/c_api_extensions/c_cpp.Makefile

configure: venv platform extension_version

debug: build_extension_library_debug build_extension_with_metadata_debug
release: build_extension_library_release build_extension_with_metadata_release

test: test_debug
test_debug: test_extension_debug
test_release: test_extension_release

clean: clean_build clean_cmake
clean_all: clean clean_configure
