// Pre-load import-map-overrides library to expose window.importMapOverrides
// This must be loaded before the main Vue app initializes to ensure
// AppRegistry.setupImportMaps() can access the global object
import 'import-map-overrides'

// The library automatically exposes window.importMapOverrides when imported
// This entry will be bundled separately and injected first in index.html
