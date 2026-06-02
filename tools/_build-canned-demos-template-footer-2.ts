// tools/_build-canned-demos-template-footer-2.ts — HTML footer part 2, VERBATIM.
// Plain template-string fragment; concatenated in the footer index. No logic changes.

export const FOOTER_PART_2 = `
  function clearSvg() {
    while (svgEl.firstChild) svgEl.removeChild(svgEl.firstChild);
  }

  function drawFrame(scenarioData, upToWindow) {
    clearSvg();
    var windows = scenarioData.windows;
    var totalW = windows.length;
    if (!totalW) return;

    var shardCount = windows[0].per_shard.length;

    // Threshold line
    var threshLine = document.createElementNS(SVG_NS, 'line');
    threshLine.setAttribute('x1', PAD_L);
    threshLine.setAttribute('x2', SVG_W - PAD_R);
    var ty = yCoord(LOG10_THRESHOLD);
    threshLine.setAttribute('y1', ty);
    threshLine.setAttribute('y2', ty);
    threshLine.setAttribute('stroke', '#f78166');
    threshLine.setAttribute('stroke-width', '1');
    threshLine.setAttribute('stroke-dasharray', '4 3');
    svgEl.appendChild(threshLine);

    // Axes
    var axisG = document.createElementNS(SVG_NS, 'g');
    axisG.setAttribute('stroke', '#30363d');
    axisG.setAttribute('stroke-width', '1');
    var xAxis = document.createElementNS(SVG_NS, 'line');
    xAxis.setAttribute('x1', PAD_L); xAxis.setAttribute('x2', SVG_W - PAD_R);
    xAxis.setAttribute('y1', SVG_H - PAD_B); xAxis.setAttribute('y2', SVG_H - PAD_B);
    axisG.appendChild(xAxis);
    var yAxis = document.createElementNS(SVG_NS, 'line');
    yAxis.setAttribute('x1', PAD_L); yAxis.setAttribute('x2', PAD_L);
    yAxis.setAttribute('y1', PAD_T); yAxis.setAttribute('y2', SVG_H - PAD_B);
    axisG.appendChild(yAxis);
    svgEl.appendChild(axisG);

    // Shard paths
    for (var s = 0; s < shardCount; s++) {
      var d = '';
      for (var w = 0; w <= upToWindow && w < totalW; w++) {
        var ps = windows[w].per_shard[s];
        var x = xCoord(w, totalW);
        var y = yCoord(clampLog10(ps.M_t));
        d += (w === 0 ? 'M ' : 'L ') + x.toFixed(1) + ' ' + y.toFixed(1) + ' ';
      }
      if (!d) continue;
      var pathEl = document.createElementNS(SVG_NS, 'path');
      pathEl.setAttribute('d', d.trim());
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke', COLORS[s % COLORS.length]);
      pathEl.setAttribute('stroke-width', '1.5');
      svgEl.appendChild(pathEl);
    }
  }

  function renderBadges(scenarioData, windowIdx) {
    badgesEl.innerHTML = '';
    var windows = scenarioData.windows;
    if (!windows.length) return;
    var wIdx = Math.min(windowIdx, windows.length - 1);
    var shards = windows[wIdx].per_shard;
    for (var i = 0; i < shards.length; i++) {
      var ps = shards[i];
      var span = document.createElement('span');
      span.className = 'badge ' + (ps.fired ? 'fire' : 'clean');
      span.textContent = ps.fired ? ps.shard_id + ' FIRE' : ps.shard_id + ' clean';
      badgesEl.appendChild(span);
    }
    // FDR selected badges
    var ts = scenarioData.terminal_state;
    if (ts.fdr_selected_indices && windowIdx >= windows.length - 1) {
      var divider = document.createElement('div');
      divider.style.marginTop = '8px';
      divider.style.fontSize = '0.75rem';
      divider.style.color = '#8b949e';
      divider.textContent = 'e-BH selected (K=' + ts.fdr_K + ', q=' + ts.fdr_qLevel + '):';
      badgesEl.appendChild(divider);
      for (var j = 0; j < ts.fdr_selected_indices.length; j++) {
        var span2 = document.createElement('span');
        span2.className = 'badge fire';
        span2.textContent = 'shard-' + String(ts.fdr_selected_indices[j]).padStart(2, '0') + ' (e-BH)';
        badgesEl.appendChild(span2);
      }
    }
  }

  function appendAuditEntry(text) {
    var li = document.createElement('li');
    li.textContent = text;
    auditEl.insertBefore(li, auditEl.firstChild);
  }

  function rebuildAuditUpToCurrentWindow(scenarioData) {
    auditEl.innerHTML = '';
    if (!scenarioData || !scenarioData.windows.length) return;
    var wIdx = Math.min(currentWindowIdx, scenarioData.windows.length - 1);
    for (var i = 0; i <= wIdx; i++) {
      var events = scenarioData.windows[i].events;
      for (var j = 0; j < events.length; j++) {
        appendAuditEntry('[w' + i + '] ' + JSON.stringify(events[j]));
      }
    }
  }

  function renderReasoningAndActions(scenarioData) {
    reasoningEl.textContent = scenarioData.reasoning;
    actionsEl.innerHTML = '';
    var actions = scenarioData.suggested_actions;
    for (var i = 0; i < actions.length; i++) {
      var li = document.createElement('li');
      li.textContent = actions[i];
      actionsEl.appendChild(li);
    }
  }

  function clearPanels() {
    auditEl.innerHTML = '';
    reasoningEl.textContent = '';
    actionsEl.innerHTML = '';
    badgesEl.innerHTML = '';
    metricsBodyEl.innerHTML = '';
    var famAEl = detectorsBodyEl ? detectorsBodyEl.querySelector('.det-fam-A') : null;
    if (famAEl) famAEl.textContent = 'Family A — betting e-process';
    clearSvg();
  }

  function updateWindowIndicator(scenarioData) {
    var total = scenarioData.windows.length;
    winInd.textContent = 'window ' + currentWindowIdx + ' / ' + total;
  }

  // ── R79: derive verdict status ──
  function deriveVerdictStatus(scenarioData, windowIdx) {
    if (!scenarioData.windows.length) return 'baseline';
    var wIdx = Math.min(windowIdx, scenarioData.windows.length - 1);
    var w = scenarioData.windows[wIdx];
    var ts = scenarioData.terminal_state;
    // Precedence: frozen > common-mode > fdr-selected > firing > baseline
    for (var i = 0; i <= wIdx; i++) {
      for (var j = 0; j < scenarioData.windows[i].events.length; j++) {
        var ev = scenarioData.windows[i].events[j];
        if (ev && ev.freeze_active === true) return 'frozen';
      }
    }
    if (ts.freeze_active === true && wIdx >= scenarioData.windows.length - 1) return 'frozen';
    if (ts.common_mode_candidates && ts.common_mode_candidates.length > 0
        && wIdx >= scenarioData.windows.length - 1) return 'common-mode';
    if (ts.fdr_selected_indices && ts.fdr_selected_indices.length > 0
        && wIdx >= scenarioData.windows.length - 1) return 'fdr-selected';
    for (var s = 0; s < w.per_shard.length; s++) {
      if (w.per_shard[s].fired === true) return 'firing';
    }
    if (wIdx === 0) return 'baseline';
    return 'clean';
  }

  function updateLiveVerdictBanner(scenarioData, windowIdx) {
    if (!scenarioData) return;
    liveBannerScenarioEl.textContent = scenarioData.scenario;
    var totalW = scenarioData.windows.length;
    liveBannerTickEl.textContent = windowIdx + ' / ' + (totalW - 1);
    var status = deriveVerdictStatus(scenarioData, windowIdx);
    liveBannerStatusEl.textContent = status;
    liveBannerStatusEl.className = 'status-' + status;
  }

  function renderMetricsPanel(scenarioData, windowIdx) {
    metricsBodyEl.innerHTML = '';
    if (!scenarioData.windows.length) return;
    var wIdx = Math.min(windowIdx, scenarioData.windows.length - 1);
    var w = scenarioData.windows[wIdx];
    for (var s = 0; s < w.per_shard.length; s++) {
      var ps = w.per_shard[s];
      var row = document.createElement('div');
      row.className = 'metric-row';
      var n  = document.createElement('span'); n.className = 'metric-name';     n.textContent = ps.shard_id;
      var m  = document.createElement('span'); m.className = 'metric-mt';       m.textContent = ps.M_t === null ? '—' : ps.M_t.toFixed(3);
      var rp = document.createElement('span'); rp.className = 'metric-residual'; rp.textContent = ps.residual_proxy === null ? '—' : ps.residual_proxy.toFixed(3);
      row.appendChild(n); row.appendChild(m); row.appendChild(rp);
      metricsBodyEl.appendChild(row);
    }
  }

  function renderDetectorsPanel(scenarioData, windowIdx) {
    var famA = detectorsBodyEl.querySelector('.det-fam-A');
    var famB = detectorsBodyEl.querySelector('.det-fam-B');
    var famC = detectorsBodyEl.querySelector('.det-fam-C');
    var famD = detectorsBodyEl.querySelector('.det-fam-D');
    var famE = detectorsBodyEl.querySelector('.det-fam-E');
    if (!famA) return;
    var wIdx = Math.min(windowIdx, scenarioData.windows.length - 1);
    var w = scenarioData.windows[wIdx];
    var pwd = w && w.per_window_detectors ? w.per_window_detectors : null;

    // Family A — real engine updateBettingState per-shard (unchanged from R79)
    var a = pwd ? pwd.family_a : null;
    if (a === null || a === undefined) {
      famA.textContent = 'Family A — (not exercised in this scenario)';
      famA.removeAttribute('title');
    } else {
      famA.textContent = 'Family A — fired ' + a.shards_fired_count + ' shards; max M_t = ' + (a.max_M_t === null ? '—' : a.max_M_t.toFixed(3));
      famA.setAttribute('title', 'real engine updateBettingState() per-shard');
    }

    // Families B/C/D/E — common shape
    var bcde = [
      { el: famB, key: 'family_b', label: 'B', stat_unit: 'max|M-1|' },
      { el: famC, key: 'family_c', label: 'C', stat_unit: 'Σ(M-μ)²'  },
      { el: famD, key: 'family_d', label: 'D', stat_unit: 'peakACF'  },
      { el: famE, key: 'family_e', label: 'E', stat_unit: 'max-z'    },
    ];
    for (var k = 0; k < bcde.length; k++) {
      var row = bcde[k];
      var s = pwd ? pwd[row.key] : null;
      if (!row.el) continue;
      if (s === null || s === undefined) {
        row.el.textContent = 'Family ' + row.label + ' — (not exercised in this scenario)';
        row.el.removeAttribute('title');
      } else {
        var statusWord = s.fired ? 'FIRING' : 'clean';
        row.el.textContent = 'Family ' + row.label + ' — ' + statusWord + '; ' + row.stat_unit + ' = ' + s.statistic.toFixed(3) + ' (threshold = ' + s.threshold.toFixed(3) + ')';
        row.el.setAttribute('title', s.derivation);
      }
    }
  }

  function renderProvenancePanel(scenarioData) {
    provenanceBodyEl.innerHTML = '';
    var receipts = (scenarioData.provenance_receipts) || [];
    if (receipts.length === 0) {
      var p = document.createElement('p');
      p.style.color = '#8b949e';
      p.style.fontSize = '0.85rem';
      p.textContent = '(no firings in this scenario)';
      provenanceBodyEl.appendChild(p);
      return;
    }
    for (var i = 0; i < receipts.length; i++) {
      var r = receipts[i];
      var card = document.createElement('details');  // R81: was 'div'
      card.className = 'provenance-receipt';
      // R81: collapsed by default (no open attribute)
      var sum = document.createElement('summary');
      sum.className = 'pr-header';
      sum.textContent = '[' + r.event_id + '] ' + r.shard_id + ' · Family ' + r.family + ' · window ' + r.window;
      var rs = document.createElement('div'); rs.className = 'pr-reasoning'; rs.textContent = r.reasoning;
      var ev = document.createElement('pre'); ev.className = 'pr-evidence';  ev.textContent = JSON.stringify(r.evidence, null, 2);
      card.appendChild(sum);
      card.appendChild(rs);
      card.appendChild(ev);
      provenanceBodyEl.appendChild(card);
    }
  }

  function syncScrubberPosition() {
    if (!windowScrubber) return;
    isSyncingScrubber = true;
    windowScrubber.value = String(currentWindowIdx);
    isSyncingScrubber = false;
  }

  function manualStep(delta) {
    var sd = scenarios[currentName];
    if (!sd) return;
    var maxIdx = sd.windows.length - 1;
    currentWindowIdx = Math.max(0, Math.min(maxIdx, currentWindowIdx + delta));
    render();
  }

  function render() {
    var scenarioData = scenarios[currentName];
    if (!scenarioData) return;
    updateLiveVerdictBanner(scenarioData, currentWindowIdx);
    drawFrame(scenarioData, currentWindowIdx);
    renderBadges(scenarioData, currentWindowIdx);
    rebuildAuditUpToCurrentWindow(scenarioData);
    updateWindowIndicator(scenarioData);
    renderMetricsPanel(scenarioData, currentWindowIdx);
    renderDetectorsPanel(scenarioData, currentWindowIdx);
    if (currentWindowIdx >= scenarioData.windows.length - 1) {
      renderReasoningAndActions(scenarioData);
    }
    syncScrubberPosition();
  }

  function tick() {
    var scenarioData = scenarios[currentName];
    if (!scenarioData) return;
    if (currentWindowIdx >= scenarioData.windows.length - 1) {
      stopPlay();
      render();
      return;
    }
    currentWindowIdx++;
    render();
  }

  function startPlay() {
    if (playing) return;
    playing = true;
    var speed = parseInt(speedSel.value, 10) || 1;
    intervalHandle = setInterval(tick, Math.round(baseIntervalMs / speed));
  }

  function stopPlay() {
    if (!playing) return;
    playing = false;
    if (intervalHandle !== null) { clearInterval(intervalHandle); intervalHandle = null; }
  }

  function loadScenario(name) {
    stopPlay();
    currentName = name;
    currentWindowIdx = 0;
    if (windowScrubber) {
      isSyncingScrubber = true;
      windowScrubber.max = String(Math.max(0, (scenarios[currentName] || { windows: [] }).windows.length - 1));
      windowScrubber.value = '0';
      isSyncingScrubber = false;
    }
    clearPanels();
    var scenarioData = scenarios[currentName];
    if (scenarioData) renderProvenancePanel(scenarioData);
    render();
  }

  // ── Event listeners ──
  selector.addEventListener('change', function () { loadScenario(selector.value); });
  btnPlay.addEventListener('click', startPlay);
  btnPause.addEventListener('click', stopPlay);
  btnReset.addEventListener('click', function () {
    stopPlay();
    currentWindowIdx = 0;
    clearPanels();
    render();
  });
  speedSel.addEventListener('change', function () {
    if (playing) { stopPlay(); startPlay(); }
  });

  if (windowScrubber) {
    windowScrubber.addEventListener('input', function () {
      if (isSyncingScrubber) return;
      stopPlay();
      document.body.classList.add('scrubbing');
      currentWindowIdx = parseInt(windowScrubber.value, 10) || 0;
      render();
    });
    windowScrubber.addEventListener('change', function () {
      document.body.classList.remove('scrubbing');
    });
  }

  document.addEventListener('keydown', function (ev) {
    // Don't intercept keystrokes while user is in a form input or content-editable surface
    if (ev.target && ev.target.tagName) {
      var t = ev.target.tagName.toUpperCase();
      if (t === 'INPUT' || t === 'SELECT' || t === 'TEXTAREA') return;
    }
    if (ev.target && ev.target.isContentEditable) return;
    switch (ev.code) {
      case 'Space':
        ev.preventDefault();
        if (playing) stopPlay(); else startPlay();
        break;
      case 'ArrowRight':
        ev.preventDefault();
        if (playing) stopPlay();
        manualStep(1);
        break;
      case 'ArrowLeft':
        ev.preventDefault();
        if (playing) stopPlay();
        manualStep(-1);
        break;
      case 'KeyR':
        ev.preventDefault();
        stopPlay();
        currentWindowIdx = 0;
        clearPanels();
        var sd = scenarios[currentName];
        if (sd) renderProvenancePanel(sd);
        render();
        break;
    }
  });

  // ── Initial render ──
  loadScenario(currentName);
})();
  </script>
</body>
</html>
`;
