# Waveform Data

This directory is used for **local development and testing** of the waveform ETL plugin.

## Setup

Paste your waveform data files here before running the flow locally. The expected directory structure mirrors the WFDB layout:

```
waveform_data/
└── waves/
    └── <group>/              # e.g. p100
        └── <subject>/        # e.g. p10014354
            ├── RECORDS
            └── <record>/     # e.g. 81739927
                ├── <record>.hea
                └── <record>.dat
```

## Notes

- This directory is intended for local use only and should not be committed with real patient data.
- The flow reads from this directory when `options.filepath` points here.
