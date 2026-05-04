'use client';

import { useState, useEffect, useCallback, useMemo } from "react";

const CATEGORIES = [
  { name: "Food", icon: "🍽️", color: "#f59e0b" },
  { name: "Transport", icon: "🚗", color: "#3b82f6" },
  { name: "Accommodation", icon: "🏨", color: "#8b5cf6" },
  { name: "Activities", icon: "🎯", color: "#ef4444" },
  { name: "Shopping", icon: "🛍️", color: "#ec4899" },
  { name: "Entertainment", icon: "🎬", color: "#06b6d4" },
  { name: "Other", icon: "📦", color: "#6b7280" },
];

const DEFAULT_STATE = {
  tripName: "My Trip",
  currency: "MYR",
  travelers: ["Jianyang", "Lucas", "Marcus"],
  expenses: [],
};

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Supabase API helpers ──
async function loadState(tripId) {
  try {
    console.log('[loadState] Loading tripId:', tripId);
    if (!tripId) {
      console.log('[loadState] No tripId, skipping load');
      return null;
    }
    const res = await fetch('/api/trips/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tripId }),
    });
    console.log('[loadState] Response status:', res.status);
    if (!res.ok) {
      const error = await res.text();
      console.error('[loadState] Load failed:', error);
      return null;
    }
    const data = await res.json();
    console.log('[loadState] Loaded data:', data);
    return data;
  } catch (e) {
    console.error('[loadState] Error:', e);
    return null;
  }
}

async function saveState(tripId, state) {
  try {
    console.log('[saveState] Saving tripId:', tripId, 'state:', state);
    if (!tripId) {
      console.log('[saveState] No tripId, skipping save');
      return { success: false, expenseIdMap: {} };
    }
    const payload = {
      tripId,
      tripName: state.tripName,
      currency: state.currency,
      travelers: state.travelers,
      expenses: state.expenses,
    };
    console.log('[saveState] Payload:', payload);
    const res = await fetch('/api/trips/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    console.log('[saveState] Response status:', res.status);
    if (!res.ok) {
      const error = await res.text();
      console.error('[saveState] Save failed:', error);
      return { success: false, expenseIdMap: {} };
    }
    const result = await res.json();
    console.log('[saveState] Success:', result);
    return { success: true, expenseIdMap: result.expenseIdMap || {} };
  } catch (e) {
    console.error('[saveState] Error:', e);
    return { success: false, expenseIdMap: {} };
  }
}

// ── Settlement algorithm (greedy) ──
function calcSettlements(travelers, expenses) {
  const balances = {};
  travelers.forEach((t) => (balances[t] = 0));

  expenses.forEach((ex) => {
    if (!ex.paidBy || !travelers.includes(ex.paidBy)) return;
    balances[ex.paidBy] = (balances[ex.paidBy] || 0) + ex.amount;
    const participants = Object.entries(ex.shares).filter(
      ([name]) => travelers.includes(name)
    );
    participants.forEach(([name, share]) => {
      balances[name] = (balances[name] || 0) - share;
    });
  });

  const debtors = [];
  const creditors = [];
  Object.entries(balances).forEach(([name, bal]) => {
    const rounded = Math.round(bal * 100) / 100;
    if (rounded < -0.01) debtors.push({ name, amount: -rounded });
    else if (rounded > 0.01) creditors.push({ name, amount: rounded });
  });

  debtors.sort((a, b) => b.amount - a.amount);
  creditors.sort((a, b) => b.amount - a.amount);

  const txns = [];
  let di = 0,
    ci = 0;
  while (di < debtors.length && ci < creditors.length) {
    const pay = Math.min(debtors[di].amount, creditors[ci].amount);
    if (pay > 0.01) {
      txns.push({
        from: debtors[di].name,
        to: creditors[ci].name,
        amount: Math.round(pay * 100) / 100,
      });
    }
    debtors[di].amount -= pay;
    creditors[ci].amount -= pay;
    if (debtors[di].amount < 0.01) di++;
    if (creditors[ci].amount < 0.01) ci++;
  }
  return { balances, txns };
}

// ── Components ──

function Tab({ label, active, onClick, badge }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "10px 16px",
        border: "none",
        background: active ? "var(--accent)" : "transparent",
        color: active ? "#fff" : "var(--text-secondary)",
        fontWeight: active ? 700 : 500,
        fontSize: 13,
        borderRadius: 8,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 6,
        transition: "all .2s",
        whiteSpace: "nowrap",
      }}
    >
      {label}
      {badge != null && (
        <span
          style={{
            background: active ? "rgba(255,255,255,.25)" : "var(--bg-card)",
            padding: "1px 7px",
            borderRadius: 10,
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function Modal({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,.45)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 16,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg-card)",
          borderRadius: 16,
          padding: 24,
          width: "100%",
          maxWidth: 480,
          maxHeight: "90vh",
          overflowY: "auto",
          boxShadow: "0 20px 60px rgba(0,0,0,.3)",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: 20,
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, color: "var(--text)" }}>
            {title}
          </h3>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              fontSize: 22,
              cursor: "pointer",
              color: "var(--text-secondary)",
              padding: 4,
            }}
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InputRow({ label, children }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 600,
          color: "var(--text-secondary)",
          marginBottom: 5,
          textTransform: "uppercase",
          letterSpacing: ".5px",
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  width: "100%",
  padding: "10px 12px",
  borderRadius: 8,
  border: "1.5px solid var(--border)",
  background: "var(--bg)",
  color: "var(--text)",
  fontSize: 14,
  outline: "none",
  boxSizing: "border-box",
};

const btnPrimary = {
  padding: "10px 22px",
  background: "var(--accent)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: 14,
  cursor: "pointer",
};

// ── SETUP TAB ──
function SetupTab({ state, setState }) {
  const [newName, setNewName] = useState("");

  const addTraveler = () => {
    const name = newName.trim();
    if (!name || state.travelers.includes(name)) return;
    setState((s) => ({ ...s, travelers: [...s.travelers, name] }));
    setNewName("");
  };

  const removeTraveler = (name) => {
    setState((s) => ({
      ...s,
      travelers: s.travelers.filter((t) => t !== name),
      expenses: s.expenses.map((ex) => {
        const newShares = { ...ex.shares };
        delete newShares[name];
        return {
          ...ex,
          paidBy: ex.paidBy === name ? "" : ex.paidBy,
          shares: newShares,
        };
      }),
    }));
  };

  return (
    <div style={{ maxWidth: 500, margin: "0 auto" }}>
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 14,
          padding: 22,
          marginBottom: 18,
          border: "1px solid var(--border)",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 15,
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          ✈️ Trip Details
        </h3>
        <InputRow label="Trip Name">
          <input
            style={inputStyle}
            value={state.tripName}
            onChange={(e) =>
              setState((s) => ({ ...s, tripName: e.target.value }))
            }
          />
        </InputRow>
        <InputRow label="Currency">
          <input
            style={inputStyle}
            value={state.currency}
            onChange={(e) =>
              setState((s) => ({ ...s, currency: e.target.value }))
            }
            placeholder="MYR, USD, EUR..."
          />
        </InputRow>
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 14,
          padding: 22,
          border: "1px solid var(--border)",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 15,
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          👥 Travelers
        </h3>
        <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
          <input
            style={{ ...inputStyle, flex: 1 }}
            placeholder="Add traveler name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addTraveler()}
          />
          <button onClick={addTraveler} style={btnPrimary}>
            Add
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {state.travelers.map((t, i) => (
            <div
              key={t}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                background: `hsl(${(i * 67) % 360}, 65%, 92%)`,
                padding: "6px 12px",
                borderRadius: 20,
                fontSize: 13,
                fontWeight: 600,
                color: `hsl(${(i * 67) % 360}, 55%, 30%)`,
              }}
            >
              {t}
              <button
                onClick={() => removeTraveler(t)}
                style={{
                  border: "none",
                  background: "none",
                  cursor: "pointer",
                  color: "inherit",
                  opacity: 0.6,
                  fontSize: 14,
                  padding: 0,
                  lineHeight: 1,
                }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        {state.travelers.length === 0 && (
          <p
            style={{
              textAlign: "center",
              color: "var(--text-secondary)",
              fontSize: 13,
              margin: "16px 0 0",
            }}
          >
            Add at least 2 travelers to get started
          </p>
        )}
      </div>
    </div>
  );
}

// ── EXPENSES TAB ──
function ExpensesTab({ state, setState }) {
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState(null);

  const openAdd = () => {
    const shares = {};
    state.travelers.forEach((t) => (shares[t] = 0));
    setForm({
      description: "",
      amount: "",
      category: "Food",
      paidBy: state.travelers[0] || "",
      splitType: "equal",
      shares,
      selectedTravelers: [...state.travelers],
      date: new Date().toISOString().slice(0, 10),
    });
    setEditId(null);
    setShowAdd(true);
  };

  const openEdit = (ex) => {
    const selectedTravelers = ex.splitType === "custom"
      ? state.travelers.filter((t) => (ex.shares[t] || 0) > 0)
      : [...state.travelers];
    setForm({
      description: ex.description,
      amount: String(ex.amount),
      category: ex.category,
      paidBy: ex.paidBy,
      splitType: ex.splitType || "equal",
      shares: { ...ex.shares },
      selectedTravelers,
      date: ex.date,
    });
    setEditId(ex.id);
    setShowAdd(true);
  };

  const calcEvenShares = (selected, amount) => {
    const amt = parseFloat(amount) || 0;
    const n = selected.length;
    if (n === 0) return {};
    const per = Math.round((amt / n) * 100) / 100;
    const shares = {};
    selected.forEach((t, i) => {
      shares[t] = i === n - 1
        ? Math.round((amt - per * (n - 1)) * 100) / 100
        : per;
    });
    return shares;
  };

  const handleSplitChange = (type, amount) => {
    const amt = parseFloat(amount) || 0;
    if (type === "equal") {
      const newShares = calcEvenShares(state.travelers, amt);
      const allShares = {};
      state.travelers.forEach((t) => (allShares[t] = newShares[t] || 0));
      setForm((f) => ({ ...f, amount: String(amount), splitType: type, shares: allShares, selectedTravelers: [...state.travelers] }));
    } else {
      setForm((f) => {
        const selected = f.selectedTravelers?.length ? f.selectedTravelers : [...state.travelers];
        const autoShares = calcEvenShares(selected, amt);
        const allShares = {};
        state.travelers.forEach((t) => (allShares[t] = autoShares[t] || 0));
        return { ...f, amount: String(amount), splitType: type, selectedTravelers: selected, shares: allShares };
      });
    }
  };

  const toggleCustomTraveler = (name) => {
    setForm((f) => {
      const current = f.selectedTravelers || [];
      const newSelected = current.includes(name)
        ? current.filter((t) => t !== name)
        : [...current, name];
      const autoShares = calcEvenShares(newSelected, f.amount);
      const allShares = {};
      state.travelers.forEach((t) => (allShares[t] = autoShares[t] || 0));
      return { ...f, selectedTravelers: newSelected, shares: allShares };
    });
  };

  const saveExpense = () => {
    console.log('[saveExpense] Form validation - description:', form.description, 'amount:', form.amount, 'paidBy:', form.paidBy);
    if (!form.description || !form.amount || !form.paidBy) {
      console.log('[saveExpense] Validation failed, returning');
      return;
    }
    console.log('[saveExpense] Creating expense object');
    const expense = {
      id: editId || uid(),
      description: form.description,
      amount: parseFloat(form.amount),
      category: form.category,
      paidBy: form.paidBy,
      splitType: form.splitType,
      shares: form.shares,
      date: form.date,
    };
    console.log('[saveExpense] Expense object:', expense);
    console.log('[saveExpense] Updating state with expense');
    setState((s) => ({
      ...s,
      expenses: editId
        ? s.expenses.map((e) => (e.id === editId ? expense : e))
        : [...s.expenses, expense],
    }));
    console.log('[saveExpense] Closing modal and resetting form');
    setShowAdd(false);
    setForm(null);
  };

  const deleteExpense = async (id) => {
    console.log('[deleteExpense] Deleting expense with id:', id, 'length:', id.length);
    try {
      // Only call API if expense ID is a long UUID (from DB)
      if (id.length > 20) {
        console.log('[deleteExpense] Calling delete API for DB expense:', id);
        const res = await fetch('/api/expenses/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ expenseId: id }),
        });
        console.log('[deleteExpense] Delete API response status:', res.status);
        if (!res.ok) {
          const error = await res.json();
          console.error('[deleteExpense] Delete API failed:', error);
          return;
        }
        const data = await res.json();
        console.log('[deleteExpense] Delete API success:', data);
      } else {
        console.log('[deleteExpense] Local ID, skipping API call:', id);
      }
      setState((s) => {
        console.log('[deleteExpense] Removing expense from state:', id);
        return {
          ...s,
          expenses: s.expenses.filter((e) => e.id !== id),
        };
      });
    } catch (e) {
      console.error('[deleteExpense] Error:', e);
    }
  };

  const totalExpenses = state.expenses.reduce((s, e) => s + e.amount, 0);
  const getCatInfo = (name) =>
    CATEGORIES.find((c) => c.name === name) || CATEGORIES[6];

  const shareTotal = form
    ? Object.values(form.shares).reduce((s, v) => s + (parseFloat(v) || 0), 0)
    : 0;
  const formAmount = form ? parseFloat(form.amount) || 0 : 0;

  return (
    <div style={{ maxWidth: 600, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 16,
        }}
      >
        <div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              fontWeight: 600,
            }}
          >
            TOTAL EXPENSES
          </div>
          <div
            style={{ fontSize: 28, fontWeight: 800, color: "var(--text)" }}
          >
            {state.currency} {totalExpenses.toLocaleString("en", { minimumFractionDigits: 2 })}
          </div>
        </div>
        <button onClick={openAdd} style={{ ...btnPrimary, fontSize: 15, padding: "12px 24px" }}>
          + Add Expense
        </button>
      </div>

      {state.expenses.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: 48,
            color: "var(--text-secondary)",
            background: "var(--bg-card)",
            borderRadius: 14,
            border: "1px solid var(--border)",
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>🧾</div>
          <div style={{ fontSize: 15, fontWeight: 600 }}>No expenses yet</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Click "Add Expense" to start tracking
          </div>
        </div>
      )}

      {[...state.expenses].reverse().map((ex) => {
        const cat = getCatInfo(ex.category);
        return (
          <div
            key={ex.id}
            style={{
              background: "var(--bg-card)",
              borderRadius: 12,
              padding: 16,
              marginBottom: 10,
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              gap: 14,
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: cat.color + "20",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {cat.icon}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 14,
                  color: "var(--text)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {ex.description}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: "var(--text-secondary)",
                  marginTop: 2,
                }}
              >
                Paid by <strong>{ex.paidBy}</strong> · {ex.date} ·{" "}
                {ex.splitType === "equal" ? "Equal split" : "Custom split"}
              </div>
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: "var(--text)",
                whiteSpace: "nowrap",
              }}
            >
              {state.currency} {ex.amount.toLocaleString("en", { minimumFractionDigits: 2 })}
            </div>
            <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
              <button
                onClick={() => openEdit(ex)}
                style={{
                  border: "none",
                  background: "var(--bg)",
                  borderRadius: 6,
                  padding: "6px 8px",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                ✏️
              </button>
              <button
                onClick={() => deleteExpense(ex.id)}
                style={{
                  border: "none",
                  background: "var(--bg)",
                  borderRadius: 6,
                  padding: "6px 8px",
                  cursor: "pointer",
                  fontSize: 14,
                }}
              >
                🗑️
              </button>
            </div>
          </div>
        );
      })}

      <Modal
        open={showAdd}
        onClose={() => setShowAdd(false)}
        title={editId ? "Edit Expense" : "Add Expense"}
      >
        {form && (
          <>
            <InputRow label="Description">
              <input
                style={inputStyle}
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="e.g. Dinner at Beach Club"
              />
            </InputRow>
            <div style={{ display: "flex", gap: 10 }}>
              <div style={{ flex: 1 }}>
                <InputRow label={`Amount (${state.currency})`}>
                  <input
                    style={inputStyle}
                    type="number"
                    value={form.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (form.splitType === "equal") {
                        handleSplitChange("equal", val);
                      } else if (form.splitType === "custom") {
                        setForm((f) => {
                          const selected = f.selectedTravelers?.length ? f.selectedTravelers : [...state.travelers];
                          const autoShares = calcEvenShares(selected, val);
                          const allShares = {};
                          state.travelers.forEach((t) => (allShares[t] = autoShares[t] || 0));
                          return { ...f, amount: val, shares: allShares };
                        });
                      } else {
                        setForm((f) => ({ ...f, amount: val }));
                      }
                    }}
                    placeholder="0.00"
                  />
                </InputRow>
              </div>
              <div style={{ flex: 1 }}>
                <InputRow label="Date">
                  <input
                    style={inputStyle}
                    type="date"
                    value={form.date}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, date: e.target.value }))
                    }
                  />
                </InputRow>
              </div>
            </div>
            <InputRow label="Category">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                }}
              >
                {CATEGORIES.map((c) => (
                  <button
                    key={c.name}
                    onClick={() =>
                      setForm((f) => ({ ...f, category: c.name }))
                    }
                    style={{
                      padding: "6px 12px",
                      borderRadius: 20,
                      border:
                        form.category === c.name
                          ? `2px solid ${c.color}`
                          : "2px solid var(--border)",
                      background:
                        form.category === c.name
                          ? c.color + "20"
                          : "transparent",
                      cursor: "pointer",
                      fontSize: 12,
                      fontWeight: form.category === c.name ? 700 : 500,
                      color:
                        form.category === c.name
                          ? c.color
                          : "var(--text-secondary)",
                    }}
                  >
                    {c.icon} {c.name}
                  </button>
                ))}
              </div>
            </InputRow>
            <InputRow label="Paid By">
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {state.travelers.map((t) => (
                  <button
                    key={t}
                    onClick={() => setForm((f) => ({ ...f, paidBy: t }))}
                    style={{
                      padding: "6px 14px",
                      borderRadius: 20,
                      border:
                        form.paidBy === t
                          ? "2px solid var(--accent)"
                          : "2px solid var(--border)",
                      background:
                        form.paidBy === t
                          ? "var(--accent)"
                          : "transparent",
                      color:
                        form.paidBy === t ? "#fff" : "var(--text-secondary)",
                      cursor: "pointer",
                      fontSize: 13,
                      fontWeight: form.paidBy === t ? 700 : 500,
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </InputRow>
            <InputRow label="Split Type">
              <div style={{ display: "flex", gap: 8 }}>
                {["equal", "custom"].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSplitChange(type, form.amount)}
                    style={{
                      flex: 1,
                      padding: "8px 14px",
                      borderRadius: 8,
                      border:
                        form.splitType === type
                          ? "2px solid var(--accent)"
                          : "2px solid var(--border)",
                      background:
                        form.splitType === type
                          ? "var(--accent)" + "15"
                          : "transparent",
                      color:
                        form.splitType === type
                          ? "var(--accent)"
                          : "var(--text-secondary)",
                      cursor: "pointer",
                      fontWeight: 600,
                      fontSize: 13,
                      textTransform: "capitalize",
                    }}
                  >
                    {type === "equal"
                      ? "⚖️ Equal Split"
                      : "✂️ Custom Split"}
                  </button>
                ))}
              </div>
            </InputRow>
            {form.splitType === "custom" && (
              <>
                <InputRow label="Split Between">
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {state.travelers.map((t) => {
                      const selected = (form.selectedTravelers || []).includes(t);
                      return (
                        <button
                          key={t}
                          onClick={() => toggleCustomTraveler(t)}
                          style={{
                            padding: "6px 14px",
                            borderRadius: 20,
                            border: selected ? "2px solid var(--accent)" : "2px solid var(--border)",
                            background: selected ? "var(--accent)" : "transparent",
                            color: selected ? "#fff" : "var(--text-secondary)",
                            cursor: "pointer",
                            fontSize: 13,
                            fontWeight: selected ? 700 : 500,
                          }}
                        >
                          {t}
                        </button>
                      );
                    })}
                  </div>
                </InputRow>
                <InputRow label="Individual Shares">
                  <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                    {state.travelers
                      .filter((t) => (form.selectedTravelers || state.travelers).includes(t))
                      .map((t) => (
                        <div key={t} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ width: 80, fontSize: 13, fontWeight: 600, color: "var(--text)" }}>
                            {t}
                          </span>
                          <input
                            style={{ ...inputStyle, flex: 1 }}
                            type="number"
                            value={form.shares[t] || ""}
                            onChange={(e) =>
                              setForm((f) => ({
                                ...f,
                                shares: { ...f.shares, [t]: parseFloat(e.target.value) || 0 },
                              }))
                            }
                            placeholder="0.00"
                          />
                        </div>
                      ))}
                    <div
                      style={{
                        fontSize: 12,
                        fontWeight: 700,
                        textAlign: "right",
                        color: Math.abs(shareTotal - formAmount) < 0.01 ? "#16a34a" : "#ef4444",
                        marginTop: 4,
                      }}
                    >
                      Split total: {state.currency} {shareTotal.toFixed(2)} / {formAmount.toFixed(2)}
                      {Math.abs(shareTotal - formAmount) >= 0.01 &&
                        ` (off by ${Math.abs(shareTotal - formAmount).toFixed(2)})`}
                    </div>
                  </div>
                </InputRow>
              </>
            )}
            <div
              style={{
                marginTop: 6,
                padding: "10px 14px",
                borderRadius: 10,
                background:
                  form.splitType === "equal" ? "#f0fdf4" : "var(--bg)",
                fontSize: 12,
                color: "var(--text-secondary)",
              }}
            >
              {form.splitType === "equal" && state.travelers.length > 0
                ? `${state.currency} ${(formAmount / state.travelers.length).toFixed(2)} per person (${state.travelers.length} travelers)`
                : (form.selectedTravelers || []).length > 0
                ? `Auto-split ${state.currency} ${(formAmount / (form.selectedTravelers || []).length).toFixed(2)} each among ${(form.selectedTravelers || []).length} selected — edit above to adjust`
                : "Select at least one traveler to split between"}
            </div>
            <button
              onClick={saveExpense}
              disabled={!form.description || !form.amount || !form.paidBy}
              style={{
                ...btnPrimary,
                width: "100%",
                marginTop: 16,
                padding: "12px",
                opacity:
                  !form.description || !form.amount || !form.paidBy
                    ? 0.5
                    : 1,
              }}
            >
              {editId ? "Save Changes" : "Add Expense"}
            </button>
          </>
        )}
      </Modal>
    </div>
  );
}

// ── SETTLEMENT TAB ──
function SettlementTab({ state }) {
  const { balances, txns } = useMemo(
    () => calcSettlements(state.travelers, state.expenses),
    [state.travelers, state.expenses]
  );

  return (
    <div style={{ maxWidth: 550, margin: "0 auto" }}>
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 14,
          padding: 22,
          marginBottom: 18,
          border: "1px solid var(--border)",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 15,
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          📊 Balances
        </h3>
        {state.travelers.map((t, i) => {
          const bal = Math.round((balances[t] || 0) * 100) / 100;
          const maxAbs = Math.max(
            ...Object.values(balances).map((v) => Math.abs(v)),
            1
          );
          const pct = Math.min(Math.abs(bal) / maxAbs, 1) * 100;
          return (
            <div key={t} style={{ marginBottom: 12 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 5,
                }}
              >
                <span
                  style={{
                    fontWeight: 700,
                    fontSize: 14,
                    color: "var(--text)",
                  }}
                >
                  {t}
                </span>
                <span
                  style={{
                    fontWeight: 800,
                    fontSize: 14,
                    color: bal > 0.01 ? "#16a34a" : bal < -0.01 ? "#ef4444" : "var(--text-secondary)",
                  }}
                >
                  {bal > 0.01
                    ? `+${state.currency} ${bal.toFixed(2)}`
                    : bal < -0.01
                    ? `-${state.currency} ${Math.abs(bal).toFixed(2)}`
                    : "Settled ✓"}
                </span>
              </div>
              <div
                style={{
                  height: 8,
                  borderRadius: 4,
                  background: "var(--bg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 4,
                    background:
                      bal > 0.01
                        ? "linear-gradient(90deg,#22c55e,#16a34a)"
                        : bal < -0.01
                        ? "linear-gradient(90deg,#f87171,#ef4444)"
                        : "#d1d5db",
                    transition: "width .4s",
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 11,
                  color: "var(--text-secondary)",
                  marginTop: 3,
                }}
              >
                {bal > 0.01
                  ? "Gets back money"
                  : bal < -0.01
                  ? "Owes money"
                  : "All squared up"}
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 14,
          padding: 22,
          border: "1px solid var(--border)",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 15,
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          💸 Settle Up — Minimum Transactions
        </h3>
        {txns.length === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 24,
              color: "var(--text-secondary)",
            }}
          >
            <div style={{ fontSize: 36, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>
              {state.expenses.length === 0
                ? "No expenses recorded yet"
                : "Everyone is settled up!"}
            </div>
          </div>
        )}
        {txns.map((tx, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: 14,
              borderRadius: 10,
              background: i % 2 === 0 ? "var(--bg)" : "transparent",
              marginBottom: 4,
            }}
          >
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: "50%",
                background: "#fecaca",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 14,
                fontWeight: 800,
                color: "#dc2626",
                flexShrink: 0,
              }}
            >
              {tx.from[0]}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: "var(--text)" }}>
                {tx.from}{" "}
                <span
                  style={{
                    color: "var(--text-secondary)",
                    fontWeight: 400,
                  }}
                >
                  pays
                </span>{" "}
                {tx.to}
              </div>
            </div>
            <div
              style={{
                fontWeight: 800,
                fontSize: 16,
                color: "var(--accent)",
                whiteSpace: "nowrap",
              }}
            >
              {state.currency} {tx.amount.toFixed(2)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── BREAKDOWN TAB ──
function BreakdownTab({ state }) {
  const catTotals = useMemo(() => {
    const totals = {};
    CATEGORIES.forEach((c) => (totals[c.name] = 0));
    state.expenses.forEach((ex) => {
      totals[ex.category] = (totals[ex.category] || 0) + ex.amount;
    });
    return totals;
  }, [state.expenses]);

  const grandTotal = Object.values(catTotals).reduce((a, b) => a + b, 0);

  return (
    <div style={{ maxWidth: 550, margin: "0 auto" }}>
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: 14,
          padding: 22,
          border: "1px solid var(--border)",
        }}
      >
        <h3
          style={{
            margin: "0 0 16px",
            fontSize: 15,
            color: "var(--text)",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          📊 Spending by Category
        </h3>
        {grandTotal === 0 && (
          <div
            style={{
              textAlign: "center",
              padding: 24,
              color: "var(--text-secondary)",
              fontSize: 13,
            }}
          >
            No expenses to analyze yet
          </div>
        )}
        {CATEGORIES.filter((c) => catTotals[c.name] > 0).map((c) => {
          const amt = catTotals[c.name];
          const pct = grandTotal > 0 ? (amt / grandTotal) * 100 : 0;
          return (
            <div key={c.name} style={{ marginBottom: 14 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 4,
                }}
              >
                <span style={{ fontSize: 14, fontWeight: 600, color: "var(--text)" }}>
                  {c.icon} {c.name}
                </span>
                <span style={{ fontSize: 14, fontWeight: 700, color: c.color }}>
                  {state.currency} {amt.toFixed(2)}
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 500,
                      color: "var(--text-secondary)",
                      marginLeft: 6,
                    }}
                  >
                    ({pct.toFixed(1)}%)
                  </span>
                </span>
              </div>
              <div
                style={{
                  height: 10,
                  borderRadius: 5,
                  background: "var(--bg)",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    width: `${pct}%`,
                    height: "100%",
                    borderRadius: 5,
                    background: c.color,
                    transition: "width .4s",
                  }}
                />
              </div>
            </div>
          );
        })}
        {grandTotal > 0 && (
          <div
            style={{
              borderTop: "1px solid var(--border)",
              marginTop: 12,
              paddingTop: 12,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span style={{ fontWeight: 800, fontSize: 15, color: "var(--text)" }}>
              Total
            </span>
            <span style={{ fontWeight: 800, fontSize: 18, color: "var(--text)" }}>
              {state.currency} {grandTotal.toFixed(2)}
            </span>
          </div>
        )}
      </div>

      {grandTotal > 0 && state.travelers.length > 0 && (
        <div
          style={{
            background: "var(--bg-card)",
            borderRadius: 14,
            padding: 22,
            marginTop: 18,
            border: "1px solid var(--border)",
          }}
        >
          <h3 style={{ margin: "0 0 16px", fontSize: 15, color: "var(--text)" }}>
            👤 Per-Person Spending
          </h3>
          {state.travelers.map((t, i) => {
            const owed = state.expenses.reduce(
              (s, ex) => s + (ex.shares[t] || 0),
              0
            );
            return (
              <div
                key={t}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 0",
                  borderBottom:
                    i < state.travelers.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <span style={{ fontWeight: 600, color: "var(--text)" }}>
                  {t}
                </span>
                <span style={{ fontWeight: 700, color: "var(--text)" }}>
                  {state.currency} {owed.toFixed(2)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── MAIN APP ──
export default function TravelExpenseTracker() {
  const [state, setState] = useState(DEFAULT_STATE);
  const [tab, setTab] = useState("expenses");
  const [loaded, setLoaded] = useState(false);
  const [tripId, setTripId] = useState(null);

  // Load trip from Supabase (tripId from URL or localStorage)
  useEffect(() => {
    const loadTrip = async () => {
      try {
        console.log('[useEffect/load] Starting trip load');
        // For now, use localStorage to store tripId
        let savedTripId = localStorage.getItem("current-trip-id");
        console.log('[useEffect/load] Saved tripId from localStorage:', savedTripId);

        // If no tripId, create a new trip
        if (!savedTripId) {
          console.log('[useEffect/load] No tripId found, creating new trip');
          const createRes = await fetch('/api/trips/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
          });
          if (!createRes.ok) {
            console.error('[useEffect/load] Failed to create trip:', await createRes.text());
            setLoaded(true);
            return;
          }
          const createData = await createRes.json();
          savedTripId = createData.tripId;
          console.log('[useEffect/load] Created new trip with id:', savedTripId);
          localStorage.setItem("current-trip-id", savedTripId);
        }

        setTripId(savedTripId);
        const data = await loadState(savedTripId);
        if (data) {
          console.log('[useEffect/load] Setting state with loaded data');
          setState(data);
        } else {
          console.log('[useEffect/load] No data returned from loadState, using default state');
        }
      } catch (e) {
        console.error('[useEffect/load] Failed to load trip:', e);
      }
      setLoaded(true);
    };
    loadTrip();
  }, []);

  // Save trip to Supabase whenever state changes
  useEffect(() => {
    const saveTrip = async () => {
      if (loaded && tripId) {
        console.log('[useEffect/save] Triggering save for tripId:', tripId);
        const result = await saveState(tripId, state);
        if (result.success && Object.keys(result.expenseIdMap).length > 0) {
          console.log('[useEffect/save] Updating expense IDs:', result.expenseIdMap);
          setState((s) => ({
            ...s,
            expenses: s.expenses.map((e) => ({
              ...e,
              id: result.expenseIdMap[e.id] || e.id,
            })),
          }));
        }
      } else {
        console.log('[useEffect/save] Skipping save - loaded:', loaded, 'tripId:', tripId);
      }
    };
    // Debounce saves to avoid hammering API
    const timer = setTimeout(saveTrip, 1000);
    return () => clearTimeout(timer);
  }, [state, loaded, tripId]);

  const handleReset = () => {
    if (confirm("Reset all data? This cannot be undone.")) {
      setState(DEFAULT_STATE);
    }
  };

  if (!loaded)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          fontFamily: "'DM Sans', sans-serif",
          color: "#6b7280",
        }}
      >
        Loading...
      </div>
    );

  return (
    <div
      style={{
        "--bg": "#f3f4f6",
        "--bg-card": "#ffffff",
        "--text": "#111827",
        "--text-secondary": "#6b7280",
        "--accent": "#4f46e5",
        "--border": "#e5e7eb",
        fontFamily: "'DM Sans', sans-serif",
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--text)",
      }}
    >
      <link
        href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap"
        rel="stylesheet"
      />

      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #4f46e5, #7c3aed)",
          padding: "20px 20px 16px",
          color: "#fff",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          <div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 800,
                letterSpacing: "-0.3px",
              }}
            >
              ✈️ {state.tripName}
            </div>
            <div style={{ fontSize: 12, opacity: 0.8, marginTop: 2 }}>
              {state.travelers.length} travelers · {state.expenses.length}{" "}
              expenses · {state.currency}
            </div>
          </div>
          <button
            onClick={handleReset}
            style={{
              background: "rgba(255,255,255,.15)",
              border: "none",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: 8,
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          background: "var(--bg-card)",
          borderBottom: "1px solid var(--border)",
          padding: "6px 8px",
          overflowX: "auto",
        }}
      >
        <div
          style={{
            display: "flex",
            gap: 4,
            maxWidth: 640,
            margin: "0 auto",
          }}
        >
          <Tab
            label="Expenses"
            active={tab === "expenses"}
            onClick={() => setTab("expenses")}
            badge={state.expenses.length || null}
          />
          <Tab
            label="Settlement"
            active={tab === "settlement"}
            onClick={() => setTab("settlement")}
          />
          <Tab
            label="Breakdown"
            active={tab === "breakdown"}
            onClick={() => setTab("breakdown")}
          />
          <Tab
            label="Setup"
            active={tab === "setup"}
            onClick={() => setTab("setup")}
          />
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: "20px 16px 60px" }}>
        {tab === "setup" && (
          <SetupTab state={state} setState={setState} />
        )}
        {tab === "expenses" && (
          <ExpensesTab state={state} setState={setState} />
        )}
        {tab === "settlement" && <SettlementTab state={state} />}
        {tab === "breakdown" && <BreakdownTab state={state} />}
      </div>
    </div>
  );
}
