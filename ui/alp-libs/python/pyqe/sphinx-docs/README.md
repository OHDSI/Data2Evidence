# pyQE Sphinx Doc

Here are the steps to generate docs for pyQE

1) Install sphinx in your Python virtual environment
```
pip install -U sphinx
```
2) Go to sphinx-docs directory
```
cd libs/pyqe/sphinx-docs
```
3) Sphinx configuration is already committed to this repository. However, if we want to create a new configuration for scratch, we can refer [here](config.md) (Skip if we want to use existing configuration)

4) Execute below command to generate .rst files
```
sphinx-apidoc -o . ../pyqe -M
```
5) Execute below command to generate html docs from the .rst files
```
make html
```
6) Open the index.html file to view docs in browser
7) To update the docs (after changing & saving the docstrings in .py files), please remove all .rst files other than index.rst (<b>Important</b>) & _build folder
8) Go through step 4 to 6 again to verify the updated docs
