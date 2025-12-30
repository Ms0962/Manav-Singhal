
import React, { useState, useEffect } from 'react';
import { Room, BillingRecord, AdminConfig } from '../types';
import { Calculator as CalcIcon, Zap, AlertCircle, RefreshCcw, Check } from 'lucide-react';

interface CalculatorProps {
  room: Room;
  onSave: (record: Omit<BillingRecord, 'id' | 'date' | 'aiInsight'>) => void;
  themeColor?: AdminConfig['themeColor'];
}

const Calculator: React.FC<CalculatorProps> = ({ room, onSave, themeColor = 'indigo' }) => {
  const [currentUnit, setCurrentUnit] = useState<number | ''>('');
  const [unitRate, setUnitRate] = useState<number>(room.defaultUnitRate || 8); 
  const [roomRent, setRoomRent] = useState<number>(room.defaultFixedCharge || 500);
  const [prevBalance, setPrevBalance] = useState<number>(0);
  const [mode, setMode] = useState<'room' | 'shop'>(room.type || 'room');
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const [result, setResult] = useState<{
    units: number;
    energyCharge: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    setUnitRate(room.defaultUnitRate || 8);
    setRoomRent(room.defaultFixedCharge || 500);
    setMode(room.type || 'room');
  }, [room]);

  useEffect(() => {
    if (currentUnit !== '') {
      const unitsUsed = Number(currentUnit) - room.lastReading;
      if (unitsUsed >= 0) {
        const energyCharge = unitsUsed * unitRate;
        const total = energyCharge + roomRent + prevBalance;
        setResult({ units: unitsUsed, energyCharge, total });
      } else {
        setResult(null);
      }
    } else {
      setResult(null);
    }
  }, [currentUnit, unitRate, roomRent, prevBalance, room.lastReading]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (result && currentUnit !== '' && !isSaving) {
      setIsSaving(true);
      try {
        await onSave({
          roomId: room.id,
          occupantName: room.name,
          previousUnit: room.lastReading,
          currentUnit: Number(currentUnit),
          totalUnits: result.units,
          unitRate: unitRate,
          roomRent: roomRent,
          previousBalance: prevBalance,
          totalAmount: result.total,
        });
        setCurrentUnit('');
        setPrevBalance(0);
        setShowSuccess(true);
        setTimeout(() => setShowSuccess(false), 2000);
      } finally {
        setIsSaving(false);
      }
    }
  };

  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  const themeClasses: Record<string, string> = {
    indigo: 'bg-indigo-600 hover:bg-indigo-500',
    rose: 'bg-rose-600 hover:bg-rose-500',
    emerald: 'bg-emerald-600 hover:bg-emerald-500',
    amber: 'bg-amber-600 hover:bg-amber-500',
    violet: 'bg-violet-600 hover:bg-violet-500',
    cyan: 'bg-cyan-600 hover:bg-cyan-500',
  };

  const currentThemeBg = themeColor && themeClasses[themeColor] 
    ? themeClasses[themeColor] 
    : themeClasses.indigo;
    
  const currentThemeText = `text-${themeColor}-400`;

  const isValidReading = currentUnit !== '' && Number(currentUnit) >= room.lastReading;

  return (
    <div className="space-y-6">
      <div className="glass p-8 rounded-[2.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-20"><CalcIcon className={`w-16 h-16 ${currentThemeText}`} /></div>
        <h2 className="text-xl font-black mb-8 flex items-center gap-3 text-white"><Zap className={`w-6 h-6 ${currentThemeText} fill-current`} /> New Invoice</h2>
        
        <div className="flex bg-slate-900/50 p-1 rounded-2xl mb-8 border border-white/5">
          <button type="button" onClick={() => setMode('room')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'room' ? `${currentThemeBg} text-white shadow-lg` : 'text-slate-500 hover:text-white'}`}>Domestic</button>
          <button type="button" onClick={() => setMode('shop')} className={`flex-1 py-3 rounded-xl font-bold transition-all text-sm ${mode === 'shop' ? `${currentThemeBg} text-white shadow-lg` : 'text-slate-500 hover:text-white'}`}>Commercial</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white/5 p-5 rounded-3xl border border-white/5 flex items-center justify-between">
            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Opening Reading</div>
            <div className="text-xl font-black text-white tabular-nums">{room.lastReading.toLocaleString()}</div>
          </div>

          <div>
            <label className="block text-xs font-black text-slate-500 uppercase tracking-widest mb-3 px-1">Closing Reading</label>
            <input required type="number" min={room.lastReading} value={currentUnit} onChange={(e) => setCurrentUnit(e.target.value === '' ? '' : Number(e.target.value))} placeholder="Enter current value" className={`w-full px-6 py-5 bg-slate-900/80 border ${isValidReading ? 'border-white/10' : 'border-red-500/50'} rounded-3xl focus:ring-4 outline-none transition-all text-xl font-black text-white tabular-nums`} />
            {!isValidReading && currentUnit !== '' && (
              <p className="text-[10px] text-red-500 font-bold mt-2 px-2 flex items-center gap-1.5 uppercase tracking-widest">
                <AlertCircle className="w-3 h-3" /> Reading must be &ge; {room.lastReading}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Rate/Unit</label>
              <input type="number" value={unitRate} onChange={(e) => setUnitRate(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-900/80 border border-white/10 rounded-2xl text-white font-bold text-sm" />
            </div>
            <div>
              <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Fixed Fee</label>
              <input type="number" value={roomRent} onChange={(e) => setRoomRent(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-900/80 border border-white/10 rounded-2xl text-white font-bold text-sm" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 px-1">Adjustments (Arrears)</label>
            <input type="number" min="0" value={prevBalance} onChange={(e) => setPrevBalance(Number(e.target.value))} className="w-full px-5 py-4 bg-slate-900/80 border border-white/10 rounded-2xl text-white font-bold text-sm" />
          </div>

          {result && (
            <div className="pt-6 border-t border-white/5 space-y-4 animate-in fade-in zoom-in-95">
              <div className={`${currentThemeBg}/10 p-6 rounded-[2rem] border ${currentThemeText}/10 shadow-inner`}>
                {/* Fix: Corrected syntax error in template literal (rogue backslash and missing closing brace) which was preventing correct parsing. */}
                <p className={`text-[10px] font-black ${currentThemeText} uppercase tracking-[0.2em] mb-1 transition-colors`}>Total Payable</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-5xl font-black text-white tracking-tighter tabular-nums">{formatCurrency(result.total)}</span>
                </div>
              </div>
            </div>
          )}

          <div className="pt-4">
            <button 
              type="submit" 
              disabled={!isValidReading || isSaving} 
              className={`w-full py-5 ${showSuccess ? 'bg-emerald-600' : currentThemeBg} disabled:bg-slate-800 disabled:text-slate-600 disabled:cursor-not-allowed text-white font-black rounded-3xl transition-all flex items-center justify-center gap-3 text-lg active:scale-95 group/btn shadow-xl`}
            >
              {isSaving ? (
                <RefreshCcw className="w-5 h-5 animate-spin" />
              ) : showSuccess ? (
                <Check className="w-5 h-5" />
              ) : (
                <CalcIcon className="w-5 h-5 group-hover/btn:rotate-12 transition-transform" /> 
              )}
              {isSaving ? 'Saving...' : showSuccess ? 'Recorded!' : 'Save Transaction'}
            </button>
            {!isValidReading && !isSaving && (
              <p className="text-center text-[9px] font-black text-slate-600 uppercase tracking-[0.1em] mt-3">Valid reading required to save</p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
};

export default Calculator;
