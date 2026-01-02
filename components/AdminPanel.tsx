
import React, { useState } from 'react';
import { AdminConfig, Room, BillingRecord, PartnerAccess } from '../types';
import { 
  Users, ShieldCheck, Globe, Palette,
  Trash2, Plus, Lock, Settings,
  Type, Coins, ShieldAlert, X, Check,
  RefreshCw, Database, CloudUpload, Link,
  AlertCircle
} from 'lucide-react';

interface AdminPanelProps {
  config: AdminConfig;
  rooms: Room[];
  records: BillingRecord[];
  currentUserRole: 'owner' | 'admin' | 'viewer';
  onUpdateConfig: (newConfig: Partial<AdminConfig>) => void;
  onAddRoom: (name: string, initial?: number) => void;
  onDeleteRoom: (id: string) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
  rooms, config, currentUserRole, onAddRoom, onDeleteRoom, onUpdateConfig 
}) => {
  const [activeTab, setActiveTab] = useState<'users' | 'units' | 'settings'>('units');
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pinAttempt, setPinAttempt] = useState('');
  const [pinError, setPinError] = useState(false);
  
  const [newPartnerId, setNewPartnerId] = useState('');
  const [newPartnerPin, setNewPartnerPin] = useState('');
  const [newPartnerRole, setNewPartnerRole] = useState<'admin' | 'viewer'>('viewer');
  
  const [isAddingMeter, setIsAddingMeter] = useState(false);
  const [newMeterName, setNewMeterName] = useState('');
  const [newMeterInitial, setNewMeterInitial] = useState(0);

  const [isSyncing, setIsSyncing] = useState(false);

  const handleCreateMeter = () => {
    if (newMeterName.trim()) {
      onAddRoom(newMeterName, newMeterInitial);
      setNewMeterName('');
      setNewMeterInitial(0);
      setIsAddingMeter(false);
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinAttempt === config.pin) {
      setIsUnlocked(true);
      setPinError(false);
    } else {
      setPinError(true);
      setPinAttempt('');
      setTimeout(() => setPinError(false), 2000);
    }
  };

  const handleAddPartner = () => {
    if (currentUserRole !== 'owner') return;
    if (newPartnerId && newPartnerPin.length === 4) {
      const newPartner: PartnerAccess = {
        id: newPartnerId,
        name: newPartnerId,
        pin: newPartnerPin,
        role: newPartnerRole
      };
      onUpdateConfig({ partners: [...config.partners, newPartner] });
      setNewPartnerId('');
      setNewPartnerPin('');
    }
  };

  const handleSyncToGoogleSheets = async () => {
    if (!config.googleSheetUrl) return;
    setIsSyncing(true);
    
    try {
      const payload = {
        timestamp: new Date().toISOString(),
        appName: config.appName,
        ownerId: config.userId,
        recoveryEmail: config.recoveryEmail,
        pin: config.pin,
        totalMeters: rooms.length,
        totalRecords: (config as any).recordsCount || 0,
        action: 'manual_sync'
      };

      await fetch(config.googleSheetUrl, {
        method: 'POST',
        mode: 'no-cors',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      alert("ID and PIN successfully saved to Google Sheets!");
    } catch (err) {
      console.error("Sync Error:", err);
      alert("Cloud Sync failed. Verify your Webhook URL.");
    } finally {
      setIsSyncing(false);
    }
  };

  const isOwner = currentUserRole === 'owner';
  const isRestricted = currentUserRole === 'viewer';

  const themes: Array<{id: AdminConfig['themeColor'], color: string}> = [
    { id: 'indigo', color: 'bg-indigo-600' },
    { id: 'rose', color: 'bg-rose-600' },
    { id: 'emerald', color: 'bg-emerald-600' },
    { id: 'amber', color: 'bg-amber-600' },
    { id: 'violet', color: 'bg-violet-600' },
    { id: 'cyan', color: 'bg-cyan-600' },
  ];

  if (isOwner && (activeTab === 'settings' || activeTab === 'users') && !isUnlocked) {
    return (
      <div className="flex items-center justify-center py-20 animate-in fade-in zoom-in duration-500">
        <div className="glass max-w-sm w-full p-10 rounded-[3.5rem] border border-indigo-500/20 text-center shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-indigo-500 animate-pulse" />
          <div className="w-16 h-16 bg-indigo-600/10 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Lock className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-2xl font-black text-white italic mb-2">Settings Locked</h3>
          <p className="text-slate-500 text-[9px] font-black uppercase tracking-widest mb-8">Re-verify Master PIN to continue</p>
          
          <form onSubmit={handleVerifyPin} className="space-y-4">
            <input 
              autoFocus
              type="password" 
              maxLength={4} 
              placeholder="••••" 
              value={pinAttempt}
              onChange={(e) => setPinAttempt(e.target.value.replace(/\D/g, ''))}
              className={`w-full p-4 bg-slate-950 border rounded-2xl text-center text-3xl font-black tracking-[0.5em] transition-all outline-none ${pinError ? 'border-red-500 animate-shake' : 'border-white/5 focus:border-indigo-500/50'}`}
            />
            {pinError && <p className="text-red-500 text-[9px] font-black uppercase tracking-widest">Invalid Owner PIN</p>}
            <button type="submit" className="w-full py-5 bg-indigo-600 text-white font-black rounded-3xl shadow-lg active:scale-95 transition-all">Unlock Panel</button>
            <button type="button" onClick={() => setActiveTab('units')} className="text-slate-600 text-[10px] font-black uppercase tracking-widest mt-4">Abort & Return</button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom">
      <div className="flex bg-slate-900/50 p-1 rounded-2xl border border-white/5 w-fit overflow-x-auto no-scrollbar">
        {[
          { id: 'settings', icon: Settings, label: 'Global', hidden: !isOwner },
          { id: 'users', icon: Users, label: 'Partners', hidden: !isOwner },
          { id: 'units', icon: ShieldCheck, label: 'Meters', hidden: false },
        ].filter(t => !t.hidden).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all text-[10px] uppercase tracking-widest whitespace-nowrap ${activeTab === tab.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500 hover:text-white'}`}
          >
            <tab.icon className="w-4 h-4" /> <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {!isOwner && activeTab !== 'units' && (
        <div className="glass p-10 rounded-[3rem] border border-white/5 text-center flex flex-col items-center gap-4">
           <ShieldAlert className="w-12 h-12 text-amber-500" />
           <h3 className="text-xl font-black text-white">Access Restricted</h3>
           <p className="text-slate-500 text-sm max-w-sm">User management and global configuration are locked to the Primary Vault Admin.</p>
        </div>
      )}

      {activeTab === 'settings' && isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass p-10 rounded-[3.5rem] border border-white/5 space-y-8">
            <div className="flex items-center gap-3 mb-2">
              <Settings className="w-6 h-6 text-indigo-400" />
              <h3 className="text-2xl font-black text-white italic">App Configuration</h3>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Type className="w-3 h-3" /> Application Name
                </label>
                <input 
                  type="text" 
                  value={config.appName} 
                  onChange={(e) => onUpdateConfig({ appName: e.target.value })} 
                  className="w-full px-6 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white font-bold focus:border-indigo-500/50 outline-none" 
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Coins className="w-3 h-3" /> Currency Symbol
                </label>
                <input 
                  type="text" 
                  value={config.currencySymbol} 
                  onChange={(e) => onUpdateConfig({ currencySymbol: e.target.value })} 
                  className="w-full px-6 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white font-bold focus:border-indigo-500/50 outline-none" 
                />
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                  <Palette className="w-3 h-3" /> System Theme
                </label>
                <div className="flex flex-wrap gap-3">
                  {themes.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => onUpdateConfig({ themeColor: t.id })}
                      className={`w-10 h-10 rounded-full ${t.color} border-4 transition-all ${config.themeColor === t.id ? 'border-white scale-110 shadow-lg' : 'border-transparent opacity-40 hover:opacity-100'}`}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-8">
            <div className="glass p-10 rounded-[3.5rem] border border-indigo-500/10 space-y-6">
              <div className="flex items-center gap-3">
                <Database className="w-6 h-6 text-emerald-400" />
                <h3 className="text-xl font-black text-white">Cloud Backup (Google Sheets)</h3>
              </div>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                Automatically saves your Access ID and Master PIN to your private Google Sheet.
              </p>
              
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest flex items-center gap-2 ml-2">
                  <Link className="w-3 h-3" /> Webhook URL
                </label>
                <input 
                  type="url" 
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={config.googleSheetUrl}
                  onChange={(e) => onUpdateConfig({ googleSheetUrl: e.target.value })}
                  className="w-full px-5 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white text-xs font-mono outline-none focus:border-emerald-500/30"
                />
              </div>

              <div className="bg-amber-500/10 p-4 rounded-2xl border border-amber-500/20 flex items-start gap-3">
                <AlertCircle className="w-4 h-4 text-amber-500 mt-1 flex-shrink-0" />
                <p className="text-[8px] text-amber-200 font-black uppercase tracking-widest leading-normal">
                  Your ID and Password are sent to this URL for safe cloud storage. Make sure your Apps Script is set to 'Anyone' can access.
                </p>
              </div>

              <button 
                onClick={handleSyncToGoogleSheets}
                disabled={!config.googleSheetUrl || isSyncing}
                className={`w-full py-5 rounded-3xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-3 transition-all ${isSyncing ? 'bg-slate-800 text-slate-500' : 'bg-emerald-600 text-white shadow-xl hover:bg-emerald-500 shadow-emerald-900/20 active:scale-95'}`}
              >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudUpload className="w-4 h-4" />}
                {isSyncing ? 'Synchronizing Credentials...' : 'Save ID & PIN to Cloud'}
              </button>
            </div>

            <div className="glass p-8 rounded-[3rem] border border-white/5 flex items-center gap-4">
              <div className="bg-indigo-500/10 p-4 rounded-2xl"><Globe className="w-6 h-6 text-indigo-400" /></div>
              <div>
                <h4 className="text-sm font-black text-white uppercase tracking-tight">Security Status</h4>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest">
                  {config.googleSheetUrl ? 'Cloud Backup Active' : 'Local Storage Only'}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'users' && isOwner && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass p-10 rounded-[3.5rem] border border-white/5 space-y-8">
            <h3 className="text-2xl font-black text-white italic">Add Shared Access</h3>
            <p className="text-sm text-slate-500">Authorized partners can access specific parts of this vault.</p>
            <div className="space-y-4">
              <input type="text" placeholder="Partner Access ID" value={newPartnerId} onChange={(e) => setNewPartnerId(e.target.value)} className="w-full px-6 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white font-bold" />
              <input type="password" maxLength={4} placeholder="Partner 4-Digit PIN" value={newPartnerPin} onChange={(e) => setNewPartnerPin(e.target.value.replace(/\D/g, ''))} className="w-full px-6 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white font-bold text-center" />
              
              <div className="flex items-center gap-2 p-2 bg-slate-950 rounded-2xl border border-white/5">
                <button 
                  onClick={() => setNewPartnerRole('viewer')}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newPartnerRole === 'viewer' ? 'bg-slate-700 text-white' : 'text-slate-500'}`}
                >
                  Viewer
                </button>
                <button 
                  onClick={() => setNewPartnerRole('admin')}
                  className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase transition-all ${newPartnerRole === 'admin' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-500'}`}
                >
                  Admin Helper
                </button>
              </div>

              <button onClick={handleAddPartner} className="w-full py-5 bg-indigo-600 text-white font-black rounded-[2rem] shadow-xl">Confirm Partner</button>
            </div>
          </div>
          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-4">Authorized Registry</h4>
            {config.partners.map(p => (
              <div key={p.id} className="glass p-6 rounded-[2rem] border border-white/5 flex justify-between items-center">
                 <div className="flex items-center gap-4">
                    <div className="bg-white/5 p-3 rounded-xl"><Users className="w-5 h-5 text-indigo-400" /></div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-black text-white">{p.id}</p>
                        <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${p.role === 'admin' ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-700 text-slate-400'}`}>
                          {p.role}
                        </span>
                      </div>
                      <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">Active Connection</p>
                    </div>
                 </div>
                 <button onClick={() => onUpdateConfig({ partners: config.partners.filter(u => u.id !== p.id) })} className="p-3 text-red-500/40 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                 </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === 'units' && (
        <div className="glass p-10 rounded-[3rem] border border-white/5 h-fit">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-2xl font-black text-white italic">Meter Registry</h3>
            {isRestricted && (
              <div className="flex items-center gap-2 text-slate-500 text-[8px] font-black uppercase">
                <Lock className="w-3 h-3" /> Read Only
              </div>
            )}
          </div>
          <div className="space-y-2">
            {rooms.map(room => (
              <div key={room.id} className="flex justify-between items-center p-6 bg-white/5 rounded-3xl border border-white/5 group hover:border-indigo-500/20 transition-all">
                <div>
                  <p className="font-black text-white text-lg">{room.name}</p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">Base Value: {room.lastReading} Units</p>
                </div>
                {!isRestricted && (
                  <button onClick={() => onDeleteRoom(room.id)} className="p-3 text-slate-700 hover:text-red-500 transition-colors rounded-xl hover:bg-red-500/5">
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>
            ))}
          </div>
          
          {!isRestricted && (
            <div className="mt-8">
              {isAddingMeter ? (
                <div className="p-6 bg-indigo-600/5 rounded-[2.5rem] border border-indigo-500/20 space-y-4 animate-in zoom-in-95 duration-200">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-4">Meter Point Name</label>
                    <input 
                      autoFocus
                      type="text" 
                      placeholder="e.g. Second Floor" 
                      value={newMeterName} 
                      onChange={(e) => setNewMeterName(e.target.value)}
                      className="w-full px-6 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-4">Initial Reading</label>
                    <input 
                      type="number" 
                      placeholder="0" 
                      value={newMeterInitial} 
                      onChange={(e) => setNewMeterInitial(Number(e.target.value))}
                      className="w-full px-6 py-4 bg-slate-950 border border-white/5 rounded-2xl text-white font-bold outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={handleCreateMeter}
                      className="flex-grow py-4 bg-indigo-600 text-white font-black rounded-2xl flex items-center justify-center gap-2"
                    >
                      <Check className="w-4 h-4" /> Save Meter
                    </button>
                    <button 
                      onClick={() => setIsAddingMeter(false)}
                      className="px-6 py-4 bg-slate-800 text-slate-400 font-black rounded-2xl flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ) : (
                <button 
                  onClick={() => setIsAddingMeter(true)} 
                  className="w-full py-5 bg-white/5 border border-white/10 text-white font-black rounded-[2rem] hover:bg-white/10 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <Plus className="w-5 h-5" /> New Metering Unit
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
