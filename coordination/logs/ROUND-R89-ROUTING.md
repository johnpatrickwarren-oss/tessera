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
Output: {"round":"R89","prefix_bytes":69792,"prefix_sha256":"d62145a4df6ecc61f8dcc860bf8aeaf3ba967df0c06f2f87a468b141973cfb1d","tail_bytes":{"IMPLEMENTER":91591,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":19941,"tail_tokens_est":{"IMPLEMENTER":26169,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":59.6,"measurer_version":"0.1.0"}
