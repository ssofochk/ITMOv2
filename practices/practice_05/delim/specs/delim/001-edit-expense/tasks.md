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
