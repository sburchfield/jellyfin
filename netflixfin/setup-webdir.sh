#!/usr/bin/env bash
# ONE-TIME setup (run with sudo). Moves the custom Jellyfin web client out of
# apt's reach so package updates can't silently overwrite it, and makes future
# deploys sudo-free. Also prunes the piled-up backups.
set -euo pipefail

CUSTOM=/opt/jellyfin-custom-web
SRC=/home/sam/netflixfin/jellyfin-web/dist
DEFAULT=/etc/default/jellyfin
OWNER=sam

echo "1) Creating $CUSTOM (owned by $OWNER, so deploys need no sudo)..."
mkdir -p "$CUSTOM"
rsync -a --delete "$SRC"/ "$CUSTOM"/
chown -R "$OWNER:$OWNER" "$CUSTOM"

echo "2) Pointing Jellyfin --webdir at $CUSTOM..."
cp "$DEFAULT" "$DEFAULT.bak-$(date +%F)"
sed -i "s#--webdir=/usr/share/jellyfin/web#--webdir=$CUSTOM#" "$DEFAULT"
grep -- --webdir "$DEFAULT"

echo "3) Pruning old backups (the git branch is the real backup now)..."
rm -rf /usr/share/jellyfin/web.bak-*

echo "4) Restarting Jellyfin to pick up the new web dir..."
systemctl restart jellyfin

echo "Done. Jellyfin now serves your custom client from $CUSTOM."
echo "apt updates to jellyfin-web can no longer overwrite it."
