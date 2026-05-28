# Wizards Configuration Guide

This guide explains how to configure and customize wizards for different CDW (Clinical Data Warehouse) configurations.

## Overview

Wizards use `configPath` values to map to CDW config attribute names. The default `wizards-config.json` is based on standard OMOP CDW configurations, but different systems (like HANA Lean) may use different attribute names.

## Pre-built Config Examples

- **`wizards-config.json`** - Standard OMOP configuration (default)
- **`wizards-config-hana-lean.json`** - HANA Lean with corrected attribute paths

## When You Need to Customize

You should customize the wizards configuration when:
- Using HANA Lean or non-standard OMOP configurations
- Your CDW config uses different attribute names
- Attributes have UUID suffixes (auto-generated per system)

## Discovering Your Attribute Paths

### Method 1: Browser Dev Tools

1. Open the portal and navigate to **Analytics**
2. Open browser developer tools (F12)
3. Go to the **Network** tab and filter for `analytics.xsjs`
4. Look for the `getMyConfig` request and click on it
5. In the **Response** tab, search for the interaction name (e.g., `conditionoccurrence`)
6. Extract the attribute keys under the `attributes` section

**Screenshot placeholder: Browser dev tools showing getMyConfig response with conditionoccurrence attributes**

### Method 2: Direct API Call

```bash
curl "https://your-domain/d2e/analytics-svc/pa/services/analytics.xsjs?action=getMyConfig&datasetId=YOUR_DATASET_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Search the JSON response for the interaction name to find available attribute names.

## Common Attribute Mappings

| Standard OMOP | HANA Lean |
|---------------|-----------|
| `Gender_concept_name` | `Gender` |
| `ethnicityName` | `ethnicity` |
| `raceName` | `race` |
| `meas_concept_name` | `measurementconceptname` |
| `condition_occ_concept_name` | `Condition_source_concept_code_...` (UUID varies) |

## Customizing the Config File

1. Download the appropriate template (`wizards-config.json` or `wizards-config-hana-lean.json`)
2. Replace attribute paths using the names discovered in the previous step
3. For UUID-suffixed attributes, replace the placeholder with your system's specific UUID

**Example replacement:**
```json
// Before (from template):
"configPath": "patient.interactions.conditionoccurrence.attributes.Condition_source_concept_code_580df080_3141_4ff3_bbb3_3461042995f9"

// After (your system's UUID):
"configPath": "patient.interactions.conditionoccurrence.attributes.Condition_source_concept_code_YOUR_UUID_HERE"
```

## Uploading the Config

### Via Portal
1. Go to **Settings** → **PA Config**
2. Navigate to the **Wizards** tab
3. Click **Upload JSON** and select your customized config file

### Via API
```bash
curl -X POST "https://your-domain/pa-config-svc/wizards/config?datasetId=YOUR_DATASET_ID" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d @your-custom-wizards-config.json
```

## Verification Steps

After uploading the configuration:

1. Open **Analytics** → **Wizards** tab
2. Verify wizard cards load without errors
3. Check the browser console - there should be no red error messages
4. Click into a wizard and verify fields render correctly
5. Test running a wizard query
6. If fields are empty or missing, check the `configPath` values in your config

## Troubleshooting

| Error | Cause | Solution |
|-------|-------|----------|
| `TypeError: Cannot read properties of undefined` | Attribute path is incorrect | Verify the `configPath` matches an existing attribute in your CDW config |
| Empty dropdowns | `configPath` doesn't match CDW attribute | Use browser dev tools to discover correct attribute names |
| Wizards not loading | Config upload failed | Check API response for errors and re-upload |

### Rollback

If you need to revert to the previous configuration:
- Via Portal: Settings → PA Config → Wizards tab → Restore previous version
- Via API: Re-upload the previous working config file

## Notes

- UUID-suffixed attributes are auto-generated per system and cannot be hardcoded universally
- Always verify attribute paths against your specific CDW configuration
- Keep a backup of working configurations before making changes
