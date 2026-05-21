# Round R87 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R87","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R87","prefix_bytes":123174,"prefix_sha256":"294dc5e226d3fdfc213ba255a83a535e1006144fef0f9387ae1b083162e3117e","tail_bytes":{"IMPLEMENTER":91555,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":35193,"tail_tokens_est":{"IMPLEMENTER":26159,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":69.9,"measurer_version":"0.1.0"}
