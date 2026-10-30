# Делим — единый контракт UI ↔ Логика (v2)

Этот документ фиксирует типы данных, операции, ошибки, форматы хранения, правила денежных вычислений и приемочные сценарии, обязательные для обеих сторон.

## 1. Типы данных (TypeScript)

```ts
// Идентификаторы — canonical UUID v4 (строка), валидируются как lower-case hex с дефисами
export type UUID = string;

// Денежные суммы — целые копейки (integer, безопасные для JS number)
export type Cents = number; // ограничение: 0 < Cents <= 9e15

export interface Participant {
  id: UUID;
  name: string; // уникально в рамках счёта, сравнение без учёта регистра
  createdAt: number; // epoch ms
  archived?: boolean; // soft-hide, по умолчанию false
}

export interface Expense {
  id: UUID;
  title: string; // UI-термин; в логике "description"
  amountCents: Cents; // > 0
  payerId: UUID; // существующий участник
  involvedIds: UUID[]; // список бенефициаров, непустой, уникальные id
  createdAt: number; // epoch ms
}

export interface BalanceRow {
  participantId: UUID;
  paidCents: Cents;
  owedCents: Cents;
  netCents: Cents; // paid - owed; >0 кредитор, <0 должник
}

export interface TransferSuggestion {
  fromId: UUID; // должник
  toId: UUID;   // кредитор
  amountCents: Cents; // > 0
}

export interface ApplicationState {
  schemaVersion: 1;
  participants: Participant[];
  expenses: Expense[];
  meta: {
    createdAt: number;
    updatedAt: number;
  };
}

// Результат операции: либо успех, либо типизированная ошибка
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
  message: string; // локализуемый на UI уровне
  details?: Record<string, unknown>;
}

export type Result<T> = { ok: true; value: T } | { ok: false; error: LogicError };
```

## 2. API операций

```ts
// Участники
export function addParticipant(state: ApplicationState, name: string): Result<{ state: ApplicationState; participant: Participant }>;
export function canRemoveParticipant(state: ApplicationState, participantId: UUID): boolean; // false, если участник фигурирует в расходах
export function removeParticipant(state: ApplicationState, participantId: UUID): Result<{ state: ApplicationState }>;
export function archiveParticipant(state: ApplicationState, participantId: UUID, archived: boolean): Result<{ state: ApplicationState }>;

// Расходы
export interface AddExpenseInput {
  title: string;
  amountCents: Cents; // > 0
  payerId: UUID;      // существующий
  involvedIds: UUID[]; // непустой, уникальные id
}

export function addExpense(state: ApplicationState, input: AddExpenseInput): Result<{ state: ApplicationState; expense: Expense }>;
export function listExpenses(state: ApplicationState): Expense[]; // сортировка: по createdAt убыв.
export function deleteExpense(state: ApplicationState, expenseId: UUID): Result<{ state: ApplicationState }>;

// Расчёты
export function computeBalances(state: ApplicationState): Result<BalanceRow[]>;
export function suggestTransfers(balances: BalanceRow[]): Result<TransferSuggestion[]>;

// Хранение
export function serialize(state: ApplicationState): Result<string>; // JSON
export function deserialize(payload: string): Result<ApplicationState>;

// Снапшот
export interface StoreSnapshot {
  participants: Participant[];
  expenses: Expense[];
}

export function loadSnapshot(localStorageKey: string): Result<ApplicationState>; // key: 'delim:v1'
export function saveSnapshot(localStorageKey: string, state: ApplicationState): Result<void>;
```

## 3. Правила денежных вычислений

- Все денежные значения — копейки (`Cents`), целые числа в диапазоне `0 < amountCents <= 9e15`.
- Деление суммы `amountCents` на `N = involvedIds.length`:
  1. `base = Math.floor(amountCents / N)`.
  2. `remainder = amountCents % N`.
  3. Отсортировать `involvedIds` лексикографически по `UUID`.
  4. Первым `remainder` участникам выдать `base + 1`, остальным `base`.
- Инварианты: сумма долей = `amountCents`; суммы не отрицательны; детерминизм.
- Плательщик может отсутствовать среди `involvedIds`; тогда он кредитор на полную сумму.

## 4. Формат хранения состояния (localStorage)

- Ключ: `delim:v1`.
- Значение: JSON сериализация `ApplicationState`.
- Десериализация сопровождается строгой валидацией: типы, UUID формат, уникальность id, ссылки, суммы > 0, пределы.
- При ошибках чтения/повреждения: `STATE_DATA_CORRUPTED` или `STATE_SCHEMA_VERSION_UNSUPPORTED`; UI предлагает сброс, операция не меняет состояние.
- При недоступности `localStorage`: ошибка `STORAGE_UNAVAILABLE`.

## 5. Ограничения и валидация

- Участник: `name.trim().length > 0`, уникален без учёта регистра.
- Расход: `title.trim().length > 0`, `amountCents > 0`, `payerId` существует, `involvedIds.length >= 1`, все `involvedIds` существуют и уникальны.
- Безопасные суммы: `amountCents <= 9e15`; агрегированные суммы не должны превышать `Number.MAX_SAFE_INTEGER` при суммировании.
- Операции атомарны: при ошибке состояние не меняется.

## 6. Сортировка и детерминизм

- История расходов (`listExpenses`) — по `createdAt` убыванию.
- Распределение остатков и взаимозачёт — детерминированный порядок по `UUID`.
- `suggestTransfers`: жадный алгоритм: должники → кредиторы, оба списка отсортированы по `UUID`; переводы без нулевых и отрицательных сумм.

## 7. Приёмочные сценарии (Given / When / Then)

1. Добавление участника: Given пустой список; When имя уникально; Then участник добавлен, `createdAt` проставлен.
2. Валидация имени: Given уже есть «Анна»; When вводится «анна»; Then ошибка `INVALID_PARTICIPANT_NAME`.
3. Добавление расхода: Given есть участники; When поля валидны; Then запись добавлена, история обновлена.
4. Удаление расхода: Given запись существует; When удаление; Then запись исчезает, балансы/переводы пересчитаны.
5. Балансы: Given расходы; When computeBalances; Then `sum(netCents) === 0`.
6. Переводы: Given смешанные нетто; When suggestTransfers; Then переводы закрывают долги, без нулевых сумм, детерминированы.
7. Сериализация: Given состояние; When serialize/deserialize; Then эквивалентность, ошибки при повреждении не изменяют состояние.
8. Демонстрационный пример: Аня, Маша, Дима; расходы 4500₽ (на троих, платит Аня) и 1500₽ (на троих, платит Маша); Then переводы: Маша → Аня 500₽, Дима → Аня 2000₽; итоговые расходы по 2000₽.

## 8. UI состояния

- Успехи: ненавязчивые уведомления.
- Ошибки: inline и/или тосты с маппингом `LogicError.code → сообщение на русском`.
- Пустые состояния: информативные.

## 9. Совместимость и эволюция

- `schemaVersion=1` в v2; будущие миграции через проверку версии.
- Взвешенные доли не поддерживаются в первой версии; расширение возможно позже без ломки контракта.
