# Specification

## Summary
**Goal:** Modify the backend trading loop so that all open orders are unconditionally cancelled before placing new grid orders on every cycle.

**Planned changes:**
- In `tradingLoop()` (`backend/main.mo`), fetch all open orders via `getOpenOrders()` at the start of each cycle
- Call `cancelOrder()` on every open order before placing any new orders
- Ensure new grid orders are only placed after all cancellations are complete
- Preserve the existing flow: fetch mid-price → compute grid → cancel all → place all
- Preserve the dynamic order quantity calculation (`quantity = 10 / midPrice`)

**User-visible outcome:** The bot no longer accumulates stale orders across cycles; every cycle starts clean with a full cancel-all before repositioning the grid.
