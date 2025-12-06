#!/bin/bash

set -e  # Exit on any error

# Clean old build artifacts to ensure fresh build
echo "Cleaning old build artifacts..."
rm -rf ../../resources/mri
rm -rf ../../resources/ui5
rm -rf ../../resources/concept-sets

# Build the project
echo "Building vue-mri-ui-lib..."
npm run build

cd ..

echo "Building ui5..."
npm run build-ui5

cd ../libs/portal-components

echo "Building portal-components..."
npm run build

cd ../../apps/concept-sets

echo "Building concept-sets..."
npm run build -- --mode=production

cd ../vue-mri-ui-lib

# Create static folder if it doesn't exist
mkdir -p src/query-filter/mock-server/static

# Verify resources were created
echo "Verifying build outputs..."
if [ ! -d "../../resources/mri" ]; then
  echo "ERROR: ../../resources/mri was not created!"
  exit 1
fi
if [ ! -d "../../resources/ui5" ]; then
  echo "ERROR: ../../resources/ui5 was not created!"
  exit 1
fi
if [ ! -d "../../resources/concept-sets" ]; then
  echo "ERROR: ../../resources/concept-sets was not created!"
  exit 1
fi

# Copy resources to mock server
echo "Copying resources to mock server..."
cp -r ../../resources/mri src/query-filter/mock-server/static/
cp -r ../../resources/ui5 src/query-filter/mock-server/static/
cp -r ../../resources/concept-sets src/query-filter/mock-server/static/
cp public/authenticate.js src/query-filter/mock-server/static/mri/
cp public/system.min.js src/query-filter/mock-server/static/mri/

# Copy D4L web components library
echo "Copying @d4l/web-components-library..."
PACKAGE_PATH=$(node -e "console.log(require.resolve('@d4l/web-components-library/package.json'))" 2>/dev/null)

if [ -z "$PACKAGE_PATH" ]; then
  echo "ERROR: @d4l/web-components-library not found!"
  exit 1
fi

PACKAGE_DIR=$(dirname "$PACKAGE_PATH")

if [ ! -d "$PACKAGE_DIR/dist/esm" ]; then
  echo "ERROR: dist/esm not found in $PACKAGE_DIR"
  exit 1
fi

# Clean old @d4l directory to avoid duplicates
rm -rf src/query-filter/mock-server/static/@d4l
mkdir -p src/query-filter/mock-server/static/@d4l
cp -r "$PACKAGE_DIR/dist/esm" src/query-filter/mock-server/static/@d4l/web-components-library

# Install mock server dependencies
echo 'Installing mock server dependencies...'
cd src/query-filter/mock-server
npm install

# Display completion message
echo ''
echo '✅ Build complete!'
echo ''
echo 'To start the mock server:'
echo '  npm run start:mock'
echo ''
echo 'Then open http://localhost:3131 in your browser.'
echo ''
