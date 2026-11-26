"""Focused regressions for changed-function selection and per-rule ratchets."""

import ast
import importlib.util
from pathlib import Path
import sys

SPEC = importlib.util.spec_from_file_location(
    "changed_functions", Path(__file__).resolve().parents[2] / "scripts/quality/changed_functions.py"
)
check = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = check
SPEC.loader.exec_module(check)


def test_header_and_decorator_lines_select_function():
    unit = check.analyze_module("@decorator\ndef f(a):\n    return a\n")[0]
    assert all(check._selected(unit, line) for line in (1, 2, 3))


def test_ast_loads_ignore_strings_docstrings_and_comments():
    func = ast.parse('def f(a, b):\n    """b docs"""\n    # b comment\n    return a\n').body[0]
    loaded, _, dynamic = check._scan_names(func)
    assert loaded == {"a"}
    assert not dynamic


def test_global_and_nonlocal_are_not_unused_locals():
    unit = check.analyze_module("def f(a):\n    global x\n    x = 1\n    return a\n")[0]
    assert "S1481" not in {finding.rule for finding in check.unused_names(unit.node)}


def test_dynamic_scope_skips_q4():
    unit = check.analyze_module("def f(a):\n    return locals()\n")[0]
    assert not unit.q4


def test_signature_change_selects_function():
    # Pure unit-level check keeps the fixture independent of git setup.
    base = check.analyze_module("def f(a):\n    return a\n")[0]
    changed = check.analyze_module("def f(a, b):\n    return a\n")[0]
    assert check.check_unit("x.py", changed, [base])


def test_deleted_lines_include_function_in_base():
    assert check._hunk_lines("@@ -2,1 +1,0 @@") == {1}


def test_q4_replacement_is_count_ratchet():
    base = check.analyze_module("def f(a, b):\n    return a\n")[0]
    head = check.analyze_module("def f(a, b):\n    return b\n")[0]
    assert not check.check_unit("x.py", head, [base])
