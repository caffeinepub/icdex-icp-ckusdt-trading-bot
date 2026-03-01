# Specification

## Summary
**Goal:** Add detailed step-by-step logging throughout the `tradingLoop()` function in the backend so the Activity Log panel can display exactly where the loop is succeeding or failing.

**Planned changes:**
- Add a log entry before fetching the current market price
- Add a log entry after successfully fetching the price, including the fetched price value
- Add a log entry before each individual buy/sell order placement, indicating the side and price level
- Add a log entry after each order placement attempt, logging success with the order ID or failure with the error reason
- Add a log entry when any exception or error is caught inside `tradingLoop()`
- Ensure every code path in `tradingLoop()` produces at least one log entry (no silent failures)

**User-visible outcome:** After starting the bot, the Activity Log panel will show granular log entries for each step of the trading loop, making it possible to identify exactly where the loop succeeds or fails.
