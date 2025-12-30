
import React from 'react';
import { BillingRecord } from '../types';
import { Zap, Calendar, Wallet, AlertCircle, TrendingDown, ArrowUpRight, Trash2 } from 'lucide-react';

interface HistoryListProps {
  title?: string;
  records: BillingRecord[];
  isAdmin: boolean;
  onDeleteRecord?: (id: string) => void;
}

const HistoryList: React.FC<HistoryListProps> = ({ title = "History", records, isAdmin, onDeleteRecord }) => {
  const formatCurrency = (val: number) => {
    return val.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  };

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-black text-white tracking-tight">{title}</h2>
        <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest bg-white/5 px-4 py-2 rounded-full border border-white/5">
          {records.length} Records
        </div>
      </div>

      {records.length > 0 ? (
        <div className="space-y-6 relative">
          <div className="absolute left-6 top-8 bottom-8 w-px bg-white/5" />
          
          {records.map((record) => (
            <div key={record.id} className="relative pl-14 group">
              <div className="absolute left-[1.35rem] top-10 w-2.5 h-2.5 rounded-full bg-slate-800 border-2 border-indigo-600 group-hover:scale-150 transition-transform duration-500 z-10" />
              
              <div className="glass rounded-[2rem] border border-white/5 overflow-hidden group-hover:border-white/10 transition-all duration-500">
                <div className="p-8">
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-6 mb-8">
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] bg-indigo-500/5 px-3 py-1.5 rounded-full">
                          <Calendar className="w-3.5 h-3.5" />
                          {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </div>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{record.occupantName}</span>
                      </div>
                      <div className="flex items-baseline gap-2 pt-2">
                        <h3 className="text-4xl font-black text-white tracking-tighter tabular-nums group-hover:text-indigo-400 transition-colors">
                          {formatCurrency(record.totalAmount)}
                        </h3>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 self-end sm:self-auto">
                      <div className="flex items-center gap-2">
                        <div className="bg-emerald-500/10 text-emerald-500 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border border-emerald-500/10 flex items-center gap-2">
                          <ArrowUpRight className="w-4 h-4" />
                          {record.totalUnits} Units
                        </div>
                        {isAdmin && onDeleteRecord && (
                          <button onClick={() => onDeleteRecord(record.id)} className="p-2.5 bg-red-500/5 text-red-500/40 hover:text-red-500 hover:bg-red-500/10 rounded-xl transition-all">
                             <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-6 bg-slate-900/40 rounded-3xl border border-white/5">
                    <div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">Meters</span>
                      <p className="text-sm font-bold text-slate-300">{record.previousUnit} → {record.currentUnit}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">Unit Rate</span>
                      <p className="text-sm font-bold text-slate-300">{record.unitRate}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest block mb-1">Rent/Tax</span>
                      <p className="text-sm font-bold text-slate-300">{formatCurrency(record.roomRent)}</p>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest block mb-1">Subtotal</span>
                      <p className="text-sm font-bold text-indigo-400">{formatCurrency(record.totalUnits * record.unitRate)}</p>
                    </div>
                  </div>

                  {record.aiInsight && (
                    <div className="mt-6 p-5 bg-indigo-600/5 border border-indigo-500/10 rounded-2xl flex gap-4">
                      <div className="bg-indigo-600/10 p-3 rounded-xl h-fit"><Zap className="w-5 h-5 text-indigo-400 fill-indigo-400" /></div>
                      <div>
                        <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Eco-Insight</h4>
                        <p className="text-sm text-slate-400 font-medium italic">"{record.aiInsight}"</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-32 glass rounded-[3rem] border border-white/5">
          <TrendingDown className="w-16 h-16 text-slate-700 mx-auto mb-6" />
          <h3 className="text-2xl font-black text-white mb-2 tracking-tight">Ledger Empty</h3>
          <p className="text-slate-500 text-sm font-medium">No activity recorded yet.</p>
        </div>
      )}
    </div>
  );
};

export default HistoryList;
