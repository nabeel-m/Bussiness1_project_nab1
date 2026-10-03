import React, { useState, useEffect } from 'react';
import { 
  Briefcase, 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  ArrowRight, 
  ShieldCheck, 
  AlertCircle,
  KeyRound,
  CheckCircle2,
  Sun,
  Moon
} from 'lucide-react';
import { apiClient } from '../utils/apiClient';
import smartTechLogo from '../assets/logo_new.png';

const PRESET_ACCOUNTS = [
  {
    id: 'usr-admin',
    username: 'Ashif',
    name: 'Ashif',
    role: 'ADMIN',
    avatar: '👑',
    defaultPass: 'fabi*123'
  }
];

export default function LoginPage({ onLoginSuccess, theme = 'night', onToggleTheme }) {
  const isDay = theme === 'day';
  const [selectedUser, setSelectedUser] = useState('Ashif');
  const [usernameInput, setUsernameInput] = useState('Ashif');
  const [password, setPassword] = useState('fabi*123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Sync username input when preset is clicked
  const handleSelectPreset = (account) => {
    setSelectedUser(account.username);
    setUsernameInput(account.username);
    setPassword(account.defaultPass);
    setErrorMsg('');
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    setErrorMsg('');

    const targetUser = usernameInput.trim();
    if (!targetUser) {
      setErrorMsg('Please enter a username or select a profile.');
      return;
    }
    if (!password) {
      setErrorMsg('Please enter your account password.');
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.login(targetUser, password);
      if (response && response.success && response.user) {
        if (rememberMe) {
          localStorage.setItem('smarttech_active_user', JSON.stringify(response.user));
        } else {
          sessionStorage.setItem('smarttech_active_user', JSON.stringify(response.user));
        }
        onLoginSuccess(response.user);
      } else {
        setErrorMsg('Invalid credentials. Please verify your password.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`min-h-screen ${isDay ? 'bg-slate-100 text-slate-800' : 'bg-slate-950 text-slate-100'} flex items-center justify-center p-4 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden transition-colors duration-200`}>
      
      {/* Top Right Day/Night Theme Toggle */}
      {onToggleTheme && (
        <div className="absolute top-5 right-5 z-20">
          <button
            type="button"
            onClick={onToggleTheme}
            className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-sm active:scale-95 ${
              isDay
                ? 'bg-white hover:bg-slate-50 text-amber-900 border-slate-200 shadow-slate-200'
                : 'bg-slate-900 hover:bg-slate-800 text-amber-300 border-slate-800 shadow-slate-950/40'
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
        </div>
      )}

      {/* Background ambient lighting */}
      <div className={`absolute top-1/4 -left-32 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none ${isDay ? 'opacity-30' : 'opacity-100'}`} />
      <div className={`absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none ${isDay ? 'opacity-30' : 'opacity-100'}`} />

      <div className="w-full max-w-md z-10">
        
        {/* Main Card */}
        <div className={`${isDay ? 'bg-white border-slate-200 shadow-2xl' : 'bg-slate-900/90 border-slate-800 shadow-2xl backdrop-blur-xl'} border rounded-3xl p-8 relative transition-colors`}>
          
          {/* Brand Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-3">
              <div className={`p-3 rounded-2xl ${isDay ? 'bg-slate-50 border-slate-200' : 'bg-slate-950/70 border-slate-800'} border shadow-xl inline-block transition-colors`}>
                <img 
                  src={smartTechLogo} 
                  alt="SMART TECH Logo" 
                  className="h-20 w-auto max-w-[260px] object-contain mx-auto filter drop-shadow-[0_4px_16px_rgba(245,158,11,0.25)]" 
                />
              </div>
            </div>
            
            <p className="text-xs text-amber-500 font-semibold tracking-wide">
              Interior & Exterior Solutions
            </p>
            <p className={`text-xs ${isDay ? 'text-slate-500' : 'text-slate-400'} mt-0.5`}>
              Billing, Ledger & Quotation Desktop Suite
            </p>
          </div>

          {/* Quick Profile Selection */}
          <div className="mb-6">
            <label className={`block text-[11px] font-bold uppercase tracking-wider ${isDay ? 'text-slate-500' : 'text-slate-400'} mb-2 text-center`}>
              Profile
            </label>
            <div className="flex justify-center">
              {PRESET_ACCOUNTS.map((acc) => {
                const isSelected = selectedUser.toLowerCase() === acc.username.toLowerCase();
                return (
                  <button
                    key={acc.id}
                    type="button"
                    onClick={() => handleSelectPreset(acc)}
                    className={`flex items-center space-x-3 px-4 py-2.5 rounded-2xl border transition-all w-full max-w-[280px] ${
                      isSelected
                        ? isDay
                          ? 'bg-amber-50 border-amber-400 shadow-sm text-slate-900'
                          : 'bg-amber-500/10 border-amber-500/50 shadow-md shadow-amber-500/10 text-white'
                        : isDay
                          ? 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                    }`}
                  >
                    <span className="text-3xl shrink-0">{acc.avatar}</span>
                    <div className="text-left flex-1 min-w-0">
                      <div className={`text-sm font-bold truncate ${isDay ? 'text-slate-900' : 'text-slate-100'}`}>{acc.name}</div>
                      <div className="text-[10px] uppercase font-mono font-bold text-amber-500">
                        {acc.role} • Administrator
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error Banner */}
          {errorMsg && (
            <div className="mb-5 bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs px-3.5 py-2.5 rounded-xl flex items-start space-x-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Username Input */}
            <div>
              <label className={`block text-xs font-semibold ${isDay ? 'text-slate-700' : 'text-slate-300'} mb-1.5`}>
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={usernameInput}
                  onChange={(e) => {
                    setUsernameInput(e.target.value);
                    setSelectedUser(e.target.value.toLowerCase());
                  }}
                  placeholder="e.g. Ashif"
                  required
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'} border rounded-xl pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono`}
                />
              </div>
            </div>

            {/* Password Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`block text-xs font-semibold ${isDay ? 'text-slate-700' : 'text-slate-300'}`}>
                  Password
                </label>
                <span className={`text-[11px] ${isDay ? 'text-slate-500' : 'text-slate-500'}`}>
                  Default: <span className="font-mono text-slate-400">fabi*123</span>
                </span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter password"
                  required
                  className={`w-full ${isDay ? 'bg-slate-50 border-slate-300 text-slate-900 placeholder-slate-400 focus:bg-white' : 'bg-slate-950 border-slate-800 text-slate-100 placeholder-slate-500'} border rounded-xl pl-10 pr-10 py-2.5 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 transition-all font-mono`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Options */}
            <div className="flex items-center justify-between pt-1 text-xs">
              <label className={`flex items-center space-x-2 cursor-pointer select-none ${isDay ? 'text-slate-600 hover:text-slate-800' : 'text-slate-400 hover:text-slate-300'}`}>
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-slate-950 border-slate-800 text-amber-500 focus:ring-0 focus:ring-offset-0"
                />
                <span>Stay signed in on this desktop</span>
              </label>

              <button
                type="button"
                onClick={() => setPassword('fabi*123')}
                className="text-amber-500 hover:text-amber-600 hover:underline flex items-center space-x-1 font-semibold"
              >
                <KeyRound className="w-3 h-3" />
                <span>Master Key</span>
              </button>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:from-amber-600 active:to-amber-700 text-slate-950 font-extrabold py-3 px-4 rounded-xl shadow-lg shadow-amber-500/25 transition-all flex items-center justify-center space-x-2 text-sm disabled:opacity-50 mt-6 active:scale-98"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In to SMART TECH</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer Security Badge */}
          <div className={`mt-8 pt-5 border-t ${isDay ? 'border-slate-200 text-slate-500' : 'border-slate-800/80 text-slate-500'} flex items-center justify-center space-x-2 text-[11px]`}>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Secure Local SQLite Database Session</span>
          </div>

        </div>

      </div>
    </div>
  );
}
