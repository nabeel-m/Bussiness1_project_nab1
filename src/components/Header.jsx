import React from 'react';
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
  Moon
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
    </header>
  );
}

