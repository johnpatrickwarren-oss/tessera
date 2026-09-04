// Renders REPORT.md from cells.json + manifest.json; pure, shared with check_report.mjs.
const f = (x, d = 4) => (x == null || !Number.isFinite(x) ? '—' : x.toFixed(d));
const held = (ds) => ds.length > 0 && ds.every((d) => d.verdict === 'HELD');
const bar = (d) => f(d.delta + 3 * d.fcr_se);

function header(cells, manifest) {
  const dev = cells.reduce((a, c) => a + c.closed_form_deviations, 0);
  const sign = cells.reduce((a, c) => a + c.margin_sign_mismatches, 0);
  return `tessera \`${manifest.git_sha}\`, engine ${manifest.engine_version}; N = ${manifest.n} per Δ, K = ${manifest.K} shards (${manifest.F} faulted), T = ${manifest.T}, q = ${manifest.q}, fcrDelta ${manifest.deltas.join('/')}, fixed baseline fits (seed ${manifest.fit_seed}, ${manifest.fit_ticks} ticks). Monte-Carlo truth M = ${manifest.truth_M}. Wall ${manifest.wall_seconds} s. Closed-form deviations > 1e-12: ${dev}. Margin-sign mismatches: ${sign}. Mode-A dispatches: ${manifest.mode_a_dispatches}; Mode-A intervals: ${manifest.mode_a_intervals}.`;
}

function cellRows(cells) {
  const rows = ['| Δ | rule | δ | mean |S| | fcr | se | bar | verdict | false-dispatch shards (P2: n, miss) | excludes 0 on faulted (P3) | mean half-width | width ratio |', '|---|---|---|---|---|---|---|---|---|---|---|---|'];
  for (const c of cells) for (const d of c.per_delta) {
    rows.push(`| ${c.delta_shift} | ${c.rule} | ${d.delta} | ${f(c.mean_selected, 2)} | ${f(d.fcr)} | ${f(d.fcr_se)} | ${bar(d)} | ${d.verdict} | ${d.exact_n}, ${f(d.exact_miss)} | ${f(d.excludes_zero_faulted, 3)} | ${f(d.mean_half_width, 3)} | ${f(d.width_ratio, 3)} |`);
  }
  return rows;
}

function structuralHeld(cells, manifest) {
  const clean = cells.every((c) => c.closed_form_deviations === 0 && c.margin_sign_mismatches === 0);
  return clean && manifest.mode_a_dispatches === 0 && manifest.mode_a_intervals === 0 && manifest.shape_check === 'HELD';
}

function endpointLines(cells, manifest) {
  const p1a = cells.filter((c) => c.rule === 'B' && c.delta_shift === 0).flatMap((c) => c.per_delta);
  const p1b = cells.filter((c) => c.rule === 'A' && c.delta_shift > 0).flatMap((c) => c.per_delta);
  return [
    `- **P1a exact-truth FCR under extremeness selection (ship gate):** ${held(p1a) ? 'HELD' : 'FAILED'} — ${p1a.map((d) => `δ ${d.delta}: ${f(d.fcr)} ≤ ${bar(d)}`).join('; ')}.`,
    `- **P1b FCR under the shipped rule on faulted windows:** ${held(p1b) ? 'HELD' : 'FAILED'} — ${p1b.map((d) => `${f(d.fcr)} vs ${bar(d)}`).join('; ')}.`,
    `- **P2 false-dispatch shards covered (reported):** ${p1b.map((d) => `n = ${d.exact_n}, miss ${f(d.exact_miss)}`).join('; ')}.`,
    `- **P3 informativeness (reported):** faulted interval excludes 0 on ${p1b.map((d) => f(d.excludes_zero_faulted, 3)).join(', ')}; width ratio ${p1b.map((d) => f(d.width_ratio, 3)).join(', ')}.`,
    `- **P4 structural (closed form, margin sign, Mode A, shape):** ${structuralHeld(cells, manifest) ? 'HELD' : 'FAILED'}.`,
  ];
}

function truthRows(manifest) {
  const rows = ['| Δ | mean θ | min θ | max θ | mean se |', '|---|---|---|---|---|'];
  for (const t of manifest.truth) rows.push(`| ${t.delta_shift} | ${f(t.mean_theta, 3)} | ${f(t.min_theta, 3)} | ${f(t.max_theta, 3)} | ${f(t.mean_se, 4)} |`);
  return rows;
}

export function render(cells, manifest) {
  const L = [`# REPORT — 2026-09-action-surface, run ${manifest.run}`, '', header(cells, manifest), '', ...cellRows(cells), '', '## Endpoints', '', ...endpointLines(cells, manifest), '', '## Monte-Carlo truth (faulted shards, residual units)', '', ...truthRows(manifest), ''];
  return L.join('\n') + '\n';
}
