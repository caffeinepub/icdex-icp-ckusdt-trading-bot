# Specification

## Summary
**Goal:** Implement real buy/sell order placement and cancellation via ICDex in the grid trading bot loop, and expose a `pending` query method for retrieving open orders.

**Planned changes:**
- In `backend/main.mo`, implement the core grid trading loop driven by the existing recurring timer: query mid-price from ICDex, calculate grid levels, cancel misaligned open orders via ICDex cancel API, place new buy/sell limit orders via ICDex order placement API, persist order IDs in the open orders stable map, and log each action to the activity log.
- Enforce `maxOpenOrders` limit and ensure the loop only runs when the bot is enabled.
- Add a `pending` query method in `backend/main.mo` that returns all currently open orders from the internal open orders map, replacing any prior incorrect open-order query calls.
- Update `frontend/src/hooks/useQueries.ts` to call the backend `pending` method for fetching open orders, ensuring `OpenOrdersPanel` displays live open orders correctly with proper loading, error, and empty states.

**User-visible outcome:** The grid bot places and cancels real limit orders on ICDex each cycle, and the OpenOrdersPanel in the dashboard accurately reflects the current live open orders tracked by the bot.
