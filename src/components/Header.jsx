import React, { useState } from 'react';
import { 
  FileText, 
  Users, 
  Printer, 
  Download, 
  Upload, 
  RotateCcw,
  Briefcase,
  LogOut,
  KeyRound,
  X,
  CheckCircle2,
  Lock
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  clients, 
  authUser,
  onLogout,
  onNewQuotation, 
  onAddClient,
  onPrint,
  onExportData,
  onImportData,
  onResetData
}) {
  const isAdmin = authUser?.role === 'ADMIN';

  // Change System Password Modal State
  const [showPassModal, setShowPassModal] = useState(false);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdatePassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPass.trim()) {
      setErrorMsg('Please enter a new system password');
      return;
    }

    if (newPass !== confirmPass) {
      setErrorMsg('New passwords do not match');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiClient.changeMemberPassword(authUser?.username || 'admin1', currentPass.trim(), newPass.trim());
      setSuccessMsg(`Password for ${authUser?.name || authUser?.username} updated successfully!`);
      setTimeout(() => {
        setShowPassModal(false);
        setCurrentPass('');
        setNewPass('');
        setConfirmPass('');
        setSuccessMsg('');
      }, 900);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update system password');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            
            {/* Left Brand info */}
            <div className="flex items-center space-x-3">
              <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-2 rounded-xl text-slate-950 font-black shadow-lg shadow-amber-500/20 flex items-center justify-center">
                <Briefcase className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="font-heading font-extrabold text-lg text-white tracking-wider">
                    SMART TECH
                  </span>
                  <span className="text-xs font-bold text-amber-400 px-1.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/20">
                    TM
                  </span>
                </div>
                <p className="text-xs text-slate-400 font-sans hidden sm:block">
                  <span className="text-amber-400 font-medium">Interior & Exterior Solutions</span> Billing & Tally Ledger
                </p>
              </div>
            </div>

            {/* Navigation Tabs */}
            <nav className="flex space-x-1 bg-slate-950/60 p-1 rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveTab('ledger')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'ledger'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Users className="w-4 h-4" />
                <span className="hidden md:inline">Client Accounts (Tally)</span>
                <span className="md:hidden">Clients</span>
              </button>

              <button
                onClick={() => setActiveTab('print')}
                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                  activeTab === 'print'
                    ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <FileText className="w-4 h-4" />
                <span>Print Quotation / Bill</span>
              </button>
            </nav>

            {/* Right Actions & User Profile Badge */}
            <div className="flex items-center space-x-2">
              <button
                onClick={onPrint}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-md shadow-blue-600/20"
                title="Print Quotation Document"
              >
                <Printer className="w-4 h-4" />
                <span className="hidden sm:inline">Print</span>
              </button>

              {/* Admin Only Operations */}
              {isAdmin && (
                <>
                  <label className="cursor-pointer bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-2 rounded-lg flex items-center space-x-1 transition-all" title="Import Backup JSON">
                    <Upload className="w-3.5 h-3.5" />
                    <input type="file" accept=".json" onChange={onImportData} className="hidden" />
                  </label>

                  <button
                    onClick={onExportData}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs px-2.5 py-2 rounded-lg flex items-center space-x-1 transition-all"
                    title="Export Backup JSON"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>

                  {onResetData && (
                    <button
                      onClick={onResetData}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400 text-xs px-2.5 py-2 rounded-lg flex items-center transition-all"
                      title="Reset to Clean Demo Data"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  )}

                  {/* Change System Password Button */}
                  <button
                    onClick={() => {
                      setErrorMsg('');
                      setSuccessMsg('');
                      setShowPassModal(true);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-amber-400 text-xs px-2.5 py-2 rounded-lg flex items-center space-x-1 transition-all"
                    title="Change System Password"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                  </button>
                </>
              )}

              {/* Active User Badge & Logout Button */}
              {authUser && (
                <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                  <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                    <span className="text-sm shrink-0">{authUser.avatar || '👑'}</span>
                    
                    <div className="hidden lg:block text-left">
                      <div className="text-xs font-bold text-slate-200 leading-none truncate max-w-[130px]">
                        {authUser.name || 'SMART TECH Admin'}
                      </div>
                      <div className="flex items-center space-x-1 mt-0.5">
                        <span className="text-[9px] font-extrabold uppercase text-amber-400 tracking-wider">
                          {authUser.role || 'ADMIN'}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={onLogout}
                    className="bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-400 p-2 rounded-xl border border-slate-700/60 hover:border-red-500/40 transition-all"
                    title="Lock App / Sign Out"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>

          </div>
        </div>
      </header>

      {/* Change Password Modal from Header */}
      {showPassModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 no-print">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-md w-full shadow-2xl space-y-4 animate-scale-up">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <KeyRound className="w-4 h-4" />
                <span>Change System Password</span>
              </div>
              <button
                onClick={() => setShowPassModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {errorMsg && (
              <div className="bg-red-950/60 border border-red-500/30 text-red-300 text-xs px-3.5 py-2 rounded-xl flex items-center space-x-2">
                <Lock className="w-4 h-4 text-red-400 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs px-3.5 py-2 rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}

            <form onSubmit={handleUpdatePassword} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Current Password</label>
                <input
                  type="password"
                  value={currentPass}
                  onChange={(e) => setCurrentPass(e.target.value)}
                  placeholder="Enter current password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">New Password</label>
                <input
                  type="password"
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="Enter new system password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPass}
                  onChange={(e) => setConfirmPass(e.target.value)}
                  placeholder="Confirm new system password"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowPassModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPass.trim()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Save Password'}
                </button>
              </div>
            </form>

          </div>
        </div>
      )}
    </>
  );
}
