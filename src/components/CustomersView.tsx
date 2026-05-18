import React, { useState } from 'react';
import { Plus, Search, Mail, Phone, Users, MapPin, MoreVertical, Loader2, Trash2, Edit2 } from 'lucide-react';
import { Customer, SystemUser } from '../types';
import { formatCurrency } from '../lib/utils';
import { useCollection, dbService } from '../lib/db';
import { orderBy } from 'firebase/firestore';
import { AddCustomerModal } from './AddCustomerModal';

export const CustomersView = ({ user }: { user: SystemUser | null }) => {
  const { data: customers, loading } = useCollection<Customer>('customers', orderBy('name'));
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);

  const isAdmin = user?.role === 'owner' || user?.role === 'admin';

  const handleDelete = async (id: string, name: string) => {
    if (!isAdmin) {
      alert("Only admins can remove customer records.");
      return;
    }
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
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight font-display">Client Directory</h1>
          <p className="text-slate-500 font-medium tracking-tight">Track consumer relationships and loyalty records</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-8 py-3 rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase text-[10px] font-black tracking-widest active:scale-95"
          >
            <Plus size={20} />
            <span>Register Client</span>
          </button>
        </div>
      </div>

      <div className="relative group max-w-2xl">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2 block">Quick Search</label>
        <div className="relative">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input
            type="text"
            placeholder="Search by name, phone, or id..."
            className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-inner transition-all text-slate-900 font-bold placeholder:font-normal"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <AddCustomerModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((customer) => (
          <div key={customer.id} className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-md hover:border-blue-100 transition-all group relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-[0.03] text-blue-600 rotate-12">
              <Users size={120} />
            </div>
            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 font-bold text-2xl group-hover:bg-blue-600 group-hover:text-white transition-all transform group-hover:rotate-6">
                {customer.name[0]}
              </div>
              <div className="flex gap-1">
                {isAdmin && (
                  <button 
                    onClick={() => handleDelete(customer.id, customer.name)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
              </div>
            </div>
            <h3 className="font-bold text-xl text-slate-900 font-display uppercase tracking-tight">{customer.name}</h3>
            <div className="mt-4 space-y-3 relative z-10">
              <div className="flex items-center gap-3 text-sm text-slate-500 font-medium">
                <Phone size={16} className="text-blue-500" />
                {customer.phone || 'NO_CONTACT_DATA'}
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1 bg-green-50 rounded-full border border-green-100">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-700">
                    {customer.points} Loyalty Points
                  </span>
                </div>
              </div>
            </div>
            <div className="mt-8 pt-6 border-t border-slate-50 flex justify-between items-end relative z-10">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 leading-none mb-1">Portfolio Value</p>
                <p className="text-2xl font-black text-slate-900 font-mono tracking-tighter">{formatCurrency(customer.totalSpent)}</p>
              </div>
              <div className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Active Client</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
