# Query Filter Styles

This folder contains all SCSS stylesheets for the query filter components.

## Files

### Component Styles
- **AttributesDropdown.scss** - Styles for the attributes dropdown component
- **CriteriaSelectorDropdown.scss** - Styles for the criteria selector dropdown
- **QueryFilterCardStyles.scss** - Styles for the main filter card component
- **QueryFilterChip.scss** - Styles for filter chips
- **QueryFilterEvent.scss** - Styles for filter events
- **QueryFilterNestedEvent.scss** - Styles for nested events
- **QueryFilter.scss** - Styles for the main component

### Shared Styles
- **queryFilterCard.scss** - Shared styles for filter card system (tabs, containers, etc.)
- **icons.scss** - Icon font definitions and mappings

## Style Architecture

All component styles import the shared `icons.scss` to avoid duplication of icon definitions. The styles follow BEM naming convention for maintainability.

## Usage

Component styles are automatically imported in their respective Vue components:

```scss
<style lang="scss" scoped>
@import '../styles/ComponentName';
</style>
```