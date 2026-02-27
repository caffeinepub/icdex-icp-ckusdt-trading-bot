# Specification

## Summary
**Goal:** Revert the order quantity calculation in the backend trading loop from a fixed 2 ICP (200_000_000 e8s) back to the original dynamic $10 per order formula.

**Planned changes:**
- In `tradingLoop()`, replace the hardcoded quantity of 200_000_000 e8s with the dynamic formula: `quantity = 10 / midPrice` (representing $10 worth of ICP at the current mid-price).
- Apply this dynamic quantity to both BUY and SELL grid orders.

**User-visible outcome:** The grid bot places orders sized at approximately $10 worth of ICP each, based on the current mid-price, matching the original default behavior.
