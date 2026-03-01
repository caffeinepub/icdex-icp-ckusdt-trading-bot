# Specification

## Summary
**Goal:** Add a `pending` query method to the backend actor to correctly retrieve open bot orders, and update the frontend to call this method.

**Planned changes:**
- Add a `pending` query function in `backend/main.mo` that returns the list of currently open bot orders using the existing order data structure (side, price, quantity, order ID)
- Replace any incorrect or placeholder open-order API calls in the backend with this new `pending` method
- Update the open orders React Query hook in `useQueries.ts` to call `actor.pending()` instead of any previously incorrect method
- Ensure the `OpenOrdersPanel` continues to render orders correctly from the updated hook

**User-visible outcome:** The Open Orders panel correctly displays the bot's currently open orders by calling the new `pending` query method, with no stale or incorrect actor calls remaining.
