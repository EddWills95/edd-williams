#!/bin/sh
# Stops and removes the build-stats LaunchAgent. Leaves the Keychain item and logs alone.
set -eu

LABEL=com.edd-williams.build-stats
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
rm -f "$PLIST"
echo "Removed $LABEL"
