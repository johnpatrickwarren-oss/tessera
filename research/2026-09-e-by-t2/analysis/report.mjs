// Renders REPORT.md from cells.json + manifest.json; pure, shared with check_report.mjs.
const f = (x, d = 4) => (x == null || !Number.isFinite(x) ? '—' : x.toFixed(d));
const bar = (c, s) => f(c.delta + 3 * s);
const pooled = (cells) => cells.filter((c) => c.band === 'all');

function header(cells, manifest) {
  const s = manifest.structural, e = manifest.equality;
  return [
    `tessera \`${manifest.tessera_sha}\`, engine ${manifest.engine_version}, clustersynth \`${manifest.clustersynth_sha}\`; ${manifest.n_replications} replications = ${manifest.arms.length} arms × ${manifest.bands.length} bands × ${manifest.seeds.length} seeds; K = ${manifest.K} shards, counter ${manifest.counter}, ${manifest.t_healthy}-tick healthy baseline and a ${manifest.t_mon - manifest.mon_start}-tick monitoring window at dt = ${manifest.dt_s} s, ${manifest.n_cycles} cycles; q = ${manifest.q}, fcrDelta ${manifest.deltas.join('/')}, ρ = ${manifest.rho}; gpu faults at rate ${manifest.fault_rate}, shared events ${manifest.shared_faults}. Exceptions: ${manifest.exceptions}.`,
    '',
    `Structural: actions without an interval ${s.no_effect}; closed-form deviations > 1e-12 ${s.closed_form}; α_i deviations ${s.alpha_i}; margin-sign mismatches ${s.margin_sign}; replications whose dispatch set differs across δ ${s.delta_dispatch_mismatch}; hidden-arm counters differing from infamily ${s.hidden_counters_mismatch} of ${e.cells}; study feed at offset 0 equals bundleFeed: ${s.feed_offset0_equal}. Dispatch sets differing from infamily: nonlinear ${e.nonlinear_dispatch_differs}, hidden ${e.hidden_dispatch_differs} of ${e.cells} (band, seed) cells.`,
  ];
}

function armRows(cells) {
  const rows = ['| arm | δ | N | level actions | fcr level | se | bar | P1a | scored actions | fcr scored | se | bar | P1b |', '|---|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const c of pooled(cells)) rows.push(`| ${c.arm} | ${c.delta} | ${c.n} | ${c.n_level} | ${f(c.fcr_level)} | ${f(c.fcr_level_se)} | ${bar(c, c.fcr_level_se)} | ${c.verdict_level} | ${c.n_scored} | ${f(c.fcr_scored)} | ${f(c.fcr_scored_se)} | ${bar(c, c.fcr_scored_se)} | ${c.verdict_scored} |`);
  return rows;
}

function bandRows(cells) {
  const rows = ['| arm | band | δ | N | dispatched/rep | level/rep | fcr level | se | verdict | fcr scored | se | verdict |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const c of cells.filter((x) => x.band !== 'all')) rows.push(`| ${c.arm} | ${c.band} | ${c.delta} | ${c.n} | ${f(c.mean_dispatched, 2)} | ${f(c.mean_level, 2)} | ${f(c.fcr_level)} | ${f(c.fcr_level_se)} | ${c.verdict_level} | ${f(c.fcr_scored)} | ${f(c.fcr_scored_se)} | ${c.verdict_scored} |`);
  return rows;
}

function licenceRows(cells) {
  const rows = ['| arm | replications with a Mode-A cycle | Mode-A cycle fraction | revoked withdrawals | mean passing fraction, last cycle |', '|---|---|---|---|---|'];
  for (const c of pooled(cells).filter((x) => x.delta === cells[0].delta)) rows.push(`| ${c.arm} | ${f(c.mode_a_rep_frac, 3)} | ${f(c.mode_a_cycle_frac, 3)} | ${c.revoked} | ${f(c.mean_calib_frac_last, 3)} |`);
  return rows;
}

function classRows(cells) {
  const rows = ['| arm | δ | class | n | miss | excludes 0 | mean half-width | mean \\|θ\\| |', '|---|---|---|---|---|---|---|---|'];
  for (const c of pooled(cells)) for (const cls of ['null', 'level', 'path', 'other']) { const s = c.classes[cls]; rows.push(`| ${c.arm} | ${c.delta} | ${cls} | ${s.n} | ${f(s.miss)} | ${f(s.excludes_zero, 3)} | ${f(s.mean_half_width, 3)} | ${f(s.mean_abs_theta, 3)} |`); }
  return rows;
}

function nullRows(manifest) {
  const rows = ['| arm | null shards | mean S_T/T | sd | noise-only sd |', '|---|---|---|---|---|'];
  for (const [arm, s] of Object.entries(manifest.null_check)) rows.push(`| ${arm} | ${s.n} | ${f(s.mean)} | ${f(s.sd)} | ${f(s.noise_only_sd)} |`);
  return rows;
}

function structuralHeld(manifest) {
  const s = manifest.structural;
  return s.no_effect === 0 && s.closed_form === 0 && s.alpha_i === 0 && s.margin_sign === 0 && s.delta_dispatch_mismatch === 0 && s.hidden_counters_mismatch === 0 && s.feed_offset0_equal === true;
}

function endpointLines(cells, manifest) {
  const p = pooled(cells);
  const line = (key, verdictKey, name) => `- **${name}:** ` + p.map((c) => `${c.arm} δ ${c.delta}: ${f(c[key])} (${c[verdictKey]})`).join('; ') + '.';
  const p1aAll = p.every((c) => c.verdict_level !== 'FAILED') ? (p.some((c) => c.verdict_level === 'NOT-EXECUTABLE') ? 'HELD where executable' : 'HELD') : 'FAILED';
  const p1bAll = p.every((c) => c.verdict_scored !== 'FAILED') ? (p.some((c) => c.verdict_scored === 'NOT-EXECUTABLE') ? 'HELD where executable' : 'HELD') : 'FAILED';
  return [
    line('fcr_level', 'verdict_level', `P1a level-shift FCR under the loop's own dispatch — ${p1aAll}`),
    line('fcr_scored', 'verdict_scored', `P1b FCR over every action with an exact truth — ${p1bAll}`),
    `- **P2 licence (reported):** replications with a Mode-A cycle — ` + p.filter((c) => c.delta === manifest.deltas[0]).map((c) => `${c.arm} ${f(c.mode_a_rep_frac, 3)}`).join(', ') + '.',
    `- **P3 exact-null actions covered (reported):** ` + p.map((c) => `${c.arm} δ ${c.delta}: n = ${c.classes.null.n}, miss ${f(c.classes.null.miss)}`).join('; ') + '.',
    `- **P4 structural:** ${structuralHeld(manifest) ? 'HELD' : 'FAILED'}.`,
  ];
}

export function render(cells, manifest) {
  const L = [`# REPORT — 2026-09-e-by-t2, run ${manifest.run}`, '', ...header(cells, manifest), '', '## Endpoints', '', ...endpointLines(cells, manifest), '',
    '## Per arm, pooled over bands', '', ...armRows(cells), '', '## Per (arm, band)', '', ...bandRows(cells), '', '## The licence (P2), per arm', '', ...licenceRows(cells), '',
    '## Per class', '', ...classRows(cells), '', '## Null instrument check (full-window S_T/T on untouched shards)', '', ...nullRows(manifest), ''];
  return L.join('\n') + '\n';
}
