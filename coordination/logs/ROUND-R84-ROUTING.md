# Round R84 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R84","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R84","prefix_bytes":160083,"prefix_sha256":"313250c7315336ae7bca2416aaea7e47496ac36005941b6e945cc89fbf4bb237","tail_bytes":{"IMPLEMENTER":89277,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":45738,"tail_tokens_est":{"IMPLEMENTER":25508,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":73.9,"measurer_version":"0.1.0"}
