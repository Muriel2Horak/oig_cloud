"""Offline S3776 conformance fixture for the oig-cloud P0 Sonar analysis."""

import ast
import gzip
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
FIXTURE = HERE / "fixtures" / "changed_functions_s3776_baseline.jsonl.gz"
CHECKER = HERE.parents[1] / "scripts" / "quality" / "changed_functions.py"
THRESHOLD = 15

# Independent pins: editing the fixture cannot also change its completeness expectations.
PINNED_SOURCE_SHA = "65dfbf2f6884579f6116f863634e866db5c50c98"
PINNED_ANALYSIS_KEY = "8a602342-1e1e-48ad-9b62-31b69fda2cf6"
PINNED_SCOPE_SHA256 = "433c2c913bfc0bc2c55ea4a19c5c9e5e9724a22acaea6437d6bb7c099dfb5ad5"
PINNED_ISSUE_COUNT = 111
PINNED_FILE_COUNT = 53
PINNED_ISSUE_DIGEST = "abbb288e43b1f139c07c1c47b316bf6ae4f13919e9073112a24109905ff78265"
PINNED_FUNCTION_COUNT = 3338
PINNED_FUNCTION_DIGEST = "aba1d5cdd857fed95dc96834bde31528d14fe9bbe21ca5e765dc303c8fa0089b"
PINNED_INDEX_COUNT = 211
PINNED_INDEX_DIGEST = "0c3875ea1619139840a0a11d197425d613138db730f333abcd44f7f613bb1752"
IGNORED_API = "custom_components/oig_cloud/lib/oig_cloud_client/api/oig_cloud_api.py"
SUPPRESSED_FILE = "custom_components/oig_cloud/shared/cloud_contract.py"


def _load_fixture():
    with gzip.open(FIXTURE, "rt", encoding="utf-8") as stream:
        records = [json.loads(line) for line in stream if line.strip()]
    meta = records[0]
    assert meta["record"] == "meta"
    issues = [record for record in records[1:] if record["record"] == "issue"]
    functions = [record for record in records[1:] if record["record"] == "function"]
    files = [record for record in records[1:] if record["record"] == "file"]
    assert len(issues) + len(functions) + len(files) + 1 == len(records)
    return meta, issues, functions, files


def _identity_digest(issues):
    rows = sorted(
        (
            row["path"], row["line"], row["col"], row["qualname"], row["kind"],
            row["score"], row["source_sha256"],
        )
        for row in issues
    )
    return hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest()


def _function_digest(functions):
    rows = sorted(
        (
            row["path"], row["line"], row["col"], row["qualname"], row["kind"],
            row["local_score"],
        )
        for row in functions
    )
    return hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest()


def _checker():
    spec = importlib.util.spec_from_file_location("changed_functions_under_test", CHECKER)
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    try:
        spec.loader.exec_module(module)
    except BaseException:
        sys.modules.pop(spec.name, None)
        raise
    return module


def _parse_function(row):
    tree = ast.parse(row["source"])
    assert len(tree.body) == 1, (row["path"], row["line"], "source is not one function")
    node = tree.body[0]
    assert isinstance(node, (ast.FunctionDef, ast.AsyncFunctionDef))
    assert node.name == row["qualname"].rsplit(".", 1)[-1]
    assert node.lineno == 1
    return node


def test_fixture_is_complete_and_pinned():
    meta, issues, functions, files = _load_fixture()
    assert FIXTURE.stat().st_size < 300 * 1024
    assert meta["rule"] == "python:S3776"
    assert meta["analysis_key"] == PINNED_ANALYSIS_KEY
    assert meta["source_sha"] == PINNED_SOURCE_SHA
    assert meta["scope_sha256"] == PINNED_SCOPE_SHA256
    assert meta["issue_count"] == len(issues) == PINNED_ISSUE_COUNT
    assert meta["file_count"] == len({row["path"] for row in issues}) == PINNED_FILE_COUNT
    assert set(meta["files"]) == {row["path"] for row in issues}
    assert _identity_digest(issues) == PINNED_ISSUE_DIGEST
    assert meta["main_function_count"] == len(functions) == PINNED_FUNCTION_COUNT
    assert _function_digest(functions) == PINNED_FUNCTION_DIGEST
    assert meta["indexed_python_file_count"] == len(files) == PINNED_INDEX_COUNT
    rows = [(row["path"], row["sha256"]) for row in files]
    assert rows == sorted(rows)
    digest = hashlib.sha256(json.dumps(rows, separators=(",", ":")).encode()).hexdigest()
    assert digest == meta["indexed_python_digest"] == PINNED_INDEX_DIGEST
    assert IGNORED_API not in {row["path"] for row in files}
    assert SUPPRESSED_FILE in {row["path"] for row in files}
    assert {row["path"] for row in issues} <= {row["path"] for row in files}

    pages = meta["pages"]
    assert [page["p"] for page in pages] == list(range(1, len(pages) + 1))
    assert all(page["total"] == meta["total"] for page in pages)
    assert sum(page["n"] for page in pages) == meta["total"] == len(issues)
    assert all(page["n"] == 500 for page in pages[:-1])
    assert 0 < pages[-1]["n"] <= 500
    assert len({(row["path"], row["line"], row["col"]) for row in issues}) == len(issues)
    assert len({(row["path"], row["qualname"]) for row in issues}) == len(issues)
    assert len({row["key"] for row in issues}) == len(issues)

    for row in issues:
        assert row["score"] > THRESHOLD
        assert hashlib.sha256(row["source"].encode()).hexdigest() == row["source_sha256"]
        _parse_function(row)


def test_every_flagged_function_matches_sonar_exactly():
    _, issues, _, _ = _load_fixture()
    checker = _checker()
    mismatches = []
    for row in issues:
        got = checker.cognitive_complexity(_parse_function(row))
        if got != row["score"]:
            mismatches.append((row["path"], row["line"], row["qualname"], row["score"], got))
    assert not mismatches, "\n".join(map(str, mismatches))


def _require_pinned_source(root):
    """Skip in a shallow checkout; fail when the workflow requires the baseline revision."""
    present = subprocess.run(
        ["git", "-C", str(root), "cat-file", "-e", f"{PINNED_SOURCE_SHA}^{{commit}}"],
        capture_output=True, check=False,
    ).returncode == 0
    if present:
        return
    message = f"baseline revision {PINNED_SOURCE_SHA} not in this checkout (shallow clone)"
    if os.environ.get("OIG_REQUIRE_SONAR_BASELINE") == "1":
        pytest.fail(message)
    pytest.skip(message)


def test_indexed_unsuppressed_unflagged_functions_are_within_threshold():
    """Recompute from pinned Git blobs, using Sonar's captured FIL component index."""
    _require_pinned_source(HERE.parents[1])
    _, issues, functions, files = _load_fixture()
    checker = _checker()
    flagged = {(row["path"], row["line"]): row for row in issues}
    previous = {(row["path"], row["line"], row["qualname"]): row["local_score"]
                for row in functions}
    compared = set()
    high = []
    suppressed = set()
    root = HERE.parents[1]
    for row in files:
        path = row["path"]
        source = subprocess.check_output(
            ["git", "-C", str(root), "show", f"{PINNED_SOURCE_SHA}:{path}"]
        ).decode("utf-8")
        assert hashlib.sha256(source.encode()).hexdigest() == row["sha256"]
        for unit in checker.analyze_module(source):
            if not unit.outermost:
                continue
            key = (path, unit.node.lineno)
            score = unit.metrics["Q1"]
            assert previous[(path, unit.node.lineno, unit.qualname)] == score
            if unit.nosonar:
                suppressed.add(key)
            elif key in flagged:
                assert score == flagged[key]["score"]
                compared.add(key)
            elif score > THRESHOLD:
                high.append((path, unit.node.lineno, unit.qualname, score))
    assert compared == set(flagged)
    assert (SUPPRESSED_FILE, 467) in suppressed
    assert not high, high
