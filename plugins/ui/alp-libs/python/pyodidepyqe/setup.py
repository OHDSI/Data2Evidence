from setuptools import setup, find_packages

with open('README.md', 'r') as fh:
    long_description = fh.read()

with open('requirements.txt', 'r') as fh:
    install_requires = fh.readlines()

setup(
    name='pyodidepyqe',
    version='0.0.2',
    packages=find_packages(exclude=['test']),
    package_data={
        'pyqe': ['logging.yaml', 'settings.yaml']
    },
    install_requires=install_requires,
    python_requires='>=3.7',

    # metadata
    author='D4L data4life',
    author_email='we@data4life.care',
    url='https://www.data4life.care',
    description='Python interface to D4L Query Engine for a Pyodide Kernal',
    long_description=long_description,
    long_description_content_type='text/markdown',
    license='',
    keywords='pyqe omop d4l data4life healthcare qe '
)
