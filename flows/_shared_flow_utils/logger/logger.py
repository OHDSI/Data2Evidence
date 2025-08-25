import logging
from prefect.variables import Variable
from prefect.logging import get_run_logger

class Logger:
    def __init__(self):
        debug_enabled = Variable.get("logs_debug_enable")
        self.debug_enabled = debug_enabled if debug_enabled else False
        self.logger = self.get_logger()

    def get_logger(self):
        try:
            return get_run_logger()
        except Exception:
            # Fallback to a standard logger
            return logging.getLogger()

    def info(self, message: str):
        self.logger.info(message)

    def debug(self, message: str):
        if self.debug_enabled:
            self.logger.info(message)

    def warning(self, message: str):
        self.logger.warning(message)

    def error(self, message: str):
        self.logger.error(message)

    def critical(self, message: str):
        self.logger.critical(message)