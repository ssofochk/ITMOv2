# Tasks — Edit Expense

Format: `[ID] [P?] [Story] Description`

Legend:
- [P] can run in parallel (different files, no deps)
- Stories: US1 Edit, US2 Cancel, US3 Validation, US4 Persistence, US5 Determinism

## Phase 1 — Logic API (blocking)

- [ ] T001 [US1] Implement updateExpense(state, input) in app/src/logic/index.ts
- [ ] T002 [US1] Add UpdateExpenseInput and API surface in app/src/contract/types.ts
- [ ] T003 [US1] Unit tests: atomic update, identity preserved in app/src/tests/logic.spec.ts
- [ ] T004 [US3] Unit tests: invalid update blocked, no mutation (serialize/deserialize roundtrip)

## Phase 2 — UI Edit Flow

- [ ] T010 [US1] Add inline edit form in app/src/App.tsx with prefilled fields
- [ ] T011 [US1] Save action: calls api.updateExpense, refreshes balances/transfers
- [ ] T012 [US2] Cancel action: reverts local edit state without mutation
- [ ] T013 [US3] Inline validation messages mapped from LogicError.code
- [ ] T014 [US1] Payer select lists only active participants; archived marked in chips

## Phase 3 — QA and Demo

- [ ] T020 [US4] Manual check: save edit, reload, verify persistence
- [ ] T021 [US5] Determinism check: repeated recompute yields identical outputs
- [ ] T022 [P][US1] Demo script: edit existing expense end-to-end

## Phase 4 — Non-functional & Invariants

- [ ] T023 [US5] Deterministic transfers order: run suggestTransfers twice on same balances and assert identical UUID-ordered results (tests in app/src/tests/logic.spec.ts)
- [ ] T024 [US1] Performance harness: measure updateExpense on typical dataset (≤100 expenses, ≤50 participants) and assert <200ms (app/src/tests/logic.spec.ts)
- [ ] T025 [US3] Post-edit invariant: sum of netCents === 0 after update (app/src/tests/logic.spec.ts)
- [ ] T026 [US3] Update error EXPENSE_NOT_FOUND: stale/missing id returns error and no state mutation (app/src/tests/logic.spec.ts)
- [ ] T027 [US1] History order invariant: listExpenses remains createdAt desc after edit (app/src/tests/logic.spec.ts)
- [ ] T028 [US4] Automated post-reload identity: serialize/deserialize after update preserves id and createdAt (app/src/tests/logic.spec.ts)
