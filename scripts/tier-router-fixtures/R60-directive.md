## § R60 Round-scope directive (Coordinator — Phase 3 SLICE 3 Coordinator wave plan; PARALLEL-FAN-OUT evaluation)

Coordinator wave plan for Phase 3 SLICE 3: engine npm extract + DS integration + event consumer.

**PARALLEL-FAN-OUT evaluation:** WU-Phase3-3A (engine extract) must complete before WU-Phase3-3B and WU-Phase3-3C can dispatch; WU-Phase3-3B and WU-Phase3-3C are independent of each other.

**Wave 1:** WU-Phase3-3A only (engine npm package boundary — gates all downstream clusters).
**Wave 2:** WU-Phase3-3B (DS integration contract) + WU-Phase3-3C (event consumer) in parallel.
