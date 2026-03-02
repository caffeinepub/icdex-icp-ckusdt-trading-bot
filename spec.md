# Specification

## Summary
**Goal:** Perform a cleanup/code review pass on both backend and frontend code — removing dead code, unused variables, redundant imports, and stale comments — without changing any observable behaviour or public APIs.

**Planned changes:**
- Audit `backend/main.mo`: remove unused let/var bindings, dead/unreachable code blocks, redundant imports, and stale or misleading comments
- Audit `backend/migration.mo`: simplify or reduce to a minimal stub if its logic is no longer relevant to the current stable state shape
- Audit all (non-immutable) frontend source files: remove unused React imports, unused state variables, dead components, duplicate fetch/query logic, and reconcile inconsistent naming conventions (camelCase for variables/functions, PascalCase for components)

**User-visible outcome:** The codebase is cleaner and free of dead code, but all existing UI panels and backend functions behave exactly as before.
