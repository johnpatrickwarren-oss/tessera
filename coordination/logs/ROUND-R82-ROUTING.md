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
Output: {"round":"R82","prefix_bytes":30496,"prefix_sha256":"7621aaf45e97917574afdc56dc832993727dac71c43ae7e687a1a521cdbe6421","tail_bytes":{"IMPLEMENTER":88101,"REVIEWER":8345,"MEMORIAL-UPDATER":5494},"prefix_tokens_est":8714,"tail_tokens_est":{"IMPLEMENTER":25172,"REVIEWER":2385,"MEMORIAL-UPDATER":1570},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":42.6,"measurer_version":"0.1.0"}
