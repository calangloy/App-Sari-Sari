import React from 'react';
import { X, Landmark, Calendar, Package, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useCollection } from '../lib/db';
import { Purchase, Supplier } from '../types';
import { formatCurrency } from '../lib/utils';
import { where, orderBy } from 'firebase/firestore';

interface PurchaseLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  supplier: Supplier;
}

export const PurchaseLogModal = ({ isOpen, onClose, supplier }: PurchaseLogModalProps) => {
  const { data: rawPurchases, loading } = useCollection<Purchase>(
    'purchases',
    where('supplierId', '==', supplier.id || '')
  );

  const purchases = [...rawPurchases].sort((a, b) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-2xl bg-white rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]"
          >
            <div className="bg-slate-900 p-6 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <Landmark className="text-white" size={20} />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">{supplier.name} History</h2>
                  <p className="text-xs text-slate-400 font-medium">All historical purchase orders</p>
                </div>
              </div>
              <button onClick={onClose} className="text-slate-400 hover:text-white"><X size={24} /></button>
            </div>

            <div className="flex-1 overflow-y-auto p-6">
              {loading ? (
                <div className="flex justify-center py-12">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : (
                <div className="space-y-4">
                  {purchases.map(purchase => (
                    <div key={purchase.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-[10px] uppercase tracking-widest">
                          <Calendar size={12} />
                          {new Date(purchase.timestamp).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <span className="text-blue-600 font-black text-lg">{formatCurrency(purchase.total)}</span>
                      </div>
                      
                      <div className="space-y-2">
                        {purchase.items.map((item, idx) => (
                          <div key={idx} className="flex justify-between text-sm">
                            <div className="flex items-center gap-2">
                              <Package size={14} className="text-slate-300" />
                              <span className="text-slate-700 font-medium">{item.name}</span>
                              <span className="text-slate-400">x{item.quantity}</span>
                            </div>
                            <span className="text-slate-500">{formatCurrency(item.cost * item.quantity)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="mt-4 pt-3 border-t border-slate-200/60 flex justify-between items-center">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Status</span>
                        <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                          {purchase.status}
                        </span>
                      </div>
                    </div>
                  ))}
                  {purchases.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-300">
                      <TrendingUp size={48} strokeWidth={1} />
                      <p className="text-xs font-black uppercase tracking-widest mt-4">No purchases found</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
