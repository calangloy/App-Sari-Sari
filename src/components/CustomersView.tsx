import React, { useState } from 'react';
import { Plus, Search, Mail, Phone, MapPin, MoreVertical, Loader2, Trash2, Edit2 } from 'lucide-react';
import { Customer } from '../types';
import { formatCurrency } from '../lib/utils';
import { useCollection, dbService } from '../lib/db';
import { orderBy } from 'firebase/firestore';
import { AddCustomerModal } from './AddCustomerModal';

export const CustomersView = () => {
  const { data: customers, loading } = useCollection<Customer>('customers', orderBy('name'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Permanently remove ${name} from records?`)) return;
    try {
      await dbService.remove('customers', id);
    } catch (error) {
      console.error(error);
      alert("Failed to delete customer.");
    }
  };

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone?.includes(searchTerm)
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
            placeholder="Search customers..."
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
          <span>Add New Customer</span>
        </button>
      </div>

      <AddCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((customer) => (
          <div key={customer.id} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group">
            <div className="flex justify-between items-start mb-4">
              <div className="w-12 h-12 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-xl group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                {customer.name[0]}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleDelete(customer.id, customer.name)}
                  className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <h3 className="font-bold text-lg text-slate-900">{customer.name}</h3>
            <div className="mt-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-slate-500 font-medium">
                <Phone size={14} className="text-slate-300" />
                {customer.phone || 'No phone recorded'}
              </div>
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-slate-400">
                <div className="w-2 h-2 rounded-full bg-green-400 shadow-sm shadow-green-200" />
                Loyalty: <span className="text-green-600">{customer.points} PTS</span>
              </div>
            </div>
            <div className="mt-6 pt-4 border-t border-slate-50 flex justify-between items-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">Life-time Value</span>
              <span className="font-black text-slate-900 border-b-2 border-blue-100">{formatCurrency(customer.totalSpent)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
