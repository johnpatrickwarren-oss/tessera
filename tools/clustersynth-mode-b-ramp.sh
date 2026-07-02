#!/usr/bin/env bash
# clustersynth-mode-b-ramp.sh — the Mode B (concurrent-control) scale/duration entry point (ADR 0019).
#
# Like clustersynth-ramp.sh, but generates both bundles WITH the labeled control arm (CS_CONTROL_ARM=1)
# and runs the Mode B harness (tools/clustersynth-mode-b.ts): treatment − control contrast → spatial
# null → e-BH, gated by the validity-class gate + the runtime calibration monitor + Wall-A whiteness.
#
# Per rack tier R, two same-topology/seed bundles (each emits a control twin per GPU → 2×72×R shards):
#   healthy  = faults OFF, BASE_DAYS @ BASE_DT  (default 60d hourly — the ≥2-month baseline, code-enforced)
#   monitor  = faults ON,  MON_HOURS @ MON_DT   (default 60d hourly = same cadence; set MON_DT=1 for 1 Hz)
#
# Usage:   tools/clustersynth-mode-b-ramp.sh
# Env knobs (all optional):
#   RACKS="1 4 8"          rack tiers (default "1 4 8");  MAX_RACKS=N → 1,2,4,...,N
#   BASE_DAYS=60 BASE_DT=3600  healthy baseline span/cadence (≥56d enforced by the guard in code)
#   MON_HOURS=1440 MON_DT=3600 monitoring window (hours) / cadence (s). For 1 Hz mixed cadence set e.g.
#                          MON_DT=1 MON_HOURS=6 — the harness then estimates φ/scale + calibration at the
#                          monitoring cadence from the pre-fault prefix (mixed-cadence path). Default =
#                          same cadence as the baseline (60d hourly monitoring).
#   COUNTERS=              CS_COUNTERS subset ('' = all 5 DCGM counters)
#   WORKERS=<all cores>    per-tier generation split width
#   SEED=1  Q=0.1
#   CLUSTERSYNTH=../clustersynth   OUTDIR=<mktemp>   KEEP=1 (keep bundles)
set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CLUSTERSYNTH="${CLUSTERSYNTH:-$HERE/../clustersynth}"
BASE_DAYS="${BASE_DAYS:-60}"; BASE_DT="${BASE_DT:-3600}"
MON_DT="${MON_DT:-$BASE_DT}"; MON_HOURS="${MON_HOURS:-$(( BASE_DAYS * 24 ))}"
COUNTERS="${COUNTERS:-}"
SEED="${SEED:-1}"; Q="${Q:-0.1}"; KEEP="${KEEP:-0}"
OUTDIR="${OUTDIR:-$(mktemp -d "${TMPDIR:-/tmp}/cs-modeb.XXXXXX")}"; mkdir -p "$OUTDIR"
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
RACKS="${RACKS:-1 4 8}"

command -v node >/dev/null || { echo "node not found" >&2; exit 1; }
TSX="$CLUSTERSYNTH/node_modules/.bin/tsx"
[ -x "$TSX" ] || { echo "tsx missing — run 'pnpm install' in $CLUSTERSYNTH" >&2; exit 1; }
( cd "$HERE" && pnpm build >/dev/null 2>&1 ) || { echo "tessera build failed" >&2; exit 1; }
( cd "$CLUSTERSYNTH" && pnpm build >/dev/null 2>&1 ) || { echo "clustersynth build failed" >&2; exit 1; }

BASE_STEPS=$(( BASE_DAYS * 86400 / BASE_DT ))
MON_STEPS=$(( MON_HOURS * 3600 / MON_DT ))

log(){ echo "$(date '+%F %T')  $*" | tee -a "$LOG"; }

# Generate one control-arm bundle, splitting shard generation across $WORKERS cores. A control twin
# travels with its treatment shard under CS_SHARD_RANGE, so concatenated ranges stay byte-identical.
# $1=tag(base|mon) $2=R $3=cfg-file
gen_split(){
  local tag="$1" R="$2" cfg="$3"
  local nshards=$((72*R)) K="$WORKERS" bundle="$OUTDIR/$tag-$R"
  local chunk=$(( (nshards + K - 1) / K )) k start
  rm -rf "$bundle" "$OUTDIR/parts-$tag-$R"; mkdir -p "$OUTDIR/parts-$tag-$R"
  # ADR 0022 triad / ADR 0021 contamination knobs flow through verbatim via `env` (an array can't act as an
  # inline assignment-prefix — bash resolves prefixes before expansion). The triad twin (#ctrl2) must be in
  # BOTH bundles (the fit needs c2 in the baseline); contamination is deterministic per seed but injects no
  # fault in the faults-off baseline, so it only manifests in the monitoring bundle.
  local TRIAD_ENV=(CS_TRIAD="${CS_TRIAD:-}" CS_CONTAMINATE="${CS_CONTAMINATE:-}" CS_CONTAMINATE_FRAC="${CS_CONTAMINATE_FRAC:-}" CS_DECORRELATE_FRAC="${CS_DECORRELATE_FRAC:-}" CS_FAULT_MAG="${CS_FAULT_MAG:-}")
  env CS_CONTROL_ARM=1 "${TRIAD_ENV[@]}" CS_COUNTERS="$COUNTERS" CS_SHARD_RANGE="0:$chunk" "$TSX" "$CLUSTERSYNTH/src/cli.ts" scenario "$cfg" --out-dir "$bundle" >>"$OUTDIR/gen.err" 2>&1 &
  for (( k=1; k<K; k++ )); do
    start=$((k*chunk)); [ "$start" -ge "$nshards" ] && break
    env CS_CONTROL_ARM=1 "${TRIAD_ENV[@]}" CS_COUNTERS="$COUNTERS" CS_SHARD_RANGE="$start:$chunk" CS_COUNTERS_ONLY=1 "$TSX" "$CLUSTERSYNTH/src/cli.ts" scenario "$cfg" --out-dir "$OUTDIR/parts-$tag-$R/p$k" >>"$OUTDIR/gen.err" 2>&1 &
  done
  wait
  # Delete each part right after appending: peak disk ≈ bundle + ONE part instead of ~2× the bundle
  # (at the 60d 1Hz R=8 triad tier the bundle is ~125 GB — the old all-parts-then-rm peak did not fit
  # on a 151 GB-free volume).
  for d in "$OUTDIR/parts-$tag-$R"/p*; do
    [ -f "$d/counters.ndjson" ] && cat "$d/counters.ndjson" >> "$bundle/counters.ndjson" && rm -f "$d/counters.ndjson"
  done
  rm -rf "$OUTDIR/parts-$tag-$R"
}

log "=== MODE B RAMP START — concurrent-control spatial null ==="
log "baseline ${BASE_DAYS}d@${BASE_DT}s (${BASE_STEPS} ticks)  monitoring ${MON_HOURS}h@${MON_DT}s (${MON_STEPS} ticks)  counters='${COUNTERS:-all}'  workers=${WORKERS}  racks:${RACKS}"

for R in $RACKS; do
  if [ -f "$OUTDIR/.done-$R" ]; then
    log "==== R=$R racks ($((72*R)) GPUs + $((72*R)) controls) — already complete, resuming past it ===="
    continue
  fi
  log "==== R=$R racks ($((72*R)) treatment + $((72*R)) control GPUs) ===="
  cat > "$OUTDIR/base-$R.json" <<JSON
{ "family":"gb200","pods":1,"racksPerPod":$R,"seed":$SEED, "controlArm":true,
  "window":{"steps":$BASE_STEPS,"dt_s":$BASE_DT},
  "nonstationarity":["thermal","diurnal","regime"], "faults": false }
JSON
  # PER-SHARD faults only (gpu level): the spatial null detects idiosyncratic per-shard anomalies, and
  # CANCELS common-mode (cdu/pod) events by design — so injecting cdu/pod faults would have the contrast
  # correctly ignore them (cool-loaded counters aside) and is out of scope here. Mean-affecting types.
  cat > "$OUTDIR/mon-$R.json" <<JSON
{ "family":"gb200","pods":1,"racksPerPod":$R,"seed":$SEED, "controlArm":true,
  "window":{"steps":$MON_STEPS,"dt_s":$MON_DT},
  "nonstationarity":["thermal","diurnal","regime"],
  "faults":{"rate":0.05,"sharedFaults":0,"levels":["gpu"],
    "types":["mean_shift","drift","detachment"]} }
JSON
  t0=$SECONDS
  gen_split base "$R" "$OUTDIR/base-$R.json"
  gen_split mon  "$R" "$OUTDIR/mon-$R.json"
  log "  generated baseline+monitoring in $((SECONDS-t0))s  (mon counters=$(du -sh "$OUTDIR/mon-$R/counters.ndjson" 2>/dev/null | cut -f1))"
  t1=$SECONDS
  node "$HERE/tools/clustersynth-mode-b.js" "$OUTDIR/base-$R" "$OUTDIR/mon-$R" "$Q" 2>>"$OUTDIR/ana.err" \
    | grep -E "baseline:|MIXED CADENCE|^  (gpu_temp_c|power_w|sm_util|hbm_bw_gbps|nvlink_tx_gbps) |AGGREGATE" | tee -a "$LOG"
  log "  analysed in $((SECONDS-t1))s"
  touch "$OUTDIR/.done-$R"
  [ "$KEEP" = "1" ] || rm -rf "$OUTDIR/base-$R" "$OUTDIR/mon-$R"
done
log "=== MODE B RAMP DONE ==="
