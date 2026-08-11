"""Guards against the `could not find function ".jcall"` regression.

Under the pixi runtime, rJava's namespace is *loaded* (DatabaseConnector Imports
it, and its .onLoad -> .jpackage even starts the JVM) but never *attached*: the
env's R_PROFILE_USER (rprofile_java.R) only sets java.parameters, unlike the old
image's init_rjava.R which ran library(rJava). So any bare `.jcall`/`.jnew` in an
`ro.r()` string fails at runtime with `could not find function ".jcall"` -- and
only when a Strategus flow actually executes, which no unit test covers.

These checks parse nodes.py as source rather than importing it, so they need
none of the flow runtime (prefect/rpy2/R) and run in any environment.
"""

import ast
import re
from pathlib import Path

NODES = Path(__file__).resolve().parent.parent / "nodes.py"

# .jcall / .jnew (and friends) not reached through the rJava:: namespace.
UNQUALIFIED_RJAVA = re.compile(r"(?<!rJava::)\.j(?:call|new|init|field|cast)\b")


def _ro_r_literals():
    """(lineno, code) for every string literal passed to an `ro.r(...)` call."""
    tree = ast.parse(NODES.read_text())
    out = []
    for node in ast.walk(tree):
        if (
            isinstance(node, ast.Call)
            and isinstance(node.func, ast.Attribute)
            and node.func.attr == "r"
            and node.args
            and isinstance(node.args[0], ast.Constant)
            and isinstance(node.args[0].value, str)
        ):
            out.append((node.lineno, node.args[0].value))
    return out


def test_no_unqualified_rjava_calls_in_r_snippets():
    """rJava is never attached at runtime, so bare .jcall/.jnew cannot resolve."""
    offenders = [
        (lineno, UNQUALIFIED_RJAVA.findall(code))
        for lineno, code in _ro_r_literals()
        if UNQUALIFIED_RJAVA.search(code)
    ]
    assert not offenders, (
        "unqualified rJava call(s) in ro.r() snippets at nodes.py line(s) "
        f"{[lineno for lineno, _ in offenders]}: rJava is loaded but not attached "
        "at runtime, so these raise 'could not find function'. Use rJava::.jcall."
    )


def test_heap_diagnostic_is_non_fatal_and_uses_runtime_singleton():
    """The heap probe is diagnostic only; it must never fail a Strategus run."""
    probes = [(l, c) for l, c in _ro_r_literals() if "maxMemory" in c]
    assert len(probes) == 1, f"expected exactly one heap diagnostic, found {len(probes)}"
    _, code = probes[0]

    assert "try(" in code, "heap diagnostic must be wrapped in try() -- it is not worth failing a run over"
    assert "silent = TRUE" in code, "heap diagnostic's try() should be silent"
    assert 'requireNamespace("rJava"' in code, "heap diagnostic must guard on rJava being installed"
    # Runtime's constructor is private; .jnew only "works" by bypassing access
    # control through JNI, which JEP 472 / JDK 24+ progressively restricts.
    assert "getRuntime" in code, "use the Runtime singleton via getRuntime"
    assert ".jnew" not in code, "do not construct java.lang.Runtime with .jnew"
