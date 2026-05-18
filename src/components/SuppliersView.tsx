import React, { useState } from 'react';
import { Plus, Search, Mail, Phone, User, Landmark, Loader2, Trash2, Edit2 } from 'lucide-react';
import { Supplier, SystemUser } from '../types';
import { useCollection, dbService } from '../lib/db';
import { orderBy } from 'firebase/firestore';
import { AddSupplierModal } from './AddSupplierModal';
import { PurchaseOrderModal } from './PurchaseOrderModal';
import { PurchaseLogModal } from './PurchaseLogModal';

export const SuppliersView = ({ user }: { user: SystemUser | null }) => {
  const { data: suppliers, loading } = useCollection<Supplier>('suppliers', orderBy('name'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [isOrderModalOpen, setIsOrderModalOpen] = useState(false);
  const [isLogModalOpen, setIsLogModalOpen] = useState(false);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const openOrder = (supplier: Supplier) => {
    if (!isAdmin) {
      alert("Unauthorized: Only managers can place orders.");
      return;
    }
    setSelectedSupplier(supplier);
    setIsOrderModalOpen(true);
  };

  const openLog = (supplier: Supplier) => {
    setSelectedSupplier(supplier);
    setIsLogModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from suppliers? This won't delete purchase logs.`)) return;
    try {
      await dbService.remove('suppliers', id);
    } catch (error) {
      console.error(error);
      alert("Failed to delete supplier.");
    }
  };

  const filtered = suppliers.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.contactPerson?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight font-display">Supply Chain</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium tracking-tight">Manage vendor partnerships and procurement logistics</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 dark:bg-blue-500 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 dark:hover:bg-blue-600 transition-all shadow-lg shadow-blue-100 dark:shadow-none uppercase text-[10px] font-black tracking-widest active:scale-95"
          >
            <Plus size={20} />
            <span>Add Partner</span>
          </button>
        </div>
      </div>

      <div className="relative group max-w-2xl">
        <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-2 block">Quick Search</label>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by vendor name or contact person..."
            className="w-full pl-14 pr-6 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner transition-all text-slate-900 dark:text-white font-bold placeholder:font-normal"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <AddSupplierModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {selectedSupplier && (
        <>
          <PurchaseOrderModal 
            isOpen={isOrderModalOpen} 
            onClose={() => setIsOrderModalOpen(false)} 
            supplier={selectedSupplier} 
          />
          <PurchaseLogModal 
            isOpen={isLogModalOpen} 
            onClose={() => setIsLogModalOpen(false)} 
            supplier={selectedSupplier} 
          />
        </>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((supplier) => (
          <div key={supplier.id} className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md hover:border-blue-100 dark:hover:border-blue-900 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] dark:opacity-[0.07] text-blue-600 dark:text-blue-400 rotate-12">
              <Landmark size={120} />
            </div>
            
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="p-4 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:-rotate-6 border border-slate-100 dark:border-slate-700">
                  <Landmark size={28} />
                </div>
                <div>
                  <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight leading-tight">{supplier.name}</h3>
                  <div className="text-[10px] text-blue-500 dark:text-blue-400 font-black uppercase tracking-widest mt-1">Verified Supplier</div>
                </div>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => handleDelete(supplier.id, supplier.name)}
                  className="p-2 text-slate-300 dark:text-slate-600 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={20} />
                </button>
              )}
            </div>
            
            <div className="space-y-4 relative z-10">
              <div className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 font-medium">
                <User size={18} className="text-blue-500/50 dark:text-blue-400/50" />
                <span className="font-bold">{supplier.contactPerson}</span>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-500">
                  <Phone size={16} />
                  <span>{supplier.phone}</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-500 dark:text-slate-500">
                  <Mail size={16} />
                  <span className="truncate">{supplier.email}</span>
                </div>
              </div>
            </div>

            <div className="mt-10 flex gap-3 relative z-10">
              <button 
                onClick={() => openLog(supplier)}
                className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 py-4 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700"
              >
                Log History
              </button>
              <button 
                onClick={() => openOrder(supplier)}
                className="flex-1 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 dark:bg-blue-500 py-4 rounded-xl hover:bg-blue-700 dark:hover:bg-blue-400 shadow-lg shadow-blue-100 dark:shadow-none transition-all active:scale-95"
              >
                Procure Stock
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
