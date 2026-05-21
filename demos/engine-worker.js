'use strict';
// R84 — Web Worker that drives the live Tessera engine compute path.
//
// Runtime: classic Web Worker in the browser; node:worker_threads.Worker in the Node test path.
// Uses runtime detection + dynamic ESM import of ./engine-bundle.mjs (works in both contexts).
//
// Inbound message protocol:
//   { type: 'run', controlState }
//
// Outbound message protocol (streaming):
//   { type: 'window',   windowIdx, perShard: [{shard_id, M_t, fired, residual_proxy}], events: [] }
//   { type: 'terminal', fdr_K, fdr_qLevel, fdr_selected_indices, candidates: [] }
//   { type: 'error',    error: <string> }

(function () {
  var isNodeWorker = (typeof process !== 'undefined' && process.versions && process.versions.node);

  function getPort() {
    if (isNodeWorker) {
      var wt = require('worker_threads');
      return {
        post: function (m) { wt.parentPort.postMessage(m); },
        on:   function (h) { wt.parentPort.on('message', h); },
      };
    }
    return {
      post: function (m) { self.postMessage(m); },
      on:   function (h) { self.onmessage = function (e) { h(e.data); }; },
    };
  }

  function getBundleSpecifier() {
    if (isNodeWorker) {
      var url = require('url');
      var path = require('path');
      return url.pathToFileURL(path.join(__dirname, 'engine-bundle.mjs')).href;
    }
    return './engine-bundle.mjs';
  }

  var SHARD_COUNTS = { small: 6, medium: 10, large: 25 };

  function makeShardIds(count) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var n = String(i);
      out.push('shard-' + (n.length < 2 ? '0' + n : n));
    }
    return out;
  }

  function targetIndexFor(controlState, shardCount) {
    var s = String(controlState.targetShard || '');
    var m = s.match(/-(\d+)$/);
    var idx = m ? parseInt(m[1], 10) : 0;
    if (!isFinite(idx) || idx < 0 || idx >= shardCount) return 0;
    return idx;
  }

  function handleRun(engine, controlState, port) {
    var shardCount = SHARD_COUNTS[controlState.topologySize] || SHARD_COUNTS.small;
    var shardIds = makeShardIds(shardCount);
    var windowCount = Math.max(1, parseInt(controlState.windowCount, 10) || 50);
    var alpha = Number(controlState.alphaThreshold);
    if (!(alpha > 0 && alpha < 1)) alpha = 0.005;
    var threshold = 1 / alpha;
    var driftMag = Number(controlState.driftMagnitude);
    if (!(driftMag >= 0)) driftMag = 0;
    var driftStart = Math.floor(windowCount / 3);
    var targetIdx = targetIndexFor(controlState, shardCount);
    var familyAEnabled = !!(controlState.families && controlState.families.a);

    // Per-shard Family-A betting state.
    var states = new Array(shardCount);
    for (var s = 0; s < shardCount; s++) states[s] = engine.detectors.freshBettingState();

    for (var w = 0; w < windowCount; w++) {
      var perShard = [];
      for (var i = 0; i < shardCount; i++) {
        var x = (i === targetIdx && w >= driftStart) ? driftMag : 0;
        var Mt = states[i].M;
        if (familyAEnabled) {
          Mt = engine.detectors.updateBettingState(states[i], x, 0, 1, alpha);
        }
        perShard.push({
          shard_id: shardIds[i],
          M_t: Mt,
          fired: Mt >= threshold,
          residual_proxy: x,
        });
      }
      port.post({ type: 'window', windowIdx: w, perShard: perShard, events: [] });
    }

    // Terminal e-BH FDR selection over per-shard final M values.
    var eValues = states.map(function (st) { return st.M; });
    var ebh = engine.eBH.eBenjaminiHochberg(eValues, alpha);
    port.post({
      type: 'terminal',
      fdr_K: ebh.K,
      fdr_qLevel: alpha,
      fdr_selected_indices: ebh.selected,
      candidates: [],
    });
  }

  var port = getPort();
  var enginePromise = import(getBundleSpecifier());

  port.on(function (msg) {
    if (!msg || msg.type !== 'run') return;
    enginePromise.then(function (engine) {
      handleRun(engine, msg.controlState || {}, port);
    }).catch(function (err) {
      port.post({ type: 'error', error: String(err && err.message || err) });
    });
  });
})();
