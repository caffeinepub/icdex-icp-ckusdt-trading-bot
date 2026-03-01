# Specification

## Summary
**Goal:** Fix the Market Data LIVE section so it displays real values (Mid Price, Best Bid, Best Ask, Buy Levels, Sell Levels) instead of dashes or zeros, and surface errors clearly when the ICDex data fetch fails.

**Planned changes:**
- Update the backend market data query function to return a structured Result/error variant instead of silent zeros/nulls when the ICDex canister call fails, and log failures to the activity log.
- Update the frontend MarketDataPanel to handle the new error variant, display explicit error messages when the fetch fails, and retry on the existing polling interval.
- Ensure Mid Price, Best Bid, Best Ask, Buy Levels, and Sell Levels show live formatted values when the ICDex canister is reachable.

**User-visible outcome:** The Market Data LIVE panel shows real price and order book values when the ICDex canister is reachable, and displays a clear error message (instead of silent dashes or zeros) when the fetch fails, with automatic retries on the polling interval.
