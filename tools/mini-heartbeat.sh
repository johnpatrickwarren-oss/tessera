#!/bin/sh
# tools/mini-heartbeat.sh — MBP-side watchdog for the mini's telemetry collector.
#
# WHY. The mini went dark 2026-07-13 → 2026-07-27 and nobody noticed for 14 days, restarting the
# 56-day baseline clock (gate slipped 08-29 → ~09-21). autorestart is now on (power-loss
# self-heals), and this closes the other half: a dead/stale collector gets NOTICED within hours.
#
# Checks (in escalating specificity — each failure mode gets its own message):
#   1. mini reachable over tailscale (ping);
#   2. collector-status.json readable over ssh (BatchMode — needs the existing key);
#   3. lastSample fresh (< 30 min old).
# Failure → macOS notification + a MODAL DIALOG (persists up to 1 h) + a FAIL line in
# ~/Library/Logs/tessera-mini-heartbeat.log. Success → an OK line only (silent).
#
# WHY the dialog (2026-08-19). During the 08-17→08-19 unreachability the script FAILed six
# times and `display notification` surfaced none of them — banners are transient and drop
# silently under Focus / locked screen / missing Notification-Center grant for osascript.
# A dialog stays on screen until dismissed (or 1 h), so a FAIL survives until it is seen.
#
# Install (user LaunchAgent, every 6 h + at load — no sudo needed):
#   cp tools/com.tessera.mini-heartbeat.plist ~/Library/LaunchAgents/
#   launchctl load ~/Library/LaunchAgents/com.tessera.mini-heartbeat.plist
#
# NB the status read itself lands in the mini's telemetry (the mini measures itself); one ssh cat
# per 6 h is negligible against the 1 Hz stream and is deliberately NOT journaled.

MINI=100.84.57.58
USER_AT=johnwarren
LOG="$HOME/Library/Logs/tessera-mini-heartbeat.log"
mkdir -p "$(dirname "$LOG")"

fail() {
  echo "$(date +%Y-%m-%dT%H:%M:%S%z) FAIL: $1" >> "$LOG"
  osascript -e "display notification \"$1\" with title \"Tessera mini heartbeat\" sound name \"Basso\"" 2>/dev/null
  # Modal fallback: persists until dismissed (or 1 h), unlike the droppable banner above.
  # Blocking on purpose — launchd reaps the process group on exit, so a backgrounded dialog
  # would die with the script. 1 h cap < the 6 h StartInterval, so runs never overlap.
  osascript -e "tell application \"System Events\" to display dialog \"$1\" with title \"Tessera mini heartbeat FAIL\" buttons {\"OK\"} default button 1 with icon caution giving up after 3600" >/dev/null 2>&1
  exit 1
}

ping -c 2 -t 5 "$MINI" >/dev/null 2>&1 || fail "mini unreachable (ping $MINI) — collector state unknown"

S=$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$USER_AT@$MINI" \
  'cat ~/concord/telemetry/data/collector-status.json 2>/dev/null || cat ~/concord/telemetry/collector-status.json 2>/dev/null')
[ -n "$S" ] || fail "mini up but collector-status.json unreadable"

LAST=$(printf '%s' "$S" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin)["lastSample"])' 2>/dev/null)
[ -n "$LAST" ] || fail "collector-status.json unparseable"

NOW=$(( $(date +%s) * 1000 ))
AGE_MIN=$(( (NOW - LAST) / 60000 ))
[ "$AGE_MIN" -lt 30 ] || fail "collector STALE: last sample ${AGE_MIN} min ago"

echo "$(date +%Y-%m-%dT%H:%M:%S%z) OK: collector fresh (${AGE_MIN} min)" >> "$LOG"
