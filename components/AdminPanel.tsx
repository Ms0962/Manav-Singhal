
import React, { useState, useRef, useEffect } from 'react';
import { AdminConfig, Room, BillingRecord } from '../types';
import { storage } from '../services/storageService';
import { biometricService } from '../services/biometricService';
import HistoryList from './HistoryList';
import { 
  ShieldCheck, Lock, Plus, Trash2, List, Zap, Home, Receipt, Wallet, 
  Edit3, Check, Users, Key, Download, Upload, AlertTriangle, RefreshCcw, LogOut,
  LayoutDashboard, Settings as SettingsIcon, Fingerprint, ScanFace, Smartphone, Palette, Type, Image as ImageIcon,
  Smartphone as InstallIcon, Save
} from 'lucide-react';

interface AdminPanelProps {
  config: AdminConfig;
  rooms: Room[];
  records: BillingRecord[];
  onUpdateConfig: (newConfig: Partial<AdminConfig>) => void;
  onAddRoom: (name: string, initialReading?: number, rate?: number, rent?: number) => void;
  onDeleteRoom: (id: string) => void;
  onDeleteRecord: (id: string) => void;
  isAuthenticated: boolean;
  onAuthenticate: (status: boolean) => void;
  onInstallApp?: () => void;
}

type AdminTab = 'overview' | 'units' | 'ledger' | 'branding' | 'security';

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  rooms, records, config, onAddRoom, onDeleteRoom, onDeleteRecord, isAuthenticated, onAuthenticate, onUpdateConfig, onInstallApp 
}) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [passwordInput, setPasswordInput] = useState('');
  const [error, setError] = useState('');
  
  // Biometric Management
  const [isBioSupported, setIsBioSupported] = useState(false);
  const [isBioEnabled, setIsBioEnabled] = useState(localStorage.getItem('voltcalc_bio_enabled') === 'true');

  useEffect(() => {
    biometricService.checkAvailability().then(setIsBioSupported);
  }, []);

  const toggleBiometrics = async () => {
    if (isBioEnabled) {
      localStorage.removeItem('voltcalc_bio_enabled');
      localStorage.removeItem('voltcalc_remembered_key');
      setIsBioEnabled(false);
      setSecurityMsg({ text: "Biometric access revoked.", type: 'success' });
    } else {
      const registered = await biometricService.register("Admin Vault");
      if (registered) {
        localStorage.setItem('voltcalc_bio_enabled', 'true');
        localStorage.setItem('voltcalc_remembered_key', config.adminPassword);
        setIsBioEnabled(true);
        setSecurityMsg({ text: "Biometric link established.", type: 'success' });
      } else {
        setSecurityMsg({ text: "Hardware verification failed.", type: 'error' });
      }
    }
  };

  // Branding States
  const [tempAppName, setTempAppName] = useState(config.appName || 'VOLTCALC');
  const [logoPreview, setLogoPreview] = useState<string | null>(config.appLogo || null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const base64 = ev.target?.result as string;
      setLogoPreview(base64);
      onUpdateConfig({ appLogo: base64 });
    };
    reader.readAsDataURL(file);
  };

  // Create Unit State
  const [newRoomName, setNewRoomName] = useState('');
  const [initialReading, setInitialReading] = useState<number>(0);
  const [initialRate, setInitialRate] = useState<number>(8);
  const [initialRent, setInitialRent] = useState<number>(500);

  // Editing Room State
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const [editRoomData, setEditRoomData] = useState<Partial<Room>>({});
  
  // Security States
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securityMsg, setSecurityMsg] = useState<{ text: string, type: 'success' | 'error' } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === config.adminPassword) {
      onAuthenticate(true);
      setError('');
    } else {
      setError('Incorrect master key.');
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (newRoomName.trim()) {
      onAddRoom(newRoomName.trim(), initialReading, initialRate, initialRent);
      setNewRoomName('');
      setInitialReading(0);
    }
  };

  const handleSaveEdit = async () => {
    if (!editingRoomId) return;
    // Fix: Using Object.assign instead of a multi-spread to resolve the "Spread types may only be created from object types" error when merging an interface with its partial.
    const updatedRooms = rooms.map(r => r.id === editingRoomId ? Object.assign({}, r, editRoomData) : r);
    await storage.saveVault(config.adminPassword, updatedRooms, records);
    setEditingRoomId(null);
    window.location.reload();
  };

  const themeColors: AdminConfig['themeColor'][] = ['indigo', 'rose', 'emerald', 'amber', 'violet', 'cyan'];

  const getThemeBg = (color?: string) => {
    switch(color) {
      case 'rose': return 'bg-rose-600';
      case 'emerald': return 'bg-emerald-600';
      case 'amber': return 'bg-amber-600';
      case 'violet': return 'bg-violet-600';
      case 'cyan': return 'bg-cyan-600';
      default: return 'bg-indigo-600';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto py-24">
        <div className="glass p-12 rounded-[3rem] shadow-2xl border border-white/5 text-center">
          <div className={`w-20 h-20 ${getThemeBg(config.themeColor)} rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-xl`}>
            <Lock className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-3xl font-black text-white mb-4 tracking-tight">Admin Console</h2>
          <p className="text-slate-500 font-medium mb-10">Access restricted to vault owners.</p>
          <form onSubmit={handleLogin} className="space-y-4">
            <input
              type="password"
              placeholder="System Key"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl focus:ring-4 focus:ring-indigo-600/30 outline-none transition-all text-center font-bold text-white"
            />
            {error && <p className="text-red-500 text-[10px] font-black uppercase tracking-widest">{error}</p>}
            <button type="submit" className="w-full py-4 bg-white text-slate-900 font-black rounded-2xl active:scale-95 transition-all text-lg hover:bg-slate-200">Decrypt Access</button>
          </form>
        </div>
      </div>
    );
  }

  const totalCollected = records.reduce((acc, r) => acc + r.totalAmount, 0);

  return (
    <div className="max-w-6xl mx-auto space-y-10 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 h-fit overflow-x-auto no-scrollbar">
          {[
            { id: 'overview', icon: LayoutDashboard, label: 'Stats' },
            { id: 'units', icon: Home, label: 'Units' },
            { id: 'ledger', icon: List, label: 'Ledger' },
            { id: 'branding', icon: Palette, label: 'Branding' },
            { id: 'security', icon: Key, label: 'Security' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AdminTab)}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-sm whitespace-nowrap ${activeTab === tab.id ? `${getThemeBg(config.themeColor)} text-white shadow-xl` : 'text-slate-500 hover:text-white'}`}
            >
              <tab.icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        <button onClick={() => onAuthenticate(false)} className="px-5 py-2.5 bg-white/5 text-slate-500 text-xs font-black rounded-xl hover:text-red-500 hover:bg-red-500/5 transition-all uppercase tracking-widest flex items-center gap-2 border border-white/5">
          <LogOut className="w-4 h-4" /> End Session
        </button>
      </div>

      {activeTab === 'overview' && (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4">
          <section className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6 group">
              <div className={`bg-white/5 p-5 rounded-3xl text-slate-400 group-hover:${getThemeBg(config.themeColor)} group-hover:text-white transition-all duration-500`}>
                <Users className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Meters Registered</p>
                <h4 className="text-4xl font-black text-white tabular-nums">{rooms.length}</h4>
              </div>
            </div>
            <div className="glass p-8 rounded-[2.5rem] border border-white/5 flex items-center gap-6 group">
              <div className="bg-white/5 p-5 rounded-3xl text-slate-400 group-hover:bg-emerald-600 group-hover:text-white transition-all duration-500">
                <Receipt className="w-8 h-8" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Bills</p>
                <h4 className="text-4xl font-black text-white tabular-nums">{records.length}</h4>
              </div>
            </div>
            <div className={`${getThemeBg(config.themeColor)} p-8 rounded-[2.5rem] shadow-2xl flex items-center gap-6 group relative overflow-hidden`}>
              <div className="absolute right-0 top-0 p-8 opacity-10 rotate-12 group-hover:scale-150 transition-transform duration-700"><Wallet className="w-32 h-32 text-white" /></div>
              <div className="bg-white/20 p-5 rounded-3xl text-white relative z-10"><Wallet className="w-8 h-8" /></div>
              <div className="relative z-10">
                <p className="text-[10px] font-black opacity-60 uppercase tracking-widest mb-1 text-white">Revenue Stream</p>
                <div className="flex items-baseline gap-1.5 text-white">
                  <span className="text-xs font-bold">{config.currencySymbol}</span>
                  <h4 className="text-4xl font-black tracking-tighter tabular-nums">{formatCurrency(totalCollected)}</h4>
                </div>
              </div>
            </div>
          </section>

          <div className="glass p-10 rounded-[3rem] border border-white/5">
            <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
              <SettingsIcon className="w-5 h-5 text-indigo-500" /> Regional Settings
            </h3>
            <div className="max-w-xs">
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3">Currency Symbol</label>
              <input 
                type="text" 
                value={config.currencySymbol} 
                onChange={(e) => onUpdateConfig({ currencySymbol: e.target.value })}
                className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white font-bold text-center uppercase"
              />
            </div>
          </div>
        </div>
      )}

      {activeTab === 'branding' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="glass p-10 rounded-[3rem] border border-white/5 space-y-10">
            <h3 className="text-2xl font-black text-white flex items-center gap-3">
              <Palette className="w-6 h-6 text-indigo-500" /> Identity Design
            </h3>
            
            <div className="space-y-6">
              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Application Name</label>
                <div className="flex gap-4">
                  <input 
                    type="text" 
                    value={tempAppName}
                    onChange={(e) => setTempAppName(e.target.value)}
                    className="flex-grow px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white font-bold"
                  />
                  <button 
                    onClick={() => onUpdateConfig({ appName: tempAppName })}
                    className={`px-6 ${getThemeBg(config.themeColor)} text-white rounded-2xl font-black hover:opacity-90 active:scale-95 transition-all`}
                  >
                    Save
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Global Theme Color</label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {themeColors.map(color => (
                    <button
                      key={color}
                      onClick={() => onUpdateConfig({ themeColor: color })}
                      className={`h-12 w-full rounded-2xl transition-all border-4 ${config.themeColor === color ? 'border-white scale-110 shadow-xl z-10' : 'border-transparent opacity-60 hover:opacity-100'} 
                        ${getThemeBg(color)}`}
                    />
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Custom Brand Logo</label>
                <div className="flex items-center gap-6 p-6 bg-slate-900/50 rounded-3xl border border-white/5">
                  <div className={`w-20 h-20 rounded-2xl flex items-center justify-center border-2 border-white/5 overflow-hidden ${config.appLogo ? 'bg-white' : 'bg-slate-800'}`}>
                    {logoPreview ? (
                      <img src={logoPreview} alt="Preview" className="w-full h-full object-contain" />
                    ) : (
                      <ImageIcon className="w-8 h-8 text-slate-700" />
                    )}
                  </div>
                  <div className="space-y-3">
                    <button 
                      onClick={() => logoInputRef.current?.click()}
                      className="px-6 py-3 bg-white/10 text-white text-xs font-black uppercase rounded-xl hover:bg-white/20 transition-all block w-full text-center"
                    >
                      Change Image
                    </button>
                    <button 
                      onClick={() => { setLogoPreview(null); onUpdateConfig({ appLogo: undefined }); }}
                      className="px-6 py-3 bg-red-500/10 text-red-500 text-[10px] font-black uppercase rounded-xl hover:bg-red-500/20 transition-all block w-full text-center"
                    >
                      Reset Default
                    </button>
                    <input ref={logoInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass p-10 rounded-[3rem] border border-white/5">
              <h3 className="text-xl font-black text-white mb-6">Visual Preview</h3>
              <div className="p-8 rounded-[2rem] bg-slate-900/50 border border-white/10 text-center space-y-6">
                <div className={`w-16 h-16 rounded-2xl mx-auto flex items-center justify-center shadow-lg ${getThemeBg(config.themeColor)}`}>
                  {logoPreview ? (
                    <img src={logoPreview} alt="Preview" className="w-10 h-10 object-contain" />
                  ) : (
                    <Zap className="w-8 h-8 text-white fill-white" />
                  )}
                </div>
                <div>
                  <h4 className="text-xl font-black text-white uppercase tracking-tighter">{tempAppName}</h4>
                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-1 italic">Professional Instance</p>
                </div>
                <div className="h-px bg-white/5 w-full" />
                <p className="text-xs text-slate-500 leading-relaxed px-4">Your branding will appear on headers, lock screens, and reports.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'units' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="glass p-10 rounded-[3rem] border border-white/5 h-fit">
            <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
              <Plus className="w-6 h-6 text-indigo-500" /> Add New Unit
            </h3>
            <form onSubmit={handleAdd} className="space-y-5">
              <input required type="text" placeholder="Unit Name (e.g. Room 101)" value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white font-bold" />
              <div className="grid grid-cols-3 gap-4">
                <div>
                   <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block">Opening Unit</label>
                   <input type="number" value={initialReading} onChange={(e) => setInitialReading(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white font-bold" />
                </div>
                <div>
                   <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block">Unit Rate</label>
                   <input type="number" value={initialRate} onChange={(e) => setInitialRate(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white font-bold" />
                </div>
                <div>
                   <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block">Fixed Charge</label>
                   <input type="number" value={initialRent} onChange={(e) => setInitialRent(Number(e.target.value))} className="w-full px-4 py-3 bg-slate-900 border border-white/5 rounded-xl text-white font-bold" />
                </div>
              </div>
              <button type="submit" className={`w-full ${getThemeBg(config.themeColor)} text-white py-4 rounded-2xl font-black hover:opacity-90 transition-all shadow-xl`}>Create Entry</button>
            </form>
          </div>

          <div className="space-y-4">
             <h3 className="text-xl font-black text-white px-2">Managed Units</h3>
             {rooms.map(room => (
               <div key={room.id} className="glass p-6 rounded-[2rem] border border-white/5 group hover:border-indigo-500/30 transition-all">
                  <div className="flex justify-between items-start">
                     <div>
                        <h4 className="text-lg font-black text-white mb-1">{room.name}</h4>
                        <div className="flex gap-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                           <span>{config.currencySymbol}{room.defaultUnitRate || 8}/u</span>
                           <span>{config.currencySymbol}{room.defaultFixedCharge || 500} fix</span>
                           <span>Last: {room.lastReading}</span>
                        </div>
                     </div>
                     <div className="flex gap-2">
                        <button onClick={() => { setEditingRoomId(room.id); setEditRoomData(room); }} className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-indigo-400 transition-colors"><Edit3 className="w-4 h-4" /></button>
                        <button onClick={() => onDeleteRoom(room.id)} className="p-3 bg-white/5 rounded-xl text-slate-400 hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                     </div>
                  </div>
                  {editingRoomId === room.id && (
                    <div className="mt-6 pt-6 border-t border-white/10 space-y-4 animate-in slide-in-from-top-2">
                       <div>
                          <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block px-1">Unit Name</label>
                          <input type="text" value={editRoomData.name || ''} onChange={(e) => setEditRoomData(prev => ({ ...prev, name: e.target.value }))} className="w-full bg-slate-900 p-3 rounded-xl text-sm font-bold text-white border border-white/10" placeholder="Room/Shop Name" />
                       </div>
                       <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block px-1">Unit Rate</label>
                            <input type="number" value={editRoomData.defaultUnitRate || 0} onChange={(e) => setEditRoomData(prev => ({ ...prev, defaultUnitRate: Number(e.target.value) }))} className="w-full bg-slate-900 p-3 rounded-xl text-sm font-bold text-white border border-white/10" placeholder="Rate" />
                          </div>
                          <div>
                            <label className="text-[9px] font-black text-slate-600 uppercase mb-2 block px-1">Fixed Charge</label>
                            <input type="number" value={editRoomData.defaultFixedCharge || 0} onChange={(e) => setEditRoomData(prev => ({ ...prev, defaultFixedCharge: Number(e.target.value) }))} className="w-full bg-slate-900 p-3 rounded-xl text-sm font-bold text-white border border-white/10" placeholder="Fixed" />
                          </div>
                       </div>
                       <div className="flex gap-2 pt-2">
                          <button onClick={handleSaveEdit} className={`flex-1 ${getThemeBg(config.themeColor)} text-white py-3 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-2`}>
                            <Save className="w-3.5 h-3.5" /> Save Changes
                          </button>
                          <button onClick={() => setEditingRoomId(null)} className="flex-1 bg-slate-800 text-slate-400 py-3 rounded-xl text-xs font-black uppercase">Cancel</button>
                       </div>
                    </div>
                  )}
               </div>
             ))}
          </div>
        </div>
      )}

      {activeTab === 'ledger' && (
        <div className="animate-in fade-in slide-in-from-bottom-4">
          <HistoryList title="Master Transaction Log" records={records} isAdmin={true} onDeleteRecord={onDeleteRecord} />
        </div>
      )}

      {activeTab === 'security' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 animate-in fade-in slide-in-from-bottom-4">
          <div className="space-y-10">
            <div className="glass p-10 rounded-[3rem] border border-white/5">
              <h3 className="text-2xl font-black text-white mb-8 flex items-center gap-3">
                <Key className="w-6 h-6 text-amber-500" /> System Authentication
              </h3>
              <form className="space-y-6">
                <input required type="password" placeholder="Existing Key" className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white font-bold" />
                <input required type="password" placeholder="New System Key" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white font-bold" />
                <input required type="password" placeholder="Confirm New Key" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-6 py-4 bg-slate-900 border border-white/5 rounded-2xl text-white font-bold" />
                {securityMsg && <p className={`text-[10px] font-black uppercase p-3 rounded-xl text-center ${securityMsg.type === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>{securityMsg.text}</p>}
                <button type="button" className={`w-full ${getThemeBg(config.themeColor)} text-white py-4 rounded-2xl font-black hover:opacity-90 transition-all shadow-xl`}>Update Access Key</button>
              </form>
            </div>

            <div className="glass p-10 rounded-[3rem] border border-white/5">
              <h3 className="text-2xl font-black text-white mb-6 flex items-center gap-3">
                <Smartphone className="w-6 h-6 text-indigo-400" /> Biometric Link
              </h3>
              <p className="text-sm text-slate-500 mb-8 font-medium">Use your system hardware (FaceID / Fingerprint) for rapid authentication.</p>
              
              {isBioSupported ? (
                <button 
                  onClick={toggleBiometrics}
                  className={`w-full py-6 rounded-2xl font-black text-lg transition-all flex items-center justify-center gap-4 border-2 ${isBioEnabled ? 'bg-red-500/5 border-red-500/20 text-red-500 hover:bg-red-500/10' : `${getThemeBg(config.themeColor)} border-transparent text-white hover:opacity-90 shadow-xl`}`}
                >
                  {isBioEnabled ? (
                    <>
                      <Trash2 className="w-6 h-6" /> Unlink Biometrics
                    </>
                  ) : (
                    <>
                      <Fingerprint className="w-6 h-6" /> Setup TouchID / FaceID
                    </>
                  )}
                </button>
              ) : (
                <div className="p-6 bg-slate-900/50 border border-dashed border-white/10 rounded-2xl text-center">
                  <ScanFace className="w-8 h-8 text-slate-700 mx-auto mb-3" />
                  <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Not supported on this device</p>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-6">
            <div className="glass p-10 rounded-[3rem] border border-white/5">
              <h3 className="text-xl font-black text-white mb-6">Database Portability</h3>
              <div className="flex gap-4">
                <button onClick={() => {
                  const data = storage.exportVault();
                  if (!data) return;
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url; a.download = 'vault_export.volt'; a.click();
                }} className="flex-1 flex flex-col items-center gap-3 p-6 bg-slate-900 border border-white/5 rounded-[2rem] hover:border-indigo-500 transition-all">
                  <Download className="w-8 h-8 text-indigo-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Export</span>
                </button>
                <button onClick={() => fileInputRef.current?.click()} className="flex-1 flex flex-col items-center gap-3 p-6 bg-slate-900 border border-white/5 rounded-[2rem] hover:border-emerald-500 transition-all">
                  <Upload className="w-8 h-8 text-emerald-400" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Import</span>
                  <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => {
                    const f = e.target.files?.[0]; if(!f) return;
                    const r = new FileReader(); r.onload = (ev) => {
                      try { storage.importVault(ev.target?.result as string); window.location.reload(); }
                      catch(e) { alert("Invalid import."); }
                    }; r.readAsText(f);
                  }} />
                </button>
              </div>
            </div>

            {onInstallApp && (
              <div className="glass p-10 rounded-[3rem] border border-white/5">
                <h3 className="text-xl font-black text-white mb-6 flex items-center gap-3">
                  <InstallIcon className="w-5 h-5 text-indigo-400" /> App Installation
                </h3>
                <p className="text-sm text-slate-500 mb-6 font-medium">Download this app for quick access and offline use.</p>
                <button 
                  onClick={onInstallApp}
                  className={`w-full py-4 ${getThemeBg(config.themeColor)} text-white rounded-2xl font-black hover:opacity-90 transition-all shadow-xl flex items-center justify-center gap-2`}
                >
                  <Download className="w-4 h-4" /> Install App Now
                </button>
              </div>
            )}

            <div className="p-8 border-2 border-dashed border-red-500/20 rounded-[2.5rem] bg-red-500/[0.02] flex flex-col items-center gap-4">
               <div className="flex items-center gap-2 text-red-500 text-sm font-black uppercase tracking-widest">
                 <AlertTriangle className="w-4 h-4" /> Danger Zone
               </div>
               <button onClick={() => {
                 if(window.confirm("FINAL WARNING: Wipe all local data?")) {
                   storage.clearAll(); window.location.reload();
                 }
               }} className="w-full py-4 text-[10px] font-black uppercase tracking-[0.2em] text-red-500/40 hover:text-red-500 hover:bg-red-500/5 rounded-xl transition-all border border-red-500/10">System Wipe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
