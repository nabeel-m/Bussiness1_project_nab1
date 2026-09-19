import React from 'react';
import { 
  FileText, 
  Users, 
  Printer, 
  Download, 
  Upload, 
  RotateCcw,
  Briefcase,
  LogOut
} from 'lucide-react';

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

  return (
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
              </>
            )}

            {/* Active User Badge & Logout Button */}
            {authUser && (
              <div className="flex items-center space-x-2 pl-2 border-l border-slate-800">
                <div className="flex items-center space-x-2 bg-slate-950 px-2.5 py-1 rounded-xl border border-slate-800">
                  {authUser.avatar && (authUser.avatar.startsWith('http') || authUser.avatar.startsWith('/')) ? (
                    <img
                      src={authUser.avatar}
                      alt={authUser.name}
                      className="w-6 h-6 rounded-full object-cover border border-amber-500/40 shrink-0"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span className="text-sm shrink-0">{authUser.avatar || '👤'}</span>
                  )}
                  
                  <div className="hidden lg:block text-left">
                    <div className="text-xs font-bold text-slate-200 leading-none truncate max-w-[130px]">
                      {authUser.name}
                    </div>
                    <div className="flex items-center space-x-1 mt-0.5">
                      <span className="text-[9px] font-extrabold uppercase text-amber-400 tracking-wider">
                        {authUser.role}
                      </span>
                      {authUser.authProvider === 'GOOGLE' && (
                        <span className="text-[8px] bg-blue-500/20 text-blue-400 px-1 rounded font-semibold font-mono">
                          Google
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={onLogout}
                  className="bg-slate-800 hover:bg-red-950/80 text-slate-300 hover:text-red-400 p-2 rounded-xl border border-slate-700/60 hover:border-red-500/40 transition-all"
                  title="Sign Out / Lock App"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

          </div>

        </div>
      </div>
    </header>
  );
}
