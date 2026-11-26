"""Vendored from agent-ops 8c446efc5; scope from .sonar/local.properties.

Sonar-aligned quality checks for changed Python functions (stdlib only).

Rules mirrored (Sonar profile "Sonar agentic AI"):
- Q1 python:S3776 cognitive complexity <= 15
- Q2 python:S3358 nested conditional expression
- Q3 python:S107 parameters <= 13
- Q4 python:S1172 / S1481 / S1854 unused parameter / local / dead store (conservative)
"""

from __future__ import annotations

import ast
from collections import Counter
from collections.abc import Set
import io
import os
import tokenize
import re
import subprocess
import tempfile
from dataclasses import dataclass, field

MAX_COGNITIVE = 15
MAX_PARAMS = 13

FuncNode = ast.FunctionDef | ast.AsyncFunctionDef

# ---------------------------------------------------------------- scope

def _glob_re(pattern: str) -> re.Pattern[str]:
    out: list[str] = []
    i = 0
    while i < len(pattern):
        if pattern.startswith("**/", i):
            out.append("(?:.*/)?")
            i += 3
        elif pattern.startswith("**", i):
            out.append(".*")
            i += 2
        elif pattern[i] == "*":
            out.append("[^/]*")
            i += 1
        elif pattern[i] == "?":
            out.append("[^/]")
            i += 1
        else:
            out.append(re.escape(pattern[i]))
            i += 1
    return re.compile("".join(out) + r"\Z")


@dataclass(frozen=True)
class _Scope:
    sources: tuple[str, ...]
    tests: tuple[str, ...]
    exclusions: tuple[re.Pattern[str], ...]
    test_inclusions: tuple[re.Pattern[str], ...]
    test_exclusions: tuple[re.Pattern[str], ...]
    scm_exclusions: bool = True


def _read_scope(repo: str, source: str | None = None) -> _Scope:
    """Read the source/test split from the project's minimal Sonar properties file."""
    path = os.path.join(repo, ".sonar", "local.properties")
    if source is None:
        try:
            with open(path, encoding="utf-8") as properties_file:
                source = properties_file.read()
        except (OSError, UnicodeError) as exc:
            raise GitError(f"cannot read {path}: {exc}") from exc
    lines = source.splitlines()

    properties: dict[str, str] = {}
    for number, raw_line in enumerate(lines, 1):
        line = raw_line.strip()
        if not line or line.startswith(("#", "!")):
            continue
        if "=" not in line:
            raise GitError(f"{path}:{number}: expected key=value")
        key, value = line.split("=", 1)
        key = key.strip()
        if not key:
            raise GitError(f"{path}:{number}: empty property name")
        properties[key] = value.strip()

    def values(name: str, *, required: bool = False) -> tuple[str, ...]:
        raw = properties.get(name, "")
        result = tuple(value.strip() for value in raw.split(",") if value.strip())
        if required and not result:
            raise GitError(f"{path}: missing required property {name}")
        return result

    return _Scope(
        sources=values("sonar.sources", required=True),
        tests=values("sonar.tests"),
        exclusions=tuple(_glob_re(p) for p in values("sonar.exclusions")),
        test_inclusions=tuple(_glob_re(p) for p in values("sonar.test.inclusions")),
        test_exclusions=tuple(_glob_re(p) for p in values("sonar.test.exclusions")),
        scm_exclusions=properties.get("sonar.scm.exclusions.disabled", "false").lower() != "true",
    )


def _under_root(path: str, root: str) -> bool:
    path = path.replace("\\", "/")
    root = root.replace("\\", "/").rstrip("/")
    return root in ("", ".") or path == root or path.startswith(root + "/")


def in_scope(path: str, scope: _Scope) -> bool:
    """True when Sonar analyzes `path` as main source for these Python rules."""
    if not path.endswith(".py") or not any(_under_root(path, root) for root in scope.sources):
        return False
    if any(pattern.match(path) for pattern in scope.exclusions):
        return False

    if any(_under_root(path, root) for root in scope.tests):
        if any(pattern.match(path) for pattern in scope.test_exclusions):
            return False
        if not scope.test_inclusions or any(pattern.match(path) for pattern in scope.test_inclusions):
            return False
    return True


# ---------------------------------------------------------------- Q1

_NESTING_STMT = (ast.If, ast.For, ast.AsyncFor, ast.While)
_FUNC_TYPES = (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda)


class _Cognitive:
    def __init__(self) -> None:
        self.total = 0
        self.scope: FuncNode | None = None

    def children(self, node: ast.AST, nesting: int) -> None:
        for child in ast.iter_child_nodes(node):
            self.visit(child, nesting)

    def body(self, stmts: list[ast.stmt], nesting: int) -> None:
        for stmt in stmts:
            self.visit(stmt, nesting)

    def visit_if(self, node: ast.If, nesting: int, elif_: bool) -> None:
        self.total += 1 if elif_ else 1 + nesting
        self.visit(node.test, nesting)
        self.body(node.body, nesting + 1)
        if (len(node.orelse) == 1 and isinstance(node.orelse[0], ast.If)
                and node.orelse[0].col_offset == node.col_offset):
            self.visit_if(node.orelse[0], nesting, True)
        elif node.orelse:
            self.total += 1
            self.body(node.orelse, nesting + 1)

    def visit_loop(self, node: ast.For | ast.AsyncFor | ast.While, nesting: int) -> None:
        self.total += 1 + nesting
        if isinstance(node, ast.While):
            self.visit(node.test, nesting)
        else:
            self.visit(node.target, nesting)
            self.visit(node.iter, nesting)
        self.body(node.body, nesting + 1)
        if node.orelse:
            self.total += 1
        self.body(node.orelse, nesting + 1)

    def visit_try(self, node: ast.Try, nesting: int) -> None:
        self.body(node.body, nesting)
        for handler in node.handlers:
            self.total += 1 + nesting
            if handler.type is not None:
                self.visit(handler.type, nesting)
            self.body(handler.body, nesting + 1)
        if node.orelse:
            self.total += 1
        self.body(node.orelse, nesting + 1)
        self.body(node.finalbody, nesting)

    def visit_boolop(self, node: ast.BoolOp, nesting: int) -> None:
        # one increment per BoolOp; a nested BoolOp only exists under parentheses or a different operator
        self.total += 1
        for value in node.values:
            self.visit(value, nesting)

    def visit(self, node: ast.AST, nesting: int) -> None:
        if isinstance(node, ast.If):
            self.visit_if(node, nesting, False)
        elif isinstance(node, (ast.For, ast.AsyncFor, ast.While)):
            self.visit_loop(node, nesting)
        elif isinstance(node, ast.Try) or type(node).__name__ == "TryStar":
            self.visit_try(node, nesting)  # type: ignore[arg-type]
        elif isinstance(node, ast.IfExp):
            self.total += 1 + nesting
            self.visit(node.test, nesting)
            self.visit(node.body, nesting + 1)
            self.visit(node.orelse, nesting + 1)
        elif isinstance(node, ast.BoolOp):
            self.visit_boolop(node, nesting)
        elif isinstance(node, ast.Match):
            self.total += 1 + nesting
            self.visit(node.subject, nesting)
            for case in node.cases:
                if case.guard is not None:
                    self.visit(case.guard, nesting + 1)
                self.body(case.body, nesting + 1)
        elif isinstance(node, ast.ClassDef):
            self.class_body(node)
        elif isinstance(node, _FUNC_TYPES):
            self.nested_function(node, nesting)
        else:
            self.children(node, nesting)

    def class_body(self, node: ast.ClassDef) -> None:
        previous = self.scope
        self.scope = None
        self.body(node.body, 0)
        self.scope = previous

    def nested_function(self, node: ast.AST, nesting: int) -> None:
        if isinstance(node, ast.Lambda):
            self.visit(node.body, nesting)
            return
        for deco in getattr(node, "decorator_list", []):
            self.visit(deco, nesting)
        parent = self.scope
        wrapper = parent is not None and all(
            stmt is node or (isinstance(stmt, ast.Return) and isinstance(stmt.value, ast.Name))
            for stmt in parent.body
        )
        self.scope = node  # type: ignore[assignment]
        self.body(getattr(node, "body"), nesting if wrapper or parent is None else nesting + 1)
        self.scope = parent


def cognitive_complexity(node: ast.AST) -> int:
    """Sonar python:S3776 cognitive complexity of a function (nested ones included)."""
    if not isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        raise TypeError("cognitive_complexity needs a FunctionDef or AsyncFunctionDef")
    calc = _Cognitive()
    calc.scope = node
    calc.body(node.body, 0)
    return calc.total


# ---------------------------------------------------------------- Q2 / Q3


_COMPREHENSIONS = (ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp)
_COND_BOUNDARY = (
    ast.ListComp, ast.SetComp, ast.DictComp, ast.GeneratorExp, ast.Lambda, ast.JoinedStr,
    ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef,
)


def nested_conditionals(node: ast.AST) -> int:
    """Count conditional expressions that sit inside another one (S3358).

    Sonar looks for an enclosing conditional expression without crossing a comprehension,
    lambda, f-string or nested scope; every nested one is one finding, at any depth.
    """
    return _count_nested(node, False)


def _count_nested(node: ast.AST, inside: bool) -> int:
    total = 0
    for child in ast.iter_child_nodes(node):
        if isinstance(child, _COMPREHENSIONS):
            continue  # Sonar never reports a conditional inside a comprehension
        if isinstance(child, ast.IfExp):
            total += (1 if inside else 0) + _count_nested(child, True)
        else:
            total += _count_nested(child, inside and not isinstance(child, _COND_BOUNDARY))
    return total


def _conditional_anchor(statement: ast.stmt) -> str:
    if isinstance(statement, ast.Assign):
        anchor = tuple(ast.dump(t, include_attributes=False) for t in statement.targets)
    elif isinstance(statement, (ast.AnnAssign, ast.AugAssign)):
        anchor = (ast.dump(statement.target, include_attributes=False),)
    else:
        anchor = (type(statement).__name__,)
    return repr(anchor)


def _conditional_findings(func: FuncNode, suppressed: Set[int] = frozenset()) -> Counter[str]:
    return _conditional_findings_in(func.body, suppressed)


def _conditional_list_children(field_name: str, values: list, path: tuple[str, ...]):
    for index, child in enumerate(values):
        if isinstance(child, ast.AST):
            yield child, path + (f"{field_name}[{index}]",)


def _conditional_children(node: ast.AST, path: tuple[str, ...]):
    for field_name, value in ast.iter_fields(node):
        if isinstance(value, ast.AST):
            yield value, path + (field_name,)
        elif isinstance(value, list):
            yield from _conditional_list_children(field_name, value, path)


def _visit_function_header(node: FuncNode, findings: Counter[str], suppressed: Set[int]) -> None:
    exprs = [*node.decorator_list, *node.args.defaults,
             *[default for default in node.args.kw_defaults if default is not None]]
    for index, expr in enumerate(exprs):
        _visit_conditional_node(expr, False, node, (f"header[{index}]",), findings, suppressed)


def _record_conditional(node: ast.AST, inside: bool, statement: ast.stmt | None,
                        path: tuple[str, ...], findings: Counter[str], suppressed: Set[int]) -> None:
    if isinstance(node, ast.IfExp) and inside and statement is not None and node.lineno not in suppressed:
        findings[_conditional_anchor(statement) + ":" + repr(path)] += 1


def _visit_conditional_children(node: ast.AST, inside: bool, statement: ast.stmt | None,
                                path: tuple[str, ...], findings: Counter[str], suppressed: Set[int]) -> None:
    for child, child_path in _conditional_children(node, path):
        _visit_conditional_node(child, inside, statement, child_path, findings, suppressed)


def _visit_conditional_node(node: ast.AST, inside: bool, statement: ast.stmt | None,
                            path: tuple[str, ...], findings: Counter[str], suppressed: Set[int]) -> None:
    if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
        _visit_function_header(node, findings, suppressed)
        return
    if isinstance(node, (ast.ClassDef, *_COMPREHENSIONS)):
        return
    if isinstance(node, ast.stmt):
        statement, path = node, ()
    _record_conditional(node, inside, statement, path, findings, suppressed)
    inside = isinstance(node, ast.IfExp) or (inside and not isinstance(node, _COND_BOUNDARY))
    _visit_conditional_children(node, inside, statement, path, findings, suppressed)


def _conditional_findings_in(statements: list[ast.stmt], suppressed: Set[int] = frozenset()) -> Counter[str]:
    findings: Counter[str] = Counter()
    for stmt in statements:
        _visit_conditional_node(stmt, False, None, (), findings, suppressed)
    return findings


def _assignments(func: FuncNode) -> list[ast.stmt]:
    assignments: list[ast.stmt] = []

    def visit(node: ast.AST) -> None:
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef, ast.Lambda)):
            return
        if isinstance(node, (ast.Assign, ast.AnnAssign, ast.AugAssign)):
            assignments.append(node)
        for child in ast.iter_child_nodes(node):
            visit(child)

    for stmt in func.body:
        visit(stmt)
    return assignments


def _assignment_signature(node: ast.stmt) -> tuple[str, ...]:
    # Match the same expression site across target and literal edits.
    value = _shape_dump(node.value) if node.value is not None else "None"
    parts = [type(node).__name__, value]
    if isinstance(node, ast.AnnAssign):
        parts.append(_shape_dump(node.annotation))
    elif isinstance(node, ast.AugAssign):
        parts.append(_shape_dump(node.op))
    return tuple(parts)


def _shape_dump(node: ast.AST) -> str:
    """Describe AST structure while ignoring literal values."""
    if isinstance(node, ast.Constant):
        return "Constant"
    fields = ",".join(f"{name}={_shape_value(value)}" for name, value in ast.iter_fields(node))
    return f"{type(node).__name__}({fields})"


def _shape_value(value) -> str:
    if isinstance(value, ast.AST):
        return _shape_dump(value)
    if isinstance(value, list):
        return "[" + ",".join(_shape_value(item) for item in value) + "]"
    return repr(value)


def _introduced_assignments(assignments: list[ast.stmt], introduced: Counter[str]
                            ) -> dict[tuple[str, ...], list[ast.stmt]]:
    grouped: dict[tuple[str, ...], list[ast.stmt]] = {}
    for assignment in assignments:
        if introduced[_conditional_anchor(assignment)]:
            signature = _assignment_signature(assignment)
            grouped.setdefault(signature, []).append(assignment)
    return grouped


def _transfer_conditional_findings(old: ast.stmt, new: ast.stmt, added: Counter[str],
                                   remaining: Counter[str]) -> None:
    old_anchor = _conditional_anchor(old)
    new_anchor = _conditional_anchor(new)
    for old_key, count in _conditional_findings_in([old]).items():
        new_key = new_anchor + old_key[len(old_anchor):]
        matched = min(count, remaining[old_key], added[new_key])
        remaining[old_key] -= matched
        added[new_key] -= matched


def _match_assignment_findings(old: ast.stmt, candidates: dict[tuple[str, ...], list[ast.stmt]],
                               removed: Counter[str], introduced: Counter[str], added: Counter[str],
                               remaining: Counter[str]) -> None:
    old_anchor = _conditional_anchor(old)
    if not removed[old_anchor]:
        return
    matches = candidates.get(_assignment_signature(old), [])
    new = next((item for item in matches if introduced[_conditional_anchor(item)]), None)
    if new is None:
        return
    new_anchor = _conditional_anchor(new)
    matches.remove(new)
    removed[old_anchor] -= 1
    introduced[new_anchor] -= 1
    _transfer_conditional_findings(old, new, added, remaining)


def _match_renamed_assignments(unit: Unit, base_units: list[Unit], added: Counter[str],
                               remaining: Counter[str]) -> None:
    new_assignments = _assignments(unit.node)
    new_anchors = Counter(_conditional_anchor(n) for n in new_assignments)
    for base in base_units:
        old_assignments = _assignments(base.node)
        old_anchors = Counter(_conditional_anchor(n) for n in old_assignments)
        # Only pair disappearing targets with newly introduced targets, not moves between
        # existing assignments. Counts allow the same target to remain elsewhere.
        removed = old_anchors - new_anchors
        introduced = new_anchors - old_anchors
        new_by_signature = _introduced_assignments(new_assignments, introduced)
        for old in old_assignments:
            _match_assignment_findings(old, new_by_signature, removed, introduced, added, remaining)


def parameter_count(node: FuncNode, is_method: bool = False) -> int:
    """Parameters as Sonar python:S107 counts them (implicit self/cls of a method excluded)."""
    args = node.args
    total = len(args.posonlyargs) + len(args.args) + len(args.kwonlyargs)
    total += (args.vararg is not None) + (args.kwarg is not None)
    if is_method and not _is_static(node) and (args.posonlyargs or args.args):
        total -= 1
    return total


def _is_static(node: FuncNode) -> bool:
    for deco in node.decorator_list:
        name = deco.attr if isinstance(deco, ast.Attribute) else getattr(deco, "id", "")
        if name == "staticmethod":
            return True
    return False


# ---------------------------------------------------------------- Q4


@dataclass(frozen=True)
class Q4Finding:
    rule: str  # S1172 | S1481 | S1854
    name: str
    line: int


_DYNAMIC_SCOPE = {"locals", "vars", "eval", "exec"}


def _own_nodes(func: FuncNode):
    """Every node of `func` that belongs to its own scope (nested scopes excluded)."""
    stack = list(func.body)
    while stack:
        node = stack.pop()
        yield node
        if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef, ast.Lambda, ast.ClassDef)):
            # decorators/defaults evaluate in this scope, the body does not
            if isinstance(node, ast.Lambda):
                stack.extend(node.args.defaults)
            else:
                stack.extend(getattr(node, "decorator_list", []))
                if not isinstance(node, ast.ClassDef):
                    stack.extend(node.args.defaults)
                    stack.extend(d for d in node.args.kw_defaults if d is not None)
            continue
        stack.extend(ast.iter_child_nodes(node))


def _is_stub(func: FuncNode) -> bool:
    body = list(func.body)
    if body and isinstance(body[0], ast.Expr) and isinstance(body[0].value, ast.Constant):
        body = body[1:]
    if not body:
        return True
    for stmt in body:
        if isinstance(stmt, ast.Pass):
            continue
        if isinstance(stmt, ast.Expr) and isinstance(stmt.value, ast.Constant):
            continue
        if isinstance(stmt, ast.Raise):
            continue
        return False
    return True


def _decorator_names(func: FuncNode) -> set[str]:
    names = set()
    for deco in func.decorator_list:
        target = deco.func if isinstance(deco, ast.Call) else deco
        names.add(target.attr if isinstance(target, ast.Attribute) else getattr(target, "id", ""))
    return names


def _name_loads(node: ast.AST, name: str) -> bool:
    return any(
        isinstance(n, ast.Name) and n.id == name and not isinstance(n.ctx, ast.Store)
        for n in ast.walk(node)
    )


def _statement_blocks(func: FuncNode) -> list[list[ast.stmt]]:
    blocks: list[list[ast.stmt]] = []
    for node in [func, *_own_nodes(func)]:
        for field_name in ("body", "orelse", "finalbody"):
            block = getattr(node, field_name, None)
            if isinstance(block, list) and block and isinstance(block[0], ast.stmt):
                blocks.append(block)
        blocks.extend(h.body for h in getattr(node, "handlers", None) or [])
    return blocks


def _single_name_assign(stmt: ast.stmt) -> str | None:
    if isinstance(stmt, ast.Assign) and len(stmt.targets) == 1 and isinstance(stmt.targets[0], ast.Name):
        return stmt.targets[0].id
    return None


def _cannot_observe(value: ast.expr, name: str) -> bool:
    """True when evaluating `value` neither calls anything nor reads `name`."""
    for node in ast.walk(value):
        if isinstance(node, (ast.Call, ast.Await)):
            return False
        if isinstance(node, ast.Name) and node.id == name:
            return False
    return True


_GUARDED = (ast.Try, ast.With, ast.AsyncWith, *(
    (ast.TryStar,) if hasattr(ast, "TryStar") else ()))


def _guarded_statements(func: FuncNode) -> set[int]:
    """ids of statements that sit under a try/with, where an exception may be caught and the old value read."""
    guarded: set[int] = set()
    for node in [func, *_own_nodes(func)]:
        if isinstance(node, _GUARDED):
            for child in ast.iter_child_nodes(node):
                guarded.update(id(s) for s in ast.walk(child) if isinstance(s, ast.stmt))
    return guarded


def _cannot_raise(value: ast.expr) -> bool:
    """True when evaluating `value` cannot raise: literals and displays of literals only."""
    return all(
        isinstance(n, (ast.Constant, ast.Tuple, ast.List, ast.Set, ast.Dict, ast.expr_context))
        for n in ast.walk(value)
    )


def _dead_store_name(stmt: ast.stmt, later: ast.stmt, loaded: set[str], guarded: set[int]
                     ) -> str | None:
    name = _single_name_assign(stmt)
    if name is None or name.startswith("_") or name not in loaded:
        return None
    if _single_name_assign(later) != name:
        return None
    value = later.value  # type: ignore[attr-defined]
    if not _cannot_observe(value, name):
        return None
    if id(later) in guarded and not _cannot_raise(value):
        return None
    return name


def _dead_stores(func: FuncNode, loaded: set[str]) -> list[Q4Finding]:
    """S1854, adjacent only: `x = a` immediately rebound by `x = b` that cannot raise or read x.

    Outside a try/with the rebinding's exception leaves the function without reading x, so only
    a read by the rebinding itself matters. Under a try/with a raise may reach a handler that reads
    x, so the rebinding must be unable to raise.
    """
    findings: list[Q4Finding] = []
    guarded = _guarded_statements(func)
    for block in _statement_blocks(func):
        for stmt, later in zip(block, block[1:]):
            name = _dead_store_name(stmt, later, loaded, guarded)
            if name is not None:
                findings.append(Q4Finding("S1854", name, stmt.lineno))
    return findings


def _scan_names(func: FuncNode) -> tuple[set[str], dict[str, int], bool]:
    """(names read anywhere in func, store count per name, uses locals()/eval()-like calls)."""
    loaded: set[str] = set()
    stores: dict[str, int] = {}
    for node in ast.walk(func):
        if isinstance(node, ast.Name):
            if isinstance(node.ctx, ast.Store):
                stores[node.id] = stores.get(node.id, 0) + 1
            elif isinstance(node.ctx, ast.Load):
                loaded.add(node.id)
        elif isinstance(node, ast.Call) and isinstance(node.func, ast.Name) and node.func.id in _DYNAMIC_SCOPE:
            return loaded, stores, True
    return loaded, stores, False


def _unused_params(func: FuncNode, is_method: bool, loaded: set[str]) -> list[Q4Finding]:
    args = func.args
    params = [*args.posonlyargs, *args.args, *args.kwonlyargs]
    if is_method and not _is_static(func) and (args.posonlyargs or args.args):
        first = (args.posonlyargs or args.args)[0]
        params = [p for p in params if p is not first]
    return [
        Q4Finding("S1172", p.arg, p.lineno)
        for p in params
        if p.arg not in loaded and not p.arg.startswith("_")
    ]


def _assigned_name(node: ast.AST) -> ast.Name | None:
    if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
        return node.targets[0]
    if isinstance(node, ast.AnnAssign) and node.value is not None and isinstance(node.target, ast.Name):
        return node.target
    return None


def _unused_locals(func: FuncNode, loaded: set[str], stores: dict[str, int]) -> list[Q4Finding]:
    """S1481: local bound exactly once by plain `name = value` and never read."""
    param_names = {a.arg for a in ast.walk(func.args) if isinstance(a, ast.arg)}
    declared = {name for node in _own_nodes(func) if isinstance(node, (ast.Global, ast.Nonlocal))
                for name in node.names}
    findings = []
    for node in _own_nodes(func):
        target = _assigned_name(node)
        if target is None or target.id.startswith("_") or target.id in param_names or target.id in declared:
            continue
        if target.id not in loaded and stores.get(target.id) == 1:
            findings.append(Q4Finding("S1481", target.id, node.lineno))
    return findings


def unused_names(
    func: FuncNode,
    is_method: bool = False,
    class_has_bases: bool = False,
    referenced: frozenset[str] | set[str] = frozenset(),
) -> list[Q4Finding]:
    """Conservative S1172 / S1481 / S1854: report only what Sonar certainly reports.

    `referenced`: function names used as a value in the module (callbacks keep their signature).
    """
    loaded, stores, dynamic = _scan_names(func)
    if dynamic:
        return []
    # Sonar skips stubs, decorated functions, dunders, callbacks and possible overrides
    skip_params = (
        _is_stub(func) or func.decorator_list or func.name.startswith("__")
        or func.name in referenced or (is_method and class_has_bases)
    )
    findings = [] if skip_params else _unused_params(func, is_method, loaded)
    findings.extend(_unused_locals(func, loaded, stores))
    findings.extend(_dead_stores(func, loaded))
    return findings


# ---------------------------------------------------------------- module analysis


@dataclass
class Unit:
    qualname: str
    node: FuncNode
    outermost: bool
    first_line: int  # first decorator or def line
    end_line: int
    header_end: int = 0
    body_same_line: bool = False
    declaration_lines: set[int] = field(default_factory=set)
    metrics: dict[str, int] = field(default_factory=dict)
    q4: dict[tuple[str, str], int] = field(default_factory=dict)
    q2: Counter[str] = field(default_factory=Counter)
    nosonar: bool = False


def _referenced_function_names(tree: ast.AST) -> set[str]:
    """Names (and attribute names) read as a value rather than called: callbacks."""
    called: set[int] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Call):
            called.add(id(node.func))
    refs: set[str] = set()
    for node in ast.walk(tree):
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load) and id(node) not in called:
            refs.add(node.id)
        elif isinstance(node, ast.Attribute) and id(node) not in called:
            refs.add(node.attr)
    return refs


def _function_headers(source: str) -> dict[int, int]:
    headers: dict[int, int] = {}
    tokens = iter(tokenize.generate_tokens(io.StringIO(source).readline))
    for token in tokens:
        if token.type != tokenize.NAME or token.string != "def":
            continue
        start = token.start[0]
        depth = 0
        for part in tokens:
            if part.string in ("(", "[", "{"):
                depth += 1
            elif part.string in (")", "]", "}"):
                depth -= 1
            elif part.string == ":" and depth == 0:
                headers[start] = part.end[0]
                break
    return headers


def _selected(unit: Unit, line: int) -> bool:
    return unit.first_line <= line <= unit.end_line


class _Walker:
    def __init__(self, source: str) -> None:
        self.tree = ast.parse(source)
        self.headers = _function_headers(source)
        self.nosonar_lines = {
            token.start[0] for token in tokenize.generate_tokens(io.StringIO(source).readline)
            if token.type == tokenize.COMMENT and "NOSONAR" in token.string
        }
        self.referenced = _referenced_function_names(self.tree)
        self.units: list[Unit] = []

    def run(self) -> list[Unit]:
        self.walk(self.tree, "", False, (False, False))
        return self.units

    def add_function(self, node: FuncNode, prefix: str, in_function: bool, class_info: tuple[bool, bool]) -> str:
        qual = f"{prefix}{node.name}"
        first = min([node.lineno, *[d.lineno for d in node.decorator_list]])
        unit = Unit(qual, node, not in_function, first, node.end_lineno or node.lineno)
        unit.nosonar = node.lineno in self.nosonar_lines
        unit.header_end = self.headers[node.lineno]
        unit.body_same_line = node.body[0].lineno == unit.header_end
        for child in ast.walk(node):
            if child is node or not isinstance(child, (ast.FunctionDef, ast.AsyncFunctionDef)):
                continue
            start = min([child.lineno, *[d.lineno for d in child.decorator_list]])
            end = self.headers[child.lineno]
            if child.body[0].lineno == end:
                end -= 1
            unit.declaration_lines.update(range(start, end + 1))
        is_method, has_bases = class_info
        if unit.outermost:
            unit.metrics["Q1"] = cognitive_complexity(node)
        unit.q2 = _conditional_findings(node, self.nosonar_lines)
        unit.metrics["Q3"] = parameter_count(node, is_method)
        if not in_function:  # Sonar reports unused names on top-level functions and methods only
            for f in unused_names(node, is_method, has_bases, self.referenced):
                if f.line in self.nosonar_lines:
                    continue
                key = (f.rule, f.name)
                unit.q4[key] = unit.q4.get(key, 0) + 1
        self.units.append(unit)
        return qual

    def walk(self, parent: ast.AST, prefix: str, in_function: bool, class_info: tuple[bool, bool]) -> None:
        # class_info = (directly inside a class, that class has bases)
        for node in ast.iter_child_nodes(parent):
            if isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef)):
                qual = self.add_function(node, prefix, in_function, class_info)
                self.walk(node, f"{qual}.<locals>.", True, (False, False))
            elif isinstance(node, ast.ClassDef):
                self.walk(node, f"{prefix}{node.name}.", in_function, (True, bool(node.bases)))
            else:
                # A statement such as `if`/`try` directly in a class body still binds its defs as
                # methods, so class context passes through it; a function body resets it.
                self.walk(node, prefix, in_function, class_info)


def analyze_module(source: str) -> list[Unit]:
    """Score every function of a module. Raises SyntaxError on unparsable source."""
    if source.startswith("\ufeff"):
        source = source[1:]
    return _Walker(source).run()


# ---------------------------------------------------------------- git diff + ratchet


class GitError(Exception):
    pass


def git(repo: str, *args: str, check: bool = True) -> str:
    proc = subprocess.run(
        ["git", "-C", repo, *args], capture_output=True, text=True, encoding="utf-8", errors="replace",
    )
    if check and proc.returncode != 0:
        raise GitError(f"git {' '.join(args)}: {proc.stderr.strip() or 'exit ' + str(proc.returncode)}")
    return proc.stdout


_HUNK = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@")


def _hunk_lines(header: str) -> set[int]:
    m = _HUNK.match(header)
    if not m:
        return set()
    start = int(m.group(1))
    count = 1 if m.group(2) is None else int(m.group(2))
    return set(range(start, start + count))


def _deletion_lines(header: str) -> set[int]:
    """Return base-side line numbers removed by a deletion-only hunk."""
    match = re.match(r"^@@ -(\d+)(?:,(\d+))? \+\d+,0 @@", header)
    if not match:
        return set()
    start = int(match.group(1))
    count = 1 if match.group(2) is None else int(match.group(2))
    return set(range(start, start + count))


_C_ESCAPES = {"a": 7, "b": 8, "t": 9, "n": 10, "v": 11, "f": 12, "r": 13, '"': 34, "\\": 92}


def _octal_git_escape(body: str, index: int) -> tuple[bytes, int]:
    end = index + 1
    while end < min(index + 4, len(body)) and body[end] in "01234567":
        end += 1
    return bytes((int(body[index + 1:end], 8) & 0xFF,)), end - index


def _decode_git_escape(body: str, index: int) -> tuple[bytes, int]:
    if index + 1 == len(body):
        return b"\\", 1
    char = body[index + 1]
    if char in "01234567":
        return _octal_git_escape(body, index)
    if char in _C_ESCAPES:
        return bytes((_C_ESCAPES[char],)), 2
    return body[index:index + 2].encode("utf-8", errors="surrogateescape"), 2


def _unquote_git_path(raw: str) -> str:
    """Decode one path as Git writes it in diff headers.

    Git C-quotes a name that contains control characters, `"` or `\\`, and (with the default
    core.quotePath) every non-ASCII byte as an octal escape: `"b/caf\\303\\251.py"` is the UTF-8
    name `b/café.py`. Escapes are bytes, so they are decoded as UTF-8 before text conversion.
    """
    if len(raw) < 2 or not (raw.startswith('"') and raw.endswith('"')):
        return raw
    body = raw[1:-1]
    out = bytearray()
    i = 0
    while i < len(body):
        if body[i] != "\\":
            out.extend(body[i].encode("utf-8", errors="surrogateescape"))
            i += 1
        else:
            escaped, advance = _decode_git_escape(body, i)
            out.extend(escaped)
            i += advance
    return out.decode("utf-8", errors="surrogateescape")


def _header_path(header: str) -> str | None:
    """Repository path of a `+++ ` header line, or None (deleted file or no b/ prefix)."""
    raw = header[4:]
    if raw.endswith("\t"):
        raw = raw[:-1]
    if raw.startswith('"'):
        path = _unquote_git_path(raw)
    else:
        # A TAB in a name is quoted, so a trailing TAB is Git's header delimiter.
        path = raw
    return path[2:] if path.startswith("b/") else None


@dataclass
class ChangedPath:
    lines: set[int] = field(default_factory=set)
    deleted_base_lines: set[int] = field(default_factory=set)
    base_path: str | None = None


@dataclass
class FileChange:
    path: str
    change: ChangedPath
    base_in_scope: bool


@dataclass
class DiffContext:
    repo: str
    merge_base: str
    head: str
    scope: _Scope
    base_scope: _Scope


def _path_change(changes: dict[str, ChangedPath], path: str) -> ChangedPath:
    return changes.setdefault(path, ChangedPath())


def _parse_changed_diff(output: str) -> dict[str, ChangedPath]:
    changes: dict[str, ChangedPath] = {}
    path = rename_from = None
    for line in output.splitlines():
        if line.startswith("diff --git "):
            path = rename_from = None
        elif line.startswith("rename from "):
            rename_from = _unquote_git_path(line[len("rename from "):])
        elif line.startswith("rename to "):
            path = _unquote_git_path(line[len("rename to "):])
            _path_change(changes, path).base_path = rename_from
        elif line.startswith("+++ "):
            path = _header_path(line)
            if path is not None:
                _path_change(changes, path)
        elif path is not None and line.startswith("@@"):
            change = _path_change(changes, path)
            change.lines |= _hunk_lines(line)
            change.deleted_base_lines |= _deletion_lines(line)
    return changes


def changed_lines(repo: str, merge_base: str, head: str) -> dict[str, ChangedPath]:
    """Parse added, modified, renamed, and deleted Python lines from the Git diff."""
    output = git(repo, "diff", "-U0", "-M", "--no-color", "--diff-filter=AMR",
                 merge_base, head, "--", "*.py")
    return _parse_changed_diff(output)


def _show(repo: str, rev: str, path: str) -> str | None:
    proc = subprocess.run(
        ["git", "-C", repo, "show", f"{rev}:{path}"], capture_output=True,
    )
    if proc.returncode != 0:
        return None
    return proc.stdout.decode("utf-8", errors="replace")


@dataclass
class Finding:
    path: str
    line: int
    qualname: str
    rule: str
    old: str
    new: str

    def render(self) -> str:
        return f"{self.path}:{self.line} {self.qualname} {self.rule} {self.old}->{self.new}"


LIMITS = {"Q1": ("S3776", MAX_COGNITIVE), "Q3": ("S107", MAX_PARAMS)}


def _base_index(units: list[Unit]) -> dict[str, list[Unit]]:
    index: dict[str, list[Unit]] = {}
    for unit in units:
        index.setdefault(unit.qualname, []).append(unit)
    return index


def _base_max(base_units: list[Unit] | None, getter) -> int:
    return 0 if base_units is None else max((getter(b) for b in base_units), default=0)


def _limit_findings(path: str, unit: Unit, base_units: list[Unit] | None) -> list[Finding]:
    findings = []
    if unit.nosonar:
        return findings
    for key, (rule, limit) in LIMITS.items():
        if key not in unit.metrics:
            continue
        new = unit.metrics[key]
        unsuppressed_base = [b for b in base_units or [] if not b.nosonar] or None
        old = _base_max(unsuppressed_base, lambda b, k=key: b.metrics.get(k, 0))
        # NEW: pass the threshold. MODIFIED: never increase, even below it.
        if (unsuppressed_base is None and new > limit) or (unsuppressed_base is not None and new > old):
            findings.append(Finding(path, unit.node.lineno, unit.qualname, rule, str(old), str(new)))
    return findings


def check_unit(path: str, unit: Unit, base_units: list[Unit] | None) -> list[Finding]:
    """Ratchet one changed function. `base_units` is None for a NEW function."""
    findings = _limit_findings(path, unit, base_units)
    old_q2 = Counter() if base_units is None else sum((b.q2 for b in base_units), Counter())
    counted = [("S3358", sum(unit.q2.values()), sum(old_q2.values()))]
    for rule, new, old in _q4_counts(unit, base_units):
        counted.append((rule, new, old))
    findings.extend(
        Finding(path, unit.node.lineno, unit.qualname, rule, str(old), str(new))
        for rule, new, old in counted if new > old
    )
    return findings


def _q4_counts(unit: Unit, base_units: list[Unit] | None) -> list[tuple[str, int, int]]:
    totals: dict[str, int] = {}
    for (rule, _name), count in unit.q4.items():
        totals[rule] = totals.get(rule, 0) + count
    return [
        (rule, new, _base_max(base_units, lambda b, r=rule: sum(
            value for (base_rule, _), value in b.q4.items() if base_rule == r
        )))
        for rule, new in sorted(totals.items())
    ]


def _analyze_or_none(source: str | None, path: str, warn) -> list[Unit] | None:
    if source is None:
        return None
    try:
        return analyze_module(source)
    except (SyntaxError, ValueError) as exc:
        if warn:
            warn(f"{path}: not analyzed ({exc})")
        return None


def _deleted_functions(base_units: list[Unit] | None, deleted_lines: set[int]) -> set[str]:
    return {unit.qualname for unit in base_units or []
            if any(unit.first_line <= line <= unit.end_line for line in deleted_lines)}


def _touched_units(head_units: list[Unit], base_units: list[Unit] | None,
                   change: ChangedPath) -> list[Unit]:
    deleted = _deleted_functions(base_units, change.deleted_base_lines)
    return [unit for unit in head_units
            if unit.qualname in deleted or any(_selected(unit, line) for line in change.lines)]


def _check_file(repo: str, merge_base: str, head: str, file_change: FileChange, warn) -> list[Finding]:
    path, change = file_change.path, file_change.change
    head_units = _analyze_or_none(_show(repo, head, path), path, warn)
    if not head_units:
        return []
    base_units = (_analyze_or_none(_show(repo, merge_base, change.base_path or path), path, None)
                  if file_change.base_in_scope else None)
    touched = _touched_units(head_units, base_units, change)
    if not touched:
        return []
    base_index = _base_index(base_units or [])
    return _check_touched_units(path, touched, base_index)


def _check_touched_units(path: str, touched: list[Unit], base_index: dict[str, list[Unit]]) -> list[Finding]:
    findings: list[Finding] = []
    for unit in touched:
        findings.extend(check_unit(path, unit, base_index.get(unit.qualname)))
    return findings


def _ignored_at_revision(repo: str, rev: str, paths: list[str]) -> set[str]:
    """Evaluate committed .gitignore files, including tracked paths, at a given revision.

    An isolated Git directory avoids the caller's index, working tree, and local excludes.
    Git performs the pattern matching, including nested negations and directory rules.
    """
    if not paths:
        return set()
    names = git(repo, "ls-tree", "-r", "-z", "--name-only", rev).split("\0")
    with tempfile.TemporaryDirectory(prefix="changed-functions-ignore-") as work:
        env = os.environ.copy()
        for key in list(env):
            if key.startswith("GIT_"):
                del env[key]
        env.update(GIT_CONFIG_NOSYSTEM="1", GIT_CONFIG_GLOBAL=os.devnull)
        def run(*args, **kwargs):
            return subprocess.run(["git", "-C", work, *args], env=env,
                                  capture_output=True, **kwargs)
        init = run("init", "-q", "--template=")
        if init.returncode:
            raise GitError("cannot initialize isolated Git ignore matcher")
        for name in names:
            if name == ".gitignore" or name.endswith("/.gitignore"):
                content = _show(repo, rev, name)
                if content is None:
                    raise GitError(f"cannot read {rev}:{name}")
                dest = os.path.join(work, name)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "w", encoding="utf-8") as stream:
                    stream.write(content)
        result = run("check-ignore", "--no-index", "-z", "--stdin",
                     input="\0".join(paths).encode("utf-8") + b"\0")
        if result.returncode not in (0, 1):
            raise GitError(f"git check-ignore: {result.stderr.decode('utf-8', 'replace')}")
        return set(result.stdout.decode("utf-8").split("\0")) - {""}


def check_diff(repo: str, base: str, head: str = "HEAD", warn=None) -> list[Finding]:
    scope = _read_scope(repo)
    merge_base = git(repo, "merge-base", base, head).strip()
    if not merge_base:
        raise GitError(f"no merge-base between {base} and {head}")
    head_properties = _show(repo, head, ".sonar/local.properties")
    if head_properties is not None:
        scope = _read_scope(repo, head_properties)
    base_properties = _show(repo, merge_base, ".sonar/local.properties")
    base_scope = _read_scope(repo, base_properties) if base_properties is not None else scope
    context = DiffContext(repo, merge_base, head, scope, base_scope)
    return _check_changed_paths(context, changed_lines(repo, merge_base, head), warn)


def _check_changed_paths(context: DiffContext, changes: dict[str, ChangedPath], warn) -> list[Finding]:
    paths = [path for path, change in changes.items()
             if (change.lines or change.deleted_base_lines) and in_scope(path, context.scope)]
    head_ignored = (_ignored_at_revision(context.repo, context.head, paths)
                    if context.scope.scm_exclusions else set())
    base_ignored = (_ignored_at_revision(context.repo, context.merge_base, paths)
                    if context.base_scope.scm_exclusions else set())
    findings: list[Finding] = []
    for path in sorted(paths):
        if path not in head_ignored:
            file_change = FileChange(
                path, changes[path],
                path not in base_ignored and in_scope(path, context.base_scope),
            )
            findings.extend(_check_file(context.repo, context.merge_base, context.head,
                                        file_change, warn))
    return findings
