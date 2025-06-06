# Query Filter Utilities

This folder contains utility functions and helper classes.

## Files

- **CriteriaConfigLoader.ts** - Loads and manages criteria configuration
  - Loads criteria options from config file
  - Provides methods to get criteria and attribute options
  - Manages icon mappings and descriptions

- **InitialCriteriaEditorConfigBased.ts** - Configuration-based criteria editor initialization
  - Helper functions for initializing criteria editors
  - Config-driven setup utilities

## Usage

```typescript
import criteriaConfigLoader from '../utils/CriteriaConfigLoader'

// Get criteria options for a section
const options = criteriaConfigLoader.getCriteriaOptions('initialEvents')
```