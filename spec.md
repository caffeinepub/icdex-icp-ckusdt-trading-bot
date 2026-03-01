# Specification

## Summary
**Goal:** Fix the Grid Levels, Open Orders, and Trade History panels in the ICDex Trading Bot dashboard so they correctly fetch and display data from the backend canister instead of appearing empty.

**Planned changes:**
- Audit and fix `useQueries.ts` hooks for grid levels, open orders, and trade history to ensure the actor is initialized before queries fire, errors are propagated (not swallowed), and polling intervals are active
- Fix the Grid Levels panel to fetch and display real buy/sell price levels, with distinct loading, error, and empty states
- Fix the Open Orders panel to fetch and display active orders, with distinct loading, error, and empty states
- Fix the Trade History panel to fetch and display past trades in reverse-chronological order, with distinct loading, error, and empty states
- Ensure backend queries for all three panels return correct structured data when records exist

**User-visible outcome:** The Grid Levels, Open Orders, and Trade History panels display real data when available, show loading skeletons while fetching, and surface error messages on failure instead of silently rendering empty lists.
