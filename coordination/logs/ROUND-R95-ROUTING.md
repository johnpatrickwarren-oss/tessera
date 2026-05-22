# Round R95 routing

## Tier
Source: explicit --tier audit
Final TIER: audit

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R95","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: structural
Source: default for tier=audit

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R95","prefix_bytes":84184,"prefix_sha256":"10fb0a7f7b6a47e1d043257aabc025a97ec3b3c51b489ce12a1f788d90386cb6","tail_bytes":{"IMPLEMENTER":94964,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":24053,"tail_tokens_est":{"IMPLEMENTER":27133,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":62.7,"measurer_version":"0.1.0"}
