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
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Search suppliers..."
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100 uppercase text-xs font-bold tracking-wider"
        >
          <Plus size={18} />
          <span>Add New Supplier</span>
        </button>
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
          <div key={supplier.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
            <div className="flex justify-between items-start mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 bg-slate-50 text-slate-800 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                  <Landmark size={24} />
                </div>
                <h3 className="font-black text-lg text-slate-900 line-clamp-1">{supplier.name}</h3>
              </div>
              {isAdmin && (
                <button 
                  onClick={() => handleDelete(supplier.id, supplier.name)}
                  className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              )}
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center gap-3 text-sm text-slate-600 font-medium">
                <User size={16} className="text-slate-300" />
                <span>{supplier.contactPerson}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Phone size={16} className="text-slate-300" />
                <span>{supplier.phone}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <Mail size={16} className="text-slate-300" />
                <span className="truncate">{supplier.email}</span>
              </div>
            </div>

            <div className="mt-8 flex gap-2">
              <button 
                onClick={() => openLog(supplier)}
                className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 py-3 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors"
              >
                Purchase Log
              </button>
              <button 
                onClick={() => openOrder(supplier)}
                className="flex-1 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 py-3 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-100 transition-colors"
              >
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
