PROJ_DIR := $(dir $(abspath $(lastword $(MAKEFILE_LIST))))

# Default target
.DEFAULT_GOAL := all

# Configuration of extension
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

.PHONY: circe-native
# Replaced legacy native-image build with CMake delegation
circe-native:
	@echo "[circe-native] Delegating to CMake target circe_native (embedding handled in extension_config.cmake)"
	@mkdir -p build/release
	@cd build/release && ( [ -f CMakeCache.txt ] || cmake ../.. ) && $(MAKE) -j1 circe_native

# Include the Makefile from extension-ci-tools
include extension-ci-tools/makefiles/duckdb_extension.Makefile
