# Capability Spec — ui/delim/expense-edit

## Purpose
UI surfaces and flows for editing an existing expense in Delim, validating input, and reflecting recalculated balances/transfers.

## Requirements
- The UI MUST present an edit form with prefilled fields: title, amount (rubles), payer, involved participants.
- The UI MUST block invalid edits with inline messages mapped from logic error codes per docs/ui-spec-v2.md §7/§8.
- Error codes shown by UI MUST include at least: INVALID_EXPENSE_DESCRIPTION, INVALID_AMOUNT_ZERO_OR_NEGATIVE, PAYER_NOT_FOUND, INVALID_SPLIT_AMONG, EXPENSE_NOT_FOUND, INVALID_ID_FORMAT, STORAGE_UNAVAILABLE.
- On successful save, the UI MUST refresh balances and transfer views deterministically; ordering follows UUID lexical order and listExpenses sorting by createdAt desc.
- The UI MUST support canceling edits without state mutation.
- Archived participants: UI MUST display previously involved archived participants with an "archived" marker; adding archived participants is blocked; changing payer MUST select only active participants.

## Scenarios
1. Valid edit updates the visible expense fields and refreshes derived views after save; identity (id, createdAt) remains unchanged; meta.updatedAt changes.
2. Invalid edit shows inline errors and does not mutate stored state; deserialize after reload returns the original state.
3. Canceling the edit leaves UI and stored state unchanged.
4. Storage unavailable on save surfaces STORAGE_UNAVAILABLE without partial mutation.
