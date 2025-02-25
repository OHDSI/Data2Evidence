import json
import base64
import zlib
from urllib.parse import unquote
import logging
from pyqe.shared import decorator
from pyqe.setup import setup_simple_console_log

logger = logging.getLogger(__name__)
setup_simple_console_log()


@decorator.attach_class_decorator(decorator.log_function, __name__)
class _EncodeQueryStringMixin():
    """
    shared functions for base64 encoding query string
    """

    def __init__(self):
        super().__init__()

    def _encode_query_string(self, data):
        print(type(data))
        return base64.urlsafe_b64encode(self._pako_deflate(json.dumps(data)))
        
        #b64encode(self._pako_deflate(json.dumps(data)))

    def _pako_deflate(self, data):
        compress = zlib.compressobj(zlib.Z_DEFAULT_COMPRESSION, zlib.DEFLATED, 15,
                                    memLevel=8, strategy=zlib.Z_DEFAULT_STRATEGY)
        compressed_data = compress.compress(bytes(unquote(data), 'iso-8859-1'))
        compressed_data += compress.flush()
        return compressed_data
