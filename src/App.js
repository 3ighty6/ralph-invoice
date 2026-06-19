import React, { useState } from 'react';

// ── THEME ────────────────────────────────────────────────────────────────────
const T = {
  gold: '#c9a84c',
  goldLt: '#f0d080',
  bg: '#080808',
  surface: '#0f0f0f',
  surfaceHi: '#141414',
  border: '#1e1e1e',
  muted: '#3a3a3a',
  text: '#e8e8e8',
  dim: '#555',
};

// ── UTILS ────────────────────────────────────────────────────────────────────
function uid() { return Math.random().toString(36).slice(2, 8).toUpperCase(); }
function today() { return new Date().toISOString().split('T')[0]; }
function fmt(n) { return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }); }
function dueDays(date) {
  if (!date) return null;
  const diff = Math.ceil((new Date(date) - new Date()) / 86400000);
  if (diff < 0) return { label: `${Math.abs(diff)}d overdue`, color: '#ff5555' };
  if (diff === 0) return { label: 'Due today', color: T.goldLt };
  return { label: `Due in ${diff}d`, color: '#2ecc71' };
}
const STATUS_COLORS = { draft: T.dim, sent: '#50d0ff', paid: '#2ecc71', overdue: '#ff5555', partial: '#f0a030' };
function invTotal(inv) { return (inv.items || []).reduce((s, i) => s + (Number(i.qty) * Number(i.rate)), 0); }
function invOwed(inv) { return invTotal(inv) - Number(inv.paid || 0); }

// ── SEED DATA ────────────────────────────────────────────────────────────────
const SEED_CLIENTS = [
  { id: 'C001', name: 'Apex Real Estate Group', email: 'billing@apexreg.com', phone: '216-555-0101', company: 'Apex REG' },
  { id: 'C002', name: 'Jordan Miller', email: 'jordan@millerhomes.com', phone: '440-555-0188', company: 'Miller Homes LLC' },
];
const SEED_INVOICES = [
  {
    id: 'INV-001', clientId: 'C001', date: '2026-06-01', dueDate: '2026-06-30',
    status: 'sent', notes: 'House Sauce Pro subscription Q3',
    items: [{ desc: 'House Sauce Pro (3 months)', qty: 3, rate: 149 }], paid: 0,
  },
  {
    id: 'INV-002', clientId: 'C002', date: '2026-05-15', dueDate: '2026-06-15',
    status: 'paid', notes: 'Onboarding & custom report',
    items: [{ desc: 'Onboarding & Setup', qty: 1, rate: 500 }, { desc: 'Custom Report Build', qty: 2, rate: 250 }], paid: 1000,
  },
];

// ── SMALL COMPONENTS ─────────────────────────────────────────────────────────
function Pill({ status }) {
  return (
    <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '1px', padding: '3px 7px', borderRadius: 3, background: (STATUS_COLORS[status] || T.dim) + '22', color: STATUS_COLORS[status] || T.dim, border: `1px solid ${(STATUS_COLORS[status] || T.dim)}44`, textTransform: 'uppercase' }}>
      {status}
    </span>
  );
}

function Btn({ children, onClick, variant = 'ghost', disabled, small, style: s }) {
  const base = { fontSize: small ? 10 : 12, fontWeight: 700, padding: small ? '5px 10px' : '9px 16px', borderRadius: 6, cursor: disabled ? 'not-allowed' : 'pointer', border: 'none', transition: 'opacity 0.15s', opacity: disabled ? 0.4 : 1, fontFamily: 'Inter, sans-serif', ...s };
  const v = {
    primary: { background: `linear-gradient(135deg, ${T.gold}, ${T.goldLt})`, color: T.bg },
    ghost: { background: 'transparent', color: T.dim, border: `1px solid ${T.border}` },
    danger: { background: 'transparent', color: '#ff5555', border: '1px solid #ff555533' },
    info: { background: '#0a1520', color: '#50d0ff', border: '1px solid #50d0ff33' },
  };
  return <button onClick={onClick} disabled={disabled} style={{ ...base, ...v[variant] }}>{children}</button>;
}

function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      {label && <label style={{ fontSize: 10, color: T.dim, letterSpacing: '0.8px', textTransform: 'uppercase' }}>{label}</label>}
      {children}
    </div>
  );
}

const inputStyle = { background: '#0a0a0a', border: `1px solid ${T.border}`, borderRadius: 6, color: T.text, fontSize: 13, padding: '9px 12px', outline: 'none', fontFamily: 'Inter, sans-serif', width: '100%', boxSizing: 'border-box' };
const selectStyle = { ...inputStyle };

// ── MODAL SHELL ───────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000dd', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0d0d0d', border: `1px solid ${T.border}`, borderRadius: 12, width: '100%', maxWidth: wide ? 760 : 560, maxHeight: '92vh', overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 20px', borderBottom: `1px solid ${T.border}`, flexShrink: 0 }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: T.text }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: T.dim, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
        </div>
        <div style={{ padding: '20px', overflowY: 'auto' }}>{children}</div>
      </div>
    </div>
  );
}

// ── INVOICE PRINT PREVIEW ─────────────────────────────────────────────────────
function InvoicePreview({ inv, clients, onClose }) {
  const client = clients.find(c => c.id === inv.clientId);
  const total = invTotal(inv);
  const owed = invOwed(inv);
  const due = dueDays(inv.dueDate);

  const handlePrint = () => {
    const printContent = document.getElementById('inv-print-body').innerHTML;
    const w = window.open('', '_blank');
    w.document.write(`<html><head><title>${inv.id}</title><style>
      body{font-family:Georgia,serif;padding:48px;background:#fff;color:#111;max-width:680px;margin:0 auto}
      .gold{color:#b8860b} .dim{color:#888} .border-top{border-top:1px solid #ddd;padding-top:8px;margin-top:4px}
      table{width:100%;border-collapse:collapse} th,td{padding:10px 0;text-align:left} th{font-size:11px;color:#888;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #eee}
      td{border-bottom:1px solid #f5f5f5;font-size:13px} .right{text-align:right}
    </style></head><body>${printContent}</body></html>`);
    w.document.close();
    w.print();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: '#000000dd', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: '#0d0d0d', border: `1px solid ${T.border}`, borderRadius: 12, width: '100%', maxWidth: 720, maxHeight: '92vh', overflow: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${T.border}` }}>
          <span style={{ fontSize: 12, color: T.dim }}>Invoice Preview — {inv.id}</span>
          <div style={{ display: 'flex', gap: 8 }}>
            <Btn variant="info" onClick={handlePrint}>🖨️ Print / Save PDF</Btn>
            <Btn variant="ghost" onClick={onClose}>✕ Close</Btn>
          </div>
        </div>
        <div id="inv-print-body" style={{ padding: '40px 48px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 40 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 900, color: T.goldLt, letterSpacing: '-0.5px' }}>RALPH & SONS LLC</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Cleveland, Ohio · ralph-and-sons.com</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: T.gold }}>{inv.id}</div>
              <div style={{ fontSize: 11, color: T.dim, marginTop: 4 }}>Issued: {inv.date}</div>
              {due && <div style={{ fontSize: 11, color: due.color, marginTop: 2 }}>{due.label}</div>}
            </div>
          </div>
          <div style={{ marginBottom: 32 }}>
            <div style={{ fontSize: 10, color: T.dim, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 8 }}>Bill To</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: T.text }}>{client?.name || '—'}</div>
            {client?.company && <div style={{ fontSize: 13, color: T.dim, marginTop: 3 }}>{client.company}</div>}
            <div style={{ fontSize: 12, color: T.dim, marginTop: 3 }}>{client?.email}</div>
            {client?.phone && <div style={{ fontSize: 12, color: T.dim, marginTop: 2 }}>{client.phone}</div>}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${T.border}` }}>
                {['Description', 'Qty', 'Rate', 'Amount'].map((h, i) => (
                  <th key={h} style={{ fontSize: 10, color: T.dim, letterSpacing: '1px', textTransform: 'uppercase', padding: '8px 0', textAlign: i === 0 ? 'left' : 'right' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(inv.items || []).map((item, i) => (
                <tr key={i} style={{ borderBottom: `1px solid #111` }}>
                  <td style={{ padding: '12px 0', fontSize: 13, color: T.text }}>{item.desc}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: T.dim, textAlign: 'right' }}>{item.qty}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: T.dim, textAlign: 'right' }}>{fmt(item.rate)}</td>
                  <td style={{ padding: '12px 0', fontSize: 13, color: T.text, fontWeight: 700, textAlign: 'right' }}>{fmt(item.qty * item.rate)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
            <div style={{ display: 'flex', gap: 48 }}>
              <span style={{ fontSize: 12, color: T.dim }}>Subtotal</span>
              <span style={{ fontSize: 12, color: T.text, minWidth: 90, textAlign: 'right' }}>{fmt(total)}</span>
            </div>
            {inv.paid > 0 && (
              <div style={{ display: 'flex', gap: 48 }}>
                <span style={{ fontSize: 12, color: '#2ecc71' }}>Paid</span>
                <span style={{ fontSize: 12, color: '#2ecc71', minWidth: 90, textAlign: 'right' }}>−{fmt(inv.paid)}</span>
              </div>
            )}
            <div style={{ display: 'flex', gap: 48, borderTop: `1px solid ${T.border}`, paddingTop: 10, marginTop: 4 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: owed > 0 ? T.goldLt : '#2ecc71' }}>Balance Due</span>
              <span style={{ fontSize: 15, fontWeight: 800, color: owed > 0 ? T.goldLt : '#2ecc71', minWidth: 90, textAlign: 'right' }}>{fmt(owed)}</span>
            </div>
          </div>
          {inv.notes && (
            <div style={{ marginTop: 32, padding: '14px 16px', background: '#111', borderRadius: 6, fontSize: 12, color: T.dim }}>
              <div style={{ fontSize: 10, color: T.muted, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>Notes</div>
              {inv.notes}
            </div>
          )}
          <div style={{ marginTop: 32, paddingTop: 16, borderTop: `1px solid ${T.border}`, fontSize: 11, color: '#333', textAlign: 'center' }}>
            Thank you for your business · Ralph & Sons LLC · Cleveland, Ohio
          </div>
        </div>
      </div>
    </div>
  );
}

// ── INVOICE FORM ──────────────────────────────────────────────────────────────
function InvoiceForm({ clients, existing, onSave, onCancel }) {
  const isEdit = !!existing;
  const [clientId, setClientId] = useState(existing?.clientId || clients[0]?.id || '');
  const [date, setDate] = useState(existing?.date || today());
  const [dueDate, setDueDate] = useState(existing?.dueDate || '');
  const [notes, setNotes] = useState(existing?.notes || '');
  const [status, setStatus] = useState(existing?.status || 'draft');
  const [paid, setPaid] = useState(existing?.paid || 0);
  const [items, setItems] = useState(existing?.items?.length ? existing.items : [{ desc: '', qty: 1, rate: 0 }]);

  function addItem() { setItems(p => [...p, { desc: '', qty: 1, rate: 0 }]); }
  function removeItem(i) { setItems(p => p.filter((_, idx) => idx !== i)); }
  function updateItem(i, field, val) { setItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: field === 'desc' ? val : Number(val) } : it)); }
  const total = items.reduce((s, i) => s + Number(i.qty) * Number(i.rate), 0);

  function save() {
    if (!clientId) return alert('Select a client.');
    if (items.some(i => !i.desc)) return alert('Fill in all line item descriptions.');
    onSave({ id: existing?.id || `INV-${uid()}`, clientId, date, dueDate, notes, status, paid: Number(paid), items });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Client">
          <select value={clientId} onChange={e => setClientId(e.target.value)} style={selectStyle}>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Issue Date"><input type="date" value={date} onChange={e => setDate(e.target.value)} style={inputStyle} /></Field>
        <Field label="Due Date"><input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)} style={inputStyle} /></Field>
      </div>

      <Field label="Line Items">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 90px', gap: 6 }}>
            {['Description', 'Qty', 'Rate ($)', 'Total'].map(h => <div key={h} style={{ fontSize: 9, color: T.dim, letterSpacing: '0.8px', textTransform: 'uppercase', padding: '0 2px' }}>{h}</div>)}
          </div>
          {items.map((item, i) => (
            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 70px 100px 90px', gap: 6, alignItems: 'center' }}>
              <input placeholder="Description" value={item.desc} onChange={e => updateItem(i, 'desc', e.target.value)} style={{ ...inputStyle }} />
              <input type="number" min="1" value={item.qty} onChange={e => updateItem(i, 'qty', e.target.value)} style={{ ...inputStyle, textAlign: 'center' }} />
              <input type="number" min="0" value={item.rate} onChange={e => updateItem(i, 'rate', e.target.value)} style={{ ...inputStyle, textAlign: 'right' }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingLeft: 4 }}>
                <span style={{ fontSize: 13, fontWeight: 700, color: T.gold }}>{fmt(item.qty * item.rate)}</span>
                {items.length > 1 && <button onClick={() => removeItem(i)} style={{ background: 'none', border: 'none', color: '#ff5555', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>}
              </div>
            </div>
          ))}
          <button onClick={addItem} style={{ background: 'none', border: `1px dashed ${T.border}`, borderRadius: 6, color: T.dim, fontSize: 11, padding: '8px', cursor: 'pointer', marginTop: 2 }}>+ Add Line Item</button>
        </div>
      </Field>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        <Field label="Status">
          <select value={status} onChange={e => setStatus(e.target.value)} style={{ ...selectStyle, color: STATUS_COLORS[status] || T.text }}>
            {Object.keys(STATUS_COLORS).map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
          </select>
        </Field>
        <Field label="Amount Paid ($)"><input type="number" min="0" value={paid} onChange={e => setPaid(e.target.value)} style={inputStyle} /></Field>
        <Field label="Balance Due">
          <div style={{ ...inputStyle, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.dim }}>Owed</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: (total - Number(paid)) > 0 ? T.goldLt : '#2ecc71' }}>{fmt(total - Number(paid))}</span>
          </div>
        </Field>
      </div>

      <Field label="Notes">
        <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} style={{ ...inputStyle, resize: 'vertical' }} placeholder="Payment terms, project details, etc." />
      </Field>

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', paddingTop: 4 }}>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={save}>{isEdit ? '💾 Save Changes' : '✚ Create Invoice'}</Btn>
      </div>
    </div>
  );
}

// ── CLIENT FORM ───────────────────────────────────────────────────────────────
function ClientForm({ existing, onSave, onCancel }) {
  const [name, setName] = useState(existing?.name || '');
  const [email, setEmail] = useState(existing?.email || '');
  const [phone, setPhone] = useState(existing?.phone || '');
  const [company, setCompany] = useState(existing?.company || '');

  function save() {
    if (!name.trim() || !email.trim()) return alert('Name and email are required.');
    onSave({ id: existing?.id || `C${uid()}`, name: name.trim(), email: email.trim(), phone: phone.trim(), company: company.trim() });
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <Field label="Full Name"><input value={name} onChange={e => setName(e.target.value)} placeholder="Jane Smith" style={inputStyle} /></Field>
        <Field label="Company"><input value={company} onChange={e => setCompany(e.target.value)} placeholder="Acme LLC" style={inputStyle} /></Field>
        <Field label="Email"><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jane@acme.com" style={inputStyle} /></Field>
        <Field label="Phone"><input value={phone} onChange={e => setPhone(e.target.value)} placeholder="216-555-0100" style={inputStyle} /></Field>
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <Btn variant="ghost" onClick={onCancel}>Cancel</Btn>
        <Btn variant="primary" onClick={save}>{existing ? '💾 Save Changes' : '✚ Add Client'}</Btn>
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('dashboard');
  const [invoices, setInvoices] = useState(SEED_INVOICES);
  const [clients, setClients] = useState(SEED_CLIENTS);
  const [modal, setModal] = useState(null);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ── stats
  const totalRevenue = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + invTotal(i), 0);
  const totalOutstanding = invoices.filter(i => ['sent', 'partial', 'overdue'].includes(i.status)).reduce((s, i) => s + invOwed(i), 0);
  const overdueInvs = invoices.filter(i => i.status === 'overdue' || (i.dueDate && new Date(i.dueDate) < new Date() && i.status === 'sent'));

  function saveInvoice(inv) { setInvoices(p => p.some(x => x.id === inv.id) ? p.map(x => x.id === inv.id ? inv : x) : [inv, ...p]); setModal(null); }
  function deleteInvoice(id) { if (window.confirm('Delete this invoice?')) setInvoices(p => p.filter(i => i.id !== id)); }
  function saveClient(c) { setClients(p => p.some(x => x.id === c.id) ? p.map(x => x.id === c.id ? c : x) : [c, ...p]); setModal(null); }
  function deleteClient(id) { if (window.confirm('Delete this client?')) setClients(p => p.filter(c => c.id !== id)); }

  const filteredInvoices = invoices.filter(inv => {
    const client = clients.find(c => c.id === inv.clientId);
    const matchSearch = !search || inv.id.toLowerCase().includes(search.toLowerCase()) || client?.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || inv.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const navItems = [['dashboard', '📊 Dashboard'], ['invoices', '🧾 Invoices'], ['clients', '👥 Clients']];

  return (
    <div style={{ minHeight: '100vh', background: T.bg, color: T.text, fontFamily: 'Inter, sans-serif' }}>

      {/* ── NAV ── */}
      <nav style={{ background: T.surface, borderBottom: `1px solid ${T.border}`, padding: '0 24px', display: 'flex', alignItems: 'center', gap: 8, height: 56, position: 'sticky', top: 0, zIndex: 40 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 16 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: `linear-gradient(135deg, ${T.gold}, ${T.goldLt})`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, fontSize: 14, color: T.bg, flexShrink: 0 }}>R</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: 13, color: T.goldLt, letterSpacing: '-0.2px' }}>Ralph Invoice</div>
            <div style={{ fontSize: 9, color: '#333', letterSpacing: '1px' }}>RALPH & SONS LLC</div>
          </div>
        </div>
        {navItems.map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} style={{ background: tab === id ? '#1a1500' : 'transparent', border: `1px solid ${tab === id ? T.gold : 'transparent'}`, borderRadius: 6, color: tab === id ? T.goldLt : T.dim, fontSize: 12, fontWeight: tab === id ? 700 : 400, padding: '7px 13px', cursor: 'pointer', fontFamily: 'Inter, sans-serif' }}>
            {label}
          </button>
        ))}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <Btn variant="ghost" onClick={() => setModal({ type: 'newClient' })}>+ Client</Btn>
          <Btn variant="primary" onClick={() => setModal({ type: 'newInv' })}>+ New Invoice</Btn>
        </div>
      </nav>

      <main style={{ maxWidth: 1140, margin: '0 auto', padding: '28px 20px' }}>

        {/* ══ DASHBOARD ══ */}
        {tab === 'dashboard' && (
          <div>
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>Dashboard</div>
              <div style={{ fontSize: 12, color: T.dim }}>Ralph & Sons LLC · Financial Overview</div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
              {[
                { label: 'Total Collected', value: fmt(totalRevenue), color: '#2ecc71', icon: '✅' },
                { label: 'Outstanding', value: fmt(totalOutstanding), color: T.goldLt, icon: '⏳' },
                { label: 'Overdue', value: `${overdueInvs.length} invoices`, color: '#ff5555', icon: '🔴' },
                { label: 'Total Clients', value: clients.length, color: '#50d0ff', icon: '👥' },
              ].map(card => (
                <div key={card.label} style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, padding: '20px' }}>
                  <div style={{ fontSize: 18, marginBottom: 8 }}>{card.icon}</div>
                  <div style={{ fontSize: 10, color: T.dim, letterSpacing: '1px', textTransform: 'uppercase', marginBottom: 6 }}>{card.label}</div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: card.color }}>{card.value}</div>
                </div>
              ))}
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ padding: '15px 20px', borderBottom: `1px solid ${T.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 700, fontSize: 13 }}>Recent Invoices</span>
                <Btn small variant="ghost" onClick={() => setTab('invoices')}>View All →</Btn>
              </div>
              {invoices.slice(0, 6).map(inv => {
                const client = clients.find(c => c.id === inv.clientId);
                const owed = invOwed(inv);
                const due = dueDays(inv.dueDate);
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', padding: '13px 20px', borderBottom: `1px solid ${T.border}`, gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{client?.name || '—'}</div>
                      <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{inv.id} · {inv.date}{due ? ` · ` : ''}{due && <span style={{ color: due.color }}>{due.label}</span>}</div>
                    </div>
                    <Pill status={inv.status} />
                    <div style={{ textAlign: 'right', minWidth: 100 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: owed > 0 ? T.goldLt : '#2ecc71' }}>{fmt(owed)}</div>
                      <div style={{ fontSize: 10, color: T.dim }}>{fmt(invTotal(inv))} total</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn small variant="info" onClick={() => setModal({ type: 'preview', data: inv })}>View</Btn>
                      <Btn small variant="ghost" onClick={() => setModal({ type: 'editInv', data: inv })}>Edit</Btn>
                    </div>
                  </div>
                );
              })}
              {invoices.length === 0 && <div style={{ padding: 28, color: T.dim, fontSize: 13, textAlign: 'center' }}>No invoices yet. Hit + New Invoice to get started.</div>}
            </div>
          </div>
        )}

        {/* ══ INVOICES ══ */}
        {tab === 'invoices' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>Invoices</div>
                <div style={{ fontSize: 12, color: T.dim }}>{filteredInvoices.length} of {invoices.length} invoices</div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by client or invoice ID..." style={{ ...inputStyle, maxWidth: 280, flex: 1 }} />
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', ...Object.keys(STATUS_COLORS)].map(s => (
                  <button key={s} onClick={() => setFilterStatus(s)} style={{ background: filterStatus === s ? '#1a1500' : T.surface, border: `1px solid ${filterStatus === s ? T.gold : T.border}`, borderRadius: 5, color: filterStatus === s ? T.goldLt : T.dim, fontSize: 10, fontWeight: 600, padding: '6px 10px', cursor: 'pointer', textTransform: 'uppercase', letterSpacing: '0.5px', fontFamily: 'Inter, sans-serif' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {filteredInvoices.length === 0 && <div style={{ padding: 28, color: T.dim, fontSize: 13, textAlign: 'center' }}>No invoices match your filters.</div>}
              {filteredInvoices.map(inv => {
                const client = clients.find(c => c.id === inv.clientId);
                const owed = invOwed(inv);
                const due = dueDays(inv.dueDate);
                return (
                  <div key={inv.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${T.border}`, gap: 12 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{client?.name || 'Unknown'} <span style={{ color: T.dim, fontWeight: 400, fontSize: 12 }}>· {inv.id}</span></div>
                      <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>
                        Issued {inv.date}
                        {due && <span style={{ color: due.color }}> · {due.label}</span>}
                      </div>
                    </div>
                    <Pill status={inv.status} />
                    <div style={{ textAlign: 'right', minWidth: 110 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: owed > 0 ? T.goldLt : '#2ecc71' }}>{fmt(owed)} owed</div>
                      <div style={{ fontSize: 10, color: T.dim }}>{fmt(invTotal(inv))} total</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn small variant="info" onClick={() => setModal({ type: 'preview', data: inv })}>Preview</Btn>
                      <Btn small variant="ghost" onClick={() => setModal({ type: 'editInv', data: inv })}>Edit</Btn>
                      <Btn small variant="danger" onClick={() => deleteInvoice(inv.id)}>Del</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ CLIENTS ══ */}
        {tab === 'clients' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.text, marginBottom: 4 }}>Clients</div>
              <div style={{ fontSize: 12, color: T.dim }}>{clients.length} clients on record</div>
            </div>
            <div style={{ background: T.surface, border: `1px solid ${T.border}`, borderRadius: 10, overflow: 'hidden' }}>
              {clients.length === 0 && <div style={{ padding: 28, color: T.dim, fontSize: 13, textAlign: 'center' }}>No clients yet. Hit + Client above.</div>}
              {clients.map(c => {
                const clientInvs = invoices.filter(i => i.clientId === c.id);
                const lifetime = clientInvs.reduce((s, i) => s + invTotal(i), 0);
                const outstanding = clientInvs.filter(i => ['sent', 'partial', 'overdue'].includes(i.status)).reduce((s, i) => s + invOwed(i), 0);
                return (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '14px 20px', borderBottom: `1px solid ${T.border}`, gap: 14 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: T.gold + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 15, color: T.gold, flexShrink: 0 }}>
                      {c.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: T.text }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: T.dim, marginTop: 2 }}>{c.company && `${c.company} · `}{c.email}{c.phone && ` · ${c.phone}`}</div>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 130 }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: T.goldLt }}>{fmt(lifetime)} lifetime</div>
                      <div style={{ fontSize: 11, color: outstanding > 0 ? '#f0a030' : T.dim }}>{outstanding > 0 ? `${fmt(outstanding)} outstanding` : `${clientInvs.length} invoice${clientInvs.length !== 1 ? 's' : ''}`}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <Btn small variant="ghost" onClick={() => setModal({ type: 'editClient', data: c })}>Edit</Btn>
                      <Btn small variant="danger" onClick={() => deleteClient(c.id)}>Delete</Btn>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ── MODALS ── */}
      {modal?.type === 'newInv' && <Modal title="Create New Invoice" onClose={() => setModal(null)} wide><InvoiceForm clients={clients} onSave={saveInvoice} onCancel={() => setModal(null)} /></Modal>}
      {modal?.type === 'editInv' && <Modal title="Edit Invoice" onClose={() => setModal(null)} wide><InvoiceForm clients={clients} existing={modal.data} onSave={saveInvoice} onCancel={() => setModal(null)} /></Modal>}
      {modal?.type === 'newClient' && <Modal title="Add Client" onClose={() => setModal(null)}><ClientForm onSave={saveClient} onCancel={() => setModal(null)} /></Modal>}
      {modal?.type === 'editClient' && <Modal title="Edit Client" onClose={() => setModal(null)}><ClientForm existing={modal.data} onSave={saveClient} onCancel={() => setModal(null)} /></Modal>}
      {modal?.type === 'preview' && <InvoicePreview inv={modal.data} clients={clients} onClose={() => setModal(null)} />}
    </div>
  );
}
