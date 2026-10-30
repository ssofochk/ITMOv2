# Feature Specification: Edit Expense

**Feature Branch**: `[001-edit-expense]`

**Created**: 2026-10-30

**Status**: Draft

**Input**: User description: "Добавить в существующее приложение «Делим» полноценное редактирование ранее созданного расхода.

Пользователь должен иметь возможность выбрать существующий расход, изменить название, сумму, плательщика и список участников разделения, сохранить изменения или отменить редактирование.

После успешного сохранения должны автоматически пересчитываться балансы и рекомендуемые переводы. Изменения должны сохраняться после перезагрузки страницы. Некорректные данные должны отклоняться без изменения исходного расхода.

Контекст: practices/practice_05/delim/. Используй существующие документы docs/contract.md, docs/ui-spec-v2.md и docs/logic-spec-v2.md как ограничения совместимости.

Создай НОВУЮ спецификацию функции через настоящий workflow GitHub Spec Kit. Не перезаписывай предыдущие спецификации и не изменяй существующий код.

Это этап Specify. К реализации переходить запрещено до завершения Plan, Tasks и Analyze.

Все новые артефакты должны относиться исключительно к проекту delim. Не изменяй другие практические работы и корпоративную конфигурацию OpenCode."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Edit existing expense (Priority: P1)

As a user, I can select an existing expense from the history, open it in an edit form, change title, amount (rubles, > 0), payer (existing participant), and involved participants (multi-select, at least one), and save the changes atomically.

**Why this priority**: Core capability to correct mistakes and adjust records without creating duplicates or losing history.

**Independent Test**: Starting with a non-empty history, select one expense, apply valid changes, save; verify the expense is updated in place (same `id`, same `createdAt`), balances and transfers reflect the new values, and data persists across reload.

**Acceptance Scenarios**:

1. Given an existing expense E with valid fields, When I open E and change title, amount, payer, and involvedIds to another valid set, Then the update succeeds, E keeps its `id` and `createdAt`, `application.meta.updatedAt` changes, balances and transfers recompute deterministically, and the state is persisted under `localStorage` key `delim:v1`.
2. Given an existing expense E, When I change only the title to another non-empty string, Then the update succeeds and other fields remain unchanged.
3. Given an existing expense E, When I change amount to a larger valid amount, Then involved shares recompute per contract rules (equal split with remainder by UUID order).
4. Given an existing expense E, When I change payer to a different existing participant (possibly not in `involvedIds`), Then update succeeds and balances reflect payer credit appropriately.

---

### User Story 2 - Cancel editing (Priority: P2)

As a user, I can cancel editing without saving, and the original expense remains unchanged.

**Why this priority**: Prevent unintended changes; respect atomicity and user control.

**Independent Test**: Open edit form for an expense, modify fields, press Cancel; verify no changes in history or balances; after reload state is unchanged.

**Acceptance Scenarios**:

1. Given an existing expense E, When I open edit and press Cancel, Then no state changes occur.
2. Given an existing expense E, When I edit fields and navigate away without saving (e.g., switch tab), Then no state changes occur.

---

### User Story 3 - Validation blocks invalid data (Priority: P1)

As a user, I receive inline validation errors and cannot save invalid changes; the original expense remains unchanged.

**Why this priority**: Maintain invariants and data integrity.

**Independent Test**: Attempt to save with empty title, zero or negative amount, non-existent payer, empty or invalid involved set; verify error codes map to UI messages; state not mutated.

**Acceptance Scenarios**:

1. Given edit form for E, When title is empty or whitespace, Then saving is blocked with `INVALID_EXPENSE_DESCRIPTION` and state is unchanged.
2. Given edit form for E, When amountCents ≤ 0, Then saving is blocked with `INVALID_AMOUNT_ZERO_OR_NEGATIVE` and state is unchanged.
3. Given edit form for E, When payerId does not exist, Then saving is blocked with `PAYER_NOT_FOUND`.
4. Given edit form for E, When involvedIds is empty or contains non-existent/duplicate ids, Then saving is blocked with `INVALID_SPLIT_AMONG`.
5. Given edit form for E, When expense id does not exist (e.g., stale UI), Then saving fails with `EXPENSE_NOT_FOUND`.

---

### User Story 4 - Persistence across reload (Priority: P1)

As a user, after successful save, all changes are stored and survive page reload.

**Why this priority**: Trust and continuity of records.

**Independent Test**: Save valid edit; reload page; verify the updated expense appears in history with updated fields and recomputed balances/transfers.

**Acceptance Scenarios**:

1. Given an updated expense E, When I reload, Then `deserialize` returns a valid `ApplicationState` containing updated E.
2. Given storage unavailable, When saving edit, Then operation fails with `STORAGE_UNAVAILABLE` and UI communicates persistence issue; in-memory state remains consistent per atomicity.

---

### User Story 5 - Deterministic recalculation (Priority: P2)

As a user, after successful edit, balances and transfer suggestions recompute automatically and deterministically.

**Why this priority**: Immediate feedback ensuring consistency of the account.

**Independent Test**: Edit any field impacting amounts/participants; verify `computeBalances` and `suggestTransfers` outputs match contract rules and determinism.

**Acceptance Scenarios**:

1. Given updated E, When computeBalances runs, Then sum of all `netCents` equals 0.
2. Given balances after update, When suggestTransfers runs, Then transfers have positive amounts only and are ordered deterministically by UUID as per contract.

---

### Edge Cases

- Editing an expense where current payer is archived: UI may show "archived" badge; changing payer must select an active participant. Keeping archived payer without change is allowed to preserve history, if the project policy permits showing archived in existing entries. [Assumption]
- Editing an expense that includes archived participants: show them in chips with an "archived" mark; adding new archived participants is not allowed; removing is allowed. [Assumption]
- Large amounts near upper bound: validation enforces `amountCents <= 9e15`; aggregated sums must remain within safe ranges.
- Concurrent UI edits (same expense open in two tabs): last successful save wins; stale saves must fail with `EXPENSE_NOT_FOUND` if the expense was deleted meanwhile.
- No-op edit (no field changes): saving may be treated as success without state mutation; `updatedAt` may still change. [Assumption]
- Storage errors during save: fail the operation; UI shows persistence error; no partial changes.

## Requirements *(mandatory)*

### Functional Requirements

- FR-001: The system MUST provide a way to open an existing expense in an edit form with prefilled fields: `title`, `amountCents` (displayed as rubles), `payerId`, `involvedIds`.
- FR-002: The system MUST validate edits using the same rules as `addExpense` (see `docs/contract.md` §5) before applying changes.
- FR-003: The system MUST update the expense atomically: on success, mutate only the targeted `Expense` record while preserving `id` and `createdAt`; on any error, the `ApplicationState` MUST remain unchanged.
- FR-004: After a successful update, the system MUST recompute balances via `computeBalances(state)` and transfer suggestions via `suggestTransfers(balances)` and refresh the respective UI views.
- FR-005: The system MUST persist the updated `ApplicationState` via `saveSnapshot('delim:v1', state)` so changes survive reload; failures MUST be surfaced as `STORAGE_UNAVAILABLE` without partial mutation.
- FR-006: The system MUST reject edits referencing non-existent participants (`PAYER_NOT_FOUND`, `INVALID_SPLIT_AMONG`) or invalid UUID formats (`INVALID_ID_FORMAT`).
- FR-007: The system MUST surface `EXPENSE_NOT_FOUND` when updating a non-existent `expenseId`.
- FR-008: The system MUST keep history sorting unchanged: list of expenses remains ordered by `createdAt` desc.
- FR-009: The UI MUST provide Cancel control that closes the edit and discards unsaved changes.
- FR-010: The UI MUST present inline validation messages mapped from `LogicError.code` per `docs/ui-spec-v2.md` §7 and §8.

### Key Entities *(include if feature involves data)

- UpdateExpenseInput: `{ expenseId: UUID; title: string; amountCents: Cents; payerId: UUID; involvedIds: UUID[] }` — валидируется по `docs/contract.md`; ошибки маппятся на UI сообщения per `docs/ui-spec-v2.md` §7/§8.
- Expense (unchanged): `{ id, title, amountCents, payerId, involvedIds, createdAt }` — `id` and `createdAt` are immutable under edit.
- ApplicationState (unchanged): `meta.updatedAt` MUST be updated on successful edit.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- SC-001: A valid edit operation completes under 200ms on a typical dataset (≤ 100 expenses, ≤ 50 participants) on modern hardware.
- SC-002: 100% of invalid edits are blocked without mutating persisted state (verified via `deserialize` after simulated reload).
- SC-003: After a successful edit, balances recompute such that `sum(netCents) === 0` across all participants.
- SC-004: Transfer suggestions contain only positive `amountCents` and are deterministic across repeated runs with identical inputs.
- SC-005: Post-reload verification: The edited expense appears with updated fields; `id` and `createdAt` unchanged; `meta.updatedAt` ≥ previous value.

## Assumptions

- Users operate within a single account; no multi-currency.
- Archived participants are hidden in selection lists for new expenses; in edit, previously involved archived participants may be shown with an "archived" indicator but cannot be newly added; payer selection требует активного участника.
- `localStorage` is available; if unavailable, the UI communicates limited functionality and edit saves fail gracefully.
- No backend; all logic runs in the client per `docs/logic-spec-v2.md`.
- Feature adds a new logic operation `updateExpense(state, input)` consistent with the existing contract patterns (`Result<{ state: ApplicationState; expense: Expense }>`). Contract doc changes, if needed, will be handled in Analyze phase per Governance.
