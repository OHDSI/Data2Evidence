# Query Filter Components

This folder contains all Vue components for the query filter system.

## Components

- **QueryFilterCard.vue** - Main filter card component that contains conditions
- **QueryFilterChip.vue** - Individual filter chip component for displaying selected concepts
- **QueryFilterEvent.vue** - Component for rendering filter events
- **QueryFilterNestedEvent.vue** - Component for nested events within filters
- **AttributesDropdown.vue** - Dropdown for selecting and managing event attributes
- **CriteriaSelectorDropdown.vue** - Dropdown for selecting criteria types (conditions, drugs, etc.)
- **QueryFilter.vue** - Main component showcasing the query filter functionality

## Usage

Import components from the parent module:

```typescript
import { QueryFilterCard, QueryFilterChip } from '../'
```