# Round R91 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R91","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R91","prefix_bytes":148459,"prefix_sha256":"484bf2830e2ea2d7360d882b4e5ec09bc08c2d00104e84967c1c0edf8e1a4ef4","tail_bytes":{"IMPLEMENTER":91591,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":42417,"tail_tokens_est":{"IMPLEMENTER":26169,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":72.6,"measurer_version":"0.1.0"}
