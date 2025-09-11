#!/bin/bash

# Build the project
npm run build

cd ..

npm run build-ui5

cd vue-mri-ui-lib

# Create static folder if it doesn't exist
mkdir -p src/query-filter/mock-server/static

# Copy resources to mock server
cp -r ../../resources/mri src/query-filter/mock-server/static/
cp -r ../../resources/ui5 src/query-filter/mock-server/static/
cp public/authenticate.js src/query-filter/mock-server/static/mri/

# Copy D4L web components library
mkdir -p src/query-filter/mock-server/static/@d4l
cp -r ../../node_modules/@d4l/web-components-library/dist/esm src/query-filter/mock-server/static/@d4l/web-components-library

# Display completion message
echo ''
echo '✅ Build complete!'
echo ''
echo 'To start the mock server:'
echo '  cd mock-server'
echo '  node server.js'
echo ''
echo 'Then open http://localhost:3001 in your browser.'
echo ''