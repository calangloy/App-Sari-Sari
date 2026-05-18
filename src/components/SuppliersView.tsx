import React, { useState } from 'react';
import { Plus, Search, Mail, Phone, User, Landmark, Loader2 } from 'lucide-react';
import { Supplier } from '../types';
import { useCollection } from '../lib/db';
import { orderBy } from 'firebase/firestore';
import { AddSupplierModal } from './AddSupplierModal';

export const SuppliersView = () => {
  const { data: suppliers, loading } = useCollection<Supplier>('suppliers', orderBy('name'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((supplier) => (
          <div key={supplier.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-3 bg-slate-50 text-slate-800 rounded-xl group-hover:bg-blue-50 group-hover:text-blue-600 transition-colors">
                <Landmark size={24} />
              </div>
              <h3 className="font-black text-lg text-slate-900 line-clamp-1">{supplier.name}</h3>
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
              <button className="flex-1 text-[10px] font-black uppercase tracking-widest text-slate-400 bg-slate-50 py-3 rounded-lg hover:bg-slate-100 hover:text-slate-600 transition-colors">
                Purchase Log
              </button>
              <button className="flex-1 text-[10px] font-black uppercase tracking-widest text-white bg-blue-600 py-3 rounded-lg hover:bg-blue-700 shadow-md shadow-blue-100 transition-colors">
                Order Now
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
