help:
	@echo
	@echo 'Usage:'
	@echo '	make sdist                              Creates source distribution'
	@echo '	make wheel                              Creates wheel distribution'
	@echo '	make package                           	Creates source and wheel distribution'
	@echo '	make verify_wheel                       Verify wheel distribution with MD5 checksum'
	@echo '	make purge                              Remove all build related directories'
	@echo
	@echo '	make test                               Run tests'
	@echo '	make run_samples                        Run all the python scripts in samples folder'
	@echo '	make checktype                          Run typechecking'
	@echo

package:
	make purge
	python3 setup.py sdist bdist_wheel
	md5sum ./dist/*.* > ./dist/checksum.md5

package_local:
	make purge
	python3 setup.py sdist bdist_wheel
	cp dist/pystrategus-0.0.1-py3-none-any.whl ../../../resources/starboard-notebook-base/

sdist:
	make purge
	python3 setup.py sdist

wheel:
	make purge
	# pip install wheel
	python3 setup.py bdist_wheel
	# brew install md5sha1sum
	md5sum ./dist/*.whl > ./dist/checksum.md5

verify_checksum:
	md5sum -c ./dist/checksum.md5

purge:
	rm -rf dist && rm -rf build && rm -rf py*.egg-info

.PHONY: help package sdist wheel verify_wheel purge test run_samples checktype
