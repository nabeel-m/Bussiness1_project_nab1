import React, { useState } from 'react';
import { Lock, User, Key, ShieldCheck, Eye, EyeOff, CheckCircle2, ArrowRight } from 'lucide-react';
import Logo from './Logo';
import { INITIAL_USERS } from '../types/initialData';

export default function LoginPage({ onLoginSuccess }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    setTimeout(() => {
      const foundUser = INITIAL_USERS.find(
        u => u.username.toLowerCase() === username.trim().toLowerCase() && u.password === password
      );

      if (foundUser) {
        onLoginSuccess(foundUser);
      } else {
        setErrorMessage('Invalid username or password. Please try demo accounts below.');
        setIsLoading(false);
      }
    }, 400);
  };

  const handleQuickLogin = (demoUser) => {
    setUsername(demoUser.username);
    setPassword(demoUser.password);
    setErrorMessage('');
    onLoginSuccess(demoUser);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Background Decorative Glow Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-md bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Logo Banner */}
        <div className="text-center space-y-2">
          <Logo variant="full" printMode={false} className="mx-auto" />
          <p className="text-xs text-slate-400 font-medium tracking-wide uppercase mt-1">
            Billing & Client Tally System Login
          </p>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-red-950/60 border border-red-500/30 text-red-300 text-xs px-4 py-3 rounded-2xl flex items-center space-x-2 animate-shake">
            <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Login Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Username / Account ID
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username (e.g. admin)"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-4 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
              Password
            </label>
            <div className="relative">
              <Key className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-500" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-10 pr-10 py-2.5 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Submit Sign-In Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3 rounded-xl text-sm flex items-center justify-center space-x-2 shadow-lg shadow-amber-500/20 transition-all transform active:scale-98 disabled:opacity-50"
          >
            <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Dashboard'}</span>
            {!isLoading && <ArrowRight className="w-4 h-4" />}
          </button>
        </form>

        {/* Quick Demo Sign-In Selector */}
        <div className="pt-4 border-t border-slate-800/80 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="font-semibold uppercase tracking-wider">Quick Demo Login</span>
            <span className="text-[10px] text-amber-400 font-mono">1-Click Test</span>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {INITIAL_USERS.map((usr) => (
              <button
                key={usr.id}
                type="button"
                onClick={() => handleQuickLogin(usr)}
                className="w-full bg-slate-950/80 hover:bg-slate-800 border border-slate-800 hover:border-amber-500/50 p-2.5 rounded-xl flex items-center justify-between text-left transition-all group"
              >
                <div className="flex items-center space-x-2.5">
                  <span className="text-lg">{usr.avatar}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-200 group-hover:text-amber-400">
                      {usr.name}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      User: {usr.username} | Pass: {usr.password}
                    </div>
                  </div>
                </div>

                <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                  usr.role === 'ADMIN'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : usr.role === 'STAFF'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-blue-500/10 text-blue-400 border border-blue-500/30'
                }`}>
                  {usr.role}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Security Signoff Footer */}
        <div className="text-center text-[10px] text-slate-500 font-medium">
          Protected by Role-Based Access Control • SMART TECH ™
        </div>

      </div>
    </div>
  );
}
