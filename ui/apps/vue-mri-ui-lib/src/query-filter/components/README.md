# Query Filter Components

This folder contains all Vue components for the query filter system.

## Components

- **QueryFilterCard.vue** - Main filter card component that contains conditions
- **QueryFilterChip.vue** - Individual filter chip component for displaying selected concepts
- **QueryFilterCondition.vue** - Component for rendering filter conditions
- **QueryFilterNestedCondition.vue** - Component for nested conditions within filters
- **AttributesDropdown.vue** - Dropdown for selecting and managing condition attributes
- **CriteriaSelectorDropdown.vue** - Dropdown for selecting criteria types (conditions, drugs, etc.)
- **QueryFilterDemo.vue** - Demo component showcasing the query filter functionality

## Usage

Import components from the parent module:

```typescript
import { QueryFilterCard, QueryFilterChip } from '../'
```