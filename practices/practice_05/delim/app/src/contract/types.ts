// Автономный контракт для Делим (синхронизирован с docs/contract.md)
export type UUID = string;
export type Cents = number; // 0 < Cents <= 9e15

export interface Participant {
  id: UUID;
  name: string; // уникально без учёта регистра
  createdAt: number; // epoch ms
  archived?: boolean;
}

export interface Expense {
  id: UUID;
  title: string;
  amountCents: Cents;
  payerId: UUID;
  involvedIds: UUID[];
  createdAt: number;
}

export interface BalanceRow {
  participantId: UUID;
  paidCents: Cents;
  owedCents: Cents;
  netCents: Cents;
}

export interface TransferSuggestion {
  fromId: UUID;
  toId: UUID;
  amountCents: Cents;
}

export interface ApplicationState {
  schemaVersion: 1;
  participants: Participant[];
  expenses: Expense[];
  meta: { createdAt: number; updatedAt: number };
}

export interface LogicError {
  code:
    | 'INVALID_PARTICIPANT_NAME'
    | 'PARTICIPANT_NOT_FOUND'
    | 'PARTICIPANT_IN_USE'
    | 'PAYER_NOT_FOUND'
    | 'INVALID_EXPENSE_DESCRIPTION'
    | 'INVALID_AMOUNT_ZERO_OR_NEGATIVE'
    | 'INVALID_SPLIT_AMONG'
    | 'EXPENSE_NOT_FOUND'
    | 'DUPLICATE_PARTICIPANT_ID'
    | 'DUPLICATE_EXPENSE_ID'
    | 'INVALID_ID_FORMAT'
    | 'STATE_SCHEMA_VERSION_UNSUPPORTED'
    | 'STATE_DATA_CORRUPTED'
    | 'STORAGE_UNAVAILABLE'
    | 'VALIDATION';
  message: string;
  details?: Record<string, unknown>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: LogicError };

export interface AddExpenseInput {
  title: string;
  amountCents: Cents;
  payerId: UUID;
  involvedIds: UUID[];
}

export interface UpdateExpenseInput {
  expenseId: UUID;
  title: string;
  amountCents: Cents;
  payerId: UUID;
  involvedIds: UUID[];
}

// API surface
export interface ContractAPI {
  addParticipant(state: ApplicationState, name: string): Result<{ state: ApplicationState; participant: Participant }>;
  canRemoveParticipant(state: ApplicationState, participantId: UUID): boolean;
  removeParticipant(state: ApplicationState, participantId: UUID): Result<{ state: ApplicationState }>;
  archiveParticipant(state: ApplicationState, participantId: UUID, archived: boolean): Result<{ state: ApplicationState }>;

  addExpense(state: ApplicationState, input: AddExpenseInput): Result<{ state: ApplicationState; expense: Expense }>;
  updateExpense(state: ApplicationState, input: UpdateExpenseInput): Result<{ state: ApplicationState; expense: Expense }>;
  listExpenses(state: ApplicationState): Expense[];
  deleteExpense(state: ApplicationState, expenseId: UUID): Result<{ state: ApplicationState }>;

  computeBalances(state: ApplicationState): Result<BalanceRow[]>;
  suggestTransfers(balances: BalanceRow[]): Result<TransferSuggestion[]>;

  serialize(state: ApplicationState): Result<string>;
  deserialize(payload: string): Result<ApplicationState>;

  loadSnapshot(localStorageKey: string): Result<ApplicationState>;
  saveSnapshot(localStorageKey: string, state: ApplicationState): Result<void>;
}

export const LOCAL_STORAGE_KEY = 'delim:v1';
