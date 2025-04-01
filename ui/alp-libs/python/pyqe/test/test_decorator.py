import logging
from pyqe.shared import decorator


@decorator.attach_class_decorator(decorator.log_function, __name__)
class Foo():
    def bar(self):
        return 'foobar'


def test_log_function_decorator(caplog):
    caplog.set_level(logging.DEBUG)
    with caplog.at_level(logging.DEBUG):
        foo = Foo()
        foo.bar()

        for rec in caplog.records:
            assert rec.levelname == "DEBUG"

        messages = [rec.message for rec in caplog.records]
        assert len(messages) == 2
        assert len(messages) == len(['bar' in ms for ms in messages])