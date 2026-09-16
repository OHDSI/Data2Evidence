## EQ-5D-5L Index Calculation Plugin

Calculates EQ-5D-5L utility index (health state) scores from EQ-5D-5L questionnaire
responses already present in the OMOP `observation` table, and writes the result
into the OMOP `measurement` table, linked back to the source person/visit.

This plugin does **not** read FHIR data or run any FHIR->OMOP transform itself. It
assumes the upstream `EQ5D5L-to-OMOP-Observation` FHIR StructureMap has already
turned each EQ-5D-5L `QuestionnaireResponse` into 5 `observation` rows per
administration (one per dimension) - see "Reading responses" below.

EQ-5D-5L is a 5-dimension, 5-level health-related quality-of-life questionnaire
(mobility, self-care, usual activities, pain/discomfort, anxiety/depression). Each
response's 5-digit health state (e.g. `11223`) is converted into a single utility
index using the EuroQol value set for the run's `country_code`. Source:
https://euroqol.org/eq-5d-instruments/eq-5d-5l-about/valuation/eq-5d-5l-value-sets/

### Bundled value sets

`scoring.load_value_set(country_code)` resolves an ISO 3166-1 alpha-2 code (e.g.
`"AU"`) to a bundled file via `scoring.COUNTRY_CODE_TO_FILE_STEM`. A `<name>.json`
file takes precedence if present, otherwise a `<name>.txt` is parsed (see "Value
set file format" below).

| `country_code` | file | value set |
| --- | --- | --- |
| `AU` | `Australia.txt` | DCE with duration and dead |
| `BE` | `Belgium.txt` | DCE and TTO hybrid |
| `CA` | `Canada.txt` | TTO |
| `CN` | `China.txt` | TTO |
| `DE` | `Germany.txt` | DCE and TTO hybrid |
| `DK` | `Denmark.txt` | DCE and TTO hybrid |
| `EG` | `Egypt.txt` | TTO |
| `ET` | `Ethiopia.txt` | DCE and TTO hybrid |
| `FR` | `France.txt` | DCE and TTO hybrid |
| `GH` | `Ghana.txt` | DCE and TTO hybrid, adapted EuroQol protocol |

Canada is the one bundled value set that does **not** put full health (`11111`) at
index `1.0` (it's `0.949`) - a real feature of its TTO methodology, not a bug.

To add a country: drop EuroQol's official STATA syntax in unmodified as
`external/value_sets/<Country name>.txt`, or hand-author a
`external/value_sets/<Country name>.json` for SPSS/SAS-only value sets (see "Value
set file format"). Either way, add the ISO code -> file stem mapping to
`COUNTRY_CODE_TO_FILE_STEM` in `scoring.py`, and to `country_code`'s enum in
`package.json` if it should appear in the job-trigger UI dropdown.

### Value set file format

`load_value_set()` builds a value set one of two ways, tagged by its `method`
field (`health_state_to_index()` branches on which is present):

- A `<name>.txt` file is EuroQol's STATA syntax, unmodified.
  `scoring.parse_stata_value_set()` runs it (via a small interpreter for the STATA
  subset EuroQol's value-set files use - see `scoring.py`'s own docstrings for the
  supported statement/expression grammar) once per each of the 3125 possible
  5-dimension health states, producing `method: "stata_simulation"` and an
  `index_table` mapping every health state directly to its index.
- A `<name>.json` file is hand-authored directly, for value sets EuroQol only
  publishes as SPSS/SAS syntax:

  ```json
  {
    "country_code": "BE",
    "method": "main_effects_interaction",
    "source": "<citation/link to the specific EuroQol value set used>",
    "range_low": -0.533,
    "range_high": 1.0,
    "intercept": 1.0,
    "coefficients": { "MO2": 0.032, "MO3": 0.059, "...": "..." },
    "interactions": [
      { "name": "not_full_health", "trigger": "min_level", "level": 2, "coefficient": 0.038 }
    ]
  }
  ```

  `method: "main_effects_interaction"`: for each dimension at level >= 2, subtract
  that dimension+level's coefficient from the intercept, then subtract the
  coefficient of each `interactions` entry whose trigger fires - `"min_level"`
  (any dimension at or above `level`) or `"exact_level"` (any dimension at exactly
  `level`). A `.json` file declaring any other `method` is rejected.

### Reading responses - the `observation` contract this plugin expects

The upstream FHIR->OMOP pipeline resolves each `QuestionnaireResponse` into 5
`observation` rows. This plugin reads them as:

- **Dimension identity**: `observation_concept_id`, matched against
  `DIMENSION_CONCEPT_ID_MAP` in `types.py` (fixed, not configurable per run).
- **Grouping**: the 5 rows of one administration share `observation_source_value`
  (the plain `QuestionnaireResponse` id). A group missing a dimension, or
  disagreeing on `person_id`, is skipped (logged) rather than partially scored.
- **Answer value**: a purely numeric 1-5 code in `value_source_value`; anything
  else (non-numeric, or out of range) is treated as missing for that dimension.
- **Linkage**: `person_id`/`visit_occurrence_id` come directly from the
  observation rows.

If the real upstream output differs from this contract, update
`calculate_index_rows()`/`read_eq5d5l_observations()` in `flow.py` accordingly.

### Re-run / overwrite behavior

Re-running for the same `schema_name` - including with a different
`country_code` - overwrites the previously stored index values rather than
creating duplicates: all `measurement` rows tagged with the EQ-5D-5L
`measurement_concept_id` are deleted, then the freshly computed set is inserted,
in one transaction. If a run computes zero valid rows, existing rows are left
untouched.

A rerun's FHIR lineage entries (below) stay in sync with whichever measurement
rows it actually computed, even if the response count changes between runs.

### FHIR lineage (fhir_omop_key_map)

After writing to `measurement`, this plugin upserts one `fhir_omop_key_map` row
per computed index measurement - `(fhir_id=qrId, fhir_resource_type=
"QuestionnaireResponse", omop_table_name="measurement", omop_id=<measurement_id>)`
- into `{database_code}_{schema_name}_fhir_mapping.fhir_omop_key_map`, mirroring
`FhirMappingNode` (`plugins/flows/data_transformation/dataflow_ui_plugin/nodes.py`).

This plugin never creates that mapping schema/table - it's a lineage *consumer*,
appending to what the upstream FHIR->OMOP pipeline (`FhirMappingNode`) must
already have created. If that schema/table doesn't exist, or exists with an
outdated (pre-4-column) unique index, this plugin raises `ValueError` naming the
problem before writing any measurement rows, rather than failing partway through
or after.

On a rerun, lineage entries for measurements that no longer exist are removed
before the current lineage is written, so entries never point at a stale or
reused measurement.

### Algorithm provenance (metadata)

After a run computes and writes at least one index row, this plugin writes one row
into `{schema_name}.metadata` recording which EuroQol value set and scoring
method produced that run's values (`name="EQ-5D-5L Index Calculation Algorithm"`).
Like `measurement`, this is overwrite-on-rerun: the existing row is deleted before
the new one is inserted, in one transaction. A `dry_run` or zero-valid-rows run
writes no metadata row, consistent with `measurement` being left untouched.

### Parameters

```
{
  "options": {
    "config": {
      "dry_run": false,                                           # Optional: compute but don't write to measurement/metadata
      "database_code": "alpdev_pg",                                # Required: CDM tenant credentials key
      "schema_name": "cdmdefault",                                 # Required: OMOP CDM schema of the dataset being scored
      "omop_dataset_id": "3f2504e0_4f89_11d3_9a0c_0305e82c3301",   # Required: the dataset's own id, passed through to DBDao as cache_id
      "country_code": "AU"                                         # Required: selects the EuroQol value set; single country per run
    }
  }
}
```

Only Postgres-backed datasets are supported today; a HANA- or TREX-dialect
`database_code` fails fast with a clear error.

`database_code` and `omop_dataset_id` identify different things and aren't
expected to match - `database_code` is the tenant's connection credentials key,
while `omop_dataset_id` is the dataset's own id (a sanitized UUID for a real
cache/snapshot dataset). This plugin reads/writes the dataset's live CDM tables
directly (the same convention `phenotype_plugin`, `loyalty_score_plugin`, and
`i2b2_plugin` use), so `omop_dataset_id` isn't used for connection routing here -
only `database_code` is.

The "EQ-5D-5L index value" measurement concept id (`42537273`), its
measurement_type_concept_id (`32862`), and the answer-code-to-level mapping are
all fixed (`types.py`) rather than configurable per run.
