# Retail-development underwriting engine

This directory contains a persistence-neutral, pure TypeScript quick-underwriting engine. It accepts economic inputs only; it does not know about opportunities, portal deals, users, databases, HTTP, React, or Next.js.

## Policies

- `decimal.js` performs all economic arithmetic at 40 significant digits with half-up rounding. Intermediate calculations are not rounded for display. Public numeric outputs are plain decimal strings so results are deterministic, serializable, and never expose binary floating-point artifacts, `NaN`, or infinity.
- Lease terms and timeline durations are integer months. `edate` uses Excel-compatible behavior: it preserves the source day when that day exists in the target month and otherwise clamps to the target month's final day. Date arithmetic uses UTC calendar components and is timezone-independent.
- The selected leasing mode is authoritative. Market assumptions and tenant-roster assumptions are never blended. Market Mode calculates TI, LC, and free rent from its explicit market assumptions. Tenant Roster Mode sums tenant-row TI, LC, and free-rent economics; its SF-weighted assumptions remain descriptive headline statistics and are not substituted for nonlinear tenant totals. An empty or zero-SF roster is blocking.
- Construction debt is a V1 quick-screen approximation: interest-only, no amortization before sale, design interest on the land-funded portion, construction interest on an average outstanding balance, and outstanding principal at sale equal to original construction-loan principal.
- Gross project uses include development cost before financing, interim financing interest, and any lease-up operating deficit. Negative lease-up operating cash increases equity funding. Positive lease-up operating cash reduces net equity invested and is not added again at sale. This quick-screen convention nets interim operating cash against equity rather than modeling dated contributions or distributions.
- Average occupancy during lease-up remains a manual underwriting assumption in both leasing modes; roster dates do not imply occupied or rent-paying SF-months.
- Stabilized NOI is still used for valuation when roster tenants have not all commenced, but Tenant Roster Mode emits warnings for late commencements, unscheduled SF, and incomplete scheduled SF at stabilization.
- Interim financing interest remains equity-funded. True dated cash flows, interest reserves, monthly draws, distributions, and IRR are deferred to a future model.
- Sensitivities transform authoritative rent, hard-cost, or cap-rate inputs and call the same core pipeline used by the headline model.

The public API is exported by `index.ts`. Presentation rounding and persistence mapping belong outside this module.
