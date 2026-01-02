
import React, { useState, useEffect } from 'react';
import { Room, BillingRecord, AdminConfig } from '../types';
import { generateWhatsAppBill } from '../services/geminiService';
import { pdfService } from '../services/pdfService';
import { 
  Calculator as CalcIcon, Zap, Check, 
  Minus, Smartphone, Lock, Home, Flashlight,
  FileText, CheckCircle2, Clock
} from 'lucide-react';

interface CalculatorProps {
  room: Room;
  onSave: (record: Omit<BillingRecord, 'id' | 'date' | 'aiInsight'>) => void;
  themeColor?: AdminConfig['themeColor'];
  currencySymbol?: string;
  isViewOnly?: boolean;
  appName?: string;
}

type BillMode = 'full' | 'rent' | 'electricity';

const Calculator: React.FC<CalculatorProps> = ({ room, onSave, themeColor = 'indigo', currencySymbol = 'RS', isViewOnly = false, appName = 'VoltCalc' }) => {
  const [currentUnit, setCurrentUnit] = useState<number | ''>('');
  const [unitRate, setUnitRate] = useState<number>(room.defaultUnitRate || 8); 
  const [roomRent, setRoomRent] = useState<number>(room.defaultFixedCharge || 500);
  const [prevBalance, setPrevBalance] = useState<number>(0);
  const [mode, setMode] = useState<BillMode>('full');
  const [status, setStatus] = useState<'paid' | 'pending'>('pending');
  const [result, setResult] = useState<{ units: number, total: number } | null>(null);

  useEffect(() => {
    if (mode === 'rent') {
      setResult({ units: 0, total: roomRent + prevBalance });
    } else if (mode === 'electricity') {
      if (currentUnit !== '' && Number(currentUnit) >= room.lastReading) {
        const unitsUsed = Number(currentUnit) - room.lastReading;
        setResult({ units: unitsUsed, total: (unitsUsed * unitRate) });
      } else {
        setResult(null);
      }
    } else {
      // Full Mode
      if (currentUnit !== '' && Number(currentUnit) >= room.lastReading) {
        const unitsUsed = Number(currentUnit) - room.lastReading;
        setResult({ units: unitsUsed, total: (unitsUsed * unitRate) + roomRent + prevBalance });
      } else {
        setResult(null);
      }
    }
  }, [currentUnit, unitRate, roomRent, prevBalance, room.lastReading, mode]);

  const getRecordObject = (): BillingRecord => {
    return {
      id: 'preview-' + Math.random().toString(36).slice(2, 6),
      roomId: room.id,
      occupantName: room.name,
      previousUnit: room.lastReading,
      currentUnit: mode === 'rent' ? room.lastReading : Number(currentUnit),
      totalUnits: result?.units || 0,
      unitRate,
      roomRent: mode === 'electricity' ? 0 : roomRent,
      previousBalance: mode === 'electricity' ? 0 : prevBalance,
      totalAmount: result?.total || 0,
      date: new Date().toISOString(),
      isRentOnly: mode === 'rent',
      status: status
    };
  };

  const handleShare = async () => {
    if (!result) return;
    const billText = await generateWhatsAppBill(getRecordObject(), currencySymbol || 'RS');
    window.open(`https://wa.me/?text=${encodeURIComponent(billText)}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!result) return;
    await pdfService.generateInvoice(getRecordObject(), appName, currencySymbol || 'RS');
  };

  const themeClasses: Record<string, string> = {
    indigo: 'bg-indigo-600', rose: 'bg-rose-600', emerald: 'bg-emerald-600',
    amber: 'bg-amber-600', violet: 'bg-violet-600', cyan: 'bg-cyan-600'
  };

  const themeFocusClasses: Record<string, string> = {
    indigo: 'focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/10',
    rose: 'focus:border-rose-500/50 focus:ring-4 focus:ring-rose-500/10',
    emerald: 'focus:border-emerald-500/50 focus:ring-4 focus:ring-emerald-500/10',
    amber: 'focus:border-amber-500/50 focus:ring-4 focus:ring-amber-500/10',
    violet: 'focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/10',
    cyan: 'focus:border-cyan-500/50 focus:ring-4 focus:ring-cyan-500/10',
  };

  const themeFocusWithinClasses: Record<string, string> = {
    indigo: 'focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10',
    rose: 'focus-within:border-rose-500/50 focus-within:ring-4 focus-within:ring-rose-500/10',
    emerald: 'focus-within:border-emerald-500/50 focus-within:ring-4 focus-within:ring-emerald-500/10',
    amber: 'focus-within:border-amber-500/50 focus-within:ring-4 focus-within:ring-amber-500/10',
    violet: 'focus-within:border-violet-500/50 focus-within:ring-4 focus-within:ring-violet-500/10',
    cyan: 'focus-within:border-cyan-500/50 focus-within:ring-4 focus-within:ring-cyan-500/10',
  };

  const currentThemeBg = themeClasses[themeColor || 'indigo'];
  const currentFocusClass = themeFocusClasses[themeColor || 'indigo'];
  const currentFocusWithinClass = themeFocusWithinClasses[themeColor || 'indigo'];

  return (
    <div className="glass p-8 md:p-10 rounded-[3.5rem] border border-white/10 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col gap-6 mb-10">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-black text-white uppercase tracking-tight">E-Bill Generator</h2>
          <CalcIcon className="w-5 h-5 text-slate-700" />
        </div>
        
        <div className="flex p-1 bg-slate-900/50 rounded-2xl border border-white/5">
          <button 
            type="button" 
            onClick={() => setMode('full')}
            className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'full' ? `${currentThemeBg} text-white shadow-lg` : 'text-slate-500 hover:text-white'}`}
          >
            <Zap className="w-3 h-3" /> Full
          </button>
          <button 
            type="button" 
            onClick={() => setMode('rent')}
            className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'rent' ? `${currentThemeBg} text-white shadow-lg` : 'text-slate-500 hover:text-white'}`}
          >
            <Home className="w-3 h-3" /> Rent
          </button>
          <button 
            type="button" 
            onClick={() => setMode('electricity')}
            className={`flex-1 py-3 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${mode === 'electricity' ? `${currentThemeBg} text-white shadow-lg` : 'text-slate-500 hover:text-white'}`}
          >
            <Flashlight className="w-3 h-3" /> Electricity Only
          </button>
        </div>
      </div>

      <form className="space-y-6" onSubmit={(e) => { 
        e.preventDefault(); 
        if(!isViewOnly && result) {
          onSave({
            roomId: room.id, 
            occupantName: room.name, 
            previousUnit: room.lastReading, 
            currentUnit: mode === 'rent' ? room.lastReading : Number(currentUnit), 
            totalUnits: result.units,
            totalAmount: result.total,
            unitRate, 
            roomRent: mode === 'electricity' ? 0 : roomRent, 
            previousBalance: mode === 'electricity' ? 0 : prevBalance, 
            isRentOnly: mode === 'rent',
            status: status
          });
        }
      }}>
        <div className="bg-slate-900/50 p-6 rounded-[2.5rem] border border-white/5 space-y-6">
           {mode !== 'rent' && (
             <div className="flex flex-col items-center">
                <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2">Meter Readings</p>
                <input 
                  required 
                  type="number" 
                  value={currentUnit} 
                  onChange={(e) => setCurrentUnit(e.target.value === '' ? '' : Number(e.target.value))} 
                  className={`w-full p-4 bg-slate-950 border border-white/5 rounded-2xl text-4xl font-black text-center text-white transition-all outline-none ${currentFocusClass}`} 
                  placeholder="Current" 
                />
                <Minus className="w-5 h-5 text-slate-800 my-2" />
                <div className="w-full p-4 bg-slate-950/40 rounded-2xl text-center font-black text-slate-600 text-2xl">{room.lastReading}</div>
             </div>
           )}

           <div className={`grid ${mode === 'electricity' ? 'grid-cols-1' : 'grid-cols-2'} gap-4 pt-4 border-t border-white/5`}>
              {mode !== 'rent' && (
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Rate / Unit</p>
                   <div className={`flex items-center gap-2 bg-slate-950/40 p-2 rounded-xl border border-white/5 transition-all overflow-hidden ${currentFocusWithinClass}`}>
                     <span className="text-slate-600 text-xs pl-2">{currencySymbol}</span>
                     <input 
                        type="number" 
                        value={unitRate} 
                        onChange={(e) => setUnitRate(Number(e.target.value))} 
                        className="w-full bg-transparent font-black text-white outline-none text-lg py-1" 
                      />
                   </div>
                </div>
              )}
              {mode !== 'electricity' && (
                <div className={`space-y-1 ${mode === 'rent' ? 'col-span-2' : 'text-right'}`}>
                   <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Fixed Rent</p>
                   <div className={`flex items-center gap-2 bg-slate-950/40 p-2 rounded-xl border border-white/5 transition-all overflow-hidden ${mode === 'rent' ? 'justify-start' : 'justify-end'} ${currentFocusWithinClass}`}>
                     {mode === 'rent' && <span className="text-slate-600 text-xs pl-2">{currencySymbol}</span>}
                     <input 
                        type="number" 
                        value={roomRent} 
                        onChange={(e) => setRoomRent(Number(e.target.value))} 
                        className={`w-full bg-transparent font-black text-white outline-none text-lg py-1 ${mode === 'rent' ? 'text-left' : 'text-right'}`} 
                      />
                     {mode !== 'rent' && <span className="text-slate-600 text-xs pr-2">{currencySymbol}</span>}
                   </div>
                </div>
              )}
           </div>

           {mode !== 'electricity' && (
             <div className="pt-4 border-t border-white/5">
                <div className="space-y-1">
                   <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest">Previous Arrears</p>
                   <div className={`flex items-center gap-2 bg-slate-950/40 p-2 rounded-xl border border-white/5 transition-all overflow-hidden ${currentFocusWithinClass}`}>
                     <span className="text-slate-600 text-xs pl-2">{currencySymbol}</span>
                     <input 
                        type="number" 
                        value={prevBalance} 
                        onChange={(e) => setPrevBalance(Number(e.target.value))} 
                        className="w-full bg-transparent font-black text-white outline-none text-lg py-1" 
                      />
                   </div>
                </div>
             </div>
           )}
        </div>

        {result && (
          <div className="bg-slate-950/80 p-6 rounded-[2.5rem] border border-white/10 animate-in fade-in zoom-in shadow-inner text-center">
             <div className="flex justify-center mb-4">
                <button 
                  type="button" 
                  onClick={() => setStatus(status === 'paid' ? 'pending' : 'paid')}
                  className={`px-4 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 ${status === 'paid' ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'bg-amber-600 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]'}`}
                >
                  {status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                  Payment: {status.toUpperCase()}
                </button>
             </div>
             
             <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-1">
               {mode === 'full' ? 'Grand Total Due' : mode === 'rent' ? 'Rent Subtotal' : 'Electricity Cost Only'}
             </p>
             <p className="text-5xl font-black text-white tracking-tighter">{currencySymbol} {result.total.toLocaleString()}</p>
             {result.units > 0 && mode !== 'rent' && (
               <p className="text-[10px] text-slate-500 font-bold mt-2 uppercase tracking-widest">{result.units} units consumed</p>
             )}
             <div className="flex flex-col sm:flex-row gap-2 mt-6">
                <button type="button" onClick={handleShare} className="flex-1 py-4 bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-emerald-600/20 transition-all">
                   <Smartphone className="w-3.5 h-3.5" /> WhatsApp
                </button>
                <button type="button" onClick={handleDownloadPDF} className="flex-1 py-4 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-2xl font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-indigo-600/20 transition-all">
                   <FileText className="w-3.5 h-3.5" /> PDF Invoice
                </button>
             </div>
          </div>
        )}

        {isViewOnly ? (
          <div className="w-full py-6 bg-slate-800/50 text-slate-500 font-black rounded-[2rem] flex items-center justify-center gap-3 border border-white/5 italic text-sm">
            <Lock className="w-5 h-5" /> Calculation Mode Only
          </div>
        ) : (
          <button type="submit" disabled={!result} className={`w-full py-6 ${currentThemeBg} text-white font-black rounded-[2rem] shadow-xl active:scale-95 disabled:opacity-20 flex items-center justify-center gap-3 hover:opacity-90 transition-all`}>
            <Check className="w-6 h-6" /> Save Record
          </button>
        )}
      </form>
    </div>
  );
};

export default Calculator;
