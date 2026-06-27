#!/usr/bin/env bash
# clustersynth-ramp.sh — scale-and-duration test harness.
#
# Ramps tessera detection over a list of NVL72 rack counts, each at a >= 2-month
# 1 Hz window (the snapshot guard — see docs/METHODOLOGY-scale-and-duration-testing.md),
# and prints the scaling curve. Generation uses the clustersynth `scenario` harness
# (CS_COUNTERS to restrict the counter set); analysis uses the streaming + multi-core
# scorer (CS_WORKERS).
#
# Usage:   tools/clustersynth-ramp.sh
# Env knobs (all optional):
#   RACKS="1 4 8 16"        rack tiers to run            (default "1 4 8 16")
#   MAX_RACKS=N             if set, RACKS = 1,2,4,...,N  (overrides RACKS)
#   DURATION_DAYS=60        window length in days; MIN 60 (FORCE=1 to override)
#   COUNTERS=gpu_temp_c     counter subset (CS_COUNTERS) (default gpu_temp_c)
#   WORKERS=<cores-1>       analysis worker threads      (default cores-1)
#   Q=0.05  SEED=1
#   CLUSTERSYNTH=../clustersynth
#   OUTDIR=<mktemp dir>     where bundles are written
#   KEEP=1                  keep bundles after analysis  (default: delete each tier)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLUSTERSYNTH="${CLUSTERSYNTH:-$HERE/../clustersynth}"
COUNTERS="${COUNTERS:-gpu_temp_c}"
DURATION_DAYS="${DURATION_DAYS:-60}"
Q="${Q:-0.05}"
SEED="${SEED:-1}"
KEEP="${KEEP:-0}"
OUTDIR="${OUTDIR:-$(mktemp -d "${TMPDIR:-/tmp}/cs-ramp.XXXXXX")}"
mkdir -p "$OUTDIR"

# --- snapshot guard (Rule 1) -------------------------------------------------
if [ "$DURATION_DAYS" -lt 60 ] && [ "${FORCE:-0}" != "1" ]; then
  echo "REFUSING: DURATION_DAYS=$DURATION_DAYS < 60 (2-month minimum)." >&2
  echo "  A short window is a snapshot, not a result. Set FORCE=1 only for a plumbing smoke test." >&2
  exit 2
fi
STEPS=$(( DURATION_DAYS * 86400 ))   # dt_s = 1 (1 Hz)

# --- worker count default = cores-1 -----------------------------------------
if [ -z "${WORKERS:-}" ]; then
  CORES="$( (command -v nproc >/dev/null && nproc) || sysctl -n hw.ncpu 2>/dev/null || echo 2)"
  WORKERS=$(( CORES > 1 ? CORES - 1 : 1 ))
fi

# --- rack tiers --------------------------------------------------------------
if [ -n "${MAX_RACKS:-}" ]; then
  RACKS=""; r=1; while [ "$r" -le "$MAX_RACKS" ]; do RACKS="$RACKS $r"; r=$(( r * 2 )); done
fi
RACKS="${RACKS:-1 4 8 16}"

command -v node >/dev/null || { echo "node not found" >&2; exit 1; }
[ -d "$CLUSTERSYNTH" ] || { echo "clustersynth not found at $CLUSTERSYNTH (set CLUSTERSYNTH=)" >&2; exit 1; }
TSX="$CLUSTERSYNTH/node_modules/.bin/tsx"
[ -x "$TSX" ] || { echo "tsx missing — run 'pnpm install' in $CLUSTERSYNTH" >&2; exit 1; }

( cd "$HERE" && pnpm build >/dev/null 2>&1 ) || { echo "tessera build failed" >&2; exit 1; }

echo "scale-and-duration ramp"
echo "  window=${DURATION_DAYS}d (${STEPS} ticks @ 1Hz)  counters=${COUNTERS}  workers=${WORKERS}  q=${Q}"
echo "  racks: ${RACKS}   outdir: ${OUTDIR}"
echo

for R in $RACKS; do
  SHARDS=$(( 72 * R ))
  CFG="$OUTDIR/cfg-$R.json"
  BUN="$OUTDIR/bundle-$R"
  cat > "$CFG" <<JSON
{ "family":"gb200", "pods":1, "racksPerPod":$R, "seed":$SEED,
  "window":{"steps":$STEPS,"dt_s":1},
  "nonstationarity":["thermal","diurnal","regime"],
  "faults":{"rate":0.05,"sharedFaults":2,"levels":["gpu","cdu"],
    "types":["mean_shift","drift","variance_collapse","detachment"]} }
JSON

  echo "==== R=$R racks ($SHARDS shards) ===="
  g0=$SECONDS
  CS_COUNTERS="$COUNTERS" "$TSX" "$CLUSTERSYNTH/src/cli.ts" scenario "$CFG" --out-dir "$BUN" >/dev/null 2>&1
  echo "  generated in $((SECONDS-g0))s, counters=$(du -h "$BUN/counters.ndjson" | cut -f1)"

  a0=$SECONDS
  CS_WORKERS="$WORKERS" node "$HERE/tools/clustersynth-scenario.js" "$BUN" "$Q" 2>/dev/null \
    | grep -E "shards, T=|gpu_temp_c |HEALTHY shards|worker threads" || true
  echo "  analysed in $((SECONDS-a0))s"

  [ "$KEEP" = "1" ] || rm -rf "$BUN"
  echo
done

echo "done. ${KEEP:+bundles kept in }$( [ "$KEEP" = 1 ] && echo "$OUTDIR" )"
