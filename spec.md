# Specification

## Summary
**Goal:** Replace the Debug.print stubs in the backend trading loop with real `placeOrder()` calls to the ICDex canister, using a fixed order size of 2 ICP per order.

**Planned changes:**
- In `tradingLoop()`, replace all `Debug.print` stub calls for order placement with actual `placeOrder()` calls targeting the ICDex canister at `jgxow-pqaaa-aaaar-qahaq-cai`
- Each BUY and SELL order must use a fixed quantity of 2 ICP (200_000_000 e8s)
- Grid computation continues to use existing `spreadBps` and `numOrders` configuration
- No changes to `cancelOrder()`, grid repositioning, or any frontend code

**User-visible outcome:** The grid bot now places real orders on the ICDex canister when the trading loop runs, with each grid level order sized at exactly 2 ICP for both buy and sell sides.
