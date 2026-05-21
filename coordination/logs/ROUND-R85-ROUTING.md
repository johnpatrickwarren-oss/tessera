# Round R85 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-sonnet-4-6
Rationale: cross-round-pattern marker (class A): cross-project promotion
Selector output: {"round":"R85","model":"claude-sonnet-4-6","rationale":"cross-round-pattern marker (class A): cross-project promotion","decision_path":["marker_match","class_A"],"selector_version":"0.1.0","matched_anchors":["cross-project promotion"]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R85","prefix_bytes":181636,"prefix_sha256":"46dca704e9a452f8c9ce52e465ece938244ad8bd6699ecdeb8e6ba5e02241e2f","tail_bytes":{"IMPLEMENTER":91555,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":51896,"tail_tokens_est":{"IMPLEMENTER":26159,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":75.3,"measurer_version":"0.1.0"}
