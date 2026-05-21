# Round R77 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-sonnet-4-6
Rationale: cross-round-pattern marker (class A): cross-project canonical
Selector output: {"round":"R77","model":"claude-sonnet-4-6","rationale":"cross-round-pattern marker (class A): cross-project canonical","decision_path":["marker_match","class_A"],"selector_version":"0.1.0","matched_anchors":["cross-project canonical"]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R77","prefix_bytes":139969,"prefix_sha256":"9d827076bdfb6cb36246ea382cdbe6f72fa74a6c74642681fd86c03ebbbfa9e6","tail_bytes":{"IMPLEMENTER":76104,"REVIEWER":8345,"MEMORIAL-UPDATER":4022},"prefix_tokens_est":39992,"tail_tokens_est":{"IMPLEMENTER":21744,"REVIEWER":2385,"MEMORIAL-UPDATER":1150},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":74.3,"measurer_version":"0.1.0"}
