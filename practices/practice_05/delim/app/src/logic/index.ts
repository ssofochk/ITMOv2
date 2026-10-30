import { type ApplicationState, type Participant, type Expense, type AddExpenseInput, type UpdateExpenseInput, type BalanceRow, type Result, type TransferSuggestion, type UUID, type Cents, LOCAL_STORAGE_KEY } from '../contract/types';

// Small helpers
const now = (): number => Date.now();
const isUUID = (id: string): boolean => /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(id);
const genUUID = (): string => {
  // Simplified UUID v4 generator for local use; not cryptographically strong
  // Ensures canonical lower-case hex format
  const s = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
  return s;
};

const normalizeName = (name: string): string => name.trim();
const nameKey = (name: string): string => normalizeName(name).toLocaleLowerCase('ru-RU');

export function emptyState(): ApplicationState {
  const t = now();
  return { schemaVersion: 1, participants: [], expenses: [], meta: { createdAt: t, updatedAt: t } };
}

// Participants
export function addParticipant(state: ApplicationState, name: string): Result<{ state: ApplicationState; participant: Participant }> {
  const n = normalizeName(name);
  if (!n) return { ok: false, error: { code: 'INVALID_PARTICIPANT_NAME', message: 'Имя участника не может быть пустым' } };
  const key = nameKey(n);
  const exists = state.participants.some(p => nameKey(p.name) === key);
  if (exists) return { ok: false, error: { code: 'INVALID_PARTICIPANT_NAME', message: 'Имя участника должно быть уникальным' } };
  const id = genUUID();
  const participant: Participant = { id, name: n, createdAt: now(), archived: false };
  const next: ApplicationState = { ...state, participants: [...state.participants, participant], meta: { ...state.meta, updatedAt: now() } };
  return { ok: true, value: { state: next, participant } };
}

export function canRemoveParticipant(state: ApplicationState, participantId: UUID): boolean {
  return !state.expenses.some(e => e.payerId === participantId || e.involvedIds.includes(participantId));
}

export function removeParticipant(state: ApplicationState, participantId: UUID): Result<{ state: ApplicationState }> {
  const idx = state.participants.findIndex(p => p.id === participantId);
  if (idx === -1) return { ok: false, error: { code: 'PARTICIPANT_NOT_FOUND', message: 'Участник не найден' } };
  if (!canRemoveParticipant(state, participantId)) {
    return { ok: false, error: { code: 'PARTICIPANT_IN_USE', message: 'Участник фигурирует в истории расходов' } };
  }
  const nextParticipants = state.participants.filter(p => p.id !== participantId);
  const next: ApplicationState = { ...state, participants: nextParticipants, meta: { ...state.meta, updatedAt: now() } };
  return { ok: true, value: { state: next } };
}

export function archiveParticipant(state: ApplicationState, participantId: UUID, archived: boolean): Result<{ state: ApplicationState }> {
  const idx = state.participants.findIndex(p => p.id === participantId);
  if (idx === -1) return { ok: false, error: { code: 'PARTICIPANT_NOT_FOUND', message: 'Участник не найден' } };
  const nextParticipants = state.participants.map(p => (p.id === participantId ? { ...p, archived } : p));
  const next: ApplicationState = { ...state, participants: nextParticipants, meta: { ...state.meta, updatedAt: now() } };
  return { ok: true, value: { state: next } };
}

// Expenses
export function addExpense(state: ApplicationState, input: AddExpenseInput): Result<{ state: ApplicationState; expense: Expense }> {
  const title = normalizeName(input.title);
  if (!title) return { ok: false, error: { code: 'INVALID_EXPENSE_DESCRIPTION', message: 'Название расхода не может быть пустым' } };
  const amount = input.amountCents;
  if (!(amount > 0) || !Number.isFinite(amount)) {
    return { ok: false, error: { code: 'INVALID_AMOUNT_ZERO_OR_NEGATIVE', message: 'Сумма расхода должна быть больше 0' } };
  }
  if (!Number.isInteger(amount)) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Сумма должна быть целым числом копеек' } };
  }
  if (amount > 9e15) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Сумма превышает допустимый предел' } };
  }
  const payer = state.participants.find(p => p.id === input.payerId);
  if (!payer) return { ok: false, error: { code: 'PAYER_NOT_FOUND', message: 'Плательщик не найден' } };
  const ids = Array.from(new Set(input.involvedIds));
  if (ids.length < 1) return { ok: false, error: { code: 'INVALID_SPLIT_AMONG', message: 'Нужно выбрать минимум одного участника расхода' } };
  const allExist = ids.every(id => state.participants.some(p => p.id === id));
  if (!allExist) return { ok: false, error: { code: 'INVALID_SPLIT_AMONG', message: 'Список участников расхода содержит несуществующие id' } };

  let id = genUUID();
  // ensure unique expense id
  const existing = new Set(state.expenses.map(e => e.id));
  let guard = 0;
  while (existing.has(id) && guard++ < 3) id = genUUID();
  const expense: Expense = { id, title, amountCents: amount, payerId: payer.id, involvedIds: ids, createdAt: now() };
  const next: ApplicationState = { ...state, expenses: [expense, ...state.expenses], meta: { ...state.meta, updatedAt: now() } };
  return { ok: true, value: { state: next, expense } };
}

export function updateExpense(state: ApplicationState, input: UpdateExpenseInput): Result<{ state: ApplicationState; expense: Expense }> {
  // Validate expense exists
  const idx = state.expenses.findIndex(e => e.id === input.expenseId);
  if (idx === -1) return { ok: false, error: { code: 'EXPENSE_NOT_FOUND', message: 'Расход не найден' } };
  // Validate fields (same rules as addExpense)
  const title = normalizeName(input.title);
  if (!title) return { ok: false, error: { code: 'INVALID_EXPENSE_DESCRIPTION', message: 'Название расхода не может быть пустым' } };
  const amount = input.amountCents;
  if (!(amount > 0) || !Number.isFinite(amount)) {
    return { ok: false, error: { code: 'INVALID_AMOUNT_ZERO_OR_NEGATIVE', message: 'Сумма расхода должна быть больше 0' } };
  }
  if (!Number.isInteger(amount)) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Сумма должна быть целым числом копеек' } };
  }
  if (amount > 9e15) {
    return { ok: false, error: { code: 'VALIDATION', message: 'Сумма превышает допустимый предел' } };
  }
  const payer = state.participants.find(p => p.id === input.payerId && !p.archived);
  if (!payer) return { ok: false, error: { code: 'PAYER_NOT_FOUND', message: 'Плательщик не найден или архивирован' } };
  const ids = Array.from(new Set(input.involvedIds));
  if (ids.length < 1) return { ok: false, error: { code: 'INVALID_SPLIT_AMONG', message: 'Нужно выбрать минимум одного участника расхода' } };
  const allExist = ids.every(id => state.participants.some(p => p.id === id));
  if (!allExist) return { ok: false, error: { code: 'INVALID_SPLIT_AMONG', message: 'Список участников расхода содержит несуществующие id' } };
  // Preserve identity
  const prev = state.expenses[idx];
  const updated: Expense = { id: prev.id, createdAt: prev.createdAt, title, amountCents: amount, payerId: payer.id, involvedIds: ids } as Expense;
  const nextExpenses = [...state.expenses];
  nextExpenses[idx] = updated;
  const next: ApplicationState = { ...state, expenses: nextExpenses, meta: { ...state.meta, updatedAt: now() } };
  return { ok: true, value: { state: next, expense: updated } };
}

export function listExpenses(state: ApplicationState): Expense[] {
  return [...state.expenses].sort((a, b) => b.createdAt - a.createdAt);
}

export function deleteExpense(state: ApplicationState, expenseId: UUID): Result<{ state: ApplicationState }> {
  const exists = state.expenses.some(e => e.id === expenseId);
  if (!exists) return { ok: false, error: { code: 'EXPENSE_NOT_FOUND', message: 'Расход не найден' } };
  const next: ApplicationState = { ...state, expenses: state.expenses.filter(e => e.id !== expenseId), meta: { ...state.meta, updatedAt: now() } };
  return { ok: true, value: { state: next } };
}

// Balances
export function computeBalances(state: ApplicationState): Result<BalanceRow[]> {
  // Prepare maps
  const paid: Record<UUID, Cents> = {};
  const owed: Record<UUID, Cents> = {};
  for (const p of state.participants) {
    paid[p.id] = 0;
    owed[p.id] = 0;
  }

  for (const e of state.expenses) {
    // payer adds full amount to paid
    const nextPaid = (paid[e.payerId] ?? 0) + e.amountCents;
    if (!Number.isSafeInteger(nextPaid)) {
      return { ok: false, error: { code: 'STATE_DATA_CORRUPTED', message: 'Переполнение суммы "заплатил"' } };
    }
    paid[e.payerId] = nextPaid;

    // split amounts deterministically
    const ids = [...e.involvedIds].sort(); // lexicographic by UUID
    const n = ids.length;
    const base = Math.floor(e.amountCents / n);
    const remainder = e.amountCents % n;
    ids.forEach((id, idx) => {
      const share = base + (idx < remainder ? 1 : 0);
      const nextOwed = (owed[id] ?? 0) + share;
      if (!Number.isSafeInteger(nextOwed)) {
        return; // will be caught below as corrupted
      }
      owed[id] = nextOwed;
    });
    // quick check after distribution for any non-safe owed
    for (const id of ids) {
      const v = owed[id] ?? 0;
      if (!Number.isSafeInteger(v)) {
        return { ok: false, error: { code: 'STATE_DATA_CORRUPTED', message: 'Переполнение суммы "должен был"' } };
      }
    }
  }

  const balances: BalanceRow[] = state.participants.map(p => {
    const net = (paid[p.id] ?? 0) - (owed[p.id] ?? 0);
    return { participantId: p.id, paidCents: paid[p.id] ?? 0, owedCents: owed[p.id] ?? 0, netCents: net };
  });

  const sumNet = balances.reduce((s, b) => s + b.netCents, 0);
  if (!Number.isSafeInteger(sumNet)) {
    return { ok: false, error: { code: 'STATE_DATA_CORRUPTED', message: 'Переполнение суммарного баланса' } };
  }
  if (sumNet !== 0) {
    return { ok: false, error: { code: 'STATE_DATA_CORRUPTED', message: 'Сумма чистых балансов должна быть равна нулю' } };
  }
  return { ok: true, value: balances };
}

// Transfers
export function suggestTransfers(balances: BalanceRow[]): Result<TransferSuggestion[]> {
  const creditors = balances.filter(b => b.netCents > 0).map(b => ({ id: b.participantId, credit: b.netCents }));
  const debtors = balances.filter(b => b.netCents < 0).map(b => ({ id: b.participantId, debt: -b.netCents }));
  creditors.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  debtors.sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  const transfers: TransferSuggestion[] = [];
  let ci = 0;
  for (let di = 0; di < debtors.length; di++) {
    let d = debtors[di].debt;
    const fromId = debtors[di].id;
    while (d > 0 && ci < creditors.length) {
      const c = creditors[ci];
      if (c.credit === 0) {
        ci++;
        continue;
      }
      const amt = Math.min(d, c.credit);
      if (amt > 0) transfers.push({ fromId, toId: c.id, amountCents: amt });
      d -= amt;
      c.credit -= amt;
      if (c.credit === 0) ci++;
    }
    if (d !== 0) {
      return { ok: false, error: { code: 'STATE_DATA_CORRUPTED', message: 'Не удалось полностью закрыть долг' } };
    }
  }
  return { ok: true, value: transfers };
}

// Serialization
export function serialize(state: ApplicationState): Result<string> {
  try {
    const payload = JSON.stringify(state);
    return { ok: true, value: payload };
  } catch (e) {
    return { ok: false, error: { code: 'STATE_DATA_CORRUPTED', message: 'Ошибка сериализации', details: { e } } };
  }
}

export function deserialize(payload: string): Result<ApplicationState> {
  try {
    const parsed = JSON.parse(payload) as ApplicationState;
    if (parsed.schemaVersion !== 1) {
      return { ok: false, error: { code: 'STATE_SCHEMA_VERSION_UNSUPPORTED', message: 'Неподдерживаемая версия схемы' } };
    }
    // basic validation
    const pidSet = new Set<string>();
    for (const p of parsed.participants) {
      if (!p.name || typeof p.name !== 'string') return { ok: false, error: { code: 'STATE_DATA_CORRUPTED', message: 'Некорректное имя участника' } };
      if (!isUUID(p.id)) return { ok: false, error: { code: 'INVALID_ID_FORMAT', message: 'Некорректный формат id участника' } };
      if (pidSet.has(p.id)) return { ok: false, error: { code: 'DUPLICATE_PARTICIPANT_ID', message: 'Дубликат id участника' } };
      pidSet.add(p.id);
    }
    const eidSet = new Set<string>();
    for (const e of parsed.expenses) {
      if (!e.title || typeof e.title !== 'string') return { ok: false, error: { code: 'STATE_DATA_CORRUPTED', message: 'Некорректное название расхода' } };
      if (!isUUID(e.id)) return { ok: false, error: { code: 'INVALID_ID_FORMAT', message: 'Некорректный формат id расхода' } };
      if (eidSet.has(e.id)) return { ok: false, error: { code: 'DUPLICATE_EXPENSE_ID', message: 'Дубликат id расхода' } };
      eidSet.add(e.id);
      if (!(e.amountCents > 0)) return { ok: false, error: { code: 'INVALID_AMOUNT_ZERO_OR_NEGATIVE', message: 'Сумма расхода должна быть > 0' } };
      if (!pidSet.has(e.payerId)) return { ok: false, error: { code: 'PAYER_NOT_FOUND', message: 'Плательщик отсутствует' } };
      if (!Array.isArray(e.involvedIds) || e.involvedIds.length < 1) return { ok: false, error: { code: 'INVALID_SPLIT_AMONG', message: 'Список участников расхода пуст' } };
      for (const id of new Set(e.involvedIds)) {
        if (!pidSet.has(id)) return { ok: false, error: { code: 'INVALID_SPLIT_AMONG', message: 'Список участников расхода содержит несуществующие id' } };
      }
    }
    return { ok: true, value: parsed };
  } catch (e) {
    return { ok: false, error: { code: 'STATE_DATA_CORRUPTED', message: 'Некорректный формат состояния', details: { e } } };
  }
}

// Storage layer
export function loadSnapshot(localStorageKey: string = LOCAL_STORAGE_KEY): Result<ApplicationState> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ok: false, error: { code: 'STORAGE_UNAVAILABLE', message: 'localStorage недоступен' } };
    }
    const raw = window.localStorage.getItem(localStorageKey);
    if (!raw) return { ok: true, value: emptyState() };
    const res = deserialize(raw);
    return res.ok ? res : { ok: false, error: res.error };
  } catch (e) {
    return { ok: false, error: { code: 'STORAGE_UNAVAILABLE', message: 'Ошибка доступа к localStorage', details: { e } } };
  }
}

export function saveSnapshot(localStorageKey: string = LOCAL_STORAGE_KEY, state: ApplicationState): Result<void> {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return { ok: false, error: { code: 'STORAGE_UNAVAILABLE', message: 'localStorage недоступен' } };
    }
    const ser = serialize(state);
    if (!ser.ok) return { ok: false, error: ser.error };
    window.localStorage.setItem(localStorageKey, ser.value);
    return { ok: true, value: undefined };
  } catch (e) {
    return { ok: false, error: { code: 'STORAGE_UNAVAILABLE', message: 'Ошибка записи в localStorage', details: { e } } };
  }
}

// Re-export API for UI consumption
export const api = {
  addParticipant,
  canRemoveParticipant,
  removeParticipant,
  archiveParticipant,
  addExpense,
  updateExpense,
  listExpenses,
  deleteExpense,
  computeBalances,
  suggestTransfers,
  serialize,
  deserialize,
  loadSnapshot,
  saveSnapshot,
};
