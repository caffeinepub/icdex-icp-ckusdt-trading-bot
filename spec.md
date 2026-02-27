# Specification

## Summary
**Goal:** Add a read-only open orders panel to the ICDex Grid Bot dashboard that fetches and displays the bot's currently open orders from the ICDex canister.

**Planned changes:**
- Add a `getOpenOrders()` public query function to `backend/main.mo` that calls the ICDex canister at `jgxow-pqaaa-aaaar-qahaq-cai` and returns an array of records with fields: orderId (Nat), side (Text), price (Nat), and quantity (Nat)
- Add a `useOpenOrders()` React Query hook to `frontend/src/hooks/useQueries.ts` that calls `getOpenOrders()` and polls every 10 seconds
- Create a new `OpenOrdersPanel.tsx` component that displays open orders in a table with columns: Order ID, Side, Price, and Quantity; BUY side uses neon green badges and SELL side uses red badges, consistent with the terminal theme; includes loading skeleton, error state, and empty state
- Add the `OpenOrdersPanel` to the dashboard grid in `frontend/src/App.tsx`

**User-visible outcome:** The dashboard shows a live-updating panel listing all currently open ICDex orders, refreshing every 10 seconds, with color-coded BUY/SELL indicators.
