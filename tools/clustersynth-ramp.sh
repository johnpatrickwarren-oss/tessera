#!/usr/bin/env bash
# clustersynth-ramp.sh — the ONE correct scale/duration test entry point.
#
# Defaults encode everything we've learned (see docs/METHODOLOGY-scale-and-duration-testing.md):
#   • RIGHT HARNESS: baseline-monitor (robust ≥2-month baseline → e-detector → Wall-A gate → e-BH),
#     NOT the diagnostic scenario scorer.
#   • RIGHT REGIME: a long (≥2-month) HOURLY healthy baseline (cheap, accurate loadings) + a long
#     fine-cadence (1Hz by default) MONITORING window with faults — both genuinely long in wall-clock.
#   • SCALE: generation split across all cores via CS_SHARD_RANGE; analysis is parallel by default
#     (baseline-monitor uses all cores). The 2-month minimum is enforced in code (baseline-guard).
#
# Per rack tier R it generates two same-topology/seed bundles and runs baseline-monitor:
#   healthy  = faults OFF, BASE_DAYS @ BASE_DT (default 60d hourly)
#   monitor  = faults ON,  MON_DAYS  @ MON_DT  (default 14d @ 1Hz)
#
# Usage:   tools/clustersynth-ramp.sh
# Env knobs (all optional):
#   RACKS="1 4 8 16"        rack tiers (default "1 4 8 16");  MAX_RACKS=N → 1,2,4,...,N
#   BASE_DAYS=60 BASE_DT=3600   healthy baseline span/cadence (default 60d hourly)
#   MON_DAYS=14  MON_DT=1       monitoring span/cadence       (default 14d @ 1Hz)
#   COUNTERS=                 CS_COUNTERS subset ('' = all 5 DCGM counters)
#   WORKERS=<all cores>       analysis + per-tier gen split width
#   SEED=1  Q=0.05
#   CLUSTERSYNTH=../clustersynth   OUTDIR=<mktemp>   KEEP=1 (keep bundles)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLUSTERSYNTH="${CLUSTERSYNTH:-$HERE/../clustersynth}"
BASE_DAYS="${BASE_DAYS:-60}"; BASE_DT="${BASE_DT:-3600}"
MON_DAYS="${MON_DAYS:-14}";   MON_DT="${MON_DT:-1}"
COUNTERS="${COUNTERS:-}"
SEED="${SEED:-1}"; Q="${Q:-0.05}"; KEEP="${KEEP:-0}"
OUTDIR="${OUTDIR:-$(mktemp -d "${TMPDIR:-/tmp}/cs-ramp.XXXXXX")}"; mkdir -p "$OUTDIR"
LOG="$OUTDIR/ramp.log"

# 2-month baseline guard at the orchestration layer (code also enforces it).
if [ "$BASE_DAYS" -lt 56 ] && [ "${FORCE:-0}" != "1" ]; then
  echo "REFUSING: BASE_DAYS=$BASE_DAYS < 56 (the e-betting null needs a ~2-month baseline). FORCE=1 for a plumbing smoke." >&2
  exit 2
fi

if [ -z "${WORKERS:-}" ]; then
  WORKERS="$( (command -v nproc >/dev/null && nproc) || sysctl -n hw.ncpu 2>/dev/null || echo 4)"
fi
if [ -n "${MAX_RACKS:-}" ]; then RACKS=""; r=1; while [ "$r" -le "$MAX_RACKS" ]; do RACKS="$RACKS $r"; r=$((r*2)); done; fi
RACKS="${RACKS:-1 4 8 16}"

command -v node >/dev/null || { echo "node not found" >&2; exit 1; }
TSX="$CLUSTERSYNTH/node_modules/.bin/tsx"
[ -x "$TSX" ] || { echo "tsx missing — run 'pnpm install' in $CLUSTERSYNTH" >&2; exit 1; }
( cd "$HERE" && pnpm build >/dev/null 2>&1 ) || { echo "tessera build failed" >&2; exit 1; }

BASE_STEPS=$(( BASE_DAYS * 86400 / BASE_DT ))
MON_STEPS=$(( MON_DAYS * 86400 / MON_DT ))

log(){ echo "$(date '+%F %T')  $*" | tee -a "$LOG"; }

# Generate one bundle, splitting shard generation across $WORKERS cores (CS_SHARD_RANGE).
# $1=tag(base|mon) $2=R $3=cfg-file
gen_split(){
  local tag="$1" R="$2" cfg="$3"
  local nshards=$((72*R)) K="$WORKERS" bundle="$OUTDIR/$tag-$R"
  local chunk=$(( (nshards + K - 1) / K )) k start
  rm -rf "$bundle" "$OUTDIR/parts-$tag-$R"; mkdir -p "$OUTDIR/parts-$tag-$R"
  CS_COUNTERS="$COUNTERS" CS_SHARD_RANGE="0:$chunk" "$TSX" "$CLUSTERSYNTH/src/cli.ts" scenario "$cfg" --out-dir "$bundle" >>"$OUTDIR/gen.err" 2>&1 &
  for (( k=1; k<K; k++ )); do
    start=$((k*chunk)); [ "$start" -ge "$nshards" ] && break
    CS_COUNTERS="$COUNTERS" CS_SHARD_RANGE="$start:$chunk" CS_COUNTERS_ONLY=1 "$TSX" "$CLUSTERSYNTH/src/cli.ts" scenario "$cfg" --out-dir "$OUTDIR/parts-$tag-$R/p$k" >>"$OUTDIR/gen.err" 2>&1 &
  done
  wait
  for d in "$OUTDIR/parts-$tag-$R"/p*; do [ -f "$d/counters.ndjson" ] && cat "$d/counters.ndjson" >> "$bundle/counters.ndjson"; done
  rm -rf "$OUTDIR/parts-$tag-$R"
}

log "=== RAMP START — baseline-monitor pipeline ==="
log "baseline ${BASE_DAYS}d@${BASE_DT}s (${BASE_STEPS} ticks)  monitoring ${MON_DAYS}d@${MON_DT}s (${MON_STEPS} ticks)  counters='${COUNTERS:-all}'  workers=${WORKERS}  racks:${RACKS}"

for R in $RACKS; do
  # Resume: a completed tier drops a marker (survives bundle deletion + reboot). Re-running
  # the SAME command with the SAME OUTDIR skips finished tiers and continues the ramp.
  if [ -f "$OUTDIR/.done-$R" ]; then
    log "==== R=$R racks ($((72*R)) GPUs) — already complete, resuming past it ===="
    continue
  fi
  log "==== R=$R racks ($((72*R)) GPUs) ===="
  cat > "$OUTDIR/base-$R.json" <<JSON
{ "family":"gb200","pods":1,"racksPerPod":$R,"seed":$SEED,
  "window":{"steps":$BASE_STEPS,"dt_s":$BASE_DT},
  "nonstationarity":["thermal","diurnal","regime"], "faults": false }
JSON
  cat > "$OUTDIR/mon-$R.json" <<JSON
{ "family":"gb200","pods":1,"racksPerPod":$R,"seed":$SEED,
  "window":{"steps":$MON_STEPS,"dt_s":$MON_DT},
  "nonstationarity":["thermal","diurnal","regime"],
  "faults":{"rate":0.05,"sharedFaults":2,"levels":["gpu","cdu"],
    "types":["mean_shift","drift","variance_collapse","detachment"]} }
JSON
  t0=$SECONDS
  gen_split base "$R" "$OUTDIR/base-$R.json"
  gen_split mon  "$R" "$OUTDIR/mon-$R.json"
  log "  generated baseline+monitoring in $((SECONDS-t0))s  (mon counters=$(du -sh "$OUTDIR/mon-$R/counters.ndjson" 2>/dev/null | cut -f1))"
  t1=$SECONDS
  CS_WORKERS="$WORKERS" node "$HERE/tools/baseline-monitor.js" "$OUTDIR/base-$R" "$OUTDIR/mon-$R" 2>>"$OUTDIR/ana.err" \
    | grep -E "baseline:|^  (gpu_temp_c|power_w|sm_util|hbm_bw_gbps|nvlink_tx_gbps) |TRANSIENT|AGGREGATE|FLAGGED" | tee -a "$LOG"
  log "  analysed in $((SECONDS-t1))s"
  touch "$OUTDIR/.done-$R"   # resume marker (survives bundle deletion + reboot)
  [ "$KEEP" = "1" ] || rm -rf "$OUTDIR/base-$R" "$OUTDIR/mon-$R"
done
log "=== RAMP DONE ==="
