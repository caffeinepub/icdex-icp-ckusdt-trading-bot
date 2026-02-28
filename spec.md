# Specification

## Summary
**Goal:** Add automated grid trading logic to the ICDex Grid Bot backend and update the frontend to reflect live bot state.

**Planned changes:**
- Implement grid order placement logic in the backend: compute buy/sell grid levels from current mid price, configured spread, and order count, then place limit orders on both sides
- Implement a periodic timer-driven bot loop that fetches the latest mid price each tick, cancels stale/out-of-range orders, and places new grid orders; loop starts/stops with the bot
- Expose a backend query method returning open orders (price, side, size) for the frontend
- Update OpenOrdersPanel to fetch and display live open orders from the backend query method
- Update BotControlPanel to show accurate Running/Stopped status and display dismissible alerts for order placement errors

**User-visible outcome:** When the bot is started, it automatically places and manages a grid of buy/sell limit orders around the current market price on each timer tick. The frontend shows live open orders and reflects the bot's running state, including any errors from order placement.
