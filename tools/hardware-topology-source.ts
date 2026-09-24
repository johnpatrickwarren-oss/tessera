// Returned to Tessera from the engine on 2026-09-23 (engine ADR 0033 step 4, Tessera ADR 0031; was
// adapters/hardware-topology-source.ts in @johnpatrickwarren-oss/deploysignal-engine v0.7.0-pre, and Tessera-original before
// the R90 extract). Tessera owns this file; the engine copy is deleted at its next major.
// anchor:allow require-tests: covered by test/q23-hardware-topology-source.test.ts

// engine/hardware-topology-source.ts — Tessera-original Phase 2 SLICE 3.A (R23).
//
// HardwareTopologySource — concrete impl of the inherited Addition #26
// TopologySource interface (engine/topology-overlay.ts:50-55) for hardware
// topology data (NVLink / rack / PSU / cooling-zone). At R23 (SLICE 3.A),
// constructor accepts a pre-resolved TopologySnapshot — analogous to
// inherited StaticTopologySource at engine/topology-overlay.ts:83-101.
// SLICE 3.B (R24) adds concrete ingestion adapters (Slurm topology /
// Kubernetes node-label / NVIDIA NVLink-topology) against the same
// interface; the R23 class's API is the contract surface for that
// expansion.
//
// snapshotHash() delegates to the inherited computeSnapshotHash free
// function — every TopologySource impl shares identical hash semantics
// per Addition #26 D6 archaeological-render requirement.
//
// Tessera-original code (NOT vendored from DeploySignal).

import type { TopologySnapshot } from '@johnpatrickwarren-oss/deploysignal-engine/types/verdict';
import {
  computeSnapshotHash,
  type FetchContext,
  type TopologySource,
} from './topology-overlay';

export class HardwareTopologySource implements TopologySource {
  readonly id: string;
  readonly version: string;
  private readonly snapshot: TopologySnapshot;

  constructor(snapshot: TopologySnapshot, opts: { id?: string; version?: string } = {}) {
    this.snapshot = snapshot;
    this.id = opts.id ?? snapshot.source_id ?? 'hardware_topology_source';
    this.version = opts.version ?? snapshot.source_version ?? 'hardware-1';
  }

  async fetchSnapshot(_ctx?: FetchContext): Promise<TopologySnapshot> {
    return this.snapshot;
  }

  snapshotHash(snapshot: TopologySnapshot): string {
    return computeSnapshotHash(snapshot);
  }
}
