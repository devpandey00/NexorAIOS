#!/usr/bin/env bash
set -euo pipefail

TOOLKIT_DIR="${NEXOR_TOOLKIT_DIR:-$HOME/NexorToolkit}"
mkdir -p "$TOOLKIT_DIR"
cd "$TOOLKIT_DIR"

clone_or_update() {
  local name="$1" url="$2"
  if [[ -d "$name/.git" ]]; then
    echo "Updating $name"
    git -C "$name" fetch --depth 1 origin
    git -C "$name" reset --hard "origin/$(git -C "$name" remote show origin | awk '/HEAD branch/ {print $NF}')" >/dev/null 2>&1 || git -C "$name" pull --ff-only
  else
    echo "Cloning $name"
    git clone --depth 1 "$url" "$name"
  fi
}

clone_or_update "NexorAIOS" "https://github.com/devpandey00/NexorAIOS.git"
clone_or_update "Nexor-os" "https://github.com/devpandey00/Nexor-os.git"
clone_or_update "devpandey00.github.io" "https://github.com/devpandey00/devpandey00.github.io.git"
clone_or_update "yourname.github.io" "https://github.com/devpandey00/yourname.github.io.git"

clone_or_update "n8n" "https://github.com/n8n-io/n8n.git"
clone_or_update "playwright" "https://github.com/microsoft/playwright.git"
clone_or_update "crawlee" "https://github.com/apify/crawlee.git"
clone_or_update "twenty" "https://github.com/twentyhq/twenty.git"
clone_or_update "chatwoot" "https://github.com/chatwoot/chatwoot.git"
clone_or_update "cal.com" "https://github.com/calcom/cal.com.git"
clone_or_update "posthog" "https://github.com/PostHog/posthog.git"
clone_or_update "metabase" "https://github.com/metabase/metabase.git"
clone_or_update "remotion" "https://github.com/remotion-dev/remotion.git"
clone_or_update "listmonk" "https://github.com/knadh/listmonk.git"

echo
echo "NexorToolkit ready at: $TOOLKIT_DIR"
echo "Repos were cloned/updated only; no external service was started."
