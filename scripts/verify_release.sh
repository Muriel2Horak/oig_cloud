#!/usr/bin/env bash
# scripts/verify_release.sh — the [[verify]] stage of .fleet/deploy.toml.
#
# Proves "deployed == declared" for a HACS release, which means answering
# three questions in order of increasing externality:
#   1. the release tag exists on the source of truth (origin)
#   2. the tag names exactly the tree on disk (nothing drifted between
#      tagging and verification)
#   3. a GitHub Release object exists for the tag
#
# The version is read from custom_components/oig_cloud/manifest.json —
# exactly how release.yml derives it — because today's release.yml cuts
# the tag from the gated github.sha with NO stamping and NO release
# commit: the tagged bytes are the committed bytes. OIG_CLOUD_RELEASE_VERSION
# overrides, for verifying a release other than this tree's declared one.
#
# This verifies the RELEASE. scripts/run_hassfest.sh and
# scripts/run_local_checks.sh verify the LOCAL WORKING TREE (they rsync or
# read the checkout and validate it against Home Assistant's standards);
# they pass whether or not a release happened, which is exactly the
# "verify that cannot detect a failed outcome" defect — they are the
# developer's pre-push loop, not a post-publish check, which is why they
# are not invoked here.
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

command -v jq >/dev/null 2>&1 || {
  echo "verify_release: jq is required to read the version from manifest.json (release.yml uses the same)" >&2
  exit 1
}

# Derive the version exactly like release.yml does: the .version field of
# the component manifest on the commit being verified.
VERSION="${OIG_CLOUD_RELEASE_VERSION:-$(jq -er '.version | strings' custom_components/oig_cloud/manifest.json)}"
[ -n "${VERSION}" ] || {
  echo "verify_release: could not derive release version from manifest.json (set OIG_CLOUD_RELEASE_VERSION)" >&2
  exit 1
}
TAG="v${VERSION}"

# 1. The tag must exist on origin. The release did not happen otherwise.
git ls-remote --exit-code origin "refs/tags/${TAG}" >/dev/null || {
  echo "verify_release: tag ${TAG} does not exist on origin" >&2
  exit 1
}

# 2. The tag's tree must equal the on-disk tree. Fetch the tag into
# FETCH_HEAD (avoids clobbering or depending on local tag refs) and diff
# it against the working tree. This is the check that fails closed: if the
# release was never made, check 1 already failed; if it was made from a
# different commit than the tree being verified, this fails.
git fetch --quiet origin "refs/tags/${TAG}"
git diff --exit-code FETCH_HEAD -- . >/dev/null || {
  echo "verify_release: on-disk tree does not match ${TAG}" >&2
  exit 1
}

# 2b. Untracked files are invisible to the diff above (review finding
# F-3, attack C): `git diff FETCH_HEAD -- .` compares tracked bytes only,
# so verify used to PASS with arbitrary untracked content in the tree
# while claiming "the tree on disk equals the tag". That claim is the
# contract (deployed == declared), so the gap is closed here, not
# accepted: any untracked (non-ignored) file means the on-disk tree is
# not exactly the tagged tree, and verify fails closed. The operator
# commits the content and re-verifies, or removes it. Tracked
# modifications are already covered by check 2; this adds the rest of
# `git status --porcelain`'s surface.
[ -z "$(git status --porcelain --untracked-files=normal)" ] || {
  echo "verify_release: on-disk tree is not exactly ${TAG} (untracked files present)" >&2
  exit 1
}

# 3. A GitHub Release object must exist (release.yml creates it as a
# DRAFT; draft or published both satisfy this — publishing the draft is
# the human step that makes the release notes page visible; the tag push
# itself is already the public moment for HACS, zip_release=false).
command -v gh >/dev/null 2>&1 || {
  echo "verify_release: gh (GitHub CLI) is required to verify the release object" >&2
  exit 1
}
gh release view "${TAG}" >/dev/null || {
  echo "verify_release: no GitHub release object for ${TAG}" >&2
  exit 1
}

echo "verify_release: ${TAG} exists on origin, tree matches, release object present"
