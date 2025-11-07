# Create Package

This documentation contains the step by step to create the installation package.

## Prerequisites

- Run `pip install wheel`
- Run `brew install md5sha1sum`

## Create wheel and source distribution

- Verify if the version number in the `setup.py` is correct
- Run `make package`
- The generated files are located in `dist` folder containing:
  - Source distribution: `pyqe-<version>.tar.gz`
  - Wheel package: `pyqe-<version>-<compatibility>.whl`
  - MD5 checksum: `checksum.md5`

## Create wheel package only

- Verify if the version number in the `setup.py` is correct
- Run `make wheel`
- The generated files are located in `dist` folder containing:
  - Wheel package: `pyqe-<version>-<compatibility>.whl`
  - MD5 checksum: `checksum.md5`

## Verify the checksum

- Run `make verify_checksum`
