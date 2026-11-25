import './App.css';
import { useEffect, useState } from 'react';
import { api, emptyState } from './logic';
import { LOCAL_STORAGE_KEY, type ApplicationState, type BalanceRow, type TransferSuggestion } from './contract/types';

type Tab = 'participants' | 'expenses' | 'balances' | 'transfers';

function formatRub(cents: number): string {
  const rub = (cents / 100).toFixed(2);
  return `${rub} ₽`;
}

function App() {
  const [tab, setTab] = useState<Tab>('participants');
  const [state, setState] = useState<ApplicationState>(() => {
    const res = api.loadSnapshot(LOCAL_STORAGE_KEY);
    return res.ok ? res.value : emptyState();
  });

  useEffect(() => {
    api.saveSnapshot(LOCAL_STORAGE_KEY, state);
  }, [state]);

  const [name, setName] = useState('');
  const [pError, setPError] = useState<string | null>(null);
  const addParticipant = () => {
    const res = api.addParticipant(state, name);
    if (!res.ok) {
      setPError(res.error.message);
      return;
    }
    setPError(null);
    setName('');
    setState(res.value.state);
  };

  const [title, setTitle] = useState('');
  const [amountRub, setAmountRub] = useState('');
  const [payerId, setPayerId] = useState<string>('');
  const [involved, setInvolved] = useState<Record<string, boolean>>({});
  const [eError, setEError] = useState<string | null>(null);

  const participants = state.participants;
  const expenses = api.listExpenses(state);
  const balancesRes = api.computeBalances(state);
  const balances: BalanceRow[] = balancesRes.ok ? balancesRes.value : [];
  const transfersRes = api.suggestTransfers(balances);
  const transfers: TransferSuggestion[] = transfersRes.ok ? transfersRes.value : [];

  const canRemove = (id: string) => api.canRemoveParticipant(state, id);
  const toggleInvolved = (id: string) => setInvolved(prev => ({ ...prev, [id]: !prev[id] }));

  const addExpense = () => {
    const amountCents = Math.round(parseFloat(amountRub.replace(',', '.')) * 100);
    const inv = Object.keys(involved).filter(id => involved[id]);
    const res = api.addExpense(state, { title, amountCents, payerId, involvedIds: inv });
    if (!res.ok) {
      setEError(res.error.message);
      return;
    }
    setEError(null);
    setTitle('');
    setAmountRub('');
    setPayerId('');
    setInvolved({});
    setState(res.value.state);
    setTab('expenses');
  };

  const removeExpense = (id: string) => {
    const res = api.deleteExpense(state, id);
    if (res.ok) setState(res.value.state);
  };

  // Edit flow state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editAmountRub, setEditAmountRub] = useState('');
  const [editPayerId, setEditPayerId] = useState('');
  const [editInvolved, setEditInvolved] = useState<Record<string, boolean>>({});
  const [editError, setEditError] = useState<string | null>(null);

  const startEdit = (id: string) => {
    const e = state.expenses.find(x => x.id === id);
    if (!e) return;
    setEditingId(id);
    setEditTitle(e.title);
    setEditAmountRub((e.amountCents / 100).toFixed(2));
    setEditPayerId(e.payerId);
    const involvedMap: Record<string, boolean> = {};
    for (const pid of e.involvedIds) involvedMap[pid] = true;
    setEditInvolved(involvedMap);
    setEditError(null);
  };

  const toggleEditInvolved = (id: string) => setEditInvolved(prev => ({ ...prev, [id]: !prev[id] }));
  const cancelEdit = () => {
    setEditingId(null);
    setEditTitle('');
    setEditAmountRub('');
    setEditPayerId('');
    setEditInvolved({});
    setEditError(null);
  };
  const saveEdit = () => {
    if (!editingId) return;
    const amountCents = Math.round(parseFloat(editAmountRub.replace(',', '.')) * 100);
    const inv = Object.keys(editInvolved).filter(id => editInvolved[id]);
    const res = api.updateExpense(state, { expenseId: editingId, title: editTitle, amountCents, payerId: editPayerId, involvedIds: inv });
    if (!res.ok) {
      setEditError(res.error.message);
      return;
    }
    setEditError(null);
    setState(res.value.state);
    cancelEdit();
    setTab('expenses');
  };

  return (
    <div className="app">
      <header className="header">
        <h1>Делим</h1>
        <nav className="tabs">
          {(['participants', 'expenses', 'balances', 'transfers'] as Tab[]).map(t => (
            <button key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>{
              t === 'participants' ? 'Участники' : t === 'expenses' ? 'Расходы' : t === 'balances' ? 'Балансы' : 'Переводы'
            }</button>
          ))}
        </nav>
      </header>

      {tab === 'participants' && (
        <section className="panel participants">
          <div className="form-row">
            <input placeholder="Имя участника" value={name} onChange={e => setName(e.target.value)} />
            <button onClick={addParticipant}>Добавить</button>
          </div>
          {pError && <div className="error">{pError}</div>}
          <ul className="cards">
            {participants.map(p => (
              <li key={p.id} className="card">
                <div className="title">{p.name}{p.archived ? ' (архив)' : ''}</div>
                <div className="actions">
                  <button disabled={!canRemove(p.id)}>Удалить</button>
                </div>
              </li>
            ))}
          </ul>
          {participants.length === 0 && <div className="empty">Добавьте первого участника</div>}
        </section>
      )}

      {tab === 'expenses' && (
        <section className="panel expenses">
          <div className="form-grid">
            <input placeholder="Название" value={title} onChange={e => setTitle(e.target.value)} />
            <input placeholder="Сумма (руб)" value={amountRub} onChange={e => setAmountRub(e.target.value)} />
            <select value={payerId} onChange={e => setPayerId(e.target.value)}>
              <option value="">Плательщик</option>
              {participants.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="involved">
            <div className="label">Кого касается расход:</div>
            <div className="chips">
              {participants.map(p => (
                <label key={p.id} className={involved[p.id] ? 'chip active' : 'chip'}>
                  <input type="checkbox" checked={!!involved[p.id]} onChange={() => toggleInvolved(p.id)} />
                  {p.name}
                </label>
              ))}
            </div>
          </div>
          {payerId && involved[payerId] === false && <div className="hint">Плательщик оплатил за других</div>}
          {eError && <div className="error">{eError}</div>}
          <button onClick={addExpense}>Добавить расход</button>

          <h2>История</h2>
          {expenses.length === 0 && <div className="empty">Расходов пока нет</div>}
          <ul className="cards">
            {expenses.map(e => (
              <li key={e.id} className="card">
                {editingId === e.id ? (
                  <div className="edit-form">
                    <input placeholder="Название" value={editTitle} onChange={ev => setEditTitle(ev.target.value)} />
                    <input placeholder="Сумма (руб)" value={editAmountRub} onChange={ev => setEditAmountRub(ev.target.value)} />
                    <select value={editPayerId} onChange={ev => setEditPayerId(ev.target.value)}>
                      <option value="">Плательщик</option>
                      {participants.filter(p => !p.archived).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                    <div className="involved">
                      <div className="label">Кого касается расход:</div>
                      <div className="chips">
                        {participants.map(p => (
                          <label key={p.id} className={editInvolved[p.id] ? 'chip active' : 'chip'}>
                            <input type="checkbox" checked={!!editInvolved[p.id]} onChange={() => toggleEditInvolved(p.id)} />
                            {p.name}{p.archived ? ' (архив)' : ''}
                          </label>
                        ))}
                      </div>
                    </div>
                    {editPayerId && editInvolved[editPayerId] === false && <div className="hint">Плательщик оплатил за других</div>}
                    {editError && <div className="error">{editError}</div>}
                    <div className="actions">
                      <button onClick={saveEdit}>Сохранить</button>
                      <button onClick={cancelEdit}>Отмена</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="title">{e.title}</div>
                    <div className="meta">{formatRub(e.amountCents)} • Плательщик: {participants.find(p => p.id === e.payerId)?.name ?? '—'} • Делят: {e.involvedIds.length}</div>
                    <div className="actions">
                      <button onClick={() => startEdit(e.id)}>Редактировать</button>
                      <button onClick={() => removeExpense(e.id)}>Удалить</button>
                    </div>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {tab === 'balances' && (
        <section className="panel balances">
          {balances.length === 0 && <div className="empty">Нет данных для расчёта</div>}
          <table>
            <thead><tr><th>Участник</th><th>Заплатил</th><th>Должен был</th><th>Нетто</th></tr></thead>
            <tbody>
              {balances.map(b => {
                const name = participants.find(p => p.id === b.participantId)?.name ?? b.participantId;
                const cls = b.netCents > 0 ? 'pos' : b.netCents < 0 ? 'neg' : '';
                return (
                  <tr key={b.participantId} className={cls}>
                    <td>{name}</td>
                    <td>{formatRub(b.paidCents)}</td>
                    <td>{formatRub(b.owedCents)}</td>
                    <td>{formatRub(b.netCents)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'transfers' && (
        <section className="panel transfers">
          {transfers.length === 0 && <div className="empty">Переводы не требуются</div>}
          <ul className="list">
            {transfers.map(t => (
              <li key={`${t.fromId}-${t.toId}`}>
                {participants.find(p => p.id === t.fromId)?.name} → {participants.find(p => p.id === t.toId)?.name}: {formatRub(t.amountCents)}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}

export default App
