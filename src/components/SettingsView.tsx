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
  TrendingUp,
  Download,
  Upload,
  Clock,
  AlertTriangle
} from 'lucide-react';
import { dbService, useCollection } from '../lib/db';
import { serverTimestamp, orderBy, doc, setDoc } from 'firebase/firestore';
import { db, createInternalAuthUser } from '../lib/firebase';
import { SystemUser } from '../types';
import { cn } from '../lib/utils';
import { motion } from 'motion/react';

export const SettingsView = ({ user }: { user: SystemUser | null }) => {
  const { data: storeSettingsData } = useCollection<any>('settings');
  const storeSettings = storeSettingsData.find(s => s.id === 'store') || {
    name: 'Sari-Sari Pro Store',
    address: '123 Market Street, City',
    phone: '0917-000-0000',
    logoUrl: '',
    taxRate: 0.12 // 12% default VAT
  };

  const [isSeeding, setIsSeeding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);
  const [isSavingGcash, setIsSavingGcash] = useState(false);
  const [dailyTarget, setDailyTarget] = useState(() => Number(localStorage.getItem('dailyTarget')) || 5000);

  const saveStoreSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated = {
      name: formData.get('name') as string,
      address: formData.get('address') as string,
      phone: formData.get('phone') as string,
      logoUrl: formData.get('logoUrl') as string,
      taxRate: Number(formData.get('taxRate')),
      receiptFootnote: formData.get('receiptFootnote') as string,
      businessHours: formData.get('businessHours') as string,
      lowStockThreshold: Number(formData.get('lowStockThreshold')) || 5
    };
    try {
      await dbService.set('settings', 'store', updated);
      alert("Store configuration updated successfully!");
    } catch (err) {
      alert("Failed to update store settings.");
    }
  };

  const saveSecurityPolicy = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updated = {
      managerPin: formData.get('managerPin') as string,
      autoLogout: formData.get('autoLogout') as string,
    };
    setIsSavingSecurity(true);
    try {
      await dbService.set('settings', 'store', updated);
      alert("Security policy updated successfully!");
    } catch (err) {
      alert("Failed to update security policy.");
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const saveGcashSettings = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const gcashApiKey = (formData.get('gcashApiKey') as string || '').trim();
    setIsSavingGcash(true);
    try {
      await dbService.set('settings', 'store', { gcashApiKey });
      alert("GCash API Configuration Saved successfully!");
    } catch (err) {
      alert("Failed to save GCash API Configuration.");
    } finally {
      setIsSavingGcash(false);
    }
  };

  const exportDatabase = async () => {
    if (user?.role !== 'owner') {
      alert("Only the store owner can export the full database.");
      return;
    }
    setIsExporting(true);
    try {
      const collections = ['products', 'sales', 'customers', 'suppliers', 'purchases', 'settings'];
      const backup: Record<string, any[]> = {};
      
      for (const coll of collections) {
        backup[coll] = await dbService.list(coll);
      }

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `sarisaripro_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(error);
      alert("Failed to export database.");
    } finally {
      setIsExporting(false);
    }
  };

  const importDatabase = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("WARNING: Importing data will merge with existing records or overwrite settings. It's recommended to reset the database before a full restore. Proceed?")) return;

    setIsImporting(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const backup = JSON.parse(event.target?.result as string);
          
          for (const coll in backup) {
            const items = backup[coll];
            for (const item of items) {
              const { id, ...data } = item;
              // Avoid overwriting updatedAt with static string if it exists
              if (data.updatedAt) delete data.updatedAt;
              await dbService.set(coll, id, data);
            }
          }
          
          alert("Database imported successfully! Refreshing...");
          window.location.reload();
        } catch (err) {
          console.error(err);
          alert("Invalid backup file format.");
        }
      };
      reader.readAsText(file);
    } catch (error) {
      console.error(error);
      alert("Failed to read backup file.");
    } finally {
      setIsImporting(false);
      e.target.value = ''; // Reset input
    }
  };

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
      localStorage.removeItem('dailyTarget');
      localStorage.removeItem('dailyTarget_progress'); 
      alert("Database wiped successfully. Settings reset.");
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
    <div key={storeSettingsData.length > 0 ? 'loaded' : 'loading'} className="max-w-4xl space-y-8 animate-in fade-in duration-500">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <ShieldCheck size={18} className="text-blue-500" />
            Store Identity & Receipt
          </h2>
        </div>
        <div className="p-8">
          <form onSubmit={saveStoreSettings} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Store Name</label>
                <input 
                  name="name"
                  defaultValue={storeSettings.name}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact Number</label>
                <input 
                  name="phone"
                  defaultValue={storeSettings.phone}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Store Address</label>
                <input 
                  name="address"
                  defaultValue={storeSettings.address}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 placeholder:font-normal"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Logo URL (Optional)</label>
                <input 
                  name="logoUrl"
                  defaultValue={storeSettings.logoUrl}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="https://..."
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">VAT/Tax Rate (%)</label>
                <input 
                  type="number"
                  step="0.01"
                  name="taxRate"
                  defaultValue={storeSettings.taxRate}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Receipt Footnote / Thank You Message</label>
                <input 
                  name="receiptFootnote"
                  defaultValue={storeSettings.receiptFootnote || 'THANK YOU FOR YOUR BUSINESS!'}
                  placeholder="e.g. Please come back again!"
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Business Hours</label>
                <input 
                  name="businessHours"
                  placeholder="e.g. 7:00 AM - 10:00 PM"
                  defaultValue={storeSettings.businessHours || 'Open Daily 6 AM - 11 PM'}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5 mb-1">
                   <AlertTriangle size={12} className="text-amber-500" />
                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Low Stock Alert Threshold</label>
                </div>
                <input 
                  name="lowStockThreshold"
                  type="number"
                  defaultValue={storeSettings.lowStockThreshold || 5}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                />
              </div>
            </div>
            <div className="flex justify-end pt-4">
              <button 
                type="submit"
                className="bg-blue-600 text-white px-8 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-shadow shadow-lg shadow-blue-200 flex items-center gap-2"
              >
                <Save size={16} />
                Save Store Details
              </button>
            </div>
          </form>
        </div>
      </div>

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
              <h3 className="font-bold text-slate-900">Database Backup & Recovery</h3>
              <p className="text-sm text-slate-500">Download a full clone of your store data or restore from a previous backup.</p>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={exportDatabase}
                disabled={isExporting}
                className="flex items-center gap-2 bg-slate-100 text-slate-700 px-6 py-2.5 rounded-lg hover:bg-slate-200 transition-all font-bold text-xs uppercase tracking-wider"
              >
                {isExporting ? <Loader2 className="animate-spin" size={16} /> : <Download size={16} />}
                Export JSON
              </button>
              <div className="relative">
                <input
                  type="file"
                  accept=".json"
                  onChange={importDatabase}
                  className="absolute inset-0 opacity-0 cursor-pointer"
                  disabled={isImporting}
                />
                <button 
                  disabled={isImporting}
                  className="flex items-center gap-2 bg-slate-900 text-white px-6 py-2.5 rounded-lg hover:bg-slate-800 transition-all font-bold text-xs uppercase tracking-wider"
                >
                  {isImporting ? <Loader2 className="animate-spin" size={16} /> : <Upload size={16} />}
                  Import JSON
                </button>
              </div>
            </div>
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
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <Smartphone size={18} className="text-blue-500" />
            E-Wallet Integrations
          </h2>
        </div>
        <div className="p-8">
          <form onSubmit={saveGcashSettings} className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <h3 className="font-bold text-slate-900">GCash Business API</h3>
                <p className="text-sm text-slate-500">Link your GCash account to verify payments automatically.</p>
              </div>
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest",
                storeSettings.gcashApiKey ? "bg-green-100 text-green-600" : "bg-slate-100 text-slate-400"
              )}>
                {storeSettings.gcashApiKey ? 'Connected' : 'Not Linked'}
              </div>
            </div>
            
            <div className="flex gap-4">
              <div className="flex-1 space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Merchant API Key</label>
                <input 
                  type="password" 
                  name="gcashApiKey"
                  placeholder="pk_live_************************"
                  defaultValue={storeSettings.gcashApiKey || ''}
                  className="w-full bg-slate-50 border border-slate-200 p-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                />
              </div>
              <button 
                type="submit"
                disabled={isSavingGcash}
                className="self-end bg-blue-600 text-white px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-wider hover:bg-blue-700 transition-all flex items-center gap-1.5 disabled:opacity-50"
              >
                {isSavingGcash ? <Loader2 className="animate-spin" size={14} /> : null}
                {isSavingGcash ? 'Saving...' : 'Link Account'}
              </button>
            </div>
          </form>
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
        <form onSubmit={saveSecurityPolicy} className="p-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Global Manager PIN</label>
              <input 
                name="managerPin"
                type="password" 
                maxLength={6}
                placeholder="4-6 Digits"
                defaultValue={storeSettings.managerPin || '1234'}
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-lg font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-[10px] text-slate-500 font-bold uppercase italic">This PIN is required for Cashier Overrides (e.g. Cart Reset)</p>
            </div>
            <div className="space-y-3">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest block">Auto-Logout Timer</label>
              <select name="autoLogout" defaultValue={storeSettings.autoLogout || 'Never'} className="w-full bg-slate-50 border border-slate-200 p-4 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="15">15 Minutes of Inactivity</option>
                <option value="30">30 Minutes of Inactivity</option>
                <option value="60">1 Hour of Inactivity</option>
                <option value="Never">Never</option>
              </select>
            </div>
          </div>
          
          <button 
            type="submit"
            disabled={isSavingSecurity}
            className="bg-slate-900 text-white w-full py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200 flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSavingSecurity ? <Loader2 className="animate-spin" size={16} /> : null}
            {isSavingSecurity ? 'Saving...' : 'Save Security Policy'}
          </button>
        </form>
      </div>

    </div>
  );
};
