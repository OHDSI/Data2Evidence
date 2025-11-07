# Upgrade Python3

## Background
Python3.6 is the default version that comes with Ubuntu 18.04/18.10. The executable `python3` is referred to `python3.6` even after `python3.7` is installed.

Here is the steps to verify, install and update `python3` to `python3.7`.

## Verify python3 version
| Scenario | User checks the current python3 version |
|--:|--|
| Given | that user has a test machine |
| When | user triggers `$ python3 --version` |
| Then | user should get a python3 version 3.7 or above<br /> Example: `Python 3.7.6` |

## Install python3.7
| Scenario | User installs python3.7 successfully on Ubuntu |
|--:|--|
| Given | that user has a test machine with python3 version 3.6 or lower |
| When | user triggers `$ sudo apt update -y` to update the list of available packages |
| And | user triggers `$ sudo apt install python3.7` to install the python 3.7
| And | user triggers `$ sudo apt install python3-pip` to install the pip3
| And | user triggers `$ sudo apt install python3.7-venv` to install the python 3.7 virtual environment
| Then | user should get a installation successful message

## Update python3 symlink to python3.7
| Scenario | User update python3 to point to python3.7 |
|--:|--|
| Given | that user has a test machine with python3.7 installed and python3 is refered to version 3.6 or lower |
| When | user triggers `$ sudo rm /usr/bin/python3` to remove the python3 symlink
| And | user triggers `$ sudo ln -s python3.7 /usr/bin/python3` to make a new symlink
| And | user triggers `$ python3 --version`
| Then | user should get a python3 version 3.7<br /> Example: `Python 3.7.6` |