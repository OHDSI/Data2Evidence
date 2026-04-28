from setuptools import setup, find_packages

with open('./requirements.txt', 'r') as fh:
    install_requires = fh.readlines()

with open('README.md', 'r') as fh:
    long_description = fh.read()

setup(
    name='pystrategus',
    version='0.0.1',
    packages=find_packages(exclude=['tests']),
    include_package_data=True,
    install_requires=install_requires,
    python_requires='>=3.7',
    package_data={
        'pystrategus': ["**/testdata/*.json", "**/testdata/*.csv"]
    },
    author='D4L data4life',
    author_email='we@data4life.care',
    url='https://www.data4life.care',
    description='Python interface to D4L Strategus job deployment for a Pyodide Kernal',
    long_description=long_description,
    long_description_content_type='text/markdown',
    license='',
    keywords='pystrategus omop d4l data4life healthcare '
)
