# Installation Test

This documentation contains scenarios to verify a successful PyQE wheel package installation.

## Prerequisites

<ul>
    <li>Python v3.7.4 or higher version</li>
</ul>

## Pre-installation

| Scenario | User sets up the virtual enviroment successfully on Mac                                                                                                                                                                                  |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that the user has a test machine </br> and has Python v3.7.4 or higher version </br> and following steps has been executed </br> `$ cd <path-for-virtual-env> `</br>`$ python3 -m venv pyqe-env` </br>`$ source ./pyqe-env/bin/activate` |
| When     | user triggers `$ which python`                                                                                                                                                                                                           |
| Then     | the location of your Python interpreter should point to the env directory `.../pyqe-env/bin/python`                                                                                                                                      |

You can refer to this [link](portability-test.md) for **Windows** virtual environment set up guide

If `python3 --version` is showing python 3.6 or below, you can refer [here](upgrade-python3.md) to upgrade to python3.7

## Installation

| Scenario | User installs PyQE wheel package                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| Given    | that the user has the pyqe wheel package </br> and has set up the virtual environment                             |
| When     | user executes `$ pip install pyqe.whl`                                                                            |
| Then     | user should get a message: `Successfully installed pyqe` </br> and the installation should complete without error |

| Scenario | Verify that PyQE is installed successfully                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that the user has the virtual environment set up </br> and installed the PyQE wheel package </br> and configured the environment variables </br> `PYQE_URL = "https://<pyqe-url-instance>"` </br>`PYQE_PA_CONFIG_ID = "<pyqe-pa-config-id>"`                                                                                                                                              |
| When     | user executes </br> `$ python3` </br> `>>> from pyqe import * ` _# Import the pyqe lib_ <br> `>>> query = Query("New Filter")` _# Establish connection to D4L Query Engine with the authentication parameters_ </br> `>>> patient_count = Result().get_patient_count(query.get_patient_count_filter())` _# Get patient count based on query_ </br> `>>> print(patient_count)` _# Print patient count_ |
| Then     | user should be able to retrieve patient count based on provided filter query                                                                                                                                                                                                                                                                                                                          |

## Uninstallation

| Scenario | User uninstalls PyQE package successfully                                                                                                                                                                                                                                                          |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that there is an existing PyQE installed in the virtual environment                                                                                                                                                                                                                                |
| When     | user executes `$ pip uninstall pyqe`                                                                                                                                                                                                                                                               |
| Then     | user should get a message `Successfully uninstalled pyqe` </br> and the following directories should be removed: </br> `.../pyqe-env/lib/python3.7/site-packages/pyqe.dist-info/*` </br> `.../pyqe-env/lib/python3.7/site-packages/pyqe/*` </br> `.../pyqe-env/lib/python3.7/site-packages/test/*` |

## Upgrade

| Scenario | PyQE is upgraded to the latest version successfully                                                                              |
| -------- | -------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that there is an existing installation of PyQE library in the virtual environment </br> and a new version of PyQE is available   |
| When     | user executes `$ pip install --upgrade pyqe`                                                                                     |
| Then     | user will get a message `Successfully installed pyqe-<new version number>` and the dependencies should be upgraded without error |

| Scenario | PyQE is updated but no new version is available                                 |
| -------- | ------------------------------------------------------------------------------- |
| Given    | that there is an existing installation of PyQE in the virtual environment </br> |
| When     | user executes `$ pip install --upgrade pyqe`                                    |
| Then     | user will get a message `Requirement already up-to-date:pyqe`                   |
