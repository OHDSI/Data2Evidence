from setuptools import setup, find_packages

with open('requirements.txt', 'r') as fh:
    install_requires = fh.readlines()

setup(
    name='pyomopql',
    version='0.0.1',
    packages=find_packages(exclude=['test']),
    install_requires=install_requires,
    python_requires='>=3.7',

    # metadata
    author='D4L data4life',
    author_email='we@data4life.care',
    url='https://www.data4life.care',
    description='Python interface to D4L OMOP Query Engine',
    license='',
    keywords='pyomopql omop d4l data4life healthcare qe '
)
