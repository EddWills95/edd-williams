#!/bin/sh
# Installs the build-stats job as a LaunchAgent: runs now (RunAtLoad), then hourly.
# Re-running replaces the existing agent. Undo with ./uninstall.sh.
set -eu

LABEL=com.edd-williams.build-stats
DIR=$(cd "$(dirname "$0")" && pwd)
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOGS="$HOME/Library/Logs"

NODE=$(command -v node || true)
if [ -z "$NODE" ]; then
	echo "node not found on PATH; install Node 22+ first" >&2
	exit 1
fi
if ! security find-generic-password -s build-stats-token >/dev/null 2>&1; then
	echo "No Keychain item 'build-stats-token'. Create it first (see README.md)." >&2
	exit 1
fi

# launchd starts with a bare PATH; give the job git and the same node it was installed with.
JOB_PATH="$(dirname "$NODE"):/usr/bin:/bin:/usr/sbin:/sbin:/opt/homebrew/bin:/usr/local/bin"

mkdir -p "$HOME/Library/LaunchAgents" "$LOGS"
sed -e "s|__NODE__|$NODE|g" \
	-e "s|__JOB__|$DIR/job.js|g" \
	-e "s|__DIR__|$DIR|g" \
	-e "s|__PATH__|$JOB_PATH|g" \
	-e "s|__LOGS__|$LOGS|g" \
	"$DIR/$LABEL.plist.template" >"$PLIST"
plutil -lint "$PLIST" >/dev/null

launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
launchctl bootstrap "gui/$(id -u)" "$PLIST"

echo "Installed $PLIST"
echo "Logs: $LOGS/build-stats.log (first run starts now)"
