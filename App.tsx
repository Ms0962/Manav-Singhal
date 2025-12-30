
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BillingRecord, Room, AdminConfig } from './types';
import { storage } from './services/storageService';
import { getBillingInsight } from './services/geminiService';
import { biometricService } from './services/biometricService';
import Calculator from './components/Calculator';
import AdminPanel from './components/AdminPanel';
import HistoryList from './components/HistoryList';
import { 
  Zap, ShieldCheck, Home, ArrowLeft, Plus, Search, 
  Lock, Unlock, ShieldAlert, Fingerprint, ScanFace, CheckCircle, AlertCircle
} from 'lucide-react';

// Robust UUID Fallback for non-secure contexts
const generateUUID = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'rooms' | 'admin'>('rooms');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  // PWA Install State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  
  // Vault States
  const [isLocked, setIsLocked] = useState(true);
  const [masterPassword, setMasterPassword] = useState('');
  const [vaultError, setVaultError] = useState('');
  const [isInitializing, setIsInitializing] = useState(!storage.isVaultInitialized());
  const [securityHint, setSecurityHint] = useState('');
  
  // Biometric States
  const [isBioSupported, setIsBioSupported] = useState(false);
  const [isBioEnabled, setIsBioEnabled] = useState(localStorage.getItem('voltcalc_bio_enabled') === 'true');

  const [rooms, setRooms] = useState<Room[]>([]);
  const [records, setRecords] = useState<BillingRecord[]>([]);
  
  // Use a ref to always have access to the latest state for storage operations
  const recordsRef = useRef<BillingRecord[]>([]);
  const roomsRef = useRef<Room[]>([]);
  
  useEffect(() => {
    recordsRef.current = records;
    roomsRef.current = rooms;
  }, [records, rooms]);

  // Config state
  const [appConfig, setAppConfig] = useState<AdminConfig>(() => {
    const saved = localStorage.getItem('voltcalc_branding_v3');
    return saved ? JSON.parse(saved) : { 
      appName: 'VOLTCALC', 
      themeColor: 'indigo', 
      currencySymbol: 'RS',
      adminPassword: '',
      isVaultInitialized: false
    };
  });

  const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  useEffect(() => {
    biometricService.checkAvailability().then(setIsBioSupported);

    window.addEventListener('beforeinstallprompt', (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    });
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };

  useEffect(() => {
    localStorage.setItem('voltcalc_branding_v3', JSON.stringify(appConfig));
  }, [appConfig]);

  const themeClasses = {
    indigo: { bg: 'bg-indigo-600', text: 'text-indigo-400', border: 'border-indigo-500/20', glow: 'neon-glow-indigo' },
    rose: { bg: 'bg-rose-600', text: 'text-rose-400', border: 'border-rose-500/20', glow: 'shadow-[0_0_20px_rgba(225,29,72,0.2)]' },
    emerald: { bg: 'bg-emerald-600', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-[0_0_20px_rgba(16,185,129,0.2)]' },
    amber: { bg: 'bg-amber-600', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-[0_0_20px_rgba(245,158,11,0.2)]' },
    violet: { bg: 'bg-violet-600', text: 'text-violet-400', border: 'border-violet-500/20', glow: 'shadow-[0_0_20px_rgba(139,92,246,0.2)]' },
    cyan: { bg: 'bg-cyan-600', text: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'shadow-[0_0_20px_rgba(6,182,212,0.2)]' },
  };

  const currentTheme = themeClasses[appConfig.themeColor || 'indigo'];

  const handleUnlock = async (password: string) => {
    setVaultError('');
    try {
      const data = await storage.loadVault(password);
      if (data) {
        setRooms(data.rooms || []);
        setRecords(data.records || []);
        setMasterPassword(password);
        setIsLocked(false);
        showToast("Vault Unlocked", "success");
      }
    } catch (err) {
      setVaultError('Invalid decryption key. Please try again.');
    }
  };

  const handleBiometricUnlock = async () => {
    const success = await biometricService.authenticate();
    if (success) {
      const rememberedKey = localStorage.getItem('voltcalc_remembered_key');
      if (rememberedKey) {
        handleUnlock(rememberedKey);
      } else {
        setVaultError('Biometric link broken. Please use Master Key.');
      }
    } else {
      setVaultError('Biometric verification failed.');
    }
  };

  const handleInitialize = async (e: React.FormEvent) => {
    e.preventDefault();
    if (masterPassword.length < 4) {
      setVaultError('Security key must be at least 4 characters.');
      return;
    }
    await storage.saveVault(masterPassword, [], []);
    localStorage.setItem('voltcalc_hint', securityHint);
    setIsInitializing(false);
    setIsLocked(false);
    setRooms([]);
    setRecords([]);
    showToast("Vault Initialized", "success");
  };

  const handleSaveRecord = async (newRecord: Omit<BillingRecord, 'id' | 'date' | 'aiInsight'>) => {
    if (!masterPassword) {
      showToast("Session expired. Please relock.", "error");
      return;
    }

    try {
      const fullRecord: BillingRecord = {
        ...newRecord,
        id: generateUUID(),
        date: new Date().toISOString(),
        aiInsight: 'Generating insight...',
      };

      // Compute new state
      const updatedRecords = [fullRecord, ...recordsRef.current];
      const updatedRooms = roomsRef.current.map(r => 
        r.id === fullRecord.roomId ? { ...r, lastReading: fullRecord.currentUnit } : r
      );

      // Perform updates
      setRecords(updatedRecords);
      setRooms(updatedRooms);

      // Persist to encrypted storage
      await storage.saveVault(masterPassword, updatedRooms, updatedRecords);
      showToast("Bill Recorded & Saved!", "success");
      
      // Async AI Insight update - don't block the UI
      getBillingInsight(fullRecord.totalUnits, 'Energy', fullRecord.totalAmount)
        .then(async (insight) => {
          setRecords(current => {
            const newerRecords = current.map(r => r.id === fullRecord.id ? { ...r, aiInsight: insight } : r);
            storage.saveVault(masterPassword, roomsRef.current, newerRecords);
            return newerRecords;
          });
        })
        .catch(err => console.warn("AI Insight generation failed:", err));

    } catch (err) {
      console.error("Save Record Failure:", err);
      showToast("Critical Save Error. Data not persisted.", "error");
    }
  };

  const handleDeleteRecord = async (id: string) => {
    if (window.confirm("Delete this billing entry?")) {
      const updated = records.filter(r => r.id !== id);
      setRecords(updated);
      await storage.saveVault(masterPassword, rooms, updated);
      showToast("Record Deleted");
    }
  };

  const handleAddRoom = async (name: string, initialReading: number = 0, rate: number = 8, rent: number = 500) => {
    const newRoom: Room = { 
      id: generateUUID(), 
      name, 
      lastReading: initialReading,
      defaultUnitRate: rate,
      defaultFixedCharge: rent
    };
    const updated = rooms.concat(newRoom);
    setRooms(updated);
    await storage.saveVault(masterPassword, updated, records);
    showToast("Unit Added");
  };

  const handleDeleteRoom = async (id: string) => {
    if (window.confirm("Permanently delete this unit?")) {
      const updatedRooms = rooms.filter(r => r.id !== id);
      const updatedRecords = records.filter(r => r.roomId !== id);
      setRooms(updatedRooms);
      setRecords(updatedRecords);
      await storage.saveVault(masterPassword, updatedRooms, updatedRecords);
      if (selectedRoomId === id) setSelectedRoomId(null);
      showToast("Unit Removed");
    }
  };

  const savedHint = localStorage.getItem('voltcalc_hint');

  return (
    <div className={`min-h-screen text-slate-200 flex flex-col theme-${appConfig.themeColor || 'indigo'}`}>
      {/* Toast Notification UI */}
      {toast && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-top duration-300">
          <div className={`glass flex items-center gap-3 px-6 py-4 rounded-2xl shadow-2xl border ${toast.type === 'success' ? 'border-emerald-500/20 text-emerald-400' : 'border-red-500/20 text-red-400'}`}>
            {toast.type === 'success' ? <CheckCircle className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
            <span className="font-black uppercase tracking-widest text-xs">{toast.message}</span>
          </div>
        </div>
      )}

      {isLocked ? (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="glass max-w-md w-full p-10 rounded-[3rem] border border-white/10 shadow-2xl text-center">
            <div className={`w-20 h-20 ${currentTheme.bg} rounded-[2rem] flex items-center justify-center mx-auto mb-8 ${currentTheme.glow}`}>
               {appConfig.appLogo ? (
                 <img src={appConfig.appLogo} alt="Logo" className="w-12 h-12 object-contain" />
               ) : (
                 <Lock className="w-10 h-10 text-white" />
               )}
            </div>
            <h2 className="text-3xl font-black text-white mb-2 tracking-tight">
              {isInitializing ? `Setup ${appConfig.appName}` : `${appConfig.appName} Locked`}
            </h2>
            <p className="text-slate-500 font-medium mb-10">
              {isInitializing 
                ? 'Secure your new vault with a master key.' 
                : 'Authorized access only. Please provide credentials.'}
            </p>
            
            <form onSubmit={(e) => { e.preventDefault(); isInitializing ? handleInitialize(e) : handleUnlock(masterPassword); }} className="space-y-6">
              <div className="space-y-4">
                <input
                  type="password"
                  placeholder="Master Security Key"
                  required
                  autoFocus
                  value={masterPassword}
                  onChange={(e) => setMasterPassword(e.target.value)}
                  className={`w-full px-6 py-5 bg-slate-900 border border-white/5 rounded-2xl focus:ring-4 focus:ring-${appConfig.themeColor || 'indigo'}-600/30 outline-none transition-all text-center font-bold text-white placeholder:text-slate-700 text-lg`}
                />
                
                {isInitializing && (
                  <input
                    type="text"
                    placeholder="Security Hint (Optional)"
                    value={securityHint}
                    onChange={(e) => setSecurityHint(e.target.value)}
                    className="w-full px-6 py-3 bg-slate-900/50 border border-white/5 rounded-xl outline-none text-center text-sm text-slate-400 font-medium"
                  />
                )}
              </div>

              {vaultError && (
                <p className="text-red-500 text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                  <ShieldAlert className="w-4 h-4" /> {vaultError}
                </p>
              )}
              
              <div className="flex flex-col gap-3">
                <button type="submit" className={`w-full py-5 bg-white text-slate-900 font-black rounded-2xl active:scale-95 transition-all text-lg hover:bg-slate-200 shadow-xl`}>
                  {isInitializing ? 'Initialize Vault' : 'Unlock Now'}
                </button>

                {!isInitializing && isBioSupported && isBioEnabled && (
                  <button 
                    type="button"
                    onClick={handleBiometricUnlock}
                    className={`w-full py-5 ${currentTheme.bg}/10 ${currentTheme.text} font-black rounded-2xl hover:${currentTheme.bg}/20 transition-all flex items-center justify-center gap-3 border ${currentTheme.border} animate-pulse`}
                  >
                    <ScanFace className="w-6 h-6" /> Biometric Access
                  </button>
                )}
              </div>

              {!isInitializing && savedHint && (
                <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest mt-4 italic">
                  Hint: {savedHint}
                </p>
              )}
            </form>

            <button 
              onClick={() => {
                if(window.confirm("DANGER: This wipes ALL local data permanently.")) {
                  storage.clearAll();
                  window.location.reload();
                }
              }}
              className="mt-8 text-[10px] font-black text-slate-700 hover:text-red-500 transition-colors uppercase tracking-[0.2em]"
            >
              System Wipe
            </button>

            <div className="mt-8 pt-8 border-t border-white/5 flex items-center justify-center gap-2 text-slate-600 font-bold text-[10px] uppercase tracking-widest">
              <ShieldCheck className={`w-3.5 h-3.5 ${currentTheme.text}`} /> AES-256 Hardened Vault
            </div>
          </div>
        </div>
      ) : (
        <>
          <header className="sticky top-0 z-50 glass border-b border-white/5 shadow-2xl">
            <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
              <div 
                className="flex items-center gap-3 cursor-pointer group" 
                onClick={() => { setSelectedRoomId(null); setActiveTab('rooms'); setSearchTerm(''); }}
              >
                <div className={`${currentTheme.bg} p-2.5 rounded-2xl group-hover:rotate-12 transition-transform duration-300 ${currentTheme.glow}`}>
                  {appConfig.appLogo ? (
                    <img src={appConfig.appLogo} alt="Logo" className="w-6 h-6 object-contain" />
                  ) : (
                    <Zap className="w-6 h-6 text-white fill-white" />
                  )}
                </div>
                <div>
                  <h1 className="text-2xl font-black text-white tracking-tighter uppercase">{appConfig.appName || 'VOLTCALC'}</h1>
                  <div className="flex items-center gap-2">
                    <p className={`text-[10px] font-bold ${currentTheme.text} tracking-[0.2em] uppercase`}>Encrypted</p>
                    <div className="h-1 w-1 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse" />
                    <Unlock className="w-2.5 h-2.5 text-emerald-500" />
                  </div>
                </div>
              </div>
              
              <nav className="flex items-center gap-2">
                <button
                  onClick={() => { setSelectedRoomId(null); setActiveTab('rooms'); }}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'rooms' && !selectedRoomId ? `${currentTheme.bg} text-white ${currentTheme.glow}` : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <Home className="w-4 h-4" />
                  <span className="hidden sm:inline">Units</span>
                </button>
                <button
                  onClick={() => setActiveTab('admin')}
                  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'admin' ? `${currentTheme.bg} text-white ${currentTheme.glow}` : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </button>
              </nav>
            </div>
          </header>

          <main className="flex-grow max-w-6xl w-full mx-auto px-6 py-12">
            {activeTab === 'rooms' && (
              <div className="animate-in fade-in slide-in-from-bottom-6 duration-700">
                {selectedRoomId && rooms.find(r => r.id === selectedRoomId) ? (
                  <div className="space-y-10">
                    <button 
                      onClick={() => setSelectedRoomId(null)}
                      className={`flex items-center gap-2 text-slate-400 hover:${currentTheme.text} font-bold transition-colors uppercase tracking-widest text-xs`}
                    >
                      <ArrowLeft className="w-4 h-4" /> Exit to Dashboard
                    </button>
                    
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                      <div className="lg:col-span-2">
                        <HistoryList 
                          title={`${rooms.find(r => r.id === selectedRoomId)?.name} Ledger`}
                          records={records.filter(r => r.roomId === selectedRoomId)} 
                          isAdmin={true}
                          onDeleteRecord={handleDeleteRecord}
                        />
                      </div>
                      <div className="lg:sticky lg:top-32 h-fit">
                        <Calculator room={rooms.find(r => r.id === selectedRoomId)!} onSave={handleSaveRecord} themeColor={appConfig.themeColor} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-12">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                      <div>
                        <h2 className="text-4xl font-black text-white tracking-tight mb-2">Workspace</h2>
                        <p className="text-slate-400 font-medium italic flex items-center gap-2 text-sm">
                           <ShieldCheck className={`w-4 h-4 ${currentTheme.text}`} />
                           Privacy Guard Enabled
                        </p>
                      </div>
                      
                      {rooms.length > 0 && (
                        <div className="relative w-full md:w-80">
                          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                          <input 
                            type="text"
                            placeholder="Filter list..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className={`w-full pl-12 pr-4 py-3.5 bg-slate-800/50 border border-white/10 rounded-2xl focus:ring-2 focus:ring-${appConfig.themeColor || 'indigo'}-600 outline-none transition-all placeholder:text-slate-600 font-medium`}
                          />
                        </div>
                      )}
                    </div>
                    
                    {rooms.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {rooms.filter(room => room.name.toLowerCase().includes(searchTerm.toLowerCase())).map(room => (
                          <div 
                            key={room.id}
                            onClick={() => setSelectedRoomId(room.id)}
                            className={`glass group p-8 rounded-[2rem] hover:border-${appConfig.themeColor || 'indigo'}-500/50 transition-all cursor-pointer relative overflow-hidden active:scale-95`}
                          >
                            <div className={`absolute -right-4 -top-4 ${currentTheme.bg}/10 p-10 rounded-full blur-2xl group-hover:${currentTheme.bg}/20 transition-all`} />
                            <div className="relative z-10">
                              <div className="flex justify-between items-start mb-6">
                                <div className={`bg-white/5 p-4 rounded-2xl group-hover:${currentTheme.bg} transition-all duration-500`}>
                                  <Home className={`w-7 h-7 ${currentTheme.text} group-hover:text-white`} />
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1">Last Unit</span>
                                  <span className="text-lg font-bold text-white tabular-nums">{room.lastReading.toLocaleString()}</span>
                                </div>
                              </div>
                              <h3 className={`text-2xl font-black text-white group-hover:${currentTheme.text} transition-colors mb-2`}>
                                {room.name}
                              </h3>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-32 glass rounded-[3rem] border border-white/5 max-w-2xl mx-auto">
                        <h3 className="text-3xl font-black text-white mb-4">Vault Ready</h3>
                        <p className="text-slate-400 mb-10 text-lg font-medium">Use the Admin panel to configure your units and meters.</p>
                        <button onClick={() => setActiveTab('admin')} className={`${currentTheme.bg} text-white px-10 py-4 rounded-2xl font-black shadow-xl`}>Configure System</button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'admin' && (
              <AdminPanel 
                config={{ 
                  adminPassword: masterPassword, 
                  isVaultInitialized: true, 
                  currencySymbol: appConfig.currencySymbol,
                  appName: appConfig.appName,
                  appLogo: appConfig.appLogo,
                  themeColor: appConfig.themeColor
                }} 
                rooms={rooms}
                records={records}
                onUpdateConfig={(cfg) => setAppConfig(prev => ({ ...prev, ...cfg }))}
                onAddRoom={handleAddRoom}
                onDeleteRoom={handleDeleteRoom}
                onDeleteRecord={handleDeleteRecord}
                isAuthenticated={true}
                onAuthenticate={() => {}}
                onInstallApp={deferredPrompt ? handleInstallApp : undefined}
              />
            )}
          </main>

          <footer className="py-12 border-t border-white/5 text-center">
            <div className="flex items-center justify-center gap-2 text-slate-600 font-bold uppercase tracking-[0.3em] text-[10px]">
               <ShieldCheck className={`w-3.5 h-3.5 ${currentTheme.text}`} /> POWERED BY {appConfig.appName || 'VOLTCALC'} VAULT TECHNOLOGY
            </div>
          </footer>
        </>
      )}
    </div>
  );
};

export default App;
