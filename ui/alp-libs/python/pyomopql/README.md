## PYOMOPQL
Light weight python library to query HANA database

### SAP HANA Python Client documentation: https://help.sap.com/docs/SAP_HANA_PLATFORM/0eec0d68141541d1b07893a39944924e/f3b8fabf34324302b123297cdbe710f0.html?locale=en-US

### Environment Variables
They are defined in `libs/pyomopql/.env.example` for reference.

### Local setup
- Setup environment variables in `.env` file. Please refer `.env.example`
- Run the following commands, from the `libs/pyomopql` folder
```
python3 -m venv pyomopqlenv
source pyomopqlenv/bin/activate
pip install -r requirements-dev.txt
brew install md5sha1sum
```
- Goto `libs/pyomopql/pyomopql/test`, run the test file to check if the setup is successful.
```
PYTHONPATH=$PYTHONPATH:../ python app.py
```
### If using VSCode
Add the virtual env as the python interpretor. cmd + shift + p -> type user -> open user settings -> Search with `Python: Venv Path` and enter the absolute path of the virtual env folder until `bin` path. Example `/Users/jovyan/alp-clinical-research/libs/pyomopql/pyomopqlenv/bin`

### Sample python and ipynb files
Are available in `samples` folder

### Run Ipython notebooks in samples folder
- Build wheel package
```
python3 -m venv pyomopqlenv
source pyomopqlenv/bin/activate
pip install -r requirements-dev.txt
brew install md5sha1sum
make package
```

- Then run this following command to install wheel package
```
pip uninstall pyomopql && make package && pip install dist/pyomopql-0.0.1-py3-none-any.whl
```

### Build Wheel Package For Shipping to Customer
From the libs/pyomopql folder, run the following on a mac
```
pip install wheel
brew install md5sha1sum
make package
```