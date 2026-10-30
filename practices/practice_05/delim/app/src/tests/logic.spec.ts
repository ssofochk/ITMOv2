import { describe, it, expect } from 'vitest';
import { api, emptyState } from '../logic';
import { type ApplicationState, type Result, type BalanceRow, type UUID } from '../contract/types';

function addP(state: ApplicationState, name: string): ApplicationState {
  const r = api.addParticipant(state, name);
  if (!r.ok) throw new Error(r.error.message);
  return r.value.state;
}

function findId(state: ApplicationState, name: string): string {
  const p = state.participants.find(p => p.name === name);
  if (!p) throw new Error('participant not found');
  return p.id;
}

function assertOk<T>(res: Result<T>): T {
  if (!res.ok) throw new Error(res.error.message);
  return res.value;
}

describe('Делим — бизнес-логика', () => {
  it('1. Равное распределение без остатка', () => {
    let s = emptyState();
    s = addP(s, 'Аня');
    s = addP(s, 'Маша');
    const aId = findId(s, 'Аня');
    const mId = findId(s, 'Маша');
    const r = api.addExpense(s, { title: 'Тест', amountCents: 20000, payerId: aId, involvedIds: [aId, mId] });
    expect(r.ok).toBe(true);
    s = r.ok ? r.value.state : s;
    const balances = api.computeBalances(s);
    expect(balances.ok).toBe(true);
    const rows = balances.ok ? balances.value : [];
    const aRow = rows.find(r => r.participantId === aId)!;
    const mRow = rows.find(r => r.participantId === mId)!;
    expect(aRow.netCents).toBe(10000);
    expect(mRow.netCents).toBe(-10000);
  });

  it('2. Остаток копеек распределяется детерминированно', () => {
    let s = emptyState();
    s = addP(s, 'A');
    s = addP(s, 'B');
    s = addP(s, 'C');
    const a = findId(s, 'A');
    const b = findId(s, 'B');
    const c = findId(s, 'C');
    const res = api.addExpense(s, { title: '10₽', amountCents: 1000, payerId: c, involvedIds: [a, b, c] });
    expect(res.ok).toBe(true);
    s = res.ok ? res.value.state : s;
    const balances = api.computeBalances(s);
    expect(balances.ok).toBe(true);
    const rows = balances.ok ? balances.value : [];
    const cRow = rows.find(r => r.participantId === c)!;
    expect(cRow.netCents).toBeGreaterThan(0);
    const transfers = api.suggestTransfers(rows);
    expect(transfers.ok).toBe(true);
    const list = transfers.ok ? transfers.value : [];
    // No zero or negative transfers
    expect(list.every(t => t.amountCents > 0)).toBe(true);
  });

  it('3. Плательщик не входит в список участников расхода', () => {
    let s = emptyState();
    s = addP(s, 'A');
    s = addP(s, 'B');
    s = addP(s, 'C');
    const a = findId(s, 'A');
    const b = findId(s, 'B');
    const c = findId(s, 'C');
    const res = api.addExpense(s, { title: '100₽', amountCents: 10000, payerId: b, involvedIds: [a, c] });
    expect(res.ok).toBe(true);
    s = res.ok ? res.value.state : s;
    const balances = api.computeBalances(s);
    expect(balances.ok).toBe(true);
    const rows = balances.ok ? balances.value : [];
    const bRow = rows.find(r => r.participantId === b)!;
    expect(bRow.netCents).toBe(10000);
  });

  it('4. Несколько расходов с разными плательщиками', () => {
    let s = emptyState();
    s = addP(s, 'A');
    s = addP(s, 'B');
    s = addP(s, 'C');
    const a = findId(s, 'A');
    const b = findId(s, 'B');
    const c = findId(s, 'C');
    const r1 = api.addExpense(s, { title: 'Жильё', amountCents: 40000, payerId: a, involvedIds: [a, b, c] });
    s = r1.ok ? r1.value.state : s;
    const r2 = api.addExpense(s, { title: 'Еда', amountCents: 15000, payerId: b, involvedIds: [a, b, c] });
    expect(r2.ok).toBe(true);
  });

  it('5. Корректный взаимозачёт, отсутствие нулевых переводов', () => {
    let s = emptyState();
    s = addP(s, 'A');
    s = addP(s, 'B');
    const a = findId(s, 'A');
    const b = findId(s, 'B');
    const r = api.addExpense(s, { title: '100₽', amountCents: 10000, payerId: a, involvedIds: [a, b] });
    expect(r.ok).toBe(true);
    s = r.ok ? r.value.state : s;
    const balances = api.computeBalances(s);
    const transfers = api.suggestTransfers(balances.ok ? (balances.value as BalanceRow[]) : []);
    expect(transfers.ok).toBe(true);
    expect(transfers.ok && transfers.value.every(t => t.amountCents > 0)).toBe(true);
  });

  it('6. Сумма всех балансов равна нулю', () => {
    let s = emptyState();
    s = addP(s, 'A');
    s = addP(s, 'B');
    const a = findId(s, 'A');
    const b = findId(s, 'B');
    const r = api.addExpense(s, { title: '200₽', amountCents: 20000, payerId: a, involvedIds: [a, b] });
    expect(r.ok).toBe(true);
    s = r.ok ? r.value.state : s;
    const balances = api.computeBalances(s);
    const sum = (balances.ok ? (balances.value as BalanceRow[]) : []).reduce((acc, b: BalanceRow) => acc + b.netCents, 0);
    expect(sum).toBe(0);
  });

  it('7. Детерминизм: одинаковый вход → одинаковый результат', () => {
    let s = emptyState();
    s = addP(s, 'A'); s = addP(s, 'B'); s = addP(s, 'C');
    const a = findId(s, 'A'); const b = findId(s, 'B'); const c = findId(s, 'C');
    const r = api.addExpense(s, { title: 'X', amountCents: 1000, payerId: c, involvedIds: [a, b, c] });
    s = assertOk(r).state;
    const balances1 = assertOk(api.computeBalances(s));
    // Второй прогон на идентичном состоянии (через serialize/deserialize)
    const ser = assertOk(api.serialize(s));
    const sClone = assertOk(api.deserialize(ser));
    const balances2 = assertOk(api.computeBalances(sClone));
    expect(JSON.stringify(balances1)).toBe(JSON.stringify(balances2));
  });

  it('8. Запрет некорректных сумм', () => {
    let s = emptyState();
    s = addP(s, 'A');
    const a = findId(s, 'A');
    const r = api.addExpense(s, { title: 'X', amountCents: 0, payerId: a, involvedIds: [a] });
    expect(r.ok).toBe(false);
    const r2 = api.addExpense(s, { title: 'X', amountCents: 100.5 as unknown as number, payerId: a, involvedIds: [a] });
    expect(r2.ok).toBe(false);
  });

  it('9. Запрет расходов с несуществующим плательщиком', () => {
    let s = emptyState();
    s = addP(s, 'A');
    const a = findId(s, 'A');
    const r = api.addExpense(s, { title: 'X', amountCents: 100, payerId: '00000000-0000-4000-8000-000000000000', involvedIds: [a] });
    expect(r.ok).toBe(false);
  });

  it('10. Удаление существующего и несуществующего расхода', () => {
    let s = emptyState();
    s = addP(s, 'A');
    const a = findId(s, 'A');
    const r = api.addExpense(s, { title: 'X', amountCents: 100, payerId: a, involvedIds: [a] });
    expect(r.ok).toBe(true);
    s = r.ok ? r.value.state : s;
    const eId = s.expenses[0].id;
    const del = api.deleteExpense(s, eId);
    expect(del.ok).toBe(true);
    const del2 = api.deleteExpense(assertOk(del).state, eId);
    expect(del2.ok).toBe(false);
  });

  it('11. Удаление участника, фигурирующего в истории — запрещено', () => {
    let s = emptyState();
    s = addP(s, 'A');
    s = addP(s, 'B');
    const a = findId(s, 'A');
    const b = findId(s, 'B');
    const r = api.addExpense(s, { title: 'X', amountCents: 100, payerId: a, involvedIds: [a, b] });
    s = assertOk(r).state;
    const del = api.removeParticipant(s, a);
    expect(del.ok).toBe(false);
  });

  it('12. Сериализация и восстановление состояния', () => {
    let s = emptyState();
    s = addP(s, 'A');
    const ser = api.serialize(s);
    expect(ser.ok).toBe(true);
    const de = api.deserialize(assertOk(ser));
    expect(de.ok).toBe(true);
    expect(JSON.stringify(assertOk(de))).toBe(JSON.stringify(s));
  });

  it('13. Обработка повреждённых данных localStorage', () => {
    // Simulate corrupted payload
    const res = api.deserialize('{ broken json');
    expect(res.ok).toBe(false);
    const badState = '{"schemaVersion":1,"participants":[],"expenses":[{"id":"bad","title":"x","amountCents":1,"payerId":"bad","involvedIds":["bad"],"createdAt":0}],"meta":{"createdAt":0,"updatedAt":0}}';
    const res2 = api.deserialize(badState);
    expect(res2.ok).toBe(false);
  });

  it('14. Отсутствие мутаций состояния при ошибках', () => {
    let s = emptyState();
    s = addP(s, 'A');
    const a = findId(s, 'A');
    const r = api.addExpense(s, { title: '', amountCents: 100, payerId: a, involvedIds: [a] });
    expect(r.ok).toBe(false);
    expect(s.expenses.length).toBe(0);
  });

  it('16. Обновление расхода — атомарность и сохранение идентичности', () => {
    let s = emptyState();
    s = addP(s, 'Аня');
    s = addP(s, 'Боб');
    const a = findId(s, 'Аня');
    const b = findId(s, 'Боб');
    const add = api.addExpense(s, { title: 'X', amountCents: 1000, payerId: a, involvedIds: [a, b] });
    expect(add.ok).toBe(true);
    s = add.ok ? add.value.state : s;
    const eId = s.expenses[0].id as UUID;
    const upd = api.updateExpense(s, { expenseId: eId, title: 'Y', amountCents: 2000, payerId: b, involvedIds: [a, b] });
    expect(upd.ok).toBe(true);
    const next = upd.ok ? upd.value.state : s;
    const updated = next.expenses.find(e => e.id === eId)!;
    expect(updated.title).toBe('Y');
    expect(updated.amountCents).toBe(2000);
    expect(updated.createdAt).toBe(s.expenses.find(e => e.id === eId)!.createdAt);
  });

  it('17. Обновление с ошибками — без мутаций', () => {
    let s = emptyState();
    s = addP(s, 'Аня');
    const a = findId(s, 'Аня');
    const add = api.addExpense(s, { title: 'X', amountCents: 1000, payerId: a, involvedIds: [a] });
    s = add.ok ? add.value.state : s;
    const eId = s.expenses[0].id as UUID;
    const upd = api.updateExpense(s, { expenseId: eId, title: '', amountCents: 0, payerId: a, involvedIds: [] });
    expect(upd.ok).toBe(false);
    // serialize/deserialize roundtrip stays equivalent
    const ser = api.serialize(s);
    expect(ser.ok).toBe(true);
    const back = api.deserialize(ser.ok ? ser.value : '');
    expect(back.ok).toBe(true);
  });

  it('18. Детерминированный порядок переводов повторяем', () => {
    let s = emptyState();
    s = addP(s, 'A'); s = addP(s, 'B'); s = addP(s, 'C');
    const a = findId(s, 'A'); const b = findId(s, 'B'); const c = findId(s, 'C');
    const r = api.addExpense(s, { title: 'X', amountCents: 1234, payerId: c, involvedIds: [a, b, c] });
    s = assertOk(r).state;
    const balances = assertOk(api.computeBalances(s));
    const t1 = assertOk(api.suggestTransfers(balances));
    const t2 = assertOk(api.suggestTransfers(balances));
    expect(JSON.stringify(t1)).toBe(JSON.stringify(t2));
  });

  it('19. NET сумм инвариант после обновления', () => {
    let s = emptyState();
    s = addP(s, 'A'); s = addP(s, 'B');
    const a = findId(s, 'A'); const b = findId(s, 'B');
    const add = api.addExpense(s, { title: 'X', amountCents: 1000, payerId: a, involvedIds: [a, b] });
    s = assertOk(add).state;
    const eId = s.expenses[0].id;
    const upd = api.updateExpense(s, { expenseId: eId, title: 'Y', amountCents: 2000, payerId: b, involvedIds: [a, b] });
    s = assertOk(upd).state;
    const balances = assertOk(api.computeBalances(s));
    const sum = balances.reduce((acc, b) => acc + b.netCents, 0);
    expect(sum).toBe(0);
  });

  it('20. EXPENSE_NOT_FOUND при stale id', () => {
    let s = emptyState();
    s = addP(s, 'A');
    const a = findId(s, 'A');
    const r = api.updateExpense(s, { expenseId: '00000000-0000-4000-8000-000000000000', title: 'X', amountCents: 1000, payerId: a, involvedIds: [a] });
    expect(r.ok).toBe(false);
  });

  it('21. Порядок истории по createdAt desc не меняется после edit', () => {
    let s = emptyState();
    s = addP(s, 'A'); s = addP(s, 'B');
    const a = findId(s, 'A'); const b = findId(s, 'B');
    const r1 = api.addExpense(s, { title: 'X1', amountCents: 1000, payerId: a, involvedIds: [a, b] });
    s = assertOk(r1).state;
    const r2 = api.addExpense(s, { title: 'X2', amountCents: 2000, payerId: b, involvedIds: [a, b] });
    s = assertOk(r2).state;
    const before = api.listExpenses(s).map(e => e.id);
    const eId = before[0];
    const upd = api.updateExpense(s, { expenseId: eId, title: 'Y', amountCents: 1500, payerId: a, involvedIds: [a, b] });
    s = assertOk(upd).state;
    const after = api.listExpenses(s).map(e => e.id);
    expect(after).toEqual(before);
  });

  it('22. Автоматизированный пост-ресериализационный тест идентичности', () => {
    let s = emptyState();
    s = addP(s, 'A'); s = addP(s, 'B');
    const a = findId(s, 'A'); const b = findId(s, 'B');
    const add = api.addExpense(s, { title: 'X', amountCents: 1000, payerId: a, involvedIds: [a, b] });
    s = assertOk(add).state;
    const eId = s.expenses[0].id;
    const upd = api.updateExpense(s, { expenseId: eId, title: 'Y', amountCents: 1200, payerId: b, involvedIds: [a, b] });
    s = assertOk(upd).state;
    const ser = assertOk(api.serialize(s));
    const back = assertOk(api.deserialize(ser));
    const e1 = s.expenses.find(e => e.id === eId)!;
    const e2 = back.expenses.find(e => e.id === eId)!;
    expect(e1.id).toBe(e2.id);
    expect(e1.createdAt).toBe(e2.createdAt);
  });

  it('15. Демонстрационный пример', () => {
    let s = emptyState();
    s = addP(s, 'Аня');
    s = addP(s, 'Маша');
    s = addP(s, 'Дима');
    const a = findId(s, 'Аня');
    const m = findId(s, 'Маша');
    const d = findId(s, 'Дима');
    const r1 = api.addExpense(s, { title: 'Жильё', amountCents: 450000, payerId: a, involvedIds: [a, m, d] });
    s = assertOk(r1).state;
    const r2 = api.addExpense(s, { title: 'Продукты', amountCents: 150000, payerId: m, involvedIds: [a, m, d] });
    s = assertOk(r2).state;
    const balances = assertOk(api.computeBalances(s));
    // У каждого должно быть потрачено по 2000₽
    const netBy = Object.fromEntries(balances.map(b => [b.participantId, b.netCents]));
    expect(netBy[a]).toBe(250000); // Аня заплатила 4500, должна была 2000 → +2500₽
    expect(netBy[m]).toBe(-50000); // Маша заплатила 1500, должна была 2000 → −500₽
    expect(netBy[d]).toBe(-200000); // Дима не платил, должен был 2000 → −2000₽
    const trs = assertOk(api.suggestTransfers(balances));
    // Ожидаемые переводы:
    const byPair = (from: string, to: string) => trs.find(t => t.fromId === from && t.toId === to)?.amountCents ?? 0;
    expect(byPair(m, a)).toBe(50000);
    expect(byPair(d, a)).toBe(200000);
  });
});
