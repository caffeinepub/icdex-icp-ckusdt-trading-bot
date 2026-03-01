# Specification

## Summary
**Goal:** Replace only the first occurrence of `getOpenOrders` with `pending` inside the `tradingLoop` function in `backend/main.mo`, as step 1 of a 3-step migration.

**Planned changes:**
- In `backend/main.mo`, locate the first call to `getOpenOrders` on the ICDex actor within `tradingLoop` and replace it with the `pending` method
- No other lines or logic in the file are touched

**User-visible outcome:** The grid bot's trading loop uses the `pending` method for its first order-fetching call, while all other code remains unchanged.
