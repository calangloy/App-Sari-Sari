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
  Trash2,
  TrendingUp
} from 'lucide-react';
import { dbService, useCollection } from '../lib/db';
import { serverTimestamp, orderBy, doc, setDoc } from 'firebase/firestore';
import { db, createInternalAuthUser } from '../lib/firebase';
import { SystemUser } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export const SettingsView = ({ user }: { user: SystemUser | null }) => {
  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(() => Number(localStorage.getItem('dailyTarget')) || 5000);

  const saveTarget = () => {
    localStorage.setItem('dailyTarget', dailyTarget.toString());
    alert("Daily target saved!");
  };

  const deleteDatabase = async () => {
    if (user?.role !== 'owner') {
      alert("Only the store owner can perform a full system reset.");
      return;
    }
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

  const seedDatabase = async () => {
    if (user?.role !== 'owner' && user?.role !== 'admin') {
      alert("Unauthorized action.");
      return;
    }
    setIsSeeding(true);
    try {
      // 1. Seed Suppliers first and get their IDs
      const suppliersData = [
        { name: 'Mega Beverages Inc.', contactPerson: 'John Smith', phone: '09123334444', email: 'sales@megabev.com' },
        { name: 'Valley Snacks Corp.', contactPerson: 'Jane Doe', phone: '09224445555', email: 'orders@valleysnacks.ph' },
      ];

      const supplierIds: string[] = [];
      for (const s of suppliersData) {
        const docRef = await dbService.add('suppliers', s);
        if (docRef) supplierIds.push(docRef.id);
      }

      const defaultSupplierId = supplierIds[0] || 'manual-entry';
      const secondSupplierId = supplierIds[1] || defaultSupplierId;

      // 2. Seed Products with real supplier IDs
      const productsData = [
        { barcode: '123456789', name: 'Piattos Cheese 40g', costPrice: 12, sellingPrice: 15, stockLevel: 24, category: 'Snacks', supplierId: defaultSupplierId },
        { barcode: '987654321', name: 'Coke 1.5L', costPrice: 65, sellingPrice: 75, stockLevel: 10, category: 'Beverages', supplierId: defaultSupplierId },
        { barcode: '112233445', name: 'Bear Brand 33g', costPrice: 14, sellingPrice: 16, stockLevel: 50, category: 'Milk', supplierId: secondSupplierId },
      ];

      for (const p of productsData) {
        await dbService.add('products', { ...p, updatedAt: serverTimestamp() });
      }

      alert("Database seeded successfully with linked suppliers!");
    } catch (error) {
      console.error(error);
      alert("Failed to seed database. Check console for details.");
    } finally {
      setIsSeeding(false);
    }
  };

  // Skip the rest of the file view for now to target the specific removal

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

    </div>
  );
};
