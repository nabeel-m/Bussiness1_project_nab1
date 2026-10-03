import React, { useState } from 'react';
import { 
  Users, 
  Plus, 
  Search, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Wallet, 
  FileText, 
  Trash2, 
  Calendar,
  Phone,
  MapPin,
  Edit2,
  CheckCircle2,
  DollarSign,
  Briefcase,
  ShieldCheck,
  Lock,
  Hammer,
  Truck,
  Receipt,
  TrendingUp,
  AlertCircle,
  Eye,
  EyeOff,
  Wrench,
  Check
} from 'lucide-react';
import { formatIndianCurrency, formatDateIndian, calculateClientLedger } from '../utils/formatters';
import { EXPENSE_CATEGORIES } from '../types/initialData';

const getCategoryBadgeClass = (category, isDay) => {
  switch (category) {
    case 'Labour Charge':
      return isDay 
        ? 'bg-blue-100 text-blue-800 border-blue-200' 
        : 'bg-blue-500/10 text-blue-400 border-blue-500/20';
    case 'Material Charge':
      return isDay 
        ? 'bg-amber-100 text-amber-800 border-amber-200' 
        : 'bg-amber-500/10 text-amber-400 border-amber-500/20';
    case 'Transport / Vehicle':
      return isDay 
        ? 'bg-purple-100 text-purple-800 border-purple-200' 
        : 'bg-purple-500/10 text-purple-400 border-purple-500/20';
    case 'Equipment & Machinery':
      return isDay 
        ? 'bg-indigo-100 text-indigo-800 border-indigo-200' 
        : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20';
    case 'Subcontractor':
      return isDay 
        ? 'bg-cyan-100 text-cyan-800 border-cyan-200' 
        : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20';
    case 'Food & Refreshment':
      return isDay 
        ? 'bg-emerald-100 text-emerald-800 border-emerald-200' 
        : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    default:
      return isDay 
        ? 'bg-slate-100 text-slate-700 border-slate-200' 
        : 'bg-slate-800 text-slate-300 border-slate-700';
  }
};

export default function ClientLedger({
  clients,
  transactions,
  siteExpenses = [],
  quotations,
  authUser,
  theme = 'night',
  onSelectClientForQuotation,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onAddTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onAddSiteExpense,
  onUpdateSiteExpense,
  onDeleteSiteExpense
}) {
  const isDay = theme === 'day';
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [showEditTxModal, setShowEditTxModal] = useState(false);
  const [editTxData, setEditTxData] = useState(null);

  // Sub-view tab for selected client: 'statement' (customer ledger) | 'expenses' (admin site expenses)
  const [siteViewTab, setSiteViewTab] = useState('statement');
  const [expenseCategoryFilter, setExpenseCategoryFilter] = useState('ALL');
  const [expenseSearch, setExpenseSearch] = useState('');
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);

  // Role permissions
  const isAdmin = authUser?.role === 'ADMIN';
  const canEdit = authUser?.role === 'ADMIN' || authUser?.role === 'STAFF';

  // New Client Form State
  const [newClient, setNewClient] = useState({
    name: '',
    phone: '',
    address: '',
    siteLocation: '',
    openingBalance: ''
  });

  // Edit Client Form State
  const [editClientData, setEditClientData] = useState(null);

  // New Transaction Form State
  const [newTx, setNewTx] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    type: 'BILL', // 'BILL' (Debit) or 'PAYMENT' (Credit)
    amount: ''
  });

  // New Site Expense Form State (Admin Only)
  const [newExpense, setNewExpense] = useState({
    date: new Date().toISOString().split('T')[0],
    category: 'Material Charge',
    description: '',
    paidTo: '',
    paymentMode: 'CASH',
    amount: ''
  });

  // Edit Site Expense Form State
  const [editExpenseData, setEditExpenseData] = useState(null);

  // Filter clients by search query
  const filteredClients = clients.filter(c => 
    c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.siteLocation && c.siteLocation.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (c.address && c.address.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const selectedClient = clients.find(c => c.id === selectedClientId) || filteredClients[0] || clients[0];
  const { processedTxs = [], netBalance: currentClientNetBalance = 0 } = calculateClientLedger(selectedClient, transactions);

  // Totals calculations
  const totalBalanceDueAllClients = clients.reduce((sum, c) => {
    const { netBalance } = calculateClientLedger(c, transactions);
    return sum + netBalance;
  }, 0);

  // Site Expenses Calculations for Selected Account (Admin Only)
  const clientSiteExpenses = (Array.isArray(siteExpenses) ? siteExpenses : []).filter(
    e => e.clientId === selectedClient?.id
  );

  const totalSiteExpenses = clientSiteExpenses.reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0), 0
  );
  const totalLabourExpenses = clientSiteExpenses
    .filter(e => e.category === 'Labour Charge')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalMaterialExpenses = clientSiteExpenses
    .filter(e => e.category === 'Material Charge')
    .reduce((sum, e) => sum + (parseFloat(e.amount) || 0), 0);
  const totalOtherExpenses = Math.max(0, totalSiteExpenses - totalLabourExpenses - totalMaterialExpenses);

  // Total Billed to Client (Total Debit / Bills for site + Opening Balance)
  const totalBilledToClient = processedTxs
    .filter(t => t.type === 'BILL' || t.type === 'DEBIT')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0) + (parseFloat(selectedClient?.openingBalance) || 0);

  // Total Payments Collected from Client
  const totalPaymentsCollected = processedTxs
    .filter(t => t.type === 'PAYMENT' || t.type === 'CREDIT')
    .reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);

  // Net Site Profit = Total Billed to Client - Site Expenses
  const netSiteProfit = totalBilledToClient - totalSiteExpenses;
  const profitMarginPct = totalBilledToClient > 0 
    ? ((netSiteProfit / totalBilledToClient) * 100).toFixed(1) 
    : '0';

  // Filtered expenses for display
  const displayedExpenses = clientSiteExpenses
    .filter(e => {
      const matchCat = expenseCategoryFilter === 'ALL' || e.category === expenseCategoryFilter;
      const q = (expenseSearch || '').toLowerCase().trim();
      const matchSearch = !q || 
        (e.description && e.description.toLowerCase().includes(q)) ||
        (e.paidTo && e.paidTo.toLowerCase().includes(q)) ||
        (e.category && e.category.toLowerCase().includes(q));
      return matchCat && matchSearch;
    })
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  // Global total site expenses across all accounts (Admin view)
  const totalExpensesAllClients = (Array.isArray(siteExpenses) ? siteExpenses : []).reduce(
    (sum, e) => sum + (parseFloat(e.amount) || 0), 0
  );

  const handleCreateClientSubmit = (e) => {
    e.preventDefault();
    if (!newClient.name.trim()) return;
    
    onAddClient({
      name: newClient.name.trim(),
      phone: newClient.phone.trim(),
      address: newClient.address.trim(),
      siteLocation: newClient.siteLocation.trim(),
      openingBalance: parseFloat(newClient.openingBalance) || 0
    });

    setNewClient({ name: '', phone: '', address: '', siteLocation: '', openingBalance: '' });
    setShowAddClientModal(false);
  };

  const handleEditClientSubmit = (e) => {
    e.preventDefault();
    if (!editClientData || !editClientData.name.trim()) return;

    onUpdateClient(editClientData.id, {
      name: editClientData.name.trim(),
      phone: editClientData.phone.trim(),
      address: editClientData.address.trim(),
      siteLocation: editClientData.siteLocation.trim(),
      openingBalance: parseFloat(editClientData.openingBalance) || 0
    });

    setShowEditClientModal(false);
  };

  const openEditClientModal = () => {
    if (!selectedClient) return;
    setEditClientData({
      id: selectedClient.id,
      name: selectedClient.name || '',
      phone: selectedClient.phone || '',
      address: selectedClient.address || '',
      siteLocation: selectedClient.siteLocation || '',
      openingBalance: selectedClient.openingBalance || 0
    });
    setShowEditClientModal(true);
  };

  const handleCreateTxSubmit = (e) => {
    e.preventDefault();
    if (!selectedClient || !newTx.amount || parseFloat(newTx.amount) <= 0) return;

    onAddTransaction({
      clientId: selectedClient.id,
      date: newTx.date,
      description: newTx.description.trim() || (newTx.type === 'BILL' ? 'Site Work Bill' : 'Advance Payment Credit'),
      type: newTx.type,
      amount: parseFloat(newTx.amount)
    });

    setNewTx({
      date: new Date().toISOString().split('T')[0],
      description: '',
      type: 'BILL',
      amount: ''
    });
    setShowAddTxModal(false);
  };

  const openEditTxModal = (tx) => {
    setEditTxData({
      id: tx.id,
      date: tx.date || new Date().toISOString().split('T')[0],
      description: tx.description || '',
      type: tx.type || 'BILL',
      amount: tx.amount || ''
    });
    setShowEditTxModal(true);
  };

  const handleEditTxSubmit = (e) => {
    e.preventDefault();
    if (!editTxData || !editTxData.id || !editTxData.amount || parseFloat(editTxData.amount) <= 0) return;

    if (onUpdateTransaction) {
      onUpdateTransaction(editTxData.id, {
        date: editTxData.date,
        description: editTxData.description.trim() || (editTxData.type === 'BILL' ? 'Site Work Bill' : 'Advance Payment Credit'),
        type: editTxData.type,
        amount: parseFloat(editTxData.amount)
      });
    }

    setShowEditTxModal(false);
    setEditTxData(null);
  };

  // Site Expense Form Submissions (Admin Only)
  const handleCreateExpenseSubmit = (e) => {
    e.preventDefault();
    if (!selectedClient || !newExpense.amount || parseFloat(newExpense.amount) <= 0) return;

    if (onAddSiteExpense) {
      onAddSiteExpense({
        clientId: selectedClient.id,
        date: newExpense.date,
        category: newExpense.category,
        description: newExpense.description.trim() || `${newExpense.category} for ${selectedClient.name}`,
        paidTo: newExpense.paidTo.trim(),
        paymentMode: newExpense.paymentMode,
        amount: parseFloat(newExpense.amount),
        createdBy: authUser?.name || 'Ashif'
      });
    }

    setNewExpense({
      date: new Date().toISOString().split('T')[0],
      category: 'Material Charge',
      description: '',
      paidTo: '',
      paymentMode: 'CASH',
      amount: ''
    });
    setShowAddExpenseModal(false);
  };

  const handleEditExpenseSubmit = (e) => {
    e.preventDefault();
    if (!editExpenseData || !editExpenseData.amount || parseFloat(editExpenseData.amount) <= 0) return;

    if (onUpdateSiteExpense) {
      onUpdateSiteExpense(editExpenseData.id, {
        date: editExpenseData.date,
        category: editExpenseData.category,
        description: editExpenseData.description.trim(),
        paidTo: editExpenseData.paidTo.trim(),
        paymentMode: editExpenseData.paymentMode,
        amount: parseFloat(editExpenseData.amount)
      });
    }

    setShowEditExpenseModal(false);
    setEditExpenseData(null);
  };

  const openEditExpenseModal = (exp) => {
    setEditExpenseData({
      id: exp.id,
      date: exp.date,
      category: exp.category,
      description: exp.description || '',
      paidTo: exp.paidTo || '',
      paymentMode: exp.paymentMode || 'CASH',
      amount: exp.amount
    });
    setShowEditExpenseModal(true);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner & Stats */}
      <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 ${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border p-5 rounded-2xl transition-colors`}>
        <div>
          <h1 className={`text-xl font-bold ${isDay ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
            <Wallet className="w-5 h-5 text-amber-500" />
            Tally-Style Client Accounts Ledger
          </h1>
          <p className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'} mt-1`}>
            Manage client balances, site bills, advance payments & quotation history (Auto-sorted by date)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            onClick={() => onSelectClientForQuotation({ id: 'ALL_SITES' })}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-indigo-600/20 active:scale-98"
            title="Generate consolidated master quotation and balance statement for all sites"
          >
            <FileText className="w-4 h-4 text-indigo-200" />
            <span>All Sites Master Quotation</span>
          </button>

          {canEdit && (
            <button
              onClick={() => setShowAddClientModal(true)}
              className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-amber-500/20 active:scale-98"
            >
              <Plus className="w-4 h-4" />
              Add Client Account
            </button>
          )}
        </div>
      </div>

      {/* Global Ledger Metrics Bar */}
      <div className={`grid grid-cols-1 ${isAdmin ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-3'} gap-4`}>
        <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border p-4 rounded-2xl transition-colors`}>
          <span className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'} font-medium`}>Total Client Accounts</span>
          <div className={`text-2xl font-bold ${isDay ? 'text-slate-900' : 'text-white'} mt-1`}>{clients.length} Sites Active</div>
        </div>

        <div 
          onClick={() => onSelectClientForQuotation({ id: 'ALL_SITES' })}
          className={`${isDay ? 'bg-white border-slate-200 hover:border-amber-500/60 shadow-sm' : 'bg-slate-900 border-slate-800 hover:border-amber-500/40'} border p-4 rounded-2xl cursor-pointer transition-all group`}
          title="Click to view Master All-Sites Statement"
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'} font-medium group-hover:text-amber-500 transition-colors`}>Total Balance Receivable</span>
            <span className="text-[10px] text-amber-600 bg-amber-500/10 px-2 py-0.5 rounded-md font-bold">All Sites</span>
          </div>
          <div className="text-2xl font-bold text-amber-500 font-mono mt-1">
            {formatIndianCurrency(totalBalanceDueAllClients, true)}
          </div>
        </div>

        {isAdmin && (
          <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border p-4 rounded-2xl transition-colors`}>
            <div className="flex items-center justify-between">
              <span className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'} font-medium flex items-center gap-1`}>
                <Lock className="w-3.5 h-3.5 text-amber-500" />
                <span>Total Site Expenses</span>
              </span>
              <span className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 px-1.5 py-0.5 rounded font-bold">
                Admin Cost
              </span>
            </div>
            <div className={`text-2xl font-bold font-mono mt-1 ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
              {formatIndianCurrency(totalExpensesAllClients, true)}
            </div>
          </div>
        )}

        <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border p-4 rounded-2xl transition-colors`}>
          <span className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'} font-medium`}>Active Account Selected</span>
          <div className={`text-sm font-bold ${isDay ? 'text-slate-800' : 'text-slate-200'} mt-1 truncate`}>
            {selectedClient?.name || 'None'}
          </div>
          {isAdmin && (
            <div className="text-[11px] text-amber-500/90 font-mono mt-1 flex items-center gap-1">
              <span>Site Cost: {formatIndianCurrency(totalSiteExpenses, true)}</span>
              <span>•</span>
              <span>{clientSiteExpenses.length} entries</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Client List (Left 4 cols) & Selected Client Detail Ledger (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: Client Accounts Search & List */}
        <div className={`lg:col-span-4 ${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border rounded-2xl p-4 space-y-4 transition-colors`}>
          <div className="relative">
            <Search className={`w-4 h-4 absolute left-3 top-3 ${isDay ? 'text-slate-400' : 'text-slate-500'}`} />
            <input
              type="text"
              placeholder="Search clients or site locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full ${isDay ? 'bg-slate-50 border-slate-200 text-slate-800 placeholder-slate-400 focus:bg-white focus:border-amber-500' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500 focus:border-amber-500'} border rounded-xl pl-9 pr-3 py-2 text-xs focus:outline-none transition-colors`}
            />
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              const { netBalance } = calculateClientLedger(client, transactions);
              const clientCost = (Array.isArray(siteExpenses) ? siteExpenses : [])
                .filter(e => e.clientId === client.id)
                .reduce((s, e) => s + (parseFloat(e.amount) || 0), 0);

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? isDay
                        ? 'bg-amber-50/80 border-amber-400/80 shadow-sm'
                        : 'bg-slate-800 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : isDay
                        ? 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                        : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-sm font-bold ${
                        isSelected 
                          ? isDay ? 'text-amber-800' : 'text-amber-400' 
                          : isDay ? 'text-slate-800' : 'text-slate-200'
                      }`}>
                        {client.name}
                      </h3>
                      <p className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'} flex items-center gap-1 mt-0.5`}>
                        <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{client.siteLocation || client.address || 'Palakkad'}</span>
                      </p>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1" />
                    )}
                  </div>

                  <div className={`flex items-center justify-between mt-3 pt-2 border-t ${isDay ? 'border-slate-200' : 'border-slate-800/60'} text-xs`}>
                    <span className={isDay ? 'text-slate-500' : 'text-slate-500'}>Balance Due:</span>
                    <span className={`font-mono font-bold ${isDay ? 'text-slate-900' : 'text-slate-200'}`}>
                      {formatIndianCurrency(netBalance, true)}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-between mt-1 text-[11px] font-mono opacity-85">
                      <span className="flex items-center gap-1 text-slate-500">
                        <Lock className="w-2.5 h-2.5 text-amber-500" /> Site Cost:
                      </span>
                      <span className={`font-semibold ${isDay ? 'text-slate-700' : 'text-amber-400/90'}`}>
                        {formatIndianCurrency(clientCost, true)}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className={`text-center py-8 text-xs ${isDay ? 'text-slate-400' : 'text-slate-500'}`}>
                No matching client accounts found.
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Pane: Tally Account Statement Table & Actions */}
        {selectedClient ? (
          <div className="lg:col-span-8 space-y-6">
            
            {/* Selected Client Card Header */}
            <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border rounded-2xl p-5 relative overflow-hidden transition-colors`}>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className={`text-xl font-bold ${isDay ? 'text-slate-900' : 'text-white'} font-heading`}>
                      {selectedClient.name}
                    </h2>
                    <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-500 font-semibold px-2 py-0.5 rounded-full">
                      Active Account
                    </span>
                    {canEdit && (
                      <button
                        onClick={openEditClientModal}
                        className={`p-1 ${isDay ? 'text-slate-400 hover:text-amber-600 hover:bg-slate-100' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'} rounded transition-colors`}
                        title="Edit Client Info / Opening Balance"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className={`flex flex-wrap items-center gap-4 text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'} mt-2`}>
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-amber-500" />
                      {selectedClient.siteLocation || selectedClient.address || 'Palakkad'}
                    </span>
                    {selectedClient.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-amber-500" />
                        {selectedClient.phone}
                      </span>
                    )}
                  </div>
                </div>

                {/* Balance Pill & Actions */}
                <div className="flex flex-col items-end gap-2">
                  <div className={`${isDay ? 'bg-amber-50/70 border-amber-300/80' : 'bg-slate-950 border-amber-500/30'} px-4 py-2 rounded-xl border text-right transition-colors`}>
                    <span className={`text-[10px] uppercase ${isDay ? 'text-amber-800' : 'text-slate-400'} font-semibold tracking-wider`}>Current Balance Due</span>
                    <div className={`text-lg font-mono font-bold ${isDay ? 'text-amber-700' : 'text-amber-400'}`}>
                      {formatIndianCurrency(currentClientNetBalance, true)}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {canEdit && (
                      <button
                        onClick={() => {
                          setNewTx({
                            date: new Date().toISOString().split('T')[0],
                            description: '',
                            type: 'BILL',
                            amount: ''
                          });
                          setShowAddTxModal(true);
                        }}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-md shadow-emerald-600/20 active:scale-95"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Record Bill / Payment
                      </button>
                    )}

                    {isAdmin && (
                      <button
                        onClick={() => {
                          setNewExpense({
                            date: new Date().toISOString().split('T')[0],
                            category: 'Material Charge',
                            description: '',
                            paidTo: '',
                            paymentMode: 'CASH',
                            amount: ''
                          });
                          setShowAddExpenseModal(true);
                        }}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-md shadow-amber-500/20 active:scale-95"
                      >
                        <Lock className="w-3.5 h-3.5" />
                        Add Site Expense
                      </button>
                    )}

                    <button
                      onClick={() => onSelectClientForQuotation(selectedClient)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all active:scale-95 ${
                        isDay ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Create Quotation
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Account Sub-Tabs: Client Statement vs 🔒 Site Expenses (Admin Only) */}
            <div className={`flex items-center gap-2 p-1.5 rounded-2xl border ${
              isDay ? 'bg-slate-100/90 border-slate-200' : 'bg-slate-950/80 border-slate-800'
            }`}>
              <button
                type="button"
                onClick={() => setSiteViewTab('statement')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                  siteViewTab === 'statement'
                    ? isDay
                      ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                      : 'bg-slate-800 text-white shadow-lg shadow-black/40 border border-slate-700/80'
                    : isDay
                      ? 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                      : 'text-slate-400 hover:text-white hover:bg-slate-900/60'
                }`}
              >
                <FileText className="w-4 h-4 text-amber-500" />
                <span>Client Statement & Ledger</span>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-semibold ${
                  isDay ? 'bg-slate-100 text-slate-600' : 'bg-slate-900 text-slate-400'
                }`}>
                  {processedTxs.length} entries
                </span>
              </button>

              {isAdmin && (
                <button
                  type="button"
                  onClick={() => setSiteViewTab('expenses')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all ${
                    siteViewTab === 'expenses'
                      ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20 font-extrabold'
                      : isDay
                        ? 'text-amber-800 hover:text-amber-900 hover:bg-amber-100/60'
                        : 'text-amber-400 hover:text-amber-300 hover:bg-amber-500/10'
                  }`}
                >
                  <Lock className="w-4 h-4" />
                  <span>Site Expenses (Admin Only)</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                    siteViewTab === 'expenses' 
                      ? 'bg-slate-950/20 text-slate-950'
                      : isDay ? 'bg-amber-200/70 text-amber-900' : 'bg-amber-500/20 text-amber-300'
                  }`}>
                    {clientSiteExpenses.length} entries ({formatIndianCurrency(totalSiteExpenses, true)})
                  </span>
                </button>
              )}
            </div>

            {/* TAB 1: Customer Billing Ledger Statement */}
            {siteViewTab === 'statement' && (
              <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border rounded-2xl p-5 space-y-4 transition-colors`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className={`text-base font-bold ${isDay ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
                      <Calendar className="w-4 h-4 text-amber-500" />
                      Chronological Statement & Running Ledger
                    </h3>
                    <p className={`text-[11px] ${isDay ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                      Automatically ordered chronologically by Date (oldest to newest)
                    </p>
                  </div>
                  <span className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                    {processedTxs.length} Transactions
                  </span>
                </div>

                <div className={`overflow-x-auto border ${isDay ? 'border-slate-200' : 'border-slate-800'} rounded-xl`}>
                  <table className="w-full text-left text-sm">
                    <thead className={`${isDay ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-400'} text-xs uppercase font-semibold transition-colors`}>
                      <tr>
                        <th className="px-4 py-3">Date</th>
                        <th className="px-4 py-3">Particulars / Description</th>
                        <th className="px-4 py-3">Type</th>
                        <th className="px-4 py-3 text-right">Debit (+)</th>
                        <th className="px-4 py-3 text-right">Credit (-)</th>
                        <th className="px-4 py-3 text-right">Balance</th>
                        {isAdmin && <th className="px-2 py-3 text-center w-20">Action</th>}
                      </tr>
                    </thead>
                    <tbody className={`divide-y ${isDay ? 'divide-slate-100 text-slate-700' : 'divide-slate-800 text-slate-300'}`}>
                      {/* Opening Balance Row */}
                      <tr className={`${isDay ? 'bg-slate-50/70 text-slate-600' : 'bg-slate-950/60 text-slate-400'} text-xs transition-colors`}>
                        <td className={`px-4 py-2.5 font-mono ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                          {formatDateIndian(selectedClient.createdAt || '2026-06-01')}
                        </td>
                        <td className={`px-4 py-2.5 font-semibold ${isDay ? 'text-slate-800' : 'text-slate-200'}`}>
                          Opening Balance Brought Forward
                        </td>
                        <td className={`px-4 py-2.5 ${isDay ? 'text-slate-500' : 'text-slate-400'} font-bold text-[10px]`}>OPENING</td>
                        <td className={`px-4 py-2.5 text-right font-mono ${isDay ? 'text-slate-400' : 'text-slate-400'}`}>-</td>
                        <td className={`px-4 py-2.5 text-right font-mono ${isDay ? 'text-slate-400' : 'text-slate-400'}`}>-</td>
                        <td className={`px-4 py-2.5 text-right font-mono font-bold ${isDay ? 'text-amber-700' : 'text-amber-300'}`}>
                          {formatIndianCurrency(selectedClient.openingBalance)}
                        </td>
                        {isAdmin && (
                          <td className="px-2 py-2.5 text-center">
                            <button
                              onClick={openEditClientModal}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[11px] font-semibold transition-colors ${
                                isDay ? 'text-amber-700 hover:bg-amber-100' : 'text-amber-400 hover:bg-amber-950/50'
                              }`}
                              title="Edit Opening Balance"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                              <span className="text-[10px]">Edit</span>
                            </button>
                          </td>
                        )}
                      </tr>

                      {processedTxs.map((tx) => {
                        const isDebit = tx.type === 'BILL' || tx.type === 'DEBIT';
                        return (
                          <tr key={tx.id} className={`${isDay ? 'hover:bg-slate-50' : 'hover:bg-slate-850/50'} transition-colors text-xs`}>
                            <td className={`px-4 py-3 font-mono ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>{formatDateIndian(tx.date)}</td>
                            <td className={`px-4 py-3 font-medium ${isDay ? 'text-slate-800' : 'text-slate-200'}`}>{tx.description}</td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                isDebit 
                                  ? isDay ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                                  : isDay ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className={`px-4 py-3 text-right font-mono ${isDay ? 'text-amber-700' : 'text-amber-400'} font-medium`}>
                              {isDebit ? formatIndianCurrency(tx.amount) : '-'}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono ${isDay ? 'text-emerald-700' : 'text-emerald-400'} font-medium`}>
                              {!isDebit ? formatIndianCurrency(tx.amount) : '-'}
                            </td>
                            <td className={`px-4 py-3 text-right font-mono font-bold ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>
                              {formatIndianCurrency(tx.currentRunningBalance)}
                            </td>
                            {isAdmin && (
                              <td className="px-2 py-3 text-center">
                                <div className="flex items-center justify-center gap-1">
                                  <button
                                    onClick={() => openEditTxModal(tx)}
                                    className={`p-1.5 ${isDay ? 'text-slate-500 hover:text-blue-600 hover:bg-blue-50' : 'text-slate-400 hover:text-blue-400 hover:bg-blue-950/40'} rounded-lg transition-colors`}
                                    title="Edit Transaction"
                                  >
                                    <Edit2 className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => {
                                      if (window.confirm(`Are you sure you want to delete this ${tx.type === 'BILL' ? 'Bill' : 'Payment'} transaction of ₹${tx.amount}?`)) {
                                        onDeleteTransaction(tx.id);
                                      }
                                    }}
                                    className={`p-1.5 ${isDay ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-500 hover:text-red-400 hover:bg-red-950/40'} rounded-lg transition-colors`}
                                    title="Delete Transaction"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        );
                      })}

                      {processedTxs.length === 0 && (
                        <tr>
                          <td colSpan={isAdmin ? 7 : 6} className={`text-center py-6 text-xs ${isDay ? 'text-slate-400' : 'text-slate-500'}`}>
                            No transactions recorded yet for this client account.
                          </td>
                        </tr>
                      )}
                    </tbody>
                    <tfoot className={`${isDay ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-200'} font-bold text-xs transition-colors`}>
                      <tr>
                        <td colSpan="5" className="px-4 py-3 text-right">
                          FINAL BALANCE DUE:
                        </td>
                        <td className={`px-4 py-3 text-right font-mono text-sm ${isDay ? 'text-amber-700' : 'text-amber-400'} font-extrabold`}>
                          {formatIndianCurrency(currentClientNetBalance, true)}
                        </td>
                        {isAdmin && <td></td>}
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: 🔒 Admin-Only Site Expenses & Project Costing */}
            {siteViewTab === 'expenses' && isAdmin && (
              <div className="space-y-5 animate-in fade-in duration-200 no-print">
                
                {/* Admin Confidential Banner - On-Screen View Only */}
                <div className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isDay 
                    ? 'bg-amber-50/80 border-amber-300 text-amber-950 shadow-sm' 
                    : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
                }`}>
                  <div className="flex items-start sm:items-center gap-3">
                    <div className={`p-2.5 rounded-xl shrink-0 ${isDay ? 'bg-amber-200 text-amber-900' : 'bg-amber-500/20 text-amber-400'}`}>
                      <Lock className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                        <span>Admin Internal Site Costing</span>
                        <span className="text-[10px] bg-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-mono font-bold">
                          ON-SCREEN VIEW ONLY
                        </span>
                      </div>
                      <p className="text-[11px] opacity-80 mt-0.5">
                        Labour charges, material purchases, and transport costs recorded here are strictly internal for on-screen checking and profit calculation. There is <strong>no print out or download option</strong>, and these details are 100% excluded from customer quotation documents.
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-xl shrink-0 ${
                    isDay ? 'bg-white border border-amber-200 text-amber-900' : 'bg-slate-900 border border-amber-500/20 text-amber-300'
                  }`}>
                    <Eye className="w-3.5 h-3.5 text-amber-500" />
                    <span>On-Screen Only • No Printout</span>
                  </div>
                </div>

                {/* Project Profitability & Cost Breakdown Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Card 1: Total Billed */}
                  <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border p-4 rounded-2xl transition-colors`}>
                    <div className="flex items-center justify-between text-xs font-medium text-slate-500">
                      <span>Total Billed to Client</span>
                      <Receipt className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className={`text-xl font-bold font-mono mt-1 ${isDay ? 'text-slate-900' : 'text-white'}`}>
                      {formatIndianCurrency(totalBilledToClient, true)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      Collected: {formatIndianCurrency(totalPaymentsCollected)}
                    </div>
                  </div>

                  {/* Card 2: Total Site Expenses */}
                  <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border p-4 rounded-2xl transition-colors`}>
                    <div className="flex items-center justify-between text-xs font-medium text-amber-500">
                      <span className="flex items-center gap-1 font-semibold">
                        <Lock className="w-3 h-3" /> Total Site Cost
                      </span>
                      <Briefcase className="w-4 h-4 text-amber-500" />
                    </div>
                    <div className="text-xl font-bold font-mono mt-1 text-amber-500">
                      {formatIndianCurrency(totalSiteExpenses, true)}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-1">
                      {clientSiteExpenses.length} expense entries recorded
                    </div>
                  </div>

                  {/* Card 3: Estimated Site Profit */}
                  <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border p-4 rounded-2xl transition-colors`}>
                    <div className="flex items-center justify-between text-xs font-medium">
                      <span className="text-slate-500 font-semibold">Estimated Site Profit</span>
                      <TrendingUp className={`w-4 h-4 ${netSiteProfit >= 0 ? 'text-emerald-500' : 'text-red-500'}`} />
                    </div>
                    <div className={`text-xl font-bold font-mono mt-1 ${
                      netSiteProfit >= 0 
                        ? isDay ? 'text-emerald-700' : 'text-emerald-400' 
                        : isDay ? 'text-red-700' : 'text-red-400'
                    }`}>
                      {formatIndianCurrency(netSiteProfit, true)}
                    </div>
                    <div className="mt-1">
                      <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                        netSiteProfit >= 0 
                          ? isDay ? 'bg-emerald-100 text-emerald-800' : 'bg-emerald-500/20 text-emerald-300'
                          : isDay ? 'bg-red-100 text-red-800' : 'bg-red-500/20 text-red-300'
                      }`}>
                        {netSiteProfit >= 0 ? `+${profitMarginPct}% Margin` : `${profitMarginPct}% Margin`}
                      </span>
                    </div>
                  </div>

                  {/* Card 4: Labour vs Material Split */}
                  <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border p-4 rounded-2xl transition-colors`}>
                    <span className="text-xs font-medium text-slate-500">Expense Split</span>
                    <div className="mt-2 space-y-1.5 text-[11px] font-mono">
                      <div className="flex items-center justify-between">
                        <span className="text-blue-500 font-semibold flex items-center gap-1">
                          <Hammer className="w-3 h-3" /> Labour:
                        </span>
                        <span className={`font-bold ${isDay ? 'text-slate-800' : 'text-slate-200'}`}>
                          {formatIndianCurrency(totalLabourExpenses)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-amber-500 font-semibold flex items-center gap-1">
                          <Receipt className="w-3 h-3" /> Materials:
                        </span>
                        <span className={`font-bold ${isDay ? 'text-slate-800' : 'text-slate-200'}`}>
                          {formatIndianCurrency(totalMaterialExpenses)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-purple-500 font-semibold flex items-center gap-1">
                          <Truck className="w-3 h-3" /> Others:
                        </span>
                        <span className={`font-bold ${isDay ? 'text-slate-800' : 'text-slate-200'}`}>
                          {formatIndianCurrency(totalOtherExpenses)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Toolbar & Filter Bar */}
                <div className={`p-4 rounded-2xl border ${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors`}>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Category Filter */}
                    <select
                      value={expenseCategoryFilter}
                      onChange={(e) => setExpenseCategoryFilter(e.target.value)}
                      className={`${isDay ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                    >
                      <option value="ALL">All Categories ({clientSiteExpenses.length})</option>
                      {EXPENSE_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    {/* Search */}
                    <div className="relative">
                      <Search className={`w-3.5 h-3.5 absolute left-3 top-2.5 ${isDay ? 'text-slate-400' : 'text-slate-500'}`} />
                      <input
                        type="text"
                        placeholder="Search particulars or paid to..."
                        value={expenseSearch}
                        onChange={(e) => setExpenseSearch(e.target.value)}
                        className={`${isDay ? 'bg-slate-100 border-slate-300 text-slate-900' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl pl-8 pr-3 py-1.5 text-xs focus:border-amber-500 focus:outline-none`}
                      />
                    </div>
                  </div>

                  {/* Add Site Expense Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setNewExpense({
                        date: new Date().toISOString().split('T')[0],
                        category: 'Material Charge',
                        description: '',
                        paidTo: '',
                        paymentMode: 'CASH',
                        amount: ''
                      });
                      setShowAddExpenseModal(true);
                    }}
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-4 py-2 rounded-xl flex items-center justify-center gap-1.5 transition-all shadow-lg shadow-amber-500/20 active:scale-95"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Site Expense</span>
                  </button>
                </div>

                {/* Site Expenses Table */}
                <div className={`${isDay ? 'bg-white border-slate-200 shadow-sm' : 'bg-slate-900 border-slate-800'} border rounded-2xl p-5 space-y-4 transition-colors`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className={`text-base font-bold ${isDay ? 'text-slate-900' : 'text-white'} flex items-center flex-wrap gap-2`}>
                        <Lock className="w-4 h-4 text-amber-500" />
                        <span>Internal Site Cost & Expense Register</span>
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${
                          isDay 
                            ? 'bg-slate-100 text-slate-600 border-slate-200' 
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}>
                          Screen View Only • No Printout
                        </span>
                      </h3>
                      <p className={`text-[11px] ${isDay ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
                        Labour charges, materials, transport, and contractor payouts for {selectedClient.name}
                      </p>
                    </div>
                    <span className={`text-xs font-mono font-bold ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
                      {displayedExpenses.length} Records
                    </span>
                  </div>

                  <div className={`overflow-x-auto border ${isDay ? 'border-slate-200' : 'border-slate-800'} rounded-xl`}>
                    <table className="w-full text-left text-sm">
                      <thead className={`${isDay ? 'bg-slate-100 text-slate-700' : 'bg-slate-950 text-slate-400'} text-xs uppercase font-semibold transition-colors`}>
                        <tr>
                          <th className="px-4 py-3">Date</th>
                          <th className="px-4 py-3">Category</th>
                          <th className="px-4 py-3">Particulars / Description</th>
                          <th className="px-4 py-3">Paid To / Vendor</th>
                          <th className="px-4 py-3">Payment Mode</th>
                          <th className="px-4 py-3 text-right">Amount (₹)</th>
                          <th className="px-3 py-3 text-center w-20">Actions</th>
                        </tr>
                      </thead>
                      <tbody className={`divide-y ${isDay ? 'divide-slate-100 text-slate-700' : 'divide-slate-800 text-slate-300'}`}>
                        {displayedExpenses.map((exp) => (
                          <tr key={exp.id} className={`${isDay ? 'hover:bg-slate-50' : 'hover:bg-slate-850/50'} transition-colors text-xs`}>
                            <td className={`px-4 py-3 font-mono ${isDay ? 'text-slate-500' : 'text-slate-400'} whitespace-nowrap`}>
                              {formatDateIndian(exp.date)}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold border ${getCategoryBadgeClass(exp.category, isDay)}`}>
                                {exp.category}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className={`font-semibold ${isDay ? 'text-slate-800' : 'text-slate-100'}`}>
                                {exp.description}
                              </div>
                            </td>
                            <td className={`px-4 py-3 ${isDay ? 'text-slate-600' : 'text-slate-400'}`}>
                              {exp.paidTo ? (
                                <span className="font-medium">{exp.paidTo}</span>
                              ) : (
                                <span className="opacity-40 italic">-</span>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                                isDay ? 'bg-slate-100 text-slate-700' : 'bg-slate-800 text-slate-300'
                              }`}>
                                {exp.paymentMode || 'CASH'}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right font-mono font-bold text-amber-500 text-sm whitespace-nowrap">
                              {formatIndianCurrency(exp.amount)}
                            </td>
                            <td className="px-3 py-3 text-center whitespace-nowrap">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditExpenseModal(exp)}
                                  className={`p-1.5 ${isDay ? 'text-slate-400 hover:text-amber-600 hover:bg-slate-100' : 'text-slate-400 hover:text-amber-400 hover:bg-slate-800'} rounded-lg transition-colors`}
                                  title="Edit Expense"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Delete expense "${exp.description}" (₹${exp.amount})?`)) {
                                      onDeleteSiteExpense(exp.id);
                                    }
                                  }}
                                  className={`p-1.5 ${isDay ? 'text-slate-400 hover:text-red-600 hover:bg-red-50' : 'text-slate-500 hover:text-red-400 hover:bg-red-950/40'} rounded-lg transition-colors`}
                                  title="Delete Expense"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}

                        {displayedExpenses.length === 0 && (
                          <tr>
                            <td colSpan="7" className="text-center py-12">
                              <div className="flex flex-col items-center justify-center space-y-2">
                                <div className={`p-3 rounded-full ${isDay ? 'bg-amber-100 text-amber-600' : 'bg-amber-500/10 text-amber-400'}`}>
                                  <Lock className="w-6 h-6" />
                                </div>
                                <div className={`text-sm font-bold ${isDay ? 'text-slate-700' : 'text-slate-200'}`}>
                                  No Site Expenses Recorded Yet
                                </div>
                                <p className={`text-xs ${isDay ? 'text-slate-400' : 'text-slate-500'} max-w-sm text-center`}>
                                  Click the "Add Site Expense" button to record labour charges, material purchases, transport costs, or vendor bills for this site.
                                </p>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setNewExpense({
                                      date: new Date().toISOString().split('T')[0],
                                      category: 'Material Charge',
                                      description: '',
                                      paidTo: '',
                                      paymentMode: 'CASH',
                                      amount: ''
                                    });
                                    setShowAddExpenseModal(true);
                                  }}
                                  className="mt-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1 transition-all"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                  <span>Record First Expense</span>
                                </button>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                      {displayedExpenses.length > 0 && (
                        <tfoot className={`${isDay ? 'bg-amber-50 text-slate-900 border-t border-amber-200' : 'bg-slate-950 text-slate-200 border-t border-slate-800'} font-bold text-xs transition-colors`}>
                          <tr>
                            <td colSpan="5" className="px-4 py-3 text-right uppercase tracking-wider font-extrabold text-amber-600">
                              TOTAL SITE EXPENSES:
                            </td>
                            <td className="px-4 py-3 text-right font-mono text-base text-amber-500 font-extrabold">
                              {formatIndianCurrency(totalSiteExpenses, true)}
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      )}
                    </table>
                  </div>
                </div>

              </div>
            )}

            {/* Danger Zone: Delete Client (Admin Only) */}
            {isAdmin && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete client "${selectedClient.name}" and all associated data?`)) {
                      onDeleteClient(selectedClient.id);
                    }
                  }}
                  className={`text-xs ${isDay ? 'text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200' : 'text-red-400 hover:text-red-300 hover:bg-red-950/40 border-red-500/20'} px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all border`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Client Account
                </button>
              </div>
            )}

          </div>
        ) : (
          <div className={`lg:col-span-8 ${isDay ? 'bg-white border-slate-200 shadow-sm text-slate-500' : 'bg-slate-900 border-slate-800 text-slate-400'} border rounded-2xl p-12 text-center`}>
            Select a client account from the left list to view statement ledger.
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className={`fixed inset-0 z-50 ${isDay ? 'bg-slate-900/50' : 'bg-black/70'} backdrop-blur-sm flex items-center justify-center p-4`}>
          <div className={`${isDay ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'} border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl transition-colors`}>
            <h3 className={`text-lg font-bold ${isDay ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
              <Users className="w-5 h-5 text-amber-500" />
              Add New Client Account
            </h3>
            <form onSubmit={handleCreateClientSubmit} className="space-y-3">
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kallekad Block Site Project"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 9995984554"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Site Location</label>
                <input
                  type="text"
                  placeholder="e.g. Kallekad Block Site"
                  value={newClient.siteLocation}
                  onChange={(e) => setNewClient({ ...newClient, siteLocation: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Full Address</label>
                <input
                  type="text"
                  placeholder="e.g. Palakkad, Kerala"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Opening Balance (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 1258382"
                  value={newClient.openingBalance}
                  onChange={(e) => setNewClient({ ...newClient, openingBalance: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div className={`flex justify-end gap-2 pt-3 border-t ${isDay ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className={`px-4 py-2 ${isDay ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} rounded-xl text-xs font-semibold`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  Save Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client Modal */}
      {showEditClientModal && editClientData && (
        <div className={`fixed inset-0 z-50 ${isDay ? 'bg-slate-900/50' : 'bg-black/70'} backdrop-blur-sm flex items-center justify-center p-4`}>
          <div className={`${isDay ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'} border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl transition-colors`}>
            <h3 className={`text-lg font-bold ${isDay ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
              <Edit2 className="w-5 h-5 text-amber-500" />
              Edit Client Account Info
            </h3>
            <form onSubmit={handleEditClientSubmit} className="space-y-3">
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Client Name *</label>
                <input
                  type="text"
                  required
                  value={editClientData.name}
                  onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Phone Number</label>
                <input
                  type="text"
                  value={editClientData.phone}
                  onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Site Location</label>
                <input
                  type="text"
                  value={editClientData.siteLocation}
                  onChange={(e) => setEditClientData({ ...editClientData, siteLocation: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Full Address</label>
                <input
                  type="text"
                  value={editClientData.address}
                  onChange={(e) => setEditClientData({ ...editClientData, address: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Opening Balance (₹)</label>
                <input
                  type="number"
                  value={editClientData.openingBalance}
                  onChange={(e) => setEditClientData({ ...editClientData, openingBalance: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div className={`flex justify-end gap-2 pt-3 border-t ${isDay ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setShowEditClientModal(false)}
                  className={`px-4 py-2 ${isDay ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} rounded-xl text-xs font-semibold`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  Update Account
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Transaction Modal */}
      {showAddTxModal && (
        <div className={`fixed inset-0 z-50 ${isDay ? 'bg-slate-900/50' : 'bg-black/70'} backdrop-blur-sm flex items-center justify-center p-4`}>
          <div className={`${isDay ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'} border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl transition-colors`}>
            <h3 className={`text-lg font-bold ${isDay ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
              <Plus className="w-5 h-5 text-emerald-500" />
              Record Transaction for {selectedClient?.name}
            </h3>
            <form onSubmit={handleCreateTxSubmit} className="space-y-3">
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Transaction Date</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Day */}
                  <select
                    required
                    value={newTx.date ? newTx.date.split('-')[2] : ''}
                    onChange={(e) => {
                      const parts = (newTx.date || new Date().toISOString().split('T')[0]).split('-');
                      setNewTx({ ...newTx, date: `${parts[0]}-${parts[1]}-${e.target.value}` });
                    }}
                    className={`${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-2 py-2 text-xs focus:border-amber-500 focus:outline-none font-mono`}
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = String(i + 1).padStart(2, '0');
                      return <option key={d} value={d}>{d}</option>;
                    })}
                  </select>

                  {/* Month */}
                  <select
                    required
                    value={newTx.date ? newTx.date.split('-')[1] : ''}
                    onChange={(e) => {
                      const parts = (newTx.date || new Date().toISOString().split('T')[0]).split('-');
                      setNewTx({ ...newTx, date: `${parts[0]}-${e.target.value}-${parts[2]}` });
                    }}
                    className={`${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-2 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                  >
                    <option value="">Month</option>
                    {[
                      ['01','Jan'],['02','Feb'],['03','Mar'],['04','Apr'],
                      ['05','May'],['06','Jun'],['07','Jul'],['08','Aug'],
                      ['09','Sep'],['10','Oct'],['11','Nov'],['12','Dec']
                    ].map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>

                  {/* Year */}
                  <select
                    required
                    value={newTx.date ? newTx.date.split('-')[0] : ''}
                    onChange={(e) => {
                      const parts = (newTx.date || new Date().toISOString().split('T')[0]).split('-');
                      setNewTx({ ...newTx, date: `${e.target.value}-${parts[1]}-${parts[2]}` });
                    }}
                    className={`${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-2 py-2 text-xs focus:border-amber-500 focus:outline-none font-mono`}
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 10 }, (_, i) => {
                      const yr = String(new Date().getFullYear() - 2 + i);
                      return <option key={yr} value={yr}>{yr}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'BILL' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newTx.type === 'BILL'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : isDay
                          ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    BILL / DEBIT (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'PAYMENT' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newTx.type === 'PAYMENT'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : isDay
                          ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    PAYMENT / CREDIT (-)
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Description / Particulars</label>
                <input
                  type="text"
                  placeholder={newTx.type === 'BILL' ? 'e.g. 2nd & 3rd Bill Amount' : 'e.g. Advance Paid Deduction / Bank Credit'}
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Amount (₹) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="e.g. 129950"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none font-mono text-sm`}
                />
              </div>

              <div className={`flex justify-end gap-2 pt-3 border-t ${isDay ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className={`px-4 py-2 ${isDay ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} rounded-xl text-xs font-semibold`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-emerald-600/20"
                >
                  Record Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditTxModal && editTxData && (
        <div className={`fixed inset-0 z-50 ${isDay ? 'bg-slate-900/50' : 'bg-black/70'} backdrop-blur-sm flex items-center justify-center p-4`}>
          <div className={`${isDay ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'} border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl transition-colors`}>
            <h3 className={`text-lg font-bold ${isDay ? 'text-slate-900' : 'text-white'} flex items-center gap-2`}>
              <Edit2 className="w-5 h-5 text-blue-500" />
              Update Transaction Entry
            </h3>
            <form onSubmit={handleEditTxSubmit} className="space-y-3">
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Transaction Date</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Day */}
                  <select
                    required
                    value={editTxData.date ? editTxData.date.split('-')[2] : ''}
                    onChange={(e) => {
                      const parts = (editTxData.date || new Date().toISOString().split('T')[0]).split('-');
                      setEditTxData({ ...editTxData, date: `${parts[0]}-${parts[1]}-${e.target.value}` });
                    }}
                    className={`${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-2 py-2 text-xs focus:border-blue-500 focus:outline-none font-mono`}
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = String(i + 1).padStart(2, '0');
                      return <option key={d} value={d}>{d}</option>;
                    })}
                  </select>

                  {/* Month */}
                  <select
                    required
                    value={editTxData.date ? editTxData.date.split('-')[1] : ''}
                    onChange={(e) => {
                      const parts = (editTxData.date || new Date().toISOString().split('T')[0]).split('-');
                      setEditTxData({ ...editTxData, date: `${parts[0]}-${e.target.value}-${parts[2]}` });
                    }}
                    className={`${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-2 py-2 text-xs focus:border-blue-500 focus:outline-none`}
                  >
                    <option value="">Month</option>
                    {[
                      ['01','Jan'],['02','Feb'],['03','Mar'],['04','Apr'],
                      ['05','May'],['06','Jun'],['07','Jul'],['08','Aug'],
                      ['09','Sep'],['10','Oct'],['11','Nov'],['12','Dec']
                    ].map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>

                  {/* Year */}
                  <select
                    required
                    value={editTxData.date ? editTxData.date.split('-')[0] : ''}
                    onChange={(e) => {
                      const parts = (editTxData.date || new Date().toISOString().split('T')[0]).split('-');
                      setEditTxData({ ...editTxData, date: `${e.target.value}-${parts[1]}-${parts[2]}` });
                    }}
                    className={`${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-2 py-2 text-xs focus:border-blue-500 focus:outline-none font-mono`}
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 10 }, (_, i) => {
                      const yr = String(new Date().getFullYear() - 2 + i);
                      return <option key={yr} value={yr}>{yr}</option>;
                    })}
                  </select>
                </div>
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEditTxData({ ...editTxData, type: 'BILL' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      editTxData.type === 'BILL'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
                        : isDay
                          ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    BILL / DEBIT (+)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTxData({ ...editTxData, type: 'PAYMENT' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      editTxData.type === 'PAYMENT'
                        ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                        : isDay
                          ? 'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200'
                          : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    PAYMENT / CREDIT (-)
                  </button>
                </div>
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Description / Particulars</label>
                <input
                  type="text"
                  placeholder={editTxData.type === 'BILL' ? 'e.g. 2nd & 3rd Bill Amount' : 'e.g. Advance Paid Deduction / Bank Credit'}
                  value={editTxData.description}
                  onChange={(e) => setEditTxData({ ...editTxData, description: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-blue-500 focus:outline-none`}
                />
              </div>

              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>Amount (₹) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="e.g. 129950"
                  value={editTxData.amount}
                  onChange={(e) => setEditTxData({ ...editTxData, amount: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-blue-500 focus:outline-none font-mono text-sm`}
                />
              </div>

              <div className={`flex justify-end gap-2 pt-3 border-t ${isDay ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTxModal(false);
                    setEditTxData(null);
                  }}
                  className={`px-4 py-2 ${isDay ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} rounded-xl text-xs font-semibold`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/20"
                >
                  Update Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Site Expense Modal (Admin Only) */}
      {showAddExpenseModal && isAdmin && (
        <div className={`fixed inset-0 z-50 ${isDay ? 'bg-slate-900/50' : 'bg-black/70'} backdrop-blur-sm flex items-center justify-center p-4`}>
          <div className={`${isDay ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'} border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl transition-colors animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isDay ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-400'}`}>
                  <Lock className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDay ? 'text-slate-900' : 'text-white'}`}>
                    Record Site Expense
                  </h3>
                  <p className={`text-[11px] ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                    Internal cost entry for <span className="font-semibold text-amber-500">{selectedClient?.name}</span>
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-mono font-bold">
                Admin Only
              </span>
            </div>

            <form onSubmit={handleCreateExpenseSubmit} className="space-y-3.5">
              {/* Date */}
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                  Expense Date *
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <select
                    required
                    value={newExpense.date ? newExpense.date.split('-')[2] : ''}
                    onChange={(e) => {
                      const parts = (newExpense.date || new Date().toISOString().split('T')[0]).split('-');
                      setNewExpense({ ...newExpense, date: `${parts[0]}-${parts[1]}-${e.target.value}` });
                    }}
                    className={`${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-2 py-2 text-xs focus:border-amber-500 focus:outline-none font-mono`}
                  >
                    <option value="">Day</option>
                    {Array.from({ length: 31 }, (_, i) => {
                      const d = String(i + 1).padStart(2, '0');
                      return <option key={d} value={d}>{d}</option>;
                    })}
                  </select>

                  <select
                    required
                    value={newExpense.date ? newExpense.date.split('-')[1] : ''}
                    onChange={(e) => {
                      const parts = (newExpense.date || new Date().toISOString().split('T')[0]).split('-');
                      setNewExpense({ ...newExpense, date: `${parts[0]}-${e.target.value}-${parts[2]}` });
                    }}
                    className={`${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-2 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                  >
                    <option value="">Month</option>
                    {[
                      ['01','Jan'],['02','Feb'],['03','Mar'],['04','Apr'],
                      ['05','May'],['06','Jun'],['07','Jul'],['08','Aug'],
                      ['09','Sep'],['10','Oct'],['11','Nov'],['12','Dec']
                    ].map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>

                  <select
                    required
                    value={newExpense.date ? newExpense.date.split('-')[0] : ''}
                    onChange={(e) => {
                      const parts = (newExpense.date || new Date().toISOString().split('T')[0]).split('-');
                      setNewExpense({ ...newExpense, date: `${e.target.value}-${parts[1]}-${parts[2]}` });
                    }}
                    className={`${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-2 py-2 text-xs focus:border-amber-500 focus:outline-none font-mono`}
                  >
                    <option value="">Year</option>
                    {Array.from({ length: 10 }, (_, i) => {
                      const yr = String(new Date().getFullYear() - 2 + i);
                      return <option key={yr} value={yr}>{yr}</option>;
                    })}
                  </select>
                </div>
              </div>

              {/* Category */}
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                  Expense Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const isSelected = newExpense.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewExpense({ ...newExpense, category: cat })}
                        className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold text-left truncate border transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-bold'
                            : isDay
                              ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Particulars / Description */}
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                  Particulars / Description *
                </label>
                <input
                  type="text"
                  required
                  placeholder={
                    newExpense.category === 'Labour Charge' 
                      ? 'e.g. 4 Painters & 2 Helpers (5 Days Stage 1 site work)' 
                      : newExpense.category === 'Material Charge'
                        ? 'e.g. 10 bags Birla white putty & primer'
                        : 'e.g. Scaffolding tempo transport'
                  }
                  value={newExpense.description}
                  onChange={(e) => setNewExpense({ ...newExpense, description: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              {/* Paid To & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                    Paid To / Vendor / Worker
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Suresh Painter / Royal Hardware"
                    value={newExpense.paidTo}
                    onChange={(e) => setNewExpense({ ...newExpense, paidTo: e.target.value })}
                    className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                    Payment Mode
                  </label>
                  <select
                    value={newExpense.paymentMode}
                    onChange={(e) => setNewExpense({ ...newExpense, paymentMode: e.target.value })}
                    className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                  Expense Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-amber-500 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="1"
                    placeholder="e.g. 24000"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                    className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-bold focus:border-amber-500 focus:outline-none`}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className={`flex justify-end gap-2 pt-3 border-t ${isDay ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setShowAddExpenseModal(false)}
                  className={`px-4 py-2 ${isDay ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} rounded-xl text-xs font-semibold`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  Save Site Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Site Expense Modal (Admin Only) */}
      {showEditExpenseModal && editExpenseData && isAdmin && (
        <div className={`fixed inset-0 z-50 ${isDay ? 'bg-slate-900/50' : 'bg-black/70'} backdrop-blur-sm flex items-center justify-center p-4`}>
          <div className={`${isDay ? 'bg-white border-slate-200 text-slate-800' : 'bg-slate-900 border-slate-800 text-white'} border rounded-2xl w-full max-w-lg p-6 space-y-4 shadow-2xl transition-colors animate-in fade-in zoom-in-95 duration-150`}>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800/40">
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded-xl ${isDay ? 'bg-amber-100 text-amber-800' : 'bg-amber-500/20 text-amber-400'}`}>
                  <Edit2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className={`text-base font-bold ${isDay ? 'text-slate-900' : 'text-white'}`}>
                    Edit Site Expense
                  </h3>
                  <p className={`text-[11px] ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                    Update expense entry for <span className="font-semibold text-amber-500">{selectedClient?.name}</span>
                  </p>
                </div>
              </div>
              <span className="text-[10px] bg-amber-500/10 border border-amber-500/20 text-amber-500 px-2 py-0.5 rounded font-mono font-bold">
                Admin Only
              </span>
            </div>

            <form onSubmit={handleEditExpenseSubmit} className="space-y-3.5">
              {/* Date */}
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                  Expense Date *
                </label>
                <input
                  type="date"
                  required
                  value={editExpenseData.date}
                  onChange={(e) => setEditExpenseData({ ...editExpenseData, date: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none font-mono`}
                />
              </div>

              {/* Category */}
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                  Expense Category *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {EXPENSE_CATEGORIES.map((cat) => {
                    const isSelected = editExpenseData.category === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setEditExpenseData({ ...editExpenseData, category: cat })}
                        className={`py-1.5 px-2.5 rounded-xl text-[11px] font-semibold text-left truncate border transition-all ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-bold'
                            : isDay
                              ? 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                              : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {cat}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Particulars / Description */}
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                  Particulars / Description *
                </label>
                <input
                  type="text"
                  required
                  value={editExpenseData.description}
                  onChange={(e) => setEditExpenseData({ ...editExpenseData, description: e.target.value })}
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                />
              </div>

              {/* Paid To & Payment Mode */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                    Paid To / Vendor / Worker
                  </label>
                  <input
                    type="text"
                    value={editExpenseData.paidTo || ''}
                    onChange={(e) => setEditExpenseData({ ...editExpenseData, paidTo: e.target.value })}
                    className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                  />
                </div>

                <div>
                  <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                    Payment Mode
                  </label>
                  <select
                    value={editExpenseData.paymentMode || 'CASH'}
                    onChange={(e) => setEditExpenseData({ ...editExpenseData, paymentMode: e.target.value })}
                    className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200'} border rounded-xl px-3 py-2 text-xs focus:border-amber-500 focus:outline-none`}
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI / GPay / PhonePe</option>
                    <option value="BANK_TRANSFER">Bank Transfer / NEFT</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Amount */}
              <div>
                <label className={`block text-xs ${isDay ? 'text-slate-600' : 'text-slate-400'} mb-1 font-semibold`}>
                  Expense Amount (₹) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-amber-500 font-bold">₹</span>
                  <input
                    type="number"
                    required
                    step="0.01"
                    min="1"
                    value={editExpenseData.amount}
                    onChange={(e) => setEditExpenseData({ ...editExpenseData, amount: e.target.value })}
                    className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-200 placeholder-slate-500'} border rounded-xl pl-7 pr-3 py-2 text-sm font-mono font-bold focus:border-amber-500 focus:outline-none`}
                  />
                </div>
              </div>

              {/* Buttons */}
              <div className={`flex justify-end gap-2 pt-3 border-t ${isDay ? 'border-slate-200' : 'border-slate-800'}`}>
                <button
                  type="button"
                  onClick={() => setShowEditExpenseModal(false)}
                  className={`px-4 py-2 ${isDay ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} rounded-xl text-xs font-semibold`}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold shadow-lg shadow-amber-500/20"
                >
                  Update Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
