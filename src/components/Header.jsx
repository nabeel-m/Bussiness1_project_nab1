import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Users, 
  Printer, 
  Download, 
  Upload, 
  RotateCcw,
  Briefcase,
  LogOut,
  Sun,
  Moon,
  HardDrive,
  FolderOpen,
  ShieldCheck,
  CheckCircle2,
  Clock,
  X,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import smartTechLogo from '../assets/logo_new.png';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  clients, 
  authUser,
  theme = 'night',
  onToggleTheme,
  onLogout,
  onNewQuotation, 
  onAddClient,
  onPrint,
  onExportData,
  onImportData,
  onResetData
}) {
  const isAdmin = authUser?.role === 'ADMIN';
  const isDay = theme === 'day';
  const isDesktop = typeof window !== 'undefined' && !!window.electronAPI;

  const [showBackupModal, setShowBackupModal] = useState(false);
  const [backupStatus, setBackupStatus] = useState(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [backupMsg, setBackupMsg] = useState(null);

  const fetchBackupStatus = async () => {
    if (window.electronAPI?.getBackupStatus) {
      try {
        const status = await window.electronAPI.getBackupStatus();
        setBackupStatus(status);
      } catch (e) {}
    }
  };

  useEffect(() => {
    if (isDesktop) {
      fetchBackupStatus();
      if (window.electronAPI?.onAutoBackupCompleted) {
        const unsubscribe = window.electronAPI.onAutoBackupCompleted(() => {
          fetchBackupStatus();
        });
        return unsubscribe;
      }
    }
  }, [isDesktop]);

  const handleOpenBackupModal = () => {
    fetchBackupStatus();
    setBackupMsg(null);
    setShowBackupModal(true);
  };

  const handleTriggerBackupNow = async () => {
    if (!window.electronAPI?.triggerAutoBackup) return;
    setIsBackingUp(true);
    setBackupMsg(null);
    try {
      const res = await window.electronAPI.triggerAutoBackup();
      if (res && res.success) {
        setBackupMsg({ 
          type: 'success', 
          text: `Backup saved to Documents\\SMART TECH Backups (${res.jsonFile})` 
        });
        await fetchBackupStatus();
      } else {
        setBackupMsg({ type: 'error', text: res?.error || 'Failed to create backup' });
      }
    } catch (err) {
      setBackupMsg({ type: 'error', text: err.message });
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleOpenBackupFolder = async () => {
    if (window.electronAPI?.openBackupFolder) {
      try {
        await window.electronAPI.openBackupFolder();
      } catch (e) {}
    }
  };

  const formatBackupDate = (dateStr) => {
    if (!dateStr) return 'Never';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString([], { 
        year: 'numeric', 
        month: 'short', 
        day: '2-digit', 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch (e) {
      return String(dateStr);
    }
  };

  return (
    <header className={`${isDay ? 'bg-white/95 border-b border-slate-200 text-slate-800 shadow-sm' : 'bg-slate-900 border-b border-slate-800 text-white'} sticky top-0 z-40 no-print transition-colors duration-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          
          {/* Left Brand info with SMART TECH Logo */}
          <div className="flex items-center space-x-3">
            <div className={`h-11 px-2.5 py-1 ${isDay ? 'bg-slate-50 border-slate-200 shadow-sm' : 'bg-slate-950 border-slate-800 shadow-md'} rounded-xl border flex items-center justify-center transition-colors`}>
              <img 
                src={smartTechLogo} 
                alt="SMART TECH Logo" 
                className="h-9 w-auto max-w-[120px] object-contain" 
              />
            </div>
            <div>
              <div className="flex items-center space-x-1.5">
                <span className={`font-heading font-extrabold text-lg ${isDay ? 'text-slate-900' : 'text-white'} tracking-wider`}>
                  SMART TECH
                </span>
                <span className="text-xs font-bold text-amber-500 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
                  TM
                </span>
              </div>
              <p className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'} font-sans hidden sm:block`}>
                <span className="text-amber-500 font-medium">Interior & Exterior Solutions</span> Billing & Tally Ledger
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className={`flex space-x-1 ${isDay ? 'bg-slate-100 border-slate-200' : 'bg-slate-950/60 border-slate-800'} p-1 rounded-xl border transition-colors`}>
            <button
              onClick={() => setActiveTab('ledger')}
              className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'ledger'
                  ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                  : isDay 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
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
                  : isDay 
                    ? 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/70' 
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Print Quotation / Bill</span>
            </button>
          </nav>

          {/* Right Actions, Day/Night Toggle & User Profile Badge */}
          <div className="flex items-center space-x-2">
            
            {/* Day / Night Mode Switcher Toggle Button */}
            {onToggleTheme && (
              <button
                onClick={onToggleTheme}
                className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm active:scale-95 ${
                  isDay
                    ? 'bg-amber-100/90 hover:bg-amber-200/90 text-amber-900 border-amber-300 shadow-amber-100'
                    : 'bg-slate-800 hover:bg-slate-700 text-amber-300 border-slate-700 shadow-slate-950/40'
                }`}
                title={isDay ? 'Day Mode Active — Click to switch to Night Mode (Dark)' : 'Night Mode Active — Click to switch to Day Mode (Light)'}
              >
                {isDay ? (
                  <>
                    <Sun className="w-4 h-4 text-amber-600 animate-spin-slow" />
                    <span>Day</span>
                  </>
                ) : (
                  <>
                    <Moon className="w-4 h-4 text-amber-400" />
                    <span>Night</span>
                  </>
                )}
              </button>
            )}

            <button
              onClick={onPrint}
              className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium px-3 py-2 rounded-lg flex items-center space-x-1.5 transition-all shadow-md shadow-blue-600/20"
              title="Print Quotation Document"
            >
              <Printer className="w-4 h-4" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Admin Operations */}
            {isAdmin && (
              <>
                {/* Weekly Auto-Backup Status & Manager Button */}
                <button
                  type="button"
                  onClick={handleOpenBackupModal}
                  className={`flex items-center space-x-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all border shadow-sm ${
                    isDay
                      ? 'bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-200'
                      : 'bg-slate-800 hover:bg-slate-700 text-amber-400 border-slate-700'
                  }`}
                  title="Weekly Database Auto-Backup (User's Documents)"
                >
                  <HardDrive className="w-3.5 h-3.5 text-amber-500" />
                  <span className="hidden xl:inline text-[11px] font-bold">Auto-Backup</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" title="Weekly Auto-Backup Active" />
                </button>

                <label className={`cursor-pointer ${isDay ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} text-xs px-2.5 py-2 rounded-lg flex items-center space-x-1 transition-all`} title="Import Backup JSON">
                  <Upload className="w-3.5 h-3.5" />
                  <input type="file" accept=".json" onChange={onImportData} className="hidden" />
                </label>

                <button
                  onClick={onExportData}
                  className={`${isDay ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'} text-xs px-2.5 py-2 rounded-lg flex items-center space-x-1 transition-all`}
                  title="Export Backup JSON"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>

                {onResetData && (
                  <button
                    onClick={onResetData}
                    className={`${isDay ? 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-amber-600 border border-slate-200' : 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-amber-400'} text-xs px-2.5 py-2 rounded-lg flex items-center transition-all`}
                    title="Reset to Clean Demo Data"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}

            {/* Active User Badge with Sign Out button */}
            {authUser && (
              <div className={`flex items-center space-x-2 pl-2 border-l ${isDay ? 'border-slate-200' : 'border-slate-800'}`}>
                <div className={`flex items-center space-x-2 ${isDay ? 'bg-slate-100 border-slate-200' : 'bg-slate-950 border-slate-800'} px-2.5 py-1 rounded-xl border transition-colors`}>
                  <span className="text-sm shrink-0">{authUser.avatar || '👑'}</span>
                  
                  <div className="hidden lg:block text-left">
                    <div className={`text-xs font-bold ${isDay ? 'text-slate-900' : 'text-slate-200'} leading-none truncate max-w-[130px]`}>
                      {authUser.name || 'SMART TECH Admin'}
                    </div>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span className="text-[9px] font-extrabold uppercase text-amber-500 tracking-wider">
                        {authUser.role || 'ADMIN'}
                      </span>
                    </div>
                  </div>
                </div>

                {onLogout && (
                  <button
                    onClick={onLogout}
                    className={`p-1.5 ${isDay ? 'bg-slate-100 hover:bg-rose-50 border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600' : 'bg-slate-950 hover:bg-rose-950/60 border-slate-800 hover:border-rose-500/50 text-slate-400 hover:text-rose-400'} border rounded-xl transition-all`}
                    title="Sign Out / Lock Desktop"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                )}
              </div>
            )}

          </div>

        </div>
      </div>

      {/* ── Database Auto-Backup Manager Modal ── */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className={`w-full max-w-lg rounded-3xl p-6 border shadow-2xl transition-all ${
              isDay ? 'bg-white text-slate-800 border-slate-200' : 'bg-slate-900 text-slate-100 border-slate-800'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold flex items-center space-x-2">
                    <span>Database Auto-Backup Manager</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                      WEEKLY ACTIVE
                    </span>
                  </h3>
                  <p className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'}`}>
                    Automatic weekly scheduled database export to user Documents
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowBackupModal(false)}
                className={`p-1.5 rounded-xl ${isDay ? 'hover:bg-slate-100 text-slate-500' : 'hover:bg-slate-800 text-slate-400'} transition-colors`}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification message banner */}
            {backupMsg && (
              <div className={`mt-4 p-3 rounded-xl text-xs flex items-start space-x-2 border ${
                backupMsg.type === 'success' 
                  ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300'
              }`}>
                {backupMsg.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
                ) : (
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                )}
                <span>{backupMsg.text}</span>
              </div>
            )}

            {/* Details Card */}
            <div className={`mt-4 p-4 rounded-2xl border space-y-3.5 ${
              isDay ? 'bg-slate-50 border-slate-200' : 'bg-slate-950 border-slate-800/80'
            }`}>
              {/* Destination Folder */}
              <div>
                <label className="text-[11px] font-bold text-amber-500 uppercase tracking-wider block mb-1">
                  Backup Storage Location
                </label>
                <div className={`text-xs font-mono p-2.5 rounded-xl border flex items-center justify-between ${
                  isDay ? 'bg-white border-slate-200 text-slate-700' : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}>
                  <span className="truncate pr-2 select-all">
                    {backupStatus?.folderPath || (isDesktop ? 'Documents\\SMART TECH Backups' : 'Browser Local Storage & SQLite')}
                  </span>
                  {isDesktop && (
                    <button
                      type="button"
                      onClick={handleOpenBackupFolder}
                      className="shrink-0 flex items-center space-x-1 text-amber-500 hover:text-amber-400 text-xs font-bold"
                      title="Open in Windows Explorer"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>Open</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Schedule and Status */}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <div className={`p-3 rounded-xl border ${isDay ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
                    <Clock className="w-3.5 h-3.5 text-amber-500" />
                    <span>Auto-Schedule</span>
                  </div>
                  <div className="text-xs font-bold text-emerald-400">
                    Every 7 Days (Weekly)
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    Background automated export
                  </div>
                </div>

                <div className={`p-3 rounded-xl border ${isDay ? 'bg-white border-slate-200' : 'bg-slate-900 border-slate-800'}`}>
                  <div className="flex items-center space-x-1.5 text-xs text-slate-400 mb-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-blue-400" />
                    <span>Last Backed Up</span>
                  </div>
                  <div className="text-xs font-bold truncate">
                    {formatBackupDate(backupStatus?.lastBackupDate)}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">
                    {backupStatus?.lastJsonFile || 'Scheduled on app start'}
                  </div>
                </div>
              </div>

              {/* Files Protected */}
              <div className="pt-1">
                <div className="text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">Files exported per backup:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-[11px] text-slate-500">
                    <li><span className="font-mono text-slate-400">smarttech_backup_*.json</span> (Full JSON ledger & quotations snapshot)</li>
                    <li><span className="font-mono text-slate-400">smarttech_database_*.sqlite</span> (Complete binary SQLite database clone)</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Actions Footer */}
            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-200 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                {isDesktop && (
                  <button
                    type="button"
                    onClick={handleOpenBackupFolder}
                    className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                      isDay 
                        ? 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300' 
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                    }`}
                  >
                    <FolderOpen className="w-4 h-4 text-amber-500" />
                    <span>Open Documents Folder</span>
                  </button>
                )}
              </div>

              <div className="flex items-center space-x-2">
                {isDesktop && (
                  <button
                    type="button"
                    onClick={handleTriggerBackupNow}
                    disabled={isBackingUp}
                    className="flex items-center space-x-1.5 px-4 py-2 rounded-xl text-xs font-extrabold bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 shadow-md shadow-amber-500/20 transition-all disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isBackingUp ? 'animate-spin' : ''}`} />
                    <span>{isBackingUp ? 'Backing Up...' : 'Backup Now'}</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setShowBackupModal(false)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                    isDay ? 'bg-slate-200 hover:bg-slate-300 text-slate-800' : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                  }`}
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}
    </header>
  );
}

