"""Behavior tests for scripts/quality/changed-functions-check (changed-function ratchet).

Each test builds a real temporary git repository (branch `main`, then a `feature` branch),
runs the checker by absolute path with cwd in that repository, and asserts on exit code and on
PARSED finding fields (`path:line qualname rule old->new`). Thresholds are Sonar's: cognitive
complexity <= 15 (S3776), parameters <= 13 (S107), no nested conditional expression (S3358),
no unused parameter/local/dead store (S1172/S1481/S1854).
Ratchet: NEW function must pass; MODIFIED function may not worsen Q1/Q3 nor add a Q2/Q4
finding; untouched functions are never checked. "Modified" = an added or modified BODY line
(a signature-only edit does not select the function).

Isolation: git and the checker run with a scrubbed environment (no inherited GIT_*, XDG_*,
config overrides), a private HOME outside the repository, no templates/hooks, bounded timeouts.
Standard library + pytest only; no network, no installs. Python 3.12 and 3.13.

Deliberately NOT asserted (unresolved against the pinned Sonar baseline, see the hand-off
report): scoping of test files (`test_*.py`, `conftest.py`), scoping of extensionless
shebang scripts, a standalone Q1 report for a nested function (Sonar S3776 reports the
outermost function only), and old/new value syntax for Q2/Q4 findings.
"""
import ast
import os
import re
import subprocess
import sys
from pathlib import Path

import pytest

REPO_ROOT = Path(__file__).resolve().parents[2]
CHECKER = REPO_ROOT / "scripts" / "quality" / "changed-functions-check"

# rule number -> accepted ids (local id or the Sonar rule it mirrors)
RULES = {
    1: {"Q1", "S3776", "python:S3776"},
    2: {"Q2", "S3358", "python:S3358"},
    3: {"Q3", "S107", "python:S107"},
    4: {"Q4", "S1172", "S1481", "S1854", "python:S1172", "python:S1481", "python:S1854"},
}
FINDING_RE = re.compile(
    r"^(?P<path>[^:\n]+):(?P<line>\d+) (?P<qual>\S+) (?P<rule>\S+) (?P<old>\S*)->(?P<new>\S*)$")
GIT_TIMEOUT = 60
CHECK_TIMEOUT = 120


def clean_env(home: Path) -> dict:
    """Environment with nothing inherited that can redirect git, python or locale behavior."""
    env = {
        "PATH": os.environ.get("PATH", "/usr/bin:/bin"),
        "HOME": str(home),
        "LC_ALL": "C",
        "GIT_CONFIG_NOSYSTEM": "1",
        "GIT_CONFIG_GLOBAL": os.devnull,
        "GIT_CONFIG_SYSTEM": os.devnull,
        "GIT_TERMINAL_PROMPT": "0",
        "GIT_AUTHOR_NAME": "t", "GIT_AUTHOR_EMAIL": "t@example.invalid",
        "GIT_COMMITTER_NAME": "t", "GIT_COMMITTER_EMAIL": "t@example.invalid",
        "PYTHONDONTWRITEBYTECODE": "1",
    }
    return env


class Finding:
    def __init__(self, raw, m):
        self.raw = raw
        self.path = m["path"]
        self.line = int(m["line"])
        self.qual = m["qual"]
        self.rule = m["rule"]
        self.old = m["old"]
        self.new = m["new"]

    def number(self):
        for n, ids in RULES.items():
            if self.rule in ids:
                return n
        pytest.fail(f"unknown rule id in finding: {self.raw!r}")

    def __repr__(self):
        return self.raw


def parse_findings(stdout):
    """Every non-empty stdout line must be one well-formed finding."""
    out = []
    for ln in stdout.splitlines():
        if not ln.strip():
            continue
        m = FINDING_RE.match(ln)
        assert m, f"stdout line is not `path:line qualname rule old->new`: {ln!r}"
        out.append(Finding(ln, m))
    return out


def func_span(src, qual):
    """(first, last) line of the function with qualified name `qual` in `src`."""
    def walk(node, prefix):
        for ch in ast.iter_child_nodes(node):
            if isinstance(ch, (ast.FunctionDef, ast.AsyncFunctionDef)):
                q = prefix + ch.name
                if q == qual:
                    return ch.lineno, ch.end_lineno
                hit = walk(ch, q + ".<locals>.")
                if hit:
                    return hit
            elif isinstance(ch, ast.ClassDef):
                hit = walk(ch, prefix + ch.name + ".")
                if hit:
                    return hit
            else:
                hit = walk(ch, prefix)
                if hit:
                    return hit
        return None

    span = walk(ast.parse(src), "")
    assert span, f"test bug: {qual} not in source"
    return span


# ---------- real-git fixture ----------

class Repo:
    def __init__(self, root: Path, home: Path):
        root.mkdir(parents=True, exist_ok=True)
        home.mkdir(parents=True, exist_ok=True)
        self.root = root
        self.env = clean_env(home)
        self.sources = {}  # path -> latest committed text (for line-span assertions)
        self.git("init", "-q", "-b", "main", "--template=")
        self.git("config", "commit.gpgsign", "false")
        self.git("config", "core.hooksPath", os.devnull)
        self.write_properties(
            "sonar.sources=.,tests,scripts/fleet/test\n"
            "sonar.tests=tests,scripts/fleet/test\n"
            "sonar.exclusions=scripts/opencode_workbench/fixtures/**\n"
            "sonar.test.inclusions=tests/**,scripts/fleet/test/**\n"
            "sonar.test.exclusions=**/fixtures/**\n"
        )
        self.git("add", "--", ".sonar/local.properties")
        self.git("commit", "-q", "-m", "test Sonar scope")

    def write_properties(self, text):
        properties = self.root / ".sonar" / "local.properties"
        properties.parent.mkdir(parents=True, exist_ok=True)
        properties.write_text(text)

    def git(self, *args, check=True):
        return subprocess.run(["git", *args], cwd=self.root, env=self.env, check=check,
                              capture_output=True, text=True, timeout=GIT_TIMEOUT)

    def write(self, rel, text):
        p = self.root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_text(text)
        self.sources[rel] = text

    def write_bytes(self, rel, data, text):
        """Write raw bytes (e.g. a UTF-8 BOM); `text` is the decoded source kept for spans."""
        p = self.root / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data)
        self.sources[rel] = text

    def commit(self, msg, *paths):
        for p in paths:
            self.git("add", "--", p)
        if (self.root / ".sonar" / "local.properties").exists():
            self.git("add", "--", ".sonar/local.properties")
        self.git("commit", "-q", "-m", msg)

    def run(self, *args):
        # A missing checker must fail loudly: python itself would exit 2 for a missing script.
        assert CHECKER.is_file(), f"checker not present: {CHECKER}"
        res = subprocess.run([sys.executable, str(CHECKER), *args], cwd=self.root, env=self.env,
                             capture_output=True, text=True, timeout=CHECK_TIMEOUT)
        return res

    def check(self, base="main"):
        """Return (exit code, parsed findings, raw result). Findings parse only on exit 1."""
        res = self.run("--base", base)
        findings = parse_findings(res.stdout) if res.returncode == 1 else []
        return res.returncode, findings, res


@pytest.fixture
def repo(tmp_path):
    return Repo(tmp_path / "work" / "repo", tmp_path / "home")


def branchy(name, n, *, kw="def", params="a", pad="    ", init=0):
    """Function with cognitive complexity exactly n: n sequential flat `if`s; no Q2/Q3/Q4."""
    var = params.split(",")[-1].strip("* ")
    body = "".join(f"{pad}if {var} > {i}:\n{pad}    r += {i}\n" for i in range(n))
    return f"{kw} {name}({params}):\n{pad}r = {init}\n{body}{pad}return r\n"


def in_class(cls, body_src, decorator=None):
    lines = body_src.splitlines()
    if decorator:
        lines = [decorator] + lines
    return f"class {cls}:\n" + "".join("    " + ln + "\n" for ln in lines)


def scenario(repo, base_src, head_src, path="pkg/mod.py"):
    """base_src committed on main; head_src committed on branch `feature` (a real diff)."""
    assert base_src != head_src, "test bug: scenario needs a real change"
    repo.write(path, base_src)
    repo.commit("base", path)
    repo.git("checkout", "-q", "-b", "feature")
    repo.write(path, head_src)
    repo.commit("head", path)


def assert_clean(repo, base="main"):
    code, findings, res = repo.check(base)
    assert code == 0, (res.stdout, res.stderr)
    assert not [ln for ln in res.stdout.splitlines() if FINDING_RE.match(ln)]


def assert_finding(repo, findings, qual, rule, *, path="pkg/mod.py", old=None, new=None):
    """A finding on the same line of output has ALL of: path, qualname, rule, location in the
    function's head-file span and (when given) exact old/new values."""
    first, last = func_span(repo.sources[path], qual) if path in repo.sources else (1, 10**9)
    hits = [f for f in findings if f.path == path and f.qual == qual and f.number() == rule
            and first <= f.line <= last
            and (old is None or f.old == str(old)) and (new is None or f.new == str(new))]
    assert hits, f"no finding path={path} qual={qual} rule={rule} old={old} new={new} " \
                 f"span=({first},{last}) in {findings}"
    return hits


def assert_no_finding(findings, qual):
    assert not [f for f in findings if f.qual == qual], (qual, findings)


def assert_fail_only(repo, quals_allowed):
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert {f.qual for f in findings} <= set(quals_allowed), findings
    return findings


# ---------- Q1: cognitive complexity ----------

def test_new_function_over_threshold_fails(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("bad", 16))
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "bad", 1, new=16)
    assert len(findings) == 1


def test_new_function_at_threshold_passes(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("ok", 15))
    assert_clean(repo)


def test_modified_equal_complexity_passes_even_when_over_threshold(repo):
    base = branchy("legacy", 20)
    scenario(repo, base, branchy("legacy", 20, init=1))  # body line modified, same score
    assert_clean(repo)


def test_modified_improved_complexity_with_added_body_line_passes(repo):
    # 20 -> 18 AND a body line is modified (`r = 1`): the modified-function improvement path.
    scenario(repo, branchy("legacy", 20), branchy("legacy", 18, init=1))
    assert_clean(repo)


def test_modified_improved_complexity_below_threshold_with_added_line_passes(repo):
    head = branchy("legacy", 3, init=1).replace("    return r\n", "    r += 1\n    return r\n")
    scenario(repo, branchy("legacy", 10), head)
    assert_clean(repo)


def test_modified_worse_complexity_fails_with_old_to_new(repo):
    scenario(repo, branchy("legacy", 15), branchy("legacy", 16))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "legacy", 1, old=15, new=16)


def test_modified_already_bad_and_worse_fails(repo):
    scenario(repo, branchy("legacy", 20), branchy("legacy", 21))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "legacy", 1, old=20, new=21)


def test_modified_worse_entirely_below_threshold_fails(repo):
    # 4 -> 5 never crosses 15: a ratchet on the absolute threshold alone would stay silent.
    scenario(repo, branchy("small", 4), branchy("small", 5))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "small", 1, old=4, new=5)


def test_untouched_bad_function_is_never_checked(repo):
    base = branchy("bad", 30) + "\n\nCONST = 1\n"
    scenario(repo, base, base.replace("CONST = 1", "CONST = 2"))
    assert_clean(repo)


def test_body_line_selection_flags_only_the_edited_function(repo):
    base = branchy("first", 16) + "\n\n" + branchy("second", 16) + "\n\n" + branchy("third", 16)
    head = base.replace("r = 0", "r = 1", 2)  # edits first() and second() bodies, neutral
    scenario(repo, base, head)
    assert_clean(repo)
    worse = head.replace(branchy("second", 16, init=1), branchy("second", 17, init=1))
    assert worse != head
    repo.write("pkg/mod.py", worse)
    repo.commit("worse second", "pkg/mod.py")
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "second", 1, old=16, new=17)
    assert {f.qual for f in findings} == {"second"}


def test_change_outside_function_body_does_not_select_neighbor(repo):
    scenario(repo, "# header\n" + branchy("bad", 20), "# header changed\n" + branchy("bad", 20))
    assert_clean(repo)


def test_deleting_adjacent_top_level_line_does_not_select_function(repo):
    scenario(repo, "def f(b):\n    return 1\ncallback = f\n",
             "def f(b):\n    return 1\n")
    assert_clean(repo)


def test_deleting_body_line_without_additions_does_not_select_function(repo):
    scenario(repo, "def f(b):\n    print(b)\n    return 1\n",
             "def f(b):\n    return 1\n")
    assert_clean(repo)


def test_decorator_only_change_does_not_select_method(repo):
    base = method_with_params(13, decorator="@classmethod", first="cls")
    scenario(repo, base, base.replace("@classmethod", "@staticmethod"))
    assert_clean(repo)


def test_signature_only_change_does_not_select_function(repo):
    # Only the `def` line changes (extra param unused): not an added/modified BODY line.
    scenario(repo, "def f(a):\n    return a\n", "def f(a, extra):\n    return a\n")
    assert_clean(repo)


def test_signature_only_param_growth_beyond_limit_is_not_checked(repo):
    p14 = ", ".join(f"p{i}" for i in range(14))
    p15 = ", ".join(f"p{i}" for i in range(15))
    body = "    return " + " + ".join(f"p{i}" for i in range(14)) + "\n"
    scenario(repo, f"def many({p14}):\n{body}", f"def many({p15}):\n{body}")
    assert_clean(repo)


def test_ratchet_compares_against_merge_base_when_base_tip_is_higher(repo):
    repo.write("pkg/mod.py", branchy("f", 16) + "\n\nOTHER = 1\n")
    repo.commit("base", "pkg/mod.py")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write("pkg/mod.py", branchy("f", 17) + "\n\nOTHER = 1\n")  # feature: 16 -> 17
    repo.commit("feature worsens f", "pkg/mod.py")
    repo.git("checkout", "-q", "main")
    repo.write("pkg/mod.py", branchy("f", 40) + "\n\nOTHER = 1\n")  # main tip: 40
    repo.commit("main rewrites f", "pkg/mod.py")
    repo.git("checkout", "-q", "feature")
    repo.write("pkg/mod.py", branchy("f", 17) + "\n\nOTHER = 1\n")  # keep head view in sources
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "f", 1, old=16, new=17)


def test_ratchet_compares_against_merge_base_when_base_tip_is_lower(repo):
    repo.write("pkg/mod.py", branchy("f", 16) + "\n\nOTHER = 1\n")
    repo.commit("base", "pkg/mod.py")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write("pkg/mod.py", branchy("f", 16, init=1) + "\n\nOTHER = 1\n")  # equal to merge-base
    repo.commit("feature neutral edit", "pkg/mod.py")
    repo.git("checkout", "-q", "main")
    repo.write("pkg/mod.py", branchy("f", 5) + "\n\nOTHER = 1\n")  # main tip: 5
    repo.commit("main simplifies f", "pkg/mod.py")
    repo.git("checkout", "-q", "feature")
    assert_clean(repo)


# ---------- identity: rename / new file / nesting / kinds ----------

def test_renamed_function_is_new_and_checked_from_scratch(repo):
    scenario(repo, branchy("old_name", 20), branchy("new_name", 20, init=1))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "new_name", 1, new=20)
    assert_no_finding(findings, "old_name")


def test_function_copied_into_new_file_is_new(repo):
    repo.write("pkg/mod.py", branchy("bad", 20))
    repo.commit("base", "pkg/mod.py")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write("pkg/other.py", branchy("bad", 20))
    repo.commit("copy into new module", "pkg/other.py")
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "bad", 1, path="pkg/other.py", new=20)
    assert not [f for f in findings if f.path == "pkg/mod.py"]


def test_new_function_in_quoted_non_ascii_git_path_is_checked(repo):
    path = "pkg/café.py"
    repo.write("anchor.py", "X = 1\n")
    repo.commit("base", "anchor.py")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write(path, many_params_fn(14))
    repo.commit("add non-ascii path", path)
    diff = repo.git("-c", "core.quotePath=true", "diff", "main...HEAD", "--", path).stdout
    assert '+++ "b/pkg/caf\\303\\251.py"' in diff
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "many", 3, path=path, new=14)


def test_class_method_uses_qualified_name(repo):
    src = in_class("Klass", branchy("method", 16, params="self, a", pad="    "))
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + src)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "Klass.method", 1, new=16)
    assert_no_finding(findings, "method")


def test_same_method_name_first_class_changed_uses_its_own_baseline(repo):
    def cls(name, n, init=0):
        return in_class(name, branchy("run", n, params="self, a", pad="    ", init=init))
    # A.run (first, baseline 3) worsens to 17; B.run (last, baseline 20) untouched.
    base = cls("A", 3) + "\n\n" + cls("B", 20)
    head = cls("A", 17, init=1) + "\n\n" + cls("B", 20)
    scenario(repo, base, head)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "A.run", 1, old=3, new=17)
    assert_no_finding(findings, "B.run")


def test_module_function_and_method_with_same_name_are_distinct(repo):
    def cls(n, init=0):
        return in_class("A", branchy("run", n, params="self, a", pad="    ", init=init))
    base = branchy("run", 20) + "\n\n" + cls(3)
    head = branchy("run", 20) + "\n\n" + cls(17, init=1)
    scenario(repo, base, head)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "A.run", 1, old=3, new=17)
    assert_no_finding(findings, "run")


def _outer_with_inner(outer, inner_src):
    inner = "".join("    " + ln + "\n" for ln in inner_src.splitlines())
    return f"def {outer}(a, b):\n{inner}    return inner(a, b)\n"


def test_new_nested_function_with_nested_ternary_reports_qualified_name(repo):
    src = _outer_with_inner("outer", "def inner(x, y):\n    return x if y else (y if x else 0)")
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + src)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "outer.<locals>.inner", 2)


def test_new_nested_function_complexity_is_scored_for_the_outer_function(repo):
    # Sonar S3776 reports the outermost function; accept either qualified identity.
    src = _outer_with_inner("outer", branchy("inner", 16, params="x, y"))
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + src)
    code, findings, _ = repo.check()
    assert code == 1
    assert {f.qual for f in findings if f.number() == 1} & {"outer", "outer.<locals>.inner"}


def test_modified_nested_function_gaining_nested_ternary_fails_with_own_identity(repo):
    flat = "def inner(x, y):\n    return x if y else 0"
    nested = "def inner(x, y):\n    return x if y else (y if x else 0)"
    base = _outer_with_inner("a", nested) + "\n\n" + _outer_with_inner("b", flat)
    head = _outer_with_inner("a", nested) + "\n\n" + _outer_with_inner("b", nested)
    scenario(repo, base, head)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "b.<locals>.inner", 2)
    assert_no_finding(findings, "a.<locals>.inner")
    assert_no_finding(findings, "a")


def test_modified_nested_function_keeping_preexisting_finding_passes(repo):
    # `a.<locals>.inner` (FIRST of two same-named nested functions) already has a nested
    # ternary; `b.<locals>.inner` (last) has none. An unqualified last-wins baseline index
    # would compare a's inner against b's and invent a new finding.
    nested = "def inner(x, y):\n    k = 0\n    return x if y else (y if x else k)"
    flat = "def inner(x, y):\n    return x if y else 0"
    base = _outer_with_inner("a", nested) + "\n\n" + _outer_with_inner("b", flat)
    head = base.replace("k = 0", "k = 1")
    scenario(repo, base, head)
    assert_clean(repo)


def test_async_function_is_checked(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("fetch", 16, kw="async def"))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "fetch", 1, new=16)


def test_modified_async_function_equal_passes_then_worse_fails(repo):
    scenario(repo, branchy("fetch", 16, kw="async def"),
             branchy("fetch", 16, kw="async def", init=1))
    assert_clean(repo)
    repo.write("pkg/mod.py", branchy("fetch", 17, kw="async def", init=1))
    repo.commit("worse", "pkg/mod.py")
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "fetch", 1, old=16, new=17)


def _with_lambda(n_ifs, lam):
    return ("def f(items):\n    r = 0\n"
            + "".join(f"    if items > {i}:\n        r += {i}\n" for i in range(n_ifs))
            + f"    return r, sorted(items, key={lam})\n")


def test_plain_lambda_adds_no_complexity(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + _with_lambda(15, "lambda p: p[0]"))
    assert_clean(repo)


def test_lambda_conditional_scores_one_without_nesting_boundary_pass(repo):
    # 14 flat ifs = 14; lambda conditional = +1 (no nesting penalty) => exactly 15.
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + _with_lambda(14, "lambda p: p[0] if p else 0"))
    assert_clean(repo)


def test_lambda_conditional_counts_toward_enclosing_function_boundary_fail(repo):
    # 15 flat ifs = 15; lambda conditional = +1 => exactly 16, attributed to the enclosing f.
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + _with_lambda(15, "lambda p: p[0] if p else 0"))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "f", 1, new=16)
    assert len(findings) == 1


# ---------- Q2: nested conditional expression ----------

NESTED_TERNARY = "def pick(a, b):\n    return a if b else (2 if a else 3)\n"
FLAT_TERNARY = "def pick(a, b):\n    return a if b else 2\n"


def test_new_function_with_nested_ternary_fails(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + NESTED_TERNARY)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "pick", 2)
    assert {f.number() for f in findings} == {2}  # positive control: no Q1/Q3/Q4 noise


def test_new_function_with_flat_ternary_passes(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + FLAT_TERNARY)
    assert_clean(repo)


def test_modified_function_gaining_nested_ternary_fails(repo):
    scenario(repo, FLAT_TERNARY, NESTED_TERNARY)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "pick", 2)


def test_modified_function_keeping_existing_nested_ternary_passes(repo):
    base = "def pick(a, b):\n    k = 0\n    return k if b else (a if k else 3)\n"
    scenario(repo, base, base.replace("k = 0", "k = 1"))
    assert_clean(repo)


def test_modified_function_adding_second_nested_ternary_fails(repo):
    base = "def pick(a, b):\n    return a if b else (2 if a else 3)\n"
    head = ("def pick(a, b):\n    x = a if b else (2 if a else 3)\n"
            "    return x if a else (x if b else 0)\n")
    scenario(repo, base, head)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "pick", 2)


def test_modified_function_replacing_nested_ternary_with_another_fails(repo):
    # Same count (1 -> 1), but the finding moved to a different expression: it is a NEW finding.
    base = ("def pick(a, b):\n    x = a if b else (2 if a else 3)\n"
            "    y = a if b else 0\n    return x + y\n")
    head = ("def pick(a, b):\n    x = a if b else 2\n"
            "    y = a if b else (b if a else 0)\n    return x + y\n")
    scenario(repo, base, head)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "pick", 2)


def test_modified_function_retained_nested_ternary_shifted_by_unrelated_edit_passes(repo):
    base = "def pick(a, b):\n    k = 0\n    return k if b else (a if k else 3)\n"
    head = ("def pick(a, b):\n    # note one\n    # note two\n    k = 1\n"
            "    return k if b else (a if k else 3)\n")
    scenario(repo, base, head)
    assert_clean(repo)


def test_modified_function_removing_nested_ternary_with_added_body_line_passes(repo):
    head = ("def pick(a, b):\n    note = 1\n    return a if b else note\n")
    scenario(repo, NESTED_TERNARY, head)
    assert_clean(repo)


# ---------- Q3: parameter count ----------

def params(n):
    return ", ".join(f"p{i}" for i in range(n))


def many_params_fn(n, name="many", init=0):
    uses = " + ".join(f"p{i}" for i in range(n))
    return f"def {name}({params(n)}):\n    k = {init}\n    return k + {uses}\n"


def method_with_params(n, *, decorator=None, first="self", init=0):
    uses = " + ".join(f"p{i}" for i in range(n))
    plist = ", ".join(([first] if first else []) + [f"p{i}" for i in range(n)])
    src = f"def run({plist}):\n    k = {init}\n    return k + {uses}\n"
    return in_class("K", src, decorator=decorator)


def test_new_function_with_13_params_passes(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + many_params_fn(13))
    assert_clean(repo)


def test_new_function_with_14_params_fails(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + many_params_fn(14))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "many", 3, new=14)


def test_modified_function_param_count_not_raised_passes(repo):
    scenario(repo, many_params_fn(14), many_params_fn(14, init=1))
    assert_clean(repo)


def test_modified_function_param_count_raised_fails(repo):
    scenario(repo, many_params_fn(14), many_params_fn(15))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "many", 3, old=14, new=15)


def test_modified_function_param_count_raised_below_threshold_fails(repo):
    scenario(repo, many_params_fn(12), many_params_fn(13))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "many", 3, old=12, new=13)


def test_modified_function_param_count_reduced_with_body_edit_passes(repo):
    scenario(repo, many_params_fn(16), many_params_fn(15, init=1))
    assert_clean(repo)


def test_method_self_is_not_counted_13_explicit_passes(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + method_with_params(13))
    assert_clean(repo)


def test_method_14_explicit_params_fails_with_implicit_self_excluded(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + method_with_params(14))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "K.run", 3, new=14)


@pytest.mark.parametrize("explicit, expected_code", [(13, 0), (14, 1)])
def test_method_in_class_conditional_excludes_implicit_receiver(repo, explicit, expected_code):
    method = many_params_fn(explicit, name="run").replace("def run(", "def run(self, ", 1)
    method = method.replace("return k + ", "return bool(self) + k + ")
    src = "class K:\n    if True:\n" + "".join("        " + line + "\n"
                                                  for line in method.splitlines())
    scenario(repo, "X = 1\n", "X = 1\n\n" + src)
    code, findings, res = repo.check()
    assert code == expected_code, (res.stdout, res.stderr)
    if expected_code:
        assert_finding(repo, findings, "K.run", 3, new=14)
    else:
        assert not res.stdout.strip()


def test_classmethod_cls_is_not_counted(repo):
    scenario(repo, "X = 1\n",
             "X = 1\n\n\n" + method_with_params(13, decorator="@classmethod", first="cls"))
    assert_clean(repo)


def test_staticmethod_keeps_all_parameters(repo):
    scenario(repo, "X = 1\n",
             "X = 1\n\n\n" + method_with_params(14, decorator="@staticmethod", first=None))
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "K.run", 3, new=14)


def test_staticmethod_with_13_params_passes(repo):
    scenario(repo, "X = 1\n",
             "X = 1\n\n\n" + method_with_params(13, decorator="@staticmethod", first=None))
    assert_clean(repo)


MIXED_BODY = "    return a + b + c + d + e + f + len(args) + len(kw)"


def _mixed(n_kwonly):
    kwonly = [f"k{i}" for i in range(n_kwonly)]
    uses = " + ".join(kwonly)
    sig = "a, b, c, d, e, f, *args" + "".join(f", {k}" for k in kwonly) + ", **kw"
    tail = f" + {uses}" if uses else ""
    return f"def mixed({sig}):\n{MIXED_BODY}{tail}\n"


def test_mixed_signature_over_limit_counts_keyword_only_parameters(repo):
    # 6 positional + *args + 8 keyword-only + **kw: 14 without the star forms, 16 with them.
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + _mixed(8))
    code, findings, _ = repo.check()
    assert code == 1
    hits = assert_finding(repo, findings, "mixed", 3)
    assert all(f.new in {"14", "16"} for f in hits), hits


def test_mixed_signature_within_limit_passes(repo):
    # 6 positional + *args + 5 keyword-only + **kw: 11 without the star forms, 13 with them.
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + _mixed(5))
    assert_clean(repo)


# ---------- Q4: unused parameter / local / dead store ----------

def test_new_function_with_unused_parameter_fails(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\ndef f(a, b):\n    return a\n")
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "f", 4)


def test_new_function_with_unused_local_fails(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\ndef f(a):\n    unused = a + 1\n    return a\n")
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "f", 4)


def test_new_function_with_dead_store_fails(repo):
    scenario(repo, "X = 1\n",
             "X = 1\n\n\ndef f(a):\n    v = a + 1\n    v = a + 2\n    return v\n")
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "f", 4)


def test_raising_reassignment_caught_by_handler_is_not_dead_store(repo):
    src = ("def f():\n    try:\n        x = 1\n        x = 1 / 0\n"
           "    except ZeroDivisionError:\n        return x\n    return x\n")
    scenario(repo, "X = 1\n", "X = 1\n\n" + src)
    assert_clean(repo)


@pytest.mark.parametrize(("src", "rule"), [
    ("def f(a, b):\n    return a\n", "S1172"),
    ("def f(a):\n    unused = a + 1\n    return a\n", "S1481"),
    ("def f(a):\n    v = a + 1\n    v = a + 2\n    return v\n", "S1854"),
])
def test_q4_finding_uses_exact_rule_id_token(repo, src, rule):
    scenario(repo, "X = 1\n", "X = 1\n\n" + src)
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert len(findings) == 1, findings
    assert findings[0].rule == rule
    assert findings[0].qual == "f"


def test_new_function_all_names_used_passes(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\ndef f(a, b):\n    c = a + b\n    return c\n")
    assert_clean(repo)


def test_modified_function_with_preexisting_unused_param_passes(repo):
    base = "def f(a, b):\n    k = 0\n    return a + k\n"
    scenario(repo, base, base.replace("k = 0", "k = 1"))
    assert_clean(repo)


def test_modified_function_gaining_unused_local_fails(repo):
    scenario(repo, "def f(a):\n    return a\n",
             "def f(a):\n    leftover = a * 2\n    return a\n")
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "f", 4)


def test_modified_function_body_edit_leaving_param_unused_fails(repo):
    # Signature unchanged; the body edit stops reading `b` => a NEW unused-parameter finding.
    scenario(repo, "def f(a, b):\n    return a + b\n", "def f(a, b):\n    return a\n")
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "f", 4)


def test_modified_function_using_previously_unused_param_passes(repo):
    scenario(repo, "def f(a, b):\n    return a\n", "def f(a, b):\n    return a + b\n")
    assert_clean(repo)


def test_modified_function_replacing_unused_param_with_another_fails(repo):
    # Same count (1 -> 1): `b` becomes used, `a` becomes unused => a different, new finding.
    scenario(repo, "def f(a, b):\n    return a\n", "def f(a, b):\n    return b\n")
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "f", 4)


def test_modified_function_retained_unused_param_shifted_by_unrelated_edit_passes(repo):
    base = "def f(a, b):\n    k = 0\n    return a + k\n"
    head = "def f(a, b):\n    # note one\n    # note two\n    k = 1\n    return a + k\n"
    scenario(repo, base, head)
    assert_clean(repo)


# ---------- scope ----------

def test_tracked_ignored_source_is_excluded_but_unignored_source_is_checked(repo):
    ignored = "pkg/lib/bad.py"
    repo.write(".gitignore", "lib/\n")
    repo.write(ignored, "X = 1\n")
    repo.git("add", "-f", "--", ignored)
    repo.commit("base", ".gitignore")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write(ignored, branchy("bad", 16))
    repo.write("pkg/good.py", branchy("bad", 16))
    repo.commit("head", ignored, "pkg/good.py")
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert [(f.path, f.rule) for f in findings] == [("pkg/good.py", "S3776")]


def test_ignore_rules_are_evaluated_at_each_revision(repo):
    path = "pkg/mod.py"
    repo.write(".gitignore", "pkg/\n")
    repo.write(path, branchy("bad", 20))
    repo.git("add", "-f", "--", path)
    repo.commit("base", ".gitignore")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write(".gitignore", "")
    repo.write(path, branchy("bad", 20, init=1))
    repo.commit("head", ".gitignore", path)
    # Working tree rules must not override either committed revision.
    repo.write(".gitignore", "pkg/\n")
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "bad", 1, old=0, new=20)


def test_scm_exclusion_can_be_disabled(repo):
    repo.write_properties("sonar.sources=.\nsonar.scm.exclusions.disabled=true\n")
    repo.write(".gitignore", "lib/\n")
    repo.write("pkg/lib/mod.py", "X = 1\n")
    repo.git("add", "-f", "--", "pkg/lib/mod.py")
    repo.commit("base", ".gitignore")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write("pkg/lib/mod.py", branchy("bad", 16))
    repo.commit("head", "pkg/lib/mod.py")
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "bad", 1, path="pkg/lib/mod.py", new=16)


def test_sonar_scope_is_compared_at_base_and_head(repo):
    repo.write_properties("sonar.sources=other\n")
    repo.write("pkg/mod.py", branchy("bad", 20))
    repo.commit("base", "pkg/mod.py")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write_properties("sonar.sources=pkg\n")
    repo.write("pkg/mod.py", branchy("bad", 20, init=1))
    repo.commit("head", "pkg/mod.py")
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "bad", 1, old=0, new=20)


def test_nosonar_suppresses_declaration_issue_only(repo):
    src = branchy("suppressed", 16).replace("def suppressed(a):", "def suppressed(a):  # NOSONAR")
    src += "\n" + branchy("normal", 16).replace("    r = 0", "    r = 0  # NOSONAR")
    scenario(repo, "X = 1\n", src)
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "normal", 1, new=16)
    assert_no_finding(findings, "suppressed")


def test_nosonar_string_and_other_comments_are_not_suppressions(repo):
    src = branchy("bad", 16).replace("    r = 0", '    r = 0  # not suppressed\n    text = "NOSONAR"\n    print(text)')
    scenario(repo, "X = 1\n", src)
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "bad", 1, new=16)


def test_removing_nosonar_uses_new_issue_threshold(repo):
    base = branchy("bad", 20).replace("def bad(a):", "def bad(a):  # NOSONAR")
    scenario(repo, base, branchy("bad", 20, init=1))
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "bad", 1, old=0, new=20)


def test_nosonar_only_suppresses_findings_on_their_own_lines(repo):
    src = ("def f(a, b):  # NOSONAR\n"
           "    unused = a + 1  # NOSONAR\n"
           "    other = a + 2\n"
           "    return a if b else (\n"
           "        b if a else 0  # NOSONAR\n"
           "    )\n")
    scenario(repo, "X = 1\n", src)
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert [(f.rule, f.qual) for f in findings] == [("S1481", "f")]


def test_sonar_excluded_directory_is_not_checked(repo):
    path = "scripts/opencode_workbench/fixtures/sample.py"
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("bad", 30), path=path)
    assert_clean(repo)


def test_test_fixtures_directory_is_excluded(repo):
    # sonar.test.exclusions=**/fixtures/** applies below a test directory.
    path = "scripts/fleet/test/fixtures/changed_functions/sample.py"
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("bad", 30), path=path)
    assert_clean(repo)


def test_fixtures_directory_outside_test_scope_is_still_checked(repo):
    # `fixtures` alone is not a source exclusion; only test files under it are excluded.
    path = "pkg/fixtures/mod.py"
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("bad", 30), path=path)
    code, findings, _ = repo.check()
    assert code == 1
    assert_finding(repo, findings, "bad", 1, path=path, new=30)


def test_scope_uses_sources_tests_inclusions_and_exclusions(repo):
    repo.write_properties(
        "sonar.sources=src,tests\n"
        "sonar.tests=tests\n"
        "sonar.exclusions=src/excluded/**\n"
        "sonar.test.inclusions=tests/**\n"
        "sonar.test.exclusions=tests/fixtures/**\n"
    )
    repo.write("src/baseline.py", "X = 1\n")
    repo.commit("base", "src/baseline.py")
    repo.git("checkout", "-q", "-b", "feature")
    paths = (
        "src/new_bad.py",
        "src/excluded/bad.py",
        "tests/test_bad.py",
        "tests/fixtures/bad.py",
        "outside/bad.py",
    )
    for path in paths:
        repo.write(path, branchy("bad", 16))
    repo.commit("head", *paths)

    code, findings, res = repo.check()

    assert code == 1, (res.stdout, res.stderr)
    assert [(f.path, f.qual, f.number(), f.new) for f in findings] == [
        ("src/new_bad.py", "bad", 1, "16")
    ]


def test_missing_local_properties_exits_two(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("bad", 16))
    (repo.root / ".sonar" / "local.properties").unlink()

    res = repo.run("--base", "main")

    assert res.returncode == 2
    assert "local.properties" in res.stderr


def test_missing_sonar_sources_property_exits_two(repo):
    repo.write_properties(
        "sonar.tests=tests\n"
        "sonar.exclusions=\n"
        "sonar.test.inclusions=tests/**\n"
        "sonar.test.exclusions=\n"
    )
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("bad", 16))

    res = repo.run("--base", "main")

    assert res.returncode == 2
    assert "sonar.sources" in res.stderr


def test_valid_python_text_in_non_python_file_is_ignored(repo):
    # Parseable Python in a .txt file with no shebang: a checker that scans every suffix and
    # silently skips parse errors would flag it; an invalid-syntax fixture could not tell.
    scenario(repo, "x\n", branchy("bad", 30), path="notes/run.txt")
    assert_clean(repo)


def test_non_python_file_with_invalid_syntax_is_ignored(repo):
    scenario(repo, "echo 1\n", "echo 1\nif [ -n \"$a\" ]; then echo 2; fi\n", path="notes/run.sh")
    assert_clean(repo)


def test_no_changes_against_base_is_clean(repo):
    repo.write("pkg/mod.py", branchy("bad", 30))
    repo.commit("base", "pkg/mod.py")
    repo.git("checkout", "-q", "-b", "feature")
    assert_clean(repo)


# ---------- output format and exit codes ----------

def test_finding_line_format_and_multiple_findings(repo):
    src = "X = 1\n\n\n" + branchy("bad", 16) + "\n\n" + NESTED_TERNARY
    scenario(repo, "X = 1\n", src)
    code, findings, res = repo.check()
    assert code == 1
    assert_finding(repo, findings, "bad", 1, new=16)
    assert_finding(repo, findings, "pick", 2)
    assert {f.qual for f in findings} == {"bad", "pick"}
    assert all(f.path == "pkg/mod.py" for f in findings)


def test_clean_run_prints_no_finding_lines(repo):
    scenario(repo, "X = 1\n", "X = 2\n")
    code, findings, res = repo.check()
    assert code == 0 and findings == []


def test_invalid_base_exits_2_never_silently_zero(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("bad", 30))
    res = repo.run("--base", "no-such-revision")
    assert res.returncode == 2, (res.stdout, res.stderr)
    assert not [ln for ln in res.stdout.splitlines() if FINDING_RE.match(ln)]
    assert res.stderr.strip() != "" or res.stdout.strip() != ""


def test_outside_git_repository_exits_2(tmp_path):
    assert CHECKER.is_file(), f"checker not present: {CHECKER}"
    plain = tmp_path / "plain"
    plain.mkdir()
    env = clean_env(tmp_path / "home")
    env["GIT_CEILING_DIRECTORIES"] = str(tmp_path)
    res = subprocess.run([sys.executable, str(CHECKER), "--base", "main"], cwd=plain, env=env,
                         capture_output=True, text=True, timeout=CHECK_TIMEOUT)
    assert res.returncode == 2, (res.stdout, res.stderr)
    assert res.stderr.strip() != "" or res.stdout.strip() != ""


def test_unknown_option_exits_2(repo):
    scenario(repo, "X = 1\n", "X = 2\n")
    res = repo.run("--no-such-flag")
    assert res.returncode == 2, (res.stdout, res.stderr)
    assert res.stderr.strip() != ""


def test_default_base_is_origin_main(repo):
    scenario(repo, "X = 1\n", "X = 1\n\n\n" + branchy("bad", 30))
    # No origin/main yet: the default base cannot resolve -> exit 2, never 0.
    res = repo.run()
    assert res.returncode == 2, (res.stdout, res.stderr)
    # Positive control: with origin/main pointing at main the default resolves and fails.
    repo.git("update-ref", "refs/remotes/origin/main", "main")
    res = repo.run()
    assert res.returncode == 1, (res.stdout, res.stderr)
    assert_finding(repo, parse_findings(res.stdout), "bad", 1, new=30)


# ---------- isolation of the fixture itself ----------

def test_hostile_ambient_git_environment_does_not_leak_into_fixture(tmp_path, monkeypatch):
    decoy = tmp_path / "decoy"
    decoy.mkdir()
    subprocess.run(["git", "init", "-q", "-b", "main", str(decoy)], check=True,
                   env=clean_env(tmp_path / "decoyhome"), capture_output=True, timeout=GIT_TIMEOUT)
    before = sorted(p.name for p in (decoy / ".git").iterdir())
    work = tmp_path / "work" / "repo"
    monkeypatch.setenv("GIT_DIR", str(decoy / ".git"))
    monkeypatch.setenv("GIT_WORK_TREE", str(work))
    monkeypatch.setenv("GIT_INDEX_FILE", str(decoy / "index-hostile"))
    monkeypatch.setenv("GIT_CONFIG_COUNT", "1")
    monkeypatch.setenv("GIT_CONFIG_KEY_0", "core.hooksPath")
    monkeypatch.setenv("GIT_CONFIG_VALUE_0", str(decoy))
    monkeypatch.setenv("XDG_CONFIG_HOME", str(decoy))
    monkeypatch.setenv("GIT_CEILING_DIRECTORIES", "/")
    r = Repo(work, tmp_path / "home")
    scenario(r, "X = 1\n", "X = 1\n\n\n" + branchy("bad", 16))
    code, findings, res = r.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(r, findings, "bad", 1, new=16)
    assert (work / ".git").is_dir()
    assert sorted(p.name for p in (decoy / ".git").iterdir()) == before
    assert not (decoy / "index-hostile").exists()
    head = subprocess.run(["git", "--git-dir", str(decoy / ".git"), "rev-parse", "--verify", "-q",
                           "HEAD"], capture_output=True, text=True, timeout=GIT_TIMEOUT,
                          env=clean_env(tmp_path / "decoyhome"))
    assert head.returncode != 0  # decoy repository never received a commit


# ---------- independent review regressions: unusual paths, BOM, Q2 identity, parse errors ----------

def add_new_file_on_feature(repo, path, text=None, data=None):
    """main holds only an anchor; `feature` adds `path` (text, or raw bytes with decoded text)."""
    repo.write("anchor.py", "X = 1\n")
    repo.commit("base", "anchor.py")
    repo.git("checkout", "-q", "-b", "feature")
    if data is None:
        repo.write(path, text)
    else:
        repo.write_bytes(path, data, text)
    repo.commit("add file", path)


def lenient_path_findings(findings, qual, rule, tail):
    """Findings for `qual`/`rule` whose printed path (any quoting/escaping) still names `tail`."""
    return [f for f in findings if f.qual == qual and f.number() == rule and tail in f.path]


@pytest.mark.parametrize("path", ["pkg/my mod.py", "my dir/sub dir/mod.py", "pkg/ lead.py"])
def test_new_function_in_path_with_spaces_is_checked(repo, path):
    # Git appends a TAB to `+++ b/<path>` when the path contains a space.
    add_new_file_on_feature(repo, path, many_params_fn(14))
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "many", 3, path=path, new=14)


def test_new_function_in_path_without_spaces_is_checked_positive_control(repo):
    add_new_file_on_feature(repo, "pkg/my_mod.py", many_params_fn(14))
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "many", 3, path="pkg/my_mod.py", new=14)


def test_compliant_function_in_path_with_spaces_passes(repo):
    add_new_file_on_feature(repo, "pkg/my mod.py", many_params_fn(13))
    assert_clean(repo)


def test_modified_function_worsened_in_path_with_spaces_fails(repo):
    path = "pkg/my mod.py"
    scenario(repo, many_params_fn(12), many_params_fn(13), path=path)
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "many", 3, path=path, old=12, new=13)


def test_modified_function_not_worse_in_path_with_spaces_passes(repo):
    scenario(repo, many_params_fn(14), many_params_fn(14, init=1), path="pkg/my mod.py")
    assert_clean(repo)


def test_new_function_in_path_with_tab_is_checked(repo):
    # Git quotes a path containing a TAB (`"b/pkg/my\tmod.py"`); the file must still be checked.
    path = "pkg/my\tmod.py"
    add_new_file_on_feature(repo, path, many_params_fn(14))
    diff = repo.git("-c", "core.quotePath=true", "diff", "main...HEAD", "--", path).stdout
    assert '+++ "b/pkg/my\\tmod.py"' in diff
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    hits = lenient_path_findings(findings, "many", 3, "mod.py")
    assert hits and all(f.new == "14" for f in hits), (res.stdout, res.stderr)


def test_new_function_in_path_with_space_and_non_ascii_is_checked(repo):
    path = "pkg/my café.py"
    add_new_file_on_feature(repo, path, many_params_fn(14))
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert lenient_path_findings(findings, "many", 3, "caf"), (res.stdout, res.stderr)


BOM = b"\xef\xbb\xbf"


def test_new_function_in_utf8_bom_file_is_checked(repo):
    # A UTF-8 BOM is legal Python source; it must be decoded, not reported as unparsable.
    text = many_params_fn(14)
    add_new_file_on_feature(repo, "pkg/bom.py", text, data=BOM + text.encode())
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "many", 3, path="pkg/bom.py", new=14)


def test_new_function_in_file_without_bom_is_checked_positive_control(repo):
    text = many_params_fn(14)
    add_new_file_on_feature(repo, "pkg/nobom.py", text, data=text.encode())
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "many", 3, path="pkg/nobom.py", new=14)


def test_compliant_utf8_bom_file_is_clean_without_warnings(repo):
    text = many_params_fn(13)
    add_new_file_on_feature(repo, "pkg/bom.py", text, data=BOM + text.encode())
    code, _, res = repo.check()
    assert code == 0, (res.stdout, res.stderr)
    assert not res.stdout.strip()
    assert "not analyzed" not in res.stderr.lower()


def test_modified_function_worsened_in_bom_file_fails(repo):
    # BOM on both sides; base and head must both be decoded for the ratchet comparison.
    base, head = many_params_fn(12), many_params_fn(13)
    repo.write_bytes("pkg/bom.py", BOM + base.encode(), base)
    repo.commit("base", "pkg/bom.py")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write_bytes("pkg/bom.py", BOM + head.encode(), head)
    repo.commit("head", "pkg/bom.py")
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "many", 3, path="pkg/bom.py", old=12, new=13)


def test_modified_function_not_worse_in_bom_file_passes(repo):
    base, head = many_params_fn(14), many_params_fn(14, init=1)
    repo.write_bytes("pkg/bom.py", BOM + base.encode(), base)
    repo.commit("base", "pkg/bom.py")
    repo.git("checkout", "-q", "-b", "feature")
    repo.write_bytes("pkg/bom.py", BOM + head.encode(), head)
    repo.commit("head", "pkg/bom.py")
    assert_clean(repo)


# Parse errors: the binding spec allows only exit 0 (clean), 1 (findings), 2 (usage/git error)
# and says nothing is "silently 0". A changed in-scope .py file that cannot be parsed has not
# been checked, so a clean exit 0 would let an unchecked function through: it must not be 0.

def test_unparsable_new_python_file_does_not_pass_silently(repo):
    add_new_file_on_feature(repo, "pkg/broken.py", "def f(:\n    return 1\n")
    code, _, res = repo.check()
    assert code in (1, 2), (res.stdout, res.stderr)
    assert "broken.py" in res.stdout + res.stderr


def test_unparsable_modified_python_file_does_not_pass_silently(repo):
    scenario(repo, "def f(a):\n    return a\n", "def f(a:\n    return a\n", path="pkg/broken.py")
    code, _, res = repo.check()
    assert code in (1, 2), (res.stdout, res.stderr)
    assert "broken.py" in res.stdout + res.stderr


def test_parsable_python_file_with_same_shape_passes_positive_control(repo):
    scenario(repo, "def f(a):\n    return a\n", "def f(a):\n    return a + 1\n",
             path="pkg/broken.py")
    assert_clean(repo)


# Q2 identity: an edit to an EXISTING nested conditional (assignment target, a literal) does not
# create a new nested-conditional site; only a genuinely new site is a new S3358 finding.

NESTED_ASSIGN = "def pick(a, b):\n    {t} = a if b else ({u} if a else {v})\n    return {t}\n"


def nested_assign(t="x", u="2", v="3"):
    return NESTED_ASSIGN.format(t=t, u=u, v=v)


def test_renaming_assignment_target_of_existing_nested_ternary_passes(repo):
    scenario(repo, nested_assign(t="x"), nested_assign(t="y"))
    assert_clean(repo)


@pytest.mark.parametrize("u, v", [("2", "4"), ("5", "3"), ("'a'", "'b'"), ("None", "3")])
def test_changing_literal_in_existing_nested_ternary_passes(repo, u, v):
    scenario(repo, nested_assign(), nested_assign(u=u, v=v))
    assert_clean(repo)


def test_changing_target_and_literal_of_existing_nested_ternary_together_passes(repo):
    scenario(repo, nested_assign(t="x"), nested_assign(t="y", u="7", v="8"))
    assert_clean(repo)


def test_changing_literal_in_existing_nested_ternary_in_return_passes(repo):
    base = "def pick(a, b):\n    return a if b else (2 if a else 3)\n"
    scenario(repo, base, base.replace("else 3", "else 4"))
    assert_clean(repo)


def test_changing_literal_in_existing_nested_ternary_in_method_passes(repo):
    base = in_class("K", nested_assign().replace("def pick(a, b)", "def pick(self, a, b)")
                    .replace("return x", "return x + bool(self)"))
    scenario(repo, base, base.replace("else 3", "else 4"))
    assert_clean(repo)


def test_changing_literal_in_existing_nested_ternary_in_nested_function_passes(repo):
    inner = ("def outer(a, b):\n    def inner(c):\n        x = a if b else (2 if c else 3)\n"
             "        return x\n    return inner\n")
    scenario(repo, inner, inner.replace("else 3", "else 4"))
    assert_clean(repo)


def test_new_nested_ternary_site_fails_positive_control(repo):
    # Same file shape as the passing renames above, but the head adds a genuinely new site.
    # (Q1 may also rise legitimately: a second nested ternary adds cognitive complexity.)
    head = ("def pick(a, b):\n    y = a if b else (2 if a else 3)\n"
            "    z = b if a else (1 if b else 0)\n    return y + z\n")
    scenario(repo, nested_assign(t="x"), head)
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "pick", 2)
    assert len([f for f in findings if f.number() == 2]) == 1, findings


def test_new_nested_ternary_site_alongside_edited_existing_site_fails(repo):
    # Existing site gets a literal edit (must not count) and a new site appears (must count).
    head = ("def pick(a, b):\n    x = a if b else (2 if a else 4)\n"
            "    w = b if a else (1 if b else 0)\n    return x + w\n")
    scenario(repo, nested_assign(t="x"), head)
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "pick", 2)
    assert len([f for f in findings if f.number() == 2]) == 1, findings


def test_flat_to_nested_ternary_with_target_rename_fails(repo):
    base = "def pick(a, b):\n    x = a if b else 2\n    return x\n"
    scenario(repo, base, nested_assign(t="y"))
    code, findings, res = repo.check()
    assert code == 1, (res.stdout, res.stderr)
    assert_finding(repo, findings, "pick", 2)
