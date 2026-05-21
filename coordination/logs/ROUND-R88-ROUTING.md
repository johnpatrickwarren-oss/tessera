# Round R88 routing

## Tier
Source: explicit --tier full
Final TIER: full

## MU model
Model: claude-haiku-4-5-20251001
Rationale: default haiku (no cross-round-pattern marker)
Selector output: {"round":"R88","model":"claude-haiku-4-5-20251001","rationale":"default haiku (no cross-round-pattern marker)","decision_path":["default_haiku"],"selector_version":"0.1.0","matched_anchors":[]}

## Reviewer scope
Scope: full
Source: default for tier=full

## Cache-prefix telemetry
Measurer: scripts/measure-cache-effect.js
Output: {"round":"R88","prefix_bytes":143532,"prefix_sha256":"1d2ae3cb469bf12807cff41873a91c5f397525cb5f09c79f4ee5081ffd1c8ebc","tail_bytes":{"IMPLEMENTER":91555,"REVIEWER":8345,"MEMORIAL-UPDATER":6661},"prefix_tokens_est":41010,"tail_tokens_est":{"IMPLEMENTER":26159,"REVIEWER":2385,"MEMORIAL-UPDATER":1904},"chars_per_token":3.5,"estimated_cache_hit_savings_percent_per_2nd_plus_session":72.1,"measurer_version":"0.1.0"}
