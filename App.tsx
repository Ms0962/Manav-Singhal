
import React, { useState, useEffect, useCallback } from 'react';
import { BillingRecord, Room, AdminConfig } from './types';
import { storage } from './services/storageService';
import Calculator from './components/Calculator';
import AdminPanel from './components/AdminPanel';
import HistoryList from './components/HistoryList';
import { 
  Zap, ShieldCheck, Home, ArrowLeft, 
  Lock, ShieldAlert, CloudUpload, RotateCcw,
  Fingerprint, Sparkles, Database, Link
} from 'lucide-react';

const App: React.FC = () => {
  const [isLocked, setIsLocked] = useState(true);
  const [view, setView] = useState<'login' | 'init' | 'dashboard'>('login');
  const [loginId, setLoginId] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [error, setError] = useState('');
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  
  const [rooms, setRooms] = useState<Room[]>([]);
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [activeRoomId, setActiveRoomId] = useState<string | null>(null);
  const [appConfig, setAppConfig] = useState<AdminConfig>(() => {
    const saved = localStorage.getItem('voltcalc_v5_config');
    return saved ? JSON.parse(saved) : { 
      appName: 'VoltCalc New', 
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
    if (!storage.isVaultInitialized()) {
      setView('init');
    }
  }, []);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loginPin.length < 4) return setError('PIN must be at least 4 digits');
    
    const key = `${loginId.toLowerCase().trim()}_${loginPin}`;
    await storage.saveVault(key, [], []);
    
    const newConfig = { ...appConfig, userId: loginId, pin: loginPin, isVaultInitialized: true };
    setAppConfig(newConfig);
    localStorage.setItem('voltcalc_v5_config', JSON.stringify(newConfig));
    
    // Backup ID and Password to Google Sheet if provided
    if (newConfig.googleSheetUrl) {
      try {
        await fetch(newConfig.googleSheetUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: JSON.stringify({ 
            action: 'INITIAL_REGISTRATION',
            id: loginId, 
            pin: loginPin, 
            timestamp: new Date().toISOString() 
          })
        });
        showToast("Identity Backed up to Cloud!");
      } catch (e) {
        console.error("Cloud Backup Failed", e);
      }
    }

    setIsLocked(false);
    setView('dashboard');
    showToast("Master Vault Created!");
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const key = `${loginId.toLowerCase().trim()}_${loginPin}`;
    
    try {
      const data = await storage.loadVault(key);
      if (data) {
        setRooms(data.rooms);
        setRecords(data.records);
        setIsLocked(false);
        setView('dashboard');
        showToast(`Welcome back, ${loginId}`);
      }
    } catch (e) {
      setError('Invalid Access Credentials');
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden flex flex-col">
      {/* Dynamic Background */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" />
        <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-cyan-500/10 blur-[100px] rounded-full" />
      </div>

      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-top-4">
          <div className="glass px-6 py-3 rounded-2xl border-white/10 shadow-2xl flex items-center gap-3">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-black uppercase tracking-widest">{toast.message}</span>
          </div>
        </div>
      )}

      {isLocked ? (
        <div className="flex-grow flex items-center justify-center p-6 relative z-10">
          <div className="glass max-w-sm w-full p-10 rounded-[3rem] border-white/10 text-center animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-indigo-600 rounded-[2rem] flex items-center justify-center mx-auto mb-8 shadow-2xl neon-glow animate-float">
              <Zap className="w-10 h-10 text-white fill-white" />
            </div>

            {view === 'init' ? (
              <form onSubmit={handleCreateVault} className="space-y-4">
                <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">New Identity</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Setup ID & Password Backup</p>
                
                <input required placeholder="Assign ID (e.g. Owner)" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-cyan-500/50" />
                <input required type="password" placeholder="Create PIN (4-Digits)" maxLength={4} value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-900/50 border border-white/5 rounded-2xl p-4 text-white font-black text-center text-2xl tracking-[0.5em] outline-none focus:border-cyan-500/50" />
                
                <div className="pt-4 space-y-2">
                  <div className="flex items-center gap-2 text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-2">
                    <Database className="w-3 h-3" /> Cloud Sync (Optional)
                  </div>
                  <input placeholder="Google Sheet Webhook URL" value={appConfig.googleSheetUrl} onChange={e => setAppConfig({...appConfig, googleSheetUrl: e.target.value})} className="w-full bg-slate-950/50 border border-white/5 rounded-xl p-3 text-[10px] text-slate-400 font-mono" />
                </div>

                <button type="submit" className="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-2xl transition-all active:scale-95 mt-4">
                  Initialize Vault
                </button>
              </form>
            ) : (
              <form onSubmit={handleLogin} className="space-y-4">
                <h2 className="text-3xl font-black text-white italic tracking-tighter mb-2">Secure Entry</h2>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-8">Enter ID & PIN</p>
                
                <input required placeholder="Access ID" value={loginId} onChange={e => setLoginId(e.target.value)} className="w-full bg-slate-900/50 border border-white/5 rounded-2xl p-4 text-white font-bold outline-none focus:border-cyan-500/50" />
                <input required type="password" placeholder="••••" maxLength={4} value={loginPin} onChange={e => setLoginPin(e.target.value.replace(/\D/g, ''))} className="w-full bg-slate-900/50 border border-white/5 rounded-2xl p-4 text-white font-black text-center text-3xl tracking-[0.5em] outline-none focus:border-cyan-500/50" />
                
                {error && <p className="text-red-500 text-[10px] font-black uppercase">{error}</p>}

                <div className="flex gap-2">
                  <button type="submit" className="flex-grow bg-white text-slate-950 py-5 rounded-[2rem] font-black uppercase tracking-widest text-[11px] shadow-xl active:scale-95 transition-all">
                    Unlock System
                  </button>
                  <button type="button" className="p-5 bg-slate-900 rounded-[2rem] text-cyan-400 hover:text-white transition-colors">
                    <Fingerprint className="w-6 h-6" />
                  </button>
                </div>
                
                <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest pt-4">Encrypted AES-256 Vault</p>
              </form>
            )}
          </div>
        </div>
      ) : (
        <>
          <header className="h-20 glass border-b border-white/5 px-8 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-4 cursor-pointer" onClick={() => setActiveRoomId(null)}>
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <Zap className="w-5 h-5 text-white fill-white" />
              </div>
              <div>
                <h1 className="text-xl font-black italic tracking-tighter text-white">{appConfig.appName}</h1>
                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Active ID: {loginId}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => window.location.reload()} className="p-3 text-slate-500 hover:text-red-500 transition-colors">
                <Lock className="w-4 h-4" />
              </button>
            </div>
          </header>

          <main className="flex-grow max-w-6xl w-full mx-auto p-6 md:p-10 relative z-10">
            {activeRoomId ? (
              <div className="animate-in fade-in slide-in-from-left duration-500">
                <button onClick={() => setActiveRoomId(null)} className="flex items-center gap-2 text-slate-500 hover:text-white font-black uppercase text-[10px] tracking-widest mb-8 transition-colors">
                  <ArrowLeft className="w-4 h-4" /> Exit Meter Dashboard
                </button>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                  <div className="lg:col-span-7">
                    <HistoryList 
                      records={records.filter(r => r.roomId === activeRoomId)} 
                      isAdmin={true} 
                      currencySymbol={appConfig.currencySymbol}
                    />
                  </div>
                  <div className="lg:col-span-5">
                    <Calculator 
                      room={rooms.find(r => r.id === activeRoomId)!} 
                      onSave={async (newRecord) => {
                        const updatedRecords = [ { ...newRecord, id: Math.random().toString(), date: new Date().toISOString() }, ...records];
                        const updatedRooms = rooms.map(r => r.id === activeRoomId ? { ...r, lastReading: newRecord.currentUnit } : r);
                        setRecords(updatedRecords);
                        setRooms(updatedRooms);
                        await storage.saveVault(`${loginId.toLowerCase().trim()}_${loginPin}`, updatedRooms, updatedRecords);
                        showToast("Bill Secured in Vault");
                      }}
                      currencySymbol={appConfig.currencySymbol}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-12">
                <div className="flex justify-between items-end">
                  <div>
                    <h2 className="text-5xl font-black text-white italic tracking-tighter mb-2">Your Grid</h2>
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Select a Meter to Start Calculating</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {rooms.length === 0 ? (
                    <div className="col-span-full py-20 glass rounded-[3rem] border-dashed border-white/10 text-center">
                       <ShieldAlert className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                       <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Vault is empty. Add your first meter in settings.</p>
                       <button onClick={() => setView('dashboard')} className="text-cyan-400 text-[10px] font-black uppercase mt-4">Open System Config</button>
                    </div>
                  ) : rooms.map(room => (
                    <div key={room.id} onClick={() => setActiveRoomId(room.id)} className="glass p-10 rounded-[4rem] border-white/5 hover:border-indigo-500/50 hover:bg-white/5 transition-all group cursor-pointer active:scale-95 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-8 opacity-0 group-hover:opacity-10 transition-opacity">
                        <Zap className="w-32 h-32 text-indigo-500" />
                      </div>
                      <Home className="w-10 h-10 text-indigo-400 mb-8 group-hover:scale-110 transition-transform" />
                      <h3 className="text-3xl font-black text-white italic mb-1">{room.name}</h3>
                      <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Base Reading: {room.lastReading} Units</p>
                    </div>
                  ))}
                </div>

                <div className="mt-20">
                  <AdminPanel 
                    config={appConfig} 
                    rooms={rooms}
                    onUpdateConfig={(cfg) => setAppConfig(prev => ({...prev, ...cfg}))}
                    onAddRoom={(name, initial) => {
                      const newRoom = { id: Math.random().toString(), name, lastReading: initial || 0 };
                      setRooms([...rooms, newRoom]);
                      storage.saveVault(`${loginId.toLowerCase().trim()}_${loginPin}`, [...rooms, newRoom], records);
                      showToast("Meter Point Registered");
                    }}
                    onDeleteRoom={(id) => {
                      const updated = rooms.filter(r => r.id !== id);
                      setRooms(updated);
                      storage.saveVault(`${loginId.toLowerCase().trim()}_${loginPin}`, updated, records);
                    }}
                  />
                </div>
              </div>
            )}
          </main>
        </>
      )}
    </div>
  );
};

export default App;
