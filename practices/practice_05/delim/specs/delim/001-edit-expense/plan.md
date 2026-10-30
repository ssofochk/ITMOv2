# Plan — Edit Expense

1. Objectives
2. Scope Boundaries
3. Risks
4. Milestones
5. Minimal Architecture & Interfaces

## 1. Objectives

- Provide full editing capability for an existing expense: change `title`, `amountCents` (UI in rubles), `payerId`, and `involvedIds` with validation and atomicity.
- Preserve expense identity: `id` and `createdAt` remain unchanged; update `meta.updatedAt`.
- Automatically recompute balances and transfer suggestions after successful save, reflecting determinism per contract.
- Persist changes to `localStorage` (`delim:v1`) and survive reload via existing serialization.
- Reject invalid data with typed errors; do not mutate state on any validation or persistence failure.
- Align strictly with React + TypeScript + Vitest stack and existing project architecture and contract.

## 2. Scope Boundaries

In scope:
- UI: edit entry point from the expenses history; edit form with prefilled fields; Save and Cancel actions; inline validation and error mapping (`LogicError.code → RU message`).
- Logic: introduce `updateExpense(state, input)` following existing `Result` pattern and validation rules equivalent to `addExpense`.
- Persistence: use existing `saveSnapshot` / `loadSnapshot` for atomic save and reload consistency.
- Recalculation: trigger `computeBalances` and `suggestTransfers` after successful update and refresh views.

Out of scope:
- Weighted splits, custom share ratios, or multi-currency support.
- Backend integration or multi-user concurrency control beyond last-write-wins semantics.
- Changes to sorting policy of expenses or historical audit trails beyond preserving `createdAt`.
- Participant management beyond existing operations (no new archive behavior changes).

## 3. Risks

- Validation parity risk: any mismatch with `addExpense` rules could introduce inconsistencies. Mitigation: reuse existing validators or centralize checks.
- Determinism drift: recomputation must adhere to UUID ordering; careless changes may break acceptance. Mitigation: rely on `computeBalances` and `suggestTransfers` as-is; add Vitest coverage.
- Persistence failures: `localStorage` unavailability causing user confusion. Mitigation: ensure UI surfaces `STORAGE_UNAVAILABLE` clearly and avoids partial state mutation.
- UX regression: editing flow could accidentally allow editing immutable fields (`id`, `createdAt`). Mitigation: lock and not expose/modify immutable fields.
- Edge case handling with archived participants: selection states and visibility may confuse users. Mitigation: show indicators, block adding archived participants; allow display of previously archived in existing expense.

## 4. Milestones

1. Spec Alignment: finalize `spec.md` details, confirm constraints with `docs/contract.md`, `docs/ui-spec-v2.md`, `docs/logic-spec-v2.md`.
2. Interface Definition: define `updateExpense` TS signature and validation constraints without implementation.
3. UI Contract: outline props/state for the edit form component(s) and interaction with the store/controller.
4. Test Planning: define Vitest cases for validation, atomic update behavior, persistence, and recomputation determinism.
5. Implementation Prep: map tasks to files and modules per current architecture; ensure no changes to unrelated practices or OpenCode config.

## 5. Minimal Architecture & Interfaces

UI (React + TypeScript):
- Component: `ExpenseEditDialog` (or inline form) — controlled component presenting fields `title`, `amountRub`, `payerId`, `involvedIds` with validation feedback; actions: `onSave(input)`, `onCancel()`.
- Trigger: from `ExpensesList`, action "Edit" on a specific expense opens the edit component prefilled from state.
- Store/Controller boundary: UI calls a controller function to perform update and persistence; on success, UI refreshes balances/transfers views.

Logic (TypeScript):
- Function interface:
  - `export interface UpdateExpenseInput { expenseId: UUID; title: string; amountCents: Cents; payerId: UUID; involvedIds: UUID[] }`
  - `export function updateExpense(state: ApplicationState, input: UpdateExpenseInput): Result<{ state: ApplicationState; expense: Expense }>`
- Behavior: validate input (same rules as `addExpense`), find expense by `expenseId`, apply changes preserving `id` and `createdAt`, update `meta.updatedAt`; on any error, return `Result` with appropriate `LogicError.code` without mutating input `state`.

Persistence & Recalculation:
- After `updateExpense` success, controller invokes `saveSnapshot('delim:v1', state)`; errors produce `STORAGE_UNAVAILABLE` surfaced to UI, no partial updates.
- Recompute via `computeBalances(state)` and `suggestTransfers(balances)` and propagate results to UI state.

Testing (Vitest):
- Cases for: valid update path (fields change, identity preserved), invalid title/amount/payer/involved sets (errors, no mutation), persistence failure handling, recomputation determinism (`sum(netCents) === 0`, positive transfers only, UUID-ordered results).
