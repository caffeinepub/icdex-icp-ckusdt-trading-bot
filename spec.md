# Specification

## Summary
**Goal:** Handle stopped canister states gracefully by adding a health check endpoint and improving error handling in the frontend bot control flow.

**Planned changes:**
- Add a lightweight `ping` or `getStatus` query method to the backend actor (`backend/main.mo`) that responds successfully regardless of whether the bot is running or stopped
- In the frontend, wrap `startBot` mutation calls with error handling that detects IC0508 / reject code 5 and displays a user-friendly error message instead of a raw rejection dump
- Ensure the Start button returns to its default (non-loading) state after catching the error
- Add a canister availability pre-check in the `startBot` and `stopBot` mutation flows that calls the lightweight query method before dispatching the update call; if the pre-check fails, abort with a friendly error message without invoking the mutation

**User-visible outcome:** Users see a clear, human-readable error message when the canister is stopped or unavailable, and the UI controls return to their normal state rather than displaying raw IC rejection errors.
