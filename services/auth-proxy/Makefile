.PHONY: build-plugin install-plugin clean help

help: ## Show this help message
	@echo "Available targets:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  %-20s %s\n", $$1, $$2}'

install-plugin: ## Install plugin dependencies
	cd plugin && npm install

build-plugin: ## Build the auth management plugin
	cd plugin && npm run build

clean: ## Clean build artifacts
	rm -rf plugin/node_modules
	rm -rf static/plugins/auth-management

all: install-plugin build-plugin ## Install and build everything
