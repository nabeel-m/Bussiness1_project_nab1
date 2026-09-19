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
  Briefcase
} from 'lucide-react';
import { formatIndianCurrency, formatDateIndian, calculateClientLedger } from '../utils/formatters';

export default function ClientLedger({
  clients,
  transactions,
  quotations,
  authUser,
  onSelectClientForQuotation,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
  onAddTransaction,
  onDeleteTransaction
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || null);
  const [showAddClientModal, setShowAddClientModal] = useState(false);
  const [showEditClientModal, setShowEditClientModal] = useState(false);
  const [showAddTxModal, setShowAddTxModal] = useState(false);

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

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Top Banner & Stats */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Wallet className="w-5 h-5 text-amber-400" />
            Tally-Style Client Accounts Ledger
          </h1>
          <p className="text-xs text-slate-400 mt-1">
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Total Client Accounts</span>
          <div className="text-2xl font-bold text-white mt-1">{clients.length} Sites Active</div>
        </div>

        <div 
          onClick={() => onSelectClientForQuotation({ id: 'ALL_SITES' })}
          className="bg-slate-900 border border-slate-800 hover:border-amber-500/40 p-4 rounded-2xl cursor-pointer transition-all group"
          title="Click to view Master All-Sites Statement"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400 font-medium group-hover:text-amber-400 transition-colors">Total Balance Receivable</span>
            <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-md font-bold">All Sites</span>
          </div>
          <div className="text-2xl font-bold text-amber-400 font-mono mt-1">
            {formatIndianCurrency(totalBalanceDueAllClients, true)}
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl">
          <span className="text-xs text-slate-400 font-medium">Active Account Selected</span>
          <div className="text-sm font-bold text-slate-200 mt-1 truncate">
            {selectedClient?.name || 'None'}
          </div>
        </div>
      </div>

      {/* Main Grid: Client List (Left 4 cols) & Selected Client Detail Ledger (Right 8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Sidebar: Client Accounts Search & List */}
        <div className="lg:col-span-4 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-4">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-500" />
            <input
              type="text"
              placeholder="Search clients or site locations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              const { netBalance } = calculateClientLedger(client, transactions);

              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClientId(client.id)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-800 border-amber-500/50 shadow-lg shadow-amber-500/5'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-850 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className={`text-sm font-bold ${isSelected ? 'text-amber-400' : 'text-slate-200'}`}>
                        {client.name}
                      </h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-amber-500 shrink-0" />
                        <span className="truncate">{client.siteLocation || client.address || 'Palakkad'}</span>
                      </p>
                    </div>
                    {isSelected && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0 mt-1" />
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/60 text-xs">
                    <span className="text-slate-500">Balance Due:</span>
                    <span className="font-mono font-bold text-slate-200">
                      {formatIndianCurrency(netBalance, true)}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className="text-center py-8 text-xs text-slate-500">
                No matching client accounts found.
              </div>
            )}
          </div>
        </div>

        {/* Right Detail Pane: Tally Account Statement Table & Actions */}
        {selectedClient ? (
          <div className="lg:col-span-8 space-y-6">
            
            {/* Selected Client Card Header */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                <div>
                  <div className="flex items-center space-x-2">
                    <h2 className="text-xl font-bold text-white font-heading">
                      {selectedClient.name}
                    </h2>
                    <span className="text-xs bg-amber-500/10 border border-amber-500/20 text-amber-400 font-semibold px-2 py-0.5 rounded-full">
                      Active Account
                    </span>
                    {canEdit && (
                      <button
                        onClick={openEditClientModal}
                        className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors"
                        title="Edit Client Info / Opening Balance"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2">
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
                  <div className="bg-slate-950 px-4 py-2 rounded-xl border border-amber-500/30 text-right">
                    <span className="text-[10px] uppercase text-slate-400 font-semibold tracking-wider">Current Balance Due</span>
                    <div className="text-lg font-mono font-bold text-amber-400">
                      {formatIndianCurrency(currentClientNetBalance, true)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
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
                        className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-md shadow-emerald-600/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        Record Payment / Bill
                      </button>
                    )}
                    <button
                      onClick={() => onSelectClientForQuotation(selectedClient)}
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all shadow-md shadow-amber-500/20"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Create Quotation
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Ledger Transactions Table */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-amber-400" />
                    Chronological Statement & Running Ledger
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Automatically ordered chronologically by Date (oldest to newest)
                  </p>
                </div>
                <span className="text-xs text-slate-400">
                  {processedTxs.length} Transactions
                </span>
              </div>

              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-950 text-slate-400 text-xs uppercase font-semibold">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Particulars / Description</th>
                      <th className="px-4 py-3">Type</th>
                      <th className="px-4 py-3 text-right">Debit (+)</th>
                      <th className="px-4 py-3 text-right">Credit (-)</th>
                      <th className="px-4 py-3 text-right">Balance</th>
                      {isAdmin && <th className="px-2 py-3 text-center w-10">Action</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-slate-300">
                    {/* Opening Balance Row */}
                    <tr className="bg-slate-950/60 text-xs">
                      <td className="px-4 py-2.5 font-mono text-slate-400">
                        {formatDateIndian(selectedClient.createdAt || '2026-06-01')}
                      </td>
                      <td className="px-4 py-2.5 font-semibold text-slate-200">
                        Opening Balance Brought Forward
                      </td>
                      <td className="px-4 py-2.5 text-slate-400 font-bold text-[10px]">OPENING</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">-</td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-400">-</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-amber-300">
                        {formatIndianCurrency(selectedClient.openingBalance)}
                      </td>
                      {isAdmin && <td className="px-2 py-2.5 text-center text-slate-600">-</td>}
                    </tr>

                    {processedTxs.map((tx) => {
                      const isDebit = tx.type === 'BILL' || tx.type === 'DEBIT';
                      return (
                        <tr key={tx.id} className="hover:bg-slate-850/50 transition-colors text-xs">
                          <td className="px-4 py-3 font-mono text-slate-400">{formatDateIndian(tx.date)}</td>
                          <td className="px-4 py-3 font-medium text-slate-200">{tx.description}</td>
                          <td className="px-4 py-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              isDebit 
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {tx.type}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-amber-400 font-medium">
                            {isDebit ? formatIndianCurrency(tx.amount) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono text-emerald-400 font-medium">
                            {!isDebit ? formatIndianCurrency(tx.amount) : '-'}
                          </td>
                          <td className="px-4 py-3 text-right font-mono font-bold text-slate-100">
                            {formatIndianCurrency(tx.currentRunningBalance)}
                          </td>
                          {isAdmin && (
                            <td className="px-2 py-3 text-center">
                              <button
                                onClick={() => onDeleteTransaction(tx.id)}
                                className="p-1 text-slate-500 hover:text-red-400 hover:bg-red-950/40 rounded transition-colors"
                                title="Delete Transaction"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {processedTxs.length === 0 && (
                      <tr>
                        <td colSpan={isAdmin ? 7 : 6} className="text-center py-6 text-xs text-slate-500">
                          No transactions recorded yet for this client account.
                        </td>
                      </tr>
                    )}
                  </tbody>
                  <tfoot className="bg-slate-950 font-bold text-xs text-slate-200">
                    <tr>
                      <td colSpan="5" className="px-4 py-3 text-right">
                        FINAL BALANCE DUE:
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-sm text-amber-400 font-extrabold">
                        {formatIndianCurrency(currentClientNetBalance, true)}
                      </td>
                      {isAdmin && <td></td>}
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Danger Zone: Delete Client (Admin Only) */}
            {isAdmin && (
              <div className="flex justify-end pt-2">
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete client "${selectedClient.name}" and all associated data?`)) {
                      onDeleteClient(selectedClient.id);
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-300 hover:bg-red-950/40 px-3 py-1.5 rounded-lg flex items-center gap-1 transition-all border border-red-500/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Client Account
                </button>
              </div>
            )}

          </div>
        ) : (
          <div className="lg:col-span-8 bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center text-slate-400">
            Select a client account from the left list to view statement ledger.
          </div>
        )}
      </div>

      {/* Add Client Modal */}
      {showAddClientModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-amber-400" />
              Add New Client Account
            </h3>
            <form onSubmit={handleCreateClientSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Client Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kallekad Block Site Project"
                  value={newClient.name}
                  onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Phone Number</label>
                <input
                  type="text"
                  placeholder="+91 9995984554"
                  value={newClient.phone}
                  onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Site Location</label>
                <input
                  type="text"
                  placeholder="e.g. Kallekad Block Site"
                  value={newClient.siteLocation}
                  onChange={(e) => setNewClient({ ...newClient, siteLocation: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Full Address</label>
                <input
                  type="text"
                  placeholder="e.g. Palakkad, Kerala"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Opening Balance (₹)</label>
                <input
                  type="number"
                  placeholder="e.g. 1258382"
                  value={newClient.openingBalance}
                  onChange={(e) => setNewClient({ ...newClient, openingBalance: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddClientModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Edit2 className="w-5 h-5 text-amber-400" />
              Edit Client Account Info
            </h3>
            <form onSubmit={handleEditClientSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Client Name *</label>
                <input
                  type="text"
                  required
                  value={editClientData.name}
                  onChange={(e) => setEditClientData({ ...editClientData, name: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Phone Number</label>
                <input
                  type="text"
                  value={editClientData.phone}
                  onChange={(e) => setEditClientData({ ...editClientData, phone: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Site Location</label>
                <input
                  type="text"
                  value={editClientData.siteLocation}
                  onChange={(e) => setEditClientData({ ...editClientData, siteLocation: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Full Address</label>
                <input
                  type="text"
                  value={editClientData.address}
                  onChange={(e) => setEditClientData({ ...editClientData, address: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Opening Balance (₹)</label>
                <input
                  type="number"
                  value={editClientData.openingBalance}
                  onChange={(e) => setEditClientData({ ...editClientData, openingBalance: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditClientModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
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
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-emerald-400" />
              Record Transaction for {selectedClient?.name}
            </h3>
            <form onSubmit={handleCreateTxSubmit} className="space-y-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Transaction Date</label>
                <div className="grid grid-cols-3 gap-2">
                  {/* Day */}
                  <select
                    required
                    value={newTx.date ? newTx.date.split('-')[2] : ''}
                    onChange={(e) => {
                      const parts = (newTx.date || new Date().toISOString().split('T')[0]).split('-');
                      setNewTx({ ...newTx, date: `${parts[0]}-${parts[1]}-${e.target.value}` });
                    }}
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none font-mono"
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
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
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
                    className="bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none font-mono"
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
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Transaction Type</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setNewTx({ ...newTx, type: 'BILL' })}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all ${
                      newTx.type === 'BILL'
                        ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-md shadow-amber-500/20'
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
                        : 'bg-slate-950 text-slate-400 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    PAYMENT / CREDIT (-)
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Description / Particulars</label>
                <input
                  type="text"
                  placeholder={newTx.type === 'BILL' ? 'e.g. 2nd & 3rd Bill Amount' : 'e.g. Advance Paid Deduction / Bank Credit'}
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-semibold">Amount (₹) *</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  placeholder="e.g. 129950"
                  value={newTx.amount}
                  onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:border-amber-500 focus:outline-none font-mono text-sm"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddTxModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
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

    </div>
  );
}
