#!/bin/bash

# Incremental deploy to Home Assistant via SMB mount
# Runs with sudo for SMB mount operations

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

FORCE=0
DRY_RUN=0
VERBOSE=0

usage() {
    echo "Usage: $0 [--force] [--dry-run] [--verbose]"
    echo "  --force       Copy all tracked files (ignore manifest)"
    echo "  --dry-run     Show actions only (no changes)"
    echo "  --verbose     Show file-level operations"
}

while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=1
            shift
            ;;
        --dry-run)
            DRY_RUN=1
            shift
            ;;
        --verbose|-v)
            VERBOSE=1
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "Unknown parameter: $1" >&2
            usage >&2
            exit 1
            ;;
    esac
done

REPO_ROOT=$(git rev-parse --show-toplevel 2>/dev/null || true)
if [[ -z "${REPO_ROOT}" ]]; then
    echo -e "${RED}❌ Not a git repository${NC}" >&2
    exit 1
fi

LOCAL_PATH="${LOCAL_PATH:-${REPO_ROOT}/custom_components/oig_cloud}"
SMB_MOUNT="${SMB_MOUNT:-/Volumes/config}"
MANIFEST_FILE="${MANIFEST_FILE:-${REPO_ROOT}/.deploy_manifest.json}"
HA_SSH_ALIAS="${HA_SSH_ALIAS:-ha}"
HA_CONFIG="${HA_CONFIG:-${REPO_ROOT}/.ha_config}"

# Load HA config if exists
if [[ -f "${HA_CONFIG}" ]]; then
    source "${HA_CONFIG}"
fi

if [[ -z "${HA_URL}" ]] && [[ -n "${HA_HOST}" ]]; then
    HA_URL="http://${HA_HOST}:8123"
fi

if [[ "${LOCAL_PATH}" != "${REPO_ROOT}"/* ]]; then
    echo -e "${RED}❌ LOCAL_PATH must be inside repo: ${LOCAL_PATH}${NC}" >&2
    exit 1
fi

RELATIVE_PATH="${LOCAL_PATH#${REPO_ROOT}/}"
REMOTE_ROOT="${SMB_MOUNT}/${RELATIVE_PATH}"

echo -e "${BLUE}🚀 Starting SMB deploy...${NC}"
echo "📍 Repo: ${REPO_ROOT}"
echo "📁 Source: ${LOCAL_PATH}"
echo "💾 SMB mount: ${SMB_MOUNT}"
echo "📦 Target: ${REMOTE_ROOT}"
echo "🧾 Manifest: ${MANIFEST_FILE}"
echo ""

# Auto-mount SMB if not already mounted
SMB_AUTO_MOUNTED=0
if ! mount | grep -q " ${SMB_MOUNT} "; then
    echo -e "${YELLOW}🔌 SMB mount not found, attempting auto-mount...${NC}"

    SMB_HOST="${SMB_HOST:-${HA_HOST}}"

    if [[ -z "${SMB_LOGIN}" ]] || [[ -z "${SMB_PASS}" ]] || [[ -z "${SMB_HOST}" ]]; then
        echo -e "${RED}❌ Missing SMB credentials in ${HA_CONFIG}${NC}" >&2
        echo "Required: SMB_LOGIN, SMB_PASS, and (SMB_HOST or HA_HOST)" >&2
        exit 1
    fi

    SMB_SHARE="config"
    echo "Mounting: //${SMB_HOST}/${SMB_SHARE} → ${SMB_MOUNT}"

    if mount_smbfs "//${SMB_LOGIN}:${SMB_PASS}@${SMB_HOST}/${SMB_SHARE}" "${SMB_MOUNT}" 2>/dev/null; then
        echo -e "${GREEN}✅ SMB mounted successfully${NC}"
        SMB_AUTO_MOUNTED=1
    else
        echo -e "${YELLOW}⚠️  Auto-mount failed, trying with sudo...${NC}"
        if [[ -z "${SUDO_PASS}" ]]; then
            echo -e "${RED}❌ SUDO_PASS not found in ${HA_CONFIG}${NC}" >&2
            echo "Add SUDO_PASS=your_password to .ha_config" >&2
            exit 1
        fi

        if ! [[ -d "${SMB_MOUNT}" ]]; then
            echo "${SUDO_PASS}" | sudo -S mkdir -p "${SMB_MOUNT}" 2>/dev/null || {
                echo -e "${RED}❌ Cannot create mount point: ${SMB_MOUNT}${NC}" >&2
                exit 1
            }
        fi

        if echo "${SUDO_PASS}" | sudo -S mount_smbfs "//${SMB_LOGIN}:${SMB_PASS}@${SMB_HOST}/${SMB_SHARE}" "${SMB_MOUNT}" 2>/dev/null; then
            echo -e "${GREEN}✅ SMB mounted successfully (with sudo)${NC}"
            SMB_AUTO_MOUNTED=1
        else
            echo -e "${RED}❌ SMB mount failed${NC}" >&2
            echo "Tried: mount_smbfs //${SMB_LOGIN}:***@${SMB_HOST}/${SMB_SHARE} ${SMB_MOUNT}" >&2
            exit 1
        fi
    fi
fi

if ! mount | grep -q " ${SMB_MOUNT} "; then
    echo -e "${RED}❌ SMB mount not accessible: ${SMB_MOUNT}${NC}" >&2
    exit 1
fi

if [[ ! -d "${LOCAL_PATH}" ]]; then
    echo -e "${RED}❌ LOCAL_PATH not found: ${LOCAL_PATH}${NC}" >&2
    exit 1
fi

echo -e "${YELLOW}🔨 Building V2...${NC}"
WWW_V2_DIR="${REPO_ROOT}/${RELATIVE_PATH}/www_v2"
if [[ ! -d "${WWW_V2_DIR}" ]]; then
    echo -e "${RED}❌ www_v2 directory not found: ${WWW_V2_DIR}${NC}" >&2
    exit 1
fi
if ! command -v npm >/dev/null 2>&1; then
    echo -e "${RED}❌ npm not found${NC}" >&2
    exit 1
fi
pushd "${WWW_V2_DIR}" >/dev/null
npx vite build
BUILD_RESULT=$?
popd >/dev/null
if [[ ${BUILD_RESULT} -ne 0 ]]; then
    echo -e "${RED}❌ V2 build failed${NC}" >&2
    exit 1
fi
echo -e "${GREEN}✅ V2 build complete${NC}"

# Regenerate pre-compressed siblings.
# nginx on the HA host has gzip_static ON: it serves assets/index.js.gz to every
# browser (they all send Accept-Encoding: gzip). Building index.js WITHOUT
# refreshing index.js.gz therefore pins browsers to the previous bundle forever,
# while curl (no gzip) sees the new one — a silent no-op deploy.
# Found 2026-07-18: the FE had been frozen on a 2026-06-26 build across several
# deploys because of exactly this. Do not remove.
echo -e "${YELLOW}🗜  Regenerating .gz siblings (gzip_static)...${NC}"
GZ_COUNT=0
while IFS= read -r asset; do
    gzip -9 -k -f "${asset}" && GZ_COUNT=$((GZ_COUNT + 1))
done < <(find "${WWW_V2_DIR}/dist" -type f \( -name '*.js' -o -name '*.css' -o -name '*.html' \) 2>/dev/null)
echo -e "${GREEN}✅ ${GZ_COUNT} .gz souborů přegenerováno${NC}"

TRACKED_FILES=()
while IFS= read -r line; do
    # Skip www_v2/src/ — only dist/ is needed on the server
    [[ "${line}" == *"/www_v2/src/"* ]] && continue
    [[ -n "${line}" ]] && TRACKED_FILES+=("${line}")
done < <(git -C "${REPO_ROOT}" ls-files "${RELATIVE_PATH}")

DIST_DIR="${WWW_V2_DIR}/dist"
if [[ -d "${DIST_DIR}" ]]; then
    while IFS= read -r line; do
        [[ -n "${line}" ]] && TRACKED_FILES+=("${RELATIVE_PATH}/www_v2/dist/${line}")
    done < <(cd "${DIST_DIR}" && find . -type f | sed 's|^\./||')
fi

if [[ ${#TRACKED_FILES[@]} -eq 0 ]]; then
    echo -e "${RED}❌ No tracked files found in ${RELATIVE_PATH}${NC}" >&2
    exit 1
fi

NEW_MANIFEST=$(mktemp)
FILES_LIST=$(mktemp)
printf "%s\n" "${TRACKED_FILES[@]}" > "${FILES_LIST}"

ACTIONS_OUTPUT=$(REPO_ROOT="${REPO_ROOT}" \
    MANIFEST_FILE="${MANIFEST_FILE}" \
    MANIFEST_OUT="${NEW_MANIFEST}" \
    FORCE="${FORCE}" \
    FILES_LIST="${FILES_LIST}" \
    python3 - <<'PY'
import hashlib
import json
import os

repo_root = os.environ["REPO_ROOT"]
manifest_file = os.environ["MANIFEST_FILE"]
manifest_out = os.environ["MANIFEST_OUT"]
force = os.environ.get("FORCE") == "1"
files_list = os.environ["FILES_LIST"]

with open(files_list, "r", encoding="utf-8") as f:
    files = [line.strip() for line in f if line.strip()]

def file_hash(path):
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(8192), b""):
            h.update(chunk)
    return h.hexdigest()

manifest = {"files": {}, "deployed_at": None}
if os.path.exists(manifest_file):
    try:
        with open(manifest_file, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except Exception:
        manifest = {"files": {}, "deployed_at": None}

prev = manifest.get("files", {})
new_files = {}
actions = []

for rel in files:
    abs_path = os.path.join(repo_root, rel)
    if not os.path.isfile(abs_path):
        continue
    h = file_hash(abs_path)
    new_files[rel] = h
    if force or prev.get(rel) != h:
        actions.append(("COPY", rel))

for rel in prev.keys():
    if rel not in new_files:
        actions.append(("DELETE", rel))

for action, rel in sorted(actions):
    print(f"{action}\t{rel}")

manifest_out_data = {
    "deployed_at": None,
    "files": new_files,
}

with open(manifest_out, "w", encoding="utf-8") as f:
    json.dump(manifest_out_data, f, indent=2, sort_keys=True)
    f.write("\n")
PY
)

COPY_COUNT=0
DELETE_COUNT=0

while IFS=$'\t' read -r action rel; do
    [[ -z "${action}" ]] && continue
    src="${REPO_ROOT}/${rel}"
    dest="${SMB_MOUNT}/${rel}"

    case "${action}" in
        COPY)
            COPY_COUNT=$((COPY_COUNT + 1))
            if [[ "${DRY_RUN}" -eq 1 ]]; then
                echo "DRY-RUN COPY: ${rel}"
            else
                if [[ -n "${SUDO_PASS}" ]]; then
                    echo "${SUDO_PASS}" | sudo -S mkdir -p "$(dirname "${dest}")" 2>/dev/null || true
                    echo "${SUDO_PASS}" | sudo -S cp "${src}" "${dest}"
                else
                    mkdir -p "$(dirname "${dest}")"
                    cp "${src}" "${dest}"
                fi
                if [[ "${VERBOSE}" -eq 1 ]]; then
                    echo "COPY: ${rel}"
                fi
            fi
            ;;
        DELETE)
            DELETE_COUNT=$((DELETE_COUNT + 1))
            if [[ "${DRY_RUN}" -eq 1 ]]; then
                echo "DRY-RUN DELETE: ${rel}"
            else
                if [[ -n "${SUDO_PASS}" ]]; then
                    echo "${SUDO_PASS}" | sudo -S rm -f "${dest}" 2>/dev/null
                else
                    rm -f "${dest}"
                fi
                if [[ "${VERBOSE}" -eq 1 ]]; then
                    echo "DELETE: ${rel}"
                fi
            fi
            ;;
        *)
            echo -e "${YELLOW}⚠️  Unknown action: ${action}${NC}" >&2
            ;;
    esac
done <<< "${ACTIONS_OUTPUT}"

if [[ "${DRY_RUN}" -eq 1 ]]; then
    rm -f "${NEW_MANIFEST}"
    rm -f "${FILES_LIST}"
    echo ""
    echo -e "${GREEN}✅ Dry-run completed${NC}"
    echo "  Files to copy: ${COPY_COUNT}"
    echo "  Files to delete: ${DELETE_COUNT}"
    exit 0
fi

mv "${NEW_MANIFEST}" "${MANIFEST_FILE}"
rm -f "${FILES_LIST}"

# Prune empty directories in target
if [[ -d "${REMOTE_ROOT}" ]]; then
    find "${REMOTE_ROOT}" -type d -empty -delete 2>/dev/null || true
fi

echo ""
echo -e "${GREEN}✅ Deployment completed${NC}"
echo "  Files copied: ${COPY_COUNT}"
echo "  Files deleted: ${DELETE_COUNT}"

# ---------------------------------------------------------------------------
# Reality check: fetch the bundle THE WAY A BROWSER DOES (Accept-Encoding: gzip)
# and prove the served bytes match what we just built. curl without gzip hits a
# different file (index.js vs index.js.gz) and will happily report success while
# every real browser gets a stale bundle. Verify like the real client, always.
# ---------------------------------------------------------------------------
if [[ -n "${HA_URL}" ]]; then
    echo ""
    echo -e "${YELLOW}🔍 Ověřuji nasazený FE jako prohlížeč (gzip)...${NC}"
    LOCAL_JS="${WWW_V2_DIR}/dist/assets/index.js"
    TMP_GZ=$(mktemp) && TMP_JS=$(mktemp)
    if curl -sS -m30 -H "Accept-Encoding: gzip" \
         "${HA_URL}/oig_cloud_static_v2/assets/index.js" -o "${TMP_GZ}" 2>/dev/null; then
        gunzip -c "${TMP_GZ}" > "${TMP_JS}" 2>/dev/null || cp "${TMP_GZ}" "${TMP_JS}"
        LOCAL_SUM=$(shasum -a 256 "${LOCAL_JS}" 2>/dev/null | cut -d' ' -f1)
        SERVED_SUM=$(shasum -a 256 "${TMP_JS}" 2>/dev/null | cut -d' ' -f1)
        if [[ "${LOCAL_SUM}" == "${SERVED_SUM}" ]]; then
            echo -e "${GREEN}✅ Prohlížeč dostane přesně tento build${NC}"
        else
            echo -e "${RED}❌ POZOR: servírovaný FE ≠ tento build!${NC}" >&2
            echo "   lokálně: ${LOCAL_SUM:0:16}  servírováno: ${SERVED_SUM:0:16}" >&2
            echo "   → prohlížeče dostávají STARÝ bundle (zkontroluj .gz / cache proxy)" >&2
        fi
    else
        echo -e "${YELLOW}⚠️  Ověření přeskočeno (endpoint nedostupný)${NC}"
    fi
    rm -f "${TMP_GZ}" "${TMP_JS}"
fi

echo ""
echo "🔄 Restarting Home Assistant..."
RESTARTED=0

if [[ "${RESTARTED}" -eq 0 ]] && [[ -n "${HA_TOKEN}" ]] && [[ -n "${HA_URL}" ]]; then
    if curl -sS -X POST \
        -H "Authorization: Bearer ${HA_TOKEN}" \
        -H "Content-Type: application/json" \
        "${HA_URL}/api/services/homeassistant/restart" >/dev/null 2>&1; then
        echo "  ✅ Restarted via HA API (${HA_URL})"
        RESTARTED=1
    fi
fi

if [[ "${RESTARTED}" -eq 0 ]] && command -v ssh >/dev/null 2>&1; then
    if ssh -o ConnectTimeout=5 "${HA_SSH_ALIAS}" "sudo docker restart homeassistant" >/dev/null 2>&1; then
        echo "  ✅ Restarted via docker (${HA_SSH_ALIAS})"
        RESTARTED=1
    elif ssh -o ConnectTimeout=5 "${HA_SSH_ALIAS}" "sudo ha core restart" >/dev/null 2>&1; then
        echo "  ✅ Restarted via sudo ha (${HA_SSH_ALIAS})"
        RESTARTED=1
    elif ssh -o ConnectTimeout=5 "${HA_SSH_ALIAS}" "ha core restart" >/dev/null 2>&1; then
        echo "  ✅ Restarted via ha (${HA_SSH_ALIAS})"
        RESTARTED=1
    elif ssh -o ConnectTimeout=5 "${HA_SSH_ALIAS}" "TOKEN=\$(sudo cat /run/s6/container_environment/HASSIO_TOKEN 2>/dev/null); if [ -n \"\$TOKEN\" ] && command -v curl >/dev/null 2>&1; then curl -s -H \"Authorization: Bearer \$TOKEN\" -X POST http://supervisor/core/restart >/dev/null 2>&1; else exit 1; fi" >/dev/null 2>&1; then
        echo "  ✅ Restarted via Supervisor API (${HA_SSH_ALIAS})"
        RESTARTED=1
    fi
fi

if [[ "${RESTARTED}" -eq 0 ]]; then
    echo "  ⚠️  Restart failed. Restart manually via WebUI."
fi

echo ""
echo "Next steps:"
echo "  1. Wait ~60s for Home Assistant to restart"
echo "  2. Check logs: ${HA_URL}/config/logs"
echo "  3. Verify integration: ${HA_URL}/config/integrations"
echo "  4. Hard refresh browser (Ctrl+F5 / Cmd+Shift+R) for V2 dashboard"

if [[ "${SMB_AUTO_MOUNTED}" -eq 1 ]]; then
    echo ""
    echo -e "${YELLOW}🔌 Unmounting auto-mounted SMB share...${NC}"
    if umount "${SMB_MOUNT}" 2>/dev/null; then
        echo -e "${GREEN}✅ SMB unmounted: ${SMB_MOUNT}${NC}"
    else
        echo -e "${YELLOW}⚠️  Could not unmount ${SMB_MOUNT} (may still be in use)${NC}"
    fi
fi
