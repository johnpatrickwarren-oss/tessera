# Round R90 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R90","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R90","prefix_bytes":38069,"prefix_sha256":"84e3679f540f858ccdf8a494244296384b2a791bc2ee7957af8d853e4c206028","tail_bytes":{"IMPLEMENTER":91591,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":10877,"tail_tokens_est":{"IMPLEMENTER":26169,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":46.5,"measurer_version":"0.1.0"}
