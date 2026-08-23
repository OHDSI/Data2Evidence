"""``ast`` helpers for asserting on ``copy.py`` and ``flow.py``.

Neither module can be imported by this suite: both import prefect, which the
planner virtualenv deliberately does not have. So the tests that need to pin
control flow in them -- "this call must not run under dryRun", "this handler
must be for ReconciliationError specifically" -- parse the source instead.

These are structural assertions, not behavioural ones, and they are only used
where behaviour cannot be reached. Anything that can be tested by running it
lives in a pure helper that the same tests call directly.
"""

import ast
from pathlib import Path

PLUGIN_DIR = Path(__file__).resolve().parent.parent
COPY_SOURCE_PATH = PLUGIN_DIR / "copy.py"
FLOW_SOURCE_PATH = PLUGIN_DIR / "flow.py"


def module_tree(path: Path) -> ast.Module:
    return ast.parse(path.read_text())


def function_node(path: Path, name: str) -> ast.FunctionDef:
    """The (possibly nested) function named ``name`` in ``path``."""
    tree = module_tree(path)
    for node in ast.walk(tree):
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)) and node.name == name:
            return node
    raise AssertionError(f"{path.name} has no function named {name!r}")


def call_name(node: ast.Call) -> str:
    """``foo(...)`` -> ``foo``; ``a.b.foo(...)`` -> ``foo``."""
    func = node.func
    if isinstance(func, ast.Name):
        return func.id
    if isinstance(func, ast.Attribute):
        return func.attr
    return ""


def calls_to(node: ast.AST, name: str) -> list:
    return [n for n in ast.walk(node) if isinstance(n, ast.Call) and call_name(n) == name]


def _is_dry_run_attr(node: ast.AST) -> bool:
    return isinstance(node, ast.Attribute) and node.attr == "dry_run"


def _is_not_dry_run(node: ast.AST) -> bool:
    return (
        isinstance(node, ast.UnaryOp)
        and isinstance(node.op, ast.Not)
        and _is_dry_run_attr(node.operand)
    )


def dry_run_guarded_branch(func: ast.AST, name: str):
    """The branch that runs ``name`` only when dryRun is off, or ``None``.

    Accepts either spelling -- ``if not x.dry_run: name()`` or
    ``if x.dry_run: ... else: name()`` -- and returns the *other* branch, so a
    caller can go on to assert that the skip is logged.
    """
    for node in ast.walk(func):
        if not isinstance(node, ast.If):
            continue
        if _is_not_dry_run(node.test) and any(calls_to(stmt, name) for stmt in node.body):
            return node.orelse
        if _is_dry_run_attr(node.test) and any(calls_to(stmt, name) for stmt in node.orelse):
            return node.body
    return None


def string_constants(nodes) -> str:
    """Every string literal under ``nodes``, concatenated -- f-strings included."""
    if isinstance(nodes, ast.AST):
        nodes = [nodes]
    found = []
    for node in nodes:
        for child in ast.walk(node):
            if isinstance(child, ast.Constant) and isinstance(child.value, str):
                found.append(child.value)
    return "\n".join(found)


def handled_exception_names(handler: ast.ExceptHandler) -> set:
    """The exception class names one ``except`` clause catches."""
    if handler.type is None:
        return {"BaseException"}
    types = handler.type.elts if isinstance(handler.type, ast.Tuple) else [handler.type]
    names = set()
    for node in types:
        if isinstance(node, ast.Name):
            names.add(node.id)
        elif isinstance(node, ast.Attribute):
            names.add(node.attr)
    return names


def handlers_for(func: ast.AST, exception_name: str) -> list:
    return [
        handler
        for node in ast.walk(func)
        if isinstance(node, ast.Try)
        for handler in node.handlers
        if exception_name in handled_exception_names(handler)
    ]
