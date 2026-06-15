#!/usr/bin/env bash
# Rebuild the custom Jellyfin web client and deploy it. After the one-time
# setup-webdir.sh, this needs NO sudo and NO Jellyfin restart — just hard-refresh.
set -euo pipefail

export NVM_DIR="$HOME/.nvm"
# shellcheck disable=SC1091
. "$NVM_DIR/nvm.sh"

cd "$HOME/netflixfin/jellyfin-web"

echo "Committing any source changes to the fork..."
git add -A && git commit -q -m "redeploy $(date +%F_%T)" || echo "(nothing new to commit)"

echo "Building production web client..."
npm run build:production

echo "Deploying to /opt/jellyfin-custom-web ..."
rsync -a --delete dist/ /opt/jellyfin-custom-web/

echo "Publishing to GitHub (origin main)..."
git push origin main || echo "(push skipped/failed — check '~/.local/bin/gh auth status')"

echo "Done. Hard-refresh the browser (Cmd/Ctrl+Shift+R) or relaunch the TV app."
