# Round R80 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R80","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R80","prefix_bytes":30214,"prefix_sha256":"66f3e237931fcb4ee454e2055b885cb7378edab5e629c83156abf096aa345a85","tail_bytes":{"IMPLEMENTER":83588,"REVIEWER":8345,"MEMORIAL-UPDATER":5494},"prefix_tokens_est":8633,"tail_tokens_est":{"IMPLEMENTER":23883,"REVIEWER":2385,"MEMORIAL-UPDATER":1570},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":43.4,"measurer_version":"0.1.0"}
