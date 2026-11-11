#!/bin/bash
# Copies the Neurosift design system (src/ui, tokens, fonts, migration count) from a pinned commit.
# Usage: scripts/sync-ui.sh [path to a jguerrero-prog/neurosift clone, default ../neurosift]
set -euo pipefail

NEUROSIFT_SHA=48797e492743bc805f52f0fbc8ae5d9bf6033fdc
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
NEUROSIFT_DIR="${1:-$ROOT/../neurosift}"
FILES=(src/ui src/css/tokens.css src/css/fonts.css design-system/migration/count.mjs)

git -C "$NEUROSIFT_DIR" fetch --quiet origin
STAGE="$(mktemp -d)"
git -C "$NEUROSIFT_DIR" archive "$NEUROSIFT_SHA" "${FILES[@]}" | tar -x -C "$STAGE"

mkdir -p "$ROOT/src/ui" "$ROOT/src/css"
rsync -a --delete "$STAGE/src/ui/" "$ROOT/src/ui/"
cp "$STAGE/src/css/tokens.css" "$STAGE/src/css/fonts.css" "$ROOT/src/css/"
cp "$STAGE/design-system/migration/count.mjs" "$ROOT/scripts/count.mjs"

cat >"$ROOT/src/ui/SOURCE.md" <<EOF
# Source

Copied by \`scripts/sync-ui.sh\` from [jguerrero-prog/neurosift](https://github.com/jguerrero-prog/neurosift/tree/$NEUROSIFT_SHA/src/ui)
at commit \`$NEUROSIFT_SHA\`, together with \`src/css/tokens.css\`, \`src/css/fonts.css\` and \`scripts/count.mjs\`
(from \`design-system/migration/count.mjs\`).

Do not edit these files here. Change them in Neurosift, then update the commit in the script and run it again.
EOF

echo "Synced ${FILES[*]} from neurosift@$NEUROSIFT_SHA"
