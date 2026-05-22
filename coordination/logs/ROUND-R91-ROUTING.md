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
Output: {"round":"R91","prefix_bytes":38679,"prefix_sha256":"56f9554d47a346f4fdb66f669c0261127547fc628f98c4fe7bfd77b01692db3b","tail_bytes":{"IMPLEMENTER":91591,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":11052,"tail_tokens_est":{"IMPLEMENTER":26169,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":46.9,"measurer_version":"0.1.0"}
