
import React, { useState, useMemo } from 'react';
import { BillingRecord } from '../types';
import { generateWhatsAppBill } from '../services/geminiService';
import { pdfService } from '../services/pdfService';
import { 
  Calendar, Smartphone, Trash2, CheckCircle2, 
  Clock, Zap, FileText, CheckSquare, Square, 
  CreditCard, X, Calculator
} from 'lucide-react';

interface HistoryListProps {
  records: BillingRecord[];
  isAdmin: boolean;
  onDeleteRecord?: (id: string) => void;
  onToggleStatus?: (id: string) => void;
  onBulkMarkAsPaid?: (ids: string[]) => void;
  currencySymbol?: string;
  appName?: string;
}

const HistoryList: React.FC<HistoryListProps> = ({ 
  records, 
  isAdmin, 
  onDeleteRecord, 
  onToggleStatus, 
  onBulkMarkAsPaid,
  currencySymbol = 'RS', 
  appName = 'VoltCalc' 
}) => {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const pendingRecords = useMemo(() => 
    records.filter(r => r.status === 'pending'), 
    [records]
  );

  const selectionStats = useMemo(() => {
    let count = 0;
    let total = 0;
    selectedIds.forEach(id => {
      const record = records.find(r => r.id === id);
      if (record && record.status === 'pending') {
        count++;
        total += record.totalAmount;
      }
    });
    return { count, total };
  }, [selectedIds, records]);

  const handleShare = async (record: BillingRecord) => {
    const billText = await generateWhatsAppBill(record, currencySymbol);
    window.open(`https://wa.me/?text=${encodeURIComponent(billText)}`, '_blank');
  };

  const handleDownloadPDF = async (record: BillingRecord) => {
    await pdfService.generateInvoice(record, appName, currencySymbol);
  };

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAllPending = () => {
    if (selectionStats.count === pendingRecords.length && pendingRecords.length > 0) {
      const newSelected = new Set(selectedIds);
      pendingRecords.forEach(r => newSelected.delete(r.id));
      setSelectedIds(newSelected);
    } else {
      const newSelected = new Set(selectedIds);
      pendingRecords.forEach(r => newSelected.add(r.id));
      setSelectedIds(newSelected);
    }
  };

  const handleBulkPay = () => {
    if (!onBulkMarkAsPaid) return;
    const pendingIdsToPay = Array.from(selectedIds).filter(id => {
      const r = records.find(rec => rec.id === id);
      return r && r.status === 'pending';
    });
    onBulkMarkAsPaid(pendingIdsToPay);
    setSelectedIds(new Set());
  };

  return (
    <div className="space-y-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h2 className="text-2xl font-black text-white">Activity Ledger</h2>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-1">
            {records.length} records found • {pendingRecords.length} pending
          </p>
        </div>
        
        {isAdmin && pendingRecords.length > 0 && (
          <button 
            onClick={toggleSelectAllPending}
            className="group text-[9px] font-black text-indigo-400 uppercase tracking-widest hover:text-indigo-300 transition-all flex items-center gap-2"
          >
            {selectionStats.count === pendingRecords.length ? (
              <CheckSquare className="w-4 h-4 text-indigo-400" />
            ) : (
              <Square className="w-4 h-4 text-slate-700 group-hover:text-indigo-400" />
            )}
            {selectionStats.count === pendingRecords.length ? 'Deselect All' : 'Select All Pending'}
          </button>
        )}
      </div>

      {/* Bulk Action Bar with Total Amount Calculation */}
      {isAdmin && selectionStats.count > 0 && (
        <div className="sticky top-24 z-40 animate-in slide-in-from-top-4 fade-in duration-500">
          <div className="glass bg-indigo-600 border-indigo-400/30 p-4 rounded-3xl shadow-[0_20px_50px_rgba(79,70,229,0.3)] flex items-center justify-between">
            <div className="flex items-center gap-4 pl-2">
              <div className="bg-white/10 p-2.5 rounded-2xl">
                <Calculator className="w-5 h-5 text-white" />
              </div>
              <div className="border-r border-white/10 pr-4">
                <p className="text-white font-black text-sm uppercase tracking-tight leading-none mb-1">
                  {selectionStats.count} Selected
                </p>
                <p className="text-indigo-200 text-[8px] font-black uppercase tracking-widest">Bulk Pay Ready</p>
              </div>
              <div>
                <p className="text-white font-black text-lg leading-none mb-1">
                  {currencySymbol} {selectionStats.total.toLocaleString()}
                </p>
                <p className="text-indigo-200 text-[8px] font-black uppercase tracking-widest">Total Collection</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={() => setSelectedIds(new Set())}
                className="p-2.5 text-white/50 hover:text-white transition-colors hover:bg-white/10 rounded-xl"
                title="Cancel selection"
              >
                <X className="w-5 h-5" />
              </button>
              <button 
                onClick={handleBulkPay}
                className="bg-white text-indigo-600 px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:scale-[1.03] active:scale-95 transition-all shadow-xl shadow-indigo-900/20 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Mark as Paid
              </button>
            </div>
          </div>
        </div>
      )}
      
      {records.length === 0 ? (
        <div className="text-center py-24 glass rounded-[3rem] border border-white/5 opacity-50">
          <Clock className="w-12 h-12 mx-auto mb-4 text-slate-700" />
          <p className="font-black uppercase tracking-widest text-[10px] text-slate-600">No history found for this unit</p>
        </div>
      ) : (
        <div className="space-y-4">
          {records.map(record => (
            <div 
              key={record.id} 
              className={`glass p-8 rounded-[3rem] border transition-all group relative overflow-hidden ${selectedIds.has(record.id) ? 'border-indigo-500 bg-indigo-500/10' : 'border-white/5 hover:border-white/10'}`}
            >
              {isAdmin && record.status === 'pending' && (
                <button 
                  onClick={() => toggleSelect(record.id)}
                  className={`absolute left-0 top-0 bottom-0 w-14 flex items-center justify-center transition-all border-r border-transparent ${selectedIds.has(record.id) ? 'bg-indigo-600 text-white border-white/10' : 'text-slate-800 hover:text-slate-400'}`}
                >
                  {selectedIds.has(record.id) ? <CheckSquare className="w-6 h-6" /> : <Square className="w-6 h-6" />}
                </button>
              )}

              <div className={isAdmin && record.status === 'pending' ? 'pl-10' : ''}>
                <div className="flex justify-between items-start mb-6">
                  <div className="space-y-1">
                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">
                        <Calendar className="w-3.5 h-3.5 text-indigo-500/50" /> {new Date(record.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                     </div>
                     <h4 className="text-xl font-black text-white">{record.occupantName}</h4>
                     <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-slate-600 tracking-tight">{record.previousUnit} <span className="text-slate-800">→</span> {record.currentUnit}</span>
                        <span className="text-[8px] px-2 py-0.5 bg-indigo-500/10 text-indigo-400 rounded-lg font-black uppercase tracking-widest">{record.totalUnits} UNITS</span>
                     </div>
                  </div>
                  <div className="text-right">
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Invoice Total</p>
                     <p className={`text-2xl font-black transition-colors ${record.status === 'paid' ? 'text-emerald-400' : 'text-white'}`}>
                        {currencySymbol} {record.totalAmount.toLocaleString()}
                     </p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                   <div className="flex gap-2">
                     <button onClick={() => handleShare(record)} className="px-3.5 py-2.5 bg-emerald-500/10 text-emerald-500 rounded-2xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-emerald-500/20 transition-all active:scale-95" title="Send WhatsApp">
                        <Smartphone className="w-4 h-4" />
                     </button>
                     <button onClick={() => handleDownloadPDF(record)} className="px-3.5 py-2.5 bg-indigo-500/10 text-indigo-400 rounded-2xl text-[9px] font-black uppercase flex items-center gap-2 hover:bg-indigo-600/20 transition-all active:scale-95" title="Download PDF">
                        <FileText className="w-4 h-4" />
                     </button>
                     {record.aiInsight && record.aiInsight !== 'Generating efficiency plan...' && (
                       <div className="hidden lg:flex px-4 py-2.5 bg-slate-800/50 text-slate-400 rounded-2xl text-[9px] font-black uppercase items-center gap-2 border border-white/5">
                          <Zap className="w-3.5 h-3.5 text-amber-500" /> AI Insight
                       </div>
                     )}
                   </div>
                   <div className="flex items-center gap-3">
                     {isAdmin && onDeleteRecord && (
                       <button onClick={() => onDeleteRecord(record.id)} className="p-2.5 text-slate-800 hover:text-red-500 transition-colors hover:bg-red-500/5 rounded-xl">
                         <Trash2 className="w-4.5 h-4.5" />
                       </button>
                     )}
                     <button 
                      onClick={() => isAdmin && onToggleStatus && onToggleStatus(record.id)}
                      disabled={!isAdmin}
                      className={`px-5 py-2.5 rounded-2xl text-[9px] font-black uppercase flex items-center gap-2 transition-all active:scale-95 ${record.status === 'paid' ? 'bg-emerald-600/10 text-emerald-500 border border-emerald-500/20 hover:bg-emerald-500/20' : 'bg-amber-600 text-white hover:bg-amber-500 shadow-lg shadow-amber-900/30'}`}
                     >
                        {record.status === 'paid' ? <CheckCircle2 className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                        {record.status?.toUpperCase() || 'PENDING'}
                     </button>
                   </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default HistoryList;
