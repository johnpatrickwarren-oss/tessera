#!/bin/sh
# tools/mini-heartbeat.sh — MBP-side watchdog for the mini's telemetry collector.
#
# WHY. The mini went dark 2026-07-13 → 2026-07-27 and nobody noticed for 14 days, restarting the
# 56-day baseline clock (gate slipped 08-29 → ~09-21). autorestart is now on (power-loss
# self-heals), and this closes the other half: a dead/stale collector gets NOTICED within hours.
#
# 2026-09-04 revision (the September false alarms). Between 08-27 and 09-03 this script raised
# thirteen FAILs and no OK while the mini was up the whole time (uptime 17 d, collector fresh):
# the LAPTOP was not on Tailscale, and the script could not tell "I cannot reach it" from "it is
# down". Three changes, each aimed at one of those runs:
#   • the laptop's own Tailscale state is checked FIRST; not running ⇒ SKIP (logged, quiet
#     banner, exit 0) — the collector state is unknown, which is not a collector failure;
#   • reachability is decided by ssh (the thing we need), retried 3× over ~1 min, with the
#     Tailscale peer's own Online flag consulted to word the failure ("mini offline on tailscale"
#     vs "mini online but ssh failed");
#   • the MODAL is reserved for the second consecutive failure (~12 h at the 6 h interval) or a
#     stale collector; a first failure is a banner + a WARN line. State in $STATE.
# The collector checks are unchanged: collector-status.json readable, lastSample < 30 min old.
# Log lines: OK / WARN / FAIL / SKIP, one per run, $HOME/Library/Logs/tessera-mini-heartbeat.log.
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
# every 6 h is the accepted cost, journaled by the collector's access log.
MINI=100.84.57.58
USER_AT=johnwarren
LOG="$HOME/Library/Logs/tessera-mini-heartbeat.log"
STATE="$HOME/Library/Application Support/tessera-mini-heartbeat.state"
TS_BIN="${TS_BIN:-/Applications/Tailscale.app/Contents/MacOS/Tailscale}"
mkdir -p "$(dirname "$LOG")" "$(dirname "$STATE")"
now() { date +%Y-%m-%dT%H:%M:%S%z; }
log() { echo "$(now) $1" >> "$LOG"; }
banner() { osascript -e "display notification \"$1\" with title \"Tessera mini heartbeat\"" 2>/dev/null; }
modal() {
  # Blocking on purpose — launchd reaps the process group on exit, so a backgrounded dialog
  # would die with the script. 1 h cap < the 6 h StartInterval, so runs never overlap.
  osascript -e "display notification \"$1\" with title \"Tessera mini heartbeat\" sound name \"Basso\"" 2>/dev/null
  osascript -e "tell application \"System Events\" to display dialog \"$1\" with title \"Tessera mini heartbeat FAIL\" buttons {\"OK\"} default button 1 with icon caution giving up after 3600" >/dev/null 2>&1
}
fails_so_far() { [ -f "$STATE" ] && cat "$STATE" 2>/dev/null || echo 0; }
set_fails() { printf '%s' "$1" > "$STATE"; }
# A failure: the first consecutive one is a WARN + banner; the second (or `force`) is a FAIL + modal.
fail() {
  n=$(( $(fails_so_far) + 1 )); set_fails "$n"
  if [ "$n" -ge 2 ] || [ "$2" = "force" ]; then log "FAIL: $1 (consecutive failures: $n)"; modal "$1"; exit 1; fi
  log "WARN: $1 (first failure; the modal fires on the next one)"; banner "$1"; exit 1
}

# 0. The laptop's own Tailscale state. Not running ⇒ the collector's state is unknown, not bad.
TS_JSON=$("$TS_BIN" status --json 2>/dev/null)
STATE_TS=$(printf '%s' "$TS_JSON" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin).get("BackendState",""))' 2>/dev/null)
if [ "$STATE_TS" != "Running" ]; then
  log "SKIP: laptop tailscale not running (state '${STATE_TS:-none}') — collector state unknown, not checked"
  banner "Heartbeat skipped: this laptop is not on Tailscale"
  exit 0
fi
PEER_ONLINE=$(printf '%s' "$TS_JSON" | /usr/bin/python3 -c '
import sys,json
d=json.load(sys.stdin)
p=[v for v in (d.get("Peer") or {}).values() if "'"$MINI"'" in (v.get("TailscaleIPs") or [])]
print("online" if p and p[0].get("Online") else ("offline" if p else "unknown"))' 2>/dev/null)

# 1. Reachability by ssh, retried: transient resets are common and are not outages.
S=""; i=0
while [ $i -lt 3 ]; do
  S=$(ssh -o BatchMode=yes -o ConnectTimeout=10 "$USER_AT@$MINI" \
    'cat ~/concord/telemetry/data/collector-status.json 2>/dev/null || cat ~/concord/telemetry/collector-status.json 2>/dev/null')
  [ -n "$S" ] && break
  i=$((i+1)); [ $i -lt 3 ] && sleep 20
done
if [ -z "$S" ]; then
  case "$PEER_ONLINE" in
    offline) fail "mini OFFLINE on tailscale (peer reports offline) — collector state unknown" force ;;
    online)  fail "mini online on tailscale but ssh failed 3x — collector-status.json unreadable" ;;
    *)       fail "mini unreachable (ssh 3x; tailscale peer state $PEER_ONLINE) — collector state unknown" ;;
  esac
fi

# 2–3. Collector status parseable and fresh.
LAST=$(printf '%s' "$S" | /usr/bin/python3 -c 'import sys,json;print(json.load(sys.stdin)["lastSample"])' 2>/dev/null)
[ -n "$LAST" ] || fail "collector-status.json unparseable" force
NOW=$(( $(date +%s) * 1000 ))
AGE_MIN=$(( (NOW - LAST) / 60000 ))
[ "$AGE_MIN" -lt 30 ] || fail "collector STALE: last sample ${AGE_MIN} min ago" force
set_fails 0
log "OK: collector fresh (${AGE_MIN} min; peer $PEER_ONLINE)"
