# Specification

## Summary
**Goal:** Add a `getDepositAddr` public function to the backend canister that performs an inter-canister call to retrieve the deposit account address.

**Planned changes:**
- Add a public function `getDepositAddr` in `backend/main.mo` that calls `getDepositAccount` on canister `5u2c6-kyaaa-aaaar-qadiq-cai`, passing the bot canister's own principal as the argument, and returns the result.

**User-visible outcome:** The backend exposes a new callable function `getDepositAddr` that returns the deposit account from the target canister, without affecting any existing functionality.
