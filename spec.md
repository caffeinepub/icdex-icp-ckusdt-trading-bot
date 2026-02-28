# Specification

## Summary
**Goal:** Add an activity log feature to the ICDex Grid Bot trading UI so users can monitor bot events and debug issues in real time.

**Planned changes:**
- Add a `getActivityLog` backend query that returns the 100 most recent log entries (timestamp, event type, message) stored in stable state
- Record bot start/stop, order placement, order cancellation, trade execution, and error events into the log
- Create an `ActivityLogPanel` frontend component displaying entries with relative timestamps, color-coded event type badges (green for trades, yellow for orders, red for errors, neutral for status), and a "No activity yet" empty state
- Add a React Query hook in `useQueries.ts` that polls the activity log every 10 seconds
- Show a loading skeleton on first fetch
- Integrate `ActivityLogPanel` into the `App.tsx` dashboard grid, visible on desktop without scrolling, below the `TradeHistoryPanel`

**User-visible outcome:** Users can see a live-updating activity log panel on the dashboard showing recent bot events, making it easy to spot errors and track trading activity.
