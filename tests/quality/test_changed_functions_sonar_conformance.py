"""Offline S3776 conformance fixture for the oig-cloud P0 Sonar analysis."""

import ast
import gzip
import hashlib
import importlib.util
import json
import sys
from pathlib import Path

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
PINNED_UNFLAGGED_OVER_15 = [
    {
        "path": "custom_components/oig_cloud/lib/oig_cloud_client/api/oig_cloud_api.py",
        "line": 213,
        "qualname": "OigCloudApi._authenticate_internal",
        "kind": "AsyncFunctionDef",
        "local_score": 28,
    },
    {
        "path": "custom_components/oig_cloud/lib/oig_cloud_client/api/oig_cloud_api.py",
        "line": 388,
        "qualname": "OigCloudApi._try_get_stats",
        "kind": "AsyncFunctionDef",
        "local_score": 36,
    },
    {
        "path": "custom_components/oig_cloud/lib/oig_cloud_client/api/oig_cloud_api.py",
        "line": 721,
        "qualname": "OigCloudApi.get_extended_stats",
        "kind": "AsyncFunctionDef",
        "local_score": 24,
    },
    {
        "path": "custom_components/oig_cloud/shared/cloud_contract.py",
        "line": 467,
        "qualname": "_normalize_event",
        "kind": "FunctionDef",
        "local_score": 27,
    },
]


def _load_fixture():
    with gzip.open(FIXTURE, "rt", encoding="utf-8") as stream:
        records = [json.loads(line) for line in stream if line.strip()]
    meta = records[0]
    assert meta["record"] == "meta"
    issues = [record for record in records[1:] if record["record"] == "issue"]
    functions = [record for record in records[1:] if record["record"] == "function"]
    assert len(issues) + len(functions) + 1 == len(records)
    return meta, issues, functions


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
    meta, issues, functions = _load_fixture()
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
    _, issues, _ = _load_fixture()
    checker = _checker()
    mismatches = []
    for row in issues:
        got = checker.cognitive_complexity(_parse_function(row))
        if got != row["score"]:
            mismatches.append((row["path"], row["line"], row["qualname"], row["score"], got))
    assert not mismatches, "\n".join(map(str, mismatches))


def test_unflagged_over_threshold_cases_are_exactly_pinned():
    """Keep the four P0 discrepancies visible; do not hide or tolerate new cases."""
    meta, issues, functions = _load_fixture()
    flagged = {(row["path"], row["line"]) for row in issues}
    unflagged_high = [
        {key: row[key] for key in ("path", "line", "qualname", "kind", "local_score")}
        for row in functions
        if (row["path"], row["line"]) not in flagged and row["local_score"] > THRESHOLD
    ]
    assert meta["unflagged_over_15"] == PINNED_UNFLAGGED_OVER_15
    assert unflagged_high == PINNED_UNFLAGGED_OVER_15
