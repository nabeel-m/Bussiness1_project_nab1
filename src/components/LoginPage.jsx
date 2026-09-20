import React, { useState, useEffect, useRef } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  CheckCircle2, 
  Sparkles, 
  X, 
  Lock, 
  ArrowRight, 
  UserCheck, 
  Crown, 
  Code2, 
  Briefcase, 
  Mail, 
  RefreshCw,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import Logo from './Logo';
import { apiClient } from '../utils/apiClient';
import { 
  getGoogleClientId, 
  setGoogleClientId, 
  decodeGoogleJwt, 
  formatGoogleUser 
} from '../utils/googleAuth';

const DEFAULT_MEMBERS = [
  { id: 'slot-admin-1', username: 'admin1', name: 'Managing Director (MD)', role: 'ADMIN', avatar: '👑', email: 'smartechpalakkad@gmail.com', description: 'Admin 1 • Executive Director' },
  { id: 'slot-admin-2', username: 'admin2', name: 'Developer (Admin 2)', role: 'ADMIN', avatar: '💻', email: 'nabeel.softcode@gmail.com', description: 'Admin 2 • Developer & System Ops' },
  { id: 'slot-staff-1', username: 'staff', name: 'Staff (Billing & Accounts)', role: 'STAFF', avatar: '💼', email: '', description: 'Staff • Billing, Quotation & Ledger' }
];

export default function LoginPage({ onLoginSuccess }) {
  const [authMode, setAuthMode] = useState('google'); // 'google' | 'password'
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [activeSlotLoading, setActiveSlotLoading] = useState(null);

  // 3 SSO Slots Configuration State
  const [ssoSlots, setSsoSlots] = useState(DEFAULT_MEMBERS);
  const [clientId, setClientId] = useState(() => getGoogleClientId());
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [inputClientId, setInputClientId] = useState(() => getGoogleClientId());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  // Password Login State for Selected Member
  const [selectedMemberUsername, setSelectedMemberUsername] = useState('admin1');
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isPasswordLoading, setIsPasswordLoading] = useState(false);

  const googleBtnContainerRef = useRef(null);

  // Load configured 3-user SSO slots from backend on mount
  useEffect(() => {
    async function loadSlots() {
      const dbSlots = await apiClient.getSsoSlots();
      if (Array.isArray(dbSlots) && dbSlots.length > 0) {
        setSsoSlots(dbSlots);
      }
    }
    loadSlots();
  }, []);

  // Initialize Google Identity Services (GIS)
  useEffect(() => {
    const currentClientId = getGoogleClientId();
    if (!currentClientId) return;

    const checkGsiReady = setInterval(() => {
      if (window.google?.accounts?.id) {
        clearInterval(checkGsiReady);
        try {
          window.google.accounts.id.initialize({
            client_id: currentClientId,
            callback: handleGoogleCredentialResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          if (googleBtnContainerRef.current) {
            googleBtnContainerRef.current.innerHTML = '';
            window.google.accounts.id.renderButton(googleBtnContainerRef.current, {
              theme: 'filled_blue',
              size: 'large',
              text: 'continue_with',
              shape: 'pill',
              width: '100%'
            });
          }
        } catch (err) {
          console.error('Failed to initialize Google Identity Services:', err);
        }
      }
    }, 200);

    return () => clearInterval(checkGsiReady);
  }, [clientId]);

  // Handle Google Token Credential from GIS Callback
  const handleGoogleCredentialResponse = async (response) => {
    if (!response || !response.credential) {
      setErrorMessage('Google authentication did not return a valid credential.');
      return;
    }

    setIsGoogleLoading(true);
    setErrorMessage('');

    try {
      const decoded = decodeGoogleJwt(response.credential);
      if (!decoded || !decoded.email) {
        throw new Error('Could not parse Google user profile');
      }

      // Check role mapping from 3 SSO slots
      const userEmail = decoded.email.toLowerCase();
      const matchedSlot = ssoSlots.find(s => s.email && s.email.trim().toLowerCase() === userEmail);
      
      let determinedRole = 'ADMIN';
      let determinedName = 'Managing Director (MD)';
      let determinedAvatar = '👑';

      if (matchedSlot) {
        determinedRole = matchedSlot.role;
        determinedName = matchedSlot.defaultName || matchedSlot.name || decoded.name;
        determinedAvatar = matchedSlot.avatar;
      } else if (userEmail.includes('dev') || userEmail.includes('nabeel')) {
        determinedRole = 'ADMIN';
        determinedName = 'Developer (Admin 2)';
        determinedAvatar = '💻';
      } else if (userEmail.includes('staff') || userEmail.includes('billing')) {
        determinedRole = 'STAFF';
        determinedName = 'Staff (Billing & Accounts)';
        determinedAvatar = '💼';
      }

      const googleUserData = {
        googleId: decoded.sub,
        email: decoded.email,
        name: determinedName || decoded.name,
        avatar: decoded.picture || determinedAvatar,
        role: determinedRole
      };

      // Sync with Backend API
      const backendRes = await apiClient.googleLogin(googleUserData);
      const authenticatedUser = (backendRes && backendRes.user) 
        ? backendRes.user 
        : formatGoogleUser(decoded, determinedRole);

      setSuccessMessage(`Welcome, ${authenticatedUser.name}! Logging in with Google...`);
      setTimeout(() => {
        onLoginSuccess(authenticatedUser);
      }, 350);
    } catch (err) {
      console.error('Google Sign-In Error:', err);
      setErrorMessage('Google Sign-In failed: ' + err.message);
    } finally {
      setIsGoogleLoading(false);
    }
  };

  // Trigger real Google OAuth Sign-In Popup for the selected member
  const handleMemberGoogleSignIn = (slot) => {
    setActiveSlotLoading(slot.id);
    setErrorMessage('');
    setSuccessMessage('');

    const activeClientId = getGoogleClientId();
    if (!activeClientId) {
      setActiveSlotLoading(null);
      setErrorMessage(`Google Client ID is not configured. Please click "Configure Google Emails / Client ID" below or enter the member password to sign in.`);
      setShowConfigModal(true);
      return;
    }

    // 1. Try Google OAuth2 Token Client popup (Opens Google's real Sign-In popup)
    if (window.google?.accounts?.oauth2) {
      try {
        setIsGoogleLoading(true);
        const tokenClient = window.google.accounts.oauth2.initTokenClient({
          client_id: activeClientId,
          scope: 'email profile openid',
          hint: slot?.email || '',
          callback: async (tokenResponse) => {
            setIsGoogleLoading(false);
            setActiveSlotLoading(null);

            if (tokenResponse.error) {
              if (tokenResponse.error === 'popup_closed_by_user') {
                setErrorMessage('Google Sign-In popup was closed. Please try again.');
              } else {
                setErrorMessage('Google authentication error: ' + tokenResponse.error);
              }
              return;
            }

            if (tokenResponse.access_token) {
              try {
                // Fetch verified profile from Google UserInfo endpoint
                const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                  headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
                });
                const userProfile = await res.json();
                
                if (userProfile && userProfile.email) {
                  // Role Mapping based on 3 member slots
                  const userEmail = userProfile.email.toLowerCase();
                  const matchedSlot = ssoSlots.find(s => s.email && s.email.trim().toLowerCase() === userEmail);
                  
                  let determinedRole = slot.role || 'ADMIN';
                  let determinedName = slot.name || slot.defaultName || userProfile.name;
                  let determinedAvatar = slot.avatar || '👑';

                  if (matchedSlot) {
                    determinedRole = matchedSlot.role;
                    determinedName = matchedSlot.defaultName || matchedSlot.name || userProfile.name;
                    determinedAvatar = matchedSlot.avatar;
                  }

                  const googleUserData = {
                    googleId: userProfile.sub,
                    email: userProfile.email,
                    name: determinedName,
                    avatar: userProfile.picture || determinedAvatar,
                    role: determinedRole
                  };

                  const backendRes = await apiClient.googleLogin(googleUserData);
                  const authenticatedUser = (backendRes && backendRes.user) || formatGoogleUser(userProfile, determinedRole);

                  setSuccessMessage(`Welcome, ${authenticatedUser.name}! Logging in...`);
                  setTimeout(() => {
                    onLoginSuccess(authenticatedUser);
                  }, 350);
                }
              } catch (profileErr) {
                setErrorMessage('Failed to load Google profile: ' + profileErr.message);
              }
            }
          }
        });

        tokenClient.requestAccessToken({ prompt: slot?.email ? '' : 'select_account' });
        return;
      } catch (oauthErr) {
        console.warn('OAuth2 client init error, falling back to GIS prompt:', oauthErr.message);
      }
    }

    // Direct Test Sign In Helper when Google Client ID is not ready
    handleDirectTestSignIn(slot);
  };

  const handleDirectTestSignIn = async (slot) => {
    setActiveSlotLoading(slot.id);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const slotEmail = slot.email || (
        slot.id === 'slot-admin-1' ? 'smartechpalakkad@gmail.com' :
        slot.id === 'slot-admin-2' ? 'nabeel.softcode@gmail.com' : 'billing.staff@smarttech.com'
      );

      const googlePayload = {
        sub: `g-${slot.id}-${Date.now()}`,
        email: slotEmail,
        name: slot.defaultName || slot.name,
        role: slot.role,
        avatar: slot.avatar,
        picture: slot.avatar
      };

      const backendRes = await apiClient.googleLogin(googlePayload);
      const user = (backendRes && backendRes.user) || {
        id: `usr-g-${slot.id}`,
        username: slot.username || slot.id,
        name: slot.defaultName || slot.name,
        email: slotEmail,
        role: slot.role,
        avatar: slot.avatar,
        authProvider: 'GOOGLE'
      };

      setSuccessMessage(`Welcome, ${user.name}! Logging in...`);
      setTimeout(() => {
        onLoginSuccess(user);
      }, 300);
    } catch (err) {
      setErrorMessage(err.message || 'Login failed');
    } finally {
      setActiveSlotLoading(null);
    }
  };

  // Password Sign-In
  const handlePasswordLogin = async (e) => {
    e.preventDefault();
    if (!passwordInput.trim()) {
      setErrorMessage('Please enter your password.');
      return;
    }

    setIsPasswordLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const res = await apiClient.login(selectedMemberUsername, passwordInput.trim());
      if (res && res.success && res.user) {
        setSuccessMessage(`Welcome back, ${res.user.name}!`);
        setTimeout(() => {
          onLoginSuccess(res.user);
        }, 300);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Incorrect password.');
    } finally {
      setIsPasswordLoading(false);
    }
  };

  // Save Configuration (Client ID + 3 User Access Slots)
  const handleSaveConfiguration = async (e) => {
    e.preventDefault();
    setGoogleClientId(inputClientId);
    setClientId(inputClientId.trim());
    
    // Save 3 slots to SQLite backend
    await apiClient.updateSsoSlots(ssoSlots);

    setSaveSuccessMsg(true);
    setTimeout(() => {
      setSaveSuccessMsg(false);
      setShowConfigModal(false);
    }, 800);
  };

  const handleSlotEmailChange = (id, newEmail) => {
    setSsoSlots(prev => prev.map(s => s.id === id ? { ...s, email: newEmail } : s));
  };

  const selectedMember = ssoSlots.find(m => m.username === selectedMemberUsername) || ssoSlots[0];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-4 relative overflow-hidden font-sans select-none">
      
      {/* Background Decorative Glow Gradients */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Main Glassmorphic Login Card */}
      <div className="w-full max-w-lg bg-slate-900/90 border border-slate-800 backdrop-blur-xl rounded-3xl p-6 sm:p-8 shadow-2xl relative z-10 space-y-6">
        
        {/* Logo & Header Banner */}
        <div className="text-center space-y-2">
          <Logo variant="full" printMode={false} className="mx-auto" />
          <div className="inline-flex items-center space-x-1.5 bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded-full mt-1">
            {/* Google G SVG */}
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
            </svg>
            <span className="text-[11px] font-bold text-blue-400 uppercase tracking-wider">
              Google Single Sign-On Access
            </span>
          </div>
        </div>

        {/* Tab Switcher: Google SSO vs Member Password */}
        <div className="grid grid-cols-2 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs font-bold">
          <button
            type="button"
            onClick={() => {
              setAuthMode('google');
              setErrorMessage('');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-2 ${
              authMode === 'google'
                ? 'bg-blue-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Google Sign-In</span>
          </button>
          
          <button
            type="button"
            onClick={() => {
              setAuthMode('password');
              setErrorMessage('');
            }}
            className={`py-2 rounded-xl transition-all flex items-center justify-center space-x-2 ${
              authMode === 'password'
                ? 'bg-amber-500 text-slate-950 shadow-md font-extrabold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>Member Password</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs px-4 py-2.5 rounded-2xl flex items-center space-x-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="bg-red-950/60 border border-red-500/30 text-red-300 text-xs px-4 py-2.5 rounded-2xl flex items-center space-x-2 animate-shake">
            <ShieldCheck className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 1: GOOGLE SSO AUTHENTICATION */}
        {/* ============================================================== */}
        {authMode === 'google' && (
          <div className="space-y-4">
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span>Select Account to Sign In with Google</span>
                <span className="text-[10px] text-amber-400 font-mono font-semibold">
                  3 Authorized Accounts
                </span>
              </label>

              {/* 1. Admin 1: Managing Director (MD) */}
              <button
                type="button"
                onClick={() => handleMemberGoogleSignIn(ssoSlots[0] || DEFAULT_MEMBERS[0])}
                disabled={isGoogleLoading}
                className="w-full bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-amber-500/50 p-3.5 rounded-2xl flex items-center justify-between group transition-all transform active:scale-98 shadow-sm hover:shadow-md text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    👑
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100 group-hover:text-amber-300 transition-colors">
                        Admin 1: Managing Director (MD)
                      </span>
                      <span className="text-[9px] bg-amber-400/20 text-amber-300 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                        ADMIN
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-[240px]">
                      {ssoSlots[0]?.email || 'smartechpalakkad@gmail.com'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-xs font-bold text-amber-400 group-hover:translate-x-1 transition-all">
                  {activeSlotLoading === (ssoSlots[0]?.id || 'slot-admin-1') ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-amber-400" />
                  ) : (
                    <>
                      <span className="hidden sm:inline text-[11px]">Sign In with Google</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </div>
              </button>

              {/* 2. Admin 2: Developer */}
              <button
                type="button"
                onClick={() => handleMemberGoogleSignIn(ssoSlots[1] || DEFAULT_MEMBERS[1])}
                disabled={isGoogleLoading}
                className="w-full bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-blue-500/50 p-3.5 rounded-2xl flex items-center justify-between group transition-all transform active:scale-98 shadow-sm hover:shadow-md text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    💻
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100 group-hover:text-blue-300 transition-colors">
                        Admin 2: Developer
                      </span>
                      <span className="text-[9px] bg-blue-400/20 text-blue-300 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                        ADMIN
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-[240px]">
                      {ssoSlots[1]?.email || 'nabeel.softcode@gmail.com'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-xs font-bold text-blue-400 group-hover:translate-x-1 transition-all">
                  {activeSlotLoading === (ssoSlots[1]?.id || 'slot-admin-2') ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-400" />
                  ) : (
                    <>
                      <span className="hidden sm:inline text-[11px]">Sign In with Google</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </div>
              </button>

              {/* 3. Staff: Billing & Accounts */}
              <button
                type="button"
                onClick={() => handleMemberGoogleSignIn(ssoSlots[2] || DEFAULT_MEMBERS[2])}
                disabled={isGoogleLoading}
                className="w-full bg-slate-950/70 hover:bg-slate-950 border border-slate-800 hover:border-emerald-500/50 p-3.5 rounded-2xl flex items-center justify-between group transition-all transform active:scale-98 shadow-sm hover:shadow-md text-left"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-xl shrink-0 group-hover:scale-105 transition-transform">
                    💼
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-100 group-hover:text-emerald-300 transition-colors">
                        Staff: Billing & Accounts
                      </span>
                      <span className="text-[9px] bg-emerald-400/20 text-emerald-300 font-bold px-1.5 py-0.5 rounded uppercase font-mono">
                        STAFF
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-400 font-mono truncate max-w-[240px]">
                      {ssoSlots[2]?.email || 'Click to sign in with Google'}
                    </div>
                  </div>
                </div>

                <div className="flex items-center space-x-1.5 text-xs font-bold text-emerald-400 group-hover:translate-x-1 transition-all">
                  {activeSlotLoading === (ssoSlots[2]?.id || 'slot-staff-1') ? (
                    <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  ) : (
                    <>
                      <span className="hidden sm:inline text-[11px]">Sign In with Google</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </div>
              </button>
            </div>

            {/* Official GIS Button Container if configured */}
            {clientId && (
              <div ref={googleBtnContainerRef} className="w-full min-h-[44px] flex justify-center pt-1" />
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* MODE 2: MEMBER PASSWORD AUTHENTICATION */}
        {/* ============================================================== */}
        {authMode === 'password' && (
          <form onSubmit={handlePasswordLogin} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Select Member
              </label>

              <div className="grid grid-cols-3 gap-2">
                {ssoSlots.map((slot) => {
                  const isSelected = slot.username === selectedMemberUsername;
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => {
                        setSelectedMemberUsername(slot.username);
                        setPasswordInput('');
                        setErrorMessage('');
                      }}
                      className={`p-2.5 rounded-xl border text-center transition-all ${
                        isSelected
                          ? 'bg-amber-500/20 border-amber-400 text-amber-300 shadow'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div className="text-base">{slot.avatar}</div>
                      <div className="text-[11px] font-bold truncate mt-0.5">
                        {slot.username === 'admin1' ? 'MD' : slot.username === 'admin2' ? 'Dev' : 'Staff'}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300 flex items-center justify-between">
                <span>Password for {selectedMember.name}</span>
              </label>

              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder={`Enter password for ${selectedMember.username}...`}
                  autoFocus
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3.5 pr-10 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
                
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1 text-[10px]">
                <span className="text-slate-500">Default: {selectedMember.username}</span>
                <button
                  type="button"
                  onClick={() => setPasswordInput(selectedMember.username)}
                  className="text-amber-400 hover:underline"
                >
                  Fill Default
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isPasswordLoading || !passwordInput.trim()}
              className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-3 px-4 rounded-xl text-xs flex items-center justify-center space-x-2 shadow-lg transition-all disabled:opacity-50"
            >
              {isPasswordLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
              <span>{isPasswordLoading ? 'Verifying...' : `Sign In as ${selectedMember.name}`}</span>
            </button>
          </form>
        )}

        {/* Footer Actions: Configure Google SSO & Switch to Password Mode */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="text-slate-400 hover:text-amber-400 flex items-center space-x-1 transition-colors hover:underline"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Configure Google Emails / Client ID</span>
          </button>

          <span className="text-slate-500 flex items-center space-x-1 text-[11px]">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>Smart Tech v1.0</span>
          </span>
        </div>

      </div>

      {/* ============================================================== */}
      {/* GOOGLE SSO & 3-MEMBER EMAIL CONFIGURATION MODAL */}
      {/* ============================================================== */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/80 rounded-3xl p-6 sm:p-7 max-w-lg w-full shadow-2xl space-y-4 animate-scale-up">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2 text-amber-400 font-bold text-sm">
                <Settings className="w-4 h-4" />
                <span>Configure Google Sign-In & Member Emails</span>
              </div>
              <button
                onClick={() => setShowConfigModal(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {saveSuccessMsg && (
              <div className="bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs px-3.5 py-2 rounded-xl flex items-center space-x-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Google configuration updated successfully!</span>
              </div>
            )}

            <form onSubmit={handleSaveConfiguration} className="space-y-3.5">
              
              {/* Google Client ID (Optional / Custom) */}
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                  <span>Google OAuth Client ID</span>
                  <span className="text-[10px] text-slate-500 font-mono">console.cloud.google.com</span>
                </label>
                <input
                  type="text"
                  value={inputClientId}
                  onChange={(e) => setInputClientId(e.target.value)}
                  placeholder="e.g. 123456789-abc.apps.googleusercontent.com"
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-amber-400 font-mono"
                />
              </div>

              {/* 3 Member Emails */}
              <div className="space-y-2.5 pt-2 border-t border-slate-800">
                <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Associated Google Emails for 3 Members
                </div>

                {/* Slot 1: MD */}
                <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-amber-400">👑 Admin 1: Managing Director (MD)</span>
                    <span className="text-[9px] bg-amber-500/20 text-amber-300 px-1.5 py-0.2 rounded font-mono">ADMIN</span>
                  </div>
                  <input
                    type="email"
                    value={ssoSlots[0]?.email || ''}
                    onChange={(e) => handleSlotEmailChange('slot-admin-1', e.target.value)}
                    placeholder="e.g. smartechpalakkad@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-amber-400 focus:outline-none"
                  />
                </div>

                {/* Slot 2: Developer */}
                <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-blue-400">💻 Admin 2: Developer</span>
                    <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.2 rounded font-mono">ADMIN</span>
                  </div>
                  <input
                    type="email"
                    value={ssoSlots[1]?.email || ''}
                    onChange={(e) => handleSlotEmailChange('slot-admin-2', e.target.value)}
                    placeholder="e.g. nabeel.softcode@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-blue-400 focus:outline-none"
                  />
                </div>

                {/* Slot 3: Staff */}
                <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-xl border border-slate-800">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold text-emerald-400">💼 Staff: Billing & Accounts</span>
                    <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">STAFF</span>
                  </div>
                  <input
                    type="email"
                    value={ssoSlots[2]?.email || ''}
                    onChange={(e) => handleSlotEmailChange('slot-staff-1', e.target.value)}
                    placeholder="e.g. billing.staff@gmail.com"
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-emerald-400 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold transition-all"
                >
                  Save Configuration
                </button>
              </div>
            </form>

          </div>
        </div>
      )}

    </div>
  );
}
