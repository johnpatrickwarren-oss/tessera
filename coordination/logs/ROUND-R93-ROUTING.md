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
Output: {"round":"R93","prefix_bytes":73324,"prefix_sha256":"aac5b10620a7d0948d2585e5eef4b230e8b14c373043dfa7b47157f2dce91543","tail_bytes":{"IMPLEMENTER":93123,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":20950,"tail_tokens_est":{"IMPLEMENTER":26607,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":60.3,"measurer_version":"0.1.0"}
