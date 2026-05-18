import React, { useState } from 'react';
import { 
  Database, 
  Shield, 
  Bell, 
  Smartphone, 
  User, 
  Save, 
  Loader2, 
  RefreshCw, 
  UserPlus, 
  Mail, 
  ShieldCheck,
  Search,
  Trash2
} from 'lucide-react';
import { dbService, useCollection } from '../lib/db';
import { serverTimestamp, orderBy } from 'firebase/firestore';
import { SystemUser } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export const SettingsView = () => {
  const { data: users, loading: usersLoading } = useCollection<SystemUser>('users', orderBy('name'));
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(() => Number(localStorage.getItem('dailyTarget')) || 5000);

  const saveTarget = () => {
    localStorage.setItem('dailyTarget', dailyTarget.toString());
    alert("Daily target saved!");
  };

  const deleteDatabase = async () => {
    if (!confirm("CRITICAL WARNING: Are you sure you want to PERMANENTLY DELETE ALL products, sales, and customer data? This cannot be undone.")) return;
    
    setIsDeleting(true);
    try {
      const collections = ['products', 'sales', 'customers', 'suppliers', 'purchases'];
      for (const coll of collections) {
         const snap = await dbService.list(coll);
         for (const doc of snap) {
           await dbService.remove(coll, doc.id);
         }
      }
      alert("Database wiped successfully.");
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Failed to delete database.");
    } finally {
      setIsDeleting(false);
    }
  };
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    role: 'cashier' as const
  });

  const seedDatabase = async () => {
    setIsSeeding(true);
    try {
      // Seed Products
      const products = [
        { barcode: '123456789', name: 'Piattos Cheese 40g', costPrice: 12, sellingPrice: 15, stockLevel: 24, category: 'Snacks', supplierId: 'S1' },
        { barcode: '987654321', name: 'Coke 1.5L', costPrice: 65, sellingPrice: 75, stockLevel: 10, category: 'Beverages', supplierId: 'S1' },
        { barcode: '112233445', name: 'Bear Brand 33g', costPrice: 14, sellingPrice: 16, stockLevel: 50, category: 'Milk', supplierId: 'S2' },
      ];

      for (const p of products) {
        await dbService.add('products', { ...p, updatedAt: serverTimestamp() });
      }

      // Seed Suppliers
      const suppliers = [
        { name: 'Mega Beverages Inc.', contactPerson: 'John Smith', phone: '09123334444', email: 'sales@megabev.com' },
        { name: 'Valley Snacks Corp.', contactPerson: 'Jane Doe', phone: '09224445555', email: 'orders@valleysnacks.ph' },
      ];

      for (const s of suppliers) {
        await dbService.add('suppliers', s);
      }

      alert("Database seeded successfully!");
    } catch (error) {
      console.error(error);
      alert("Failed to seed database. Check console for details.");
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Database size={18} className="text-blue-500" />
            Database & System
          </h2>
        </div>
        <div className="p-8 space-y-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">Seed Initial Data</h3>
              <p className="text-sm text-slate-500">Populate your inventory and suppliers with sample data for testing.</p>
            </div>
            <button 
              onClick={seedDatabase}
              disabled={isSeeding}
              className="flex items-center gap-2 bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-all font-bold text-xs uppercase tracking-wider disabled:opacity-50"
            >
              {isSeeding ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {isSeeding ? 'Seeding...' : 'Seed Data'}
            </button>
          </div>

          <div className="pt-6 border-t border-slate-100 flex items-start justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-slate-900">Cloud Backup</h3>
              <p className="text-sm text-slate-500">Automatically sync transactions to secure backup servers.</p>
            </div>
            <div className="flex items-center gap-2 text-green-600 text-xs font-black uppercase tracking-widest">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              Active
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 flex items-center gap-1.5">
            <TrendingUp size={18} className="text-blue-500" />
            Performance & Targets
          </h2>
        </div>
        <div className="p-8">
          <div className="flex items-end gap-6 max-w-lg">
            <div className="flex-1 space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Sales Target (PHP)</label>
              <input 
                type="number" 
                value={dailyTarget}
                onChange={(e) => setDailyTarget(Number(e.target.value))}
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-black focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              />
            </div>
            <button 
              onClick={saveTarget}
              className="bg-slate-900 text-white px-8 py-4 rounded-xl font-black uppercase tracking-widest text-[10px] hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
            >
              Save Target
            </button>
          </div>
        </div>
      </div>

      <div className="bg-red-50 rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-red-200 bg-red-100/50">
          <h2 className="font-bold text-red-900 flex items-center gap-1.5">
            <Trash2 size={18} />
            Danger Zone
          </h2>
        </div>
        <div className="p-8">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="font-bold text-red-900">Reset Store Database</h3>
              <p className="text-sm text-red-600/70 font-medium">Permanently delete all inventory, sales, and accounts.</p>
            </div>
            <button 
              disabled={isDeleting}
              onClick={deleteDatabase}
              className="bg-red-600 text-white px-6 py-3 rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-red-700 transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-red-200"
            >
              {isDeleting ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />}
              {isDeleting ? "Wiping..." : "Delete All Data"}
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Shield size={18} className="text-blue-500" />
            Security & Access
          </h2>
        </div>
        <div className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Store Manager PIN</label>
              <input 
                type="password" 
                defaultValue="••••"
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Auto-Logout Timer</label>
              <select className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option>15 Minutes of Inactivity</option>
                <option>30 Minutes of Inactivity</option>
                <option>1 Hour of Inactivity</option>
                <option>Never</option>
              </select>
            </div>
          </div>
          
          <button className="bg-slate-900 text-white w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200">
            Save Security Policy
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <UserPlus size={18} className="text-blue-500" />
            Staff & Admin Accounts
          </h2>
          <button 
            onClick={() => setIsAddingUser(true)}
            className="text-[10px] font-black uppercase tracking-widest bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-all"
          >
            Add New User
          </button>
        </div>
        <div className="p-8">
          {usersLoading ? (
            <div className="flex justify-center p-4">
              <Loader2 className="animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="space-y-4">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-white border border-slate-200 flex items-center justify-center font-bold text-slate-400 group-hover:text-blue-500 transition-colors">
                      {u.name[0]}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 text-sm">{u.name}</p>
                      <p className="text-xs text-slate-500 font-medium">{u.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className={cn(
                      "text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full",
                      u.role === 'owner' ? "bg-amber-100 text-amber-600" :
                      u.role === 'admin' ? "bg-blue-100 text-blue-600" :
                      "bg-slate-200 text-slate-500"
                    )}>
                      {u.role}
                    </span>
                    <button className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Add User Modal Integration */}
      {isAddingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddingUser(false)} />
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative w-full max-w-md bg-white rounded-[2rem] p-8 shadow-2xl"
          >
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <UserPlus className="text-blue-600" size={24} />
              Create Staff Account
            </h2>
            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                await dbService.add('users', { ...newUserData, createdAt: serverTimestamp() });
                setIsAddingUser(false);
                setNewUserData({ name: '', email: '', role: 'cashier' });
              } catch (err) {
                console.error(err);
                alert("Only Owners can manage accounts.");
              }
            }} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Full Name</label>
                <input 
                  required
                  type="text" 
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. Maria Clara"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Email Address</label>
                <input 
                  required
                  type="email" 
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="staff@email.com"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Assigned Role</label>
                <select 
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as any })}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                >
                  <option value="cashier">Cashier (Standard Access)</option>
                  <option value="admin">Admin (Managerial Access)</option>
                  <option value="owner">Owner (Full Access)</option>
                </select>
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="flex-1 py-3 font-bold text-slate-500 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200"
                >
                  Create User
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};
