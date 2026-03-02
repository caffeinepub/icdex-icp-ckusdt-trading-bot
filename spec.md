# ICDex ckBTC/ICP Trading Bot

## Current State

Backend (`main.mo`) tem:
- `getDepositAddr()` que chama `icDex.getDepositAccount({ owner = botPrincipal })` corretamente
- `depositCkBTC()` — função referenciada no frontend mas **ausente** no backend actual (só existe no `useQueries.ts` e `BalancePanel.tsx`)
- ICP e ckBTC estão no canister do bot mas não foram transferidos para a ICDex
- A ICDex requer que os ativos sejam enviados para uma subaccount específica antes de poder criar ordens
- Frontend tem botão "Deposit ckBTC to ICDex" mas a mutação falha porque `depositCkBTC` não existe no backend

## Requested Changes (Diff)

### Add
- Função `depositAssets()` no backend que:
  1. Chama `icDex.getDepositAccount({ owner = botPrincipal })` para obter a subaccount de depósito
  2. Transfere o ckBTC do canister para essa subaccount via `ckbtcLedger.icrc1_transfer`
  3. Transfere o ICP do canister para essa subaccount via `icpLedger.transfer` (ICS-1)
  4. Regista cada passo e erro no Activity Log
  5. Retorna `{ #ok; #err : Text }`
- Renomear `depositCkBTC` para `depositAssets` no frontend (botão passa a dizer "Deposit Assets to ICDex")
- Adicionar `depositAssets` ao `TradingBotActor` interface e mutation no `useQueries.ts`
- Actualizar `BalancePanel.tsx` para usar `useDepositAssets` em vez de `useDepositCkBTC`

### Modify
- `backend.d.ts`: adicionar `depositAssets()` com tipo de retorno correcto
- `useQueries.ts`: substituir `useDepositCkBTC` por `useDepositAssets` apontando para `depositAssets()`
- `BalancePanel.tsx`: usar `useDepositAssets`, botão deposita ICP + ckBTC, mostrar erros detalhados

### Remove
- Referências à função `depositCkBTC` (inexistente no backend) para evitar erros de chamada

## Implementation Plan

1. **Backend**: Adicionar ao `main.mo`:
   - Interface `IcpLedger` com método `transfer` (ICS-1 blob account + amount)
   - Função `depositAssets()`:
     - Obter subaccount de depósito via `getDepositAccount`
     - Transferir ckBTC com `icrc1_transfer` para `{ owner = icDexPrincipal; subaccount = ?depositSubaccount }`
     - Transferir ICP com `icpLedger.transfer` para a account derivada da subaccount
     - Log cada operação com resultado
     - Retornar `#ok` ou `#err(mensagem)`

2. **Frontend**:
   - Actualizar `useQueries.ts`: substituir `depositCkBTC` por `depositAssets`
   - Actualizar `BalancePanel.tsx`: botão "Deposit Assets to ICDex", feedback actualizado
   - Actualizar `backend.d.ts`: adicionar tipo `depositAssets`
