# Specification

## Summary
**Goal:** Activate order cancellation in the backend trading loop so that all open orders are cancelled before new grid orders are placed each cycle, preventing order accumulation.

**Planned changes:**
- At the start of each `tradingLoop()` cycle, query the ICDex canister (`jgxow-pqaaa-aaaar-qahaq-cai`) for all currently open orders belonging to the canister.
- Call `cancelOrder()` on every open order found, unconditionally, before any new `placeOrder()` calls are made.
- If no open orders exist, skip the cancellation step gracefully and continue with grid order placement.
- Handle errors from `cancelOrder()` by logging them without aborting the rest of the trading cycle.
- Leave all existing `placeOrder()` logic, order sizing (fixed 2 ICP / 200_000_000 e8s), public API functions, and frontend files unchanged.

**User-visible outcome:** The bot no longer accumulates stale orders across cycles; each trading cycle starts clean by cancelling all previous open orders before placing a fresh grid, making it safe to run on real assets.
