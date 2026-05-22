# Round R94 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R94","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R94","prefix_bytes":149365,"prefix_sha256":"b46f24c68a0f99ab291b2d68f956e6972ac5f3ac3bc999b4744caa45a5f382c1","tail_bytes":{"IMPLEMENTER":93123,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":42676,"tail_tokens_est":{"IMPLEMENTER":26607,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":72.5,"measurer_version":"0.1.0"}
