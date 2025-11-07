# Portability Test

## OS

### Mac

| Scenario | User sets up the virtual environment and installs PyQE                                                                                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that the user has a test machine </br> and has Python v3.7.4 or higher version </br> and following steps has been executed </br> `$ cd <path-for-virtual-env> `</br>`$ python3 -m venv pyqe-env` </br>`$ source ./pyqe-env/bin/activate` |
| When     | user triggers `$ which python`                                                                                                                                                                                                           |
| Then     | the location of your Python interpreter should point to the env directory `.../pyqe-env/bin/python` </br> and user can proceed with the PyQE installation by following the [guide](installation-test.md)                                 |

| Scenario | Verify that PyQE is installed successfully                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that the user has the virtual environment set up </br> and PyQE installation has been completed </br> and the environment variables are configured </br> `PYQE_URL = https://<pyqe-url-instance>` </br>`PYQE_PA_CONFIG_ID = <pyqe-pa-config-id>`                                                                                                                                          |
| When     | user executes </br> `$ python3` </br> `>>> from pyqe import * ` _# Import the pyqe lib_ <br> `>>> query = Query("New Filter")` _# Establish connection to D4L Query Engine with the authentication parameters_ </br> `>>> patient_count = Result().get_patient_count(query.get_patient_count_filter())` _# Get patient count based on query_ </br> `>>> print(patient_count)` _# Print patient count_ |
| Then     | user should be able to retrieve patient count based on provided filter query                                                                                                                                                                                                                                                                                                                          |

### Windows

| Scenario | User sets up the virtual environment and installs PyQE                                                                                                                                                                              |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that the user has a test machine </br> and has Python v3.7.4 or higher version </br> and following steps has been executed </br> `> cd <path-for-virtual-env> ` </br> `> py -m venv pyqe-env` </br> `> .\pyqe-env\Scripts\activate` |
| When     | user triggers `> where python`                                                                                                                                                                                                      |
| Then     | the location of your Python interpreter should point to the env directory `.../pyqe-env/bin/python.exe` </br> and user can proceed with the PyQE installation by following the [guide](installation-test.md)                        |

| Scenario | Verify that PyQE is installed successfully                                                                                                                                                                                                                                                                                                                                                            |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that the user has the virtual environment set up </br> and PyQE installation has been completed </br> and the environment variables are configured </br> `PYQE_URL = "https://<pyqe-url-instance>"` </br>`PYQE_PA_CONFIG_ID = "<pyqe-pa-config-id>"`                                                                                                                                      |
| When     | user executes </br> `$ python3` </br> `>>> from pyqe import * ` _# Import the pyqe lib_ <br> `>>> query = Query("New Filter")` _# Establish connection to D4L Query Engine with the authentication parameters_ </br> `>>> patient_count = Result().get_patient_count(query.get_patient_count_filter())` _# Get patient count based on query_ </br> `>>> print(patient_count)` _# Print patient count_ |
| Then     | user should be able to retrieve patient count based on provided filter query                                                                                                                                                                                                                                                                                                                          |

## Python Version

| Scenario | PyQE installation on python version >=3.7.0 is successful                                                                                                                               |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that the installed Python version is at least 3.7.0                                                                                                                                     |
| When     | user executes `$ pip install pyqe.whl`                                                                                                                                                  |
| Then     | user should be able to complete the installation and verify by successfully executing queries in PyQE _(you can find a sample query in the installation [guide](installation-test.md))_ |

| Scenario | PyQE installation on python version lower than 3.7.0                                                               |
| -------- | ------------------------------------------------------------------------------------------------------------------ |
| Given    | that the installed Python version is lower than v3.7.0                                                             |
| When     | user executes `$ pip install pyqe.whl`                                                                             |
| Then     | user will get an error message `pyqe requires Python '>=3.7' but the running Python is <installed Python version>` |

## Jupyter Notebook

| Scenario | Jupyter notebook is installed in the virtual environment                                                                                                                                                                                                                                  |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that the user's machine has Python v3.7.0 or higher version installed </br> and the virtual environment has been set </br> and activated by executing the following steps: </br> `$ cd <path-for-virtual-env>` </br> `$ python3 -m venv pyqe-env` </br>`$ source ./pyqe-env/bin/activate` |
| When     | user executes the following steps: </br> `$ pip install jupyter notebook` _# Installs Jupyter notebook_ </br> `$ ipython kernel install --name "local-venv" --user` _# Add the virtualenv as a jupyter kernel_ </br> `$ jupyter notebook` _# Starts Jupyter Notebook_                     |
| Then     | it should open a web browser with your Jupyter Notebook running                                                                                                                                                                                                                           |

| Scenario | PyQE is installed using the Jupyter Notebook terminal                                                             |
| -------- | ----------------------------------------------------------------------------------------------------------------- |
| Given    | that the Jupyter notebook is running in your browser, and the `pyqe.whl` should be in the same directory          |
| When     | user opens the Jupyter notebook terminal </br> and executes `$ pip install pyqe.whl`                              |
| Then     | user should get a message: `Successfully installed pyqe` </br> and the installation should complete without error |

| Scenario | Verify PyQE installation and run queries in the Jupyter notebook                                                                                                                                                                                                                                                                                                                                                                                               |
| -------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Given    | that the Jupyter notebook and PyQE has been installed and the environment variable has been set: </br> `PYQE_URL = https://<pyqe-url-instance>` </br>`PYQE_PA_CONFIG_ID = <pyqe-pa-config-id>`                                                                                                                                                                                                                                                     |
| When     | user starts a new Python notebook kernel </br> and runs the following: </br> `$ python3` </br> `>>> from pyqe import * ` _# Import the pyqe lib_ <br> `>>> query = Query("New Filter")` _# Establish connection to D4L Query Engine with the authentication parameters_ </br> `>>> patient_count = Result().get_patient_count(query.get_patient_count_filter())` _# Get patient count based on query_ </br> `>>> print(patient_count)` _# Print patient count_ |  |
| Then     | user should be able to retrieve patient count based on provided filter query                                                                                                                                                                                                                                                                                                                                                                                   |
