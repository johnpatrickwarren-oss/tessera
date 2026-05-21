# Round R89 routing

## Tier
Source: explicit --tier audit
Final TIER: audit

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R89","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: structural
Source: default for tier=audit

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R89","prefix_bytes":69733,"prefix_sha256":"a35a1b54e1a669220b4c14043cb82148b64a22e6a2e2359fd2573fe1febd761f","tail_bytes":{"IMPLEMENTER":91555,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":19924,"tail_tokens_est":{"IMPLEMENTER":26159,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":59.6,"measurer_version":"0.1.0"}
