# Audit Note — AISubscriptionBoxCurator

Source: `/Users/erolakarsu/projects/_AUDIT/reports/batch_08.md` (section 8).

## Original Recommendations

### Missing AI Counterparts
- None obvious; existing AI coverage is good.

### Missing Non-AI Features
- Marketing email sequences
- Logistics/fulfillment platform integration
- Referral/affiliate tracking
- Pause/skip workflow UI
- Gift subscription workflow

### Custom Feature Suggestions
- Seasonal demand forecasting
- Unboxing experience optimization
- Competitor price monitoring
- Customer lifetime value prediction
- Flavor/preference learning loop

## Implemented (this round)
1. `POST /api/ai/customer-ltv` — predicts LTV with acquisition-spend cap recommendation.
2. `POST /api/ai/unboxing-arrangement` — physical layout/reveal sequence.

Pattern reused: `callOpenRouter` + `parseAIJson` + `persistAIResult` + `aiRateLimiter`. Syntax-checked.

## Backlog (prioritized)
1. **MECHANICAL** Competitor price monitoring endpoint (LLM-only synthesis).
2. **MECHANICAL** Multi-armed bandit preference loop (would need long-running state — keep mechanical part to scoring endpoint).
3. **NEEDS-CREDS** Logistics integrations.
4. **NEEDS-PRODUCT-DECISION** Email sequencing, gift workflow, pause/skip UI/policy.

## Apply pass 3 (frontend)

LEFT-AS-IS. Pass-2 endpoints `customer-ltv` and `unboxing-arrangement` are wired in `frontend/src/pages/AICenter.jsx` (key/endpoint entries) with the per-feature runner at `frontend/src/pages/AIFeaturePage.jsx` and shared rendering in `frontend/src/components/AIResultDisplay.jsx`. JWT Bearer auth via existing service helpers. No changes made (idempotence).

## Apply pass 4 (mechanical backlog)

IDEMPOTENT. Both mechanical items already shipped:
- `POST /api/ai/competitor-price-monitor` — `backend/src/routes/ai.js` line 510, `callOpenRouter` + `parseAIJson` + `persistAIResult` + `aiRateLimiter` (503 surfaces from helper on missing key).
- `POST /api/ai/preference-bandit` — `backend/src/routes/ai.js` line 546 (bandit-style scoring step over candidate boxes).

FE wired in `frontend/src/pages/AICenter.jsx` lines 80, 85 (registry entries); per-feature runner `AIFeaturePage.jsx`; Bearer JWT via service helpers; 503 handled by shared error path. No new endpoints, no new FE pages, no new deps.
