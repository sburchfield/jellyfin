#!/usr/bin/env bash
# Rebuild the custom Jellyfin web client and deploy it. After the one-time
# setup-webdir.sh, this needs NO sudo and NO Jellyfin restart - just hard-refresh.
set -euo pipefail

REMOTE="${REMOTE:-origin}"
BRANCH="${BRANCH:-main}"
WEB_ROOT="${WEB_ROOT:-/opt/jellyfin-custom-web}"
PUSH=0

usage() {
    cat <<EOF
Usage: $(basename "$0") [--push]

Builds the checked-out clean commit, verifies the production bundle budget, and
deploys dist/ to ${WEB_ROOT}.

Options:
  --push    Push ${BRANCH} to ${REMOTE} after the build passes and before deploy.
EOF
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --push)
            PUSH=1
            shift
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage >&2
            exit 2
            ;;
    esac
done

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

cd "$HOME/netflixfin/jellyfin-web"

current_branch="$(git branch --show-current)"
if [[ "$current_branch" != "$BRANCH" ]]; then
    echo "Refusing to deploy from branch '$current_branch' (expected '$BRANCH')." >&2
    exit 1
fi

if [[ -n "$(git status --porcelain)" ]]; then
    echo "Refusing to deploy a dirty working tree. Commit or stash changes first:" >&2
    git status --short >&2
    exit 1
fi

echo "Checking ${REMOTE}/${BRANCH}..."
git fetch "$REMOTE" "$BRANCH"
upstream_ref="FETCH_HEAD"

if ! git merge-base --is-ancestor "$upstream_ref" HEAD; then
    echo "Refusing to deploy: local ${BRANCH} is behind or diverged from ${upstream_ref}." >&2
    echo "Run: git pull --ff-only ${REMOTE} ${BRANCH}" >&2
    exit 1
fi

if ! git merge-base --is-ancestor HEAD "$upstream_ref"; then
    if [[ "$PUSH" -ne 1 ]]; then
        echo "Refusing to deploy unpushed commits without --push." >&2
        echo "Either push first or rerun: $(basename "$0") --push" >&2
        exit 1
    fi
    needs_push=1
else
    needs_push=0
fi

commit="$(git rev-parse --short HEAD)"
echo "Building production web client at ${commit}..."
npm run build:production

if [[ "$needs_push" -eq 1 ]]; then
    echo "Publishing ${BRANCH} to ${REMOTE}..."
    git push "$REMOTE" "$BRANCH"
fi

echo "Deploying to ${WEB_ROOT} ..."
# Keep old hashed bundles/chunks around for TV webviews that retain an older
# index.html longer than normal browsers. The current index/config still get
# overwritten, but stale asset requests keep resolving instead of hanging at
# the startup splash.
rsync -a dist/ "$WEB_ROOT/"

echo "Done. Hard-refresh the browser (Cmd/Ctrl+Shift+R) or relaunch the TV app."
