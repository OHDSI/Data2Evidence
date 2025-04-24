# Sphinx config guide

Here are the steps to generate Sphinx config from scratch:

a) Execute below command to create config:
```
sphinx-quickstart
```
b) Use default values for most prompts other than:
* Project name
* Author name(s)

c) Uncomment the following in conf.py
```
import os
import sys
sys.path.insert(0, os.path.abspath('.')) # Change according to the project source directory
```
d) Find extensions in conf.py and add below:
```
extensions = [
  'sphinx.ext.autodoc'
]
```
e) Change html_theme in conf.py if needed:
```
html_theme = 'bizstyle'
```
f) Add modules under toctree in index.rst to include all modules in docs:
```
.. toctree::
  :maxdepth: 2
  :caption: Contents:

  modules
```