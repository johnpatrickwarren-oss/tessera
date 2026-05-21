# Round R78 routing

## Tier
Source: pipeline default
Final TIER: full

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R78","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R78","prefix_bytes":137608,"prefix_sha256":"0bc4bbd0e41444b8182034e7d41b2a5527a4bef8b4365dca22979fceb2a9d30b","tail_bytes":{"IMPLEMENTER":79314,"REVIEWER":8345,"MEMORIAL-UPDATER":4022},"prefix_tokens_est":39317,"tail_tokens_est":{"IMPLEMENTER":22662,"REVIEWER":2385,"MEMORIAL-UPDATER":1150},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":73.6,"measurer_version":"0.1.0"}
