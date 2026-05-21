# Round R82 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R82","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R82","prefix_bytes":145647,"prefix_sha256":"9f7bd8e61ab5a2a3c6f2cda5a231131ff13678772f166ccc779b3cdca4c6d4b6","tail_bytes":{"IMPLEMENTER":88101,"REVIEWER":8345,"MEMORIAL-UPDATER":5494},"prefix_tokens_est":41614,"tail_tokens_est":{"IMPLEMENTER":25172,"REVIEWER":2385,"MEMORIAL-UPDATER":1570},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":73,"measurer_version":"0.1.0"}
