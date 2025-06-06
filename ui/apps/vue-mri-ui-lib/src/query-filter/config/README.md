# Query Filter Configuration

This folder contains configuration files for the query filter system.

## Files

- **cohort-criteria-config.json** - Main configuration file for cohort criteria
  - Defines available criteria types (conditions, drugs, procedures, etc.)
  - Specifies attributes for each criteria type
  - Contains UI labels, descriptions, and icon mappings
  - Configures which sections support which criteria types

## Structure

The configuration follows this structure:

```json
{
  "criteriaTypes": {
    "conditionOccurrence": {
      "title": "Add condition occurrence",
      "icon": "icon-stethoscope",
      "sections": ["initialEvents", "censoringEvents", "criteriaGroup"],
      "attributes": [...]
    }
  }
}
```

## Usage

This configuration is loaded by the `CriteriaConfigLoader` utility and used throughout the application to dynamically generate UI elements.