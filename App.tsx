
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BillingRecord, Room, AdminConfig, PartnerAccess } from './types';
import { storage } from './services/storageService';
import { getBillingInsight } from './services/geminiService';
import { biometricService } from './services/biometricService';
import Calculator from './components/Calculator';
import AdminPanel from './components/AdminPanel';
import HistoryList from './components/HistoryList';
import { 
  Zap, ShieldCheck, Home, ArrowLeft, Search, 
  Lock, Unlock, AlertCircle, User, Mail, ShieldAlert,
  Users, Smartphone, ExternalLink, RefreshCw, Key, ShieldEllipsis, Fingerprint,
  RotateCcw, Link, CloudUpload
} from 'lucide-react';

const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return Math.random().toString(36).substring(2, 15);
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'admin'>('rooms');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);
  
  // Auth States
  const [isLocked, setIsLocked] = useState(true);
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'viewer'>('viewer');
  const [view, setView] = useState<'login' | 'recovery' | 'otp' | 'init' | 'reset'>('login');
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [otpResendTimer, setOtpResendTimer] = useState(0);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [appConfig, setAppConfig] = useState<AdminConfig>(() => {
    const saved = localStorage.getItem('voltcalc_v5_config');
    return saved ? JSON.parse(saved) : { 
      appName: 'VOLTCALC PRO', 
      themeColor: 'indigo', 
      currencySymbol: 'RS',
      userId: '',
      pin: '',
      recoveryEmail: '',
      masterKey: (Math.floor(100000 + Math.random() * 900000)).toString(),
      isVaultInitialized: false,
      partners: [],
      googleSheetUrl: ''
    };
  });

  useEffect(() => {
    if (!storage.isVaultInitialized()) setView('init');
    biometricService.checkAvailability().then(setBiometricsAvailable);
  }, []);

  useEffect(() => {
    let interval: number;
    if (otpResendTimer > 0) {
      interval = window.setInterval(() => {
        setOtpResendTimer((prev) => prev - 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpResendTimer]);

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    localStorage.setItem('voltcalc_v5_config', JSON.stringify(appConfig));
  }, [appConfig]);

  const syncToGoogleSheets = async (config: AdminConfig) => {
    if (!config.googleSheetUrl) return;
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        appName: config.appName,
        ownerId: config.userId,
        recoveryEmail: config.recoveryEmail,
        pin: config.pin,
        action: 'vault_initialized'
      };
      await fetch(config.googleSheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Credentials synced to Google Sheets');
    } catch (e) {
      console.error('Initial sync failed', e);
    }
  };

  const handleUnlock = async (id: string, pin: string) => {
    setVaultError('');
    try {
      let accessKey = "";
      const isPrimary = id.toLowerCase().trim() === appConfig.userId.toLowerCase().trim();
      const partner = appConfig.partners.find(p => p.id.toLowerCase() === id.toLowerCase().trim() && p.pin === pin);

      if (isPrimary && pin === appConfig.pin) {
        accessKey = `${id.toLowerCase().trim()}_${pin}`;
        setCurrentUserRole('owner');
      } else if (partner) {
        accessKey = `${appConfig.userId.toLowerCase().trim()}_${appConfig.pin}`;
        setCurrentUserRole(partner.role);
      } else {
        throw new Error("Invalid credentials");
      }

      const data = await storage.loadVault(accessKey);
      if (data) {
        setRooms(data.rooms || []);
        setRecords(data.records || []);
        setIsLocked(false);
        showToast(`Welcome, ${id}`, "success");
      }
    } catch (err) {
      setVaultError('Access Denied. Check ID and PIN.');
    }
  };

  const handleBiometricUnlock = async () => {
    const success = await biometricService.authenticate();
    if (success && appConfig.isVaultInitialized) {
      handleUnlock(appConfig.userId, appConfig.pin);
    } else {
      showToast("Biometric verification failed", "error");
    }
  };

  const handleRecovery = () => {
    if (loginId.toLowerCase().trim() === appConfig.userId.toLowerCase().trim()) {
      setView('otp');
      setOtpResendTimer(30);
      showToast("Security code sent to " + appConfig.recoveryEmail);
    } else {
      setVaultError("ID not recognized for recovery.");
    }
  };

  const handleResendOtp = () => {
    if (otpResendTimer === 0) {
      setOtpResendTimer(60);
      showToast("Security code resent to " + appConfig.recoveryEmail);
    }
  };

  const handleVerifyOtp = () => {
    if (otpCode === appConfig.masterKey) {
      setView('reset');
      setVaultError('');
      showToast("Identity Verified. Proceed to reset PIN.");
    } else {
      setVaultError("Invalid Security Code.");
    }
  };

  const handleVerifyAndResetPin = async () => {
    if (newPin.length !== 4) return setVaultError('PIN must be 4 digits.');
    if (newPin !== confirmPin) return setVaultError('PINs do not match.');

    try {
      const oldKey = `${appConfig.userId.toLowerCase().trim()}_${appConfig.pin}`;
      const newKey = `${appConfig.userId.toLowerCase().trim()}_${newPin}`;
      
      const data = await storage.loadVault(oldKey);
      if (data) {
        await storage.saveVault(newKey, data.rooms, data.records);
      } else {
        await storage.saveVault(newKey, [], []);
      }

      const updatedConfig = { ...appConfig, pin: newPin };
      setAppConfig(updatedConfig);
      await syncToGoogleSheets(updatedConfig);
      
      setView('login');
      setLoginPin('');
      setNewPin('');
      setConfirmPin('');
      showToast("PIN Reset & Backed Up.", "success");
    } catch (err) {
      setVaultError("Critical: Failed to re-encrypt vault.");
    }
  };

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPin.length !== 4) return setVaultError('PIN must be 4 digits.');
    const encryptionKey = `${loginId.toLowerCase().trim()}_${loginPin}`;
    await storage.saveVault(encryptionKey, [], []);
    
    const newConfig = { 
      ...appConfig, 
      userId: loginId, 
      pin: loginPin, 
      isVaultInitialized: true 
    };
    
    setAppConfig(newConfig);
    await syncToGoogleSheets(newConfig);
    
    setIsLocked(false);
    setCurrentUserRole('owner');
    showToast("Global Vault Secured & Cloud Backed", "success");
    
    if (biometricsAvailable) {
      biometricService.register(loginId);
    }
  };

  const handleSaveRecord = async (newRecord: Omit<BillingRecord, 'id' | 'date' | 'aiInsight'>) => {
    if (currentUserRole === 'viewer') {
      showToast("Permission Denied: Viewers cannot save records", "error");
      return;
    }
    const key = `${appConfig.userId.toLowerCase().trim()}_${appConfig.pin}`;
    const fullRecord: BillingRecord = {
      ...newRecord,
      id: generateUUID(),
      date: new Date().toISOString(),
      aiInsight: 'Generating efficiency plan...',
      status: (newRecord.status || 'pending') as 'paid' | 'pending'
    };

    setRecords(prev => {
      const updatedRecords: BillingRecord[] = [fullRecord, ...prev];
      setRooms(prevRooms => {
        const updatedRooms = prevRooms.map(r => r.id === fullRecord.roomId ? { ...r, lastReading: fullRecord.currentUnit } : r);
        storage.saveVault(key, updatedRooms, updatedRecords);
        return updatedRooms;
      });
      
      getBillingInsight(fullRecord.totalUnits, 'Residential', fullRecord.totalAmount).then(insight => {
        setRecords(latest => {
          const fixed: BillingRecord[] = latest.map(r => r.id === fullRecord.id ? { ...r, aiInsight: insight } : r);
          setRooms(curRooms => {
             storage.saveVault(key, curRooms, fixed);
             return curRooms;
          });
          return fixed;
        });
      });
      
      return updatedRecords;
    });
    
    showToast("Bill recorded.");
  };

  const handleToggleRecordStatus = async (id: string) => {
    if (currentUserRole === 'viewer') {
      showToast("Permission Denied", "error");
      return;
    }
    const key = `${appConfig.userId.toLowerCase().trim()}_${appConfig.pin}`;
    setRecords(prev => {
      const updated: BillingRecord[] = prev.map(r => 
        r.id === id ? { ...r, status: (r.status === 'paid' ? 'pending' : 'paid') as 'paid' | 'pending' } : r
      );
      storage.saveVault(key, rooms, updated);
      return updated;
    });
    showToast("Payment status updated.");
  };

  const handleBulkMarkAsPaid = async (ids: string[]) => {
    if (currentUserRole === 'viewer' || ids.length === 0) return;
    const key = `${appConfig.userId.toLowerCase().trim()}_${appConfig.pin}`;
    setRecords(prev => {
      const updated = prev.map(r => 
        ids.includes(r.id) ? { ...r, status: 'paid' as const } : r
      );
      storage.saveVault(key, rooms, updated);
      return updated;
    });
    showToast(`${ids.length} records marked as Paid`, "success");
  };

  const handleDeleteRecord = async (id: string) => {
    if (currentUserRole === 'viewer') {
      showToast("Permission Denied", "error");
      return;
    }
    const key = `${appConfig.userId.toLowerCase().trim()}_${appConfig.pin}`;
    setRecords(prev => {
      const updated = prev.filter(r => r.id !== id);
      storage.saveVault(key, rooms, updated);
      return updated;
    });
    showToast("Record removed");
  };

  const themeClasses = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-400', border: 'border-indigo-500/20' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-400', border: 'border-rose-500/20' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    amber: { bg: 'bg-amber-600', text: 'text-amber-400', border: 'border-amber-500/20' },
    violet: { bg: 'bg-violet-600', text: 'text-violet-400', border: 'border-violet-500/20' },
    cyan: { bg: 'bg-cyan-600', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  };

  const currentTheme = themeClasses[appConfig.themeColor || 'indigo'];

  return (
    <div className={`min-h-screen text-slate-200 flex flex-col bg-slate-950`}>
      {toast && (
        <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top">
          <div className={`glass px-6 py-4 rounded-2xl shadow-2xl border ${toast.type === 'success' ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'}`}>
            <span className="font-black uppercase tracking-widest text-[10px]">{toast.message}</span>
          </div>
        </div>
      )}

      {isLocked ? (
        <div className="min-h-screen flex items-center justify-center p-6 relative">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
          
          <div className="glass max-w-md w-full p-10 md:p-14 rounded-[4rem] border border-white/10 shadow-2xl relative z-10 text-center overflow-hidden">
            {view === 'login' && (
              <div className="animate-in fade-in slide-in-from-bottom duration-500">
                <div className={`w-20 h-20 ${currentTheme.bg} rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl`}>
                  <ShieldCheck className="w-10 h-10 text-white" />
                </div>
                <h2 className="text-4xl font-black text-white mb-2 italic">System Access</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px] mb-10">VAULT SECURITY PROTOCOL</p>
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); handleUnlock(loginId, loginPin); }}>
                  <input type="text" placeholder="Access ID" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full pl-6 pr-6 py-5 bg-slate-900/50 border border-white/5 rounded-3xl text-white font-black" />
                  <input type="password" maxLength={4} placeholder="PIN" value={loginPin} onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))} className="w-full pl-6 pr-6 py-5 bg-slate-900/50 border border-white/5 rounded-3xl text-white font-black text-center text-2xl tracking-[1em]" />
                  {vaultError && <p className="text-red-500 text-[10px] font-black uppercase">{vaultError}</p>}
                  <div className="flex gap-2">
                    <button type="submit" className="flex-grow py-6 bg-white text-slate-950 font-black rounded-3xl active:scale-95 transition-all">Authorize Access</button>
                    {biometricsAvailable && (
                      <button type="button" onClick={handleBiometricUnlock} title="Quick Biometric Unlock" className={`p-6 ${currentTheme.bg} text-white rounded-3xl active:scale-95 transition-all shadow-lg`}>
                        <Fingerprint className="w-6 h-6" />
                      </button>
                    )}
                  </div>
                  <button type="button" onClick={() => setView('recovery')} className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-4 hover:text-white transition-colors">Forgot Owner ID / PIN?</button>
                </form>
              </div>
            )}

            {view === 'recovery' && (
              <div className="animate-in fade-in slide-in-from-right duration-300">
                <ShieldAlert className="w-16 h-16 text-amber-500 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-white mb-4">Identity Recovery</h2>
                <p className="text-slate-500 text-sm mb-8 leading-relaxed">Enter your primary Access ID to begin recovery.</p>
                <input type="text" placeholder="Access ID" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full px-6 py-5 bg-slate-900/50 border border-white/5 rounded-3xl text-white font-black mb-4" />
                {vaultError && <p className="text-red-500 text-[10px] font-black uppercase mb-4">{vaultError}</p>}
                <button onClick={handleRecovery} className="w-full py-5 bg-amber-600 text-white font-black rounded-3xl mb-4 shadow-lg active:scale-95 transition-all">Request Security OTP</button>
                <button onClick={() => setView('login')} className="text-slate-500 text-[10px] font-bold uppercase tracking-widest">Return to Vault</button>
              </div>
            )}

            {view === 'otp' && (
              <div className="animate-in fade-in zoom-in duration-300">
                <ShieldEllipsis className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-white mb-4">Verification Code</h2>
                <p className="text-slate-500 text-sm mb-2">Check your email for the Security Key.</p>
                <div className="bg-slate-950/50 border border-white/5 rounded-[2rem] p-6 mb-8">
                   <p className="text-slate-600 text-[8px] font-black uppercase tracking-widest mb-2 italic">SIMULATED OTP CHANNEL</p>
                   <p className="text-indigo-400 font-mono text-2xl tracking-[0.4em] font-black">{appConfig.masterKey}</p>
                </div>
                
                <input type="text" maxLength={6} placeholder="000000" value={otpCode} onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))} className="w-full px-6 py-5 bg-slate-900/50 border border-white/5 rounded-3xl text-white font-black text-center text-3xl tracking-[0.2em] mb-4 outline-none focus:border-indigo-500/50" />
                
                {vaultError && <p className="text-red-500 text-[10px] font-black uppercase mb-4">{vaultError}</p>}
                
                <button onClick={handleVerifyOtp} className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-xl active:scale-95 transition-all mb-4">Verify Identity</button>
                
                <div className="flex flex-col items-center gap-2">
                  <button 
                    disabled={otpResendTimer > 0}
                    onClick={handleResendOtp}
                    className={`flex items-center gap-2 text-[10px] font-black uppercase tracking-widest transition-all ${otpResendTimer > 0 ? 'text-slate-700 cursor-not-allowed' : 'text-slate-400 hover:text-white'}`}
                  >
                    <RotateCcw className={`w-3 h-3 ${otpResendTimer > 0 ? 'animate-spin-slow' : ''}`} />
                    {otpResendTimer > 0 ? `Resend code in ${otpResendTimer}s` : 'Resend Security Code'}
                  </button>
                  <button onClick={() => setView('login')} className="text-slate-600 text-[9px] font-bold uppercase tracking-[0.2em] mt-2">Abort Recovery</button>
                </div>
              </div>
            )}

            {view === 'reset' && (
              <div className="animate-in fade-in slide-in-from-top duration-500">
                <Fingerprint className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
                <h2 className="text-2xl font-black text-white mb-2">New Security PIN</h2>
                <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mb-10">UPDATING VAULT ENCRYPTION</p>
                <div className="space-y-4">
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">New 4-Digit PIN</p>
                    <input type="password" maxLength={4} value={newPin} onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ''))} className="w-full px-6 py-5 bg-slate-900/50 border border-white/5 rounded-3xl text-white font-black text-center text-2xl tracking-[1em] outline-none focus:border-emerald-500/50" />
                  </div>
                  <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Confirm PIN</p>
                    <input type="password" maxLength={4} value={confirmPin} onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ''))} className="w-full px-6 py-5 bg-slate-900/50 border border-white/5 rounded-3xl text-white font-black text-center text-2xl tracking-[1em] outline-none focus:border-emerald-500/50" />
                  </div>
                  {vaultError && <p className="text-red-500 text-[10px] font-black uppercase">{vaultError}</p>}
                  <button onClick={handleVerifyAndResetPin} className="w-full py-6 bg-emerald-600 text-white font-black rounded-3xl shadow-2xl active:scale-95 transition-all mt-6">Confirm & Re-encrypt</button>
                </div>
              </div>
            )}

            {view === 'init' && (
              <form className="space-y-4" onSubmit={handleInitialize}>
                <Zap className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
                <h2 className="text-3xl font-black text-white mb-6">Initialize Vault</h2>
                <div className="space-y-3">
                  <input required type="text" placeholder="Owner ID (e.g. Admin)" value={loginId} onChange={(e) => setLoginId(e.target.value)} className="w-full px-6 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white font-bold" />
                  <input required type="email" placeholder="Recovery Email" value={appConfig.recoveryEmail} onChange={(e) => setAppConfig({...appConfig, recoveryEmail: e.target.value})} className="w-full px-6 py-4 bg-slate-900/50 border border-white/5 rounded-2xl text-white font-bold" />
                  <input required type="password" maxLength={4} placeholder="Set 4-Digit PIN" value={loginPin} onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, ''))} className="w-full px-6 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white font-bold text-center text-xl tracking-[0.5em]" />
                  
                  <div className="pt-4 border-t border-white/5">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                       <CloudUpload className="w-3 h-3" /> Auto Backup to Google Sheet (Optional)
                    </p>
                    <input 
                      type="url" 
                      placeholder="Google Apps Script Webhook URL" 
                      value={appConfig.googleSheetUrl} 
                      onChange={(e) => setAppConfig({...appConfig, googleSheetUrl: e.target.value})} 
                      className="w-full px-6 py-3 bg-slate-950/40 border border-white/5 rounded-2xl text-white text-[10px] font-mono" 
                    />
                    <p className="text-[8px] text-slate-500 mt-1 pl-2 font-bold italic">Saves your ID and PIN to the cloud immediately.</p>
                  </div>
                </div>
                <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl mt-4 shadow-xl active:scale-95 transition-all">Create Master Vault</button>
              </form>
            )}
          </div>
        </div>
      ) : (
        <>
          <header className="sticky top-0 z-50 glass border-b border-white/5 px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => { setSelectedRoomId(null); setActiveTab('rooms'); }}>
              <div className={`${currentTheme.bg} p-2.5 rounded-xl shadow-lg`}><Zap className="w-6 h-6 text-white fill-white" /></div>
              <div>
                <h1 className="text-xl font-black text-white tracking-tighter uppercase">{appConfig.appName}</h1>
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  {loginId} 
                  <span className={`px-2 py-0.5 rounded-md text-[7px] ${currentUserRole === 'owner' ? 'bg-indigo-500 text-white' : currentUserRole === 'admin' ? 'bg-emerald-500 text-white' : 'bg-slate-700 text-slate-300'}`}>
                    {currentUserRole.toUpperCase()}
                  </span>
                </p>
              </div>
            </div>
            <nav className="flex items-center gap-4">
              <button onClick={() => { setSelectedRoomId(null); setActiveTab('rooms'); }} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'rooms' ? `${currentTheme.bg} text-white` : 'text-slate-500 hover:text-white'}`}>Units</button>
              <button onClick={() => setActiveTab('admin')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${activeTab === 'admin' ? `${currentTheme.bg} text-white` : 'text-slate-500 hover:text-white'}`}>Settings</button>
              <button onClick={() => window.location.reload()} className="p-2 text-slate-600 hover:text-red-500" title="Lock App"><Lock className="w-4 h-4" /></button>
            </nav>
          </header>

          <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-10">
            {activeTab === 'rooms' ? (
              selectedRoomId ? (
                <div className="space-y-10 animate-in fade-in slide-in-from-left">
                  <button onClick={() => setSelectedRoomId(null)} className="flex items-center gap-2 text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-widest">
                    <ArrowLeft className="w-4 h-4" /> Back to Dashboard
                  </button>
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-7">
                      <HistoryList 
                        records={records.filter(r => r.roomId === selectedRoomId)} 
                        isAdmin={currentUserRole !== 'viewer'} 
                        onDeleteRecord={handleDeleteRecord}
                        onToggleStatus={handleToggleRecordStatus}
                        onBulkMarkAsPaid={handleBulkMarkAsPaid}
                        currencySymbol={appConfig.currencySymbol}
                        appName={appConfig.appName}
                      />
                    </div>
                    <div className="lg:col-span-5">
                      <Calculator 
                        room={rooms.find(r => r.id === selectedRoomId)!} 
                        onSave={handleSaveRecord} 
                        themeColor={appConfig.themeColor} 
                        currencySymbol={appConfig.currencySymbol}
                        isViewOnly={currentUserRole === 'viewer'}
                        appName={appConfig.appName}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-10">
                  <div className="flex flex-col md:flex-row justify-between items-end gap-6">
                    <div>
                      <h2 className="text-4xl font-black text-white italic tracking-tighter mb-2">My Metering Points</h2>
                      <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Manage real-time energy consumption</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {rooms.map(room => (
                      <div key={room.id} onClick={() => setSelectedRoomId(room.id)} className="glass p-8 rounded-[3rem] border border-white/5 hover:border-indigo-500/50 transition-all cursor-pointer group active:scale-95 shadow-xl">
                        <Home className="w-8 h-8 text-indigo-400 mb-6 group-hover:scale-110 transition-transform" />
                        <h3 className="text-2xl font-black text-white mb-2">{room.name}</h3>
                        <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Reading: {room.lastReading} Units</p>
                      </div>
                    ))}
                    {currentUserRole !== 'viewer' && (
                      <div onClick={() => setActiveTab('admin')} className="glass p-8 rounded-[3rem] border border-white/5 border-dashed flex flex-col items-center justify-center cursor-pointer hover:bg-white/5 transition-all text-slate-500">
                        <Users className="w-8 h-8 mb-4 opacity-20" />
                        <p className="text-[10px] font-black uppercase tracking-widest">Configure in Settings</p>
                      </div>
                    )}
                  </div>
                </div>
              )
            ) : (
              <AdminPanel 
                config={{ ...appConfig, recordsCount: records.length } as any} 
                rooms={rooms}
                records={records}
                currentUserRole={currentUserRole}
                onUpdateConfig={(cfg) => setAppConfig(prev => ({ ...prev, ...cfg }))}
                onAddRoom={async (name, initial) => {
                  if (currentUserRole === 'viewer') return;
                  const newRoom: Room = { id: generateUUID(), name, lastReading: initial || 0 };
                  setRooms(prev => {
                    const updated = [...prev, newRoom];
                    const key = `${appConfig.userId.toLowerCase().trim()}_${appConfig.pin}`;
                    storage.saveVault(key, updated, records);
                    return updated;
                  });
                  showToast("Metering unit added.");
                }}
                onDeleteRoom={async (id) => {
                  if (currentUserRole === 'viewer') return;
                  setRooms(prev => {
                    const updated = prev.filter(r => r.id !== id);
                    const key = `${appConfig.userId.toLowerCase().trim()}_${appConfig.pin}`;
                    storage.saveVault(key, updated, records.filter(r => r.roomId !== id));
                    return updated;
                  });
                  if (selectedRoomId === id) setSelectedRoomId(null);
                }}
              />
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
