import logging
from prefect.logging import get_run_logger

class Logger:
    def __init__(self):
        self.debug_enabled = False # TODO: change to env variable
        self.logger: logging.Logger = self.get_logger()

    def get_logger(self) -> logging.Logger:
        try:
            return get_run_logger()
        except Exception:
            # Fallback to a standard logger
            return logging.getLogger()

    def info(self, message: str):
        self.logger.info(message)

    def debug(self, message: str):
        if self.debug_enabled:
            self.logger.debug(message)

    def warning(self, message: str):
        self.logger.warning(message)

    def error(self, message: str):
        self.logger.error(message)

    def critical(self, message: str):
        self.logger.critical(message)