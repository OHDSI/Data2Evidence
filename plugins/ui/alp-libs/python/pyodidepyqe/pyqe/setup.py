import os
import logging
import logging.config
import yaml
import pkgutil


def setup_log_from_file(log_config_file=None, default_level=logging.INFO):
    """Setup logging configuration from yaml file"""

    logger = logging.getLogger("pyqe")
    logger.setLevel(default_level)
    logger.info('Setting up logging')

    path = log_config_file if log_config_file else os.getenv('PYQE_LOG_CONFIG_FILE', None)
    if not path:
        path = 'logging.yaml'

    exists = os.path.exists(path)
    if exists:
        logger.info('Reading logging configs from file')
        with open(path, 'rt') as f:
            data = f.read()
    else:
        logger.info('Reading logging configs from package')
        data = pkgutil.get_data('pyqe', 'logging.yaml')

    if data:
        logger.info('Configuring logging')
        config = yaml.safe_load(data)
        logging.config.dictConfig(config)
    else:
        logger.warning(f'File {path} is not found')


def setup_simple_console_log(
    default_level=logging.INFO,
    default_format='%(asctime)s - %(levelname)s - %(message)s',
    default_datefmt='%d-%b-%Y %H:%M:%S'
):
    """Setup a simple console logging"""
    logging.basicConfig(format=default_format, datefmt=default_datefmt)
    logger = logging.getLogger("pyqe")
    logger.setLevel(default_level)
