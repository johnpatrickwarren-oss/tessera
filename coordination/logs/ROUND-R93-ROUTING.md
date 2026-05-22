# Round R93 routing

## Tier
Source: explicit --tier audit
Final TIER: audit

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R93","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: structural
Source: default for tier=audit

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R93","prefix_bytes":37624,"prefix_sha256":"ea3445d325100f31486d9bbfbd1ea9ec80e81ef83468f20aeaac41bc2320566b","tail_bytes":{"IMPLEMENTER":93123,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":10750,"tail_tokens_est":{"IMPLEMENTER":26607,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":46,"measurer_version":"0.1.0"}
