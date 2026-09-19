import React, { useState } from 'react';
import { 
  Plus, 
  Trash2, 
  ArrowUp, 
  ArrowDown, 
  Calculator, 
  FileCheck, 
  Printer, 
  Circle, 
  Square, 
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { formatIndianCurrency, generateRefNo, generateQuotationItemsFromLedger } from '../utils/formatters';

export default function QuotationEditor({
  quotation,
  clients,
  transactions = [],
  onSaveQuotation,
  onPreviewPrint
}) {
  const [formData, setFormData] = useState(quotation);

  const handleClientChange = (clientId) => {
    const selected = clients.find(c => c.id === clientId);
    if (selected) {
      setFormData(prev => ({
        ...prev,
        clientId: selected.id,
        clientName: selected.name,
        clientAddress: `${selected.siteLocation || ''}, ${selected.address || ''}`.trim()
      }));
    }
  };

  const handleSyncLedger = () => {
    const selected = clients.find(c => c.id === formData.clientId);
    if (!selected) return;
    const generatedItems = generateQuotationItemsFromLedger(selected, transactions);
    setFormData(prev => ({
      ...prev,
      items: generatedItems
    }));
  };


  const handleItemChange = (index, field, value) => {
    const updatedItems = [...formData.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: field === 'amount' ? (value === '' ? null : Number(value)) : value
    };
    setFormData(prev => ({ ...prev, items: updatedItems }));
  };

  const addItemRow = (preset = null) => {
    const newItem = preset || {
      id: `item-${Date.now()}`,
      slIcon: 'empty',
      particulars: '',
      amount: 0
    };
    setFormData(prev => ({ ...prev, items: [...prev.items, newItem] }));
  };

  const removeItemRow = (index) => {
    setFormData(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const moveRow = (index, direction) => {
    const newItems = [...formData.items];
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= newItems.length) return;
    const temp = newItems[index];
    newItems[index] = newItems[targetIndex];
    newItems[targetIndex] = temp;
    setFormData(prev => ({ ...prev, items: newItems }));
  };

  // Quick Preset Adders
  const addPresetBillBalance = () => {
    addItemRow({
      id: `item-${Date.now()}`,
      slIcon: 'bullet',
      particulars: 'Kallekad block site bill balance amount : ',
      amount: 100000
    });
  };

  const addPresetBorrowedMoney = () => {
    addItemRow({
      id: `item-${Date.now()}`,
      slIcon: 'empty',
      particulars: 'Borrowed money : 100,000',
      amount: 100000
    });
  };

  const addPresetGrandTotalMath = () => {
    // calculate sum of previous amounts
    const validSum = formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
    addItemRow({
      id: `item-${Date.now()}`,
      slIcon: 'empty',
      particulars: `Total amount : ${validSum.toLocaleString('en-IN')}/-\n_________________`,
      amount: validSum
    });
  };

  const handleSaveAndPrint = () => {
    onSaveQuotation(formData);
    onPreviewPrint();
  };

  // Calculate sum of amount fields
  const totalCalculatedAmount = formData.items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
      
      {/* Top Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 border border-slate-800 p-5 rounded-2xl">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <Calculator className="w-5 h-5 text-amber-400" />
            Quotation & Bill Editor
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Build custom quotations with site bill particulars, balance deductions & Indian currency formatting
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => onSaveQuotation(formData)}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold px-4 py-2.5 rounded-xl border border-slate-700 transition-all"
          >
            Save Quotation
          </button>
          <button
            onClick={handleSaveAndPrint}
            className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold px-4 py-2.5 rounded-xl flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
          >
            <Printer className="w-4 h-4" />
            Save & Print Preview
          </button>
        </div>
      </div>

      {/* Main Form Fields */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 space-y-6">
        
        {/* Header Metadata Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pb-6 border-b border-slate-800">
          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Select Client Account</label>
            <select
              value={formData.clientId}
              onChange={(e) => handleClientChange(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 mt-1.5 focus:outline-none focus:border-amber-500"
            >
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name} ({c.siteLocation})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reference Number (Ref No)</label>
            <div className="flex items-center space-x-2 mt-1.5">
              <input
                type="text"
                value={formData.refNo}
                onChange={(e) => setFormData({ ...formData, refNo: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm font-mono text-amber-400 font-bold focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={() => setFormData({ ...formData, refNo: generateRefNo(Math.floor(Math.random() * 90) + 10) })}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl"
                title="Regenerate Ref No"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Quotation Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 mt-1.5 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>

        {/* Particulars & Amount Table Editor */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              Quotation Particulars & Amount Entries
            </h3>

            {/* Helper Preset Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncLedger}
                className="text-[11px] bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-3 py-1 rounded-lg shadow-md transition-colors flex items-center gap-1"
                title="Populate particulars automatically from client's latest ledger transactions"
              >
                <RefreshCw className="w-3 h-3" />
                ⚡ Auto-Sync from Client Ledger
              </button>
              <button
                type="button"
                onClick={addPresetBillBalance}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-colors"
              >
                + Bill Balance Row
              </button>
              <button
                type="button"
                onClick={addPresetBorrowedMoney}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-colors"
              >
                + Borrowed Money Row
              </button>
              <button
                type="button"
                onClick={addPresetGrandTotalMath}
                className="text-[11px] bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/20 px-2.5 py-1 rounded-lg transition-colors"
              >
                + Auto Sum Row
              </button>
            </div>

          </div>

          <div className="space-y-3">
            {formData.items.map((item, index) => (
              <div 
                key={item.id || index}
                className="flex items-start gap-2 bg-slate-950 border border-slate-800 p-3 rounded-xl hover:border-slate-700 transition-all"
              >
                {/* Reorder Buttons & Icon Select */}
                <div className="flex flex-col items-center space-y-1 pt-1">
                  <select
                    value={item.slIcon}
                    onChange={(e) => handleItemChange(index, 'slIcon', e.target.value)}
                    className="bg-slate-900 border border-slate-800 text-[10px] text-slate-300 rounded px-1 py-0.5"
                    title="Select SL Bullet Icon"
                  >
                    <option value="bullet">● Dot</option>
                    <option value="square">■ Square</option>
                    <option value="empty">None</option>
                  </select>

                  <div className="flex items-center space-x-0.5">
                    <button
                      type="button"
                      onClick={() => moveRow(index, -1)}
                      disabled={index === 0}
                      className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveRow(index, 1)}
                      disabled={index === formData.items.length - 1}
                      className="p-1 text-slate-500 hover:text-slate-200 disabled:opacity-30"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Particulars Text Input */}
                <div className="flex-1">
                  <textarea
                    rows="2"
                    placeholder="Enter description, e.g. Kallekad block site second bill balance amount : 129,950/-"
                    value={item.particulars}
                    onChange={(e) => handleItemChange(index, 'particulars', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Amount Input */}
                <div className="w-36">
                  <input
                    type="number"
                    step="0.01"
                    placeholder="129950.00"
                    value={item.amount === null ? '' : item.amount}
                    onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs font-mono text-amber-300 font-bold text-right focus:outline-none focus:border-amber-500"
                  />
                  <div className="text-[10px] text-right text-slate-500 mt-1 font-mono">
                    {item.amount !== null ? formatIndianCurrency(item.amount) : 'No Amt'}
                  </div>
                </div>

                {/* Delete Row Button */}
                <button
                  type="button"
                  onClick={() => removeItemRow(index)}
                  className="p-2 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900 transition-colors pt-2"
                  title="Remove Row"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => addItemRow()}
            className="w-full py-2.5 bg-slate-950 border border-dashed border-slate-800 hover:border-amber-500/50 text-slate-400 hover:text-amber-400 text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Custom Particulars Row
          </button>
        </div>

        {/* Total Summary Footer */}
        <div className="flex justify-between items-center bg-slate-950 p-4 rounded-xl border border-slate-800">
          <span className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Entry Sum</span>
          <span className="text-lg font-mono font-extrabold text-amber-400">
            {formatIndianCurrency(totalCalculatedAmount, true)}
          </span>
        </div>

      </div>
    </div>
  );
}
