# Query Filter Module

A comprehensive Vue 3 component library for building OHDSI Atlas-compatible cohort query filters.

## 📁 Folder Structure

```
query-filter/
├── components/         # Vue components
├── models/            # TypeScript models and types
├── utils/             # Utility functions and helpers
├── styles/            # SCSS stylesheets
├── config/            # Configuration files
├── __tests__/         # Unit tests
└── index.ts           # Module exports
```

## 🚀 Features

- **Visual Query Builder**: Build complex cohort definitions with a drag-and-drop interface
- **Atlas Compatible**: Generates OHDSI Atlas-compatible JSON cohort definitions
- **Nested Conditions**: Support for nested and attribute-based conditions
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Configurable**: JSON-driven configuration for criteria types and attributes
- **Reusable Components**: Modular component architecture

## 📦 Main Components

### QueryFilterCard
The main container component for filter groups. Supports:
- Multiple conditions with AND/OR operators
- Inclusion/exclusion criteria
- Collapsible interface
- Nested condition groups

### QueryFilterChip
Individual filter chips representing selected concepts:
- Removable chips
- Multiple variants (primary, secondary)
- Hover effects

### AttributesDropdown
Dropdown for adding attributes to conditions:
- Criteria-specific attributes
- Multi-select interface
- Dynamic attribute loading

### CriteriaSelectorDropdown
Dropdown for selecting criteria types:
- Medical domain icons
- Searchable options
- Section-specific filtering

## 🔧 Usage

```typescript
import { QueryFilterCard, QueryFilterManager } from '@/query-filter'

const filterManager = new QueryFilterManager()

// Add a new filter
const filter = new QueryFilterCardModel({
  title: 'Diabetes Type 2',
  type: 'inclusion',
  conditions: [...]
})

filterManager.addFilter(filter)
```

## 🎨 Styling

All components use scoped SCSS with BEM naming convention. Styles are modular and can be customized through CSS variables or by overriding specific classes.

## 🧪 Testing

Unit tests are located in the `__tests__/` directory. Run tests with:

```bash
npm test
```

## 📄 Configuration

The module is configured through `config/cohort-criteria-config.json`. This file defines:
- Available criteria types
- Attribute options
- UI labels and descriptions
- Icon mappings

## 🔗 Integration

This module integrates with:
- OHDSI Atlas for cohort definition compatibility
- OMOP CDM vocabulary for concept selection
- Vue 3 composition API
- TypeScript for type safety