# Proposal

## Why

The "Delim" app needs a clear, spec-driven UI baseline for editing existing expenses. This change establishes UI capability definitions aligned with the business rules already captured by the logic team, enabling consistent validation, atomic updates, and deterministic recalculation visibility for users.

## What Changes

- Define UI capability boundaries and requirements surfaces for expense editing
- Enumerate UI constraints mapping from logic errors to messages
- Identify affected components and views (edit form, expenses list, balances, transfers)

## Capabilities

### New Capabilities
- ui/delim/expense-edit: UI surfaces and flows for editing an existing expense, validating input, and reflecting recalculated balances/transfers

### Modified Capabilities
- (none)

## Impact

- UI components and controllers in the Delim app
- Error mapping from logic codes to UI messages
