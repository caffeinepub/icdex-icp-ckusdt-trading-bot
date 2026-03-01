# Specification

## Summary
**Goal:** Fix the order cancellation and repositioning logic in the ICDex Grid Bot so that orders are correctly cancelled and re-placed during bot refresh/stop cycles, and the UI reflects the updated state immediately.

**Planned changes:**
- Fix backend cancellation logic so all open bot orders are identified and cancelled on ICDex before new orders are placed or the bot halts
- Log cancellation failures with sufficient detail to the activity log
- Fix backend repositioning logic to recalculate grid price levels after cancellation and place the correct number of buy/sell orders based on current market price and configured spread/grid parameters
- Log each repositioning cycle (orders cancelled and placed) to the activity log; continue placing remaining orders if any single placement fails
- Update `OpenOrdersPanel` and the cancel-all mutation in `useQueries.ts` so the open orders list automatically refetches after a cancel-all action, showing the updated (empty or repositioned) state

**User-visible outcome:** When the bot stops or refreshes its grid, all previous orders are properly cancelled and new orders are placed at correct price levels. Clicking "cancel all" in the UI immediately reflects the cleared or updated order list with no stale entries.
