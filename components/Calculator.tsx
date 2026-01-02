
import React, { useState, useEffect } from 'react';
import { Room, BillingRecord } from '../types';
import { 
  Calculator as CalcIcon, Zap, Check, 
  Minus, FileText, Share2
} from 'lucide-react';

interface CalculatorProps {
  room: Room;
  onSave: (record: Omit<BillingRecord, 'id' | 'date' | 'aiInsight'>) => void;
  currencySymbol?: string;
}

const Calculator: React.FC<CalculatorProps> = ({ room, onSave, currencySymbol = 'RS' }) => {
  const [currentUnit, setCurrentUnit] = useState<number | ''>('');
  const [unitRate, setUnitRate] = useState<number>(8);
  const [roomRent, setRoomRent] = useState<number>(500);
  const [total, setTotal] = useState(0);
  const [unitsUsed, setUnitsUsed] = useState(0);

  useEffect(() => {
    const used = currentUnit !== '' ? (Number(currentUnit) - room.lastReading) : 0;
    setUnitsUsed(used > 0 ? used : 0);
    setTotal(used > 0 ? (used * unitRate) + roomRent : roomRent);
  }, [currentUnit, unitRate, roomRent, room.lastReading]);

  return (
    <div className="glass p-10 rounded-[4rem] border-white/10 shadow-3xl space-y-10">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-white italic">Bill Compute</h2>
        <CalcIcon className="w-5 h-5 text-slate-700" />
      </div>

      <div className="space-y-6">
        <div className="bg-slate-950/50 p-8 rounded-[3rem] border border-white/5 space-y-8">
          <div className="flex flex-col items-center">
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Reading Delta</p>
            <div className="w-full flex items-center gap-4">
               <input 
                type="number" 
                placeholder="Current Reading" 
                value={currentUnit} 
                onChange={e => setCurrentUnit(e.target.value === '' ? '' : Number(e.target.value))}
                className="flex-grow bg-slate-900 border border-white/10 rounded-2xl p-6 text-3xl font-black text-white text-center outline-none focus:border-cyan-500/50 transition-all"
              />
            </div>
            <div className="w-full flex items-center justify-between px-4 mt-6">
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Previous</p>
                <p className="text-lg font-black text-slate-400">{room.lastReading}</p>
              </div>
              <Minus className="w-4 h-4 text-slate-700" />
              <div className="text-center">
                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Consumption</p>
                <p className="text-lg font-black text-cyan-400">{unitsUsed} Units</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-950/30 p-5 rounded-3xl border border-white/5">
             <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Rate / Unit</p>
             <input type="number" value={unitRate} onChange={e => setUnitRate(Number(e.target.value))} className="w-full bg-transparent text-xl font-black text-white outline-none" />
          </div>
          <div className="bg-slate-950/30 p-5 rounded-3xl border border-white/5">
             <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-2">Fixed Rent</p>
             <input type="number" value={roomRent} onChange={e => setRoomRent(Number(e.target.value))} className="w-full bg-transparent text-xl font-black text-white outline-none" />
          </div>
        </div>
      </div>

      <div className="pt-8 border-t border-white/5 text-center">
         <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Total Amount Due</p>
         <div className="text-6xl font-black text-white tracking-tighter">
            <span className="text-2xl align-top mr-1 text-slate-500">{currencySymbol}</span>
            {total.toLocaleString()}
         </div>
         
         <div className="flex gap-2 mt-10">
            <button 
              onClick={() => onSave({
                roomId: room.id,
                occupantName: room.name,
                previousUnit: room.lastReading,
                currentUnit: Number(currentUnit),
                totalUnits: unitsUsed,
                unitRate,
                roomRent,
                previousBalance: 0,
                totalAmount: total,
                status: 'pending'
              })}
              disabled={!currentUnit}
              className="flex-grow bg-indigo-600 hover:bg-indigo-500 text-white py-5 rounded-[2.5rem] font-black uppercase text-[11px] tracking-widest transition-all shadow-xl disabled:opacity-20 flex items-center justify-center gap-3"
            >
              <Check className="w-5 h-5" /> Secure Record
            </button>
            <button className="p-5 bg-emerald-600/10 text-emerald-500 rounded-[2.5rem] hover:bg-emerald-600/20 transition-all">
              <Share2 className="w-6 h-6" />
            </button>
         </div>
      </div>
    </div>
  );
};

export default Calculator;
