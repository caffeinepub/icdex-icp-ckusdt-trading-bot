# Specification

## Summary
**Goal:** Activate live trading functions for the icDex ICP/ckUSDT grid bot, replacing all stub/simulated logic with real on-chain interactions for order placement, cancellation, price fetching, balance checks, and trade history.

**Planned changes:**
- Wire the backend grid trading logic to submit real buy/sell limit orders to the icDex DEX canister for the ICP/ckUSDT pair, replacing any stub or simulated order logic.
- Implement real order cancellation on each timer tick via the icDex canister before placing a new grid, so stale orders do not accumulate.
- Fetch the live mid price (best bid/ask or last trade) from the icDex ICP/ckUSDT canister instead of using any placeholder or hardcoded value; halt order placement and report an error if the price fetch fails.
- Add a pre-flight balance check that queries on-chain ICP and ckUSDT balances before placing orders; display both balances in the dashboard and disable the Start button with an explanatory message if balances are insufficient.
- Persist a log of all placed and cancelled orders (timestamp, side, price, quantity, status) in stable storage and expose it via a query endpoint; display this log in a new Trade History panel on the frontend, most recent first.

**User-visible outcome:** The bot can be started against real ICP/ckUSDT assets on icDex: it fetches the live market price, checks available balances, places and cancels real on-chain grid orders each tick, and the dashboard shows live balances, current open orders, and a persistent trade history log.
