# Specification

## Summary
**Goal:** Add a minimal proof-of-concept function to the backend Motoko actor that demonstrates a single hardcoded order cancellation on the ICDex canister.

**Planned changes:**
- Add a new public update function `cancelOneOrderTest()` in `backend/main.mo` that calls `cancelOrder()` on the ICDex canister (`jgxow-pqaaa-aaaar-qahaq-cai`) with a hardcoded order ID (e.g., `0`)
- No existing functions are modified; no frontend files are touched

**User-visible outcome:** The developer can call `cancelOneOrderTest()` via `dfx canister call` to verify that the `cancelOrder()` call compiles and executes successfully without budget_exceeded errors.
