"""Git-driven regressions for changed-function selection and ratchets."""

import importlib.util
import os
from pathlib import Path
import subprocess
import sys

import pytest

SPEC = importlib.util.spec_from_file_location(
    "changed_functions", Path(__file__).resolve().parents[2] / "scripts/quality/changed_functions.py"
)
check = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = check
SPEC.loader.exec_module(check)


def _git(root, *args):
    return subprocess.run(
        ["git", "-C", str(root), *args], check=True, capture_output=True, text=True,
        env={**os.environ, "GIT_CONFIG_NOSYSTEM": "1", "GIT_CONFIG_GLOBAL": os.devnull,
             "GIT_AUTHOR_NAME": "test", "GIT_AUTHOR_EMAIL": "test@example.invalid",
             "GIT_COMMITTER_NAME": "test", "GIT_COMMITTER_EMAIL": "test@example.invalid"},
    ).stdout.strip()


def _write(root, path, source):
    target = root / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(source, encoding="utf-8")


def _case(tmp_path, base_source, head_source, *, base_path="pkg/mod.py", head_path=None):
    root = tmp_path / f"repo-{len(list(tmp_path.iterdir()))}"
    root.mkdir()
    _git(root, "init", "-q", "-b", "main", "--template=")
    _git(root, "config", "core.hooksPath", os.devnull)
    _write(root, ".sonar/local.properties", "sonar.sources=.\n")
    _write(root, base_path, base_source)
    _git(root, "add", "--", ".sonar/local.properties", base_path)
    _git(root, "commit", "-q", "-m", "base")
    base = _git(root, "rev-parse", "HEAD")
    head_path = head_path or base_path
    if head_path != base_path:
        (root / base_path).unlink()
    _write(root, head_path, head_source)
    _git(root, "add", "--", ".sonar/local.properties", base_path, head_path)
    _git(root, "commit", "-q", "-m", "head")
    return root, base


def _findings(tmp_path, base_source, head_source, **kwargs):
    root, base = _case(tmp_path, base_source, head_source, **kwargs)
    return check.check_diff(str(root), base)


def test_def_line_signature_edit_counts_parameter_rise(tmp_path):
    old = "def f(" + ", ".join(f"p{i}" for i in range(13)) + "):\n    return len(locals())\n"
    new = "def f(" + ", ".join(f"p{i}" for i in range(14)) + "):\n    return len(locals())\n"
    findings = _findings(tmp_path, old, new)
    assert [(item.rule, item.old, item.new) for item in findings] == [("S107", "13", "14")]


def test_decorator_only_edit_selects_method(tmp_path):
    params = ", ".join(["cls", *(f"p{i}" for i in range(13))])
    old = f"class C:\n    @classmethod\n    def f({params}):\n        return 1\n"
    new = old.replace("@classmethod", "@staticmethod")
    findings = _findings(tmp_path, old, new)
    assert any(item.rule == "S107" and item.old == "13" and item.new == "14" for item in findings)


@pytest.mark.parametrize("separator", ["\n", "# note\n"])
def test_deletion_hunk_with_blank_or_comment_separator_selects_function(tmp_path, separator):
    old = f"def f(b):\n{separator}    print(b)\n    return 1\n"
    new = "def f(b):\n    return 1\n"
    findings = _findings(tmp_path, old, new)
    assert any(item.rule == "S1172" for item in findings)


def test_nested_def_header_edit_selects_outer_function(tmp_path):
    old = "def outer(a, b):\n    def inner(x=0):\n        return x\n    return a + b\n"
    new = "def outer(a, b):\n    def inner(x=1 if a else (a if b else 0)):\n        return x\n    return a + b\n"
    findings = _findings(tmp_path, old, new)
    assert any(item.qualname == "outer" and item.rule == "S3358" for item in findings)


def _branchy(count):
    body = "    result = 0\n"
    body += "".join(f"    if value > {i}:\n        result += {i}\n" for i in range(count))
    return "def bad(value):\n" + body + "    return result\n"


def test_pure_rename_of_untouched_bad_function_is_not_new(tmp_path):
    root, base = _case(tmp_path, _branchy(16), _branchy(16),
                       base_path="pkg/old.py", head_path="pkg/new.py")
    assert check.check_diff(str(root), base) == []


def test_rename_with_complexity_rise_is_checked_against_old_path(tmp_path):
    root, base = _case(tmp_path, _branchy(16), _branchy(17),
                       base_path="pkg/old.py", head_path="pkg/new.py")
    findings = check.check_diff(str(root), base)
    assert any(item.rule == "S3776" and item.old == "16" and item.new == "17" for item in findings)


def test_ast_loads_ignore_strings_nested_docstrings_and_comments(tmp_path):
    old = 'def f(a, b):\n    return a + b\n'
    new = 'def f(a, b):\n    def inner():\n        """b is documentation, not a read"""\n        return 1\n    # b is a comment, not a read\n    return a\n'
    findings = _findings(tmp_path, old, new)
    assert any(item.rule == "S1172" for item in findings)


def test_global_and_nonlocal_assignments_are_not_unused_locals(tmp_path):
    old = "def f(a):\n    return a\n"
    new = "def f(a):\n    global shared\n    shared = 1\n    shared = 2\n    return a\n"
    assert not [item for item in _findings(tmp_path, old, new) if item.rule == "S1854"]

    old = "def outer():\n    x = 1\n    def f(a):\n        return a\n    return f\n"
    new = "def outer():\n    x = 1\n    def f(a):\n        nonlocal x\n        x = 2\n        return a\n    return f\n"
    assert not [item for item in _findings(tmp_path, old, new) if item.rule == "S1481"]
    nested = check.analyze_module(new)[1]
    loaded, _, _ = check._scan_names(nested.node)
    assert "x" not in loaded


@pytest.mark.parametrize("scope_call", ["locals()", "vars()", "eval('a')", "exec('a = 1')"])
def test_dynamic_scope_calls_skip_unused_name_findings(tmp_path, scope_call):
    old = "def f(a):\n    return a\n"
    new = f"def f(a):\n    {scope_call}\n    return 1\n"
    assert not [item for item in _findings(tmp_path, old, new) if item.rule.startswith("S1")]


def test_per_function_rule_count_ratchet_allows_replacement_and_new_functions_zero(tmp_path):
    old = "def f(a, b):\n    x = a if b else (b if a else 0)\n    return x\n"
    replaced = "def f(a, b):\n    x = 0\n    return a if b else (b if a else 0)\n"
    assert not [item for item in _findings(tmp_path, old, replaced) if item.rule == "S3358"]

    increased = old.replace("    return x\n", "    y = a if b else (b if a else 0)\n    return x + y\n")
    assert any(item.rule == "S3358" for item in _findings(tmp_path, old, increased))

    with_new_clean_function = old + "\ndef added(value):\n    return value\n"
    assert not _findings(tmp_path, old, with_new_clean_function)

    new_function_with_finding = old + "\ndef added(a, b):\n    return a if b else (b if a else 0)\n"
    assert any(item.qualname == "added" and item.rule == "S3358"
               for item in _findings(tmp_path, old, new_function_with_finding))
